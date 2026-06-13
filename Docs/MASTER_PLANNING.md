# MASTER PLANNING DOCUMENT
# Content Studio AI — Feature Roadmap with Execution Order

> Version: 5.1
> Date: 2026-06-08
> Scope: Plans 8, 7R, 6R+9 — final validated plan ready for implementation.
> Changes in 5.1: output path structure, gradient class fix, view/edit panel spec, mtime fix.

---

## PART 1: EXECUTION ORDER

```
Phase 1:  8  → Collapsible Sidebar (foundation, ~1h)
Phase 2:  7R → Pipeline Page Redesign + Smart Topic Discovery Drawer (~4h)
Phase 3:  6R+9 → Standalone Editor Page (PNG + Markdown, Folder Browser) (~8h)
```

**Plan 5 (Batch Mode)** — deferred, needs auth layer.
**Plan 10 (Instagram)** — see `Docs/INSTAGRAM_PUBLISHER_PLAN.md`.

---

## PART 2: BUGS AND GAPS FOUND IN VALIDATION (ALL ADDRESSED)

| # | Issue | Resolution |
|---|---|---|
| 1 | `handleRun()` never passes `preprocessed_queries` to backend | Added to plan — must pass from Redux state |
| 2 | `preprocessedQueries` missing from `pipelineSlice` | Added to Redux design |
| 3 | `setTopic()` must clear discovery state on manual edit | `setTopic` reducer updated to clear both fields |
| 4 | Editor file browser reads only from session Redux | Fixed: `GET /content/runs` reads disk; Redux = recents |
| 5 | `/blog-preview` now redundant with editor | Replaced by redirect to `/editor?run={id}` |
| 6 | MASTER_PLANNING.md had 3 stale duplicate sections | Fixed: trimmed to single version |
| 7 | Discovery panel crammed into `w-80` config sidebar | Resolved: full-height slide-in drawer over stage area |
| 8 | Entry point referenced `/blog-editor/{run_id}` (wrong) | Fixed: entry point is `/editor?run={runId}` |
| 9 | Google News `topic=` enum constraint | Non-issue: discover uses `query=`, bypasses constraint |
| 10 | `refineQuery` backend schema extension unnecessary | Simplified: context baked into topic string by frontend |
| 11 | `outputs/downloads` would appear in run list | **Fixed (implemented):** output path changed to `outputs/runs/`. All pipeline runs write to `outputs/runs/{run_id}/`. Downloads stay at `outputs/downloads/`. No UUID filter needed. 28 existing runs migrated. Legacy stored paths (`/outputs/{id}/...`) handled by `slideImageUrl()` rewrite — rewrites to `/outputs/runs/{id}/...` transparently. |
| 12 | `bg-gradient-to-*` inconsistent with Tailwind v4 canonical | **Fixed (implemented):** `Sidebar.tsx` updated to `bg-linear-to-*`. `InstagramPreview.tsx` intentionally kept (`bg-gradient-to-tr` is Instagram brand ring — visual decoration). |
| 13 | `view/edit ▾` in refined queries strip undefined | **Resolved in plan (Part 4c)** — inline expandable list |
| 14 | `GET /content/runs` mtime from dir (changes on write) | **Fixed in plan** — use `research_result.json` mtime |

---

## PART 3: PLAN 8 — COLLAPSIBLE SIDEBAR

Single file rewrite: `frontend/components/layout/Sidebar.tsx`

- `motion.aside` collapse/expand: 80px ↔ 256px via `animate={{ width }}`
- `useState(true)` + `localStorage("sidebar_expanded")` — no Redux
- `Menu` icon (top-right header) — always visible
- `AnimatePresence` on all text labels — prevents overflow flash
- Native `title` attribute on collapsed links — zero-JS tooltip
- `layoutId="active-nav"` gradient pill — still animates between pages
- Nav items: Pipeline, Research, Images, News, Chat, Editor (`PencilRuler` icon)
- Tailwind v4: `bg-linear-to-br` / `bg-linear-to-r` — **already fixed in current `Sidebar.tsx`**
- **No `/discover` nav item** — discovery lives inside the pipeline page drawer

