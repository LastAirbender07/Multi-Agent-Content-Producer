from configs.settings import get_settings
from core.orchestration.contracts import EvaluationResult
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger
import re

logger = get_logger(__name__)

_settings = get_settings()
MIN_SOURCES: int = _settings.research_quality_min_sources
MIN_CONFIDENCE: float = _settings.research_quality_min_confidence

def _source_identifier(e) -> str:
    """Return source_name if available, otherwise extract domain from URL."""
    if e.source_name:
        return e.source_name
    match = re.search(r'https?://(?:www\.)?([^/]+)', str(e.url) if e.url else "")
    return match.group(1) if match else ""

async def evaluate_node(state: ResearchGraphState) -> dict:
    evidence = state.get("evidence") or []
    synthesis = state.get("synthesis")
    source_count = len(evidence)
    source_ids = {_source_identifier(e) for e in evidence if _source_identifier(e)}
    diversity_score = min(1.0, len(source_ids) / 4.0)
    coverage_score = min(1.0, source_count / 8.0)

    if synthesis is None:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=False,
            reason="Synthesis is missing — no evidence was collected or synthesis failed.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    elif source_count < MIN_SOURCES:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Insufficient sources collected: {source_count} found, at least {MIN_SOURCES} required.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    elif synthesis.confidence_score < MIN_CONFIDENCE:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Synthesis confidence too low: {synthesis.confidence_score:.2f} is below the threshold of {MIN_CONFIDENCE}.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    else:
        evaluation = EvaluationResult(
            passed=True,
            should_refine=False,
            reason="Evaluation passed: sufficient sources and acceptable synthesis confidence.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )

    logger.info(
        "evaluate_node_completed",
        run_id=state.get("run_id"),
        passed=evaluation.passed,
        reason=evaluation.reason,
        source_count=source_count,
        coverage_score=coverage_score,
        diversity_score=diversity_score,
    )

    return {
        "evaluation": evaluation,
        "messages": state.get("messages", []) + [f"Evaluation completed: {evaluation.reason}"],
    }
