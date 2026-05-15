from pathlib import Path

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest
from core.orchestrators.content.orchestrator import ContentOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_orchestrator = ContentOrchestrator()


async def content_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    run_id = state.get("run_id")
    selected_angles = state.get("selected_angles", [])
    research_data = state.get("research_data", {})

    logger.info("content_node_start", topic=topic, run_id=run_id, angles=len(selected_angles))

    if not selected_angles:
        return {
            "errors": state.get("errors", []) + ["content_node: no selected_angles in state"],
            "messages": state.get("messages", []) + ["Content skipped — no angles selected"],
        }

    try:
        request = ContentRequest(
            run_id=run_id,
            topic=topic,
            selected_angles=selected_angles,
            research_summary=research_data.get("summary", ""),
            key_points=research_data.get("key_points", []),
            max_slides=_settings.content_max_slides,
            min_slides=_settings.content_min_slides,
            image_source=state.get("image_source", "auto"),
        )

        result = await _orchestrator.run(request)

        logger.info(
            "content_node_complete",
            run_id=run_id,
            angles_processed=len(result.angles_processed),
            status=result.status,
        )

        return {
            "messages": state.get("messages", []) + [
                f"Content generated for {len(result.angles_processed)} angles"
            ],
            "errors": state.get("errors", []) + result.errors,
        }

    except Exception as e:
        logger.error("content_node_error", topic=topic, error=str(e))
        return {
            "errors": state.get("errors", []) + [f"Content generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Content generation failed: {str(e)}"],
        }
