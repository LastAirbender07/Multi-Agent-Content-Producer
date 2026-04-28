from __future__ import annotations
from typing import Any, TypedDict
from core.orchestration.contracts import (
    EvaluationResult,
    Evidence,
    ResearchRequest,
    ResearchSynthesis,
    RoutePlan,
    SkippedTool,
    TootlTrace
)

class ResearchGraphState(TypedDict, total=False):
    request: ResearchRequest
    run_id: str
    loop_count: int
    route_plan: RoutePlan
    raw_tool_outputs: dict[str, Any]
    tool_traces: list[TootlTrace]
    skipped_tools: list[SkippedTool]
    evidence: list[Evidence]
    synthesis: ResearchSynthesis
    evaluation: EvaluationResult
    degraded_flags: list[str]
    errors: list[str]
    output_path: str

class ContentWorkflowState(TypedDict, total=False):
    topic: str
    research_data: dict[str, Any]
    research_summary: str
    selected_angle: str
    generated_angles: list[dict[str, Any]]
    content_slides: list[dict[str, Any]]
    content_hook: str
    content_caption: str
    content_hashtags: list[str]
    messages: list[str]
    errors: list[str]
