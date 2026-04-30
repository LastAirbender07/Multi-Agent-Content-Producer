from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field
from configs.settings import get_settings

class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PARTIAL_SUCCESS = "partial_success"
    SUCCESS = "success"
    FAILED = "failed"

class BudgetConfig(BaseModel):
    max_tool_calls: int = Field(default=6, description="Maximum number of tool calls allowed for the run")
    max_sources: int = Field(default=15, description="Maximum number of sources allowed for the run")
    max_crawl_urls: int = Field(default=5, description="Maximum number of URLs allowed for crawling")
    max_refinement_loops: int = Field(default_factory=lambda: get_settings().research_max_refinement_loops, description="Maximum number of refinement loops allowed")
    timeout_seconds: int = Field(default=300, description="Maximum time allowed for the run in seconds")

class ResearchRequest(BaseModel):
    schema_version: str = Field(default="1.0", description="Schema version for the research request")
    topic: str = Field(..., description="The main topic to research")
    mode: Literal["quick", "standard", "deep"] = Field(default="standard", description="The depth of the research")
    freshness: Literal["breaking", "recent", "evergreen"] = Field(default="recent", description="The freshness of the information")
    explicit_urls: list[str] = Field(default_factory=list, description="List of explicit URLs to include in the research")
    needs_claim_verification: bool = Field(default=False, description="Whether the research requires claim verification")
    tool_selection_mode: Literal["auto", "manual", "hybrid"] = Field(default="auto", description="Mode for selecting tools during research")
    selected_tools: list[str] = Field(default_factory=list, description="List of tools selected for the research (used if tool_selection_mode is manual or hybrid)")
    strict_tools: bool = Field(default=False, description="Whether to strictly adhere to the selected tools (used if tool_selection_mode is hybrid)")
    include_debug_trace: bool = Field(default=True, description="Whether to include debug trace information in the research results")
    budget: BudgetConfig = Field(default_factory=BudgetConfig, description="Budget configuration for the research run")

class ToolTrace(BaseModel):
    tool_name: str = Field(..., description="Name of the tool called")
    started_at: datetime = Field(..., description="Timestamp when the tool call started")
    finished_at: Optional[datetime] = Field(default=None, description="Timestamp when the tool call finished")
    success: bool = Field(default=False, description="Whether the tool call was successful")
    error: Optional[str] = Field(default=None, description="Error message if the tool call failed")

class RoutePlan(BaseModel):
    selected_tools: list[str] = Field(default_factory=list, description="List of tools selected for the research run")
    crawl_urls: list[str] = Field(default_factory=list, description="List of URLs selected for crawling during the research run")
    query_variants: list[str] = Field(default_factory=list, description="List of query variants generated for the research run")
    rationale: list[str] = Field(default_factory=list, description="List of rationales for the selected route plan")
    selection_mode_used: Literal["auto", "manual", "hybrid"] = Field(default="auto", description="The mode used for selecting the route plan")

class SkippedTool(BaseModel):
    tool_name: str = Field(..., description="Name of the tool that was skipped")
    reason_type: Literal["missing_context", "invalid_selection", "runtime_error", "policy_blocked"] = Field(..., description="Type of reason why the tool was skipped")
    reason_message: list[str] = Field(default_factory=list, description="Detailed message(s) explaining why the tool was skipped")
    provided_context: dict[str, Any] = Field(default_factory=dict, description="Context that was provided for the tool call, if any")

class Evidence(BaseModel):
    evidence: str = Field(..., description="The evidence collected during the research run")
    source_type: Literal["news", "web_search", "crawl"] = Field(..., description="The type of source from which the evidence was collected")
    title: str = Field(..., description="Title of the source from which the evidence was collected")
    url: str = Field(..., description="URL of the source from which the evidence was collected")
    snippet: Optional[str] = Field(default=None, description="Optional snippet of the evidence collected")
    extracted_content: Optional[str] = Field(default=None, description="Optional extracted content from the source, if applicable")
    published_at: Optional[datetime] = Field(default=None, description="Optional publication date of the source, if available")
    source_name: Optional[str] = Field(default=None, description="Optional name of the source, if available")
    retrieval_time: datetime = Field(..., description="Timestamp when the evidence was retrieved")
    credibility_score: float = Field(default=0.0, description="Optional credibility score of the evidence, if available")
    relevance_score: float = Field(default=0.0, description="Optional relevance score of the evidence to the research topic, if available")

class ResearchSynthesis(BaseModel):
    summary: str = Field(..., description="A synthesized summary of the research findings")
    key_points: list[str] = Field(default_factory=list, description="List of key points derived from the research findings")
    contradictions: list[str] = Field(default_factory=list, description="List of any contradictions found in the research findings")
    implications: list[str] = Field(default_factory=list, description="List of implications derived from the research findings")
    confidence_score: float = Field(default=0.0, description="Overall confidence score of the research synthesis, if available")
    gaps: list[str] = Field(default_factory=list, description="List of any gaps identified in the research findings")

class EvaluationResult(BaseModel):
    passed: bool = Field(..., description="Whether the evaluation passed or failed")
    should_refine: bool = Field(default=False, description="Whether the research should be refined based on the evaluation results")
    reason: str = Field(..., description="Detailed reason for the evaluation result")
    source_count: int = Field(..., description="Number of sources evaluated")
    coverage_score: float = Field(default=0.0, description="Score representing the coverage of the research topic by the collected evidence")
    source_diversity_score: float = Field(default=0.0, description="Score representing the diversity of sources collected during the research")

class ResearchResponse(BaseModel):
    schema_version: str = Field(default="1.0", description="Schema version for the research response")
    run_id: str = Field(..., description="Unique identifier for the research run")
    status: RunStatus = Field(default=RunStatus.PENDING, description="Current status of the research run")
    topic: str = Field(..., description="The main topic of the research")
    route_plan: RoutePlan = Field(default_factory=RoutePlan, description="The route plan selected for the research run")
    evidence: list[Evidence] = Field(default_factory=list, description="List of evidence collected during the research run")
    synthesis: Optional[ResearchSynthesis] = Field(default=None, description="Optional synthesis of the research findings, if available")
    evaluation: Optional[EvaluationResult] = Field(default=None, description="Optional evaluation results of the research findings, if available")
    tool_traces: list[ToolTrace] = Field(default_factory=list, description="List of tool traces recorded during the research run")
    skipped_tools: list[SkippedTool] = Field(default_factory=list, description="List of tools that were skipped during the research run along with reasons")
    degraded_flags: list[str] = Field(default_factory=list, description="List of any degraded capabilities or fallback mechanisms that were triggered during the research run")
    errors: list[str] = Field(default_factory=list, description="List of any errors encountered during the research run")
    output_path: str = Field(default="", description="Path to the output data generated from the research run")
