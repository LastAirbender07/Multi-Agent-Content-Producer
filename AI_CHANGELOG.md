# AI Development Changelog

**Purpose:** Track architectural decisions for quick context restoration in new sessions.

**Format:** Stack-based (newest first), concise summaries only.

---

## 2026-05-22 - Session 22: Carousel Validation Framework + Bug Fixes

**Decision:** Implemented a post-generation validation pipeline (new LangGraph node) that enforces slide structure, filters irrelevant content, strengthens image/graph quality. Then diagnosed three production bugs from a live run and fixed them.

---

**Change 1 — New `validate_content` node in content graph**

- `backend/core/graphs/content_graph.py` — Added `validate_content_node` between `reorder` and `generate_caption`. Graph order: `generate_slides → reorder → validate_content → generate_caption → fetch_images → render_slides → screenshot_slides → finalize`.
- `backend/core/orchestrators/content/slide_generator.py` — Removed old `_enforce_cta_constraint()` (superseded by new node).

---

**Change 2 — Slide structure enforcement (engage + CTA)**

- `backend/core/orchestrators/content/slide_validator.py` (**NEW**) — `_enforce_cta_count_and_position()` enforces the rule:
  - **≥10 slides**: 1 `engage` slide at midpoint + 1 `cta` at end. Any extra CTAs or engage slides are stripped. If LLM's `engage` already exists it is reused; otherwise `_make_engage_slide()` synthesises one. Same for `cta` via `_make_cta_slide()`.
  - **<10 slides**: 1 `cta` at end only. Any LLM-generated `engage` slides are removed.
  - All slides renumbered 1..N after repositioning.
- **Bug fixed (same-dict alias)**: Previous logic used `ctas[len//2]` for mid which equals `ctas[-1]` when `len==2` → same Python dict object at both positions → renumber loop made both slide_number=N. Fixed by always using `ctas[0]` for mid and `ctas[-1]` for end.
- **Bug fixed (extra visual CTA)**: `engage` type renders identically to `cta` (gradient, centred text, action button). Old logic synthesised a mid-CTA even when an `engage` already existed → 3 CTA-looking slides. New rule makes `engage` the intentional mid-CTA for long decks; separate `cta` type is end-only.

---

**Change 3 — Content relevance validation (LLM batch + single-slide regen)**

- `backend/core/orchestrators/content/slide_validator.py` — `_check_slide_relevance()`: single LLM call over all slides as JSON; returns failing `slide_number`s. CTA slides always exempt. `_regen_single_slide()`: rewrites one failing slide using prev/next context; 1 attempt max, keeps original on failure.
- `backend/core/prompts/templates/slide_relevance_check.txt` (**NEW**) — batch relevance prompt; returns `{"irrelevant": [slide_numbers]}`.
- `backend/core/prompts/templates/slide_regen.txt` (**NEW**) — single-slide regen prompt with prev/current/next context.

---

**Change 4 — Image selection: CJK disqualification + query relevance scoring**

- `backend/core/orchestrators/content/image_fetcher.py` — Added `_has_cjk(text)` (CJK Unified Ideographs, Hiragana+Katakana, Hangul Unicode ranges). Updated `_score_image(img, query="")`: CJK in title or URL → score `-99.0` (disqualified). Query relevance bonus: word-match hits × 1.5, capped at +4.0.

---

**Change 5 — Graph/stat validation strengthening**

- `backend/core/orchestrators/content/graph_validator.py` — `validate_and_fix_slides()` now also: (1) clears `stat_value` to `None` if it contains no digit (`"Many"` → `null`); (2) defaults `stat_label` to `"Key Statistic"` when `stat_value` is set but label is empty; (3) nulls out chart when all labels are single characters (LLM placeholder A/B/C data).

---

**Change 6 — Stat slide empty space fix**

- `backend/core/templates/carousel/aurora/stat.html.j2` + `lumina/stat.html.j2` — Changed `.stat-wrapper` from `justify-content: flex-start` to `{{ 'flex-start' if slide.chart_data else 'center' }}`. Stat slides with no chart were rendering content pinned to the top with the bottom 2/3 empty black. Now centers content vertically when no chart is present.

---

**Tests**

- `backend/tests/test_validation_framework.py` (**NEW**) — 44 unit tests covering all new logic: CJK detection (8), slide structure enforcement (11), async validate_content_node (4), image scoring (9), graph validator (12). All passing in ~0.4s (no LLM calls; async node tests use mocked LLM).

---

