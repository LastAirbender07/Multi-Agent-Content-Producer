from fastapi import APIRouter
from core.orchestration.contracts import ResearchRequest, ResearchResponse
from core.orchestrators.research.orchestrator import ResearchOrchestrator

router = APIRouter(prefix="/research", tags=["research"])

@router.post("/run", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
    orchestrator = ResearchOrchestrator()
    return await orchestrator.run(request.model_dump())