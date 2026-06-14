import json as _json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse

from apps.api.v1.schemas import SlideEditRequest, SlideEditResponse, BlogPostUpdateRequest
from core.orchestration.contracts import ContentRequest, ContentResponse
from core.orchestrators.content.blog_post_generator import _markdown_to_html
from core.orchestrators.content.orchestrator import ContentOrchestrator
from core.persistence.run_repository import read_topic, static_image_url
from core.persistence.slide_repository import read_slides, slides_json_path
from core.services.run_browser_service import get_run_manifest, list_runs
from core.services.slide_editor_service import (
    ai_rewrite_slide as svc_ai_rewrite,
    create_slide as svc_create_slide,
    edit_slide as svc_edit_slide,
    get_slide_html_preview,
    swap_slide_image as svc_swap_image,
)
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/content", tags=["content"])
_orchestrator = ContentOrchestrator()
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


# ── Core pipeline ──────────────────────────────────────────────────────────────

@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    return await _orchestrator.run(request)


# ── Blog post ──────────────────────────────────────────────────────────────────

@router.get("/{run_id}/blog-post", response_class=PlainTextResponse)
async def get_blog_post_markdown(run_id: str) -> str:
    path = _OUTPUTS_ROOT / run_id / "blog_post.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post not found")
    return path.read_text(encoding="utf-8")


@router.get("/{run_id}/blog-post.html", response_class=HTMLResponse)
async def get_blog_post_html(run_id: str) -> str:
    path = _OUTPUTS_ROOT / run_id / "blog_post.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post HTML not found")
    return path.read_text(encoding="utf-8")


@router.put("/{run_id}/blog-post")
async def update_blog_post(run_id: str, request: BlogPostUpdateRequest) -> dict:
    run_dir = _OUTPUTS_ROOT / run_id
    if not run_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found")
    md_path = run_dir / "blog_post.md"
    html_path = run_dir / "blog_post.html"
    md_path.write_text(request.markdown, encoding="utf-8")
    topic = read_topic(run_id)
    html_path.write_text(_markdown_to_html(request.markdown, topic, []), encoding="utf-8")
    return {"status": "saved", "md_chars": len(request.markdown)}


# ── Run browser ────────────────────────────────────────────────────────────────

@router.get("/runs")
async def list_runs_endpoint() -> dict:
    return list_runs()


@router.get("/{run_id}/manifest")
async def get_run_manifest_endpoint(run_id: str) -> dict:
    return get_run_manifest(run_id)


# ── Slide data ─────────────────────────────────────────────────────────────────

@router.get("/{run_id}/slides/{angle_index}")
async def get_slides(run_id: str, angle_index: int) -> dict:
    path = slides_json_path(run_id, angle_index)
    return {"slides": read_slides(path)}


@router.get("/{run_id}/slides/{angle_index}/{slide_number}/preview", response_class=HTMLResponse)
async def preview_slide(run_id: str, angle_index: int, slide_number: int) -> str:
    return get_slide_html_preview(run_id, angle_index, slide_number)


# ── Slide editing ──────────────────────────────────────────────────────────────

@router.post("/{run_id}/slides/{angle_index}/{slide_number}/edit", response_model=SlideEditResponse)
async def edit_slide(run_id: str, angle_index: int, slide_number: int, request: SlideEditRequest) -> SlideEditResponse:
    return await svc_edit_slide(run_id, angle_index, slide_number, request)


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
    return svc_create_slide(run_id, angle_index, body.get("type", "content"), body.get("theme", "aurora"))
