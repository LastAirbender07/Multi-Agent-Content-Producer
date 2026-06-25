# Product Improvement Roadmap

> Created: 2026-06-25
> Updated: 2026-06-25
> Context: Multi-Agent Content Producer — research → angles → carousel → editor pipeline.
> Status: Phase 1 complete. Phase 2 complete (items 2, 3, 4, 11).
> Scope: Excludes publishing (Instagram API) and authentication — deferred.

---

## Priority Overview

| #  | Improvement                                   | Impact      | Effort | Status          |
| -- | --------------------------------------------- | ----------- | ------ | --------------- |
| 1  | Carousel ZIP download                         | 🔴 Critical | Low    | ✅ Done          |
| 2  | Progress feedback during generation           | 🔴 Critical | Low    | ✅ Done          |
| 3  | Caption + hashtag editor                      | 🔴 Critical | Medium | ✅ Done          |
| 4  | Slide reorder + delete                        | 🟠 High     | Medium | ✅ Done (backend)|
| 5  | Batch style editing ("apply to all slides")   | 🟠 High     | Medium | Not started     |
| 6  | Run search + tagging                          | 🟡 Medium   | Low    | Not started     |
| 7  | Slide count flexibility (not fixed at 12)     | 🟡 Medium   | Low    | ✅ Done          |
| 8  | `/settings` page — brand config               | 🟡 Medium   | Medium | Not started     |
| 9  | Caption length + hashtag validation           | 🟡 Medium   | Low    | ✅ Done          |
| 10 | Token usage + cost display per stage          | 🟡 Medium   | Medium | ✅ Done          |
| 11 | `/analytics` page — usage, stats, insights   | 🟡 Medium   | Medium | ✅ Done          |
| 12 | A/B carousel comparison                       | 🟢 Nice     | Medium | ✅ Done          |
| 13 | Publishing (Instagram + Cloudinary)           | —           | High   | Deferred        |
| 14 | Authentication + multi-user                   | —           | High   | Deferred        |

---

## ✅ Completed Items

### Improvement 1 — Carousel ZIP Download ✅

**Shipped:** `backend/core/services/carousel_export_service.py`

`GET /api/v1/content/{run_id}/carousel-download?angle=0` — builds in-memory ZIP with all slide PNGs + `caption.txt` + `hashtags.txt` + `README.txt`. Private helpers `_read_carousel_meta()` (safe JSON parse with fallback) and `_build_readme()` keep `build_carousel_zip()` at 20 readable lines.

Frontend: `CarouselViewer` — "Download Angle N" / "Download ZIP" buttons below carousel, spinner during ZIP build, browser download on resolve. API: `api.downloadCarouselZip(runId, angleIdx)` returns `Blob`.

---

### Improvement 7 — Flexible Slide Count ✅

**Shipped:** Default changed from 12 → 10 (Instagram single-post max).

**Frontend only** — backend `ContentRequestBody` already accepted `max_slides`/`min_slides`.

- `PipelineConfig.tsx` chip toolbar: `5 · 7 · 10 · 12` quick-select chips, always visible without opening Config. Green dot marks 10 as recommended.
- `AdvancedSettings.tsx`: chip presets replaced the dual `min/max` stepper controls. Hint text: "10 = single Instagram post · 12 = needs splitting".

---

### Improvement 9 — Caption Length + Hashtag Validation ✅

**Shipped:** `backend/core/services/caption_validator.py`

Constants: `IG_CAPTION_MAX=2200`, `IG_HASHTAG_MAX=30`, `IG_HOOK_CHARS=125`.

`validate_caption()` returns `CaptionValidation` dataclass with `warnings[]`. `enforce_caption_limits()` silently trims to Instagram limits. Both called in `caption_generator.py` after every LLM generation — over-limit captions are trimmed before saving to `carousel.json`, warnings logged.

**Bug fixed during implementation:** `caption[124]` IndexError on captions shorter than 125 chars — guard added.

---

### Improvement 10 — Token Usage + Cost Display ✅

**Shipped:** `backend/core/services/token_tracker.py`

**Live pricing (not hardcoded):**

- Exchange rate: `https://api.exchangerate-api.com/v4/latest/USD` — live INR rate (was hardcoded 84.0; actual at build time: 94.65 — 12.5% error)
- LLM pricing: LiteLLM community JSON (`model_prices_and_context_window.json`, 2785 models), prices per-token converted to per-1M
- Both cached 6h via `_LiveCache`; silent fallback to last known values if fetch fails

**Recording:** `_token_meta=(run_id, stage)` optional kwarg on `ClaudeLLM.generate()` — zero regression. Wired in `caption_generator.py` (stage="caption"), `slide_generator.py` (stage="carousel"), `angle/generator.py` (stage="angles").

**Concurrency:** per-run `threading.Lock` prevents data loss when two LLM calls complete simultaneously for the same run.

**API:** `GET /api/v1/content/{run_id}/token-usage` returns `{total_input, total_output, total_cost_usd, total_cost_inr, by_stage}`.

