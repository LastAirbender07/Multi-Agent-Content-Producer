from fastapi import APIRouter, HTTPException
from core.orchestration.contracts import ContentRequest, ContentResponse
from core.orchestrators.content.orchestrator import ContentOrchestrator

router = APIRouter(prefix="/content", tags=["content"])
_orchestrator = ContentOrchestrator()


@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    """
    Generate carousel slides, caption, images, and PNG exports for selected angles.

    Provide run_id from a prior angle/research run to group outputs together.
    selected_angles must be a list of angle dicts (statement, emotional_hook, supporting_evidence).
    """
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    return await _orchestrator.run(request)