**Status:** ✅ Complete — 6 backend changes, 2 new prompt templates, 44 new tests all passing.

---

## 2026-05-22 - Session 21: 4-Feature Sprint (Image Search, Chat, Prev Runs, Carousel UX)

**Decision:** Implemented 4 UX/product improvements based on user feedback, plus 3 follow-up polish fixes on the Recent Runs section and carousel navigation.

---

**Feature 1 — Image search: raw query + entity tags + DDGS multi-query + LLM filter**

- `backend/core/tools/schemas/image_schema.py` — Added `queries: Optional[list[str]]` field to `ImageSearchRequest` for multi-query DDGS.
- `backend/apps/api/v1/tools.py` — Added `POST /tools/images/tags` endpoint: heuristic entity extractor (`_extract_tags()`), groups consecutive title-cased tokens as named entities, no LLM call, instant response. Added `_ddgs_multi_search()`: runs 3 query variants in parallel via `asyncio.gather`, deduplicates by image URL, then runs a single LLM relevance filter (drops results < 0.4 relevance) using inline prompt. Falls back gracefully if LLM filter fails.
- `frontend/lib/api.ts` — Added `fetchImageTags()` method; added optional `queries?: string[]` to `ImageSearchBody`.
- `frontend/app/images/page.tsx` — Removed `api.refineQuery()` entirely (was producing research-optimised long strings like "Indian cricketer Virat Kohli's career…" which broke Pexels/DDGS results). Tags fetch fires concurrently (non-blocking, updates chip strip when ready). Pexels uses raw `query`. DDGS sends `queries: [query, "${query} photo", "${query} ${year}"]`. Removed `ProcessedQuery`, `refining`, `processed` states; removed `Sparkles` AI refinement status bar.

---

**Feature 2 — Chat: metadata-only system prompt**

- `backend/apps/api/v1/chat.py` — Always prepends `get_llm_metadata_block()` as `SystemMessage`; ignores `request.system` field (kept in schema for backward compat). Removed configurable system prompt.
- `frontend/app/chat/page.tsx` — Removed `SYSTEM_PRESETS` array, `system` state, `showSystemEdit` state, preset tab selector UI, and `system` field from `api.chat()` call. Chat is now a clean single-purpose assistant with date/time context injected server-side.

---

**Feature 3 — Previous runs: click to load into stage cards**

- `frontend/store/slices/pipelineSlice.ts` — Added `loadRun` reducer (imports `PipelineRun` from `historySlice`): repopulates `topic`, `runId`, all 3 results, and stage statuses from a saved run. Resets `errors`.
- `frontend/app/pipeline/page.tsx` — Run cards changed from non-interactive `<div>` to `<button>`. Clicking dispatches `loadRun(run)` + calls `setOpenSections` to auto-expand only sections that have saved data. Recent Runs section moved **outside** the `(hasAnyResult || isAnyRunning)` guard so it's always visible on the idle page (shows up to 5 runs). While a pipeline is active, a condensed version (3 runs) remains inside the stage cards area.

---

**Feature 4 — Carousel: horizontal snap + one-at-a-time + nav indicators**

- `frontend/app/pipeline/page.tsx` — Stage 3 carousel changed to horizontal snap scroll (`overflow-x-auto snap-x snap-mandatory`). Each angle's carousel item is `snap-start shrink-0 w-full flex justify-center` — fills full container width so only one carousel is visible at a time. Added navigation bar below track (only when `total > 1`): prev/next chevron buttons (disabled at boundaries), dot indicators (active = violet pill `w-5 h-2`, inactive = grey circle `w-2 h-2`, clickable to jump), and "N / total" counter. Active index tracked via `onScroll → Math.round(scrollLeft / offsetWidth)` stored in `activeCarousel` state with `useRef` on the scroll container.
- `frontend/components/pipeline/InstagramPreview.tsx` — Caption truncated at 125 chars with inline "…more" / "less" toggle. `captionExpanded` state per post. When collapsed shows first 125 chars; expansion wraps vertically (no horizontal growth).

---

**Follow-up polish (same session):**

- `RunCard` component extracted in `pipeline/page.tsx`: shows first 90 chars of topic, then "…more" inline — expansion wraps to multiple lines vertically (no horizontal resize). `e.stopPropagation()` on toggle prevents accidental `loadRun` dispatch. `TOPIC_PREVIEW = 90` (topics ≤ 90 chars show no toggle).
- Carousel `activeCarousel` resets to 0 when a new run is loaded (stage cards re-render).

