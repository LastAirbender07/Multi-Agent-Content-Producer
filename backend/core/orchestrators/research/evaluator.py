import math
import re

from configs.settings import get_settings
from core.orchestration.contracts import EvaluationResult, LLMEvaluationOutput
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from core.utils.text_utils import format_evidence_block, domain_from_url
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()
MIN_SOURCES: int = _settings.research_quality_min_sources
MIN_COMBINED_CONFIDENCE: float = _settings.research_quality_min_confidence

# Source scoring saturation: weighted by credibility, not raw count.
# A few high-quality sources score better than many thin snippets.
_COVERAGE_SATURATION = 8.0    # saturates at weighted credibility sum of 8
_DIVERSITY_SATURATION = 8.0   # saturates at 8 unique domains

# If synthesis reports confidence below this floor, force another refinement
# loop regardless of the combined score — a synthesizer that says "I'm not
# confident" should never auto-pass.
_SYNTHESIS_CONFIDENCE_FLOOR = 0.50

# Gap text patterns that indicate a core claim is undocumented.
# If any gap matches these, evaluation fails regardless of numeric score.
_CRITICAL_GAP_MARKERS = [
    "COMPLETE ABSENCE",
    "central to the topic",
    "core claim",
    "zero evidence",
    "no documentation",
]


def _source_identifier(e) -> str:
    if e.source_name:
        # Strip the claim-type prefix (e.g. "llm:HISTORICAL_FACT:1891" → domain grouping)
        if e.source_name.startswith("llm:"):
            return e.source_name  # treat each LLM claim type as its own "domain"
        return e.source_name
    return domain_from_url(str(e.url) if e.url else "")


def _compute_source_score(evidence: list, source_ids: set) -> float:
    """
    Compute source quality score: average credibility × log-scale volume factor.

    This prevents two failure modes:
    - Volume inflation: 21 low-quality snippets (credibility=0.4) no longer
      equal 8 high-quality sources (credibility=0.9)
    - Volume blindness: a single item still scores lower than 8 good items

    Formula: avg_credibility × log_volume_factor × diversity_factor
    LLM high-confidence items add a small bonus; low-confidence items excluded.
    """
    web_evidence = [e for e in evidence if not (getattr(e, "source_name", "") or "").startswith("llm:")]
    llm_evidence = [e for e in evidence if (getattr(e, "source_name", "") or "").startswith("llm:")]

    if web_evidence:
        avg_cred   = sum(getattr(e, "credibility_score", 0.4) for e in web_evidence) / len(web_evidence)
        # Log-scale volume: rewards having more sources, but with diminishing returns.
        # log(1+1)/log(8+1) ≈ 0.32 for 1 source; log(8+1)/log(8+1) = 1.0 for 8+ sources.
        vol_factor = min(1.0, math.log(len(web_evidence) + 1) / math.log(_COVERAGE_SATURATION + 1))
        coverage   = avg_cred * vol_factor
    else:
        coverage = 0.0

    # Domain diversity from web sources
    web_domains = {_source_identifier(e) for e in web_evidence if _source_identifier(e)}
    diversity = min(1.0, len(web_domains) / _DIVERSITY_SATURATION)

    # Modest bonus for high-confidence LLM historical claims (max +0.12)
    high_conf_llm = [e for e in llm_evidence if getattr(e, "credibility_score", 0) >= 0.75]
    llm_bonus = min(0.12, len(high_conf_llm) * 0.015)

    score = round(0.5 * coverage + 0.5 * diversity + llm_bonus, 4)
    return min(1.0, score)


def _has_critical_gaps(synthesis) -> bool:
    """Return True if synthesis gaps contain markers indicating core claim is undocumented."""
    if not synthesis or not synthesis.gaps:
        return False
    gaps_text = " ".join(synthesis.gaps).upper()
    return any(marker.upper() in gaps_text for marker in _CRITICAL_GAP_MARKERS)


async def _run_llm_judge(topic: str, synthesis, evidence: list, run_id: str | None = None) -> LLMEvaluationOutput:
    try:
        system_prompt = get_system_prompt("research")
        key_points_text = "\n".join(f"- {p}" for p in (synthesis.key_points or []))
        evidence_block = format_evidence_block(evidence, max_items=10, compact=True)
        user_prompt = load_prompt(
            "content_evaluation",
            topic=topic,
            synthesis_summary=synthesis.summary,
            key_points=key_points_text or "(none)",
            evidence_block=evidence_block or "(no evidence provided)",
        )

        result: LLMEvaluationOutput = await LLMFactory.get_client_with_retry(
            lambda llm: llm.generate_structured(
                prompt=user_prompt,
                output_schema=LLMEvaluationOutput,
                system_prompt=system_prompt,
                _token_meta=(run_id, "research"),
            )
        )
        logger.info(
            "llm_judge_completed",
            topic=topic,
            overall=result.overall_score,
            factual=result.factual_grounding,
            relevance=result.topic_relevance,
            reasoning=result.reasoning[:120],
        )
        return result
    except Exception as e:
        logger.warning("llm_judge_failed", error=str(e))
        return LLMEvaluationOutput(
            factual_grounding=0.5,
            topic_relevance=0.5,
            specificity=0.5,
            coverage_breadth=0.5,
            overall_score=0.5,
            reasoning=f"LLM judge unavailable ({str(e)[:80]}); defaulting to neutral 0.5.",
        )


