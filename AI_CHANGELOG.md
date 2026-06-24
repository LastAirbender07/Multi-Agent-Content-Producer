# AI Development Changelog

**Purpose:** Track architectural decisions for quick context restoration in new sessions.

**Format:** Stack-based (newest first), concise summaries only.

---

## 2026-06-24 — Sessions 41–50: Major Frontend Refactor (Rounds 1–3) + E2E Validation

### What Changed

Three consecutive refactor rounds restructured the entire frontend codebase. Focus shifted from feature delivery to code maintenance, testability, and correctness.

---

### Round 1 — File Splitting (lib/api + shared.ts + RightPanel)

**Problem:** `lib/api.ts` (499 lines, 23 endpoints, 52 types in one flat namespace), `shared.ts` (673 lines, 12 component factories), `RightPanel.tsx` (271 lines, filter helpers duplicated).

**Decision:** Split by semantic domain, not file size. Re-export from `index.ts` so zero call-sites change.

```
lib/api.ts → lib/api/ (client, research, angles, content, editor, assets, tools, types)
shared.ts  → shared/  (buttons, brand, backgrounds, overlays, components, text, types)
RightPanel → panels/  (TextPropertyPanel, ImagePropertyPanel, CanvasPropertyPanel, Row)
utils/fabricFilters.ts — extracted from RightPanel, shared with ContextToolbar
```

**Why barrel re-exports:** 42 files import `@/lib/api`. Splitting without re-exports would break all 42. With `lib/api/index.ts` re-exporting everything, zero callers change.

---

### Round 2 — Component Extractions + Inline Simplifications

**Files extracted:** `RunRow.tsx` (140 lines from FileBrowser), `ImageThumb.tsx`, `SectionHeader.tsx`, `AiPanel.tsx`, `PipelineRecentRuns.tsx`

**Hooks created:** `useExpandedSet<T>` (replaces identical Set toggle pattern in both FileBrowser and pipeline page), `useToolbarPosition`, `timeUtils.ts`

**Inline fixes:**
- `pipeline/page.tsx` — 3× duplicate `useEffect` for stage auto-expand → 1 effect with `STAGE_KEYS.forEach`
- `editor/page.tsx` — `editMode: Record<string, boolean>` (accumulating per-slide history) → `useState(false)` that resets on slide change
- `research/page.tsx` — `useState(6)` × 3 for budget constants that never update → plain `const`
- `pipeline/page.tsx` — raw `fetch()` with hardcoded URL → `api.getResearchStatus()` via api module

---

### Round 3 — Logic Decoupling + Correctness Bugs

**Context:** Previous rounds fixed file size. Round 3 found bugs and wrong coupling regardless of size.

**4 correctness bugs fixed in FabricCanvas.tsx:**

| Bug | Line | Fix |
|---|---|---|
| View-only race condition | 241–265 | `c.selection = false` set immediately when `viewOnly` determined, before loadInitial async gap |
| Commit before async mutation (drop handler) | 370 | `commit()` moved to AFTER `FabricImage.fromURL()` succeeds |
| Commit before async mutation (applyImage) | 478 | Same fix — was missing from original plan |
| `handleRestoreYes` missing `onCanvasChanged()` | 337 | Added — RightPanel wasn't re-rendering after checkpoint restore |

**FabricCanvas.tsx decoupled: 575 → 371 lines**

Key insight: previous reviews said "don't extract hooks — canvasRef has 13 couplings." This was wrong. `React.MutableRefObject<T>` is stable across renders by design. Passing refs to hooks is standard React. `useCanvasHistory(canvasRef, onUndoRedoStateChange)` unlocked all other extractions.

```
FabricCanvas.tsx (371 lines) — orchestration only
useCanvasHistory.ts  (49 lines) — undo/redo state machine
useCanvasCheckpoint.ts (19 lines) — 30s localStorage auto-save
canvasDropHandlers.ts (78 lines) — pure addImageToCanvas, addComponentToCanvas
canvasSlideLoader.ts (139 lines) — loadSlide + loadInitial via SlideLoaderContext
```

**Other logic decoupling:**
- `useDiscoverDrawer` extracted from PipelineConfig (4 useState + 3 async functions → 1 hook call)
- `buildSeededEvidence()` extracted from `usePipelineOrchestration` as pure function
- `useBlankRunCreation` hook replaces `api.createBlankRun` duplicated in 3 places
- `onUndoRedoStateChange` stabilised in `editor/page.tsx` with empty deps `useCallback`
- `pipelineSlice.loadRun` now restores `config` (mode/freshness/angleMode); `PipelineRun` type gains `config?` field
- `resetPipeline` reducer documented: preserves config, clears run results

**3 proposals rejected after architect review:**
- useMemo on FabricCanvas API ref — `useMemo` not imported; real fix is stable parent props
- REGISTRY generation (`Object.fromEntries`) — loses TypeScript key verification at compile time
- `loadSlide`/`loadInitial` extraction via hooks — fixed instead via `SlideLoaderContext` interface

---

### GAN Multi-Run Validation System

**Built:** `scripts/gan_multi.js` — catalog-driven, tests up to 10 samples per template type across all 13 Aurora template variants.

**GAN Catalog:** `scripts/GAN_CATALOG.json` — 106 entries, aurora-* and lumina-* keys. 3 Lumina runs (16d6ff62, 9d73b8f6, f3c6d794) correctly reclassified after being misidentified as Aurora.

**Scoring:** Content-zone diff (bottom 55% of canvas) + full diff. Bands: <5% EXCELLENT, <15% GREAT, <25% GOOD, <35% FAIR, >35% BROKEN.

**Final Aurora scores (content-zone):**
- stat::line 1.6%, stat::column 1.9%, stat 2.8%, stat::bar 4.3% — EXCELLENT
- engage 4.7%, cta 4.8%, stat::donut 5.3%, stat::funnel 5.8% — EXCELLENT/GREAT
- content-text 6.4%, content-0 7.3%, quote 6.1% — GREAT
- hook 22% — image blur engine noise only (HTML CSS blur ≠ Canvas 2D blur, layout correct)

---

### Canvas Template Additions

**Content layout-3 added:** Image LEFT / Text RIGHT — mirror of layout-0. Registered in REGISTRY. Backend `_layout_variant_for_image()` updated to cycle 1→2→3 for landscape images.

**Button component library expanded:** 6 named styles in `createPillButton()`:
- `gradient` — filled aurora gradient (CTA)
- `ghost` — transparent + white border + white text (Engage bottom)
- `frosted-glow` — translucent white + bright border + glow shadow (Engage top pill)
- `solid-white` — white pill + gradient text
- `dark-pill` — dark cutout + white border (on gradient bg)
- `dark-gradient` — dark fill + lighter gradient text (on gradient bg)

**Eyebrow pill redesigned:** B3 frosted-glow style — white fill + shimmer + white glow border.

**Engage slide:** Top pill = `createEyebrowPill` (frosted-glow). Bottom button = `createPillButton(ghost)`.

---

### Known Issues Documented

`Docs/editor/CANVAS_ISSUES.md` — 5 issues tracked:
- A: Layout-3 never assigned by backend pipeline (1-line fix applied)
- B+E: Legacy runs (`canvas_template: null`) → view-only mode implemented
- C: Groups not individually editable → Ungroup button added to ContextToolbar
- D: Chart `onApply` not wired → `commit` exposed in `FabricCanvasAPI`, `handleChartApply` fixed
- E: Legacy null canvas_template count — addressed by view-only guard

---

### Backend Fixes (Sessions 41–50)

- `research.py` — orchestrator calls wrapped in try/except with proper HTTP 500
- `content.py` — `GET /{run_id}/slides/{angle_index}` returns 404 if angle doesn't exist
- `chat.py` — error response now sets `reply=f"Sorry..."` instead of empty string
- `pipeline.py` — `mode`/`freshness`/`angle_mode` use `Literal` types (was plain `str`)
- `schemas.py` — `when` param uses `Literal["1d","3d","7d","1w","1m"]`, `slide_overrides: Dict[str, str]`
- `pipeline/page.tsx` — research status polling uses `api.getResearchStatus()` (was raw fetch)
- `lib/api.ts` — all `fetch()` calls use 30s `AbortController` timeout via `fetchWithTimeout`

---

### E2E Test Suite Created

**File:** `e2e/full-validation.spec.ts` — 47 tests, 12 sections, 3.7 minutes runtime.

**Coverage:**
- All 6 routes load correctly (pipeline, research, images, news, chat, editor)
- Dark theme verified (`rgb(0,0,0)` background, not white)
- No `NaN`, `undefined`, raw HTML visible to users
- Canvas renders real slide (930KB PNG confirmed)
- View-only banner confirmed on legacy run `b9ad0ca9`
- FabricCanvas decoupling confirmed (useCanvasHistory, canvasSlideLoader working)
- RightPanel dispatch verified (CanvasPropertyPanel shows correctly)
- Templates panel shows all 9 slide types
- No horizontal scroll on any page
- 20 screenshots captured in `test-results/screenshots/`

**Result: 47/47 passed.**

---

## 2026-06-19 — Session 40: GAN-Style Template Validation + Visual Fixes

**Decision:** Introduced adversarial iteration methodology (GAN-style) to validate Fabric.js canvas templates against Jinja2/Playwright reference PNGs, then fixed all identified bugs over 7 iterations.

---

**Method: GAN-Style Adversarial Testing**

Standard software testing checks "does it run." This method checks "does it look right" — the hardest thing to test in a visual editor.

```
Loop:
  Generator  → Playwright renders all 12 slides via browser editor
  Discriminator → pixelmatch computes per-pixel diff vs reference PNGs
  Signal     → diff % per slide + composite images (ref | generated | diff)
  Fix        → worst-scoring templates patched
  Repeat     → until 0 POOR slides
```

Tooling: `scripts/gan_iterate.js` — renders, compares, saves `report.json` + composite images per iteration.

**Why this works:** The "discriminator" (pixel comparison) is objective and fast. Each iteration takes ~3 minutes for all 12 slides. The composite images let you visually inspect exactly which pixels differ, making root cause identification instant.

---

**7 Iterations — 52.6% Improvement**

| Iter | Avg Diff | POOR | Key Fix |
|---|---|---|---|
| 1 | 22.1% | 3 | Baseline |
| 2 | 20.6% | 3 | Image panel sizing rewrite |
| 3 | 17.1% | 3 | `absolutePositioned:true` on Fabric clipPath |
| 4 | 13.7% | 2 | Correct layout variants (content-1, content-2) from HTML flex-direction check |
| 5 | 12.7% | 1 | CSS 135deg gradient direction (top-right→bottom-left, not top-left→bottom-right) |
| 6 | 11.3% | 1 | Visual polish pass |
| **7** | **10.5%** | **0** | Stat label dynamic width, layout-2 top-align |

**Final: 10/12 GOOD, 2/12 FAIR, 0/12 POOR.** The two FAIR slides are image crop mismatches — same photo, same layout, but CSS `object-fit:cover` and Fabric's clipPath crop to different pixel boundaries.