**Status:** ✅ Complete — all 4 features implemented and verified.

---

## 2026-05-22 - Sessions 18–20: 5-Bug Sprint + Architectural Refactor + Playwright Tests

**Decision:** Fixed 5 product bugs, resolved 6 architectural concerns raised during review, and built a full Playwright test suite (backend curl + 19 frontend tests — all passing).

---

**Bug 1 — Pipeline page: collapsible stage cards, angle re-open, carousel image URL fix**

- `frontend/app/pipeline/page.tsx` — Replaced static layout with 3 collapsible Stage Cards (chevron toggle, `openSections: Set<"research"|"angle"|"content">`). Auto-expands on stage completion via `useEffect` wrapped in `startTransition()` (React 19 requirement — avoids "setState inside effect" lint error). Stage 2 card shows "Open Angle Selector" button when manual mode + angle done + content idle.
- `frontend/components/pipeline/InstagramPreview.tsx` — Fixed `slideImageUrl()`: backend stores absolute system paths (`/Users/.../backend/outputs/...`). Previous code prepended `http://localhost:8000/` to the full path, producing a broken URL. Fix: extract everything from `/outputs/` onwards and prepend the backend base URL.
- Added `showLlmKnowledge` collapsible section in Stage 1 card that renders the LLM background knowledge evidence item (identified by `source_type === "llm_knowledge"`).

---

**Bug 2 — Images page: multi-select + local download**

- `frontend/app/images/page.tsx` — Added `selected: Set<number>` state, per-card checkbox overlay (violet when selected, hidden until hover or in select mode), floating action bar with `AnimatePresence` (count badge, Download, X clear). Selection is NOT auto-cleared on success — clearing it immediately batches with `setDownloadStatus("done")` causing the bar to vanish before "Saved to" is visible (React 18 automatic batching bug found during Playwright testing).
- `backend/core/tools/Image/image_downloader.py` (NEW) — Canonical async download implementation using `httpx`, sanitised filenames, collision avoidance. Resolves `save_dir` from `settings.image_download_path` if empty.
- `backend/core/tools/schemas/image_schema.py` (NEW) — `PexelsPhoto`, `ImageSearchRequest/Response`, `ImageDownloadRequest/Response` extracted here (separation of concerns).
- `backend/apps/api/v1/tools.py` — Thin route handler; delegates to `image_downloader.py`. Schema imports from `core/tools/schemas/`.
- `backend/apps/api/v1/schemas.py` (NEW) — API-level request/response models for query-refine, news.

---

**Bug 3 — Research: LLM per-article scoring, always-on tools, min 2 iterations, LLM background knowledge**

- `backend/core/orchestrators/research/evidence_scorer.py` (NEW) — Single batched LLM call scores up to 25 evidence items at once using `evidence_scoring.txt` prompt. Parses JSON float array, clamps to [0,1], re-sorts all evidence by `relevance_score` descending. Non-fatal on failure.
- `backend/core/orchestrators/research/normalizer.py` — Removed naive word-overlap `_compute_relevance()`; all items get neutral `relevance_score=0.5` as placeholder for the scorer. `credibility_score` still reflects source type (news_api=0.8, crawl=0.7, ddgs=0.6, web=0.4).
- `backend/core/orchestrators/research/llm_knowledge.py` (NEW) — Runs once (skips on `loop_count > 0`). Asks LLM for background knowledge, creates 1 synthetic `Evidence` item with `source_type="llm_knowledge"`, `relevance_score=0.5`. Prompt in `core/prompts/templates/llm_knowledge.txt`.
- `backend/core/orchestration/policies/routing.py` — Always runs all 3 tools (`news_api`, `ddgs_news`, `ddgs_text`) regardless of freshness. Freshness is a signal for the synthesiser, not a tool gate.
- `backend/core/graphs/research_graph.py` — Pipeline order: `intake → route → llm_knowledge → execute_tools → normalize → score_evidence → synthesize → evaluate`. Min 2 iterations: `should_continue_after_evaluation` returns `"refine"` when `loop_count == 0`.
- `backend/core/orchestrators/research/evaluator.py` — Coverage denominator 8→15, diversity denominator 4→8 (harder to saturate with 3 always-on tools). Weights rebalanced to `llm_score × 0.50 + source_score × 0.50`.
- `backend/configs/settings.py` — `research_quality_min_confidence` raised 0.60→0.72; `image_download_path` added.

---

**Bug 4 — CTA slides: enforce exactly 2**

