from fastapi import APIRouter, HTTPException
from core.orchestration.contracts import ResearchRequest, ResearchResponse
from core.orchestrators.research.orchestrator import ResearchOrchestrator
from core.orchestrators.research.llm_drafter import draft_research, refine_research
from core.orchestrators.research import _progress_store as progress
from apps.api.v1.schemas import LLMDraftRequest, LLMRefineRequest

router = APIRouter(prefix="/research", tags=["research"])

@router.post("/run", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
    try:
        orchestrator = ResearchOrchestrator()
        return await orchestrator.run(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research orchestrator failed: {e}")


@router.get("/status/{run_id}")
async def research_status(run_id: str) -> dict:
    """Poll mid-run progress for a research job."""
    prog = progress.get(run_id)
    if not prog:
        return {"run_id": run_id, "status": "unknown"}
    return {
        "run_id": run_id,
        "node": prog["node"],
        "step": prog["step"],
        "total": prog["total"],
        "pct": round(prog["step"] / prog["total"] * 100),
        "label": progress.NODE_LABELS.get(prog["node"], "Running…"),
    }


@router.post("/llm-draft", response_model=ResearchResponse)
async def llm_draft(request: LLMDraftRequest) -> ResearchResponse:
    try:
        return await draft_research(request.topic, request.context, request.run_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM draft failed: {e}")


@router.post("/llm-refine", response_model=ResearchResponse)
async def llm_refine(request: LLMRefineRequest) -> ResearchResponse:
    try:
        current = ResearchResponse.model_validate(request.current_result)
        return await refine_research(request.topic, current, request.feedback)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid current_result: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM refine failed: {e}")
