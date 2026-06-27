# Research Orchestrator — Implementation Plan

## Scope
This document covers **only the Research Orchestrator** — the sub-agent that receives a topic query, gathers evidence from real tools, synthesizes insights with an LLM, and saves a structured result to disk.

Everything else (Angle, Content, Visual, Distribution) is out of scope here. The Research Orchestrator is a black box from their perspective: give it a topic → get back a research result.

---

## What We're Building and Why

Right now `backend/core/nodes/research.py` asks an LLM to generate research from its own training data. That gives stale information, hallucinated sources, and no citations.

The Research Orchestrator replaces this with a real data-gathering loop:

1. Decide which tools to run (news, web search, crawl) — either deterministic (auto mode) or caller-selected (manual/hybrid mode)
2. Run those tools and collect evidence
3. Use the LLM to synthesize evidence into insights — not to generate facts
4. Evaluate quality; refine once if necessary
5. Save everything to `backend/outputs/<run-folder>/research/`

---

## Technology Decisions (Fixed)

| Component | Choice | Reason |
|---|---|---|
| Orchestration | LangGraph `StateGraph` | Stateful, branching workflows; already in stack |
| LLM synthesis calls | LangChain `get_langchain_llm()` | Already set up in `infra/llm/langchain_adapter.py` |
| Tool execution | Direct async calls | Existing tools (GoogleNewsAPI, DDGSSearch, Crawl4AIScraper) are plain async classes |
| Prompts | Existing `core/prompts/` system | `load_prompt()` + `get_system_prompt()` already work |
| Config | `configs/settings.py` | Add research settings there |
| Output saving | Plain `json` + `pathlib` | No extra dependency needed |

---

## Prerequisites (Before Coding)

Add these dependencies in `backend/pyproject.toml` before implementation:

- `langgraph` (required)
- `fastapi` (optional, only if exposing standalone API)
- `uvicorn` (optional, only if running FastAPI app locally)

Reason:
- Graph code in this plan imports `langgraph` APIs directly.
- Swagger testing requires a FastAPI app and ASGI server.

---

## Existing Components to Use As-Is

```
backend/core/tools/News/news_api.py             → GoogleNewsAPI.execute()
backend/core/tools/Search/ddgs_search.py        → DDGSSearch.execute(), search_news()
backend/core/tools/Crawl4ai/crawl4ai_scraper.py → Crawl4AIScraper.execute()
backend/infra/llm/langchain_adapter.py          → get_langchain_llm()
backend/core/prompts/system_prompts.py          → get_system_prompt("research")
backend/core/prompts/prompt_loader.py           → load_prompt("research_synthesis")
backend/configs/settings.py                     → add research settings here
```

Do **not** refactor any of these. Treat them as stable contracts.

---

## New Files to Create

```
backend/core/
├── orchestration/
│   ├── __init__.py
│   ├── contracts.py                  ← RunStatus, ResearchRequest, Evidence,
│   │                                    ResearchResponse, RoutePlan, ToolTrace,
│   │                                    ResearchSynthesis, EvaluationResult, BudgetConfig
│   └── policies/
│       ├── __init__.py
│       └── routing.py                ← DeterministicResearchRoutingPolicy
│
├── orchestrators/
│   ├── __init__.py
│   └── research/
│       ├── __init__.py
│       ├── router.py                 ← route_node (wraps routing policy)
│       ├── executor.py               ← execute_tools_node
│       ├── normalizer.py             ← normalize_evidence_node
│       ├── synthesizer.py            ← synthesize_node (LangChain + prompts)
│       ├── evaluator.py              ← evaluate_node
│       └── orchestrator.py           ← ResearchOrchestrator entry point
│
├── graphs/
│   └── research_graph.py             ← build_research_graph()
│
└── prompts/
    └── templates/
        └── research_synthesis.txt    ← NEW synthesis prompt (evidence-based)
```

Also update:
- `backend/core/schemas/workflow_state.py` — define `ResearchGraphState` and `ContentWorkflowState` (currently empty)
- `backend/core/nodes/research.py` — thin wrapper that delegates to `ResearchOrchestrator`

---

## LangGraph Graph Topology