- `backend/core/orchestrators/content/slide_generator.py` — `_enforce_cta_constraint()` post-processor: if LLM outputs >2 CTAs, keeps the middle-range CTA and the final CTA, discards the rest.
- `backend/core/prompts/templates/slide_generation.txt` — Rule 3 strengthened: "Outputting more than 2 CTA slides will invalidate the entire response."

---

**Bug 5 — Datetime: remove hardcoded banner, create metadata helper**

- `backend/core/tools/metadata_helper.py` (NEW) — `get_llm_metadata_block()` returns a `=== CONTEXT METADATA ===` block with UTC date, time, day-of-week, quarter. Called at request time (not import time).
- `backend/core/prompts/system_prompts.py` — Removed `_date_banner()` and its `from datetime import date` import. `get_system_prompt()` now prepends `get_llm_metadata_block()` instead.
- Dead MCP servers deleted: `datetime_server.py` (replaced by metadata_helper) and `image_downloader_server.py` (replaced by image_downloader.py service) — both were dead code with no callers in the DAG pipeline.

---

**Architectural refactors (Session 19 review):**

- `backend/apps/api/v1/tools.py` — All inline schema classes and business logic removed. Handlers are now thin: validate → delegate → respond (≤5 lines each).
- `backend/core/prompts/templates/llm_knowledge.txt` (NEW) — Moved inline `_PROMPT` string out of `llm_knowledge.py`.
- `backend/core/prompts/templates/evidence_scoring.txt` (NEW) — Batch scoring prompt with 6-point anchor scale.
- `backend/configs/settings.py` — `research_allowed_tools` remains as a tool-executor gate; `llm_knowledge` is a graph node (not a tool), so it doesn't belong there.

---

**Playwright test suite (`backend/tests/test_frontend.py`) — 19/19 passing:**

- Added `pytest`, `pytest-timeout`, `pytest-asyncio` to `pyproject.toml` dependencies.
- `page_with_mock` fixture: intercepts `**/tools/query-refine` and returns instantly — avoids ~10s LLM call per test and HAI proxy rate-limiting mid-suite. One real E2E test (`test_full_e2e_with_real_refine`) exercises the actual LLM path.
- Uses `document.body.textContent` (not `innerText`) for news result detection — the "Intel: N Articles" `<h3>` has CSS `text-transform: uppercase`, so `innerText` returns "INTEL:" but `textContent` returns the DOM string "Intel:" correctly.
- 3 bug fixes discovered during testing: (1) download auto-clear batching (see Bug 2 above), (2) news source tab labelled "DDG" not "DuckDuckGo", (3) pipeline page "Topic" selector ambiguous — use exact "Target Topic".

**Status:** ✅ Complete — 19 Playwright tests passing, all 8 backend API endpoints verified via curl.

---



**Decision:** Refactored the monolithic frontend into a modular, premium-grade SPA using Redux Toolkit for persistent state management and Framer Motion for high-fidelity animations.

**Why:**
- Monolithic page structure was unmaintainable and caused state loss on navigation.
- Needed a "premium" feel to match the sophisticated multi-agent backend.
- Global state was required to track pipeline progress, chat history, and research data across the application.

**Key Implementation:**
1. **Redux Toolkit Architecture**:
   - `pipelineSlice`: Tracks active production runs, research results, and stage statuses.
   - `chatSlice`: Manages persistent AI assistant conversations.
   - `historySlice`: Persists completed runs to `localStorage` for cross-session recovery.
2. **Modular Component System**:
   - Broke down `pipeline/page.tsx` into independent, reactive components: `PipelineProgress`, `AngleSelector` (HITL Modal), `InstagramPreview`, `ResearchSummary`, and `PipelineConfig`.
   - Created `PremiumCard` and `Modal` UI primitives with glassmorphism and motion presets.
3. **High-Fidelity UI overhaul**:
   - Integrated **Framer Motion** for stage transitions and interactive states.
   - Modernized all application pages (**Pipeline**, **Research**, **Images**, **News**, **Chat**) with a unified "Studio AI" aesthetic.
   - Updated `Sidebar` with active-state layout animations.
4. **State Persistence**:
   - Redux state ensures that production progress is not lost when switching between research, chat, and pipeline views.

**Impact:** Dramatically improved UX, eliminated data loss during navigation, and established a scalable frontend architecture for future agentic features.

**Status:** ✅ Complete

---

## 2026-05-15 - Session 16: LLM Research Evaluator + Refinement Loop Hardening

