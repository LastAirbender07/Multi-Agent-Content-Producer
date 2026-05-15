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
    topic: str = Field(..., min_length=2, description="The main topic to research")
    mode: Literal["quick", "standard", "deep"] = Field(default="standard", description="The depth of the research")
    freshness: Literal["breaking", "recent", "evergreen"] = Field(default="recent", description="The freshness of the information")
    explicit_urls: list[str] = Field(default_factory=list, description="List of explicit URLs to include in the research")
    needs_claim_verification: bool = Field(default=False, description="Whether the research requires claim verification")
    tool_selection_mode: Literal["auto", "manual", "hybrid"] = Field(default="auto", description="Mode for selecting tools during research")
    selected_tools: list[str] = Field(default_factory=list, description="List of tools selected for the research (used if tool_selection_mode is manual or hybrid)")
    strict_tools: bool = Field(default=False, description="Whether to strictly adhere to the selected tools (used if tool_selection_mode is hybrid)")
    include_debug_trace: bool = Field(default=True, description="Whether to include debug trace information in the research results")
    budget: BudgetConfig = Field(default_factory=BudgetConfig, description="Budget configuration for the research run")
    preprocessed_queries: list[str] = Field(default_factory=list, description="Pre-generated search queries from the query preprocessor; if non-empty, routing policy uses these instead of generating generic variants from the topic")

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

class LLMEvaluationOutput(BaseModel):
    factual_grounding: float = Field(default=0.0, description="0-1: Are claims traceable to the provided evidence snippets?")
    topic_relevance: float = Field(default=0.0, description="0-1: Does the synthesis actually address the research topic?")
    specificity: float = Field(default=0.0, description="0-1: Does the synthesis contain concrete facts/numbers vs vague generalities?")
    coverage_breadth: float = Field(default=0.0, description="0-1: Are multiple distinct aspects of the topic covered?")
    overall_score: float = Field(default=0.0, description="0-1: Holistic quality score (not just an average — use judgement)")
    reasoning: str = Field(default="", description="2-3 sentence explanation of the scores, noting specific strengths or gaps")

class EvaluationResult(BaseModel):
    passed: bool = Field(..., description="Whether the evaluation passed or failed")
    should_refine: bool = Field(default=False, description="Whether the research should be refined based on the evaluation results")
    reason: str = Field(..., description="Detailed reason for the evaluation result")
    source_count: int = Field(..., description="Number of sources evaluated")
    coverage_score: float = Field(default=0.0, description="Score representing the coverage of the research topic by the collected evidence")
    source_diversity_score: float = Field(default=0.0, description="Score representing the diversity of sources collected during the research")
    llm_content_score: float = Field(default=0.0, description="LLM judge's overall content quality score (0-1)")
    source_score: float = Field(default=0.0, description="Source-based score combining coverage and diversity (0-1)")
    combined_confidence: float = Field(default=0.0, description="Final confidence: llm_content_score*0.6 + source_score*0.4")

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


# ─── Angle Orchestrator Contracts ────────────────────────────────────────────

class Angle(BaseModel):
    statement: str = Field(..., description="The angle thesis in 1-2 sentences — the core idea")
    emotional_hook: str = Field(..., description="The emotion targeted: curiosity / anger / hope / FOMO")
    supporting_evidence: str = Field(..., description="Key data point from research that backs this angle")

class AngleGenerationOutput(BaseModel):
    angles: list[Angle] = Field(..., description="Generated content angles")

class AutoSelectionOutput(BaseModel):
    selected_indices: list[int] = Field(..., description="0-based indices of the chosen angles")
    reasoning: str = Field(..., description="Why these angles were chosen over the others")

class AngleEvaluation(BaseModel):
    passed: bool = Field(..., description="Whether the angle generation passed the quality gate")
    reason: str = Field(..., description="Reason for the evaluation result")

class AngleRequest(BaseModel):
    topic: str = Field(..., min_length=2, description="The topic to generate angles for")
    synthesis: ResearchSynthesis = Field(..., description="Research synthesis to base angles on")
    run_id: Optional[str] = Field(default=None, description="Run ID from the pipeline; generated if not provided")
    mode: Literal["auto", "manual"] = Field(default="manual", description="auto = LLM selects; manual = human selects via interrupt")
    max_angles_to_select: int = Field(default=3, description="How many angles to select in auto mode")

class AngleResponse(BaseModel):
    run_id: str = Field(..., description="Run ID for this angle generation run")
    status: RunStatus = Field(default=RunStatus.PENDING)
    angles: list[Angle] = Field(default_factory=list, description="All generated angles")
    selected_angles: list[Angle] = Field(default_factory=list, description="Angles selected for content generation")
    selection_reasoning: str = Field(default="", description="Reasoning behind the selection (populated in auto mode)")
    evaluation: Optional[AngleEvaluation] = Field(default=None)
    errors: list[str] = Field(default_factory=list)
    output_path: str = Field(default="")