---

**Root Causes Found**

| Bug | Discovery | Fix |
|---|---|---|
| Image panel tiny thumbnail | Iter 1 visual | `loadPanelImage()` with cover-scale. Old code set `width/height` on `FabricImage` which resizes bounding box but not visual output |
| Image not clipped to panel | Iter 2 | `absolutePositioned:true` on clipPath rect — Fabric v7 interprets clipPath in canvas space not local space |
| Wrong layout variants | Iter 3 | Checked rendered HTML `flex-direction` values to identify which variant each slide used; patched `canvas_template` into slides.json |
| Engage gradient flipped | Iter 4 | CSS `linear-gradient(135deg)` = top-right→bottom-left. Fabric gradient used `cos(135°)*h` which computed the wrong vector |
| Stat label overlaps number | Iter 6 | Dynamic stat_value width: `min(660, charCount * 67px)` instead of fixed 520px |
| Layout-2 missing bullets | Iter 6 | Accidentally omitted bullet loop in layout-2 block (content with top-image) |
| Line chart no area fill | Iter 6 | `fill:true` + `backgroundColor: primary+'44'` in Chart.js config to match reference |

---

**Visual Improvements Applied**

All from user visual review of iteration 5 generated slides:

- **Hook**: Swipe hint → subtle frosted-glass pill (`rgba(255,255,255,0.07)` rect + border)
- **Stat**: Removed wrongly-placed top accent line; accent divider only AFTER stat block
- **Quote**: Attribution set to `INNER_W=936px` to prevent single-word line wrapping
- **CTA**: Radial glows enlarged (rx:520/480 vs 270/215) to cover ~40% of slide for modern drama
- **CTA/Engage**: Modern gradient pill buttons with `BTN_H/2` border-radius
- **Engage**: Larger rings (720/480/240px) positioned at corners for dramatic depth
- **Line chart**: Purple area fill under curve
- **All**: Accent lines: height 5px (was 4px), 3-stop gradient with fade, rounder (rx:3)
- **Layout-2**: Top-align image crop (people photos show faces, not torsos)
- **Content**: Tighter line-height (1.45-1.5 vs 1.6-1.65)

---

**Documentation consolidated**

Three editor docs (`EDITOR_REQUIREMENTS.md`, `EDITOR_MASTER_PLAN.md`, `EDITOR_FIXES_IMPLEMENTATION.md`) merged into one: **`Docs/editor/EDITOR_COMPLETE_RECORD.md`** — includes full requirements history, architecture decisions, implementation plan, bug fix sprints, and GAN testing methodology.

**Tests: 61/61 E2E passing.**

---


**Decision:** Introduced adversarial iteration methodology (GAN-style) to validate Fabric.js canvas templates against Jinja2/Playwright reference PNGs, then fixed all identified bugs over 7 iterations.

---

**Method: GAN-Style Adversarial Testing**

Standard software testing checks "does it run." This method checks "does it look right" — the hardest thing to test in a visual editor.

```
Loop:
  Generator  → Playwright renders all 12 slides via browser editor
  Discriminator → pixelmatch computes per-pixel diff vs reference PNGs
  Signal     → diff % per slide + composite images (ref | generated | diff)
  Fix        → worst-scoring templates patched
  Repeat     → until 0 POOR slides
```

Tooling: `scripts/gan_iterate.js` — renders, compares, saves `report.json` + composite images per iteration.

**Why this works:** The "discriminator" (pixel comparison) is objective and fast. Each iteration takes ~3 minutes for all 12 slides. The composite images let you visually inspect exactly which pixels differ, making root cause identification instant.

---

**7 Iterations — 52.6% Improvement**

| Iter | Avg Diff | POOR | Key Fix |
|---|---|---|---|
| 1 | 22.1% | 3 | Baseline |
| 2 | 20.6% | 3 | Image panel sizing rewrite |
| 3 | 17.1% | 3 | `absolutePositioned:true` on Fabric clipPath |
| 4 | 13.7% | 2 | Correct layout variants (content-1, content-2) from HTML flex-direction check |
| 5 | 12.7% | 1 | CSS 135deg gradient direction (top-right→bottom-left, not top-left→bottom-right) |
| 6 | 11.3% | 1 | Visual polish pass |
| **7** | **10.5%** | **0** | Stat label dynamic width, layout-2 top-align |

**Final: 10/12 GOOD, 2/12 FAIR, 0/12 POOR.** The two FAIR slides are image crop mismatches — same photo, same layout, but CSS `object-fit:cover` and Fabric's clipPath crop to different pixel boundaries.

---

**Root Causes Found**

| Bug | Discovery | Fix |
|---|---|---|
| Image panel tiny thumbnail | Iter 1 visual | `loadPanelImage()` with cover-scale. Old code set `width/height` on `FabricImage` which resizes bounding box but not visual output |
| Image not clipped to panel | Iter 2 | `absolutePositioned:true` on clipPath rect — Fabric v7 interprets clipPath in canvas space not local space |
| Wrong layout variants | Iter 3 | Checked rendered HTML `flex-direction` values to identify which variant each slide used; patched `canvas_template` into slides.json |
| Engage gradient flipped | Iter 4 | CSS `linear-gradient(135deg)` = top-right→bottom-left. Fabric gradient used `cos(135°)*h` which computed the wrong vector |
| Stat label overlaps number | Iter 6 | Dynamic stat_value width: `min(660, charCount * 67px)` instead of fixed 520px |
| Layout-2 missing bullets | Iter 6 | Accidentally omitted bullet loop in layout-2 block (content with top-image) |
| Line chart no area fill | Iter 6 | `fill:true` + `backgroundColor: primary+'44'` in Chart.js config to match reference |

---

**Visual Improvements Applied**

All from user visual review of iteration 5 generated slides:

- **Hook**: Swipe hint → subtle frosted-glass pill (`rgba(255,255,255,0.07)` rect + border)
- **Stat**: Removed wrongly-placed top accent line; accent divider only AFTER stat block
- **Quote**: Attribution set to `INNER_W=936px` to prevent single-word line wrapping
- **CTA**: Radial glows enlarged (rx:520/480 vs 270/215) to cover ~40% of slide for modern drama
- **CTA/Engage**: Modern gradient pill buttons with `BTN_H/2` border-radius
- **Engage**: Larger rings (720/480/240px) positioned at corners for dramatic depth
- **Line chart**: Purple area fill under curve
- **All**: Accent lines: height 5px (was 4px), 3-stop gradient with fade, rounder (rx:3)
- **Layout-2**: Top-align image crop (people photos show faces, not torsos)
- **Content**: Tighter line-height (1.45-1.5 vs 1.6-1.65)

---

**Documentation consolidated**

Three editor docs (`EDITOR_REQUIREMENTS.md`, `EDITOR_MASTER_PLAN.md`, `EDITOR_FIXES_IMPLEMENTATION.md`) merged into one: **`Docs/editor/EDITOR_COMPLETE_RECORD.md`** — includes full requirements history, architecture decisions, implementation plan, bug fix sprints, and GAN testing methodology.

**Tests: 61/61 E2E passing.**

---

## 2026-06-18 - Session 39: Canvas Template System + Chart Editor — Master Plan + Phase 0-1 Implementation

**Decision:** Designed and began implementing the full canvas-first editor — faithful Fabric.js templates that match the Jinja2 PNG output, plus a 13-type user chart editor. Consolidated all prior planning docs into one authoritative plan.

---

**Planning work:**

**`Docs/editor/EDITOR_MASTER_PLAN.md`** (new — supersedes all prior editor plans)

Merged `CANVAS_TEMPLATE_SYSTEM_PLAN.md` + `CHART_EDITOR_PLAN.md` into a single document. Key decisions:

- **9 Aurora templates** (`aurora-hook`, `aurora-content-{0/1/2/text}`, `aurora-stat`, `aurora-quote`, `aurora-cta`, `aurora-engage`) + Lumina variants (thin wrappers, zero code duplication via `lw()` helper)
- **Backdrop filter**: Offscreen canvas `ctx.filter = "blur(16px)"` → crop to card region → FabricImage. Safari fallback: high-opacity solid rect. `stackblur-canvas` rejected (CPU-bound, unnecessary dependency)
- **Charts**: Chart.js offscreen → `toDataURL()` → `FabricImage` for Tier 1+2 types; `fabric.Group` for funnel/progress/number-stat (Tier 3). Single `createChartObject()` dispatcher used by both pipeline templates and user insert
- **Lumina = Aurora + LUMINA tokens** — `lw()` one-liner in registry, no separate template files
- **`originX: "left", originY: "top"` on every Fabric object** — hard rule, root cause of all prior left-clip bugs
- **`canvas_template` field added to `Slide` model** — optional, backward-compatible. Backend writes it in `carousel_generator.py` via `_canvas_template_id()` (5-line addition)
- Deleted `CANVAS_EDITOR_IMPLEMENTATION_PLAN.md`, `CANVAS_TEMPLATE_SYSTEM_PLAN.md`, `CHART_EDITOR_PLAN.md` — all superseded

**Bugs caught during plan audit (vs. original drafts):**
1. Quote slide: `slide.title` = quote text, `slide.body` = attribution (NOT swapped)
2. Quote slide has "Key Insights" section from `slide.bullets` (omitted in draft)
3. Stat slide hierarchy: `stat_value` BIG beside `stat_label`, `slide.title` = context text
4. Engage ≠ CTA (gradient bg + rings vs. dark bg + glows)
5. `carousel_generator.py` already computes `layout_variant` + `has_image` — just needs to write field

---

**Implementation — Phase 0 (Foundation, no deps):**

| File | Purpose |
|---|---|
| `frontend/types/chart.ts` | `ChartType` union (13 types), `ChartData`, `ChartSeries`, `ScatterPoint`, `BubblePoint`, `ChartObjectData` |
| `frontend/utils/canvasTokens.ts` | `AURORA` + `LUMINA` tokens, `CHART_PALETTE` (aurora/lumina), `getTokens()`, `applyOverrides()` |
| `frontend/utils/canvasFonts.ts` | `loadCanvasFonts()` singleton — loads Syne-Bold + Plus Jakarta Sans (3 weights) via FontFace API. Non-fatal: `Promise.allSettled()` so canvas works even if fonts unavailable |
| `frontend/utils/parseChartCsv.ts` | `parseChartCsv(csv)` — auto-detects single-series, multi-series, scatter, bubble from header shape |

**Implementation — Phase 1 (Chart rendering engine):**

`frontend/utils/canvasTemplates/chartRenderer.ts` — single file, used by both pipeline templates and user-created charts:

- `renderChartToDataURL(type, data, theme, w?, h?)` — renders Chart.js to offscreen `<canvas>` → PNG dataURL. Throws for Tier 3 types (funnel/progress/number-stat)
- `createChartFabricImage(...)` — wraps dataURL as `fabric.FabricImage` with `data: ChartObjectData` for re-editing
- `createFunnelGroup(...)` — Fabric Group replicating CSS funnel: gradient bars + right-aligned labels + value text inside bars
- `createProgressGroup(...)` — Fabric Group: label + track rect + gradient fill rect + percentage text per row
- `createBigNumberGroup(...)` — Fabric Group: giant Syne stat value + label + context text
- `createChartObject(...)` — single dispatcher; caller doesn't need to know which tier a chart type belongs to
- `buildConfig(type, data, palette)` — internal Chart.js config builder covering all 10 Chart.js types (bar, column, line, area, donut, radar, stacked-bar, stacked-column, comparison, scatter, bubble)

All chart palettes match the Jinja2 templates exactly: `#7C6EFA` primary, `#2DD4BF` secondary, etc.

---

**Build order (remaining):**

| Phase | Status |
|---|---|
| Phase 0: Foundation | ✅ Done |
| Phase 1: Chart renderer | ✅ Done |
| Phase 2: shared.ts (Fabric components) | 🚧 Next |
| Phase 3: Aurora templates (6 files) | Pending |
| Phase 4: Template registry + buildSlideCanvas() | Pending |
| Phase 5: Backend canvas_template field | Pending |
| Phase 6: FabricCanvas.loadInitial() wiring | Pending |
| Phase 7: Chart UI (ChartTypePicker, ChartDataTable, ChartEditorPanel) | Pending |
| Phase 8: RightPanel split + chart wiring | Pending |
| Phase 9-11: TemplatesPanel + EditorLeftPanel + user templates backend | Pending |

**TypeScript: 0 errors across all new files. 61/61 E2E tests passing (unchanged).**

---

## 2026-06-18 - Session 38: Architecture Decision — Editor Pivot from Iframe to Canvas-First (Fabric.js)

**Decision:** Retired the iframe-preview editor architecture in favour of a canvas-first redesign using Fabric.js. Requirements documented in `Docs/editor/EDITOR_REQUIREMENTS.md`.

---

### Why the iframe approach cannot grow

The editor built in Session 37 works like this:

```
Backend Jinja2 template → Playwright PNG → served as iframe → side-panel fields → save → iframe reloads
```

This hit three hard walls:

1. **In-place editing is a postMessage workaround, not real editing.** Clicking the slide sends a message to the parent; the parent focuses a sidebar textarea. The user edits in a panel, not on the slide. True in-place editing — click text on the image and type there — is impossible because the iframe is a rendered static HTML snapshot, not an interactive object graph.

2. **Auto-save races with the user's keystrokes.** A debounced save fires a backend call that re-renders the Jinja2 HTML and reloads the iframe. If the user is mid-word when the 300ms debounce fires, the iframe reload interrupts them. The only safe fix is to block saves until the user stops typing — which is exactly "explicit save button", making auto-save meaningless.

3. **No concept of canvas objects.** The slide has no element model — it is a rendered image. There is no way to drag an image box, resize a text element in-place, set transparency on a background, or apply per-element filters. These require a scene graph, not a screenshot.

---

### Chosen approach: Fabric.js canvas

**Why Fabric.js over alternatives:**

| Library | Fit | Reason |
|---|---|---|
| **Fabric.js v7.x** | ✅ Best | Native `Textbox` (cursor, selection, per-char styles); `Image.filters.*` (brightness, contrast, blur, grayscale built-in); `canvas.toJSON()` exact serialization; MIT, 31k stars, v7.4.0 May 2026 |
| react-konva | ✓ Strong alt | Good transformer/resize handles, but text editing requires manual `<textarea>` DOM overlay — replicating what Fabric already ships |
| tldraw | ✗ Skip | Designed for infinite canvas; commercial license for production |
| Polotno SDK | ✗ Skip | Vendor lock-in; paid; overkill |

Reference implementations validated: **Fabritor** (1.2k ★, MIT, Fabric.js + React — production Canva clone), **react-image-editor** (544 ★, MIT, Konva — undo/redo reference).

---

### What changes

**Retired components:**
- `SlidePreviewFrame.tsx` — iframe approach retired
- `ImageEditModal.tsx` — popup approach replaced by persistent panel
- `use-undoable` hook — replaced by Command Pattern

**New architecture:**
```
/editor
├── LeftPanel (collapsible tabs)
│   ├── FilesTab       — current FileBrowser (unchanged)
│   └── ImagesTab      — persistent asset library (search cache + uploads + run images)
├── CanvasArea
│   ├── CanvasToolbar  — undo/redo, save, zoom, export
│   ├── FabricCanvas   — main 1080×1080 editing canvas
│   └── ContextToolbar — floating toolbar above selected object (type-sensitive)
└── RightPanel (collapsible)
    ├── (text selected)  → Font, Size, Color, Alignment
    ├── (image selected) → Filters, Opacity, Crop, Set as BG
    └── (nothing)        → Slide properties (theme, background color)
```

**Undo/Redo: Command Pattern (industry standard)**

Each user action pushes a `{ label, snapshot: FabricJSON }` onto a local `commandStack[]`. Undo pops the stack and restores the snapshot. The server receives a save only when the user explicitly clicks Save (or after a long inactivity timeout — async, never blocking UI). This is the Figma/Canva/Google Docs pattern: local undo stack, async background save, UI never waits.

**Images: persistent left panel (not a modal)**

Canva, Figma, and Adobe Express all use a persistent left asset panel. Search results and uploads survive across slides. Images are dragged from the panel onto the canvas, becoming first-class `fabric.Image` objects with resize/rotate handles.

**Backend changes needed:**
- `GET /content/{run_id}/slides/{ai}/{sn}/canvas` — returns Fabric JSON (converts legacy slide JSON on first load)
- `PUT /content/{run_id}/slides/{ai}/{sn}/canvas` — stores Fabric JSON (explicit save)
- Playwright PNG export still used for download/generation — rendering pipeline untouched

**Migration path:** Pipeline still generates slides via Jinja2 → Playwright. "Open in Editor" converts the generated slide JSON to an initial Fabric canvas JSON (one-time). The user edits in Fabric. On Save → Fabric JSON stored; PNG re-exported for download. Backend rendering pipeline is unchanged.

**New dependency:** `pnpm add fabric` (v7.x, TypeScript types included)

**Status:** 🚧 Requirements captured. Implementation not yet started. Reference: `Docs/editor/EDITOR_REQUIREMENTS.md`.

---

## 2026-06-15 - Session 37: Editor Overhaul — In-Place Editing, Image Modal, Undo/Redo, Add Slide, New Blank Post

**Decision:** Implemented all 6 requirements from `Docs/editor/EDITOR_PLAN.md` on top of the existing iframe-preview editor. This is the **first iteration** — later superseded by the canvas-first pivot (Session 38).

---

**R1 — In-place editing via postMessage**

`backend/core/services/slide_editor_service.py` — `_CLICK_LISTENER_SCRIPT` constant injected before `</body>` in every `get_slide_html_preview()` call. Script attaches `click` listeners to `.hook-headline`, `.slide-title`, `.slide-body`, `.bullet-text`, `.bg-image`, `.image-card` — each fires `window.parent.postMessage({type: 'SLIDE_ELEMENT_CLICK', field: 'title'|'body'|'bullet'|'image'}, '*')`.

`SlidePreviewFrame.tsx` — added `onElementClick` prop; `useEffect` on `window.message` calls it when `e.data.type === 'SLIDE_ELEMENT_CLICK'`.

`SlideEditor.tsx` — `handleElementClick(field)` switches to Content tab + focuses the matching textarea (`id="slide-field-title"` etc.) with a 200ms yellow flash animation. Image field → opens `ImageEditModal`.

---

**R2 — Image management modal (`ImageEditModal.tsx` — new)**

Three-tab modal:
- **Search** — Pexels or Web (DDG), 12-result grid, click to stage (violet border), Apply → `api.swapSlideImage()`
- **Upload** — `react-dropzone` v15; accepts JPG/PNG/WEBP ≤ 10MB; drag-drop or click; calls new `api.uploadSlideImage()`
- **URL** — paste URL, live `<img>` thumbnail preview, "Use This Image" → `api.swapSlideImageUrl()`

New backend endpoints:
- `POST /content/{run_id}/slides/{ai}/{sn}/upload-image` — Pillow converts to JPG, saves, re-renders PNG
- `POST /content/{run_id}/slides/{ai}/{sn}/swap-image-url` — httpx downloads URL, validates content-type, same save/render pipeline

New service functions in `slide_editor_service.py`: `upload_image()`, `swap_image_url()`.
New schemas: `SwapImageUrlRequest`.

---

**R3 — Pipeline → Editor button**

`frontend/app/pipeline/page.tsx` — "Open in Editor" button added after Stage 3 carousels complete. Appears alongside `BlogExportBar`. Navigates to `/editor?run={runId}&view=slide&angle=0&slide=1`.

---

**R4 — Undo/Redo with `use-undoable`**

`SlideEditor.tsx` — replaced all individual `useState` fields with `useUndoable<SlideSnapshot>`. `resetInitialState(loaded)` called after server load so the undo stack doesn't go past the load point. `Ctrl+Z`/`Cmd+Z` → `undo()`, `Ctrl+Shift+Z`/`Cmd+Shift+Z` → `redo()`. Undo/Redo buttons in top bar. Status indicator shows "⟳ Saving…" / "● Saved".

**Note:** Auto-save (300ms debounce) was included in this iteration but later identified as a problem — see Session 38 for why this approach was superseded.

**New dependency:** `pnpm add use-undoable` (v5.0.0, zero deps)

---

**R5 — Add slide wired to UI**

`FileBrowser.tsx` — inline type picker (Hook/Content/Stat/Quote/CTA/Engage) below each expanded angle's slide list. Confirm → `api.newSlide()` → `api.editSlide()` for first render → reload manifest → navigate to new slide.

---

**R6 — New blank post (no pipeline)**

`FileBrowser.tsx` — `+ New` button in header, inline title input (Enter to confirm). Calls `api.createBlankRun(topic)`.

`backend/core/services/run_browser_service.py` — `create_blank_run(topic)`: UUID, creates directory structure, writes minimal `slides.json` + `research_result.json`, returns `{run_id, topic}`.

New endpoint: `POST /content/new-blank-run`.

---

**Backend route count:** 15 (was 12, +3: `new-blank-run`, `upload-image`, `swap-image-url`)
**New packages:** `use-undoable` (frontend), `react-dropzone` v15 (frontend)
**Tests:** 61/61 E2E passing.

---

## 2026-06-14 - Session 36: Backend Round 3 — Service Layer Extraction & Final Cleanup

**Decision:** Third comprehensive backend audit and refactor pass. Tackled the biggest remaining structural problem (`content.py` at 483 lines mixing routing + business logic + I/O) plus duplicate JWT detection, scattered helper functions, and remaining hardcoded constants.

---

**P1 — `content.py` split into proper layers (483 → 119 lines)**

