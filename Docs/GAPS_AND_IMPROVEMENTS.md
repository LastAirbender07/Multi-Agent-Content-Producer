# Gaps, Known Limitations & Improvement Opportunities

> Current state as of Session 23 (2026-05-24). Ordered roughly by impact.

---

## Features Not Yet Built

### High impact

**Streaming responses**
Every API call (research, angle, content) is blocking — the frontend shows a spinner until the entire stage completes. For research (which can take 30–90s) there is no progressive feedback beyond the stage indicator. Adding SSE or WebSocket streaming to at least the research synthesiser and slide generator would dramatically improve perceived responsiveness.

**Run cost tracking**
The LLM client (`ClaudeLLM`) already captures `input_tokens` / `output_tokens` in its response. None of this is surfaced anywhere — not in the API response, not on disk, not in the UI. Adding a `cost_usd` field to `ResearchResponse`, `AngleResponse`, and `ContentResponse` would let users understand the economics of each run.

**Auth / multi-user isolation**
The API has zero authentication. All runs share the same `outputs/` directory. In a team setting, runs from different users would collide. Adding an API key header check (even a simple shared secret) and namespacing outputs by `user_id` would be the minimum viable isolation.

**Slide editor UI**
After content is generated the user can only view slides — there is no way to edit a slide's text, swap an image, or regenerate a single slide without re-running the entire content stage. An inline editor on the carousel preview (click to edit title/body, click image to search replacements) would close the biggest workflow gap.

**Multi-topic batch mode**
The CLI and API accept one topic per run. Running 10 topics for a content calendar requires 10 sequential calls. A `/pipeline/batch` endpoint that accepts a list of topics and runs them concurrently (bounded by a worker pool) would unlock production-scale use.

### Medium impact

**Frontend environment config**
The backend URL is hardcoded as `http://localhost:8000` in `frontend/lib/api.ts`. In any deployed environment this breaks. It should read from `NEXT_PUBLIC_API_URL` with a localhost fallback.

**Image deduplication across carousel**
The image fetcher selects the best image per slide independently. There is no cross-slide deduplication — it is possible (and observed in practice) for the same image to appear on slides 2, 5, and 9 of the same carousel. A post-fetch deduplication pass would fix this.

**Research result caching**
Running the same topic twice generates two separate full research runs. A lightweight cache (keyed on topic + mode + freshness) that returns a stored `ResearchResponse` if the run is <24h old would save time and API cost for repeated or similar topics.

**Hashtag quality control**
The caption generator produces hashtags but there is no filtering for relevance or engagement. The LLM sometimes generates generic hashtags (`#india`, `#politics`) that add no signal. A minimum specificity check or an LLM filter pass would improve output quality.

### Low impact / polish

**Progress percentage in research stage**
The research graph runs 9 nodes but the UI shows only "Running…". Emitting partial progress (e.g. "Searching news...", "Scoring evidence...", "Synthesising...") via SSE or polling would make the wait feel shorter.

**Angle re-generation**
If the user is unhappy with all 5 generated angles there is no "regenerate" button — they must re-run the full pipeline. A `/angle/regenerate` endpoint that accepts the same synthesis and produces fresh angles would close this gap.

**Download all PNGs**
The pipeline UI shows individual carousels but there is no "Download all slides as ZIP" button. Users have to navigate to the `outputs/` folder manually.

---

## Tech Debt

**Inline Pydantic models in route files** *(partially addressed in Session 23)*
`angle.py` still defines `AngleSelectRequest` inline. `chat.py` defines `ChatMessage/Request/Response` inline. `tools.py` defines `ImageTagsRequest/Response` inline. These should all live in `apps/api/v1/schemas.py`.

> ✅ Fixed in Session 23: `research.py` models moved; `angle.py`, `chat.py`, `tools.py` moved in documentation audit.

