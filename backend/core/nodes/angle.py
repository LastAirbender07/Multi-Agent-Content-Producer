from configs.settings import get_settings
from core.orchestration.contracts import AngleRequest, ResearchSynthesis
from core.orchestrators.angle.orchestrator import AngleOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger

logger = get_logger(__name__)

_settings = get_settings()


async def angle_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    run_id = state.get("run_id")
    research_data = state.get("research_data", {})

    logger.info("angle_node_start", topic=topic, run_id=run_id)

    try:
        synthesis = ResearchSynthesis(
            summary=research_data.get("summary", ""),
            key_points=research_data.get("key_points", []),
        )

        orchestrator = AngleOrchestrator()
        result = await orchestrator.run(AngleRequest(
            topic=topic,
            synthesis=synthesis,
            run_id=run_id,
            mode=state.get("angle_mode") or _settings.angle_default_mode,
            max_angles_to_select=_settings.angle_default_max_to_select,
        ).model_dump())

        logger.info(
            "angle_node_complete",
            topic=topic,
            run_id=run_id,
            angles_count=len(result.angles),
            selected_count=len(result.selected_angles),
        )

        return {
            "generated_angles": [a.model_dump() for a in result.angles],
            "selected_angles": [a.model_dump() for a in result.selected_angles],
            "selection_reasoning": result.selection_reasoning,
            "messages": state.get("messages", []) + [
                f"Angles generated: {len(result.angles)}, selected: {len(result.selected_angles)}"
            ],
        }

    except Exception as e:
        logger.error("angle_node_error", topic=topic, error=str(e))
        return {
            "errors": state.get("errors", []) + [f"Angle generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Angle generation failed: {str(e)}"],
        }