**Regression risk: LOW** — only `Sidebar.tsx` changes.

---

## PART 4: PLAN 7R — PIPELINE PAGE REDESIGN + SMART TOPIC DISCOVERY

### 4a — New pipeline page layout

The `PipelineConfig.tsx` left panel (`w-80`) is replaced with a **compact top command bar**. Stage cards fill the full remaining width — much more breathing room.

```
[Sidebar] | [TOP COMMAND BAR — fixed strip at top of content area]
           | [Stage Cards — fill all remaining space]
                               ↕ (on demand)
           | [Smart Discover Drawer — slides in from right, full height]
```

**Top command bar (always visible):**
```
[Topic textarea (flex-1)] [Q/S/D] [B/R/E] [Auto/Manual] [⚙] [⚡ LLM] [🔍 Discover] [▶ Produce Content]
```

- `⚙` opens a small popover with numeric budget inputs (max tools, sources, loops, slides)
- `⚡ LLM` toggles LLM-only research mode
- `🔍 Discover` opens the drawer
- `▶ Produce Content` launches the pipeline

Below the command bar, a collapsible `Refined Queries` strip appears when queries are set:

```
✓ 6 queries set from "SAP Joule AI 2026..."  [view/edit ▾]  [× clear]
```

**`[view/edit ▾]` expands to an inline list:**
```
REFINED QUERIES  ─────────────────────────────────── [▴ collapse]  [× clear]
• [SAP Joule AI agents S/4HANA 2026          ]  [×]
• [SAP enterprise automation workflow AI      ]  [×]
• [Joule productivity enterprise 2026         ]  [×]
• [+ Add query]

  Additional guidance: [type to refine further...]  [→ Refine]
```

Each query is an editable `<input>` — user can fix wording before launching. `[×]` removes a row. `[+ Add query]` appends a blank row. `[→ Refine]` fires another `api.refineQuery()` round. All changes write back to `preprocessedQueries` in Redux immediately. Collapsing re-shows the summary line.

### 4b — Smart Discover Drawer

Opens from the right, `w-[480px]`, full content height. `AnimatePresence` with `x: "100%" → x: 0`.

```
┌──────────────────────────────────────────────────┐
│  🔍 Discover Topics      [↻ Refresh]    [✕ Close] │
│  ────────────────────────────────────────────────  │
│  [All][Tech][Politics][Business][Sports][Science]  │
│  ────────────────────────────────────────────────  │
│  TECH · 2h ago                                    │
│  SAP deploys Joule AI across all S/4HANA products  │
│  Eliminates manual reconciliation workflows        │  ← summary snippet
│  sap.com · TechCrunch          [→ Use as topic]    │
│  ────────────────────────────────────────────────  │
│  POLITICS · 3h ago                                 │
│  ...                                               │
└──────────────────────────────────────────────────┘
```

Cards: category chip (colour-coded), age label, headline (2-line clamp), **summary snippet** (2-3 sentences), source domain. `[→ Use as topic]` appears on hover.

### 4c — Selecting a topic → refinement flow

1. Drawer closes
2. `dispatch(setTopic(title))` + `dispatch(setDiscoveryArticle({...}))`
3. Topic textarea fills
4. `api.refineQuery(title)` fires automatically (existing endpoint, no change)
5. Refined queries strip appears below command bar with results

**Multi-round:** User types feedback in the strip → `api.refineQuery(topic + ". Guidance: " + feedback)` — single string, **no backend schema change**.

### 4d — Topic reset behaviour

`setTopic` reducer:
```ts
setTopic: (state, action: PayloadAction<string>) => {
  if (action.payload !== state.topic) {
    state.preprocessedQueries = [];
    state.discoveryArticle = null;
  }
  state.topic = action.payload;
},
```
Manual edit → automatic clean slate. No user action needed.

### 4e — handleRun() fix

```ts
const researchRes = await api.runResearch({
  topic,
  mode,
  freshness,
  run_id: pendingRunId,
  preprocessed_queries: preprocessedQueries.length > 0 ? preprocessedQueries : undefined,
  budget: { ... },
});
```

