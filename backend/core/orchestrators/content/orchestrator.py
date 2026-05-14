import uuid
from configs.settings import get_settings
from core.graphs.content_graph import build_content_graph
from core.orchestration.contracts import ContentRequest, ContentResponse, RunStatus
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger

logger = get_logger(__name__)


class ContentOrchestrator:
    def __init__(self):
        self._graph = build_content_graph().compile()

    async def run(self, request: ContentRequest) -> ContentResponse:
        run_id = request.run_id or str(uuid.uuid4())
        logger.info(
            "content_orchestrator_started",
            run_id=run_id,
            topic=request.topic,
            angles=len(request.selected_angles),
        )

        all_png_paths: list[list[str]] = []
        output_paths: list[str] = []
        angles_processed: list[int] = []
        all_errors: list[str] = []

        for idx, angle in enumerate(request.selected_angles):
            logger.info("content_processing_angle", run_id=run_id, angle_index=idx)
            initial: ContentGraphState = {
                "request": request.model_dump(),
                "run_id": run_id,
                "angle": angle,
                "angle_index": idx,
                "slides": [],
                "caption": "",
                "hashtags": [],
                "image_assets": [],
                "slide_html_paths": [],
                "slide_png_paths": [],
                "messages": [],
                "errors": [],
            }

            try:
                result = await self._graph.ainvoke(initial)
                png_paths = result.get("slide_png_paths", [])
                all_png_paths.append(png_paths)
                if result.get("output_path"):
                    output_paths.append(result["output_path"])
                angles_processed.append(idx)
                all_errors.extend(result.get("errors", []))
                logger.info(
                    "content_angle_complete",
                    run_id=run_id,
                    angle_index=idx,
                    slides=len(png_paths),
                )
            except Exception as e:
                logger.error("content_angle_failed", run_id=run_id, angle_index=idx, error=str(e))
                all_errors.append(f"Angle {idx} failed: {str(e)}")
                all_png_paths.append([])

        status = RunStatus.SUCCESS if not all_errors else (
            RunStatus.PARTIAL_SUCCESS if angles_processed else RunStatus.FAILED
        )

        return ContentResponse(
            run_id=run_id,
            status=status,
            angles_processed=angles_processed,
            output_paths=output_paths,
            carousel_paths=all_png_paths,
            errors=all_errors,
        )