**Decision:** Three layered improvements to the research quality pipeline — independent LLM judge, weight rebalance, and proper evidence accumulation across refinement iterations.

---

**1. Independent LLM content judge (`evaluator.py`, `contracts.py`, `content_evaluation.txt`)**

- New `LLMEvaluationOutput` Pydantic model: `factual_grounding`, `topic_relevance`, `specificity`, `coverage_breadth`, `overall_score`, `reasoning` (all 0–1 floats).
- `_run_llm_judge()` calls a separate LLM structured output with the raw evidence snippets — crucially, it reads evidence directly rather than trusting the synthesizer's self-report, catching cases where the LLM hallucinated beyond its sources.
- Prompt `content_evaluation.txt` instructs the judge to score only based on traceable evidence, penalise vague generalities, and write a 2-3 sentence reasoning citing specific claims.
- `EvaluationResult` extended with `llm_content_score`, `source_score`, `combined_confidence` fields.

---

**2. Weight rebalance and threshold raise (`evaluator.py`, `settings.py`)**

- New formula: `combined = llm_score × 0.35 + source_score × 0.65` (sources weighted higher — more objective than self-graded LLM).
- Pass threshold raised: `research_quality_min_confidence = 0.60` (was 0.50).
- If `combined_confidence < 0.60` and budget allows → `should_refine=True` → research loop retries.
- Graceful fallback: if LLM judge call fails, defaults to neutral 0.5 so the pipeline never hard-crashes on evaluator errors.

---

**3. Evidence accumulation + per-iteration file persistence (`normalizer.py`, `research_graph.py`, `orchestrator.py`, `workflow_state.py`)**

- `normalizer.py` now pre-seeds `seen_urls` from `state.get("evidence", [])` and starts the result list from existing evidence — each refinement iteration **adds** new sources instead of replacing them.
- `ResearchGraphState` gets a new `iteration_history: list[dict]` field.
- `refine_node` now records completed iteration (synthesis dump, evaluation dump, evidence count, timestamp) into `iteration_history`, then calls `save_iteration_snapshot()` to flush `evidence.json` + `research_result.json` to disk before looping back.
- `save_iteration_snapshot()` — new helper in orchestrator.py; writes mid-loop snapshots without touching `synthesis.md`.
- `save_research_output()` — extended with `iteration_history` param, writes `iterations[]` array, `total_iterations`, `best_iteration` into `research_result.json`.
- `_pick_best_iteration()` — helper that selects the synthesis + evaluation with highest `combined_confidence` across all iterations (including the final one); used both for `synthesis.md` and `ResearchResponse.synthesis`.
- `ResearchOrchestrator.run()` now returns the best synthesis (not just the last) so downstream angle/content nodes always get the highest-quality research regardless of how many loops ran.

**New `research_result.json` structure:**
```json
{
  "total_iterations": 2,
  "best_iteration": 2,
  "synthesis": { ...best synthesis... },
  "evaluation": { ...best evaluation... },
  "iterations": [
    { "iteration": 1, "synthesis": {...}, "evaluation": {"combined_confidence": 0.45}, "evidence_count": 15, "timestamp": "..." },
    { "iteration": 2, "synthesis": {...}, "evaluation": {"combined_confidence": 0.72}, "evidence_count": 30, "timestamp": "..." }
  ]
}
```

---

**E2E tests run:**

- `"Agentic AI agents in enterprise software"` — combined_confidence=0.9545 (LLM=0.87×0.35 + sources=1.0×0.65), passed in 1 iteration, full pipeline ✅
- `"How SAP is betting on AI agents to transform enterprise ERP in 2026"` — combined_confidence=0.902 (LLM=0.72×0.35 + sources=1.0×0.65), research summary cited Sapphire 2026 correctly, 3 angles × 12 slides each ✅

---

## 2026-05-15 - Session 15: Image Intelligence, No-Skeleton Layout, Graph Validator & Date Awareness

**Decision:** Four improvements to output quality based on live review of carousel output.

---

**1. Smarter per-slide image source selection (`image_fetcher.py`)**

- Removed entity-substring heuristic (`_is_entity_query`) from `_resolve_preferred_source()`.
- New logic: in `auto` mode, if the LLM's `image_query_ddgs` differs from `image_query`, prefer DDGS (the LLM already signalled this slide needs a real web image). If identical, prefer Pexels.
- Signature change: `_resolve_preferred_source(generic_query, specific_query, image_source)` — `entities` arg dropped entirely.
- Result: entity/news slides get DDGS (real faces, protest photos, news screenshots); abstract concept slides get Pexels (high quality stock). Works per-slide, not per-topic.