When `preprocessed_queries` is passed, `intake_node` skips running the preprocessor (Session 27 design). When absent, it generates them automatically.

### 4f — Redux changes

New fields in `pipelineSlice`:
```ts
preprocessedQueries: string[];
discoveryArticle: { title: string; snippet: string; url: string; category: string; } | null;
```

Both cleared by `resetPipeline()` and by manual topic edit.

### 4g — Files changed

| File | Change |
|---|---|
| `backend/apps/api/v1/tools.py` | ADD `GET /tools/news/discover` |
| `backend/apps/api/v1/schemas.py` | ADD `DiscoverArticle`, `DiscoverResponse` |
| `frontend/components/pipeline/PipelineConfig.tsx` | REDESIGN: top command bar layout |
| `frontend/app/pipeline/page.tsx` | ADD drawer state, discover drawer component |
| `frontend/store/slices/pipelineSlice.ts` | ADD fields; UPDATE `setTopic`; ADD actions |
| `frontend/lib/api.ts` | ADD `discoverTopics()` |

**Regression risk: MEDIUM** — `PipelineConfig.tsx` is a significant rework but underlying API calls and Redux dispatch logic unchanged.

---

## PART 5: PLAN 6R + 9 — STANDALONE EDITOR PAGE

### 5a — Blog preview decision

**`/blog-preview` is deprecated.** Replaced by a redirect: `router.push(\`/editor?run=${runId}&topic=${topic}\`)`. The editor's Preview tab shows the rendered HTML in an iframe — superset of the old read-only page. No functionality lost.

### 5b — Editor page layout

`/editor` — shows file browser immediately.
`/editor?run={run_id}` — auto-opens that run's files.

```
┌──────────────────┬──────────────────────────────────────────────────┐
│  FILE BROWSER    │              EDITOR AREA                          │
│  (240px fixed)   │         (fills remaining width)                   │
│                  │                                                    │
│  RECENT RUNS     │  [Empty state: "Select a file to start editing"]  │
│  (from Redux)    │                                                    │
│  • Topic · 3h    │                                                    │
│  • Topic · 1d    │                                                    │
│                  │                                                    │
│  ALL RUNS        │                                                    │
│  (from disk API) │                                                    │
│  ▼ run-abc123    │                                                    │
│    📁 angle_0    │                                                    │
│      🖼 slide_01 │                                                    │
│      🖼 slide_02 │                                                    │
│    📁 angle_1    │                                                    │
│    📝 blog.md    │                                                    │
│  ▼ run-def456    │                                                    │
└──────────────────┴──────────────────────────────────────────────────┘
```

### Output path structure (already implemented)

```
outputs/
├── runs/           ← all pipeline run outputs live here
│   ├── {run_id}/
│   │   ├── research/
│   │   ├── angles/
│   │   ├── content/
│   │   ├── blog_post.md
│   │   └── blog_post.html
└── downloads/      ← image downloads from Images page
    └── images/
```

Settings: `research_output_dirs = "outputs/runs"`, `content_output_dir = "outputs/runs"`, `image_download_path = "outputs/downloads/images"`.

**Recent runs (top):** From Redux `history` slice — current session, fast access, shown as topic + time.

**All runs (bottom):** `GET /content/runs` — scans `outputs/runs/` directory (fixed path, no UUID filter needed — `downloads/` is at `outputs/downloads/` and will never appear here). Returns run list with topic, created_at, `has_content`, `has_blog`. Sort uses `research_result.json` mtime (not directory mtime which changes on any file write). Paginated (50 runs max).

```python
@router.get("/runs")
async def list_runs() -> dict:
    runs_dir = _RUNS_ROOT  # outputs/runs/ — only pipeline run UUIDs live here
    runs = []
    for run_dir in runs_dir.iterdir():
        if not run_dir.is_dir(): continue
        rr = run_dir / "research" / "research_result.json"
        topic, mtime = "Unknown topic", run_dir.stat().st_mtime
        if rr.exists():
            try:
                data = json.loads(rr.read_text())
                topic = data.get("topic", "Unknown")[:80]
                mtime = rr.stat().st_mtime  # more stable than dir mtime
            except: pass
        runs.append({"run_id": run_dir.name, "topic": topic, "created_at": mtime,
                     "has_content": (run_dir / "content").exists(),
                     "has_blog": (run_dir / "blog_post.md").exists()})
    runs.sort(key=lambda r: r["created_at"], reverse=True)
    return {"runs": runs[:50]}
```

