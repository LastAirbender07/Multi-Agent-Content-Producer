from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse

from core.orchestration.contracts import ContentRequest, ContentResponse
from core.orchestrators.content.orchestrator import ContentOrchestrator

router = APIRouter(prefix="/content", tags=["content"])
_orchestrator = ContentOrchestrator()


@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    """
    Generate carousel slides, caption, images, and PNG exports for selected angles.
    Also auto-generates blog_post.md and blog_post.html after all angles complete.
    """
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    return await _orchestrator.run(request)


@router.get("/{run_id}/blog-post", response_class=PlainTextResponse)
async def get_blog_post_markdown(run_id: str) -> str:
    """Return the generated Markdown blog post for a completed run."""
    path = Path("outputs") / run_id / "blog_post.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post not found for this run")
    return path.read_text(encoding="utf-8")


@router.get("/{run_id}/blog-post.html", response_class=HTMLResponse)
async def get_blog_post_html(run_id: str) -> str:
    """Return the generated HTML blog post for a completed run."""
    path = Path("outputs") / run_id / "blog_post.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post HTML not found for this run")
    return path.read_text(encoding="utf-8")
