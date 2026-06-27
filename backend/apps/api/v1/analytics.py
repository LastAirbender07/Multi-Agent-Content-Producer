from fastapi import APIRouter, Response
from core.services.analytics_service import get_analytics_summary, analytics_cache

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary(response: Response) -> dict:
    """Full analytics payload for the /analytics dashboard page."""
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return get_analytics_summary()


@router.post("/invalidate-cache")
async def invalidate_analytics_cache() -> dict:
    """Force-expire the in-memory analytics cache.

    The next GET /summary call will re-scan all run directories and rebuild
    the payload. Use this after new runs complete or from the UI refresh button.
    """
    analytics_cache.invalidate()
    return {"invalidated": True}
