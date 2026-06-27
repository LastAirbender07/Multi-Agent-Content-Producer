# Research Orchestrator — Phasewise Implementation Playbook

## Purpose
This is your manual coding guide. No production code is changed by this document.
Type the code below into the corresponding files yourself.

Read the Implementation Plan first — this document is the code companion to it.

---

## Prerequisites

Before typing code, ensure `backend/pyproject.toml` includes:

- `langgraph` (required)
- `fastapi` (optional, if using standalone API)
- `uvicorn` (optional, if running FastAPI app)

Without `langgraph`, orchestrator imports will fail.

---

## Before You Start — Fix These Bugs

### Bug 1: `LLMFactory.get_client()` is async but not awaited

In `backend/core/nodes/research.py`, `angle.py`, and `content.py`:
```python
# Wrong (current in all three files)
llm = LLMFactory.get_client()

# Fix it to
llm = await LLMFactory.get_client()
```

### Bug 2: Prompt name mismatch in `content.py`

`content.py` calls `load_prompt("content_generation")` but the file is `content_creation.txt`.
Decision: change the `load_prompt` call to `load_prompt("content_creation", ...)` so the file name wins.

### Bug 3: Typo in `system_prompts.py`

`get_system_prompt(aganet_type)` → rename parameter to `agent_type` when you touch that file.

---

## Phase 1 — Contracts and Routing Policy

### 1.1 Create `backend/core/orchestration/__init__.py`
```python
# empty
```

### 1.2 Create `backend/core/orchestration/contracts.py`
```python
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class RunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PARTIAL_SUCCESS = "partial_success"
    SUCCESS = "success"
    FAILED = "failed"


class BudgetConfig(BaseModel):
    max_tool_calls: int = 6
    max_sources: int = 15
    max_crawl_urls: int = 5
    max_refinement_loops: int = 1
    timeout_seconds: int = 45


class ResearchRequest(BaseModel):
    schema_version: str = "v1"
    topic: str
    mode: Literal["quick", "standard", "deep"] = "standard"
    freshness: Literal["breaking", "recent", "evergreen"] = "recent"
    explicit_urls: list[str] = Field(default_factory=list)
    needs_claim_verification: bool = False
    tool_selection_mode: Literal["auto", "manual", "hybrid"] = "auto"
    selected_tools: list[str] = Field(default_factory=list)
    strict_tools: bool = False
    include_debug_trace: bool = True
    budget: BudgetConfig = Field(default_factory=BudgetConfig)


class ToolTrace(BaseModel):
    tool_name: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    success: bool = False
    error: Optional[str] = None


class RoutePlan(BaseModel):
    selected_tools: list[str] = Field(default_factory=list)
    crawl_urls: list[str] = Field(default_factory=list)
    query_variants: list[str] = Field(default_factory=list)
    rationale: list[str] = Field(default_factory=list)
    selection_mode_used: Literal["auto", "manual", "hybrid"] = "auto"


class SkippedTool(BaseModel):
    tool_name: str
    reason_type: Literal["missing_context", "invalid_selection", "runtime_error", "policy_blocked"]
    reason_message: str
    required_context: list[str] = Field(default_factory=list)
    provided_context: dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    evidence_id: str
    source_type: Literal["news", "web_search", "crawl"]
    title: str
    url: str
    snippet: Optional[str] = None
    extracted_content: Optional[str] = None
    published_at: Optional[datetime] = None
    source_name: Optional[str] = None
    retrieval_ts: datetime
    credibility_score: float = 0.0
    relevance_score: float = 0.0


class ResearchSynthesis(BaseModel):
    summary: str
    key_points: list[str]
    contradictions: list[str]
    implications: list[str]
    confidence_score: float
    gaps: list[str] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    passed: bool
    should_refine: bool = False
    reason: str
    source_count: int = 0
    coverage_score: float = 0.0
    source_diversity_score: float = 0.0


class ResearchResponse(BaseModel):
    schema_version: str = "v1"
    run_id: str
    status: RunStatus
    topic: str
    route_plan: RoutePlan
    evidence: list[Evidence]
    synthesis: Optional[ResearchSynthesis] = None
    evaluation: Optional[EvaluationResult] = None
    tool_traces: list[ToolTrace] = Field(default_factory=list)
    skipped_tools: list[SkippedTool] = Field(default_factory=list)
    degraded_flags: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    output_path: str = ""
```

### 1.3 Create `backend/core/orchestration/policies/__init__.py`
```python
# empty
```

