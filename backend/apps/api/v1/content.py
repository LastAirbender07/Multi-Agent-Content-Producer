import json as _json
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse, HTMLResponse, Response, StreamingResponse

from apps.api.v1.schemas import (
    SlideEditRequest, SlideEditResponse, BlogPostUpdateRequest,
    NewBlankRunRequest, SwapImageUrlRequest,
    ImageDeleteRequest, CanvasSaveRequest, CanvasSaveResponse,
)
from core.orchestration.contracts import ContentRequest, ContentResponse
from core.orchestrators.content.orchestrator import ContentOrchestrator
from core.persistence.run_repository import read_topic, static_image_url
from core.persistence.slide_repository import read_slides, slides_json_path
from core.services.run_browser_service import create_blank_run, get_run_manifest, list_runs, update_run_metadata
from core.services import asset_library_service
from core.services.carousel_export_service import build_carousel_zip
from core.services.caption_service import get_caption, update_caption
from core.services.slide_reorder_service import reorder_slides, delete_slide as svc_delete_slide
from core.services.token_tracker import token_tracker
from core.orchestrators.content import _progress_store as content_progress
from core.services.progress_store import progress_store
from core.services.slide_editor_service import (
    ai_rewrite_slide as svc_ai_rewrite,
    bulk_style_slides as svc_bulk_style,
    create_slide as svc_create_slide,
    edit_slide as svc_edit_slide,
    get_slide_html_preview,
    swap_slide_image as svc_swap_image,
    upload_image as svc_upload_image,
    swap_image_url as svc_swap_image_url,
)
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/content", tags=["content"])
_orchestrator = ContentOrchestrator()
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


# ── SSE progress stream ────────────────────────────────────────────────────────

@router.get("/{run_id}/events")
async def content_events(run_id: str) -> StreamingResponse:
    """Push-based SSE stream of content generation progress for a given run_id.

    Subscribes to the ProgressStore queue. Events are pushed the instant the
    ContentOrchestrator or carousel_generator fires ``progress_store.update()``,
    with zero CPU overhead while the run is idle. The stream terminates cleanly
    when the orchestrator calls ``progress_store.finish()``.

    Late-joining clients receive the last known state immediately on connect;
    if the run already completed they receive the final event + EOF straight away.

    Event format: ``data: {"phase": str, "pct": int, "message": str}``
    """

    async def generate():
        queue = await progress_store.subscribe(f"content:{run_id}")
        try:
            while True:
                event = await queue.get()
                if event is None:   # sentinel from progress_store.finish()
                    break
                yield f"data: {_json.dumps(event)}\n\n"
        finally:
            progress_store.unsubscribe(f"content:{run_id}", queue)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── Core pipeline ──────────────────────────────────────────────────────────────

@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    return await _orchestrator.run(request)


# ── Blog post ──────────────────────────────────────────────────────────────────
# All blog files live under runs/{run_id}/blog/ after the one-time migration.

_BLOG_SUBDIR = "blog"


def _blog_dir(run_id: str) -> Path:
    return _OUTPUTS_ROOT / run_id / _BLOG_SUBDIR


@router.get("/{run_id}/blog-post", response_class=PlainTextResponse)
async def get_blog_post_markdown(run_id: str) -> str:
    path = _blog_dir(run_id) / "blog_post.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post not found")
    return path.read_text(encoding="utf-8")


@router.get("/{run_id}/blog-post.html", response_class=HTMLResponse)
async def get_blog_post_html(run_id: str) -> str:
    path = _blog_dir(run_id) / "blog_post.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post HTML not found")
    return path.read_text(encoding="utf-8")