| New file | Purpose | Lines |
|---|---|---|
| `core/services/slide_editor_service.py` | All slide editing logic: preview, edit, AI rewrite, swap image, create. Deduplicated Jinja2 env (cached per theme) + single `_render_and_save_png()` helper replacing two identical render+screenshot blocks | 238 |
| `core/services/run_browser_service.py` | `list_runs()` + `get_run_manifest()` | 88 |
| `core/persistence/slide_repository.py` | `read_slides()`, `write_slides()`, `read_image_assets()`, `write_image_assets()` — handles both flat list and `{"slides": [...]}` wrapper JSON formats | 76 |
| `core/persistence/run_repository.py` | `read_topic()`, `static_image_url()` | 42 |

`apps/api/v1/content.py` is now **119 lines of pure routing** — every handler is validate → delegate → respond.

---

**P2 — `infra/llm/jwt_handler.py` — deduplicated JWT detection**

`_is_jwt_error()` was defined identically in both `factory.py` and `langchain_adapter.py`. Extracted to `infra/llm/jwt_handler.py` as `is_jwt_error()`. Both files now import from there.

---

**P3 — Helper functions moved to `core/` from API layer**

| Function | From | To |
|---|---|---|
| `_fetch_category()` + `_DISCOVER_CATEGORIES` | `tools_news.py` | `core/tools/News/discovery.py` |
| `_age_label()` | `tools_news.py` | `core/utils/time_utils.py` |
| `_ddgs_multi_search()` | `tools_images.py` | `core/tools/Search/multi_search.py` |

`tools_news.py` 237 → 120 lines. `tools_images.py` 164 → 113 lines.

---

**P4 — `domain_from_url()` added to `core/utils/text_utils.py`**

Was duplicated inline in `news_api.py` and `evaluator.py`. Now centralized in `text_utils.py`. `evaluator.py` updated to import it.

---

**P5 — 5 new settings added to `configs/settings.py`**

`instagram_handle`, `blog_min_images`, `news_request_timeout_seconds`, `content_no_image_slide_types`. Callers updated in `blog_post_generator.py` and `image_fetcher.py`.

`claude.py`: `max_retries` renamed to `max_validation_retries` with an inline comment clarifying it controls structured-output validation retry loops, NOT HTTP client retries.

---

**New files created:** `core/services/__init__.py`, `core/persistence/__init__.py`, `core/utils/time_utils.py`, `core/tools/News/discovery.py`, `core/tools/Search/multi_search.py`, `infra/llm/jwt_handler.py`

**44 backend tests + 61/61 E2E — all passing.**

---



**Decision:** Implemented the final major planned feature — the `/editor` page. A Canva-inspired slide editor where users can edit text, font sizes, colors, accents, slide type, theme, chart data, swap images, and AI-rewrite any slide, plus a full Markdown blog editor with an LLM assistant sidebar. Architecture validated by research: Canva uses DOM+CSS (not canvas), and our Playwright pipeline already matches the Chart.js rendering engine (Skia), so no visual mismatch.

---

**Backend — 9 new endpoints in `content.py`**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/content/runs` | List all pipeline runs from disk with metadata |
| `GET` | `/content/{run_id}/manifest` | File tree: angles, slide counts, png paths, blog flag |
| `GET` | `/content/{run_id}/slides/{angle}` | Raw slides.json for an angle |
| `GET` | `/content/{run_id}/slides/{angle}/{n}/preview` | **Live Jinja2 render → HTMLResponse** (powers the iframe) |
| `POST` | `/content/{run_id}/slides/{angle}/{n}/edit` | Patch slide fields, re-render, re-screenshot |
| `POST` | `/content/{run_id}/slides/{angle}/{n}/ai-rewrite` | LLM rewrite with feedback |
| `POST` | `/content/{run_id}/slides/{angle}/{n}/swap-image` | Fetch + download new image, re-render |
| `POST` | `/content/{run_id}/slides/{angle}/new` | Create blank slide from template |
| `PUT` | `/content/{run_id}/blog-post` | Save updated markdown, regenerate HTML |

New schemas: `SlideEditRequest`, `SlideEditResponse`, `BlogPostUpdateRequest` in `schemas.py`.

---

**Backend — prerequisite extractions**

- `carousel_generator.py` — `render_and_screenshot_single_slide(html_path, output_path, serve_root)` extracted as public function. `screenshot_slides_node` loops calling it. Used by the edit/swap/ai-rewrite endpoints.
- `image_fetcher.py` — `fetch_and_download_single_image(query, source, dest_path)` extracted. Used by swap-image endpoint.
- `contracts.py` — `slide_overrides: dict` added to `Slide` model. Per-slide CSS variable overrides.
- `_base.html.j2` (aurora + lumina) — override injection block added: renders `--ov-{key}: {val}` CSS variables into `:root` when `slide.slide_overrides` is non-empty.

---

**Frontend — 6 new components**

| File | Purpose |
|---|---|
| `app/editor/page.tsx` | Two-panel shell; URL params drive which editor panel shows |
| `components/editor/FileBrowser.tsx` | Left panel: recent runs (Redux) + all runs (API), expand to slides + blog |
| `components/editor/SlidePreviewFrame.tsx` | `<iframe>` pointing to `/preview` endpoint; `previewKey` forces reload on save |
| `components/editor/SlideEditor.tsx` | 5-tab Canva-style editor: Content / Style / Chart / Image / AI |
| `components/editor/ChartPreview.tsx` | `react-chartjs-2` live preview (same Skia engine as Playwright — no visual mismatch) |
| `components/editor/MarkdownEditor.tsx` | `@uiw/react-md-editor` dark mode + LLM chat sidebar using existing `api.chat()` |

**New packages:** `react-chartjs-2`, `chart.js`, `@uiw/react-md-editor`

---

**Style controls implemented (per-slide, Canva-style):**
- Font size (XS/SM/MD/LG/XL) → `slide_overrides.title_font_size`
- Title color (swatches + `<input type="color">`) → `slide_overrides.title_color`
- Accent color (preset palette + custom) → `slide_overrides.accent_color`
- Slide type switcher (hook/content/stat/quote/cta/engage) → re-renders with new template
- Theme switcher (Aurora dark / Lumina light) → re-renders with correct template family

---

**`/blog-preview` → redirect**

`app/blog-preview/page.tsx` replaced with a redirect to `/editor?run={id}&view=blog`. The editor is now the canonical viewer and editor for blog posts. `BlogExportBar.tsx` "Preview" button updated to point directly to the editor.

---

**`api.ts` additions:** `getRunsList`, `getRunManifest`, `getSlides`, `editSlide`, `aiRewriteSlide`, `swapSlideImage`, `newSlide`, `updateBlogPost` + TypeScript interfaces `RunSummary`, `RunManifest`, `AngleManifest`, `SlideData`, `SlideEditRequest`, `SlideEditResponse`.

**Architecture note:** The live preview uses a server-rendered Jinja2 iframe (same rendering path as Playwright PNG generation). This means what you see in the editor is pixel-accurate to the final PNG — no canvas-based replication needed. Validated by research: this is the same approach used by Slidev, Marp, and conceptually similar to Canva's DOM-based editor with separate rasterization for export.

**TypeScript: 0 errors. E2E: 61/61 passing.**

---



**Decision:** Second comprehensive audit of the entire backend. Extracted the embedded HTML template, deduplicated `_has_cjk`, moved all remaining hardcoded constants to settings, split two large functions, extracted an LLM prompt, and made a dozen minor clarity fixes. No behaviour changes.

---

**Change 1 — HTML template extracted from `blog_post_generator.py`**

47 lines of inline HTML+CSS removed from `_markdown_to_html()`. Moved to `core/templates/blog/blog_post.html.j2`. Function now uses `jinja2.Environment` to render the template — same library already used for carousel templates. `_BLOG_TEMPLATE_DIR` path constant added at module level.

---

**Change 2 — `_has_cjk()` deduplicated**

Function was defined identically in both `slide_validator.py` and `image_fetcher.py`. Added as `has_cjk(text)` to `core/utils/text_utils.py`. Both files now import from there. Test file updated to import from new location.

---

**Change 3 — Image relevance LLM prompt extracted**

Inline f-string prompt in `apps/api/v1/tools_images.py` (used for LLM filtering of DDGS image results) moved to `core/prompts/templates/image_relevance_filter.txt`. Called via `load_prompt("image_relevance_filter", ...)`.

---

**Change 4 — 11 new settings added to `configs/settings.py`**

All remaining hardcoded values consolidated:

| Setting | Was hardcoded in |
|---|---|
| `medium_url` | `caption_generator.py` |
| `backend_base_url` | `blog_post_generator.py` |
| `cors_origins` | `main.py` |
| `image_relevance_threshold` | `tools_images.py` |
| `image_max_tags` | `tools_images.py` |
| `image_tag_stopwords` | `tools_images.py` |
| `carousel_viewport_size` | `carousel_generator.py` (×2) |
| `carousel_scale_factor` | `carousel_generator.py` |
| `carousel_chart_render_wait_ms` | `carousel_generator.py` |
| `crawl_markdown_max_chars` | `normalizer.py` |
| `crawl_snippet_max_chars` | `normalizer.py` |

---

**Change 5 — `execute_tools_node` split (executor.py)**

`execute_tools_node` was 132 lines — a single function running 4 tools in sequence with ~30 lines each. Extracted four module-level helpers:
- `_run_ddgs_text(ddgs, query)`
- `_run_ddgs_news(ddgs, query)`
- `_run_news_api(query, run_id, degraded_flags)`
- `_run_crawl4ai(plan, max_crawl_urls)`

Node becomes a 40-line coordinator using a `_TOOL_RUNNERS` dispatch dict. Commented-out stale code also removed.

---

**Change 6 — `_run_blog_post_generation()` extracted (content orchestrator)**

65-line deeply nested blog generation block extracted from `ContentOrchestrator.run()` into a module-level `_run_blog_post_generation(run_id, request, angles_processed, all_slides, all_assets) -> tuple[str, str]`. `run()` calls it as one line.

---

**Change 7 — Evaluator saturation constants**

Magic numbers `15.0` and `8.0` in `evaluator.py` replaced with named constants `_COVERAGE_SATURATION` and `_DIVERSITY_SATURATION` with comments explaining the rationale (calibrated for 3 always-on tools).

---

**Minor fixes**

- `_progress_store.py`: `_TOTAL = 9` annotated with inline comment listing all 9 node names
- `run_workflow.py`: deleted stale commented-out `post_design` stage line
- `main.py`: CORS origins from `settings.cors_origins`; startup log includes `environment` field
- `tools_images.py`: stopwords and max-tags use settings; `load_prompt` for LLM filter

**44 backend tests + 61/61 E2E — all passing.**

---

## 2026-06-14 - Session 33: Backend Round 1 — Modularisation & Cleanup

**Decision:** First comprehensive backend audit and cleanup pass. Extracted inline prompts, eliminated duplicate code, removed dead code, moved inline imports to file tops, cleaned up `langchain_adapter.py`, added constants to settings, split functions, added credibility constants.

---

**Changes made:**

- `core/utils/text_utils.py` (new) — `strip_fences()`, `format_evidence_block()`, `make_llm_url()`, `LLM_EVIDENCE_URL_PREFIX`
- `core/prompts/templates/topic_from_url.txt` (new) — extracted from `tools_news.py`
- `core/prompts/templates/angle_auto_select.txt` (new) — extracted from `auto_selector.py`
- `infra/llm/langchain_adapter.py` — deleted unused `create_langchain_llm()` (40 lines); replaced `getattr()` with direct settings access
- `llm_drafter.py` + `query_preprocessor.py` — deleted local `_strip_fences()` duplicates; now import from `text_utils`
- `synthesizer.py` + `evaluator.py` — deleted local `_build_evidence_block*()` duplicates; now use `format_evidence_block()`
- `llm_knowledge.py` + `llm_drafter.py` — inconsistent `llm://background/` vs `llm://knowledge/` URLs unified via `make_llm_url()`
- `tools_news.py` + `tools_images.py` — inline `import json` moved to file tops
- `normalizer.py` — `_CRED_WEB/NEWS/CRAWL/API` named constants replace magic `0.4/0.6/0.7/0.8`
- `research_graph.py` — 7 `_*_tracked` wrapper functions replaced by `_tracked(fn, step)` factory; `Evidence` import moved to top
- `configs/settings.py` — added `pexels_base_url`, `document_max_upload_bytes`, `document_supported_formats`, `discover_cache_ttl_seconds`, `evidence_score_max_items`, `evidence_snippet_len`, `instagram_url`
- `caption_generator.py` — Instagram URL from settings
- `tools_docs.py` — file size limit and supported formats from settings
- `tools_news.py` — cache TTL from settings; uses `load_prompt()` for topic-from-url
- `tools_images.py` — Pexels base URL from settings
- `main.py` — CORS and logging improvements
- `ddgs_search_schema.py` — `VideoResult` documented as reserved for future video search
- `_progress_store.py` — `_TOTAL` comment added
- `routing.py` — design rationale comment added