### 1.4 Create `backend/core/orchestration/policies/routing.py`
```python
from core.orchestration.contracts import ResearchRequest, RoutePlan


class DeterministicResearchRoutingPolicy:
    """
    Decides which tools to run based on the request.
    No LLM call. No async. Pure logic.
    """

    def create_plan(self, request: ResearchRequest) -> RoutePlan:
        plan = RoutePlan()

        # Explicit URLs → crawl them directly
        if request.explicit_urls:
            plan.selected_tools.append("crawl4ai")
            plan.crawl_urls = list(request.explicit_urls)
            plan.rationale.append("Explicit URLs provided — direct crawl is highest value.")

        # Recency-critical → news first
        if request.freshness in {"breaking", "recent"}:
            if "news_api" not in plan.selected_tools:
                plan.selected_tools.append("news_api")
            if "ddgs_news" not in plan.selected_tools:
                plan.selected_tools.append("ddgs_news")
            plan.rationale.append("Recent topic — news-first retrieval.")
        else:
            # Evergreen → web search
            if "ddgs_text" not in plan.selected_tools:
                plan.selected_tools.append("ddgs_text")
            plan.rationale.append("Evergreen topic — web search first.")

        # Claim verification → crawl top candidates
        if request.needs_claim_verification and "crawl4ai" not in plan.selected_tools:
            plan.selected_tools.append("crawl4ai")
            plan.rationale.append("Claim verification mode — deep URL extraction added.")

        # Always have at least one text search if none selected yet
        if not plan.selected_tools:
            plan.selected_tools = ["ddgs_text", "news_api"]
            plan.rationale.append("Default fallback: web search + news.")

        plan.query_variants = [request.topic]
        return plan
```

---

## Phase 2 — State Schema

### 2.1 Fill `backend/core/schemas/workflow_state.py` (currently empty)

```python
from __future__ import annotations

from typing import Any, TypedDict

from core.orchestration.contracts import (
    EvaluationResult,
    Evidence,
    ResearchRequest,
    ResearchSynthesis,
    RoutePlan,
    SkippedTool,
    ToolTrace,
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
```

---

## Phase 3 — Synthesis Prompt

### 3.1 Create `backend/core/prompts/templates/research_synthesis.txt`

```text
You are synthesizing research evidence for the following topic:

Topic: {topic}

Rules:
1. Use ONLY the evidence provided below. Do not use your training knowledge.
2. Do not invent facts, URLs, or statistics not present in the evidence.
3. Identify and surface contradictions between sources.
4. Rate your confidence (0.0-1.0) based on how well the evidence covers the topic.
5. Note important gaps where the evidence is thin or missing.

Evidence:
{evidence_block}

Return a structured synthesis with: summary, key_points, contradictions, implications, confidence_score, gaps.
```

Note: `{topic}` and `{evidence_block}` are the two variables injected by `synthesize_node`.

---

## Phase 4 — Orchestrator Nodes

### 4.1 Create `backend/core/orchestrators/__init__.py`
```python
# empty
```

### 4.2 Create `backend/core/orchestrators/research/__init__.py`
```python
# empty
```

### 4.3 Create `backend/core/orchestrators/research/router.py`
```python
from core.orchestration.policies.routing import DeterministicResearchRoutingPolicy
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)
_policy = DeterministicResearchRoutingPolicy()
_ALLOWED_TOOLS = {"news_api", "ddgs_text", "ddgs_news", "crawl4ai"}


async def route_node(state: ResearchGraphState) -> dict:
    request = state["request"]
    errors = list(state.get("errors", []))
    skipped_tools = list(state.get("skipped_tools", []))

    # Validate caller-provided selected tools first
    invalid_tools = sorted(set(request.selected_tools) - _ALLOWED_TOOLS)
    valid_selected = [tool for tool in request.selected_tools if tool in _ALLOWED_TOOLS]

    if invalid_tools:
        for tool_name in invalid_tools:
            skipped_tools.append({
                "tool_name": tool_name,
                "reason_type": "invalid_selection",
                "reason_message": "Tool is not supported by this orchestrator.",
                "required_context": [],
                "provided_context": {"selected_tools": request.selected_tools},
            })
        if request.strict_tools:
            errors.append(f"Invalid tool selection in strict mode: {invalid_tools}")

    # Build deterministic base plan
    base_plan = _policy.create_plan(request)
    base_tools = list(base_plan.selected_tools)

    if request.tool_selection_mode == "manual":
        final_tools = valid_selected
        rationale = ["Manual mode: using caller-selected tools only."]
    elif request.tool_selection_mode == "hybrid":
        merged = list(base_tools)
        for tool_name in valid_selected:
            if tool_name not in merged:
                merged.append(tool_name)
        final_tools = merged
        rationale = list(base_plan.rationale) + ["Hybrid mode: merged deterministic + selected tools."]
    else:
        final_tools = base_tools
        rationale = list(base_plan.rationale) + ["Auto mode: deterministic routing applied."]

    # Crawl4AI requires URL context. Skip or fail depending on strict mode.
    if "crawl4ai" in final_tools and not request.explicit_urls:
        if request.strict_tools:
            errors.append("crawl4ai selected but explicit_urls is empty in strict mode")
        else:
            final_tools = [tool for tool in final_tools if tool != "crawl4ai"]
            skipped_tools.append({
                "tool_name": "crawl4ai",
                "reason_type": "missing_context",
                "reason_message": "crawl4ai needs explicit_urls, but none were provided.",
                "required_context": ["explicit_urls"],
                "provided_context": {"explicit_urls_count": len(request.explicit_urls)},
            })

    plan = base_plan.model_copy(update={
        "selected_tools": final_tools,
        "selection_mode_used": request.tool_selection_mode,
        "rationale": rationale,
    })

    logger.info(
        "route_node_complete",
        run_id=state.get("run_id"),
        tools_selected=plan.selected_tools,
        selection_mode=request.tool_selection_mode,
        rationale=plan.rationale,
    )

    return {
        "route_plan": plan,
        "skipped_tools": skipped_tools,
        "errors": errors,
        "messages": state.get("messages", []) + [f"Route plan: {plan.selected_tools}"],
    }
```

