from configs.settings import get_settings
from core.orchestration.contracts import Angle, AngleRequest, AutoSelectionOutput
from core.schemas.workflow_state import AngleGraphState
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()


async def llm_select_node(state: AngleGraphState) -> dict:
    request = AngleRequest.model_validate(state["request"])
    angles = [Angle.model_validate(a) for a in state.get("angles", [])]

    try:
        llm = await LLMFactory.get_client()
        angle_descriptions = "\n\n".join(
            f"Index {i}:\n  Statement: {a.statement}\n  Hook: {a.emotional_hook}\n  Evidence: {a.supporting_evidence}"
            for i, a in enumerate(angles)
        )

        result = await llm.generate_structured(
            prompt=(
                f"From these {len(angles)} content angles for the topic '{request.topic}', "
                f"select the {request.max_angles_to_select} strongest for an Instagram carousel post. "
                f"Prefer angles that are contrarian, data-backed, and emotionally provocative.\n\n"
                f"{angle_descriptions}"
            ),
            output_schema=AutoSelectionOutput,
        )

        valid_indices = [i for i in result.selected_indices if i < len(angles)]
        selected = [angles[i].model_dump() for i in valid_indices]

        logger.info(
            "llm_select_node_complete",
            run_id=state.get("run_id"),
            selected_indices=valid_indices,
        )
        return {
            "selected_angles": selected,
            "selection_reasoning": result.reasoning,
            "messages": state.get("messages", []) + [f"LLM auto-selected {len(selected)} angles."],
        }

    except Exception as e:
        logger.error("llm_select_node_error", run_id=state.get("run_id"), error=str(e))
        # Fallback: pick first N angles
        max_n = request.max_angles_to_select
        selected = [a.model_dump() for a in angles[:max_n]]
        return {
            "selected_angles": selected,
            "selection_reasoning": f"Fallback to first {len(selected)} angles (LLM error: {str(e)})",
            "errors": state.get("errors", []) + [f"Auto-selection LLM error: {str(e)}"],
            "messages": state.get("messages", []) + [f"Auto-selection fell back to first {len(selected)} angles."],
        }
