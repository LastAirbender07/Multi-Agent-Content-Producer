from configs.settings import get_settings
from core.orchestration.contracts import AngleEvaluation
from core.schemas.workflow_state import AngleGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()
MIN_ANGLES: int = _settings.angle_min_angles


async def evaluate_angles_node(state: AngleGraphState) -> dict:
    angles = state.get("angles", [])

    if not angles:
        evaluation = AngleEvaluation(passed=False, reason="No angles were generated.")
    elif len(angles) < MIN_ANGLES:
        evaluation = AngleEvaluation(
            passed=False,
            reason=f"Only {len(angles)} angles generated, need at least {MIN_ANGLES}.",
        )
    else:
        complete = [
            a for a in angles
            if a.get("statement") and a.get("emotional_hook") and a.get("supporting_evidence")
        ]
        if len(complete) < MIN_ANGLES:
            evaluation = AngleEvaluation(
                passed=False,
                reason=f"Only {len(complete)} of {len(angles)} angles have all required fields.",
            )
        else:
            evaluation = AngleEvaluation(
                passed=True,
                reason=f"{len(angles)} valid angles generated.",
            )

    logger.info(
        "evaluate_angles_node_complete",
        run_id=state.get("run_id"),
        passed=evaluation.passed,
        reason=evaluation.reason,
    )
    return {
        "evaluation": evaluation.model_dump(),
        "messages": state.get("messages", []) + [f"Evaluation: {evaluation.reason}"],
    }