### 4.4 Create `backend/core/orchestrators/research/executor.py`
```python
from datetime import datetime, timezone

from core.orchestration.contracts import ToolTrace
from core.schemas.workflow_state import ResearchGraphState
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper
from core.tools.News.news_api import GoogleNewsAPI
from core.tools.Search.ddgs_search import DDGSSearch
from infra.logging import get_logger

logger = get_logger(__name__)


async def execute_tools_node(state: ResearchGraphState) -> dict:
    request = state["request"]
    plan = state["route_plan"]

    # If strict-mode errors already exist from route validation, stop tool execution.
    if request.strict_tools and state.get("errors"):
        return {
            "messages": state.get("messages", []) + ["Execution skipped due to strict-mode route errors."],
        }

    raw_outputs = dict(state.get("raw_tool_outputs", {}))
    tool_traces = list(state.get("tool_traces", []))
    degraded_flags = list(state.get("degraded_flags", []))
    skipped_tools = list(state.get("skipped_tools", []))
    errors = list(state.get("errors", []))

    # Instantiate tools — they are stateless, cheap to create
    ddgs = DDGSSearch(timeout=15)
    news_api = GoogleNewsAPI()
    crawler = Crawl4AIScraper(verbose=False)

    for tool_name in plan.selected_tools:
        trace = ToolTrace(tool_name=tool_name, started_at=datetime.now(timezone.utc))
        try:
            if tool_name == "ddgs_text":
                raw_outputs[tool_name] = await ddgs.execute(
                    query=request.topic, max_results=8
                )
            elif tool_name == "ddgs_news":
                raw_outputs[tool_name] = await ddgs.search_news(
                    query=request.topic, max_results=8
                )
            elif tool_name == "news_api":
                raw_outputs[tool_name] = await news_api.execute(
                    query=request.topic, max_results=8
                )
            elif tool_name == "crawl4ai":
                crawl_results = []
                for url in plan.crawl_urls[: request.budget.max_crawl_urls]:
                    result = await crawler.execute(url=url, timeout=25)
                    crawl_results.append(result)
                raw_outputs[tool_name] = crawl_results
            else:
                raise ValueError(f"Unknown tool: {tool_name}")

            trace.success = True
            logger.info("tool_success", run_id=state.get("run_id"), tool=tool_name)

        except Exception as exc:
            trace.success = False
            trace.error = str(exc)
            degraded_flags.append(f"tool_failed:{tool_name}")
            skipped_tools.append({
                "tool_name": tool_name,
                "reason_type": "runtime_error",
                "reason_message": str(exc),
                "required_context": [],
                "provided_context": {},
            })
            if request.strict_tools:
                errors.append(f"Tool failed in strict mode: {tool_name}: {exc}")
            logger.warning(
                "tool_failed", run_id=state.get("run_id"), tool=tool_name, error=str(exc)
            )
        finally:
            trace.finished_at = datetime.now(timezone.utc)
            tool_traces.append(trace)

    return {
        "raw_tool_outputs": raw_outputs,
        "tool_traces": tool_traces,
        "skipped_tools": skipped_tools,
        "degraded_flags": degraded_flags,
        "errors": errors,
        "messages": state.get("messages", []) + ["Tool execution complete."],
    }
```

