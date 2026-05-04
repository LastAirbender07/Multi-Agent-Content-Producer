from fastapi import APIRouter
from pydantic import BaseModel, Field
from apps.cli.run_workflow import ContentPipelineOrchestrator

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineRequest(BaseModel):
    topic: str = Field(..., min_length=2, description="The topic to produce content for")
    mode: str = Field(default="standard", description="Research depth: quick / standard / deep")
    freshness: str = Field(default="recent", description="Information freshness: breaking / recent / evergreen")
    angle_mode: str = Field(default="auto", description="Angle selection: auto = LLM picks, manual = you pick via /angle/{run_id}/select")


class PipelineResponse(BaseModel):
    run_id: str
    topic: str
    status: str
    research_status: str
    research_summary: str
    research_key_points: list[str]
    generated_angles: list[dict]
    selected_angles: list[dict]
    selection_reasoning: str
    output_path: str
    messages: list[str]
    errors: list[str]


@router.post("/run", response_model=PipelineResponse)
async def run_pipeline(request: PipelineRequest) -> PipelineResponse:
    """
    Run the full content production pipeline end-to-end for a topic.

    Stages executed (in order):
      1. Research Orchestrator  — gathers evidence, synthesises findings
      2. Angle Orchestrator     — generates content angles, selects the strongest

    angle_mode=auto:   both stages complete in one call. selected_angles is populated.
    angle_mode=manual: research + angle generation run, but selection is skipped.
                       Use the run_id from this response to call
                       POST /api/v1/angle/{run_id}/select with your chosen indices.
    """
    orchestrator = ContentPipelineOrchestrator()
    state = await orchestrator.run(
        topic=request.topic,
        mode=request.mode,
        freshness=request.freshness,
        angle_mode=request.angle_mode,
    )

    research_data = state.get("research_data") or {}
    run_id = state.get("run_id", "")

    if state.get("errors"):
        status = "failed"
    elif not state.get("selected_angles") and request.angle_mode == "auto":
        status = "partial"
    elif request.angle_mode == "manual" and not state.get("selected_angles"):
        status = "awaiting_selection"
    else:
        status = "complete"

    return PipelineResponse(
        run_id=run_id,
        topic=request.topic,
        status=status,
        research_status=research_data.get("status", "unknown"),
        research_summary=state.get("research_summary", ""),
        research_key_points=research_data.get("key_points", []),
        generated_angles=state.get("generated_angles", []),
        selected_angles=state.get("selected_angles", []),
        selection_reasoning=state.get("selection_reasoning", ""),
        output_path=f"outputs/{run_id}" if run_id else "",
        messages=state.get("messages", []),
        errors=state.get("errors", []),
    )