---

**2. Dual image queries in slide generation (`slide_generation.txt`, `contracts.py`)**

- `Slide` schema extended: added `image_query_ddgs` (entity-specific journalist query) alongside existing `image_query` (generic stock query).
- Prompt Rule 8 updated: all non-cta/non-engage slides must provide BOTH fields. `image_query` = 3-5 abstract words for Pexels; `image_query_ddgs` = specific person/place/date/event for DDGS web search ("what would a photo editor type to find a news photo for this exact slide?").
- `fetch_images_node` routes each slide independently: uses `image_query_ddgs` when source is DDGS, `image_query` when source is Pexels.

---

**3. No-skeleton text-only layout for colour slides (`carousel_generator.py`, content templates)**

- `carousel_generator.py` now computes `has_image = bool(image_path) and asset["source"] != "colour"` and passes it to every template render call.
- `aurora/content.html.j2` and `lumina/content.html.j2`: when `not has_image`, a dedicated CSS block activates — `.slide-grid` goes full-width column layout with padding `44px 60px`, `.text-panel` fills all space, fonts bump up (title 48px, body 23px, bullet-text 20px). No `.image-panel` rendered at all.
- Eliminated the deco-circles "skeleton" placeholder entirely — slides with no valid image now look like intentional text-focus slides, not broken placeholders.

---

**4. Graph validator (`graph_validator.py`, `slide_generator.py`)**

- New file: `core/orchestrators/content/graph_validator.py` — `validate_and_fix_slides(slides)` iterates stat slides and nulls out `chart_type`/`chart_data` when the chart is invalid.
- Validation checks: chart_data exists + is dict, labels/values present, lengths match, ≥2 data points, values are numeric, not all-identical (flat), year-as-absolute-value pattern (bar/column/donut with all values 1800–2100), radar `datasets` structure matches labels length.
- Stat template already guards on `{% if slide.chart_data %}` — nulling it produces a clean stat-value-only slide with no chart, no crash.
- Called in `slide_generator.py` immediately after `result.slides` is returned by the LLM, before any truncation or state update.

---

**5. Date awareness in all LLM calls (`system_prompts.py`, `query_preprocessor.py`)**

- `_date_banner()` function added to `system_prompts.py` — returns today's date in both human (`15 May 2026`) and ISO (`2026-05-15`) formats with instructions: "treat anything before today as historical, anything after today as future/planned."
- `get_system_prompt()` now prepends `_date_banner()` to every system prompt at call time (not import time) — covers all four agents: RESEARCH, ANGLE, CONTENT, VISUAL.
- `query_preprocessor.py` + `query_preprocessing.txt`: `{current_date}` injected into the preprocessor template, with explicit freshness calibration ("breaking = last 48h from today").
- Validated in E2E test: research summary for "Agentic AI 2025" correctly said "by early 2026", "end of 2025" — no more temporal confusion.

---

**E2E tests run:**

- `"Dirty politics of DMK in Tamil Nadu — Karunanidhi → Stalin → Udhayanidhi"` — 3 angles, 12 slides each, DDGS images (Udhayanidhi, Stalin, protest photos), no skeleton slides ✅
- `"Rise of Agentic AI in 2025 — autonomous agents replacing knowledge workers"` — research `status=success` in 1 loop (confidence 0.62), date-aware key points, correct arc ✅

---

## 2026-05-14 - Session 14: Carousel Layout Fixes + Arc & CTA Improvements

**Decision:** Fixed three visual/structural issues in the carousel output identified from live pipeline review.

**What was done:**

**Layout fixes:**

- Split the shared `{% else %}` CSS block for layouts 1 & 2 into separate `{% elif layout_variant == 1 %}` and `{% else %}` blocks in both `aurora/content.html.j2` and `lumina/content.html.j2`, giving independent padding control per layout
- **Layout 1 (text top, image bottom):** Changed `text-panel` from `flex: 0 0 55%; justify-content: center` → `flex: 0 0 auto; justify-content: flex-start` (eliminates the blank gap below short text content). Changed `image-card` from `aspect-ratio: 16/7` → `flex: 1` so the image fills all remaining height — no dead space
- **Layout 2 (image top, text bottom):** Added `padding: 28px 36px 8px` to `image-panel` — image was flush to the slide top edge (0px gap); now has a proper 28px visual inset. Text panel uses `padding: 20px 56px 28px` anchored via `justify-content: flex-start`
- Both themes (aurora + lumina) updated identically