**Frontend:** `TokenChip.tsx` — 🪙 badge showing tokens + ₹/$ cost. Appears at bottom of each completed stage card. Stage 3 shows carousel chip + caption chip + run total chip. `loaded` state ensures null is only returned after fetch resolves (not during loading).

---

### Improvement 12 — A/B Carousel Comparison ✅

**Shipped:** `components/pipeline/CarouselCompare.tsx` — full-viewport overlay modal.

**Architecture decision:** Two independent per-column indexes (not synced to `Math.min(totalA, totalB)` which silently truncated slides).

**Synced mode (default):**

- Shared `←→` nav in header moves both columns simultaneously
- Dot nav shows `max(totalA, totalB)` dots; dots beyond the shorter carousel render at 50% opacity — unequal lengths are visually obvious
- Clicking a dot clamps to valid range on each side independently

**Independent mode (toggle):**

- Each column has its own dot nav + arrow buttons below the slide
- Can be on slide 4 in A and slide 9 in B simultaneously

**Mismatch handling:**

- When `safeIdx >= totalOther`: slide counter badge turns amber with `✦` suffix
- Amber strip below slide says "Slide N has no counterpart — this angle has X extra slide(s)"
- Nothing hidden, nothing truncated

**Color identity:** A = violet, B = cyan throughout (badge, chip borders, hashtag text).

**UX details:** Angle picker as chips (not OS `<select>`), keyboard `←/→/Esc`, Framer Motion slide transition, "Synced"/"Independent" toggle button in header.

**Compare button placement:** Moved from navigation bar (was disrupting the carousel slider aesthetic) to the action row below the carousel, alongside download buttons. Spans full width when 2+ angles exist.

---

### Improvement 2 — Progress Feedback During Generation ✅

**Shipped:** `backend/core/orchestrators/content/_progress_store.py` — module-level dict mirroring the research progress store. `update(run_id, current, total)` called before each Playwright screenshot in `screenshot_slides_node`; `clear(run_id)` called on completion.

`GET /api/v1/content/{run_id}/render-status` returns `{current, total, pct, label}`.

Frontend: `hooks/useContentProgress.ts` polls at 1.5s intervals while `stages.content.status === "running"`. `ContentStageCard` shows animated progress bar + "Rendering slide N of M…" label instead of plain spinner.

---

### Improvement 3 — Caption + Hashtag Editor ✅

**Shipped:** `backend/core/services/caption_service.py` — `get_caption()` / `update_caption()` read/write `carousel.json` per angle. `GET/PUT /api/v1/content/{run_id}/caption/{angle_index}`.

`frontend/components/pipeline/CaptionEditor.tsx` — full modal with:
- Char counter progress bar (green → amber at 1800 → red at 2200)
- Hook preview showing exact first 125 chars (what Instagram shows before "more")
- Hashtag chips with × to remove, input to add (Enter to confirm)
- One-click copy for caption and hashtags separately
- `loadError` / `saveError` states surface failures visibly instead of silent console.error

`CarouselViewer` — "Caption" button added alongside each Download button.

---

### Improvement 4 — Slide Reorder + Delete ✅ (backend complete)

**Shipped:** `backend/core/services/slide_reorder_service.py`

`reorder_slides()` — permutes `slides.json` to match `new_order` list, then renames PNGs using a tmp-prefix swap buffer (prevents collision when new name equals existing name of a different slide).

`delete_slide()` — removes the slide dict from `slides.json`, deletes its PNG, renumbers all remaining slides 1..N-1.

`PUT /api/v1/content/{run_id}/slides/{angle_index}/reorder` + `DELETE /{angle_index}/{slide_number}`

`api.reorderSlides()` + `api.deleteSlide()` added to `lib/api/editor.ts`.

*Frontend drag-to-reorder UI (FileBrowser) not yet wired — the backend is ready for it.*

---

### Improvement 11 — `/analytics` Page ✅

**Shipped:** `backend/core/services/analytics_service.py` + `backend/apps/api/v1/analytics.py`

`GET /api/v1/analytics/summary` returns: KPIs (runs/slides/cost), token breakdown by stage, per-run token series (last 30), topic distribution (keyword classifier, 13 categories), daily activity map, model breakdown.

**Frontend:** `app/analytics/page.tsx` + `components/analytics/KpiCard.tsx` + `components/analytics/ContributionCalendar.tsx`

**Activity calendar final design** — SVG-based 53-week GitHub-style grid:
- Month labels placed at exact pixel x-offset via `<text x={DOW_LABEL_W + col*STEP}>`
- `buildGrid()` pure function — always exactly 53 weeks, handles leap years via `new Date()`, marks `padding` for days outside the selected year
- Tooltip via `useRef<HTMLDivElement>` DOM mutation — no `useState`, no re-renders on hover. Eliminates page jitter from `onMouseMove` + `setState` on 371 SVG rects
- Future cells render as `#27272a` (dim but visible), distinct from past-empty `#3f3f46`
- Year picker chips — years computed from activity data, current year always included
- Streak counter: consecutive days back from today

