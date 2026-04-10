# AI Development Changelog

**Purpose:** Track architectural decisions for quick context restoration in new sessions.

**Format:** Stack-based (newest first), concise summaries only.

---

## 2026-04-10 - Session 6: DDGS Search Tool - Bug Fixes

**Decision:** Fixed schema and test issues in DDGS search tool implementation.

**Why:**
- Schema had duplicate `timelimit` field causing validation errors
- `VideoResult` had syntax error (used `def` instead of `class`)
- Test was using invalid backend ("bing" for text search)
- Google backend fails due to anti-scraping measures (DDGS library limitation)

**Key Fixes:**
1. Removed duplicate `timelimit` field from `DDGSSearchInput` schema
2. Fixed `VideoResult` class declaration syntax
3. Updated test to use valid backends: duckduckgo, google, brave
4. Documented Google backend limitation (not a bug, expected behavior)

**Test Results:**
- ✅ Text search: 10 results (auto backend)
- ✅ News search: 5 results
- ✅ Image search: 5 results
- ✅ DuckDuckGo backend: working
- ✅ Brave backend: working
- ⚠️ Google backend: "No results found" (anti-scraping, use `auto` instead)

**Key Decision:** Leave Google backend as-is - it's a DDGS library limitation with Google's anti-scraping measures. Users should use `auto` backend (default) which works perfectly by trying multiple engines.

**Status:** ✅ Complete (DDGS search tool fully functional)

---

## 2026-04-06 - Session 5: Crawl4AI Web Scraper Implementation

**Decision:** Implemented Crawl4AI scraper as the first general web scraping tool to complement Google News API.

**Why:**
- Need ability to scrape full content from arbitrary URLs (not just news)
- Crawl4AI provides LLM-optimized markdown output
- Free, no API keys, handles JavaScript rendering
- First step toward multi-source research capability

**Implementation:**
```
backend/core/tools/
├── Crawl4ai/
│   └── crawl4ai_scraper.py         # Main scraper tool
└── schemas/
    └── crawl4ai_scraper_schema.py  # Pydantic models
```

**Key Technical Challenges Solved:**

1. **Schema Mismatch with Crawl4AI Output**
   - Problem: Crawl4AI returns nested dicts, not simple lists
     - `links: {'internal': [...], 'external': [...]}`
     - `media: {'images': [...], 'videos': [...], 'audios': [...]}`
     - `markdown: {'raw_markdown', 'fit_markdown', ...}`
   - Solution: Created structured models (`LinkInfo`, `ImageInfo`) and helper methods
     - `_extract_links()` - Parses nested link structure into separate internal/external lists
     - `_extract_images()` - Extracts image data with metadata
     - `_extract_markdown()` - Selects best markdown format (fit_markdown > raw_markdown)

2. **Result Container Handling**
   - Problem: Crawl4AI returns `CrawlResultContainer` (iterable), not plain list
   - Solution: Check if result is iterable, extract first item
   ```python
   if hasattr(result, '__iter__') and not isinstance(result, str):
       page_result = list(result)[0]
   ```

3. **Output Optimization**
   - Limited links (50 per type) and images (30) to prevent overwhelming output
   - Optional HTML inclusion (off by default to reduce size)
   - Structured metadata extraction from Crawl4AI response

**Code Structure Pattern:**
```python
class Crawl4AIScraper(BaseTool):
    def __init__(self, verbose: bool = False)
    def _error_output(message: str) → Output
    def _extract_links(links_dict) → (internal, external)  # Helper
    def _extract_images(media_dict) → List[ImageInfo]      # Helper
    def _extract_markdown(markdown_dict) → str             # Helper
    async def execute(...) → Crawl4AIScraperOutput        # Main
```

**Libraries Used:**
- `crawl4ai` (v0.8.6) - Web scraping with JS rendering
- `pydantic` - Input/output validation