`GET /content/{run_id}/manifest` — returns file tree for one run (angles → slides → blog.md).

### 5d — Slide Editor (PNG selected)

```
┌───────────────────────┬─────────────────────────────────────────────┐
│  PREVIEW              │  EDIT                                        │
│                       │  [✏️ Text] [📊 Chart] [🖼 Image]              │
│  <img src="slide.png">│  ────────────────────────────────────────   │
│  (updates after save) │  [tab content]                               │
│                       │  ────────────────────────────────────────   │
│                       │  [💾 Save Changes]  [🤖 AI Rewrite]          │
└───────────────────────┴─────────────────────────────────────────────┘
```

**Text tab:** `title`, `body`, `bullets` (editable list with +/×), `stat_value`/`stat_label`. Local state until Save.

**Chart tab (stat slides only):** 6 chart type pills + inline data table (label/value, add/remove rows). Live `react-chartjs-2` canvas — updates on keystroke. No backend call for preview.

**Image tab:** Thumbnail + search input + Pexels/DDGS toggle + 3-col grid. Swap applied immediately on click.

### 5e — Markdown Editor (blog_post.md selected)

```
┌──────────────────────────────────┬───────────────────────────────────┐
│  [✏️ Edit]  [👁 Preview]           │  LLM ASSISTANT                    │
│                                  │                                   │
│  @uiw/react-md-editor (dark)     │  [chat messages]                  │
│                                  │                                   │
│  [💾 Save]  [⬇ .md]  [⬇ .html]   │  [input]  [Send]                  │
└──────────────────────────────────┴───────────────────────────────────┘
```

**Preview tab:** iframe rendering `GET /content/{run_id}/blog-post.html` — replaces the old `/blog-preview` page.

**LLM context:** `"[CURRENT DOCUMENT]\n{markdown}\n\n[USER REQUEST]\n{userMessage}"` prepended to user message. No backend change.

**Selection-aware:** Select text → "Edit selection" button → assistant pre-fills → "Apply" replaces selection.

### 5f — Backend refactors (prerequisite — run tests after each)

1. `carousel_generator.py`: extract `render_and_screenshot_single_slide(slide, angle, run_id, angle_index)` from loop in `screenshot_slides_node`. Node calls helper in loop — identical output. **Run 44+61 tests.**
2. `image_fetcher.py`: extract `fetch_and_download_single_image(query, source, dest_path)` from loop in `fetch_images_node`. **Run tests.**
3. `slide_validator.py`: `_regen_single_slide` → `regen_single_slide` (public). **Run tests.**

### 5g — New endpoints

```
GET  /content/runs                           ← list all runs from disk
GET  /content/{run_id}/manifest              ← file tree for one run
POST /content/{run_id}/slides/{n}/edit       ← text + chart fields
POST /content/{run_id}/slides/{n}/ai-rewrite ← AI regen with feedback
POST /content/{run_id}/slides/{n}/swap-image ← image search + swap
PUT  /content/{run_id}/blog-post             ← save Markdown + regen HTML
```

### 5h — Files changed

| File | Change |
|---|---|
| `frontend/app/editor/page.tsx` | NEW |
| `frontend/components/editor/FileBrowser.tsx` | NEW |
| `frontend/components/editor/SlideEditor.tsx` | NEW |
| `frontend/components/editor/MarkdownEditor.tsx` | NEW |
| `frontend/components/editor/ChartPreview.tsx` | NEW |
| `frontend/app/blog-preview/page.tsx` | REPLACE with redirect |
| `backend/apps/api/v1/content.py` | ADD 6 endpoints |
| `backend/apps/api/v1/schemas.py` | ADD models |
| `backend/core/orchestrators/content/carousel_generator.py` | REFACTOR |
| `backend/core/orchestrators/content/image_fetcher.py` | REFACTOR |
| `backend/core/orchestrators/content/slide_validator.py` | REFACTOR |
| `frontend/store/slices/pipelineSlice.ts` | ADD `updateCarouselPath` |
| `frontend/app/pipeline/page.tsx` | UPDATE "Open in Editor" button |
| `frontend/components/layout/Sidebar.tsx` | ADD "Editor" nav item |