**44 backend tests + 61/61 E2E — all passing.**

---



**Decision:** Two evidence pipeline gaps filled: (1) the full article content already fetched during Discover was being discarded after topic drafting — now injected as a seeded evidence item into the research pipeline; (2) users can now attach documents (PDF, DOCX, TXT, MD, JSON, CSV, PPTX, XLSX, etc.) from the Discover drawer and have them incorporated as high-credibility evidence in the research run.

---

**Change 1 — New `source_type` values in `contracts.py`**

`Evidence.source_type` Literal extended to include `"discover"` (credibility 0.85 — real published article) and `"document"` (credibility 0.9 — user explicitly chose this source). `url` field changed from required to `default=""` to support document uploads without a URL.

---

**Change 2 — `seeded_evidence` field in `ResearchRequest`**

`backend/core/orchestration/contracts.py` — added `seeded_evidence: list[dict] = []`. The `intake_node` in `backend/core/graphs/research_graph.py` reads this field and pre-populates `state["evidence"]` before tool execution. Seeded items bypass tool selection and are always present — the normalizer's existing URL dedup means the article URL won't be re-fetched redundantly.

---

**Change 3 — `POST /tools/parse-doc` endpoint**

`backend/apps/api/v1/tools.py` — new multipart endpoint. Uses **markitdown** (Microsoft, `uv add markitdown`) to convert PDF, DOCX, PPTX, XLSX, HTML, CSV, XML → Markdown. Plain text types (txt, md, json) handled without markitdown for speed. 10MB size limit enforced. Processes in memory — no files stored on disk. Returns `ParseDocResponse { title, text, char_count, file_type }`.

---

**Change 4 — Frontend evidence wiring**

- `frontend/store/slices/pipelineSlice.ts` — added `attachedEvidence: AttachedEvidence[]`; actions `addAttachedEvidence`, `removeAttachedEvidence`, `clearAttachedEvidence`; preserved through `resetPipeline`.
- `frontend/hooks/usePipelineOrchestration.ts` — `handleRun` now builds `seeded_evidence` array from both `discoveryArticle.snippet` (if present) and all `attachedEvidence` items, then passes as `seeded_evidence` to `api.runResearch`.
- `frontend/lib/api.ts` — added `api.parseDoc(file)` (FormData, no Content-Type header), `SeedEvidence`, `ParseDocResponse`, `AttachedEvidence` interfaces; `seeded_evidence?: SeedEvidence[]` added to `ResearchRequestBody`.

---

**Change 5 — `AttachedSourcesPanel.tsx` component (new)**

`frontend/components/pipeline/AttachedSourcesPanel.tsx` — drag-and-drop + click-to-upload panel. Each file calls `api.parseDoc()` with a per-file loading spinner. On success dispatches to Redux with char count. On error shows inline error chip (auto-clears after 4s). Files shown as a list with filename, char count, type icon. `[×]` removes from Redux.

---

**Change 6 — Discover Drawer UI update**

`frontend/components/pipeline/DiscoverDrawer.tsx` — `AttachedSourcesPanel` pinned at the bottom of the drawer. Header shows a `📎 N` badge when any evidence is attached. Clicking the badge re-opens the drawer.

`frontend/components/pipeline/PipelineConfig.tsx` — when `attachedEvidence.length > 0`, a violet `📎 N` chip appears in the topic row next to the Discover button.

---

**TypeScript: 0 errors. E2E: 61/61 passing.**

---



**Decision:** Audited every non-test `.tsx`/`.ts` file for inline component definitions and large page files. Extracted all remaining inline components into dedicated files organised by feature folder. Every page is now pure layout wiring — no component or business logic defined inline.

---

**Files decomposed:**

| Page (before → after) | Extracted to |
|---|---|
| `app/images/page.tsx` 480 → 168 lines | `components/images/ImageCard.tsx` (`PexelsCard`, `DDGSCard`, `SelectOverlay`), `components/images/ImageTagChips.tsx`, `components/images/SelectionActionBar.tsx`, `hooks/useImageSearch.ts` (all search + download logic) |
| `app/research/page.tsx` 428 → 224 lines | `components/research/ConfidenceBar.tsx` (`ConfidenceBar`, `Badge`), `components/research/EvidenceCard.tsx`, `components/research/ResearchConfigPanel.tsx` (full left sidebar) |
| `app/news/page.tsx` 307 → 177 lines | `components/news/NewsCard.tsx` |
| `app/chat/page.tsx` 210 → 153 lines | `components/chat/MessageBubble.tsx` (`MessageBubble`, `TypingIndicator`) |

**New folders created:** `components/images/`, `components/research/`, `components/news/`, `components/chat/`, `hooks/`

**Pattern applied consistently across all pages:**
- Reusable UI → `components/<feature>/ComponentName.tsx`
- Business/async logic → `hooks/useFeatureName.ts`
- Page files contain only: imports, state wiring, layout JSX

**No logic changes** — pure structural refactor. TypeScript: 0 errors. E2E: 61/61 passing.

---


**Decision:** Three compounding sessions of UI work culminating in a fully decomposed, maintainable pipeline frontend with a modern command bar, enriched topic discovery, and zero dead code.

---

**Change 1 — Command bar complete redesign (PipelineConfig)**

Replaced the old cluttered horizontal toolbar with a card-based launcher:
- **Row 1:** Full-width topic textarea (transparent, no border) + Discover button right-aligned
- **Row 2:** Chip toolbar — LLM mode toggle, depth/freshness/angles `OptionChip` dropdowns, spacer, Config button, Produce Content CTA
- **Settings panel:** Expands inline inside the card (not a floating popover) — 2-column grid with Research Budget (tool calls, sources, loops, crawl URLs, claim verification) and Content Generation (angles, slide range, image source)

Key UX fixes vs old design:
- Advanced settings now expands **downward inside the card** — no longer clips above viewport
- "Source" label renamed to **"LLM Mode"** — chip shows "Web" or "LLM only" clearly
- All configs exposed: `max_angles_to_select`, `needs_claim_verification`, `min_slides`, `max_crawl_urls`, `image_source` (in advanced)
- Dropdown chips (`OptionChip`) replace old pill segment buttons — each option has a label + description sub-line
- **Produce Content button and textarea both lock** (`disabled` / `readOnly`) while topic is being drafted from an article

---

**Change 2 — Discover flow: URL-based LLM topic drafting**

Old behaviour: selecting a discover article called `/tools/query-refine` with just the headline → returned a raw keyword list with no context, dumped into the query strip automatically.