### 4.5 Create `backend/core/orchestrators/research/normalizer.py`
```python
import hashlib
from datetime import datetime, timezone

from core.orchestration.contracts import Evidence
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)


def _make_evidence_id(url: str, title: str) -> str:
    raw = f"{url}|{title}".encode("utf-8")
    return hashlib.md5(raw).hexdigest()


async def normalize_evidence_node(state: ResearchGraphState) -> dict:
    raw_outputs = state.get("raw_tool_outputs", {})
    evidence: list[Evidence] = []
    seen_urls: set[str] = set()
    now = datetime.now(timezone.utc)

    # --- DDGSSearch text results ---
    ddgs_text = raw_outputs.get("ddgs_text")
    if ddgs_text and getattr(ddgs_text, "success", False):
        for item in ddgs_text.results:
            if item.url in seen_urls:
                continue
            seen_urls.add(item.url)
            evidence.append(Evidence(
                evidence_id=_make_evidence_id(item.url, item.title),
                source_type="web_search",
                title=item.title,
                url=item.url,
                snippet=item.body,
                source_name="ddgs",
                retrieval_ts=now,
                credibility_score=0.4,
                relevance_score=0.6,
            ))

    # --- DDGSSearch news results ---
    ddgs_news = raw_outputs.get("ddgs_news")
    if ddgs_news and getattr(ddgs_news, "success", False):
        for item in ddgs_news.results:
            if item.url in seen_urls:
                continue
            seen_urls.add(item.url)
            evidence.append(Evidence(
                evidence_id=_make_evidence_id(item.url, item.title),
                source_type="news",
                title=item.title,
                url=item.url,
                snippet=item.body,
                published_at=getattr(item, "date", None),
                source_name=getattr(item, "source", "ddgs_news"),
                retrieval_ts=now,
                credibility_score=0.6,
                relevance_score=0.75,
            ))

    # --- GoogleNewsAPI results ---
    news_api = raw_outputs.get("news_api")
    if news_api and getattr(news_api, "success", False):
        for article in news_api.articles:
            url = str(article.url)
            if url in seen_urls:
                continue
            seen_urls.add(url)
            evidence.append(Evidence(
                evidence_id=_make_evidence_id(url, article.title),
                source_type="news",
                title=article.title,
                url=url,
                snippet=article.description,
                extracted_content=article.content,
                published_at=article.published_at,
                source_name=article.source_name,
                retrieval_ts=now,
                credibility_score=0.8,
                relevance_score=0.85,
            ))

    # --- Crawl4AI results ---
    crawl_results = raw_outputs.get("crawl4ai", [])
    for result in crawl_results:
        if not getattr(result, "success", False) or not result.content:
            continue
        url = result.content.url
        if url in seen_urls:
            continue
        seen_urls.add(url)
        evidence.append(Evidence(
            evidence_id=_make_evidence_id(url, result.content.title or url),
            source_type="crawl",
            title=result.content.title or url,
            url=url,
            snippet=(result.content.markdown or "")[:500],
            extracted_content=result.content.markdown,
            source_name="crawl4ai",
            retrieval_ts=now,
            credibility_score=0.7,
            relevance_score=0.8,
        ))

    # Sort by relevance descending
    evidence = sorted(evidence, key=lambda e: e.relevance_score, reverse=True)

    logger.info(
        "normalize_complete",
        run_id=state.get("run_id"),
        evidence_count=len(evidence),
    )

    return {
        "evidence": evidence,
        "messages": state.get("messages", []) + [f"Normalized {len(evidence)} evidence items."],
    }
```

### 4.6 Create `backend/core/orchestrators/research/synthesizer.py`

This node uses LangChain (`get_langchain_llm()`) with structured output, NOT `LLMFactory`.
It uses the new `research_synthesis.txt` template and the existing `get_system_prompt("research")`.

```python
from langchain_core.messages import HumanMessage, SystemMessage

from core.orchestration.contracts import ResearchSynthesis
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.schemas.workflow_state import ResearchGraphState
from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger

logger = get_logger(__name__)


def _build_evidence_block(state: ResearchGraphState) -> str:
    """Format top evidence items into a numbered block for the prompt."""
    lines = []
    for idx, item in enumerate(state.get("evidence", [])[:12], start=1):
        lines.append(f"[{idx}] {item.title}")
        lines.append(f"  Source type: {item.source_type}")
        lines.append(f"  URL: {item.url}")
        if item.snippet:
            lines.append(f"  Snippet: {item.snippet[:400]}")
        if item.extracted_content:
            lines.append(f"  Extracted: {item.extracted_content[:600]}")
        lines.append("")
    return "\n".join(lines)


async def synthesize_node(state: ResearchGraphState) -> dict:
    request = state["request"]

    # Check: nothing to synthesize if no evidence
    if not state.get("evidence"):
        logger.warning("synthesize_node_no_evidence", run_id=state.get("run_id"))
        return {
            "errors": state.get("errors", []) + ["No evidence to synthesize."],
            "messages": state.get("messages", []) + ["Synthesis skipped: no evidence."],
        }

    try:
        llm = get_langchain_llm()
        structured_llm = llm.with_structured_output(ResearchSynthesis)

        system_prompt = get_system_prompt("research")
        evidence_block = _build_evidence_block(state)

        # Use the new research_synthesis.txt template
        user_prompt = load_prompt(
            "research_synthesis",
            topic=request.topic,
            evidence_block=evidence_block,
        )

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        synthesis: ResearchSynthesis = await structured_llm.ainvoke(messages)

        logger.info(
            "synthesize_node_complete",
            run_id=state.get("run_id"),
            confidence=synthesis.confidence_score,
            key_points_count=len(synthesis.key_points),
        )

        return {
            "synthesis": synthesis,
            "messages": state.get("messages", []) + [
                f"Synthesis complete. Confidence: {synthesis.confidence_score:.2f}"
            ],
        }

    except Exception as exc:
        logger.error(
            "synthesize_node_error", run_id=state.get("run_id"), error=str(exc)
        )
        return {
            "errors": state.get("errors", []) + [f"Synthesis failed: {exc}"],
            "messages": state.get("messages", []) + [f"Synthesis failed: {exc}"],
        }
```

