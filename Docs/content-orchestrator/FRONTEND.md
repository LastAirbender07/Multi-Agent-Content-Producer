# Studio AI — Frontend Documentation

> The browser face of the Multi-Agent Content Producer.
> Built as a premium "dark ops" studio interface: everything the pipeline can do, accessible without touching a terminal.

---

## Design Philosophy

The frontend was conceived as a **production control room** — not a demo UI.  
The visual language is "Google Antigravity": jet-black surfaces, violet accents, heavy uppercase typography, and glass-morphism cards that feel more like instruments than web pages.

Three principles drove every decision:

1. **State survives navigation.** Running a pipeline and clicking to the News page should not reset your progress. Redux Toolkit is the single source of truth — no page re-fetches, no lost results.
2. **Every pipeline stage is observable.** Users see Research → Angle → Content as discrete, animated progress beats, not a single spinner.
3. **Human-in-the-loop is first-class.** Manual angle selection is not an afterthought API call; it is a full-screen modal with emotional-hook colour coding and multi-select logic.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`) |
| Animation | Framer Motion 12 |
| State | Redux Toolkit 2 + React-Redux 9 |
| Icons | Lucide React |
| HTTP | Native `fetch` via typed `api` client |
| React | React 19 |
| Package manager | pnpm |

---

## Project Structure

```
frontend/
├── app/                        ← Next.js App Router pages
│   ├── layout.tsx              ← Root layout — Providers + Sidebar wrapper
│   ├── page.tsx                ← Root redirect → /pipeline
│   ├── globals.css             ← Tailwind v4 base, dark theme tokens, custom scrollbar
│   ├── pipeline/page.tsx       ← Main E2E pipeline page
│   ├── research/page.tsx       ← Standalone research explorer
│   ├── images/page.tsx         ← Standalone image search
│   ├── news/page.tsx           ← Standalone news monitor
│   └── chat/page.tsx           ← Direct LLM chat interface
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx         ← Left nav — 5 routes, collapses to icons on small screens
│   ├── pipeline/
│   │   ├── PipelineConfig.tsx  ← Topic input + all flags + pipeline orchestration logic
│   │   ├── PipelineProgress.tsx← Research/Angle/Content stage indicators + pulse animation
│   │   ├── AngleSelector.tsx   ← HITL modal — angle cards + multi-select + confirm
│   │   ├── InstagramPreview.tsx← Exact Instagram UI mockup with carousel navigation
│   │   └── ResearchSummary.tsx ← Research result card (confidence, sources, key points)
│   ├── Providers.tsx           ← Client-side Redux Provider (layout is a Server Component)
│   └── ui/
│       ├── PremiumCard.tsx     ← Framer Motion glass-morphism card primitive
│       ├── Modal.tsx           ← Backdrop blur overlay dialog (ESC to close, wide variant)
│       └── Skeleton.tsx        ← Pulsing skeleton block for loading states
├── store/
│   ├── store.ts                ← configureStore — pipeline + chat + history reducers
│   ├── hooks.ts                ← Typed useAppDispatch / useAppSelector
│   └── slices/
│       ├── pipelineSlice.ts    ← All pipeline state: stages, results, flags, run_id
│       ├── chatSlice.ts        ← Chat messages + isTyping flag
│       └── historySlice.ts     ← Last 20 runs persisted to localStorage
└── lib/
    └── api.ts                  ← Typed fetch client + all TypeScript interfaces
```

---

## Pages

### `/pipeline` — The Studio

**Idea:** A single command-and-control page that replaces the entire CLI. You type a topic, configure every flag, and watch the pipeline execute stage by stage — with a modal pause for human angle approval if you want editorial control. The output is an Instagram-accurate carousel preview with navigation, caption, and hashtags.

**What was implemented:**

The page is composed from five sub-components, each owning a slice of the experience:

#### `PipelineConfig`
Left-side configuration panel. Reads and writes the `pipeline` Redux slice.
- **Topic** textarea (supports multi-line)
- **Mode** toggle: Quick / Standard / Deep
- **Freshness** toggle: Breaking / Recent / Evergreen
- **Angle mode** toggle: Auto / Manual
- **Image source** toggle: Auto / Pexels / DDGS
- **Advanced settings** (collapsible): Max Tools, Max Sources, Max Loops, Max Slides
- **"Produce Content"** button — triggers the full orchestration sequence

The orchestration logic lives entirely in `PipelineConfig`:
```
handleRun()
  → resetPipeline()
  → setStageStatus(research, running)
  → api.runResearch() → dispatch setResearchResult
  → setStageStatus(research, done) / error

  → setStageStatus(angle, running)
  → api.runAngles() → dispatch setAngleResult
  → setStageStatus(angle, done) / error
  
  [if angleMode === manual → parent page shows AngleSelector modal]
  [if angleMode === auto → continue immediately]
  
  → setStageStatus(content, running)
  → api.runContent() → dispatch setContentResult
  → setStageStatus(content, done) / error
