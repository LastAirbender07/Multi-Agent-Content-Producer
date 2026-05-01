from langgraph.types import interrupt
from core.orchestration.contracts import Angle
from core.schemas.workflow_state import AngleGraphState
from infra.logging import get_logger

logger = get_logger(__name__)


async def human_approval_node(state: AngleGraphState) -> dict:
    angles = state.get("angles", [])

    logger.info("human_approval_node_waiting", run_id=state.get("run_id"), angles_count=len(angles))

    # Pause graph execution here. The caller resumes with Command(resume=list[int])
    selected_indices: list[int] = interrupt({
        "angles": angles,
        "prompt": "Select angles to generate content for (provide a list of 0-based indices, e.g. [0, 2]):",
    })

    valid_indices = [i for i in selected_indices if i < len(angles)]
    selected = [angles[i] for i in valid_indices]

    logger.info(
        "human_approval_node_completed",
        run_id=state.get("run_id"),
        selected_indices=valid_indices,
    )
    return {
        "selected_angles": selected,
        "selection_reasoning": f"Human selected angle indices: {valid_indices}",
        "messages": state.get("messages", []) + [f"Human selected {len(selected)} angles."],
    }