**Performance:**
- Simple page (example.com): ~2.4s
- Complex page (wikipedia.org): ~1.6s, 20K chars markdown, 70 links

**Status:** ✅ Complete (Crawl4AI working, tested with multiple URLs)

**Next:** SearXNG search tool to find URLs, then combine both in research orchestrator

**Docs Created:**
- `Docs/WEB_SEARCH_TOOLS_IMPLEMENTATION.md` - Full implementation guide
- `Docs/QUICK_REFERENCE_CHEATSHEET.md` - Quick reference patterns
- `Docs/ARCHITECTURE_VISUAL_GUIDE.md` - Visual architecture diagrams

---

## 2026-04-05 - Session 4: Google News API + Full Article Extraction

**Decision:** Implemented Google News RSS tool with full article content extraction via sequential processing.

**Why:**
- Free unlimited alternative to NewsAPI (no rate limits)
- Need full article content, not just summaries
- Google News redirect URLs required special handling

**Implementation:**
```
backend/core/tools/News/
└── news_api.py
    ├── GoogleNewsAPI class         # google-news-api library integration
    ├── fetch_article_content()     # trafilatura for content extraction
    └── Sequential processing       # Reliable, no connection pool issues
```

**Key Technical Decisions:**

1. **Sequential Processing (not parallel)**
   - Problem: trafilatura's urllib3 pool exhaustion with concurrent requests
   - Solution: Process articles one-by-one (20-30s for 10 articles)
   - Rationale: Reliability > Speed for research tools

2. **Google News URL Decoding**
   - Problem: Google wraps article URLs in redirects
   - Solution: Use `client.decode_url()` from google-news-api library
   - Benefit: Handles complex redirect chains automatically

3. **Full Content Extraction Pipeline**
   ```python
   Google News URL
     → Decode to real article URL (client.decode_url)
     → Fetch full content (trafilatura)
     → Fallback to summary if fetch fails
   ```

4. **Clean HTML Summaries**
   - Regex-based HTML tag removal (simple, fast)
   - No beautifulsoup overhead for summaries

**Libraries Used:**
- `google-news-api` - RSS feed parsing + URL decoding
- `trafilatura` - Article content extraction (modern, maintained)
- `beautifulsoup4` - Installed but not needed (URL decoding handled by library)

**Architecture Pattern:**
```python
# Sequential processing with progress tracking
for idx, article in enumerate(articles):
    logger.info(f"[{idx}/{total}] Processing: {title}...")
    real_url = await client.decode_url(google_news_url)
    content = await fetch_article_content(real_url)
```

**Benefits:**
- ✅ Free unlimited news access
- ✅ Full article content (not just summaries)
- ✅ Clean descriptions (HTML stripped)
- ✅ No connection pool warnings
- ✅ Predictable, reliable behavior

**Status:** ✅ Complete (Google News API working with full content)

**Docs:** `Docs/GOOGLE_NEWS_API_IMPLEMENTATION.md`

---

## 2026-04-04 - Session 3: NewsAPI Tool Implementation (Phase 1)

**Decision:** Implemented first research tool (NewsAPI) with async architecture, Pydantic validation.

**Why:**
- Avoid full dependency on Tavily (paid service)
- Need multiple data sources for research orchestrator
- Test individual tools before building orchestrator layer

**Implementation:**
```
backend/core/tools/
├── base.py                    # BaseTool abstract class
├── News/
│   ├── news_api.py           # Async NewsAPI implementation
│   └── schema.py             # Pydantic input/output models
└── schemas/
    └── news_api_schema.py    # NewsAPISearchInput/Output, NewsArticle
```

**Key Patterns:**
- ✅ Async execution with `asyncio.to_thread()` for blocking I/O
- ✅ Pydantic validation for input/output
- ✅ Structured error handling (never crashes, returns success/error)
- ✅ Individual parameters (not dict) for better IDE support
- ✅ Convenience functions for common use cases

