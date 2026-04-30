from configs.settings import get_settings
from core.orchestration.contracts import EvaluationResult
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()
MIN_SOURCES: int = _settings.research_quality_min_sources
MIN_CONFIDENCE: float = _settings.research_quality_min_confidence

async def evaluate_node(state: ResearchGraphState) -> dict:
    evidence = state.get("evidence") or []
    synthesis = state.get("synthesis")
    source_count = len(evidence)
    source_names = {e.source_name for e in evidence if e.source_name}
    diversity_score = min(1.0, len(source_names) / 4.0)
    coverage_score = min(1.0, source_count / 8.0)

    if source_count < MIN_SOURCES:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Insufficient sources collected: {source_count} found, at least {MIN_SOURCES} required.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    elif synthesis is None:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=False,
            reason="Synthesis is missing — synthesis node may have failed.",
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
