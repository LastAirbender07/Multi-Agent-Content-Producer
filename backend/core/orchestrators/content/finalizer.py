from pathlib import Path
from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


async def finalize_content_node(state: ContentGraphState) -> dict:
    request = ContentRequest.model_validate(state["request"])
    run_id = state.get("run_id")
    angle_index = state.get("angle_index", 0)
    angle = state.get("angle", {})

    manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
    stage = f"content/angle_{angle_index}"

    manager.save_json(stage, "slides.json", {
        "run_id": run_id,
        "angle_index": angle_index,
        "angle": angle,
        "slides": state.get("slides", []),
        "caption": state.get("caption", ""),
        "hashtags": state.get("hashtags", []),
    })

    manager.save_json(stage, "image_assets.json", {
        "image_assets": state.get("image_assets", []),
    })

    manager.save_json(stage, "carousel.json", {
        "run_id": run_id,
        "angle_index": angle_index,
        "angle_statement": angle.get("statement", ""),
        "emotional_hook": angle.get("emotional_hook", ""),
        "caption": state.get("caption", ""),
        "hashtags": state.get("hashtags", []),
        "slide_png_paths": state.get("slide_png_paths", []),
        "topic": request.topic,
    })

    output_path = str(manager.stage_dir(stage))
    logger.info("finalize_content_node_complete", run_id=run_id, angle_index=angle_index)

    # Invalidate analytics cache so the next dashboard load reflects the new run
    try:
        from core.services.analytics_service import analytics_cache
        analytics_cache.invalidate()
    except Exception:
        pass

    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + [f"Content saved to {output_path}"],
    }
