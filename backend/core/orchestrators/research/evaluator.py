from core.orchestration.contracts import EvaluationResult
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
MIN_SOURCES = 3
MIN_CONFIDENCE = 0.5

async def evaluate_node(state: ResearchGraphState) -> dict:
    evidence = state.evidence or []
    synthesis = state.synthesis
    source_count = len(evidence)
    source_names = {e.source_name for e in evidence if e.source_name}
    diversity_score = min(1.0, len(source_names) / 4.0)
    coverage_score = min(1.0, source_count / 8.0)

    if source_count < MIN_SOURCES:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Insufficient sources collected: {source_count} sources found, at least {MIN_SOURCES} required.",
            source_count=source_count,
            coverage_scrore=coverage_score,
            source_diversity_score=diversity_score
        )
    elif synthesis and synthesis.confidence_score < MIN_CONFIDENCE:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Synthesis confidence too low: confidence score {synthesis.confidence_score:.2f} is below the threshold of {MIN_CONFIDENCE}.",
            source_count=source_count,
            coverage_scrore=coverage_score,
            source_diversity_score=diversity_score
        )
    else:
        evaluation = EvaluationResult(
            passed=True,
            should_refine=False,
            reason="Evaluation passed: sufficient sources collected and synthesis confidence is acceptable.",
            source_count=source_count,
            coverage_scrore=coverage_score,
            source_diversity_score=diversity_score
        )

    logger.info(
        "evaluate_node_completed",
        run_id=state.run_id,
        passed=evaluation.passed,
        reason=evaluation.reason,
        source_count=source_count,
        coverage_score=coverage_score,
        diversity_score=diversity_score
    )

    return {
        "evaluation": evaluation,
        "messages": state.messages + [f"Evaluation completed: {evaluation.reason}"],
    }