```
START
  → intake_node           validate and log the request
  → route_node            resolve tool plan (manual/hybrid/auto, no LLM)
  → execute_tools_node    run selected tools concurrently
  → normalize_node        unify all tool outputs into Evidence list
  → synthesize_node       LLM synthesizes from evidence only
  → evaluate_node         quality gate: source count + confidence score
       ├── passes       → finalize_node          → END
       ├── fails+budget → refine_node → execute_tools_node (loop once)
       └── fails+none   → finalize_partial_node  → END
```

Both `finalize_node` and `finalize_partial_node` save output to disk before `END`.

---

## User-Selectable Tools Model

The orchestrator supports three invocation modes:

| Mode | Behavior |
|---|---|
| `auto` | Existing deterministic routing policy chooses tools |
| `manual` | Caller chooses tools explicitly (`selected_tools`), routing policy is bypassed |
| `hybrid` | Start from deterministic route and merge caller-selected tools |

Allowed tools list (fixed for v1):
- `news_api`
- `ddgs_text`
- `ddgs_news`
- `crawl4ai`

Manual/hybrid is useful when the caller wants broad discovery (for example, all tools for complex topics).

---

## Tool Selection Precedence

`route_node` should follow this precedence:

1. Validate `selected_tools` against allowed tool names
2. If `tool_selection_mode = "manual"`:
- Use only `selected_tools`
3. If `tool_selection_mode = "hybrid"`:
- Build deterministic plan first
- Add selected tools not already present
4. If `tool_selection_mode = "auto"` or unspecified:
- Use deterministic plan only

For `crawl4ai`:
- If selected but no URL context is available (`explicit_urls` empty), skip with a structured reason (or fail if strict mode is enabled).

---

## Tool Routing Policy (Deterministic — No LLM)

The routing decision is a plain Python class — synchronous, no async, easy to unit test.

| Condition | Tools Selected |
|---|---|
| `explicit_urls` provided | `crawl4ai` for those URLs, plus `ddgs_text` for context |
| `freshness = "breaking"` or `"recent"` | `news_api` + `ddgs_news` |
| `freshness = "evergreen"` | `ddgs_text` (skip news heavy loading) |
| `needs_claim_verification = True` | add `crawl4ai` even if no explicit URLs |
| Default fallback | `ddgs_text` + `news_api` |

Multiple conditions can combine (e.g., recent + explicit URL = crawl + news + web).

Deterministic routing remains the default for `auto` mode and as the baseline for `hybrid` mode.

---

## Key Contracts

All Pydantic models live in `backend/core/orchestration/contracts.py`.

### ResearchRequest (input from main orchestrator)
```
topic: str
mode: "quick" | "standard" | "deep"        default: "standard"
freshness: "breaking" | "recent" | "evergreen"  default: "recent"
explicit_urls: list[str]                    default: []
needs_claim_verification: bool              default: False
tool_selection_mode: "auto" | "manual" | "hybrid"  default: "auto"
selected_tools: list[str]                   default: []
strict_tools: bool                          default: False
include_debug_trace: bool                   default: True
budget: BudgetConfig
```

### BudgetConfig (limits per run)
```
max_tool_calls: int = 6
max_sources: int = 15
max_crawl_urls: int = 5
max_refinement_loops: int = 1
timeout_seconds: int = 45
```

### RoutePlan (output of routing)
```
selected_tools: list[str]       e.g., ["news_api", "ddgs_news"]
crawl_urls: list[str]
query_variants: list[str]
rationale: list[str]            why each tool was selected
selection_mode_used: "auto" | "manual" | "hybrid"
```

### SkippedTool (structured skip diagnostics)
```
tool_name: str
reason_type: "missing_context" | "invalid_selection" | "runtime_error" | "policy_blocked"
reason_message: str
required_context: list[str]
provided_context: dict[str, Any]
```

### Evidence (normalized output from any tool)
```
evidence_id: str               md5(url + title) — dedup key
source_type: "news" | "web_search" | "crawl"
title: str
url: str
snippet: str | None
extracted_content: str | None  crawl4ai full text only
published_at: datetime | None
source_name: str | None
retrieval_ts: datetime
credibility_score: float       heuristic by source type
relevance_score: float
```