---

## 🔵 Not Started — Next Up

## Improvement 1 — Carousel ZIP Download

### The problem

Carousel PNGs are generated and saved to `/outputs/runs/{run_id}/content/angle_0/png/` on the backend filesystem. There is no way to get them out of the app. To post to Instagram, users must SSH into the server and copy files manually.

### What needs to be built

**Backend — one new endpoint:**

```python
GET /api/v1/content/{run_id}/carousel-download?angle=0
```

- Reads all `slide_*.png` files from the angle output directory
- Creates an in-memory ZIP file using Python's `zipfile` module
- Returns as `application/zip` with `Content-Disposition: attachment; filename="carousel_{run_id}_angle_{angle}.zip"`
- Also include `caption.txt` and `hashtags.txt` in the ZIP

**Frontend — one new button:**

- In the `CarouselViewer` component (pipeline page) and in the editor
- "Download Carousel" button → hits the endpoint → triggers browser download
- Show loading state while ZIP is being created

**Caption + hashtag text files in the ZIP:**

```
carousel_abc123_angle_0/
  slide_01.png
  slide_02.png
  ...
  slide_12.png
  caption.txt        ← the generated Instagram caption
  hashtags.txt       ← one hashtag per line
  README.txt         ← angle statement + key points from research
```

### Files to change

- `backend/apps/api/v1/content.py` — add `GET /{run_id}/carousel-download` endpoint
- `backend/core/services/` — add `carousel_export_service.py` with ZIP logic
- `frontend/components/pipeline/CarouselViewer.tsx` — add Download button
- `frontend/app/editor/page.tsx` — add Download button in toolbar

### Success criteria

- User clicks "Download Carousel" → browser downloads a ZIP within 3 seconds
- ZIP contains all 12 slide PNGs + caption.txt + hashtags.txt
- File names are sequential (`slide_01.png` through `slide_12.png`)

---

## Improvement 2 — Progress Feedback During Generation

### The problem

Carousel generation takes 2–3 minutes. During this time the UI shows a spinner with no indication of which stage is running or how far along it is. Users think the app is broken.

### What needs to be built

**Real-time progress for rendering stage:**
The backend already has a `_progress_store` for research. The same pattern needs to apply to carousel generation.

The Playwright rendering loop (`carousel_generator.py`) renders slides one by one. It should emit progress events:

```python
# In carousel_generator.py, inside the render loop:
_progress_store.set(run_id, {
    "stage": "rendering",
    "current": slide_number,
    "total": total_slides,
    "pct": round(slide_number / total_slides * 100),
    "label": f"Rendering slide {slide_number} of {total_slides}…"
})
```

**Frontend polling:**
The pipeline page already polls research progress. Extend it to poll during content generation:

```typescript
// Same pattern as research polling
const prog = await api.getResearchStatus(runId);  // reuse this pattern
```

Or add a dedicated `GET /content/{run_id}/render-status` endpoint.

**UI — progress bar on the content stage card:**

```
Stage 3: Generated Carousels       RUNNING
━━━━━━━━━━━━━━━━━━━━░░░░░░░   8 / 12 slides
Rendering slide 8 of 12…
```

**Toast notification on completion:**

```
✅ Carousel ready — 12 slides generated
[View in Editor]  [Download ZIP]
```

### Files to change

- `backend/core/orchestrators/content/carousel_generator.py` — emit progress per slide
- `backend/apps/api/v1/content.py` — add `GET /{run_id}/render-status` endpoint
- `frontend/app/pipeline/page.tsx` — poll render status, show progress bar
- `frontend/components/pipeline/StageCard.tsx` — display sub-progress within stage card

### Success criteria

- User sees "Rendering slide 4 of 12" updating in real-time
- Toast appears when generation completes
- Toast has direct links to editor and download

---

## Improvement 3 — Caption + Hashtag Editor

### The problem

Captions and hashtags are generated and stored in `carousel.json` inside each run. They are displayed in the Instagram preview but are read-only. To edit a caption, users must edit JSON files directly. This is the primary content refinement loop and it's completely broken.

### What needs to be built

**Backend — two endpoints:**

```python
GET  /api/v1/content/{run_id}/caption/{angle_index}
# Returns: { caption: string, hashtags: string[], char_count: int }

PUT  /api/v1/content/{run_id}/caption/{angle_index}
# Body: { caption: string, hashtags: string[] }
# Saves back to carousel.json
```

**Frontend — a dedicated caption editor panel:**

New page or drawer: accessible from the carousel preview and from the editor

```
┌─────────────────────────────────────────────────────────┐
│  Caption Editor                                         │
├─────────────────────────────────────────────────────────┤
│  [Caption textarea — 2200 char max]                     │
│                                                         │
│  "Your MBA is worthless without technical               │
│   skills. India's 400,000 MBA graduates                 │
│   compete for 15,000 tier-1 spots every year…"         │
│                                                         │
│  ████████████████████████░░░░░  487 / 2200 chars       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Hashtags                          [Copy all]           │
│  #MBA #India #CareerAdvice +12 more                     │
│  [editable tag chips — click to remove, type to add]   │
│  28 / 30 hashtags                                       │
├─────────────────────────────────────────────────────────┤
│       [Copy caption]  [Save]  [Regenerate with AI]      │
└─────────────────────────────────────────────────────────┘
```

