# Angle Orchestrator — Implementation Plan (v2)

**Status:** Planned  
**Depends on:** Research Orchestrator (complete)  
**Next after this:** Content Orchestrator

---

## Concerns addressed in this revision

Before the plan, here are explicit answers to the design questions raised:

---

### Concern 1 — Orchestrators should not be logically coupled

**The right design:** Each orchestrator is completely independent. They do not import each other. The `ContentPipelineOrchestrator` is the only thing that knows the full sequence. It is responsible for:
- Carrying the `run_id` across all stages so every stage writes into the same `outputs/<run_id>/` folder
- Reading the output of stage N and passing the relevant context to stage N+1

```
ContentPipelineOrchestrator
  ├── run_id = uuid()                     # generated once, shared across all stages
  │
  ├── Stage 1: ResearchOrchestrator.run(topic, run_id)
  │     └── saves to: outputs/<run_id>/research/
  │     └── returns: ResearchResponse (synthesis, evidence, etc.)
  │
  ├── Stage 2: AngleOrchestrator.run(synthesis, run_id)
  │     └── reads: synthesis from Stage 1's return value (NOT from disk)
  │     └── saves to: outputs/<run_id>/angles/
  │     └── returns: AngleResponse (angles, selected_angles)
  │
  ├── Stage 3: ContentOrchestrator.run(selected_angles, run_id)  ← future
  └── ...
```

The orchestrators never import each other. The pipeline manager threads context between them. This way any orchestrator can be run standalone (for testing, API calls, etc.) without needing the others.

**What needs to change in ResearchOrchestrator:** Accept `run_id` as an input parameter instead of generating it internally. The pipeline manager generates it once and passes it to every stage.

---

### Concern 2 — Shared output utility (not over-engineering)

**This is the right call.** Right now `save_research_output()` is ~70 lines of ad-hoc file I/O embedded in `research/orchestrator.py`. Every future orchestrator would duplicate this. Instead, extract a shared `RunOutputManager`:

```
backend/infra/output_manager.py   ← NEW shared utility
```

```python
class RunOutputManager:
    def __init__(self, run_id: str, outputs_root: Path):
        self.run_id = run_id
        self.run_root = outputs_root / run_id

    def stage_dir(self, stage: str) -> Path:
        """Returns and ensures the path: outputs/<run_id>/<stage>/"""
        d = self.run_root / stage
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save_json(self, stage: str, filename: str, data: dict) -> Path:
        path = self.stage_dir(stage) / filename
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        return path

    def save_markdown(self, stage: str, filename: str, content: str) -> Path:
        path = self.stage_dir(stage) / filename
        path.write_text(content, encoding="utf-8")
        return path

    def save_text(self, stage: str, filename: str, content: str) -> Path:
        path = self.stage_dir(stage) / filename
        path.write_text(content, encoding="utf-8")
        return path
```

Every orchestrator then does:
```python
manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT_DIR)
manager.save_json("research", "result.json", response_data)
manager.save_markdown("research", "synthesis.md", md_content)
manager.save_json("angles", "generated.json", angles_data)
manager.save_json("angles", "selection.json", {"selected": selected_indices, "angles": selected_angles})
```

**What gets saved per stage for angles:**
```
outputs/<run_id>/
├── research/
│   ├── research_result.json    ← already exists
│   ├── evidence.json           ← already exists
│   └── synthesis.md            ← already exists
└── angles/
    ├── input.json              ← the synthesis that was passed in (traceability)
    ├── generated.json          ← all 5 generated angles
    └── selection.json          ← which angles were selected, by whom (human/llm), and why
```

**Refactor task for Research Orchestrator:** Replace the inline `save_research_output()` function with `RunOutputManager` calls. The logic is identical, just moved to the shared utility.

---

### Concern 3 — Multiple angle selection, not restricted to 1

**You are right.** Restricting to 1 angle was wrong thinking. The correct model:
- Human (or LLM in auto mode) selects **1 or more** angles
- Each selected angle becomes an independent input to a Content Orchestrator instance
- In the future this means parallel content generation — one per selected angle

```python
# interrupt returns a list of indices
selected = interrupt({
    "angles": [a.model_dump() for a in angles],
    "prompt": "Select angles to generate content for (comma-separated, e.g. 1,3,5):",
})
# selected = [0, 2, 4]  ← list of indices
```