# ─── Content Generation Orchestrator Contracts ─────────────────────────────────

class SlideType(str, Enum):
    hook = "hook"
    content = "content"
    stat = "stat"
    quote = "quote"
    cta = "cta"
    engage = "engage"

class Slide(BaseModel):
    slide_number: int = Field(..., description="The position of the slide in the content sequence")
    type: SlideType = Field(..., description="The type of slide (hook, content, stat, quote, cta)")
    title: str = Field(..., description="The title or main text of the slide")
    body: str = Field(..., description="The body or supporting text of the slide")
    bullets: list[str] = Field(default_factory=list, description="Bullet points for content slides (3-5 items)")
    stat_value: Optional[str] = Field(default=None, description="The value of the stat if the slide type is 'stat'")
    stat_label: Optional[str] = Field(default=None, description="The descriptive label below a stat value eg: 'workers affected'")
    chart_type: Optional[str] = Field(default=None, description="Chart type for stat slides: bar|column|line|donut|radar|funnel")
    chart_data: Optional[dict] = Field(default=None, description="Chart data dict: {labels: [...], values: [...]} or {labels: [...], datasets: [{label, values}]} for radar")
    image_query: Optional[str] = Field(default=None, description="Search query for the image — written for the chosen source tool (specific if ddgs, abstract if pexels)")
    image_source_preference: Optional[Literal["ddgs", "pexels", "none"]] = Field(default=None, description="Which image tool to use: ddgs=real people/events/places, pexels=generic concepts/stock, none=no image needed")

class SlideGenerationOutput(BaseModel):
    slides: list[Slide] = Field(..., description="Generated slides for the content")

class CarouselContent(BaseModel):
    angle_index: int = Field(..., description="The index of the angle this content is based on")
    angle_statement: str = Field(..., description="The statement of the angle this content is based on")
    emotional_hook: str = Field(..., description="The emotional hook this content is targeting")
    hook: str = Field(..., description="The hook text for the content")
    slides: list[Slide] = Field(..., description="The list of slides that make up the carousel content")
    caption: str = Field(..., description="The caption text for the carousel")
    hashtags: list[str] = Field(default_factory=list, description="List of hashtags to include with the content")
    cta: Optional[str] = Field(default=None, description="Call to action text for the content, if applicable")

class ImageAsset(BaseModel):
    slide_number: int = Field(..., description="The slide number this image asset corresponds to")
    source: str = Field(..., description="pexels, ddgs, brand, colour")
    original_url: Optional[str] = Field(default=None, description="The original URL of the image if sourced from the web")
    local_raw_path: Optional[str] = Field(default=None, description="Local path to the raw image file")
    processed_path: Optional[str] = Field(default=None, description="Local path to the processed image file ready for use in content")

class ContentRequest(BaseModel):
    run_id: str = Field(..., description="Run ID from the pipeline")
    topic: str = Field(..., min_length=2, description="The topic to generate content for")
    selected_angles: list[dict] = Field(..., description="The angles selected for content generation")
    research_summary: str = Field(..., description="Summary of the research findings to inform content generation")
    key_points: list[str] = Field(default_factory=list, description="Key points from the research to inform content generation")
    template: str = "auto"
    max_slides: int = Field(default=14, description="Maximum number of slides to generate for the content (ideal 10-14, hard cap 20)")
    min_slides: int = Field(default=4, description="Minimum number of slides to generate for the content")
    image_source: Literal["auto", "pexels", "ddgs"] = Field(default="auto", description="Global override: auto = trust LLM per-slide preference, pexels = force all slides to stock, ddgs = force all slides to web images")

class ContentResponse(BaseModel):
    run_id: str = Field(..., description="Run ID for this content generation run")
    status: RunStatus = Field(default=RunStatus.PENDING)
    angles_processed: list[int] = Field(default_factory=list, description="Indices of angles that have been processed for content generation")
    output_paths: list[str] = Field(default_factory=list, description="List of output paths for the generated content")
    carousel_paths: list[list[str]] = Field(default_factory=list, description="Per-angle list of PNG paths: carousel_paths[i] = slide PNGs for angle i")
    errors: list[str] = Field(default_factory=list)

class CaptionOutput(BaseModel):
    caption: str = Field(..., description="Generated caption text for the content")
    hashtags: list[str] = Field(default_factory=list, description="List of generated hashtags to include with the content without the # symbol")