**Key features:**

- Character counter (Instagram limit: 2,200)
- Hashtag limit counter (Instagram limit: 30)
- Red warning when over limits
- "Copy caption" and "Copy hashtags" — one-click for manual Instagram posting
- "Regenerate with AI" — calls the LLM to rewrite the caption with feedback

### Files to change

- `backend/apps/api/v1/content.py` — add caption GET/PUT endpoints
- `backend/core/services/` — add `caption_service.py`
- `frontend/components/pipeline/CarouselViewer.tsx` — add "Edit Caption" button
- `frontend/components/pipeline/CaptionEditor.tsx` — new component
- `frontend/lib/api/content.ts` — add `getCaption()` and `updateCaption()` methods

### Success criteria

- User can click "Edit Caption" from the carousel preview
- Changes are saved and persist across browser refreshes
- Character and hashtag counters show in real-time
- One-click copy puts caption on clipboard ready to paste into Instagram
- "Regenerate" produces a new caption without losing the edited one (shown as alternative)

---

## Improvement 4 — Slide Reorder + Delete

### The problem

The 12-slide carousel arc is fixed. Users cannot remove a slide that doesn't fit their angle or rearrange slides to improve the narrative flow. Any modification requires re-running the entire content generation.

### What needs to be built

**Backend — update slides endpoint:**

```python
PUT /api/v1/content/{run_id}/slides/{angle_index}/reorder
# Body: { slide_numbers: [1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12] }

DELETE /api/v1/content/{run_id}/slides/{angle_index}/{slide_number}
```

The reorder endpoint writes the new order to `slides.json` and updates PNG filenames accordingly.

**Frontend — drag-to-reorder strip:**

In the editor's left panel (file browser), the slide list becomes a draggable strip:

```
[📎 Slide 1]  ← drag handle ≡
[📎 Slide 2]  ← drag handle ≡  [🗑 Delete]
[📎 Slide 3]  ← drag handle ≡
```

Use `@dnd-kit/sortable` (already used by other drag features) for the drag handles.

**Confirmation on delete:**

```
Delete slide 4?
This slide will be removed from the carousel.
[Cancel]  [Delete slide]
```

### Files to change

- `backend/apps/api/v1/content.py` — reorder and delete endpoints
- `backend/core/services/slide_editor_service.py` — reorder/delete logic (rename PNGs, update slides.json)
- `frontend/components/editor/FileBrowser.tsx` — drag handles on slide items
- `frontend/app/editor/page.tsx` — wire delete confirmation

### Success criteria

- User drags slide 5 above slide 3 — the preview updates to reflect new order
- User deletes slide 7 — it disappears from the list, carousel renumbers
- Changes persist after browser refresh (saved to server)
- Maximum slide count is shown (e.g. "10 / 12 slides")

---

## Improvement 5 — Batch Style Editing ("Apply to All Slides")

### The problem

If a user wants to change the accent colour across all 12 slides, they must edit each slide individually — 12 separate canvas open → edit → save cycles. This makes global style changes impractical.

### What needs to be built

**In the editor toolbar — "Apply to all slides" button:**

When a user edits a style property (accent colour, font, background) on the current slide, a button appears:

```
You changed: Accent colour → #EC4899
[Apply to this slide only]  [Apply to ALL 12 slides]
```

**Backend — bulk style endpoint:**

```python
POST /api/v1/content/{run_id}/slides/{angle_index}/bulk-style
# Body: { overrides: { accent_color: "#EC4899", title_font_size: "lg" } }
# Applies to all slides in the angle
```

**Frontend — style sync:**
When the user saves a style change and clicks "Apply to all", the frontend calls the bulk endpoint and then re-renders all slide previews.

**Also needed:** A "Slide style defaults" panel — a set of global defaults that all new slides inherit. Currently every slide has its own `slide_overrides` dict.

### Files to change

- `backend/apps/api/v1/content.py` — add `POST /{run_id}/slides/{angle}/bulk-style`
- `backend/core/services/slide_editor_service.py` — bulk override logic
- `frontend/app/editor/page.tsx` — detect style changes, show apply-to-all prompt
- `frontend/components/editor/CanvasToolbar.tsx` — add bulk apply button

### Success criteria

- Changing accent colour on one slide shows "Apply to all 12 slides?" prompt
- Clicking "Apply to all" updates all slides within 3 seconds
- The carousel preview reflects the new colours immediately

---

## Improvement 6 — Run Search + Tagging

### The problem

The recent runs list shows the last 10 runs in localStorage. There is no way to search by topic, filter by date, or mark important runs. As usage grows, finding a specific run becomes impossible.

### What needs to be built

**Backend — runs list with filtering:**

