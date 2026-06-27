from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.services.blogger_service import (
    get_blog_info,
    is_configured,
    publish_post,
)
from infra.logging import get_logger

router = APIRouter(prefix="/publishing", tags=["publishing"])
logger = get_logger(__name__)


class BloggerPostRequest(BaseModel):
    title: str
    html_content: str
    labels: list[str] = []
    is_draft: bool = False
    blog_id: str | None = None   # override the default blog ID


@router.get("/blogger/status")
async def blogger_status() -> dict:
    """Check whether Blogger credentials are configured and the token is valid."""
    if not is_configured():
        return {
            "configured": False,
            "message": "credentials.json not found. Download Desktop app OAuth credentials from Google Cloud Console.",
        }
    try:
        info = get_blog_info()
        return {"configured": True, "blog": info}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        return {
            "configured": True,
            "token_valid": False,
            "message": f"Credentials file found but token needs refresh: {str(e)[:120]}",
        }


@router.post("/blogger")
async def publish_to_blogger(body: BloggerPostRequest) -> dict:
    """Publish an HTML post to Google Blogger.

    On first call (no token.json): opens a browser tab for OAuth consent.
    On subsequent calls: fully automatic — no browser needed.

    Returns the live post URL and ID on success.
    """
    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="credentials.json not found at backend root. See Docs/publishing/BLOGGER_AUTOMATION.md.",
        )
    try:
        result = publish_post(
            title=body.title,
            html_content=body.html_content,
            labels=body.labels or [],
            is_draft=body.is_draft,
            blog_id=body.blog_id,
        )
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("blogger_endpoint_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