---

## PART 6: FINAL VALIDATION CHECKLIST

### Plan 8
- [x] `Sidebar.tsx` — clean rewrite, no dependents
- [x] `Menu` + `PencilRuler` icons in lucide-react — confirmed installed
- [x] Tailwind v4: `bg-linear-to-*` — **already fixed in current `Sidebar.tsx`**
- [x] E2E tests use role/text selectors — sidebar DOM not tested

### Plan 7R
- [x] `QueryPreprocessor` wired in `intake_node` (Session 27)
- [x] `POST /tools/query-refine` — single `topic` string, no extension needed
- [x] `GoogleNewsAPI.execute(query=...)` confirmed works for free-text queries
- [x] `handleRun()` fix documented — add `preprocessed_queries` field
- [x] `setTopic` reducer clears discovery state on manual edit
- [x] `resetPipeline` clears `preprocessedQueries` + `discoveryArticle`
- [x] `PipelineConfig.tsx` redesign — underlying API/Redux calls unchanged
- [x] Discover panel in drawer — no width constraint, full breathing room
- [x] `view/edit ▾` panel fully specified — inline editable query list

### Plan 6R + 9
- [x] `slide_regen.txt` prompt exists
- [x] `slides.json` schema stable
- [x] `_search_pexels`/`_search_ddgs` directly callable
- [x] `_markdown_to_html()` reusable for blog save
- [x] `/editor` route free — confirmed
- [x] `/blog-preview` redirect — no orphaned page, preview now a tab in editor
- [x] `GET /content/runs` reads from `outputs/runs/` — **no UUID filter needed, clean path**
- [x] `GET /content/runs` uses `research_result.json` mtime — stable sort
- [x] Recent runs from Redux — fast access for current session
- [x] `@uiw/react-md-editor` dark mode confirmed
- [x] `react-chartjs-2` same Chart.js schema as backend templates
- [x] Output path: `outputs/runs/` — **already implemented, 28 runs migrated**
- [ ] **BLOCKER**: `render_and_screenshot_single_slide` extracted + tested
- [ ] **BLOCKER**: Chart.js POC — visual match between `react-chartjs-2` and Playwright render

---

## PART 7: CODING PRACTICES

- Pydantic models → `schemas.py` or `contracts.py`. Never inline in route files.
- Backend helpers → standalone async functions, not nested inside graph nodes.
- Frontend API methods → `lib/api.ts` with TypeScript interfaces.
- Redux state → appropriate slice only.
- Errors → 404/422 from backend; degraded UI in frontend (never blank crash).
- Non-fatal → `try/except` + logger.
- After every backend refactor → `pytest tests/test_validation_framework.py` (44) + `playwright test e2e/` (61).
- After each frontend phase → `playwright test e2e/` — confirm 61/61.
- Tailwind v4 class names — always check linter output.
- New packages: `pnpm add` / `uv add` only.

---

## PART 8: CONFIDENCE STATEMENT

**Confident and ready for Plan 8** — single file, all deps confirmed, zero regression risk.

**Confident for Plan 7R** — all bugs resolved. The top command bar + drawer approach removes every layout constraint. Refinement loop simplified (no backend changes). One note: `PipelineConfig.tsx` redesign is significant — verify with Playwright screenshots after each UI state.

**Not yet confident for Plans 6R + 9** — two blockers remain:
1. `render_and_screenshot_single_slide` helper extracted and tested
2. Chart.js POC confirms visual match

Once resolved, the plan is fully specced. No further design questions outstanding.

**Next step:** 8 → E2E → 7R → E2E + screenshots → resolve Plan 6R blockers → 6R + 9.

---

*Document status: READY (Plans 8, 7R) | PENDING POC (Plans 6R + 9)*
*Last updated: 2026-06-08*