async def evaluate_node(state: ResearchGraphState) -> dict:
    evidence = state.get("evidence") or []
    synthesis = state.get("synthesis")
    request = state.get("request")
    topic = request.topic if request else state.get("topic", "unknown")
    loop_count = state.get("loop_count", 0)
    budget = request.budget if request else None
    max_loops = budget.max_refinement_loops if budget else 2

    source_count = len(evidence)
    source_ids = {_source_identifier(e) for e in evidence if _source_identifier(e)}
    source_score = _compute_source_score(evidence, source_ids)
    coverage_score = min(1.0, source_count / 8.0)
    diversity_score = min(1.0, len(source_ids) / 4.0)

    # Early-exit: no synthesis
    if synthesis is None:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=False,
            reason="Synthesis is missing — no evidence was collected or synthesis failed.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
            source_score=source_score,
            llm_content_score=0.0,
            combined_confidence=0.0,
        )
    elif source_count < MIN_SOURCES:
        combined = source_score * 0.4
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Insufficient sources: {source_count} found, {MIN_SOURCES} required. Combined confidence: {combined:.2f}.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
            source_score=source_score,
            llm_content_score=0.0,
            combined_confidence=round(combined, 4),
        )
    else:
        # Run LLM judge
        llm_eval = await _run_llm_judge(topic, synthesis, evidence, run_id=state.get("run_id"))
        llm_score = round(llm_eval.overall_score, 4)
        combined  = round(llm_score * 0.50 + source_score * 0.50, 4)

        # Fix 4: synthesis confidence floor — if the synthesizer itself reports low
        # confidence, force refinement regardless of the combined score.
        synthesis_conf = getattr(synthesis, "confidence_score", 1.0) or 1.0
        below_synthesis_floor = synthesis_conf < _SYNTHESIS_CONFIDENCE_FLOOR and loop_count < max_loops

        # Fix 5: critical gap gate — if synthesis explicitly acknowledges a core
        # claim is undocumented, force refinement regardless of numeric scores.
        critical_gap_found = _has_critical_gaps(synthesis) and loop_count < max_loops

        passed = (
            combined >= MIN_COMBINED_CONFIDENCE
            and not below_synthesis_floor
            and not critical_gap_found
        )
        should_refine = not passed

        if passed:
            reason = (
                f"Passed. Combined confidence: {combined:.2f} "
                f"(LLM={llm_score:.2f}×0.50 + sources={source_score:.2f}×0.50). "
                f"Synthesis confidence: {synthesis_conf:.2f}. "
                f"Judge: {llm_eval.reasoning[:120]}"
            )
        elif below_synthesis_floor:
            reason = (
                f"Below synthesis confidence floor ({synthesis_conf:.2f} < {_SYNTHESIS_CONFIDENCE_FLOOR}). "
                f"Combined: {combined:.2f}. Forcing refinement loop."
            )
        elif critical_gap_found:
            reason = (
                f"Critical gap in core claims detected in synthesis. "
                f"Combined: {combined:.2f}. Forcing refinement loop."
            )
        else:
            reason = (
                f"Below threshold ({combined:.2f} < {MIN_COMBINED_CONFIDENCE}). "
                f"LLM={llm_score:.2f}×0.50, sources={source_score:.2f}×0.50. "
                f"Judge: {llm_eval.reasoning[:120]}"
            )

        evaluation = EvaluationResult(
            passed=passed,
            should_refine=should_refine,
            reason=reason,
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
            llm_content_score=llm_score,
            source_score=source_score,
            combined_confidence=combined,
        )

    logger.info(
        "evaluate_node_completed",
        run_id=state.get("run_id"),
        passed=evaluation.passed,
        combined_confidence=evaluation.combined_confidence,
        llm_score=evaluation.llm_content_score,
        source_score=evaluation.source_score,
        source_count=source_count,
    )

    return {
        "evaluation": evaluation,
        "messages": state.get("messages", []) + [
            f"Evaluation: {'PASSED' if evaluation.passed else 'FAILED'} "
            f"(combined={evaluation.combined_confidence:.2f}, "
            f"llm={evaluation.llm_content_score:.2f}, "
            f"sources={evaluation.source_score:.2f})"
        ],
    }