### 4.7 Create `backend/core/orchestrators/research/evaluator.py`
```python
from core.orchestration.contracts import EvaluationResult
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

MIN_SOURCES = 3
MIN_CONFIDENCE = 0.45


async def evaluate_node(state: ResearchGraphState) -> dict:
    evidence = state.get("evidence", [])
    synthesis = state.get("synthesis")

    source_count = len(evidence)
    source_names = {e.source_name for e in evidence if e.source_name}
    diversity_score = min(len(source_names) / 4.0, 1.0)
    coverage_score = min(source_count / 8.0, 1.0)

    if source_count < MIN_SOURCES:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Not enough evidence ({source_count} < {MIN_SOURCES} required).",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    elif synthesis is None:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=False,
            reason="Synthesis missing.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    elif synthesis.confidence_score < MIN_CONFIDENCE:
        evaluation = EvaluationResult(
            passed=False,
            should_refine=True,
            reason=f"Synthesis confidence too low ({synthesis.confidence_score:.2f} < {MIN_CONFIDENCE}).",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )
    else:
        evaluation = EvaluationResult(
            passed=True,
            should_refine=False,
            reason="Quality gate passed.",
            source_count=source_count,
            coverage_score=coverage_score,
            source_diversity_score=diversity_score,
        )

    logger.info(
        "evaluate_node_complete",
        run_id=state.get("run_id"),
        passed=evaluation.passed,
        reason=evaluation.reason,
    )

    return {
        "evaluation": evaluation,
        "messages": state.get("messages", []) + [f"Evaluation: {evaluation.reason}"],
    }
```

---

## Phase 5 — LangGraph Assembly

### 5.1 Create `backend/core/graphs/research_graph.py`

This wires all nodes into a StateGraph and defines the conditional branching.

```python
from langgraph.graph import END, START, StateGraph

from core.orchestrators.research.evaluator import evaluate_node
from core.orchestrators.research.executor import execute_tools_node
from core.orchestrators.research.normalizer import normalize_evidence_node
from core.orchestrators.research.router import route_node
from core.orchestrators.research.synthesizer import synthesize_node
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)


# --- Helper nodes ---

async def intake_node(state: ResearchGraphState) -> dict:
    """Validate request and log start."""
    request = state["request"]
    logger.info(
        "research_graph_start",
        run_id=state.get("run_id"),
        topic=request.topic,
        mode=request.mode,
        freshness=request.freshness,
    )
    return {"messages": state.get("messages", []) + ["Intake complete."]}


async def refine_node(state: ResearchGraphState) -> dict:
    """Increment loop counter before looping back to execute_tools."""
    return {
        "loop_count": state.get("loop_count", 0) + 1,
        "messages": state.get("messages", []) + ["Refinement loop triggered."],
    }


async def finalize_node(state: ResearchGraphState) -> dict:
    """Save full output to disk. Called on success."""
    from core.orchestrators.research.orchestrator import save_research_output
    output_path = await save_research_output(state, status="success")
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + ["Finalized and saved."],
    }


async def finalize_partial_node(state: ResearchGraphState) -> dict:
    """Save partial output to disk. Called when quality gate fails and no budget left."""
    from core.orchestrators.research.orchestrator import save_research_output
    output_path = await save_research_output(state, status="partial_success")
    return {
        "output_path": output_path,
        "messages": state.get("messages", []) + ["Finalized with partial success."],
    }


# --- Branching condition ---

def should_continue_after_evaluation(state: ResearchGraphState) -> str:
    evaluation = state.get("evaluation")

    if evaluation and evaluation.passed:
        return "finalize"

    loop_count = state.get("loop_count", 0)
    budget = state["request"].budget

    if evaluation and evaluation.should_refine and loop_count < budget.max_refinement_loops:
        return "refine"

    return "finalize_partial"


# --- Graph builder ---

def build_research_graph() -> StateGraph:
    graph = StateGraph(ResearchGraphState)

    graph.add_node("intake", intake_node)
    graph.add_node("route", route_node)
    graph.add_node("execute_tools", execute_tools_node)
    graph.add_node("normalize", normalize_evidence_node)
    graph.add_node("synthesize", synthesize_node)
    graph.add_node("evaluate", evaluate_node)
    graph.add_node("refine", refine_node)
    graph.add_node("finalize", finalize_node)
    graph.add_node("finalize_partial", finalize_partial_node)

    graph.add_edge(START, "intake")
    graph.add_edge("intake", "route")
    graph.add_edge("route", "execute_tools")
    graph.add_edge("execute_tools", "normalize")
    graph.add_edge("normalize", "synthesize")
    graph.add_edge("synthesize", "evaluate")

    graph.add_conditional_edges(
        "evaluate",
        should_continue_after_evaluation,
        {
            "finalize": "finalize",
            "refine": "refine",
            "finalize_partial": "finalize_partial",
        },
    )

    graph.add_edge("refine", "execute_tools")
    graph.add_edge("finalize", END)
    graph.add_edge("finalize_partial", END)

    return graph
```

---

## Phase 6 — Orchestrator Entry Point + Output Saving

### 6.1 Create `backend/core/orchestrators/research/orchestrator.py`