```python
GET /api/v1/content/runs?search=MBA&tag=published&limit=20&offset=0
```

Update `list_runs()` in `run_browser_service.py` to support:

- Full-text search on topic
- Filter by user-assigned tags
- Sort by created_at (desc by default)
- Pagination

**Backend — run metadata update:**

```python
PATCH /api/v1/content/{run_id}/metadata
# Body: { tags: ["published", "Q1"], starred: true, notes: "resonated well" }
```

Stores metadata in a `run_metadata.json` sidecar file in the run directory.

**Frontend — search bar + filters in FileBrowser:**

```
🔍 Search runs…
[All] [Starred ⭐] [Published ✅] [Draft]
Sort: Newest first ▼

⭐ MBA skills gap in India       2d ago
   India's food culture shift    5d ago
   AI in enterprise software     1w ago
```

**Tags shown as chips on each run card.** Users can click a run card to add tags or star it.

### Files to change

- `backend/core/services/run_browser_service.py` — add search + filter
- `backend/apps/api/v1/content.py` — update runs endpoint, add metadata PATCH
- `frontend/lib/api/content.ts` — update `getRunsList()` with query params
- `frontend/components/editor/FileBrowser.tsx` — add search input, filter chips, star button
- `frontend/components/pipeline/PipelineRecentRuns.tsx` — same treatment

### Success criteria

- Typing "MBA" in the search box shows only runs with "MBA" in the topic
- Starring a run persists across browser refreshes (server-side)
- Runs can have tags like "Published", "Draft", "Needs edit"
- Run list paginates at 20 items

---

## Improvement 7 — Flexible Slide Count

### The problem

The carousel is hardcoded to exactly 12 slides. Instagram carousels support 3–10 slides (10 is the maximum for a carousel post; more than 10 must be split). The current 12-slide output always needs to be split or truncated before posting.

### What needs to be built

**Backend — configurable slide count:**

In `PipelineConfig.tsx` and in the content generation request:

```typescript
// Add to ContentRequestBody:
max_slides?: number;   // default 10, max 10 for single IG post
min_slides?: number;   // default 5
```