@router.put("/{run_id}/blog-post")
async def update_blog_post(run_id: str, request: BlogPostUpdateRequest) -> dict:
    """Save edited markdown and re-render HTML.

    Option D editor contract:
    - Markdown is the edit surface for now; JSON is frozen as generation record.
    - Title is preserved from blog_post.json so it doesn't revert to raw topic.
    - Sets _user_edited: true on the JSON so pipeline re-runs skip regeneration.
    """
    run_dir = _OUTPUTS_ROOT / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")

    blog_dir = _blog_dir(run_id)
    blog_dir.mkdir(exist_ok=True)

    # 1. Save the edited markdown
    (blog_dir / "blog_post.md").write_text(request.markdown, encoding="utf-8")

    # 2. Re-render HTML — use the LLM-crafted title from JSON, fall back to topic
    json_path  = blog_dir / "blog_post.json"
    title      = read_topic(run_id)
    doc_data: dict = {}
    if json_path.exists():
        try:
            doc_data = _json.loads(json_path.read_text())
            title    = doc_data.get("title") or title
        except Exception:
            pass

    import markdown as _md_lib
    from jinja2 import Environment, FileSystemLoader
    _BLOG_TMPL_DIR = Path(__file__).parents[3] / "core" / "templates" / "blog"
    _tmpl_env      = Environment(loader=FileSystemLoader(str(_BLOG_TMPL_DIR)), autoescape=False)
    body_html      = _md_lib.markdown(request.markdown, extensions=["extra", "tables", "toc"])
    html           = _tmpl_env.get_template("blog_post.html.j2").render(title=title, body_html=body_html)
    (blog_dir / "blog_post.html").write_text(html, encoding="utf-8")

    # 3. Mark JSON as user-edited — orchestrator will skip regeneration on next pipeline run
    if doc_data:
        doc_data["_user_edited"] = True
        try:
            json_path.write_text(_json.dumps(doc_data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

    return {"status": "saved", "md_chars": len(request.markdown), "title": title}


# ── Run browser ────────────────────────────────────────────────────────────────

@router.post("/new-blank-run")
async def new_blank_run(request: NewBlankRunRequest) -> dict:
    """Create a new empty run (no research/pipeline). User builds slides manually in the editor."""
    return create_blank_run(request.topic)


@router.get("/runs")
async def list_runs_endpoint(
    search: str | None = None,
    starred: bool | None = None,
) -> dict:
    return list_runs(search=search, starred=starred)


@router.patch("/{run_id}/metadata")
async def update_run_metadata_endpoint(run_id: str, body: dict) -> dict:
    """Patch starred flag and/or tags for a run."""
    return update_run_metadata(
        run_id,
        tags=body.get("tags"),
        starred=body.get("starred"),
    )


@router.get("/{run_id}/manifest")
async def get_run_manifest_endpoint(run_id: str) -> dict:
    return get_run_manifest(run_id)


# ── Slide data ─────────────────────────────────────────────────────────────────

@router.get("/{run_id}/slides/{angle_index}")
async def get_slides(run_id: str, angle_index: int) -> dict:
    path = slides_json_path(run_id, angle_index)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Slides not found for angle {angle_index}")
    return {"slides": read_slides(path)}


@router.get("/{run_id}/carousel-download")
async def download_carousel_zip(run_id: str, angle: int = 0) -> Response:
    try:
        zip_bytes, filename = build_carousel_zip(run_id, angle)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{run_id}/token-usage")
async def get_token_usage(run_id: str) -> dict:
    return token_tracker.get_run_summary(run_id)


@router.get("/{run_id}/render-status")
async def get_render_status(run_id: str) -> dict:
    """Poll real-time slide rendering progress during content generation."""
    prog = content_progress.get(run_id)
    if not prog:
        return {"run_id": run_id, "status": "unknown"}
    return {"run_id": run_id, **prog}


@router.get("/{run_id}/caption/{angle_index}")
async def read_caption(run_id: str, angle_index: int) -> dict:
    try:
        return get_caption(run_id, angle_index)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{run_id}/caption/{angle_index}")
async def write_caption(run_id: str, angle_index: int, body: dict) -> dict:
    caption = body.get("caption", "")
    hashtags = body.get("hashtags", [])
    try:
        return update_caption(run_id, angle_index, caption, hashtags)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{run_id}/slides/{angle_index}/{slide_number}/preview", response_class=HTMLResponse)
async def preview_slide(run_id: str, angle_index: int, slide_number: int) -> str:
    return get_slide_html_preview(run_id, angle_index, slide_number)


# ── Slide editing ──────────────────────────────────────────────────────────────

@router.put("/{run_id}/slides/{angle_index}/reorder")
async def reorder_slides_endpoint(run_id: str, angle_index: int, body: dict) -> dict:
    new_order: list[int] = body.get("slide_numbers", [])
    if not new_order:
        raise HTTPException(status_code=422, detail="slide_numbers required")
    try:
        return reorder_slides(run_id, angle_index, new_order)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{run_id}/slides/{angle_index}/{slide_number}")
async def delete_slide_endpoint(run_id: str, angle_index: int, slide_number: int) -> dict:
    try:
        return svc_delete_slide(run_id, angle_index, slide_number)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{run_id}/slides/{angle_index}/{slide_number}/edit", response_model=SlideEditResponse)
async def edit_slide(run_id: str, angle_index: int, slide_number: int, request: SlideEditRequest) -> SlideEditResponse:
    return await svc_edit_slide(run_id, angle_index, slide_number, request)


@router.post("/{run_id}/slides/{angle_index}/bulk-style")
async def bulk_style_slides(run_id: str, angle_index: int, body: dict) -> dict:
    """Apply style overrides to multiple slides at once.

    Body: { slide_numbers: [1,3,5], slide_overrides: {"accent_color": "#EC4899"}, canvas_template?: "..." }
    """
    slide_numbers = body.get("slide_numbers", [])
    overrides = body.get("slide_overrides", {})
    canvas_template = body.get("canvas_template")
    if not slide_numbers or not overrides:
        raise HTTPException(status_code=400, detail="slide_numbers and slide_overrides are required")
    return await svc_bulk_style(run_id, angle_index, slide_numbers, overrides, canvas_template)


@router.post("/{run_id}/slides/{angle_index}/{slide_number}/ai-rewrite")
async def ai_rewrite_slide(run_id: str, angle_index: int, slide_number: int, body: dict) -> dict:
    return await svc_ai_rewrite(run_id, angle_index, slide_number, body.get("feedback", ""))


@router.post("/{run_id}/slides/{angle_index}/{slide_number}/swap-image")
async def swap_slide_image(run_id: str, angle_index: int, slide_number: int, body: dict) -> dict:
    query = body.get("query", "")
    if not query:
        raise HTTPException(status_code=422, detail="query is required")
    return await svc_swap_image(run_id, angle_index, slide_number, query, body.get("source", "pexels"))


@router.post("/{run_id}/slides/{angle_index}/new")
async def new_slide(run_id: str, angle_index: int, body: dict) -> dict:
    return svc_create_slide(
        run_id,
        angle_index,
        body.get("type", "content"),
        body.get("theme", "aurora"),
        canvas_template=body.get("canvas_template"),
    )


@router.post("/{run_id}/slides/{angle_index}/{slide_number}/upload-image")
async def upload_slide_image(
    run_id: str, angle_index: int, slide_number: int,
    file: UploadFile = File(...),
) -> dict:
    """Upload an image file from the user's filesystem → save to slide → re-render PNG."""
    file_bytes = await file.read()
    return await svc_upload_image(run_id, angle_index, slide_number, file_bytes, file.filename or "image.jpg")


@router.post("/{run_id}/slides/{angle_index}/{slide_number}/swap-image-url")
async def swap_slide_image_url(
    run_id: str, angle_index: int, slide_number: int,
    request: SwapImageUrlRequest,
) -> dict:
    """Download an image from a URL → save to slide → re-render PNG."""
    return await svc_swap_image_url(run_id, angle_index, slide_number, request.url)


# ── Asset library ──────────────────────────────────────────────────────────────

@router.get("/assets/library")
async def get_image_library(run_id: str = "") -> dict:
    """Return all images for a run (grouped by angle) + persistent user uploads."""
    return asset_library_service.get_image_library(run_id)


@router.post("/assets/upload")
async def upload_to_library(file: UploadFile = File(...)) -> dict:
    """Upload an image to the persistent user_uploads/ folder (not tied to any run)."""
    file_bytes = await file.read()
    return asset_library_service.upload_to_library(file_bytes, file.filename or "upload.jpg")


@router.delete("/assets/image")
async def delete_image(request: ImageDeleteRequest) -> dict:
    """Permanently delete an image from disk. Path must be within allowed roots."""
    return asset_library_service.delete_image(request.path)


@router.get("/{run_id}/slides/{angle_index}/{slide_number}/canvas")
async def get_canvas(run_id: str, angle_index: int, slide_number: int) -> dict:
    """Return saved Fabric canvas JSON + current slide data. canvas_json is None until first save."""
    canvas_json = asset_library_service.load_canvas(run_id, angle_index, slide_number)
    path = slides_json_path(run_id, angle_index)
    slides = read_slides(path)
    slide = next((s for s in slides if s.get("slide_number") == slide_number), None)
    return {"canvas_json": canvas_json, "slide": slide}


@router.put(
    "/{run_id}/slides/{angle_index}/{slide_number}/canvas",
    response_model=CanvasSaveResponse,
)
async def save_canvas(
    run_id: str, angle_index: int, slide_number: int, request: CanvasSaveRequest,
) -> CanvasSaveResponse:
    """Persist the Fabric.js canvas JSON AND re-render the slide PNG.

    Fabric JSON is the canonical source of truth. On save the backend:
    - extracts inline base64 image data (from user uploads) to disk
    - rewrites the srcs in the JSON to local paths
    - writes canvas_NN.json alongside slides.json
    - re-renders png/slide_NN.png via Playwright + window.Renderer.renderFromCanvasJson
    - returns a cache-bust-decorated PNG URL so the preview refreshes cleanly.
    """
    result = await asset_library_service.save_canvas(
        run_id, angle_index, slide_number, request.fabric_json,
    )
    return CanvasSaveResponse(**result)