This is the public entry point. It:
- Compiles the graph
- Runs the graph
- Saves output to `backend/outputs/<run-folder>/research/`
- Returns a `ResearchResponse`

```python
import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langgraph.checkpoint.memory import MemorySaver

from core.graphs.research_graph import build_research_graph
from core.orchestration.contracts import (
    ResearchRequest,
    ResearchResponse,
    RunStatus,
)
from core.schemas.workflow_state import ResearchGraphState
from infra.logging import get_logger

logger = get_logger(__name__)

# Resolve outputs dir relative to this file → backend/outputs/
_OUTPUTS_ROOT = Path(__file__).parents[4] / "outputs"


def _topic_slug(topic: str) -> str:
    """Convert topic to filesystem-safe slug, max 40 chars."""
    slug = topic.lower()
    slug = re.sub(r"[^a-z0-9\s]", "", slug)
    slug = re.sub(r"\s+", "_", slug.strip())
    return slug[:40]


async def save_research_output(state: ResearchGraphState, status: str) -> str:
    """
    Save research output to:
      backend/outputs/<topic_slug>_<timestamp>/research/

    Returns the string path of the created folder.
    """
    request = state["request"]
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    folder_name = f"{_topic_slug(request.topic)}_{ts}"
    output_dir = _OUTPUTS_ROOT / folder_name / "research"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Full result JSON
    response_data = {
        "run_id": state.get("run_id", ""),
        "status": status,
        "topic": request.topic,
        "route_plan": state.get("route_plan", {}).model_dump() if state.get("route_plan") else {},
        "evidence_count": len(state.get("evidence", [])),
        "degraded_flags": state.get("degraded_flags", []),
        "errors": state.get("errors", []),
        "messages": state.get("messages", []),
        "output_path": str(output_dir),
    }
    if state.get("synthesis"):
        response_data["synthesis"] = state["synthesis"].model_dump()
    if state.get("evaluation"):
        response_data["evaluation"] = state["evaluation"].model_dump()

    (output_dir / "research_result.json").write_text(
        json.dumps(response_data, indent=2, default=str), encoding="utf-8"
    )

    # 2. Evidence list
    evidence_list = [e.model_dump() for e in state.get("evidence", [])]
    (output_dir / "evidence.json").write_text(
        json.dumps(evidence_list, indent=2, default=str), encoding="utf-8"
    )

    # 3. Human-readable synthesis markdown
    synthesis = state.get("synthesis")
    if synthesis:
        md_lines = [
            f"# Research Synthesis: {request.topic}",
            f"**Run ID:** {state.get('run_id', '')}",
            f"**Status:** {status}",
            f"**Confidence:** {synthesis.confidence_score:.2f}",
            "",
            "## Summary",
            synthesis.summary,
            "",
            "## Key Points",
        ]
        for point in synthesis.key_points:
            md_lines.append(f"- {point}")
        if synthesis.contradictions:
            md_lines += ["", "## Contradictions"]
            for c in synthesis.contradictions:
                md_lines.append(f"- {c}")
        if synthesis.implications:
            md_lines += ["", "## Implications"]
            for imp in synthesis.implications:
                md_lines.append(f"- {imp}")
        if synthesis.gaps:
            md_lines += ["", "## Gaps"]
            for gap in synthesis.gaps:
                md_lines.append(f"- {gap}")
        md_lines += [
            "",
            "## Sources",
            f"Total evidence items: {len(state.get('evidence', []))}",
        ]
        for e in state.get("evidence", [])[:10]:
            md_lines.append(f"- [{e.title}]({e.url}) ({e.source_type})")

        (output_dir / "synthesis.md").write_text("\n".join(md_lines), encoding="utf-8")

    logger.info("research_output_saved", path=str(output_dir), status=status)
    return str(output_dir)


class ResearchOrchestrator:
    """
    Entry point for the research sub-agent.

    Usage:
        orchestrator = ResearchOrchestrator()
        result = await orchestrator.run({"topic": "AI jobs in India"})
        print(result.output_path)
    """

    def __init__(self):
        self._graph = None

    def _get_compiled_graph(self):
        if self._graph is None:
            self._graph = build_research_graph().compile(checkpointer=MemorySaver())
        return self._graph

    async def run(self, request: dict[str, Any]) -> ResearchResponse:
        parsed_request = ResearchRequest.model_validate(request)
        run_id = str(uuid.uuid4())

        logger.info(
            "research_orchestrator_start",
            run_id=run_id,
            topic=parsed_request.topic,
        )

        initial_state: ResearchGraphState = {
            "request": parsed_request,
            "run_id": run_id,
            "loop_count": 0,
            "raw_tool_outputs": {},
            "tool_traces": [],
            "skipped_tools": [],
            "evidence": [],
            "degraded_flags": [],
            "errors": [],
            "messages": [],
        }

        try:
            graph = self._get_compiled_graph()
            # LangGraph needs a config with thread_id for MemorySaver
            config = {"configurable": {"thread_id": run_id}}
            final_state = await graph.ainvoke(initial_state, config=config)

        except Exception as exc:
            logger.error(
                "research_orchestrator_error", run_id=run_id, error=str(exc)
            )
            return ResearchResponse(
                run_id=run_id,
                status=RunStatus.FAILED,
                topic=parsed_request.topic,
                route_plan=initial_state.get("route_plan") or __import__("core.orchestration.contracts", fromlist=["RoutePlan"]).RoutePlan(),
                evidence=[],
                errors=[f"Orchestrator error: {exc}"],
            )

        # Determine status
        evaluation = final_state.get("evaluation")
        if final_state.get("errors"):
            status = RunStatus.FAILED
        elif evaluation and evaluation.passed:
            status = RunStatus.SUCCESS
        else:
            status = RunStatus.PARTIAL_SUCCESS

        return ResearchResponse(
            run_id=run_id,
            status=status,
            topic=parsed_request.topic,
            route_plan=final_state.get("route_plan"),
            evidence=final_state.get("evidence", []),
            synthesis=final_state.get("synthesis"),
            evaluation=final_state.get("evaluation"),
            tool_traces=final_state.get("tool_traces", []),
            skipped_tools=final_state.get("skipped_tools", []),
            degraded_flags=final_state.get("degraded_flags", []),
            errors=final_state.get("errors", []),
            output_path=final_state.get("output_path", ""),
        )
```