**`build/` directory committed to repo**
`backend/build/lib/` contains a stale copy of old source files (`configs/settings.py`, `infra/logging.py`, `infra/output_manager.py`, etc.). This is almost certainly an artefact of an `python setup.py build` run and should be deleted + added to `.gitignore`.

**`scripts/` directory is empty**
`backend/scripts/__init__.py` exists but the directory contains nothing else. The `tests/demo_llm.py` file (referenced by the LLM README as `scripts/demo_llm.py`) lives in `tests/` not `scripts/`. Either populate or delete the directory.

**`core/graphs/content_workflow.py` vs `content_graph.py`**
Both files exist in `core/graphs/`. `content_workflow.py` should be audited — if it is dead code it should be deleted to avoid confusion about which graph is actually used by the orchestrator.

**`core/tools/mcp_servers/date_time_server.py` is dead code**
The date/time context is injected via `get_llm_metadata_block()` in `metadata_helper.py`, which is prepended to every system prompt. The MCP server has no callers in the pipeline and should be deleted.

**`get_langchain_llm()` JWT expiry risk**
`get_langchain_llm()` uses `@lru_cache()` which bakes the HAI Proxy JWT at first call. If the JWT expires (common in long server sessions), the cached client fails. This is documented now in `infra/llm/README.md` but the underlying risk remains. A proper fix would be to reset the cache on 401 responses.

**CORS locked to localhost**
`main.py` allows only `http://localhost:3000` and `http://127.0.0.1:3000`. Any staging or production deployment requires a code change.

---

## Testing Gaps

**No unit tests for orchestrators or LangGraph nodes**
`tests/test_validation_framework.py` (44 tests) covers the content validator. There are no unit tests for:
- Research orchestrator nodes (router, executor, normalizer, synthesizer, evaluator)
- Angle orchestrator (generator, evaluator, auto_selector)
- Content orchestrator (slide_generator, reorder, caption_generator, image_fetcher)
- LLM drafter (`draft_research`, `refine_research`)

All these contain complex business logic and edge cases that are currently tested only through full E2E runs.

**Only one Playwright test suite**
`e2e/llm-research-mode.spec.ts` is the only frontend E2E suite. There are no tests for:
- Normal pipeline flow (web research → angles → content)
- Research page (standalone research explorer)
- Images page (Pexels search, DDGS search, download flow)
- News page (source switching, time filters)
- Chat page (message send, history persistence)
- AngleSelector modal (manual angle selection)
- Run history (load a past run)

**No integration test for full pipeline**
There is no automated test that runs the complete `research → angle → content` pipeline against a real (mocked or live) backend and asserts that PNG files are produced at the expected output paths. The closest is the E2E tests from Session 18–20 (`backend/tests/test_frontend.py`) which test the frontend against real API calls.

**`test_executor_crawl4ai_mcp.py` likely stale**
This test file references the MCP-based Crawl4AI executor pattern. The executor has since been refactored. It should be audited and either updated or deleted.

---

## Known Limitations

| Limitation | Workaround |
|---|---|
| LangChain `@lru_cache()` JWT expiry | Restart the server; or switch affected nodes to `LLMFactory.get_client()` |
| No API auth | Run behind a reverse proxy with auth (nginx/Caddy) for team use |
| Backend URL hardcoded in frontend | Set `NEXT_PUBLIC_API_URL` env var (requires a code change to read it) |
| CORS locked to localhost | Update `allow_origins` list in `main.py` |
| Playwright tests require a running dev server | Start `next dev` before running tests (not automated) |
| Outputs accumulate forever | No cleanup job; `outputs/` grows with every run. Manual deletion required. |
| Image fetcher uses DDGS which can be rate-limited | DDGS has no official API — aggressive use may trigger IP-level throttling |
| Research loops always run at least twice (min 2 iterations hardcoded in graph) | Intentional for coverage — but means minimum research time is ~2× single-loop cost |

---

_Last updated: 2026-05-24 (Session 23 documentation audit)_