**Architecture Decisions:**
- Reddit will use **LLM-powered dynamic subreddit generation** (not hardcoded)
- Custom web scraping tools as Tavily alternatives
- **Research Orchestrator Agent** to manage tool selection, retries, quality checks

**Next:** Reddit tool with dynamic topic mapping, then custom web scrapers, then orchestrator

**Status:** ✅ Complete (NewsAPI working, tested)

**Docs:** `Docs/NEWS_API_IMPLEMENTATION_GUIDE.md`

---

## 2026-04-03 - Session 2: Hybrid Research Architecture (Tools + LLM)

**Decision:** Use real data sources (APIs/scraping) + LLM synthesis instead of LLM-only research.

**Why:**
- LLM-only research = hallucinations, outdated info, no sources
- Production needs: real data, verifiable URLs, recent information
- User insight: "Research should use web search, scraper, news APIs"

**Architecture:**
```
Research Node = Tools (gather data) + LLM (synthesize insights)

Tools (parallel):
├── Tavily Search → Web results (5 sources)
├── Reddit Scraper → Community discussions (5 posts + comments)
└── NewsAPI → Recent articles (10 articles)
  ↓
LLM Synthesis → Extract insights, contradictions, patterns
  ↓
Output: Structured research with real sources
```

**Tools Selected:**
- **Tavily API** (web search, $1/1000, designed for AI)
- **PRAW** (Reddit API, free, unlimited)
- **NewsAPI** (news, 100/day free)

**Key Pattern:**
```python
# Gather real data
web, reddit, news = await asyncio.gather(
    search_web(topic),
    search_reddit(topic),
    search_news(topic)
)

# LLM synthesizes
research = await llm.generate_structured(
    prompt=f"Analyze: {web} {reddit} {news}",
    output_schema=ResearchOutput
)
```

**Benefits:**
- ✅ No hallucinations (real data)
- ✅ Verifiable sources (URLs included)
- ✅ Recent information (not training cutoff)
- ✅ Multiple perspectives (web + community + news)

**Cost:** Free tier sufficient for development (~30 content pieces/day)

**Status:** ✅ Complete (guide written)

**Docs:** `Docs/RESEARCH_TOOLS_GUIDE.md`

---

## 2026-04-03 - Session 2: REVISED Architecture with Prompt Management

**Decision:** Redesigned agent system based on initial plan + centralized prompt management.

**Why:**
- Initial guide missed prompt management (hard to iterate on voice/style)
- Needed alignment with original plan (strong POV content system)
- Prompts in code = hard to version/test/collaborate

**New Architecture:**
```
core/
├── prompts/           # ⭐ NEW - Centralized prompt management
│   ├── system_prompts.py    # Defines voice/style per agent
│   ├── prompt_loader.py     # Load from files or code
│   └── templates/*.txt      # Editable prompt templates
├── nodes/             # LangGraph nodes (use prompts)
├── graphs/            # Workflow orchestration
└── schemas/           # State management
```

**Key Pattern:**
```python
# Separate voice (system) from task (user)
system_prompt = get_system_prompt("angle")  # Defines style
user_prompt = format_prompt(template, topic=x, research=y)  # Task
result = llm.generate(user_prompt, system_prompt=system_prompt)
```

**Benefits:**
- ✅ Easy prompt iteration (change file, not code)
- ✅ Version control prompts (track what works)
- ✅ A/B testing (swap prompts, measure quality)
- ✅ Non-coders can edit .txt files

**Critical Insight from Plan:**
- Angle Agent = CRITICAL node (quality decided here)
- System prompts encode "strong, opinionated" voice
- Workflow: Research → Angle → Approval → Content → Visual

**Status:** ✅ Complete (revised guide written)

**Docs:** `Docs/REVISED_IMPLEMENTATION_GUIDE.md`

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

_Last updated: 2026-04-05_