**Arc ordering & CTA distribution:**

- `reorder.py` updated to new arc: `hook → content[:1] → stats[:2] → engage → early_ctas → stats[2:] → body_contents → quotes → final_cta`
- Ensures one content slide lands after the hook before any stats (gives context before data)
- `ctas[:-1]` placed after engage (mid-carousel ~position 6), `ctas[-1:]` always closes
- `slide_generation.txt` updated with explicit 2-CTA rule, updated slot distribution, and "NO EXCEPTIONS — output is invalid with 1 CTA" enforcement

**Bug fixes:**

- Fixed Jinja2 funnel chart access: `fdata.values` resolved to `dict.values()` method (getattr wins over getitem); changed to `fdata['values']` and `fdata['labels']` throughout `aurora/stat.html.j2` and `lumina/stat.html.j2`
- Fixed double-dash attribution in quote slides: strip leading `—`/`–`/`-` from `slide.body` before prepending `— ` in both quote templates

---

## 2026-05-14 - Session 13: Content Orchestrator — Full Pipeline Build (A-Z)

**Decision:** Built the complete content generation pipeline from slide data to final PNG carousels.

**What was done:**

**Orchestrators built (`core/orchestrators/content/`):**

- `slide_generator.py` — LLM-driven slide generation from angle + research; outputs structured `Slide` objects (hook/content/stat/quote/engage/cta types with chart data)
- `reorder.py` — Enforces carousel arc ordering (hook → stats → engage → content → quote → cta)
- `image_fetcher.py` — Parallel image fetching from Pexels API + Bing fallback per slide; downloads and caches to `images/` dir
- `carousel_generator.py` — Jinja2 HTML rendering per slide type + Playwright headless Chromium screenshotting at 2× DPI then downscaled to 1080×1080 PNG
- `caption_generator.py` — LLM-generated Instagram/LinkedIn caption per angle
- `finalizer.py` — Assembles output manifest JSON per angle
- `render_server.py` — Ephemeral aiohttp static server for serving local assets (fonts, Chart.js, images) to Playwright during screenshot

**Templates built (`core/templates/carousel/`):**

- Two themes: `aurora` (dark, high-contrast) and `lumina` (light, clean)
- Theme selected via `_TEMPLATE_MAP` keyed on `emotional_hook`: aurora for Anger/Fear/Urgency/Controversy/Surprise; lumina for Hope/Inspiration/Curiosity
- Slide types per theme: `_base.html.j2`, `hook.html.j2`, `content.html.j2`, `stat.html.j2`, `quote.html.j2`, `engage.html.j2`, `cta.html.j2`
- `content.html.j2`: 3 layout variants (0=left-text/right-portrait-image, 1=text-top/image-bottom, 2=image-top/text-bottom) cycled via `content_idx % 3`
- `stat.html.j2`: 6 chart types via Chart.js (bar, column, donut, line, radar, funnel) all rendered client-side; funnel uses pure CSS/HTML
- Assets: Plus Jakarta Sans (Regular/SemiBold/Bold) + Syne Bold fonts as woff2; Chart.js bundled locally (no CDN dependency)

**Key technical decisions:**

- Playwright screenshots at `device_scale_factor=2` (2160px) then Pillow LANCZOS downscale to 1080px — crisp text at final resolution
- `document.fonts.ready` await + 300ms buffer before screenshot (Chart.js canvas flush)
- `layout_variant` counter only increments for `content` slides; other types always get `layout_variant=0` (unused by their templates)
- `slide_generation.txt` prompt template enforces strict type rules: EXACTLY 2 CTAs, exactly 1 engage, max 3 stats, min 4 content slides, all chart labels ≤25 chars

---

## 2026-05-01 - Session 11–12: Angle Orchestrator + Pipeline API

**Decision:** Built the angle generation pipeline and wired the full CLI pipeline end-to-end.

**What was done:**

**Angle orchestrator (`core/orchestrators/angle/`):**

- `generator.py` — LLM generates 3–5 candidate angles from research summary; each angle has `statement`, `emotional_hook`, `supporting_evidence`, `target_emotion`
- `evaluator.py` — Scores each angle on specificity, emotional resonance, uniqueness, and research grounding (0–10 each)
- `auto_selector.py` — In `auto` mode, picks top 3 angles by score; in `manual` mode, prints angles and waits for CLI input
- `finalizer.py` — Assembles final angle list, saves `angles.json` to run output dir
- `human_approval.py` — Async human-in-the-loop pause for manual mode

