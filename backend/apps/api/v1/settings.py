from fastapi import APIRouter
from core.services.settings_service import get_user_settings, update_user_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/")
async def read_settings() -> dict:
    """Return current effective settings. API keys are always masked."""
    return get_user_settings()


@router.put("/")
async def write_settings(body: dict) -> dict:
    """Update user-editable settings. Returns merged settings after update."""
    return update_user_settings(body)
