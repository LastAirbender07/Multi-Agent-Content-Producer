import json as _json
import uuid
from pathlib import Path

from configs.settings import get_settings
from core.graphs.content_graph import build_content_graph
from core.orchestration.contracts import ContentRequest, ContentResponse, ResearchSynthesis, RunStatus
from core.schemas.workflow_state import ContentGraphState
from core.services.progress_store import progress_store
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)

_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


async def _run_blog_post_generation(
    run_id: str,
    request: ContentRequest,
    angles_processed: list,
    all_slides_per_angle: list,
    all_image_assets_per_angle: list,
) -> tuple[str, str, str, str]:
    """
    Generate blog post from research + carousel data.
    Returns (title, json_path, md_path, html_path). Non-fatal — returns empty strings on failure.
    """
    if not request.research_summary or not angles_processed:
        return "", "", "", ""

    # Skip regeneration if the user has already edited this blog post manually.
    # blog_post.json carries _user_edited: true after the first PUT /blog-post save.
    json_check = _OUTPUTS_ROOT / run_id / "blog" / "blog_post.json"
    if json_check.exists():
        try:
            existing = _json.loads(json_check.read_text())
            if existing.get("_user_edited"):
                logger.info("blog_post_skipped_user_edited", run_id=run_id)
                md_path   = _OUTPUTS_ROOT / run_id / "blog" / "blog_post.md"
                html_path = _OUTPUTS_ROOT / run_id / "blog" / "blog_post.html"
                return existing.get("title", ""), str(json_check), str(md_path), str(html_path)
        except Exception:
            pass
    try:
        from core.orchestrators.content.blog_post_generator import generate_blog_post, BlogAssets
        from core.services.blog_post_renderer import to_markdown, to_html

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
        is_llm_only = all(e.get("source_type") == "llm_knowledge" for e in evidence) if evidence else True

        angle_slide_bundles = [
            {
                "angle":        request.selected_angles[idx],
                "angle_index":  idx,
                "slides":       all_slides_per_angle[idx],
                "image_assets": all_image_assets_per_angle[idx],
            }
            for idx in angles_processed
        ]

        assets = BlogAssets(
            topic            = request.topic,
            synthesis        = synthesis,
            evidence         = evidence,
            all_angle_slides = angle_slide_bundles,
            run_id           = run_id,
            outputs_root     = _OUTPUTS_ROOT,
            is_llm_only      = is_llm_only,
        )

        # generate_blog_post now returns a validated BlogPostDocument
        doc      = await generate_blog_post(assets)
        md_str   = to_markdown(doc)
        html_str = to_html(doc)

        manager   = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
        json_path = manager.save_json("blog", "blog_post.json", doc.model_dump())
        md_path   = manager.save_markdown("blog", "blog_post.md", md_str)
        html_path = manager.save_text("blog", "blog_post.html", html_str)

        logger.info("blog_post_generated", run_id=run_id, title=doc.title,
                    sections=len(doc.sections), md_chars=len(md_str))
        return doc.title, str(json_path), str(md_path), str(html_path)

    except Exception as e:
        logger.error("blog_post_generation_failed", run_id=run_id, error=str(e))
        return "", "", "", ""


class ContentOrchestrator:
    def __init__(self):
        self._graph = build_content_graph().compile()

    async def run(self, request: ContentRequest) -> ContentResponse:
        run_id = request.run_id or str(uuid.uuid4())
        total_angles = len(request.selected_angles)
        logger.info(
            "content_orchestrator_started",
            run_id=run_id,
            topic=request.topic,
            angles=total_angles,
        )

        # ── Initial progress event ─────────────────────────────────────────────
        progress_store.update(f"content:{run_id}", {
            "phase": "starting",
            "pct": 5,
            "message": "Starting content generation…",
        })

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

            # Emit per-angle "generating" event — pct is monotonically increasing
            # across angles: angle 0 → 5%, angle 1 → ~45%, etc.
            angle_start_pct = round(idx / total_angles * 80) + 5
            progress_store.update(f"content:{run_id}", {
                "phase": "generating_carousel",
                "pct": angle_start_pct,
                "message": (
                    f"Generating angle {idx + 1} of {total_angles}…"
                    if total_angles > 1
                    else "Building carousel slides…"
                ),
            })

            initial: ContentGraphState = {
                "request": request.model_dump(),
                "run_id": run_id,
                "angle": angle,
                "angle_index": idx,
                "total_angles": total_angles,
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
        progress_store.update(f"content:{run_id}", {
            "phase": "blog_post",
            "pct": 92,
            "message": "Generating long-form blog post…",
        })
        blog_title, blog_json_path, blog_post_path, blog_post_html_path = await _run_blog_post_generation(
            run_id=run_id,
            request=request,
            angles_processed=angles_processed,
            all_slides_per_angle=all_slides_per_angle,
            all_image_assets_per_angle=all_image_assets_per_angle,
        )

        status = RunStatus.SUCCESS if not all_errors else (
            RunStatus.PARTIAL_SUCCESS if angles_processed else RunStatus.FAILED
        )

        # ── Final progress event ───────────────────────────────────────────────
        if status == RunStatus.FAILED:
            progress_store.update(f"content:{run_id}", {
                "phase": "error",
                "pct": 0,
                "message": f"Content generation failed: {all_errors[0] if all_errors else 'Unknown error'}",
            })
        else:
            progress_store.update(f"content:{run_id}", {
                "phase": "complete",
                "pct": 100,
                "message": "Carousels ready",
            })
        progress_store.finish(f"content:{run_id}")

        return ContentResponse(
            run_id=run_id,
            status=status,
            angles_processed=angles_processed,
            output_paths=output_paths,
            carousel_paths=all_png_paths,
            captions=captions,
            hashtags_per_angle=hashtags_per_angle,
            errors=all_errors,
            blog_post_title=blog_title,
            blog_post_json_path=blog_json_path,
            blog_post_path=blog_post_path,
            blog_post_html_path=blog_post_html_path,
        )