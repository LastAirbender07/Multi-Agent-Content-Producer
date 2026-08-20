import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from core.orchestration.contracts import ResearchRequest, ResearchResponse
from core.orchestrators.research.orchestrator import ResearchOrchestrator
from core.orchestrators.research.llm_drafter import draft_research, refine_research
from core.services.progress_store import progress_store
from apps.api.v1.schemas import LLMDraftRequest, LLMRefineRequest

router = APIRouter(prefix="/research", tags=["research"])


@router.get("/{run_id}/events")
async def research_events(run_id: str) -> StreamingResponse:
    """Push-based SSE stream of research progress events for a given run_id.

    Subscribes to the ProgressStore queue. Events are delivered the instant
    a LangGraph node fires ``progress_store.update()``, with zero CPU overhead
    while the run is idle. The stream terminates cleanly when the graph calls
    ``progress_store.finish()`` (emitted from finalize / finalize_partial).

    Late-joining clients receive the last known state immediately on connect;
    if the run already completed they receive the final event + EOF straight away.

    Event format: ``data: {"phase": str, "pct": int, "message": str}``
    """

    async def generate():
        queue = await progress_store.subscribe(f"research:{run_id}")
        try:
            while True:
                event = await queue.get()
                if event is None:   # sentinel from progress_store.finish()
                    break
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            progress_store.unsubscribe(f"research:{run_id}", queue)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/run", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
    try:
        orchestrator = ResearchOrchestrator()
        return await orchestrator.run(request.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research orchestrator failed: {e}")


@router.get("/status/{run_id}")
async def research_status(run_id: str) -> dict:
    """Poll current progress for a research job (snapshot from ProgressStore)."""
    prog = progress_store.get(f"research:{run_id}")
    if not prog:
        return {"run_id": run_id, "status": "unknown"}
    return {
        "run_id":   run_id,
        "phase":    prog.get("phase", "unknown"),
        "pct":      prog.get("pct", 0),
        "message":  prog.get("message", ""),
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