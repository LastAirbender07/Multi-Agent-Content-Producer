from fastapi import APIRouter
from core.services.analytics_service import get_analytics_summary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def analytics_summary() -> dict:
    """Full analytics payload for the /analytics dashboard page."""
    return get_analytics_summary()