State and response use `selected_angles: list[Angle]` (plural), not `selected_angle`.

**API change:**
```
POST /api/v1/angle/{run_id}/select
    Body: { "angle_indices": [0, 2] }   # list, not single int
    Response: { run_id, selected_angles: [{...}, {...}], status: "complete" }
```

**Content Orchestrator implication (future):** When the pipeline receives `selected_angles: [A, B]`, it spawns one content run per angle — either sequentially or in parallel via `asyncio.gather`.

---

### Concern 4 — Auto mode vs Manual mode

**Two modes, one graph, conditional branch:**

```
generate_angles_node
        ↓
evaluate_angles_node
        ↓ (passed)
        ↓── if request.mode == "auto"   →  llm_select_node      (LLM picks best angles)
        └── if request.mode == "manual" →  human_approval_node  (interrupt, wait for human)
        ↓
finalize_node
```

The `mode` flag lives on `AngleRequest`:
```python
class AngleRequest(BaseModel):
    topic: str
    synthesis: ResearchSynthesis
    run_id: str
    mode: Literal["auto", "manual"] = "manual"
    max_angles_to_select: int = 3   # used in auto mode: how many to pick
```

**`llm_select_node` (auto mode):**
```python
async def llm_select_node(state: AngleGraphState) -> dict:
    angles = state["angles"]
    request = state["request"]

    # Ask LLM: given these angles, which ones are strongest for this topic?
    result = await llm.generate_structured(
        prompt=f"From these angles for '{request.topic}', pick the {request.max_angles_to_select} strongest. Return their indices and reasoning.",
        output_schema=AutoSelectionOutput,   # { selected_indices: list[int], reasoning: str }
    )

    selected = [angles[i] for i in result.selected_indices]
    return {
        "selected_angles": selected,
        "selection_reasoning": result.reasoning,
        "messages": [f"Auto-selected {len(selected)} angles: {result.reasoning}"],
    }
```

**`human_approval_node` (manual mode):**
```python
async def human_approval_node(state: AngleGraphState) -> dict:
    selected_indices = interrupt({
        "angles": [a.model_dump() for a in state["angles"]],
        "prompt": "Select angles (comma-separated indices):",
    })
    selected = [state["angles"][i] for i in selected_indices]
    return {"selected_angles": selected}
```

**Conditional edge in the graph:**
```python
def _route_after_evaluate(state: AngleGraphState) -> str:
    if not state["evaluation"].passed:
        return "finalize_partial"      # V2: could retry generation here
    if state["request"].mode == "auto":
        return "llm_select"
    return "human_approval"

graph.add_conditional_edges("evaluate", _route_after_evaluate)
```

---

### Concern 5 — MCP tools: what they are and how they change the architecture

**Your understanding is partially correct — let me clarify precisely.**

#### What MCP actually is

MCP (Model Context Protocol) is a protocol for exposing tools and resources to LLM clients. You run an **MCP server** (a process), and MCP clients connect to it over stdio or HTTP. The client discovers what tools the server exposes, and calls them through a standard interface.

It is NOT a different way to call functions inside your Python code. It's a **network/process boundary** between the tool and the thing calling it.

#### Current architecture (direct imports)

```
executor.py
    ├── from core.tools.Search.ddgs_search import DDGSSearch
    ├── from core.tools.News.news_api import NewsAPI
    └── from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper

    ddgs = DDGSSearch()
    result = await ddgs.execute(query=query)   # direct Python call
```

The executor owns the tools. They run in the same process.

#### MCP architecture

```
MCP Server process (tools_server.py)
    ├── exposes: ddgs_text(query) → SearchOutput
    ├── exposes: ddgs_news(query) → SearchOutput
    ├── exposes: news_api(query) → NewsOutput
    └── exposes: crawl4ai(url) → ScraperOutput

executor.py (MCP client)
    ├── connects to MCP server via stdio or HTTP
    ├── discovers tools: ["ddgs_text", "ddgs_news", "news_api", "crawl4ai"]
    └── calls: mcp_client.call_tool("ddgs_text", {"query": query})
```

Tools run in a separate process. The executor doesn't import them — it just calls names over the protocol.

#### When MCP makes sense for this project

| Reason | Good fit? |
|---|---|
| Learning MCP — this is explicitly a goal | ✅ Yes |
| Tools shared across multiple orchestrators (research, content, etc.) | ✅ Yes — as the pipeline grows |
| Tools running as independent services (can deploy separately) | ✅ Yes in production |
| V1, everything in one process, you own the tools | ❌ Adds complexity for no immediate gain |

