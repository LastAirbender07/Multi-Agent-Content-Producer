# AI Development Changelog

**Purpose:** Track architectural decisions for quick context restoration in new sessions.

**Format:** Stack-based (newest first), concise summaries only.

---

## 2026-04-03 - Session 2: LangGraph Architecture Decision

**Decision:** Use LangGraph primitives instead of custom BaseAgent class.

**Why:**
- LangGraph already provides state management and orchestration
- Simple node functions > complex class hierarchies
- FastMCP provides tool abstractions
- Don't reinvent what frameworks already do well

**Architecture:**
```
nodes/ → Simple async functions (not classes)
graphs/ → StateGraph definitions (LangGraph)
schemas/ → TypedDict for state, Pydantic for data
tools/ → FastMCP tools (optional)
```

**Key Pattern:**
```python
# Node = simple function
async def research_node(state: WorkflowState) -> dict:
    return {"research_data": result}

# Graph = wire nodes together
graph.add_node("research", research_node)
```

**Impact:**
- Less code to maintain (no BaseAgent boilerplate)
- Better error handling (framework built-in)
- Easier testing (pure functions)
- Built-in features (checkpointing, visualization)

**Status:** ✅ Complete (guide written)

**Docs:** `Docs/IMPLEMENTATION_GUIDE.md`

---

## 2026-04-03 - Session 2: Multi-Provider LLM Support

**Decision:** Made LLM infrastructure provider-agnostic (Claude, OpenAI, Gemini).

**Why:**

- Original `langchain_adapter.py` was Claude-only
- Need flexibility to switch providers without code changes
- Future-proof for testing different models

**Implementation:**

- Updated `Settings` to support multiple providers (API keys for all three)
- Refactored `langchain_adapter.py` with provider factory functions
- Created `.env.example` documenting all providers
- Added `infra/llm/README.md` with usage guide

**Key Pattern:**

```python
# Auto-selects provider from LLM_PROVIDER env var
llm = get_langchain_llm()

# Or override dynamically
llm = create_langchain_llm(provider="openai", model="gpt-4")
```

**Impact:**

- Switch providers by changing `.env` (no code changes)
- Both custom client and LangChain adapter support all providers
- Easy to add new providers (Azure OpenAI, Ollama, etc.)

**Status:** ✅ Complete

---

## 2026-04-03 - Session 2: Singleton Pattern + LangChain Integration

**Decision:** Implemented singleton pattern for LLM clients and added LangChain adapter.

**Why:**

- Creating new HTTP client on every call wastes resources
- Need LangChain for LangGraph workflows
- Keep custom client for simple, fast calls

**Implementation:**

- `LLMFactory.get_client()` → Singleton with async lock (thread-safe)
- `get_langchain_llm()` → LangChain client cached with `@lru_cache()`
- Updated CLI to use singleton pattern
- Removed `setup_hai_env()` calls (now automatic from settings)

**When to Use:**

- Custom client: Simple calls, structured output, cost tracking
- LangChain: Multi-agent workflows, RAG, tool-calling, LangGraph

**Status:** ✅ Complete

---

## 2026-04-03 - Session 2: Changelog Format Refactored

**Decision:** Simplified changelog to stack-based summaries only.

**Why:**

- Previous format too verbose (170+ lines)
- New sessions need quick context, not full analysis
- Detailed docs moved to `Docs/decisions/` for reference

**Changes:**

- Changelogs now: decision + why + impact (3-5 lines each)
- Detailed analysis lives in separate markdown files
- Stack format: newest entries at top

**Impact:** Faster context restoration for future AI sessions.

---

## 2026-04-01 - Session 1: Initial Architecture Review

**Decision:** Established modular architecture with LLM abstraction layer.

**Structure:**

- `infra/llm/` - Provider-agnostic LLM interface (BaseLLM)
- `core/` - Business logic (agents, workflows)
- `apps/` - Entry points (CLI, API)

**Key Implementation:**

- `BaseLLM` abstract class → `ClaudeLLM` implementation
- HAI Proxy integration for Claude API
- Structured logging system (`infra/logging.py`)

**Issues Identified:**

- ⚠️ Hardcoded API key in `env_setup.py` (security risk)
- ⚠️ No singleton LLM client (performance)
- ⚠️ No centralized config management

**Next Session:** Fix config management + implement singleton pattern.

---

## Template for Future Entries

```markdown
## YYYY-MM-DD - Session N: [Brief Title]

**Decision:** [What was decided/changed]

**Why:** [Core reasoning - 1-2 sentences]

**Impact:** [How this affects the system]

**Status:** [✅ Complete | 🚧 In Progress | ⚠️ Blocked]
```

---

## Detailed Documentation

For in-depth analysis, see:

- `backend/infra/llm/README.md` - LLM usage guide and provider setup

---

_Last updated: 2026-04-03_