```

#### `PipelineProgress`
Three `StageIndicator` rows: Research, Angle, Content.
- Idle: zinc circle
- Running: violet ring with **breathing pulse** (`animate={{ scale: [1, 1.1, 1] }}`, 1.5s repeat)
- Done: emerald checkmark with `layoutId="active-glow"` shared element animation
- Error: red X

#### `AngleSelector` (HITL Modal)
Full-screen modal that pauses the pipeline for human angle selection.
- Reads `angleResult.angles` from Redux
- Each angle card shows: thesis, emotional hook (colour-coded), supporting evidence
- Emotional hook colours: Curiosity=blue, Anger=red, Hope=emerald, FOMO=amber, Fear=red, Inspiration=violet
- Multi-select with checkboxes
- "Confirm Selection" calls `api.selectAngles()` then resumes content generation

#### `ResearchSummary`
Shows after research completes:
- Combined confidence score (large number, violet)
- Source count, iteration count, best iteration
- Synthesis summary (italic, violet-tinted block)
- Up to 4 key findings in a numbered grid

#### `InstagramPreview`
Shows after content completes. Pixel-accurate Instagram UI mockup:
- Gradient avatar ring (`from-yellow-400 via-red-500 to-purple-600`)
- Slide image with `AnimatePresence` cross-fade + `motion.img` slide-in (`x: 20 → 0`)
- Navigation arrows (appear on hover via `group-hover:opacity-100`)
- Dot indicators at bottom (active dot expands `w-1 → w-3`)
- Counter badge top-right (`2 / 12`)
- Full action bar: Heart, MessageCircle, Send, Bookmark
- "Liked by alex_dev and others" social proof row
- Caption paragraph + hashtags (blue `#tag` style)
- Per-angle selector (if multiple angles were produced)
- "Produced by Content Studio AI" footer

---

### `/research` — Research Explorer

**Idea:** Let users run the research pipeline in isolation, see the raw evidence, and explore confidence scores — useful for validating a topic before committing to a full carousel run.

**What was implemented:**
- Large textarea for research topic
- Mode / freshness / budget controls (max tools, max sources, max loops)
- AI query refinement step (calls `POST /api/v1/tools/query-refine`) — shows refined topic + entity chips before starting
- Running: multi-row skeleton animation
- Results panel:
  - Status banner: confidence %, pass/fail, combined score breakdown
  - Evaluation bars (LLM score, source score)
  - Synthesis markdown block with summary + key points
  - Expandable evidence cards with source type badges:
    - `news` → blue
    - `web_search` → violet  
    - `crawl` → amber
  - Show all / collapse toggle

---

### `/images` — Visual Intelligence

**Idea:** Search Pexels and DuckDuckGo Images with AI-refined queries. Useful for sourcing carousel images manually before a run, or just exploring what's available for a topic.

**What was implemented:**
- Source toggle: Pexels / DuckDuckGo
- Result limit input (1–50)
- Pill search bar with violet glow on focus
- AI query refinement inline (shows refined topic + entity chips after search)
- Loading: 10-image skeleton grid
- Results: responsive masonry-style grid (2 → 3 → 4 → 5 columns)
- Per-image card:
  - Hover: lifts up (`y: -8, scale: 1.02`) + overlay fades in with photographer name and external link
  - Pexels: links to Pexels photo page
  - DDGS: links to original web source

---

### `/news` — Signal Monitor

**Idea:** Cross-reference breaking and trending news across multiple APIs, with AI query refinement. Monitor competitors, markets, or topic beats without running a full pipeline.

**What was implemented:**
- Source toggle: Google News RSS / NewsAPI / DuckDuckGo News
- Time filter pills: 1D / 3D / 1W / 1M
- Large pill search bar (same pattern as Images page)
- Loading: 3 full-height skeleton cards
- Results: vertical list of article cards, each with:
  - Optional hero image (left side on desktop)
  - Source name badge + publish date
  - External link button (`ArrowUpRight`)
  - Title (hover: violet transition)
  - Description (180-char truncated, "Read Brief" / "Collapse" toggle)
  - Author row with icon

---

### `/chat` — LLM Interface

**Idea:** Direct conversational access to the LLM powering the pipeline — for brainstorming angles, refining prompts, asking follow-up questions about research results, or general research assistance.

**What was implemented:**
- Redux-managed message history (`chatSlice`) — messages persist across page navigation
- System persona presets (pills): Default / Content Strategist / Research Analyst / Copywriter — each injects a different system prompt
- Empty state: 4 starter prompt chips for immediate engagement
- Message rendering: user messages right-aligned (violet), AI messages left-aligned (zinc card)
- `AnimatePresence` fade-in for each new message
- Framer Motion typing indicator: three bouncing dots (`y: [0, -8, 0]`, staggered)
- Auto-resize textarea (grows with content)
- Clear chat button (Trash icon)
- Send on Enter (Shift+Enter for new line)

---

## Redux Store