#### How to learn it incrementally (recommended approach)

Do NOT refactor all tools to MCP at once. Instead:

**Step 1:** Convert just `DDGSSearch` to an MCP tool and call it from the research executor via `langchain-mcp-adapters`. Everything else stays as direct imports.

**Step 2:** Once you understand the pattern (server startup, tool discovery, call/response), decide if it's worth converting the rest.

**Step 3 (V2):** If yes, extract all tools into a `tools_server.py`, update the executor to be a pure MCP client, and the routing policy still works identically (it selects tool names, not implementations).

#### What changes in the research executor (Step 1 preview)

```python
# current — direct import
from core.tools.Search.ddgs_search import DDGSSearch
ddgs = DDGSSearch()
result = await ddgs.execute(query=query)

# MCP version — via langchain-mcp-adapters
from langchain_mcp_adapters.client import MultiServerMCPClient

async with MultiServerMCPClient({
    "search_tools": {
        "command": "python",
        "args": ["-m", "core.tools.mcp_server"],  # your MCP server file
        "transport": "stdio",
    }
}) as client:
    tools = client.get_tools()          # discovers available tools
    ddgs_tool = tools["ddgs_text"]
    result = await ddgs_tool.ainvoke({"query": query})
```

#### The MCP server file (what you'd write)

```python
# core/tools/mcp_server.py
from mcp.server.fastmcp import FastMCP
from core.tools.Search.ddgs_search import DDGSSearch

mcp = FastMCP("Research Tools")

@mcp.tool()
async def ddgs_text(query: str) -> dict:
    """Search the web using DuckDuckGo."""
    ddgs = DDGSSearch()
    result = await ddgs.execute(query=query)
    return result.model_dump()

@mcp.tool()
async def ddgs_news(query: str) -> dict:
    """Search recent news using DuckDuckGo."""
    ddgs = DDGSSearch()
    result = await ddgs.search_news(query=query)
    return result.model_dump()

if __name__ == "__main__":
    mcp.run()
```

The tool implementation (`DDGSSearch`) doesn't change at all — you just wrap it with `@mcp.tool()` and expose it via `FastMCP`. This is why it's worth learning: the migration path is incremental and non-destructive.

**Bottom line on MCP:** Build the Angle Orchestrator first (no tools needed — LLM only). After that, add MCP as a standalone learning exercise by converting one research tool. Then decide on full migration for V2.

---

## The Angle Orchestrator — Revised Design

### One-line flow (updated)
```
ResearchSynthesis → [LLM generates 5 angles] → [evaluate] → [auto-select OR human picks N] → selected_angles[]
```

### Graph — 5 nodes

```
generate_angles_node
        ↓
evaluate_angles_node
        ↓
        ├── mode == "auto"   → llm_select_node   → finalize_node
        └── mode == "manual" → human_approval_node → finalize_node
```

Node descriptions are in Concern 3 and 4 above.

---

## New Schemas

### In `core/orchestration/contracts.py`

```python
class Angle(BaseModel):
    statement: str = Field(..., description="The angle thesis in 1-2 sentences")
    emotional_hook: str = Field(..., description="The emotion targeted: curiosity / anger / hope / FOMO")
    supporting_evidence: str = Field(..., description="Data point from research that backs this angle")

class AngleGenerationOutput(BaseModel):
    angles: list[Angle] = Field(..., description="Generated content angles")

class AutoSelectionOutput(BaseModel):
    selected_indices: list[int] = Field(..., description="0-based indices of chosen angles")
    reasoning: str = Field(..., description="Why these angles were chosen")

class AngleEvaluation(BaseModel):
    passed: bool
    reason: str

class AngleRequest(BaseModel):
    topic: str
    synthesis: ResearchSynthesis
    run_id: str
    mode: Literal["auto", "manual"] = "manual"
    max_angles_to_select: int = 3

class AngleResponse(BaseModel):
    run_id: str
    status: RunStatus
    angles: list[Angle]
    selected_angles: list[Angle]
    selection_reasoning: str = ""   # populated in auto mode
    evaluation: AngleEvaluation | None = None
    errors: list[str] = []
    output_path: str = ""
```

### In `core/schemas/workflow_state.py`