New behaviour:
1. User clicks "Use →" on a discover article card
2. Topic field immediately seeds with the article headline
3. `POST /tools/topic-from-url` fires in background — LLM drafts a **one rich research statement** (15–25 words) grounded in the article's actual content
4. Topic field updates to the drafted statement; textarea and CTA are locked during drafting
5. `✦ Topic drafted from article content` hint appears (amber `⚠` if content couldn't be read)
6. Article URL stored as `discoverUrl` in Redux — passed as `explicit_urls` to research pipeline so Crawl4AI uses it

**Why no Crawl4AI for drafting:** The news APIs (Google News / DDGS) already return full article content in `a.content` / `r.body`. The `_fetch_category` function was truncating to 200 chars — removed that truncation. The full content is now passed directly to the LLM in the `topic-from-url` endpoint. No additional web requests needed.

**New backend endpoint (`backend/apps/api/v1/tools.py`):**
- `POST /tools/topic-from-url` — accepts `{url, title, snippet}` (snippet = full article content from news API), calls LLM, returns `{topic, freshness, entities, crawl_failed}`
- `crawl_failed: bool` is always `False` in normal flow (snippet-based); used as fallback signal if LLM fails

**New backend schemas (`backend/apps/api/v1/schemas.py`):**
- `TopicFromUrlRequest`, `TopicFromUrlResponse`

**New Redux field (`pipelineSlice.ts`):**
- `discoverUrl: string | null` — cleared on `resetPipeline`, wired into `runResearch` as `explicit_urls`

---

**Change 3 — Discover drawer card redesign (`DiscoverDrawer.tsx`)**

Old: `line-clamp-2` truncated both title and snippet; clicking anywhere on the card selected it.

New layout per card:
- Full title (semibold, no truncation)
- Full snippet (no line-clamp)
- Source + age in footer
- **Two explicit action buttons:** `[↗ Read]` (opens URL in new tab, no selection) and `[Use →]` (triggers topic drafting flow)
- Entire card is NOT clickable — prevents accidental selection

Category filter chips now have full category names; loading skeleton has realistic shimmer shape.

---

**Change 4 — Full component decomposition of `PipelineConfig.tsx` (742 → 234 lines)**

All inlined helper components and logic extracted to dedicated files:

| File | Content |
|---|---|
| `components/pipeline/OptionChip.tsx` | Dropdown chip with animated popover, click-outside close |
| `components/pipeline/LlmChip.tsx` | LLM mode toggle button with mini inline switch |
| `components/pipeline/SettingsPrimitives.tsx` | `Stepper`, `SettingRow`, `ToggleRow`, `SectionHead` |
| `components/pipeline/AdvancedSettings.tsx` | Full settings expansion panel (reads/dispatches Redux) |
| `components/pipeline/RefinedQueriesStrip.tsx` | Collapsible query editor strip |
| `hooks/usePipelineOrchestration.ts` | All pipeline run logic: `handleRun`, `handleGenerateAngles`, `runContent`, `runAngleAndContent` |

`PipelineConfig.tsx` is now **pure layout wiring** — imports everything, defines nothing inline.

---

**Change 5 — Dead code removal**

Deleted two orphaned files that were never imported anywhere:
- `components/pipeline/RefinedQueriesStrip.tsx` (old stale version — shadowed by inline duplicate in PipelineConfig)
- `components/pipeline/PipelineProgress.tsx` (superseded by StageCard-based layout in pipeline/page.tsx)

---

**Change 6 — Hydration bug fix**

`RefinedQueriesStrip` had `<button>` inside `<button>` (the collapse toggle wrapping the clear X button). Fixed by converting the outer toggle to `<div role="button" tabIndex={0}>`. Browser hydration error eliminated.

---

**Redux slice additions (`pipelineSlice.ts`)**

New fields: `maxTools`, `maxSources`, `maxLoops`, `maxSlides`, `minSlides`, `maxCrawlUrls`, `maxAnglesSelect`, `needsClaimVerification`, `discoverUrl`. All preserved through `resetPipeline`. All wired into `runResearch` / `runAngle` / `runContent` API calls via `usePipelineOrchestration`.

---

**E2E test updates**

Updated selectors across `pipeline-config.spec.ts`, `llm-research-mode.spec.ts`, `pipeline-normal-flow.spec.ts` for new dropdown-chip UI:
- Pill button checks → chip label visibility checks
- Active class `bg-violet-600` → chip label text presence
- `getByRole("button", { name: /^auto$/ })` → open dropdown first, then pick option
- Advanced settings locator → `page.getByRole("button", { name: "+" })` stepper interaction

**Test result: 61/61 passing**

---

## 2026-06-08 - Session 28: Output Path Restructure + Collapsible Sidebar (Plan 8)

**Decision:** Two infrastructure changes plus Plan 8 (Collapsible Sidebar) fully implemented and validated.

---

**Change 1 — Output path restructure**

- `backend/configs/settings.py` — `research_output_dirs` and `content_output_dir` changed from `"outputs"` to `"outputs/runs"`. Image downloads remain at `outputs/downloads/images`. All pipeline runs now write to `outputs/runs/{run_id}/` — clean separation from image downloads and no UUID filter needed for the editor's file browser.
- `backend/apps/api/v1/content.py` — Updated to use `_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir` (resolves to `outputs/runs/`).
- **28 existing run folders migrated** from `outputs/{run_id}/` to `outputs/runs/{run_id}/`.
- `frontend/components/pipeline/InstagramPreview.tsx` — `slideImageUrl()` rewritten to handle both legacy paths (`/outputs/{id}/...`) and new paths (`/outputs/runs/{id}/...`). Legacy paths are transparently rewritten to the new format so existing runs still display correctly. Also fixed Tailwind v4 class names: `bg-linear-to-tr`, `w-95`, `p-0.5`.

---

**Change 2 — Tailwind v4 gradient class consistency**

- `frontend/components/layout/Sidebar.tsx` — `bg-gradient-to-br` → `bg-linear-to-br`, `bg-gradient-to-r` → `bg-linear-to-r` (canonical Tailwind v4 syntax).

---

**Change 3 — Plan 8: Collapsible Sidebar**

- `frontend/components/layout/Sidebar.tsx` — Full rewrite. Key changes:
  - `motion.aside` with `animate={{ width: expanded ? 256 : 80 }}` — smooth Framer Motion width transition (0.2s easeInOut). Avoids SSR mismatch from Tailwind class switching.
  - `useState(true)` + `useEffect` reading `localStorage("sidebar_expanded")` — preference persists across page reloads. No Redux.
  - **New header layout**: hamburger `≡` (`Menu` icon, 18px) is the LEFT-MOST element in a fixed `w-20 h-18` column — always visible in both states, always centered in the collapsed 80px column. Brand (small logo + "CONTENT / Studio AI") slides in to the right via `AnimatePresence` only when expanded.
  - `AnimatePresence` on all text labels — each `<motion.span>` fades out before the width shrinks, preventing text overflow flash.
  - Native `title` attribute on collapsed `<Link>` elements — zero-JS browser tooltip showing the label on hover.
  - `layoutId="active-nav"` gradient pill — still animates between pages in both states.
  - **Added "Editor" nav item** (`PencilRuler` icon, href `/editor`) — entry point for Plan 6R+9.
  - Removed unused `cn()` helper and `clsx`/`twMerge` imports (replaced with template literal classNames).
  - **Bug fixed in first implementation**: hamburger was in `justify-between` flex alongside the logo, causing it to be clipped 36px outside the 80px viewport when collapsed. Fixed by restructuring header so hamburger is a fixed `w-20` element always at position 0.

**Validation:** 61/61 Playwright E2E tests passing. Playwright screenshots confirm both expanded and collapsed states render correctly at 1440px, 1280px, and 1024px viewport widths.

**Status:** ✅ Plan 8 complete. Ready for Plan 7R (Pipeline Page Redesign + Smart Topic Discovery Drawer).

---

## 2026-06-07 - Session 27: Research Pipeline Fixes, LLMFactory JWT Retry, Codebase Cleanup


**Decision:** Fixed three research pipeline bugs identified from live run analysis: URLs in topics being silently discarded, query_variants being static boilerplate instead of LLM-refined, and LLM background knowledge failing due to JWT expiry on the singleton client. Added LLMFactory retry pattern to all callers. Pinned llm_knowledge evidence outside relevance ranking. Embedded evidence list in research_result.json. Deleted dead files.

---

**Change 1 — Stale file cleanup**

Deleted: `core/graphs/content_workflow.py` (empty), `tests/test_frontend.py` (superseded by `frontend/e2e/`), `tests/demo_llm.py` (exploratory script), `scripts/__init__.py` (empty dir), `build/` (pip artefact).
Kept: `tests/test_executor_crawl4ai_mcp.py` and `core/tools/mcp_servers/date_time_server.py` — user's learning references.
Updated `.gitignore`: added `backend/build/` and `frontend/test-results/`.

---

**Change 2 — URL extraction in `intake_node` (Fix 1)**

- `backend/core/graphs/research_graph.py` — `intake_node` now runs a regex `_URL_RE = re.compile(r'https?://\S+')` on `request.topic` at intake time. Any found URLs are merged into `request.explicit_urls`. The routing policy already handles `explicit_urls` → crawl4ai. Previously: URLs embedded in the topic (e.g. espncricinfo stats links) were silently discarded.

---

**Change 3 — QueryPreprocessor wired into `intake_node` (Fix 2)**

- `backend/core/graphs/research_graph.py` — `intake_node` now calls `QueryPreprocessor().process(request.topic)` when `preprocessed_queries` is empty. Sets `request.preprocessed_queries` from the result (6-10 LLM-refined, facet-targeted queries). Also updates `freshness` if the preprocessor infers a stronger signal (e.g. breaking vs recent). Non-fatal — falls through silently on error.
- Previously: `QueryPreprocessor` was only called from the legacy CLI node (`core/nodes/research.py`). The main API path (`/research/run`) always hit the static fallback.
- `backend/core/orchestration/policies/routing.py` — Removed the useless `" analysis trends"` / `" expert perspectives research"` suffix fallback. Fallback now uses a single raw topic query instead.

---

**Change 4 — LLMFactory JWT auto-retry (Fix 3)**

- `backend/infra/llm/factory.py` — Added `reset()` classmethod (sets `_instance = None`) and `get_client_with_retry(call)` (executes `call(llm)`, on JWT/401 error resets singleton and retries once). Added `_is_jwt_error(exc)` helper — detects "jwt", "expired", "401" in message.
- Root cause: `LLMFactory._instance` holds a `ClaudeLLM` with the HAI Proxy API key baked into `httpx.AsyncClient` headers at construction. When the JWT expires during a long server session, the singleton fails on every subsequent call.
- Updated callers to use `get_client_with_retry`: `llm_knowledge.py`, `query_preprocessor.py`, `angle/generator.py`, `auto_selector.py`, `content/slide_generator.py`, `content/blog_post_generator.py`.

---

**Change 5 — llm_knowledge pinned outside relevance ranking (Fix 4)**

- `backend/core/orchestrators/research/evidence_scorer.py` — `score_evidence_node` now separates `llm_knowledge` items before scoring. Only `source_type != "llm_knowledge"` items go through the LLM relevance ranker. Merge order: `llm_knowledge` items first (always reach the synthesiser), then ranked external sources. Previously: the single `llm_knowledge` item competed against 30+ news articles and was often ranked below the synthesiser's evidence window.

---

**Change 6 — Evidence list embedded in `research_result.json` (Fix 5)**

- `backend/core/orchestrators/research/orchestrator.py` — `_build_response_data()` now includes `"evidence": [e.model_dump() for e in state.get("evidence", [])]`. Previously: only `evidence_count` was saved; loading a run from history showed empty evidence (no `llm_knowledge` chip, no source cards). Evidence is still also written separately to `evidence.json`.

---

**Docs updated**

- `backend/infra/llm/README.md` — Added JWT caveat for `LLMFactory`, documented `get_client_with_retry()`, `reset()`, and recommended usage pattern.
- `Docs/content-orchestrator/FRONTEND.md` — Updated E2E table (61 tests across 7 suites), added stage timers section, added blog export buttons/preview modal, updated API client list, updated running state description.
- `Docs/RCA_Research_Pipeline_Issues.md` (new) — Full RCA document covering all 6 issues + stale file audit with delete/keep decisions.

**Tests:** 44/44 backend unit tests passing. 61/61 frontend E2E tests passing. All 5 fixes verified with dedicated assertions.

**Status:** ✅ Complete.

---

## 2026-05-30 - Session 26: Blog Post Export (Markdown + HTML + In-App Preview)


**Decision:** Auto-generate a publish-ready blog article at the end of every content run. Produces `blog_post.md` (Medium/Substack/Ghost) and `blog_post.html` (Wix/Blogger/standalone) with real images, inline citations, stat pull-quotes, and a branded footer. Accessible from the frontend via a full-screen preview modal + two download buttons.

---

**Change 1 — `markdown` dependency**

- `backend/pyproject.toml` — Added `"markdown>=3.5"`. Installed v3.10.2 via `uv sync`.

---

**Change 2 — Prompt template**

- `backend/core/prompts/templates/blog_post.txt` (NEW) — 19-variable template. LLM writes prose sections only; image injection, pull-quotes, and citations are assembled by Python code afterwards. Section markers (`## [TITLE]`, `## [FINDING: {key_point_1_short}]`, `## [ANGLE: {angle_1_heading}]`) are parsed by regex in `_assemble_markdown`. Rules enforce 1100-1600 words, no bullet lists in prose, no mentions of "carousel" or "slides".

---

**Change 3 — `blog_post_generator.py`** (NEW)

`backend/core/orchestrators/content/blog_post_generator.py`

- `BlogAssets` dataclass — carries `topic`, `synthesis`, `evidence`, `all_angle_slides`, `run_id`, `outputs_root`, `is_llm_only`.
- `_pick_section_images()` — one image per angle section; picks first non-colour asset from `image_assets.json`, uses `original_url` (CDN) if available, falls back to localhost URL, falls back to first PNG screenshot.
- `_img_url()` — CDN URL first, `localhost:8000/outputs/...` fallback.
- `_assemble_markdown()` — splices hero image after first blockquote (subtitle), section images before each `## [ANGLE:` heading, stat pull-quotes (`> **value** — label`) after each `## [FINDING:` heading, then appends either ⚠️ LLM callout (is_llm_only) or `## References` block (web evidence).
- `_build_citations_md()` — top 15 real-URL evidence items, filters `llm://` URLs.
- `_stat_pull_quotes()` — extracts stat slides with `stat_value`, capped at 4.
- `_markdown_to_html()` — uses `markdown` lib with `extra`, `tables`, `toc` extensions; wraps in full styled HTML (serif font, violet accent, responsive, tag chips). Footer: `@TheOpinionBoard`.
- `generate_blog_post(assets)` → `(markdown_str, html_str)` — calls LLM via `LLMFactory.get_client()` (no JWT risk), assembles markdown, converts to HTML, loads hashtags from `carousel.json` for tag chips.

**Bugs fixed vs original plan:**
1. `synthesis` was built only from `ContentRequest.research_summary + key_points` — missing `implications`, `contradictions`, `gaps`. Fixed: load full `research_result.json` from disk and parse complete synthesis dict.
2. HTML footer said "Content Studio AI" — corrected to `@TheOpinionBoard`.
3. `markdown` package wasn't installed — added to `pyproject.toml`.

---

**Change 4 — `ContentOrchestrator` wiring**

`backend/core/orchestrators/content/orchestrator.py` — Added `_BACKEND_ROOT` + `_OUTPUTS_ROOT` at module level (pattern from `finalizer.py`). During the angle loop, collects `all_slides_per_angle` and `all_image_assets_per_angle`. After the loop: loads `research_result.json` for full synthesis + evidence, builds `BlogAssets`, calls `generate_blog_post`, saves `.md` and `.html` via `RunOutputManager(".", ...)`. Entire block is `try/except` — blog failure never breaks the carousel response.

---

**Change 5 — `ContentResponse` schema + API endpoints**

- `backend/core/orchestration/contracts.py` — Added `blog_post_path: str = ""` and `blog_post_html_path: str = ""` to `ContentResponse`. Additive, default empty — no breaking changes to existing callers.
- `backend/apps/api/v1/content.py` — Added `GET /content/{run_id}/blog-post` (`PlainTextResponse`) and `GET /content/{run_id}/blog-post.html` (`HTMLResponse`). Both serve from `outputs/{run_id}/blog_post.*`, 404 if not found.

---

**Change 6 — Frontend**

- `frontend/lib/api.ts` — Added `getBlogPostMd(runId)` and `getBlogPostHtml(runId)` methods (raw fetch, throws on non-OK). Added `blog_post_path` + `blog_post_html_path` to `ContentResponse` interface.
- `frontend/app/pipeline/page.tsx`:
  - Added `Eye`, `XIcon` to lucide-react imports alongside existing `FileText`, `Globe`.
  - Added `showBlogPreview: boolean` state.
  - Stage 3 bottom bar (visible when `contentResult && stages.content.status === "done" && runId`): "BLOG POST" label + violet **Preview** button + zinc **Markdown** download + zinc **HTML** download.
  - Full-screen blog preview modal (`fixed inset-0 z-50`): dark header bar with topic, Eye icon, Markdown/HTML download buttons, ✕ close. Body is `<iframe src="/api/v1/content/{runId}/blog-post.html">` — loads the styled HTML directly from the backend static endpoint.

---

**Output structure (updated):**

```
outputs/<run_id>/
├── research/        ← unchanged
├── angles/          ← unchanged  
├── content/         ← unchanged (carousels)
├── blog_post.md     ← NEW: paste into Medium / Substack / Ghost
└── blog_post.html   ← NEW: paste into Wix / Blogger, or open in browser
```

**Tests:** 44 backend unit tests passing. 30 new assertions covering all generator functions, edge cases (empty evidence, LLM-only mode, img_url fallback, max 4 pull-quotes, citation filtering). 61/61 Playwright E2E tests passing.

**Status:** ✅ Complete — blog post auto-generated after every content run, viewable in-app, downloadable as .md and .html.

---

## 2026-05-30 - Session 25: Research Progress Bar, run_id Pipeline Fix, E2E Test Suite, Stage Timers


**Decision:** Four separate deliverables in one session — research progress polling, critical run_id bug fix, full E2E Playwright coverage for all 5 pages, and live stage timers in the pipeline UI.

---

**Change 1 — Research progress bar (backend + frontend)**

- `backend/core/orchestrators/research/_progress_store.py` (NEW) — Lightweight module-level `_store: dict[str, dict]` with `update(run_id, node, step)`, `get()`, `clear()`, and `NODE_LABELS` dict mapping all 11 node names to human-readable labels ("Searching news & web…", "Synthesising findings…" etc).
- `backend/core/graphs/research_graph.py` — All 9 external nodes wrapped with `_tracked` variants that call `progress.update()` before delegating. Inline nodes (`intake`, `refine`, `finalize`, `finalize_partial`) updated directly. Both finalize paths call `progress.clear()` to prevent memory leak.
- `backend/apps/api/v1/research.py` — Added `GET /research/status/{run_id}` endpoint returning `{pct, label, step, total, node}`.
- `frontend/store/slices/pipelineSlice.ts` — Added `setRunId` reducer so `pendingRunId` can be set before the research API call returns.
- `frontend/components/pipeline/PipelineConfig.tsx` — `pendingRunId = crypto.randomUUID()` generated before `resetPipeline`, dispatched immediately so the poller has the right ID from tick 1.
- `frontend/app/pipeline/page.tsx` — `researchProgress` state, 2s poll `useEffect` (clears on non-running status), thin violet progress bar + node label replacing plain spinner in Stage 1.

**Critical bug fixed during this work:** `pendingRunId` was never sent to the backend — the orchestrator generated its own UUID, so the poll always returned `{"status": "unknown"}`. Fixed by adding `run_id: Optional[str]` to `ResearchRequest` and `run_id = run_id or parsed_request.run_id or str(uuid.uuid4())` in the orchestrator. Frontend passes `run_id: pendingRunId` in the research request body. Also added `run_id?: string` to `ResearchRequestBody` in `api.ts`.

---

**Change 2 — run_id consistency verified across full pipeline**

Traced run_id through all three phases:
- **Research:** `pendingRunId` → `/research/run` → `researchRes.run_id === pendingRunId` → `setResearchResult` overwrites Redux `runId` with same value ✅
- **Angle:** `research.run_id` passed to `/angle/run` → orchestrator uses it → `angleRes.run_id === pendingRunId` ✅
- **Content (auto):** `angle.run_id` used in `/content/run` → same UUID → all outputs in `outputs/{pendingRunId}/` ✅
- **Content (manual HITL, AngleSelector):** `resumedAngle.run_id` from `/angle/{id}/select` response → correct ✅
- **LLM-only mode:** `llmDraftResearch` generates its own UUID (no progress polling needed) → Redux `runId` overwritten by `setResearchResult` → consistent within that run ✅

---

**Change 3 — Full E2E Playwright test suite (5 new spec files, 61 tests total)**

Added `test-results/` and `playwright-report/` to `frontend/.gitignore` — Playwright auto-generates `error-context.md` files in `test-results/` on failure; these are diagnostic artifacts, not code.

| File | Tests | Coverage |
|---|---|---|
| `e2e/pipeline-normal-flow.spec.ts` | 12 | Auto mode end-to-end, manual HITL modal, angle regeneration, progress bar polling, error banner |
| `e2e/pipeline-config.spec.ts` | 8 | Mode/freshness selectors, advanced settings, LLM mode persistence through reset |
| `e2e/research-page.spec.ts` | 5 | Query refinement, results display, error state |
| `e2e/images-page.spec.ts` | 5 | Pexels/DDGS search, tag chips, download |
| `e2e/news-page.spec.ts` | 5 | Source switching, time filters, results render |
| `e2e/chat-page.spec.ts` | 5 | Message send, multi-turn history in request, error reply, clear chat |
| `e2e/llm-research-mode.spec.ts` | 20 | *(existing)* LLM-only research flow |

All tests mock backend via `page.route()`. Key selector fixes discovered during test runs: research page button is "START RESEARCH" not generic text; images placeholder is "Describe the visual concept…"; news placeholder is "Search global events and signals…"; source button labels are "PEXELS"/"DUCKDUCKGO"/"DDG"; HITL modal confirm button text is "Generate Content for N Angles"; angle text in HITL modal must be scoped inside `[class*='fixed'][class*='inset']` to avoid strict mode violation with stage card backdrop.

---

**Change 4 — Live stage timers in pipeline UI**

- `frontend/app/pipeline/page.tsx`:
  - Added `useStageTimer(status: StageStatus): number | null` hook — starts a 500ms `setInterval` when `status === "running"`, freezes elapsed on done/error, resets to `null` on idle. Uses `useRef` to track start time and interval handle.
  - Added `formatElapsed(seconds: number): string` — formats as `M:SS` (e.g. `0:03`, `1:42`).
  - `StageCard` receives optional `elapsed?: number | null` prop — renders a `font-mono tabular-nums` chip left of the status label: violet `bg-violet-500/10 text-violet-400` while running, zinc `bg-zinc-800 text-zinc-400` when frozen after completion.
  - Three `useStageTimer` calls in `PipelinePage`: `researchElapsed`, `angleElapsed`, `contentElapsed` — each passed to its respective `StageCard`.

Each stage runs its own independent stopwatch. Timer appears only when the stage has been touched (non-null), so idle stages show no timer. After completion the time is permanently visible as a subtle zinc chip — user can always see "research took 0:47, angles took 0:12, content took 1:23".

**Status:** ✅ Complete — 61/61 E2E tests passing, progress bar + timers verified via Playwright screenshots.

---

## 2026-05-24 - Session 24: Branding, JWT Fix, Image Dedup, Angle Re-gen, Progress Bar

**Decision:** Applied branding to carousel slides, fixed JWT expiry auto-recovery, fixed image deduplication across carousels, added angle re-generation feature, removed slide counter from brand bar, and restored the progress bar.

---

**Change 1 — Brand identity on every carousel slide**

- `backend/configs/settings.py` — Added `brand_name: str = "TheOpinionBoard"` and `brand_logo_path: str = "assets/brand/logo.png"` settings. Override via `.env` without code changes.
- `backend/core/orchestrators/content/carousel_generator.py` — Changed `brand_name=""` and `logo_path=""` hardcoded values to read from `_settings`. Logo path prefixed with `/` so the aiohttp render server resolves it from `_BACKEND_ROOT`.
- `backend/core/templates/carousel/aurora/_base.html.j2` + `lumina/_base.html.j2` — Brand bar left side changed from plain `<span>` text to a `<div class="brand-identity">` with a circular 36×36px `<img class="brand-logo">` (guarded by `{% if logo_path %}`) followed by the handle text. Lumina progress bar track fixed from `rgba(255,255,255,0.08)` (invisible on white) to `rgba(0,0,0,0.08)`.
- `frontend/components/pipeline/InstagramPreview.tsx` — Footer text changed from "Produced by Content Studio AI" to "@TheOpinionBoard".

**Change 2 — Slide counter removed, progress bar kept**

- Both `_base.html.j2` files — Removed `N / 12` counter text (`<span class="progress">`) and its `.progress` CSS class from the brand bar. Progress fill bar retained (position + gradient unchanged). Rationale: Instagram provides its own counter; the hardcoded number causes confusion if slides are skipped during posting.

**Change 3 — JWT auto-recovery for LangChain adapter**

- `backend/infra/llm/langchain_adapter.py` — Replaced `@lru_cache()` on `get_langchain_llm()` with a resettable module-level `_cached_client`. Added `reset_langchain_llm()` and `get_langchain_llm_with_retry(call)` — on JWT/401 error, resets cache and retries once with a fresh client. `_is_jwt_error()` detects by checking `"jwt"`, `"expired"`, or `"401"` in the exception message (case-insensitive).
- `backend/apps/api/v1/chat.py` — Switched from `llm = get_langchain_llm(); await llm.ainvoke(...)` to `await get_langchain_llm_with_retry(lambda llm: llm.ainvoke(messages))`.
- `backend/apps/api/v1/tools.py` — Same switch for the DDGS image LLM relevance filter.

**Change 4 — Image deduplication across carousel slides**

- `backend/core/orchestrators/content/image_fetcher.py` — Added `used_urls: set[str]` before the slide loop. Pool size raised 15→20 for all four fetch calls (primary + fallback for both sources). Best image picked with `next((img for img in ranked if download_url not in used_urls), ranked[0])` where `download_url = img.get("src", {}).get("large2x") or img.get("url", "")` — uses the actual CDN download URL (not Pexels page URL) as the dedup key. `used_urls.add(download_url)` runs after the `if not download_url` guard so empty strings never pollute the set.

**Change 5 — Angle re-generation**

- `backend/core/orchestration/contracts.py` — Added `exclude_statements: list[str] = Field(default_factory=list)` to `AngleRequest`.
- `backend/core/prompts/templates/angle_generation.txt` — Added `{exclude_block}` variable at the end of the prompt.
- `backend/core/orchestrators/angle/generator.py` — Builds `exclude_block` string from `request.exclude_statements`: if non-empty, injects a "PREVIOUSLY GENERATED ANGLES (DO NOT REPEAT THESE)" section; empty string if none.
- `backend/apps/api/v1/angle.py` — Added `POST /angle/regenerate` endpoint that calls `_orchestrator.run(request.model_dump())` with the same `AngleRequest` body — no new schema class needed.
- `frontend/lib/api.ts` — Added `regenerateAngles` method; added `exclude_statements?: string[]` to `AngleRequestBody`.
- `frontend/app/pipeline/page.tsx` — Added `handleRegenerateAngles()` function and `regenerating` state. Added "Regenerate Angles" button below the angle list in Stage 2, visible when `stages.angle.status === "done" && stages.content.status === "idle"`. Styled as a zinc secondary button (distinct from the violet primary "Open Angle Selector"). Fixed bug: `isAnyRunning` const definition was accidentally displaced during edit — restored.

**Status:** ✅ Complete — 5 changes, verified via Playwright screenshots.

---



**Decision:** Implemented a post-generation validation pipeline (new LangGraph node) that enforces slide structure, filters irrelevant content, strengthens image/graph quality. Then diagnosed three production bugs from a live run and fixed them.

---

## 2026-05-24 - Session 22: Content Validation Pipeline + Production Bug Fixes

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

## 2026-05-22 - Session 17: Frontend Modular Redesign (Redux + Framer Motion + Premium UI)

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

## 2026-05-24 - Session 23: LLM-Only Research Mode + E2E Playwright Tests

**Decision:** Added a toggle-gated LLM-only research mode that bypasses all web tools — the LLM drafts research from its training knowledge and the user refines it iteratively before triggering angle + content generation. Built a full Playwright E2E suite (20 tests) to cover the feature. Also fixed two carry-over bugs (JWT expiry, run history limit).

---

**Bug Fix 1 — JWT expiry in `llm_knowledge_node`**

- `backend/core/orchestrators/research/llm_knowledge.py` — Removed `get_langchain_llm()` (LangChain client cached with `@lru_cache()`, bakes JWT at first call — after expiry the cached client fails silently). Switched to `LLMFactory.get_client()` which re-instantiates cleanly on server restart. Same fix pattern used by the content pipeline.

---

**Bug Fix 2 — Recent runs capped at 3/5 items**

- `frontend/app/pipeline/page.tsx` — Removed `.slice(0, 3)` / `.slice(0, 5)` from both RunCard render sites. Added `max-h-120 overflow-y-auto pr-0.5` scrollable container so all historical runs are accessible.

---

**Feature — LLM-only research mode**

**Motivation:** Web research sometimes deviates the narrative (e.g. wanted a carousel exposing a politician's past controversies → web tools returned his generic official bio instead). LLM-only mode lets the user force a specific angle from the start and iteratively sharpen the research brief before generating content.

**Data flow:**
```
Toggle ON → "Draft Research" → POST /research/llm-draft → ResearchResponse (saved to disk)
  ↓ Stage 1 shows synthesis + key_points + evidence chips
  ↓ [User types feedback] → "Refine with LLM" → POST /research/llm-refine → updated ResearchResponse
  ↓ [Repeat any number of times — run_id stays constant]
  ↓ "Satisfied → Generate Angles" → normal angle + content waterfall (unchanged)
```

**Backend — 2 new endpoints + orchestrator:**

- `backend/core/prompts/templates/llm_research_draft.txt` (NEW) — Generates 8–12 evidence items with `source_type: "llm_knowledge"` in a single JSON blob. Uses `{{n}}` (double-escaped) so `load_prompt`'s `str.format()` doesn't choke on URL sequence numbers.
- `backend/core/prompts/templates/llm_research_refine.txt` (NEW) — Refines existing synthesis + evidence based on user feedback. Same double-escape pattern.
- `backend/core/orchestrators/research/llm_drafter.py` (NEW) — `draft_research()` + `refine_research()`. Both use `LLMFactory.get_client()`. `refine_research` keeps the same `run_id` from the current result (overwrites saved files). Both save via `RunOutputManager` to `outputs/{run_id}/research/` (same schema as web research).
- `backend/apps/api/v1/research.py` — Added `LLMDraftRequest`, `LLMRefineRequest` Pydantic models and `POST /research/llm-draft`, `POST /research/llm-refine` endpoints.

**Frontend — Redux state, API layer, toggle + refine panel:**

- `frontend/store/slices/pipelineSlice.ts` — Added `llmResearchMode: boolean` to `PipelineState` interface, `initialState` (`false`), and `setLlmResearchMode` reducer + export.
  - **Bug fix:** `resetPipeline` previously reset `llmResearchMode` to `false` (from `initialState`), so after clicking "Draft Research" the LLM mode flag was gone before the result arrived — `LlmRefinePanel` and "Generate Angles" button never rendered. Fixed by preserving `llmResearchMode` through reset: `{ ...initialState, topic: state.topic, llmResearchMode: state.llmResearchMode }`.
- `frontend/lib/api.ts` — Added `llmDraftResearch()` and `llmRefineResearch()` methods.
- `frontend/components/pipeline/PipelineConfig.tsx` — Toggle (`role="switch"` + `aria-label="LLM-only mode"` + `aria-checked`), hint text, hidden Research Depth / Advanced settings in LLM mode. `handleRun` branches: LLM mode → `api.llmDraftResearch()` → dispatch result → stop (no waterfall). Added `handleGenerateAngles()` which runs the same angle+content waterfall from the saved `researchResult`. "Satisfied → Generate Angles" outlined violet button appears only when `llmResearchMode && stages.research.status === "done" && stages.angle.status === "idle"`.
- `frontend/app/pipeline/page.tsx` — Added `LlmRefinePanel` component (feedback textarea + "Refine with LLM" button, clears textarea on success). Rendered in Stage 1 card body when `llmResearchMode && stages.research.status === "done" && researchResult`.

---

**Toggle UI fix**

The pill toggle thumb was overflowing the track in ON state and looked off-centre in OFF state. Root cause: `absolute` positioned thumb with no explicit `left` + no `overflow-hidden` on the track.

Rewrote to the standard Headless UI / Tailwind UI pattern:
- Track: `inline-flex h-6 w-11 border-2 border-transparent` (24×44px; 2px padding all sides makes inner = 20×40px)
- Thumb: `inline-block h-5 w-5` (20×20px; flows naturally from left edge)
- OFF: `translate-x-0` / ON: `translate-x-5` (0 or 20px — exactly fills the 40px inner width)

---

**E2E Playwright suite — 20/20 passing**

- `frontend/playwright.config.ts` (NEW) — Chromium only, `baseURL: http://localhost:3000`, headless, workers: 1.
- `frontend/e2e/llm-research-mode.spec.ts` (NEW) — 20 tests across 5 describe blocks. All backend calls intercepted via `page.route()` — no live LLM calls needed.
  - Toggle UI (6 tests): visibility, default OFF, label switching, Research Depth hidden in LLM mode, hint text.
  - Draft Flow (4 tests): synthesis appears after draft, request body contains topic, Generate Angles button appears, not shown in normal mode.
  - Refine Panel (7 tests): panel visible after draft, button disabled when empty, enables after typing, refine call + synthesis update, request body validation, textarea clears on success, multiple refines keep same `run_id`.
  - Generate Angles Flow (2 tests): angle API called, correct `run_id` forwarded.
  - Normal pipeline (1 test): `/research/run` used when LLM mode OFF.
- Selector fixes: `goToPipeline` uses `getByRole("heading", { name: "Pipeline", level: 1 })` (avoids strict-mode violation on multiple "Pipeline" text nodes). Two tests that matched 4 `/REFINED/i` elements use `.first()`.

**Status:** ✅ Complete — 2 bugs fixed, full LLM-only research mode (backend + frontend), toggle UI corrected, 20/20 Playwright tests passing.

---

_Last updated: 2026-06-19 (Session 40)_
