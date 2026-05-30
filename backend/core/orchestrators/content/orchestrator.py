import json as _json
import uuid
from pathlib import Path

from configs.settings import get_settings
from core.graphs.content_graph import build_content_graph
from core.orchestration.contracts import ContentRequest, ContentResponse, ResearchSynthesis, RunStatus
from core.schemas.workflow_state import ContentGraphState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)

_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


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
        captions: list[str] = []
        hashtags_per_angle: list[list[str]] = []
        all_slides_per_angle: list[list[dict]] = []
        all_image_assets_per_angle: list[list[dict]] = []

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
                captions.append(result.get("caption", ""))
                hashtags_per_angle.append(result.get("hashtags", []))
                all_slides_per_angle.append(result.get("slides", []))
                all_image_assets_per_angle.append(result.get("image_assets", []))
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
                captions.append("")
                hashtags_per_angle.append([])
                all_slides_per_angle.append([])
                all_image_assets_per_angle.append([])

        # ── Blog post generation (non-fatal) ──────────────────────────────────
        blog_post_path = ""
        blog_post_html_path = ""
        if request.research_summary and angles_processed:
            try:
                from core.orchestrators.content.blog_post_generator import generate_blog_post, BlogAssets

                # Load full synthesis + evidence from research_result.json
                research_result_path = _OUTPUTS_ROOT / run_id / "research" / "research_result.json"
                evidence: list[dict] = []
                synthesis_dict: dict = {}
                if research_result_path.exists():
                    data = _json.loads(research_result_path.read_text())
                    evidence = data.get("evidence", [])
                    synthesis_dict = data.get("synthesis") or {}

                synthesis = ResearchSynthesis(
                    summary=synthesis_dict.get("summary") or request.research_summary,
                    key_points=synthesis_dict.get("key_points") or request.key_points,
                    contradictions=synthesis_dict.get("contradictions") or [],
                    implications=synthesis_dict.get("implications") or [],
                    confidence_score=synthesis_dict.get("confidence_score") or 0.0,
                    gaps=synthesis_dict.get("gaps") or [],
                )

                is_llm_only = (
                    all(e.get("source_type") == "llm_knowledge" for e in evidence)
                    if evidence else True
                )

                angle_slide_bundles = [
                    {
                        "angle": request.selected_angles[idx],
                        "angle_index": idx,
                        "slides": all_slides_per_angle[idx],
                        "image_assets": all_image_assets_per_angle[idx],
                    }
                    for idx in angles_processed
                ]

                assets = BlogAssets(
                    topic=request.topic,
                    synthesis=synthesis,
                    evidence=evidence,
                    all_angle_slides=angle_slide_bundles,
                    run_id=run_id,
                    outputs_root=_OUTPUTS_ROOT,
                    is_llm_only=is_llm_only,
                )

                md_str, html_str = await generate_blog_post(assets)

                manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
                md_path = manager.save_markdown(".", "blog_post.md", md_str)
                html_path = manager.save_text(".", "blog_post.html", html_str)
                blog_post_path = str(md_path)
                blog_post_html_path = str(html_path)
                logger.info(
                    "blog_post_generated",
                    run_id=run_id,
                    md_chars=len(md_str),
                    html_chars=len(html_str),
                )
            except Exception as e:
                logger.error("blog_post_generation_failed", run_id=run_id, error=str(e))

        status = RunStatus.SUCCESS if not all_errors else (
            RunStatus.PARTIAL_SUCCESS if angles_processed else RunStatus.FAILED
        )

        return ContentResponse(
            run_id=run_id,
            status=status,
            angles_processed=angles_processed,
            output_paths=output_paths,
            carousel_paths=all_png_paths,
            captions=captions,
            hashtags_per_angle=hashtags_per_angle,
            errors=all_errors,
            blog_post_path=blog_post_path,
            blog_post_html_path=blog_post_html_path,
        )
