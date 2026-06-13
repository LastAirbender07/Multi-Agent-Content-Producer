from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse

from core.orchestration.contracts import ContentRequest, ContentResponse
from core.orchestrators.content.orchestrator import ContentOrchestrator
from configs.settings import get_settings

router = APIRouter(prefix="/content", tags=["content"])
_orchestrator = ContentOrchestrator()
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir  # outputs/runs/


@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    return await _orchestrator.run(request)


@router.get("/{run_id}/blog-post", response_class=PlainTextResponse)
async def get_blog_post_markdown(run_id: str) -> str:
    path = _OUTPUTS_ROOT / run_id / "blog_post.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post not found for this run")
    return path.read_text(encoding="utf-8")


@router.get("/{run_id}/blog-post.html", response_class=HTMLResponse)
async def get_blog_post_html(run_id: str) -> str:
    path = _OUTPUTS_ROOT / run_id / "blog_post.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post HTML not found for this run")
    return path.read_text(encoding="utf-8")
