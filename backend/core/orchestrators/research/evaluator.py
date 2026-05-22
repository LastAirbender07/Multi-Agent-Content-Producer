import re

from langchain_core.messages import HumanMessage, SystemMessage

from configs.settings import get_settings
from core.orchestration.contracts import EvaluationResult, LLMEvaluationOutput
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()
MIN_SOURCES: int = _settings.research_quality_min_sources
MIN_COMBINED_CONFIDENCE: float = _settings.research_quality_min_confidence


def _source_identifier(e) -> str:
    if e.source_name:
        return e.source_name
    match = re.search(r'https?://(?:www\.)?([^/]+)', str(e.url) if e.url else "")
    return match.group(1) if match else ""


def _compute_source_score(evidence: list, source_ids: set) -> float:
    # With 3 tools always running, source counts will be high.
    # Use higher denominators so the score stays meaningful.
    # Coverage: saturates at 15 items (was 8)
    # Diversity: saturates at 8 unique domains (was 4)
    coverage = min(1.0, len(evidence) / 15.0)
    diversity = min(1.0, len(source_ids) / 8.0)
    return round(0.5 * coverage + 0.5 * diversity, 4)


def _build_evidence_block_for_eval(evidence: list, max_items: int = 10) -> str:
    lines = []
    for idx, e in enumerate(evidence[:max_items], start=1):
        lines.append(f"[{idx}] {e.title}")
        lines.append(f"    Source: {e.source_name or e.source_type} | URL: {e.url}")
        text = e.snippet or (e.extracted_content[:300] if e.extracted_content else "")
        if text:
            lines.append(f"    Excerpt: {text[:300]}")
        lines.append("")
    return "\n".join(lines)


async def _run_llm_judge(topic: str, synthesis, evidence: list) -> LLMEvaluationOutput:
    try:
        llm = get_langchain_llm()
        structured_llm = llm.with_structured_output(LLMEvaluationOutput)
        system_prompt = get_system_prompt("research")
        key_points_text = "\n".join(f"- {p}" for p in (synthesis.key_points or []))
        evidence_block = _build_evidence_block_for_eval(evidence)
        user_prompt = load_prompt(
            "content_evaluation",
            topic=topic,
            synthesis_summary=synthesis.summary,
            key_points=key_points_text or "(none)",
            evidence_block=evidence_block or "(no evidence provided)",
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
        result: LLMEvaluationOutput = await structured_llm.ainvoke(messages)
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

    source_count = len(evidence)
    source_ids = {_source_identifier(e) for e in evidence if _source_identifier(e)}
    source_score = _compute_source_score(evidence, source_ids)
    coverage_score = min(1.0, source_count / 8.0)
    diversity_score = min(1.0, len(source_ids) / 4.0)

    # Early-exit: no synthesis at all
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
        llm_eval = await _run_llm_judge(topic, synthesis, evidence)
        llm_score = round(llm_eval.overall_score, 4)
        # LLM and source signals weighted equally now that LLM scoring is
        # per-article (more signal) and sources are always high-volume.
        combined = round(llm_score * 0.50 + source_score * 0.50, 4)

        passed = combined >= MIN_COMBINED_CONFIDENCE
        should_refine = not passed

        if passed:
            reason = (
                f"Passed. Combined confidence: {combined:.2f} "
                f"(LLM={llm_score:.2f}×0.50 + sources={source_score:.2f}×0.50). "
                f"Judge: {llm_eval.reasoning[:120]}"
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
