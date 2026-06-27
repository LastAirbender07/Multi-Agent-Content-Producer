# Studio AI — Frontend Documentation

> The browser face of the Multi-Agent Content Producer.
> Built as a premium "dark ops" studio interface: everything the pipeline can do, accessible without touching a terminal.
>
> **Last updated:** 2026-06-27
> **Status:** Living document — reflects the current production state of the frontend

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Pages & Routes](#4-pages--routes)
5. [Component Library](#5-component-library)
6. [Hooks](#6-hooks)
7. [Utilities](#7-utilities)
8. [API Client (`lib/api/`)](#8-api-client-libapi)
9. [Redux Store](#9-redux-store)
10. [Key Design Patterns](#10-key-design-patterns)
11. [Running the Stack](#11-running-the-stack)
12. [Playwright E2E Tests](#12-playwright-e2e-tests)

---

## 1. Design Philosophy

The frontend was conceived as a **production control room** — not a demo UI.
The visual language is "dark ops studio": jet-black surfaces, violet accents, heavy uppercase typography, and glass-morphism cards that feel more like instruments than web pages.

Three principles drove every decision:

1. **State survives navigation.** Running a pipeline and clicking to the News page resets nothing. Redux Toolkit is the single source of truth — no page re-fetches, no lost results.
2. **Every pipeline stage is observable.** Users see Research → Angle → Content as discrete, animated progress beats with live timers and sub-stage labels — not a single spinner.
3. **Human-in-the-loop is first-class.** Manual angle selection is a full-screen modal with emotional-hook colour coding. Editing slides is a Fabric.js canvas — in-place, not a sidebar form.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Animation | Framer Motion 12 |
| State | Redux Toolkit 2 + React-Redux 9 |
| Canvas editor | Fabric.js 7.4.0 |
| Icons | Lucide React |
| HTTP | Native `fetch` via typed `api` client |
| React | React 19 |
| Package manager | pnpm |

---

## 3. Project Structure

```
frontend/
├── app/                        ← Next.js App Router pages
│   ├── layout.tsx              ← Root layout — Providers + Sidebar wrapper
│   ├── page.tsx                ← Root redirect → /pipeline
│   ├── globals.css             ← Tailwind v4 base, dark theme tokens, custom scrollbar
│   ├── pipeline/page.tsx       ← Main E2E pipeline page (research→angles→content)
│   ├── editor/page.tsx         ← Fabric.js canvas slide editor
│   ├── analytics/page.tsx      ← Analytics dashboard
│   ├── research/page.tsx       ← Standalone research explorer
│   ├── images/page.tsx         ← Standalone image search
│   ├── news/page.tsx           ← News monitor
│   ├── chat/page.tsx           ← Direct LLM chat
│   └── blog-preview/page.tsx   ← Blog post HTML preview
├── components/
│   ├── analytics/              ← Analytics page components (see §5.1)
│   ├── editor/                 ← Canvas editor components (see §5.2)
│   ├── pipeline/               ← Pipeline page components (see §5.3)
│   ├── layout/Sidebar.tsx      ← Left nav — 7 routes, collapses to icons
│   ├── ui/                     ← Shared primitives (Modal, Skeleton, PremiumCard)
│   ├── chat/                   ← Chat message components
│   ├── images/                 ← Image search components
│   ├── news/                   ← News feed components
│   └── research/               ← Research explorer components
├── hooks/                      ← Custom React hooks (see §6)
├── utils/                      ← Pure utilities + canvas templates (see §7)
├── store/                      ← Redux store + slices (see §9)
└── lib/
    ├── api/                    ← Modular API client (see §8)
    └── api.ts                  ← Re-exports from api/ (backward compat shim)
```

---

## 4. Pages & Routes

| Route | Page | Purpose |
|---|---|---|
| `/pipeline` | Main studio | Topic → Research → Angles → Carousel, E2E |
| `/editor` | Canvas editor | Fabric.js in-place slide editing |
| `/analytics` | Analytics dashboard | Run stats, cost, quality, activity |
| `/research` | Research explorer | Standalone research with evidence browser |
| `/images` | Image search | Pexels / DDG image sourcing |
| `/news` | News monitor | Google News / NewsAPI / DDG News |
| `/chat` | LLM chat | Direct conversational access to the model |
| `/blog-preview` | Blog HTML viewer | Rendered blog post iframe viewer |

### `/pipeline` — The Studio

The main page. A single command-and-control view that runs the full pipeline stage by stage.

**Architecture:**
- All pipeline orchestration logic lives in `hooks/usePipelineOrchestration.ts`
- State is in Redux (`pipelineSlice`) — survives navigation
- Each stage is a `StageCard` with live timer, progress bar, and collapsible results
- `PipelineConfig.tsx` handles topic input, all toggles, and the run button
- `PipelineRecentRuns.tsx` shows a scrollable list of past runs with restore support

**Stage 1 — Research:**
- Live progress polling via `useResearchProgress` (`GET /research/status/{run_id}` every 2s)
- Shows `ResearchStageCard` with confidence score, sources, key findings
- LLM-only mode: shows `LlmRefinePanel` for iterative refinement before proceeding

**Stage 2 — Angles:**
- Shows `AngleStageCard` with all generated angles
- Manual mode: `AngleSelector` full-screen modal with multi-select + emotional hook colour coding
- `TokenChip` shows cost incurred

**Stage 3 — Content:**
- `ContentStageCard` with live render progress (`useContentProgress` polling `GET /content/{run_id}/render-status`)
- `CarouselViewer` — horizontal snap scroll with dot nav, per-angle selector, download + caption buttons
- `CarouselCompare` — full-viewport A/B comparison overlay with synced/independent modes
- `CaptionEditor` modal — char counter, hashtag chips, Instagram hook preview
- `BlogExportBar` — preview (iframe), markdown, HTML download buttons
- `TokenChip` at bottom of each completed stage card with tokens + ₹/$ + run total

**Orphaned run recovery:**
- `OrphanedRunCard` detects runs that completed while the page was closed
- `useRecoverRun` hook restores full pipeline state from backend

### `/editor` — Canvas Slide Editor

A Fabric.js canvas where every text and image element is live. Click to select, double-click to type, drag to move.

**Architecture:**
- `FabricCanvas.tsx` owns canvas lifecycle, event wiring, undo/redo, drop handling
- `canvasTemplates/` builds initial canvas from slide JSON (one builder per slide type)
- `RightPanel.tsx` dispatches to the correct property panel by object type
- `ContextToolbar.tsx` floats above selected object with type-specific controls
- `EditorLeftPanel.tsx` is a 3-tab panel: Files / Images / Templates
- `CanvasToolbar.tsx` is the top bar: undo / redo / save / export PNG / zoom

**Key implementation details:**
- `enableRetinaScaling: false` on Fabric canvas — prevents DPR-scaled backing store breaking chart rendering on retina displays
- `FabricObject.customProperties.push("data")` at init — makes `data.role` survive `toJSON()` / `loadFromJSON()` round-trips (undo, save, checkpoint)
- Chart.js config includes `devicePixelRatio: 1` — prevents 2× DPR scaling that caused bars to render at double width

**Slide types:** hook, content (4 layout variants), stat (with Chart.js), quote, cta, engage.

**Legacy slides** (no `canvas_template` field): shown as view-only with amber banner "This slide format is not supported for editing — regenerate the carousel to enable editing."

### `/analytics` — Dashboard

See `Docs/analytics/ANALYTICS_COMPLETE_RECORD.md` for full detail.

Two rows of 4 KPI cards + 9 chart/table sections. **Refresh button** calls `POST /api/v1/analytics/invalidate-cache` then re-fetches. `computed_at` timestamp shows data freshness.

---

## 5. Component Library

### 5.1 Analytics (`components/analytics/`)

| Component | Purpose |
|---|---|
| `KpiCard.tsx` | Metric card with icon, value, sub-label |
| `Card.tsx` | `Card` + `CardHeader` + `DistributionRow` primitives |
| `ContributionCalendar.tsx` | SVG GitHub-style heatmap, year selector, streak |
| `ResearchQualitySection.tsx` | Confidence bar list + depth stats |
| `StageSections.tsx` | Cost by Stage + Stage Performance latency table |
| `TopicSections.tsx` | Topics by Category + Quality by Topic heatmap |
| `ContentStrategySection.tsx` | Hooks + Slide Types + Image Sources (3-col grid) |
| `PublishReadinessTable.tsx` | Last 10 runs ✓/✗ grid |

### 5.2 Editor (`components/editor/`)

| Component | Purpose |
|---|---|
| `FabricCanvas.tsx` | Canvas instance, events, undo/redo, drop, zoom |
| `CanvasToolbar.tsx` | Top bar: undo/redo/save/export/zoom |
| `ContextToolbar.tsx` | Floating toolbar above selected object |
| `RightPanel.tsx` | Property panel dispatcher by object type |
| `EditorLeftPanel.tsx` | 3-tab sidebar: Files / Images / Templates |
| `FileBrowser.tsx` | Run/angle/slide navigation tree |
| `ImagesPanel.tsx` | Image library (search, upload, run images) |
| `TemplatesPanel.tsx` | Draggable component + slide type picker |
| `ChartEditorPanel.tsx` | Chart type + data editor with live preview |
| `SlidePngPreview.tsx` | Read-only PNG view with hover "Edit in canvas" |
| `MarkdownEditor.tsx` | Blog post markdown editor |
| `canvasSlideLoader.ts` | Slide JSON → Fabric objects async loader |
| `canvasDropHandlers.ts` | Image/component drop dispatcher |
| `useCanvasHistory.ts` | Undo/redo stack (JSON snapshots) |
| `useCanvasCheckpoint.ts` | Auto-checkpoint to localStorage every 30s |
| `panels/` | TextPropertyPanel, ImagePropertyPanel, BulletsPropertyPanel, CanvasPropertyPanel |
| `componentDroppers/` | Per-component builders (buttons, glassCard, glowBlob, decoRing, ...) |

### 5.3 Pipeline (`components/pipeline/`)

| Component | Purpose |
|---|---|
| `PipelineConfig.tsx` | Topic input, all toggles, run button |
| `ResearchStageCard.tsx` | Stage 1: confidence, sources, key points |
| `AngleStageCard.tsx` | Stage 2: angle list with hook colours |
| `ContentStageCard.tsx` | Stage 3: carousel + render progress |
| `AngleSelector.tsx` | Full-screen HITL modal for manual angle selection |
| `CarouselViewer.tsx` | Horizontal snap carousel + actions |
| `CarouselCompare.tsx` | A/B side-by-side comparison overlay |
| `CaptionEditor.tsx` | Caption + hashtag modal |
| `TokenChip.tsx` | Per-stage cost chip (tokens + ₹/$) |
| `PipelineRecentRuns.tsx` | Scrollable recent runs with restore |
| `OrphanedRunCard.tsx` | Recovery prompt for runs completed offline |
| `StageCard.tsx` | Generic collapsible stage container with timer |
| `LlmRefinePanel.tsx` | Feedback textarea for LLM research refinement |
| `BlogExportBar.tsx` | Blog preview + markdown/HTML download |

---

## 6. Hooks (`hooks/`)

| Hook | Purpose |
|---|---|
| `usePipelineOrchestration` | Full pipeline run waterfall (research → angles → content) |
| `useResearchProgress` | Polls research status every 2s while running |
| `useContentProgress` | Polls render status while content generating |
| `useRecoverRun` | Restores pipeline state from a completed-but-unloaded run |
| `useAngleRegeneration` | Re-runs angle generation for a given run |
| `useBlankRunCreation` | Creates a new run without research |
| `useTopicRefinement` | AI query refinement for topic input |
| `useDiscoverDrawer` | URL discovery / source attachment drawer state |
| `useExpandedSet` | Generic multi-select expand/collapse |
| `useImageLibrary` | Fetches per-run image library |
| `useImageSearch` | Pexels/DDG search with localStorage cache |
| `useImageUpload` | Dropzone + multipart upload |
| `useImageContextMenu` | Right-click menu for image panel items |
| `useSlideAI` | AI rewrite for individual slide text fields |
| `useToolbarPosition` | Canvas bounding rect → screen coords for ContextToolbar |

---

## 7. Utilities (`utils/`)

### Canvas templates (`utils/canvasTemplates/`)

Builds Fabric.js objects from slide JSON for the canvas editor.

```
index.ts            — REGISTRY (templateId → builder), inferTemplate(), buildSlideCanvas()
aurora_hook.ts      — Hook slide
aurora_content.ts   — Content slide (4 layout variants)
aurora_stat.ts      — Stat slide with Chart.js chart
aurora_quote.ts     — Quote slide
aurora_cta.ts       — CTA slide with glow + pill button
aurora_engage.ts    — Engage slide with decorative rings
chartRenderer.ts    — createChartObject() dispatcher
chartGroupBuilders/ — funnelGroup, progressGroup, bigNumberGroup, chartImageRenderer
chartConfigs/       — per-type Chart.js configs
contentLayouts/     — imgRight, textTop, imgTop, imgLeft, textOnly
shared/             — backgrounds, brand, buttons, components, overlays, text, types
```

**Lumina theme:** Same layout builders wrapped with `LUMINA` tokens via the `lw()` helper. Zero code duplication.

**Chart DPR fix:** `chartImageRenderer.ts` passes `devicePixelRatio: 1` to prevent Chart.js from scaling its canvas 2× on retina displays.

### Other utilities

| File | Purpose |
|---|---|
| `canvasTokens.ts` | Design tokens for aurora + lumina, chart palettes |
| `canvasFonts.ts` | Preloads Syne + Plus Jakarta Sans |
| `canvasTextHelpers.ts` | `estimateLines()` for Fabric textbox height |
| `fabricFilters.ts` | Fabric filter helpers (get/set/toggle) |
| `pipelinePayloads.ts` | Typed payload builders for pipeline API calls |
| `parseChartCsv.ts` | CSV → chart data for chart editor paste input |
| `timeUtils.ts` | `formatRelativeTime()` for run timestamps |
| `chartValidation.ts` | Chart data validation |

---

## 8. API Client (`lib/api/`)

Modular typed client — one file per backend domain.

```
lib/api/
  client.ts    — BASE + ASSET_BASE URL constants
  research.ts  — runResearch, llmDraftResearch, llmRefineResearch, getResearchStatus
  angles.ts    — runAngles, selectAngles, regenerateAngles
  content.ts   — runContent, getRunManifest, getSlides, editSlide, getTokenUsage,
                 getCaption, updateCaption, downloadCarouselZip, reorderSlides, deleteSlide
  editor.ts    — getCanvas, saveCanvas, getImageLibrary, uploadToLibrary,
                 deleteImage, swapSlideImage, uploadSlideImage
  analytics.ts — getSummary (→ AnalyticsSummary), invalidateCache
  tools.ts     — refineQuery, searchImages, searchNews
  assets.ts    — getRunsList, getBlogPostMd, getBlogPostHtml
  types.ts     — shared TypeScript interfaces
  index.ts     — barrel re-export as `api` object
```

---

## 9. Redux Store

```
store
├── pipeline
│   ├── topic, runId, mode, freshness, angleMode, imageSource
│   ├── maxSlides, minSlides, llmResearchMode
│   ├── stages: { research, angle, content } → StageStatus
│   ├── researchResult, angleResult, contentResult
│   └── errors: string[]
│
├── chat
│   ├── messages: Message[]
│   └── isTyping: boolean
│
└── history  (localStorage "pipeline_history")
    └── runs: PipelineRun[]  ← last 20, deduped by runId, newest first
```

`StageStatus = "idle" | "running" | "done" | "error"`

`resetPipeline` preserves `topic` and `llmResearchMode`.

---

## 10. Key Design Patterns

### Glass-morphism card
```
bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-3xl
```
Framer Motion entrance: `opacity: 0, y: 16 → opacity: 1, y: 0`.

### Violet glow focus
```tsx
<div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20
                blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
```

### Typography
- Section headers: `text-xs font-black text-zinc-500 uppercase tracking-[0.2em]`
- KPI labels: `text-[10px] font-black uppercase tracking-[0.15em]`
- KPI values: `text-4xl font-black tracking-tighter`

### Canvas `data` property serialization
`FabricObject.customProperties.push("data")` at init ensures `data.role`, `chartType`, `chartData` survive every `toJSON()` / `loadFromJSON()` cycle — undo snapshots, canvas saves, localStorage checkpoints.

### Stage live timer
`useRef`-based interval: violet pill while running (ticks 500ms), zinc chip frozen at elapsed once done, hidden when idle.

---

## 11. Running the Stack

```bash
# Backend (--reload required for hot-reload on code changes)
cd backend
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend
pnpm install && pnpm dev
```

Frontend at `http://localhost:3000` → redirects to `/pipeline`.

---

## 12. Playwright E2E Tests

```
frontend/e2e/
  llm-research-mode.spec.ts    ← 20 tests
  pipeline-normal-flow.spec.ts ← 12 tests
  pipeline-config.spec.ts      ←  8 tests
  research-page.spec.ts        ←  5 tests
  images-page.spec.ts          ←  5 tests
  news-page.spec.ts            ←  5 tests
  chat-page.spec.ts            ←  5 tests
```

**60 tests total. All backend calls mocked with `page.route()` — no live backend needed.**

```bash
cd frontend
node_modules/.bin/playwright test e2e/
node_modules/.bin/playwright test e2e/pipeline-normal-flow.spec.ts
```