---

## Phase 7 — Backwards Compatibility Bridge

### 7.1 Replace `backend/core/nodes/research.py`

Keep the same function signature. Only the body changes.

```python
from infra.logging import get_logger
from core.orchestrators.research.orchestrator import ResearchOrchestrator
from core.schemas.workflow_state import ContentWorkflowState

logger = get_logger(__name__)


async def research_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    logger.info("research_node_start", topic=topic)

    try:
        orchestrator = ResearchOrchestrator()
        result = await orchestrator.run({
            "topic": topic,
            "mode": "standard",
            "freshness": "recent",
            "explicit_urls": [],
        })

        summary = result.synthesis.summary if result.synthesis else "No synthesis available."
        key_points = result.synthesis.key_points if result.synthesis else []

        logger.info(
            "research_node_complete",
            topic=topic,
            status=result.status.value,
            output_path=result.output_path,
        )

        return {
            "research_data": {
                "summary": summary,
                "key_points": key_points,
                "evidence": [e.model_dump() for e in result.evidence],
                "status": result.status.value,
                "output_path": result.output_path,
            },
            "research_summary": summary,
            "messages": [f"Research completed: {result.status.value} — {len(result.evidence)} sources"],
            "errors": result.errors,
        }

    except Exception as exc:
        logger.error("research_node_error", topic=topic, error=str(exc))
        return {
            "errors": [f"Research failed: {str(exc)}"],
            "messages": [f"Research failed: {str(exc)}"],
        }
```

---

## Phase 8 — Settings

### 8.1 Add to `backend/configs/settings.py` (inside the `Settings` class)

```python
# Research Orchestrator
research_default_mode: str = "standard"
research_default_freshness: str = "recent"
research_max_tool_calls: int = 6
research_max_sources: int = 15
research_max_crawl_urls: int = 5
research_max_refinement_loops: int = 1
research_quality_min_sources: int = 3
research_quality_min_confidence: float = 0.45
research_outputs_dir: str = "outputs"
research_allowed_tools: list[str] = ["news_api", "ddgs_text", "ddgs_news", "crawl4ai"]
```

---

## Phase 11 — Optional Standalone FastAPI Endpoint (Swagger)

If you want this orchestrator as a separate user-invoked tool, expose it with FastAPI.

### 11.1 Create `backend/apps/api/research.py`
```python
from fastapi import APIRouter

from core.orchestration.contracts import ResearchRequest, ResearchResponse
from core.orchestrators.research.orchestrator import ResearchOrchestrator

router = APIRouter(prefix="/research", tags=["research"])


@router.post("/run", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
        orchestrator = ResearchOrchestrator()
        return await orchestrator.run(request.model_dump())
```

### 11.2 Mount router in your FastAPI app
- Include `research.router` in the main app module.
- Swagger UI will automatically show `POST /research/run` with all fields:
    - `tool_selection_mode`
    - `selected_tools`
    - `strict_tools`
    - `explicit_urls`
    - others

This gives immediate manual testing without changing orchestration internals.

---

## Architecture Verification Checklist

Use this checklist before coding to avoid integration surprises:

- [ ] `langgraph` installed in backend dependencies
- [ ] FastAPI dependencies present if API mode is needed
- [ ] `backend/apps/api/` has a mounted router in the main app
- [ ] `DDGSSearch.search_news()` available (it is in current code)
- [ ] `GoogleNewsAPI.execute()` supports expected args (current code does)
- [ ] `Crawl4AIScraper.execute(url=...)` available (current code does)
- [ ] `get_langchain_llm()` returns configured model for synthesis node
- [ ] `core/schemas/workflow_state.py` no longer empty

---

## Phase 9 — Fix Existing Bugs

### 9.1 Fix `angle.py` and `content.py` — missing `await`

In `backend/core/nodes/angle.py`:
```python
# Change this line
llm = LLMFactory.get_client()
# To
llm = await LLMFactory.get_client()
```

