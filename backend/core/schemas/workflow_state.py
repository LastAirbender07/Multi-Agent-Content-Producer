from __future__ import annotations
from typing import Any, TypedDict
from core.orchestration.contracts import (
    EvaluationResult,
    Evidence,
    ResearchRequest,
    ResearchSynthesis,
    RoutePlan,
    SkippedTool,
    ToolTrace
)

class ResearchGraphState(TypedDict, total=False):
    request: ResearchRequest
    run_id: str
    loop_count: int
    route_plan: RoutePlan
    raw_tool_outputs: dict[str, Any]
    tool_traces: list[ToolTrace]
    skipped_tools: list[SkippedTool]
    evidence: list[Evidence]
    synthesis: ResearchSynthesis
    evaluation: EvaluationResult
    degraded_flags: list[str]
    errors: list[str]
    messages: list[str]
    output_path: str

class AngleGraphState(TypedDict, total=False):
    # All Pydantic objects stored as dicts to keep MemorySaver serialization safe
    request: dict           # AngleRequest.model_dump()
    run_id: str
    angles: list[dict]      # list of Angle.model_dump()
    selected_angles: list[dict]
    selection_reasoning: str
    evaluation: dict        # AngleEvaluation.model_dump()
    errors: list[str]
    messages: list[str]
    output_path: str

class ContentWorkflowState(TypedDict, total=False):
    topic: str
    run_id: str
    angle_mode: str             # "auto" or "manual" — set by pipeline caller
    research_data: dict[str, Any]
    research_summary: str
    generated_angles: list[dict]
    selected_angles: list[dict]
    selection_reasoning: str
    content_slides: list[dict]
    content_hook: str
    content_caption: str
    content_hashtags: list[str]
    messages: list[str]
    errors: list[str]