```python
class AngleGraphState(TypedDict, total=False):
    request: AngleRequest
    run_id: str
    angles: list[Angle]
    selected_angles: list[Angle]
    selection_reasoning: str
    evaluation: AngleEvaluation
    errors: list[str]
    messages: list[str]
    output_path: str
```

Update `ContentWorkflowState`:
```python
class ContentWorkflowState(TypedDict, total=False):
    topic: str
    run_id: str                          # ADD: shared across all stages
    research_data: dict[str, Any]
    research_summary: str
    generated_angles: list[dict]
    selected_angles: list[dict]          # CHANGE: plural, list
    selection_reasoning: str             # ADD: for auto mode
    content_slides: list[dict]
    content_hook: str
    content_caption: str
    content_hashtags: list[str]
    messages: list[str]
    errors: list[str]
```

---

## New Files to Create

```
backend/
├── infra/
│   └── output_manager.py                   ← NEW shared utility (replaces inline save_research_output)
├── core/
│   ├── orchestrators/
│   │   └── angle/
│   │       ├── __init__.py
│   │       ├── orchestrator.py             ← AngleOrchestrator class
│   │       ├── generator.py                ← generate_angles_node
│   │       ├── evaluator.py                ← evaluate_angles_node
│   │       ├── auto_selector.py            ← llm_select_node
│   │       └── human_approval.py           ← human_approval_node + finalize_node
│   └── graphs/
│       └── angle_graph.py                  ← build_angle_graph()
└── apps/
    └── api/
        └── v1/
            └── angle.py                    ← 2 endpoints: /run, /{run_id}/select
```

---

## API Endpoints (revised)

```
POST /api/v1/angle/run
    Body: {
        "topic": "AI agents in enterprise",
        "research_run_id": "<uuid>",         # used to load synthesis from disk
        "mode": "manual"                     # or "auto"
    }
    Response (manual): { run_id, angles: [...5...], status: "waiting_for_selection" }
    Response (auto):   { run_id, angles: [...5...], selected_angles: [...], status: "complete" }

POST /api/v1/angle/{run_id}/select
    Body: { "angle_indices": [0, 2] }        # list, not single int
    Response: { run_id, selected_angles: [{...}, {...}], status: "complete" }
```

---

## Build Order

1. **`infra/output_manager.py`** — shared utility first, then refactor research orchestrator to use it
2. **Schemas** — `Angle`, `AngleRequest`, `AngleResponse`, `AngleEvaluation`, `AutoSelectionOutput` in `contracts.py`; `AngleGraphState` in `workflow_state.py`
3. **Generator node** — `core/orchestrators/angle/generator.py`
4. **Evaluator node** — `core/orchestrators/angle/evaluator.py`
5. **Auto-selector node** — `core/orchestrators/angle/auto_selector.py`
6. **Human approval node** — `core/orchestrators/angle/human_approval.py`
7. **Graph** — `core/graphs/angle_graph.py` (5 nodes, conditional edge after evaluate)
8. **Orchestrator** — `core/orchestrators/angle/orchestrator.py` (compile with MemorySaver, two-phase invoke for manual mode)
9. **Update `angle_node` bridge** — `core/nodes/angle.py` (call `AngleOrchestrator`)
10. **API router** — `apps/api/v1/angle.py`
11. **Wire into pipeline** — update `ContentPipelineOrchestrator` to pass `run_id` to both stages, uncomment `angle_node`

---

## Key Design Decisions Summary

| Decision | Reasoning |
|---|---|
| Orchestrators are independent (no imports between them) | Loose coupling — each runs standalone, pipeline manager threads context |
| `run_id` generated by `ContentPipelineOrchestrator`, not by individual orchestrators | Single source of truth; all stages write to `outputs/<run_id>/` |
| `RunOutputManager` in `infra/` | Shared, reusable by all future orchestrators; not over-engineering |
| Multi-angle selection (`list[Angle]`, not one) | Each selected angle = independent content generation job in the future |
| Auto mode = LLM selects; Manual mode = human interrupt | Enables fully automated pipeline without changing graph structure |
| Checkpointer (`MemorySaver`) only on angle graph | Required for `interrupt()` / resume; research graph doesn't need it |
| MCP — incremental adoption, not big-bang refactor | Correct learning path; convert one tool first, evaluate before full migration |

---

_Last updated: 2026-05-01_