```
store
├── pipeline          ← pipelineSlice
│   ├── topic: string
│   ├── mode: "quick" | "standard" | "deep"
│   ├── freshness: "breaking" | "recent" | "evergreen"
│   ├── angleMode: "auto" | "manual"
│   ├── imageSource: "auto" | "pexels" | "ddgs"
│   ├── stages: { research, angle, content } → StageStatus
│   ├── researchResult: ResearchResponse | null
│   ├── angleResult: AngleResponse | null
│   ├── contentResult: ContentResponse | null
│   ├── errors: string[]
│   └── runId: string | null
│
├── chat              ← chatSlice
│   ├── messages: Message[]   ← { role, content, timestamp }
│   └── isTyping: boolean
│
└── history           ← historySlice (localStorage persisted)
    └── runs: PipelineRun[]   ← last 20 completed runs
        ├── runId, topic, timestamp
        ├── researchResult, angleResult, contentResult
```

`StageStatus = "idle" | "running" | "done" | "error"`

The `historySlice` loads from `localStorage` on init and saves to `pipeline_history` on every `addRun` dispatch. Deduplicates by `runId`, keeps 20 entries max, newest first.

---

## API Client (`lib/api.ts`)

All backend calls go through a single typed `api` object. The base URL is `http://localhost:8000/api/v1`.

```typescript
api.refineQuery(query)                → POST /tools/query-refine
api.searchImages({ query, source, max_results })  → POST /tools/images
api.searchNews({ query, source, when, max_results }) → POST /tools/news
api.runResearch(body)                 → POST /research/run
api.runAngles(body)                   → POST /angles/run
api.selectAngles({ run_id, selected_indices }) → POST /angles/{run_id}/select
api.runContent(body)                  → POST /content/run
api.chat({ messages, system })        → POST /chat/
```

All TypeScript interfaces mirror the backend Pydantic models exactly. `ContentResponse` includes `captions: string[]` and `hashtags_per_angle: string[][]` for the Instagram preview.

---

## Backend Changes Required by the Frontend

The frontend required three additions to the backend:

### 1. CORS (`backend/main.py`)
```python
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"], allow_headers=["*"]
)
```

### 2. Static File Serving (`backend/main.py`)
```python
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
```
Frontend constructs slide image URLs as `http://localhost:8000/outputs/<run_id>/content/angle_N/png/slide_NN.png`.

### 3. Two New API Routers
- **`apps/api/v1/tools.py`** — `POST /tools/query-refine`, `POST /tools/images`, `POST /tools/news`
- **`apps/api/v1/chat.py`** — `POST /chat/` (wraps `get_langchain_llm()` with full message history)

### 4. Extended Content Contract (`core/orchestration/contracts.py`)
```python
class ContentResponse(BaseModel):
    # ... existing fields ...
    captions: list[str] = Field(default_factory=list)
    hashtags_per_angle: list[list[str]] = Field(default_factory=list)
```
`ContentOrchestrator` captures `caption` and `hashtags` from each per-angle result state and populates these fields.

---

## Running the Full Stack

### 1. Start the backend API

```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Backend serves at `http://localhost:8000`.  
Swagger docs at `http://localhost:8000/docs`.

### 2. Start the frontend dev server

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend serves at `http://localhost:3000`.

### 3. Open the Studio

Navigate to `http://localhost:3000` — redirects automatically to the Pipeline page.

---

## Page Routes Quick Reference

| Route | Page | Icon |
|---|---|---|
| `/pipeline` | Main E2E studio — topic to carousel | Zap |
| `/research` | Standalone research explorer | FlaskConical |
| `/images` | Image search (Pexels / DDGS) | Image |
| `/news` | News monitor (Google / NewsAPI / DDGS) | Newspaper |
| `/chat` | Direct LLM chat | MessageSquare |

---

## Key Design Patterns

### Glass-morphism Card Primitive
All cards in the UI use `PremiumCard`, which wraps content in:
```
bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-3xl
```
With a Framer Motion entrance: `opacity: 0, y: 20` → `opacity: 1, y: 0`.

### Violet Glow Focus Pattern
All search bars use the same focus effect:
```tsx
<div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20
                blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
```

### Typography System
- Section headers: `text-xs font-black text-zinc-500 uppercase tracking-[0.2em]`
- Badges/labels: `text-[9px] font-black uppercase tracking-widest`
- Body: `text-sm font-medium`
- Display: `text-3xl font-black tracking-tighter`

### Loading States
Each page has its own loading pattern:
- Pipeline: per-stage `StageIndicator` with breathing pulse
- Research: full-width multi-row skeleton
- Images: aspect-square skeleton grid
- News: 3 tall skeleton cards
- Chat: bouncing-dot typing indicator

### Stage Glow Transition
The active running stage in `PipelineProgress` uses `layoutId="active-glow"` so the violet glow element animates smoothly from Research to Angle to Content as each stage completes — a shared element transition that communicates sequential progress without any explicit JS orchestration.
