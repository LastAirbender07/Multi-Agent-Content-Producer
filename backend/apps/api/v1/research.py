from fastapi import APIRouter
from core.orchestration.contracts import ResearchRequest, ResearchResponse
from core.orchestrators.research.orchestrator import ResearchOrchestrator
from core.orchestrators.research.llm_drafter import draft_research, refine_research
from apps.api.v1.schemas import LLMDraftRequest, LLMRefineRequest

router = APIRouter(prefix="/research", tags=["research"])

@router.post("/run", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
    orchestrator = ResearchOrchestrator()
    return await orchestrator.run(request.model_dump())


@router.post("/llm-draft", response_model=ResearchResponse)
async def llm_draft(request: LLMDraftRequest) -> ResearchResponse:
    return await draft_research(request.topic, request.context, request.run_id)


@router.post("/llm-refine", response_model=ResearchResponse)
async def llm_refine(request: LLMRefineRequest) -> ResearchResponse:
    current = ResearchResponse.model_validate(request.current_result)
    return await refine_research(request.topic, current, request.feedback)