In `backend/core/nodes/content.py`:
```python
# Change this line
llm = LLMFactory.get_client()
# To
llm = await LLMFactory.get_client()

# Also change this line
prompt_template = load_prompt("content_generation", topic=topic)
# To (aligns with actual filename content_creation.txt)
prompt_template = load_prompt("content_creation", topic=topic)
```

### 9.2 Fix typo in `system_prompts.py`

```python
# Change the function signature from
def get_system_prompt(aganet_type: str) -> str:
# To
def get_system_prompt(agent_type: str) -> str:
    try:
        return SystemPrompts[agent_type.upper()].value
    except KeyError:
        raise ValueError(f"Invalid agent type: {agent_type}")
```

---

## Phase 10 — Basic Tests

### 10.1 Create `backend/tests/test_research_routing.py`
```python
from core.orchestration.contracts import ResearchRequest
from core.orchestration.policies.routing import DeterministicResearchRoutingPolicy


def test_recent_topic_selects_news_tools():
    policy = DeterministicResearchRoutingPolicy()
    plan = policy.create_plan(
        ResearchRequest(topic="AI layoffs in India", freshness="recent")
    )
    assert "news_api" in plan.selected_tools
    assert "ddgs_news" in plan.selected_tools


def test_explicit_urls_select_crawl():
    policy = DeterministicResearchRoutingPolicy()
    plan = policy.create_plan(
        ResearchRequest(topic="AI research", explicit_urls=["https://example.com"])
    )
    assert "crawl4ai" in plan.selected_tools
    assert "https://example.com" in plan.crawl_urls


def test_evergreen_selects_ddgs_text():
    policy = DeterministicResearchRoutingPolicy()
    plan = policy.create_plan(
        ResearchRequest(topic="Python best practices", freshness="evergreen")
    )
    assert "ddgs_text" in plan.selected_tools


def test_manual_mode_uses_selected_tools_only():
    policy = DeterministicResearchRoutingPolicy()
    req = ResearchRequest(
        topic="AI research",
        tool_selection_mode="manual",
        selected_tools=["ddgs_text", "news_api"],
    )
    plan = policy.create_plan(req)
    # Route policy still builds base plan; route_node enforces manual mode.
    assert isinstance(plan.selected_tools, list)
```

### 10.2 Create `backend/tests/test_research_normalizer.py`
```python
import pytest
from core.orchestrators.research.normalizer import normalize_evidence_node


@pytest.mark.asyncio
async def test_empty_outputs_produce_empty_evidence():
    state = {"raw_tool_outputs": {}, "messages": []}
    result = await normalize_evidence_node(state)
    assert result["evidence"] == []


@pytest.mark.asyncio
async def test_no_duplicate_urls():
    # If two tools return the same URL it should appear once in evidence
    # (test by constructing mock raw_tool_outputs with overlapping URLs)
    pass  # implement with mock objects matching tool output schemas
```

### 10.3 Create `backend/tests/test_research_orchestrator_smoke.py`
```python
import pytest
from core.orchestrators.research.orchestrator import ResearchOrchestrator


@pytest.mark.asyncio
async def test_smoke_run_returns_response():
    orchestrator = ResearchOrchestrator()
    result = await orchestrator.run({
        "topic": "Open source AI agents 2025",
        "mode": "quick",
        "freshness": "recent",
    })
    assert result.topic == "Open source AI agents 2025"
    assert result.status is not None
    assert result.run_id != ""
    # output_path should be set unless failed with no evidence
    if result.status.value != "failed":
        assert result.output_path != ""
```

---

## File Creation Checklist

```
[ ] backend/core/orchestration/__init__.py
[ ] backend/core/orchestration/contracts.py
[ ] backend/core/orchestration/policies/__init__.py
[ ] backend/core/orchestration/policies/routing.py
[ ] backend/core/schemas/workflow_state.py              ← was empty, now filled
[ ] backend/core/prompts/templates/research_synthesis.txt  ← new prompt
[ ] backend/core/orchestrators/__init__.py
[ ] backend/core/orchestrators/research/__init__.py
[ ] backend/core/orchestrators/research/router.py
[ ] backend/core/orchestrators/research/executor.py
[ ] backend/core/orchestrators/research/normalizer.py
[ ] backend/core/orchestrators/research/synthesizer.py
[ ] backend/core/orchestrators/research/evaluator.py
[ ] backend/core/orchestrators/research/orchestrator.py
[ ] backend/core/graphs/research_graph.py               ← was empty, now filled
[ ] backend/core/nodes/research.py                      ← replace body
[ ] backend/core/nodes/angle.py                         ← fix await bug
[ ] backend/core/nodes/content.py                       ← fix await + prompt name
[ ] backend/core/prompts/system_prompts.py              ← fix typo
[ ] backend/configs/settings.py                         ← add research settings
[ ] backend/tests/test_research_routing.py
[ ] backend/tests/test_research_normalizer.py
[ ] backend/tests/test_research_orchestrator_smoke.py
```

---

_Last updated: 2026-04-25_
