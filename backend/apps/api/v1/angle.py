from fastapi import APIRouter, HTTPException
from core.orchestration.contracts import AngleRequest, AngleResponse
from core.orchestrators.angle.orchestrator import AngleOrchestrator
from apps.api.v1.schemas import AngleSelectRequest

router = APIRouter(prefix="/angle", tags=["angle"])

_orchestrator = AngleOrchestrator()


@router.post("/run", response_model=AngleResponse)
async def run_angle(request: AngleRequest) -> AngleResponse:
    """
    Start angle generation for a topic and research synthesis.

    - mode=auto: returns immediately with selected_angles (LLM picks).
    - mode=manual: returns status=pending with all generated angles.
                   Call POST /angle/{run_id}/select to complete.
    """
    return await _orchestrator.run(request.model_dump())


@router.post("/regenerate", response_model=AngleResponse)
async def regenerate_angles(request: AngleRequest) -> AngleResponse:
    """
    Generate a fresh set of angles for the same synthesis, avoiding previously seen ones.

    Pass the statements from the previous run in exclude_statements so the LLM
    produces completely different angles. Uses the same run_id to group outputs.
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