### ResearchSynthesis (LLM output, structured)
```
summary: str
key_points: list[str]
contradictions: list[str]
implications: list[str]
confidence_score: float        0.0 – 1.0, LLM self-reports
gaps: list[str]
```

### ResearchResponse (full orchestrator output)
```
run_id: str
status: RunStatus              ("success" | "partial_success" | "failed")
topic: str
route_plan: RoutePlan
evidence: list[Evidence]
synthesis: ResearchSynthesis | None
evaluation: EvaluationResult | None
tool_traces: list[ToolTrace]
skipped_tools: list[SkippedTool]
degraded_flags: list[str]      e.g., ["tool_failed:news_api"]
errors: list[str]
output_path: str               path to saved output folder
```

---

## Skip Policy and Strict Mode

When a selected tool cannot run, behavior is controlled by `strict_tools`:

| Condition | `strict_tools = false` | `strict_tools = true` |
|---|---|---|
| Selected tool has missing context (example: `crawl4ai` without URL) | Skip tool, add `SkippedTool` entry, continue | Mark run failed with explicit error |
| Selected tool name invalid | Skip invalid tool and continue with valid ones | Mark run failed |
| Tool runtime exception | Add `tool_trace` failure and continue | Mark run failed |

This gives power-user control while preserving stability in non-strict mode.

---

## Output Saving — Structure and Rules

Every run saves output here regardless of success or partial success:

```
backend/outputs/
└── <topic_slug>_<YYYYMMDD_HHMMSS>/
    └── research/
        ├── research_result.json   ← full ResearchResponse serialized
        ├── evidence.json          ← list of Evidence items
        └── synthesis.md           ← human-readable markdown summary
```

**Folder naming rules:**
- `topic_slug` = topic lowercased, spaces → `_`, special chars stripped, max 40 chars
- Timestamp appended: `YYYYMMDD_HHMMSS`
- Example: `ai_jobs_in_india_20260425_143012/`

**Where saving happens:** inside `finalize_node` and `finalize_partial_node`.

**`output_path`** is stored in the graph state and returned in `ResearchResponse` so the calling orchestrator knows where to find files.

**No output on `FAILED` status** — if errors happen before any evidence is collected, skip saving.

---

## Prompts

### Synthesis node
- **System prompt:** `get_system_prompt("research")` — already in `system_prompts.py`, works as-is
- **User template:** new `backend/core/prompts/templates/research_synthesis.txt`

The existing `research.txt` is for LLM-only research generation (tells it to "use web search, Reddit, Quora"). Do **not** use it for synthesis — it contradicts the evidence-grounded approach.

### research_synthesis.txt (new)
Must have these placeholders:
- `{topic}` — the research topic
- `{evidence_block}` — top N evidence items formatted as numbered list

Must instruct the LLM:
- Use only the provided evidence, no outside knowledge
- Identify contradictions between sources
- Rate confidence based on coverage and agreement

### LangChain structured output pattern in synthesize_node
```python
llm = get_langchain_llm()
structured_llm = llm.with_structured_output(ResearchSynthesis)
# Build prompt from system_prompt + load_prompt("research_synthesis", ...)
# Call structured_llm.ainvoke(messages)
```

---

## LangGraph State

Lives in `backend/core/schemas/workflow_state.py` (currently empty — fill this first).

```python
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
    output_path: str            ← set by finalize_node
```

Also define `ContentWorkflowState` here (used by existing angle/content nodes).

---

## Quality Gate (evaluate_node — No LLM)

Simple numeric checks only:

| Check | Pass Threshold |
|---|---|
| `len(evidence)` | >= 3 |
| `synthesis.confidence_score` | >= 0.45 |

If fails AND `loop_count < budget.max_refinement_loops`:
- Go to `refine_node` → loops back to `execute_tools_node`
- `refine_node` simply increments `loop_count`, no query rewriting in v1

If fails AND no budget left → `finalize_partial_node`.

---

## Backwards Compatibility: research_node

Keep the `research_node(state: ContentWorkflowState)` function signature unchanged. The function body becomes a thin delegation:

```
instantiate ResearchOrchestrator
call orchestrator.run({"topic": topic, "mode": "standard", "freshness": "recent"})
map ResearchResponse fields → existing state keys:
  research_data      = {"summary": ..., "key_points": ..., "evidence": [...]}
  research_summary   = synthesis.summary
  messages           = [...]
  errors             = result.errors
```

Angle and content nodes do not need to change.

---

## Known Bugs to Fix During Implementation

1. **`LLMFactory.get_client()` not awaited** in `research.py`, `angle.py`, `content.py`:
   ```python
   # Wrong (currently in all three files)
   llm = LLMFactory.get_client()
   # Correct
   llm = await LLMFactory.get_client()
   ```

2. **`load_prompt("content_generation")` vs filename `content_creation.txt`** in `content.py`:
   - Either rename `content_creation.txt` → `content_generation.txt`
   - Or change the `load_prompt` call to `"content_creation"`
   - Pick one, be consistent

3. **Typo in `system_prompts.py`** — `aganet_type` parameter name: fix when touching that file

---

## Settings to Add in `configs/settings.py`

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

## Standalone Tool API (Swagger-Friendly)

This orchestrator can be exposed as a standalone endpoint using FastAPI.

Recommended API shape:
- `POST /research/run`
- Request body = `ResearchRequest`
- Response body = `ResearchResponse`

Benefits:
- Automatic Swagger UI testing via OpenAPI
- Easy manual testing of `manual`/`hybrid` tool modes
- Clear inspection of `skipped_tools`, `tool_traces`, and saved `output_path`

FastMCP can still be added later as an adapter if you want agent-tool style invocation. FastAPI is the quickest path for interactive testing.

---

## What This Is NOT

- Not an agentic loop where LLM decides which tools to call — routing is deterministic
- Not a framework for all future orchestrators — that comes later, after research is stable
- Not adding caching, telemetry dashboards, or distributed checkpointing in this phase

---

## Architecture Fit Verification (Current Backend)

This design fits your current backend with minimal friction:

1. Tool implementations already support async execution
- `GoogleNewsAPI`, `DDGSSearch`, `Crawl4AIScraper` can be called directly in executor

2. Prompt stack already exists
- `prompt_loader.py` + `system_prompts.py` match synthesis-node needs

3. LangChain adapter is available
- `get_langchain_llm()` works for structured synthesis

4. Existing research node can stay stable
- `core/nodes/research.py` remains wrapper-compatible

Small gaps to handle explicitly:
- Add `SkippedTool` model and `skipped_tools` state field
- Add validation helper for `selected_tools` against `research_allowed_tools`
- Ensure strict-mode failure path is explicit in `route_node`/`execute_tools_node`
- Add one API entrypoint file for FastAPI exposure if standalone testing is needed

---

## Implementation Order

| Step | File | What to do |
|---|---|---|
| 1 | `orchestration/contracts.py` | All Pydantic models |
| 2 | `orchestration/policies/routing.py` | `DeterministicResearchRoutingPolicy` |
| 3 | `core/schemas/workflow_state.py` | `ResearchGraphState` + `ContentWorkflowState` |
| 4 | `prompts/templates/research_synthesis.txt` | New synthesis prompt |
| 5 | `orchestrators/research/router.py` | `route_node` |
| 6 | `orchestrators/research/executor.py` | `execute_tools_node` |
| 7 | `orchestrators/research/normalizer.py` | `normalize_evidence_node` |
| 8 | `orchestrators/research/synthesizer.py` | `synthesize_node` using LangChain |
| 9 | `orchestrators/research/evaluator.py` | `evaluate_node` |
| 10 | `orchestrators/research/orchestrator.py` | `ResearchOrchestrator` + output saving |
| 11 | `graphs/research_graph.py` | `build_research_graph()` |
| 12 | `core/nodes/research.py` | Delegate to orchestrator |
| 13 | `core/nodes/angle.py`, `content.py` | Fix `await LLMFactory.get_client()` bug |
| 14 | `configs/settings.py` | Add research settings |

---

_Last updated: 2026-04-25_