**Graph wiring (`core/graphs/angle_graph.py`):**

- LangGraph `StateGraph`: generate → evaluate → select (auto/manual branch) → finalize

**Pipeline API (`apps/api/v1/pipeline.py`):**

- `POST /api/v1/pipeline/run` — Accepts topic + mode, runs full research → angle → content pipeline, returns run_id
- `GET /api/v1/pipeline/status/{run_id}` — Status polling endpoint
- Wired into `main.py` FastAPI app alongside existing research/angle routers

**CLI (`apps/cli/run_workflow.py`):**

- Refactored to sequential stage runner: research → angle → content
- `--mode {quick,standard,deep}` controls research depth
- `--angle-mode {auto,manual}` controls angle selection
- Structured stage logging with `pipeline_stage_started` / `pipeline_stage_completed` events

---

## ~~V2 Planned Improvements (Research Orchestrator)~~ — Completed in Session 16

~~These are known design limitations in V1 that are intentionally deferred:~~

1. ~~**Evidence accumulation across refinement loops**~~ ✅ Done — normalizer now accumulates across loops; `iteration_history` tracks each pass; per-iteration snapshots written to disk.
2. ~~**LLM-driven confidence scoring**~~ ✅ Done — independent LLM judge reads raw evidence and scores factual_grounding/topic_relevance/specificity/coverage_breadth; combined with source score (35/65 weighting).

---

## 2026-05-01 - Sessions 7–10: Research Orchestrator — Build, Wire & Multi-Round Bug Fix

**Decision:** Built and stabilised the full research orchestrator pipeline end-to-end.

**What was done:**

**Build phase (Sessions 7–8):**

- Implemented the full LangGraph `ResearchGraph` with 9 nodes: intake → route → execute_tools → normalize → synthesize → evaluate → refine / finalize / finalize_partial
- Built the `DeterministicResearchRoutingPolicy` that selects tools based on freshness, explicit URLs, and claim-verification needs
- Built the executor node that runs DDGS text/news, NewsAPI + GoogleNewsAPI (merged), and Crawl4AI with budget enforcement
- Built the normalizer that maps all tool outputs into a unified `Evidence` schema with deduplication
- Built the evaluator that quality-gates on source count and synthesis confidence, driving the refine/finalize branch
- Added `ResearchOrchestrator` to compile and invoke the graph with MemorySaver checkpointing
- Wired `research_node` as the LangGraph entry point for the broader `ContentWorkflowState`
- Rewrote `run_workflow.py` as a `ContentPipelineOrchestrator` manager — structured to connect all future orchestrators (angle, image, content, post design) in sequence via `ContentWorkflowState`; uses logger throughout, no print statements
- Added FastAPI `main.py` and `apps/api/v1/research.py` router with `/api/v1/research/run` and `/health` endpoints

**Bug fix rounds (Sessions 9–10) — critical fixes:**

- **structlog wiring** — `infra/logging.py` was returning a standard `logging.Logger` but the entire codebase used the structlog keyword-arg API; rewired to configure and return `structlog.BoundLogger` (would have crashed on every log call)
- **DDGS async** — all three DDGS calls were blocking the event loop; wrapped in `asyncio.to_thread(lambda: list(...))`
- **Timezone-naive datetimes** — fixed `datetime.now()` / `datetime.utcnow` calls across `news_api.py`, `crawl4ai_scraper_schema.py`, and `contracts.py`
- **`source_name` fallback** — added `_domain_from_url()` helper so `NewsArticle.source_name` (required field) always has a value
- **`published_at` fallback** — `NewsAPI._parse_article()` defaulted `published_at=None` which Pydantic rejects; fixed to `datetime.now(timezone.utc)`
- **Settings integration** — wired `newsapi_api_key`, `research_*` settings throughout; removed ad-hoc `os.getenv`/`load_dotenv` calls
- **Routing operator precedence** — hybrid rationale list concatenation silently dropped base rationale due to missing parentheses
- **Output directory path** — `Path(__file__).parents[4]` pointed to project root instead of `backend/`; fixed to `parents[3]`
- **`print()` in ClaudeLLM** — replaced with `logger.info()`
- **8 missing `__init__.py` files** — created for all tool, infra, and app packages
- **Typos in log event names** — `"resarch_node_start"` and `"retrived_at"` corrected

**Status:** ✅ Research orchestrator complete and stable — ready for integration testing

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

_Last updated: 2026-05-22 (Session 20)_