The content generation orchestrator already accepts `max_slides` and `min_slides` (they're in the schema). The issue is the UI doesn't expose them and the default may be 12.

**Frontend — slide count selector in pipeline config:**

```
Number of slides  [5] [7] [10] [12]
                           ↑ recommended for Instagram
```

Add a note: "Instagram carousels support up to 10 slides. Use 12 for multi-part posts."

**Carousel splitting UI:**
For runs that generated 12 slides, add a "Split into 2 posts" button that creates two 6-slide ZIPs:

- Part 1: slides 1–6
- Part 2: slides 7–12

### Files to change

- `frontend/components/pipeline/PipelineConfig.tsx` — add slide count control
- `frontend/components/pipeline/CarouselViewer.tsx` — add "Split" button
- `backend/apps/api/v1/content.py` — new `POST /{run_id}/carousel/split` endpoint

### Success criteria

- User can set slide count to 10 before generating
- Generating with count=10 produces exactly 10 slides
- "Split into 2 posts" creates two download-ready ZIPs of 6 slides each

---

## Improvement 8 — `/settings` Page

### The problem

Brand configuration (name, logo, colours, fonts) is hardcoded to "THEOPINIONBOARD" and the aurora theme. There is no UI to change brand settings, API keys, or output preferences.

### What needs to be built

**New page: `/settings`**

Three sections:

**Brand Identity:**

```
Brand name:        [THEOPINIONBOARD]
Logo:              [Upload logo PNG]  [Current: logo.png preview]
Primary colour:    [#7C6EFA] ████
Secondary colour:  [#2DD4BF] ████
Slide theme:       [Aurora ●] [Lumina ○]
```

**Content Defaults:**

```
Default depth:     [Quick] [Standard ●] [Deep]
Default freshness: [Breaking] [Recent ●] [Evergreen]
Default slides:    [7] [10 ●] [12]
Image source:      [Pexels ●] [DuckDuckGo] [None]
```

**API Keys (shown masked):**

```
Pexels API key:    [sk-••••••••••••••••••]  [Edit]
NewsAPI key:       [not configured]          [Add]
OpenAI key:        [sk-••••••••••••••••••]  [Edit]
Anthropic key:     [sk-ant-••••••••••••••]  [Edit]
```

**Backend — settings service:**
Settings are stored in a `settings.json` file in the backend root (or as environment variable overrides). A new `GET/PUT /api/v1/settings` endpoint reads and writes them.

Brand logo upload becomes `POST /api/v1/settings/logo`.

### Files to change

- `backend/apps/api/v1/` — add `settings.py` router
- `backend/core/services/settings_service.py` — read/write settings.json
- `frontend/app/settings/page.tsx` — new page
- `frontend/lib/api/` — add `settings.ts`
- Canvas templates — read brand colours from settings instead of hardcoded tokens

### Success criteria

- User changes brand name → all new slides use the new name in the brand bar
- User uploads a new logo → logo appears in brand bar on next carousel generation
- Colour changes are reflected in aurora token overrides
- API keys can be updated without editing `.env` files

---

## Improvement 9 — Caption Length + Hashtag Validation

### The problem

Instagram enforces:

- Caption maximum: 2,200 characters
- Hashtag maximum: 30 per post (using more gets shadowbanned)
- First 125 characters are visible without "more" tap — the hook must be in the first 125 chars

The current system generates captions without checking any of these constraints.

### What needs to be built

**Backend — validation in caption generation:**

Add a `validate_caption(caption: str, hashtags: list[str]) -> ValidationResult` function in `carousel_generator.py`:

```python
@dataclass
class CaptionValidation:
    char_count: int
    is_over_limit: bool        # > 2200 chars
    hashtag_count: int
    hashtags_over_limit: bool  # > 30 hashtags
    hook_visible: bool         # first 125 chars end at a sentence
    warnings: list[str]
```

If the caption is over 2,200 characters, automatically truncate with `…` and log a warning.

**Frontend — validation display:**

In the caption editor (Improvement 3), show:

- Character count in real-time: `487 / 2200` (green → yellow at 1800 → red at 2200)
- Hashtag count: `18 / 30` (green → red at 30)
- Hook preview: shows exactly what appears before the "more" fold
- Warning banner if limits are exceeded

### Files to change

- `backend/core/orchestrators/content/carousel_generator.py` — add validation
- `frontend/components/pipeline/CaptionEditor.tsx` — add validation display (from Improvement 3)

### Success criteria

- Generated captions are never over 2,200 characters
- UI shows real-time char counter while editing
- Warning appears if user manually types past 2,200 chars
- Hashtag count shows "18 / 30" in real-time

---

## Improvement 10 — Token Usage + Cost Display Per Stage

### The problem

Every LLM call in the pipeline (research synthesis, angle generation, slide content writing, blog post generation, caption generation) costs money — but users have no idea how much. There's no visibility into whether a run cost ₹2 or ₹200. The `LLMResponse` object already captures `usage: { input_tokens, output_tokens }` from the Anthropic API — it's just never stored or shown anywhere.

### Current state (what exists)

- `backend/infra/llm/providers/claude.py` — returns `LLMResponse` with `usage` dict containing `input_tokens` and `output_tokens` from Anthropic's API
- `backend/configs/settings.py` — model is `claude-4.5-sonnet` (current pricing: $3/$15 per 1M input/output tokens)
- Token data is returned but immediately discarded — never written to disk or surfaced to UI

### What needs to be built

**Backend — token tracking middleware:**

Create `backend/core/services/token_tracker.py`:

```python
@dataclass
class TokenUsage:
    run_id: str
    stage: str          # "research" | "angles" | "carousel" | "blog" | "caption"
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float     # computed from model pricing table
    timestamp: str

class TokenTracker:
    PRICING = {
        "claude-sonnet-4-5":   { "input": 3.00, "output": 15.00 },  # per 1M tokens
        "claude-haiku-4-5":    { "input": 0.80, "output": 4.00  },
        "claude-opus-4-8":     { "input": 15.0, "output": 75.00 },
    }

    def record(self, run_id, stage, llm_response: LLMResponse) -> TokenUsage:
        # Extract tokens from LLMResponse.usage
        # Compute cost from pricing table
        # Append to run_id/token_usage.json

    def get_run_summary(self, run_id) -> dict:
        # Total tokens and cost breakdown by stage for a single run

    def get_all_time_summary(self) -> dict:
        # Aggregate across all runs — total spend, by stage, by model
```

Each orchestrator passes `LLMResponse` to `token_tracker.record()` after every LLM call. Token data written to `outputs/runs/{run_id}/token_usage.json`.

**Backend — new API endpoint:**

```python
GET /api/v1/content/{run_id}/token-usage
# Returns breakdown by stage for a single run

GET /api/v1/analytics/token-summary
# Returns all-time aggregates
```

**Frontend — inline cost chips on each stage card:**

On the pipeline page, each completed stage card shows a small token badge:

```
┌─────────────────────────────────────────────────────┐
│  1  Research Results               DONE  ✓          │
│     37 sources · confidence 86%                     │
│                                                     │
│     🪙 4,218 tokens · ₹0.32 / $0.004               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  2  Angle Selection                DONE  ✓          │
│     3 angles selected                               │
│                                                     │
│     🪙 2,101 tokens · ₹0.16 / $0.002               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  3  Generated Carousels            DONE  ✓          │
│     12 slides · 1 blog post                         │
│                                                     │
│     🪙 18,440 tokens · ₹1.38 / $0.017              │
│     ─────────────────────────────────────           │
│     Total this run: 24,759 tokens · ₹1.86 / $0.023 │
└─────────────────────────────────────────────────────┘
```

Coin emoji (🪙) is compact and non-intrusive. Shown in muted zinc colour by default, not alarming.

**Currency display:**
Show both ₹ (INR) and $ (USD) since the user is Indian but costs are billed in USD. Use a fixed exchange rate (e.g. 1 USD = 84 INR) stored in settings, updatable by the user.

**In the editor:** A small badge in the CanvasToolbar showing total cost for the current run:

```
Slide 3  |  Save  |  Export PNG  |  🪙 ₹1.86 total
```

### Files to change

- `backend/core/services/token_tracker.py` — new service
- `backend/infra/llm/providers/claude.py` — call `token_tracker.record()` after each generation
- `backend/apps/api/v1/content.py` — add `GET /{run_id}/token-usage` endpoint
- `frontend/components/pipeline/StageCard.tsx` — add token chip at bottom of each card
- `frontend/lib/api/content.ts` — add `getTokenUsage(runId)` method
- `frontend/components/editor/CanvasToolbar.tsx` — add total cost badge

### Success criteria

- After every completed run, `token_usage.json` exists in the run folder
- Each stage card shows tokens used and cost in ₹ and $
- Total run cost shown in editor toolbar
- Numbers update in real-time as stages complete (polled alongside render progress)

---

## Improvement 11 — `/analytics` Page — Usage, Stats and Insights

### The problem

There is no way to understand how the product is being used, which topics perform well, how much has been spent on AI calls, or what content patterns have been created. A stats page gives users a sense of their own creative output and helps identify what's working.

### What needs to be built

**New page: `/analytics`**

Three sections with a modern dark dashboard aesthetic — glassmorphism cards, gradient accents, large numbers, subtle animations.

---

**Section 1 — Overview (top row, 4 KPI cards):**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Total Runs     │  │  Slides Created │  │  Total Spent    │  │  Avg Cost/Run   │
│                 │  │                 │  │                 │  │                 │
│     47          │  │     564         │  │   ₹86.40        │  │    ₹1.84        │
│                 │  │                 │  │   $1.03         │  │    $0.022       │
│  +3 this week   │  │  +36 this week  │  │  This month     │  │  Last 30 runs   │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

**Section 2 — Token Usage Breakdown (chart + table):**

A stacked bar chart (using Chart.js — already in the codebase) showing token consumption per stage over the last 30 runs:

```
Tokens per run (last 30 runs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ■ Research    ■ Angles    ■ Carousel    ■ Blog

Run 47  ████████████████████████████████  24,759
Run 46  ██████████████████████████        19,240
Run 45  ███████████████████████████████   22,880
...
```

Below the chart, a cost breakdown table:

| Stage              | Avg tokens/run | Avg cost/run (₹) | % of total |
| ------------------ | -------------- | ----------------- | ---------- |
| Research synthesis | 4,218          | ₹0.32            | 17%        |
| Angle generation   | 2,101          | ₹0.16            | 9%         |
| Carousel content   | 14,320         | ₹1.08            | 58%        |
| Blog post          | 3,180          | ₹0.24            | 13%        |
| Captions           | 940            | ₹0.07            | 4%         |

---

**Section 3 — Content Insights (topics, patterns):**

```
┌──────────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  Topics created (last 30 days)           │  │  Most used slide types              │
│                                          │  │                                     │
│  🔵 Business & Startups    12 runs       │  │  📊 Stat slides        28%          │
│  🟣 AI & Technology         9 runs       │  │  📝 Content (img)      24%          │
│  🟢 Education & Career      8 runs       │  │  🎯 Hook               16%          │
│  🟠 Politics & Society      6 runs       │  │  💬 Quote              14%          │
│  🔴 Finance                 5 runs       │  │  🚀 CTA                10%          │
│  ⚪ Other                    7 runs       │  │  ✨ Engage              8%          │
└──────────────────────────────────────────┘  └─────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│  Research quality trend (confidence score over last 20 runs)                    │
│                                                                                  │
│  1.0 ─                                                                           │
│  0.8 ─ ·····  ╭──╮    ╭──────╮                                                  │
│  0.6 ─      ╰─╯  ╰────╯      ╰──────···                                         │
│  0.4 ─                                                                           │
│       run1  run5  run10  run15  run20                                            │
│  Avg confidence: 0.74   Peak: 0.91   Lowest: 0.58                               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

**Section 4 — Run Timeline (activity feed):**

```
Activity — last 30 days

June 25  ████████████  12 runs
June 24  ██████         6 runs
June 23  ███            3 runs
June 22  ────           0 runs  (no activity)
June 21  █████          5 runs
...

Most active day: June 25 (12 runs)
Current streak: 4 days 🔥
```

A GitHub-style contribution heatmap showing activity across the last 90 days — each cell is one run, colour intensity scales from 0 to 5+ runs per day.

---

**Section 5 — Model Usage (if multiple models used):**

```
Model breakdown (all time)

claude-sonnet-4-5    ████████████████████   89%  · ₹74.20
claude-haiku-4-5     ███                     11%  · ₹9.10

Total: ₹83.30 spent since [first run date]
```

---

**Backend — analytics aggregation service:**

Create `backend/core/services/analytics_service.py`:

```python
def get_analytics_summary() -> AnalyticsSummary:
    # Scan all run folders
    # Read token_usage.json from each
    # Aggregate by stage, by date, by topic category
    # Return structured summary with all chart data
```

New endpoint:

```python
GET /api/v1/analytics/summary
# Returns full analytics payload for the /analytics page
```

Topic categorisation: a lightweight keyword classifier that buckets run topics into categories (Business, Tech, Education, etc.) — no LLM needed, just regex/keyword matching.

**Frontend:**

- New route `/analytics`
- Add "Analytics" to the sidebar navigation
- All charts use Chart.js (already in the codebase)
- Reuse existing aurora dark theme + glassmorphism card components
- Animate numbers counting up on first load (CSS counter animation)
- Real-time updates: pull fresh data every 30s if a run is active

### Files to change

- `backend/core/services/analytics_service.py` — new aggregation service
- `backend/core/services/token_tracker.py` — must exist first (Improvement 10)
- `backend/apps/api/v1/` — add `analytics.py` router
- `frontend/app/analytics/page.tsx` — new page
- `frontend/lib/api/` — add `analytics.ts`
- `frontend/app/layout.tsx` or sidebar component — add Analytics nav item

### Success criteria

- `/analytics` page loads in under 2 seconds with data from all past runs
- Token cost breakdown shows per-stage split for all-time and per-run
- Topic distribution chart correctly categorises at least 80% of run topics
- Activity heatmap shows correct daily run counts
- All currency shown in both ₹ and $ with correct exchange conversion
- Page is mobile-responsive (single-column on small screens)

---

## Improvement 12 — A/B Carousel Comparison

### The problem

When generating content for the same topic with different angle selections or settings, users have no way to compare two carousels side-by-side before deciding which to use.

### What needs to be built

**Frontend — compare view:**

Add a "Compare" button to the carousel viewer that opens a side-by-side split view:

```
┌──────────────────┬──────────────────┐
│  Carousel A      │  Carousel B      │
│  "MBA gap"       │  "Skills crisis" │
│                  │                  │
│  [slide 1/12]   │  [slide 1/12]   │
│  ← →            │  ← →            │
│  Caption preview │  Caption preview │
│                  │                  │
│  [Use this one] │  [Use this one] │
└──────────────────┴──────────────────┘
```

Both carousels are synced — swiping left on one moves both to the next slide.

**"Use this one" button:**
Sets the selected carousel as the "primary" for download and publishing. The non-selected one is archived.

**Implementation:**

- The compare view is a client-side feature — no new API needed
- Loads two `angle_0` and `angle_1` (or two different runs) side by side
- Uses existing `SlidePngPreview` component for each side

### Files to change

- `frontend/components/pipeline/CarouselViewer.tsx` — add "Compare with…" button + comparison modal
- `frontend/components/pipeline/CarouselCompare.tsx` — new component

### Success criteria

- From the pipeline page, user can select "Compare angle 0 vs angle 1"
- Both carousels advance together when navigating slides
- Clicking "Use this one" marks it as primary for download

---

## Deferred (No Timeline)

### Publishing — Instagram + Cloudinary

Full implementation plan exists at `Docs/INSTAGRAM_PUBLISHER_PLAN.md`. Not scheduling this until the core output/edit loop (Improvements 1–5) is working reliably.

**What's needed when ready:**

1. Cloudinary account + API key (for public image hosting)
2. Meta Developer App + Instagram Basic Display API OAuth
3. `POST /api/v1/publish` backend endpoint
4. Upload images to Cloudinary → get public URLs → call Meta Graph API to create carousel post
5. `/publish` page in the frontend
6. Published post history

### Authentication + Multi-User

No auth is planned until the app has a use case beyond a single user on localhost.

**What's needed when ready:**

1. Choose auth strategy (Clerk / Supabase / custom JWT)
2. Scope all runs to a user ID
3. Role-based access (viewer / editor / admin)
4. Team collaboration (share run, comment, approve)

---

## Implementation Order

```
Phase 1 — Unblock the output ✅ COMPLETE
  Improvement 1:  Carousel ZIP download                  ✅ Done
  Improvement 7:  Flexible slide count                   ✅ Done
  Improvement 9:  Caption validation (backend)           ✅ Done
  Improvement 10: Token tracking + live pricing          ✅ Done
  Improvement 12: A/B carousel comparison                ✅ Done

Phase 2 — Enable editing + insights ✅ COMPLETE
  Improvement 2:  Progress feedback during generation    ✅ Done
  Improvement 3:  Caption + hashtag editor               ✅ Done
  Improvement 4:  Slide reorder + delete (backend)       ✅ Done (frontend drag UI pending)
  Improvement 11: /analytics page                        ✅ Done

Phase 3 — Polish (next)
  Improvement 4:  Slide reorder drag UI (FileBrowser)    ← 1–2 days
  Improvement 5:  Batch style editing                    ← 3 days
  Improvement 6:  Run search + tagging                   ← 3 days
  Improvement 8:  /settings page                         ← 4–5 days

Phase 4 — Deferred
  Publishing (Instagram + Cloudinary)
  Authentication + multi-user
```

