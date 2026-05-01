from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.orchestration.contracts import AngleRequest, AngleResponse, ResearchSynthesis
from core.orchestrators.angle.orchestrator import AngleOrchestrator

router = APIRouter(prefix="/angle", tags=["angle"])

_orchestrator = AngleOrchestrator()


class AngleSelectRequest(BaseModel):
    angle_indices: list[int]


@router.post("/run", response_model=AngleResponse)
async def run_angle(request: AngleRequest) -> AngleResponse:
    """
    Start angle generation for a topic and research synthesis.

    - mode=auto: returns immediately with selected_angles (LLM picks).
    - mode=manual: returns status=pending with all generated angles.
                   Call POST /angle/{run_id}/select to complete.
    """
    return await _orchestrator.run(request.model_dump())


@router.post("/{run_id}/select", response_model=AngleResponse)
async def select_angles(run_id: str, body: AngleSelectRequest) -> AngleResponse:
    """
    Resume a paused manual-mode angle run with the human's angle selection.
    Provide a list of 0-based angle indices from the /run response.
    """
    if not body.angle_indices:
        raise HTTPException(status_code=422, detail="angle_indices must not be empty")
    return await _orchestrator.resume(run_id=run_id, selected_indices=body.angle_indices)
