# 🚀 Multi-Agent Content Producer

> **From a single topic to a publish-ready carousel — fully automated, research-grounded, and visually stunning.**

You type a topic. The system does everything else — from the terminal **or** from a browser-based production studio.

In minutes you get: deep research across the live web, multiple content angles crafted for maximum engagement, 12-slide carousels rendered as pixel-perfect 1080×1080 PNGs, captions, hashtags, and a full audit trail. No templates to fill. No copy to write. No stock photo browsing.

This is what a team of a researcher, a strategist, a copywriter, a designer, and a photo editor would produce in a day — delivered in under 10 minutes.

---

## ⚡ What It Does

### The Full Pipeline

```
Your Topic
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 1 · 🔬 RESEARCH                               │
│  Web search · News APIs · Crawl · Synthesis · Judge  │
└──────────────────────────┬──────────────────────────┘
                           │  Research confidence score
                           │  (retries automatically if < 0.60)
                           ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 2 · 🎯 ANGLE GENERATION                       │
│  5 candidate angles · Evaluated · Top 3 selected     │
└──────────────────────────┬──────────────────────────┘
                           │  Angles with emotional hooks
                           ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 3 · ✍️  CONTENT GENERATION                    │
│  12-slide carousel per angle · Captions · Hashtags   │
└──────────────────────────┬──────────────────────────┘
                           │  Images sourced per slide
                           ▼
┌─────────────────────────────────────────────────────┐
│  STAGE 4 · 🎨 RENDER                                 │
│  HTML templates · Playwright screenshot · 1080px PNG │
└──────────────────────────┬──────────────────────────┘
                           │
                           ▼
         outputs/<run_id>/content/angle_0..2/png/
         slide_01.png → slide_12.png  ✅ Done
```

### 🔬 Research Engine

The research stage isn't a single API call. It's a multi-tool pipeline with a quality gate:

- **🧠 Query Preprocessor** — Rewrites your raw topic into 6-10 targeted search queries, infers freshness (`breaking` / `recent` / `evergreen`), and strips ambiguity before any tools fire.
- **⚙️ Multi-tool execution** — Runs news APIs (NewsAPI + Google News), DuckDuckGo web search, DuckDuckGo news, and Crawl4AI deep-scraping in parallel. Tools are selected per-run based on topic freshness and mode.
- **🔗 Evidence normaliser** — Deduplicates by URL, scores each item for credibility and relevance, and merges all sources into a unified evidence bank.
- **📝 Synthesiser** — An LLM reads up to 12 evidence items and produces a structured `ResearchSynthesis` (summary, key points, contradictions, implications, gaps, confidence score).
- **🧑‍⚖️ Independent LLM Judge** — A *separate* LLM call reads the raw evidence snippets and scores the synthesis on factual grounding, topic relevance, specificity, and coverage breadth — catching hallucinations the synthesiser might introduce.
- **🔒 Combined confidence gate** — `combined = llm_judge × 0.35 + source_score × 0.65`. If below **0.60**, the loop fires again with a different query variant, accumulating new evidence on top of existing sources. Up to 2 retry loops. Every iteration is saved to disk.

### 🎯 Angle Engine

Three to five content angles are generated from the research synthesis. Each angle has:

- A **thesis statement** (1-2 sentences, the core idea)
- An **emotional hook** (Curiosity / Fear / Hope / Anger / FOMO / Inspiration)
- **Supporting evidence** from the research

The evaluator scores each angle on specificity, emotional resonance, uniqueness, and grounding. In `auto` mode the top 3 are selected automatically. In `manual` mode you pick via the API.

### ✍️ Content Engine

For each selected angle, the system generates a full 12-slide carousel:

| Slide Type  | What It Does                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------ |
| 🪝 `hook`    | 6-9 word headline that stops the scroll                                                          |
| 📖 `content` | Dense insight slide: title + body + 3-5 concrete bullet points                                   |
| 📊 `stat`    | One shocking number with a Chart.js visualisation (bar / column / donut / line / radar / funnel) |
| 💬 `quote`   | Pull-quote from research with 2-3 key takeaways                                                  |
| 👋 `engage`  | Mid-carousel follow prompt (appears around slide 5-7)                                            |
| 📣 `cta`     | Exactly 2 per carousel — one mid-deck (punchy), one closing (comprehensive)                     |

Arc is enforced: `hook → intro-content → stats → engage → early-cta → body-content → quote → final-cta`

The LLM also assigns each slide an **image source and query**:

- 🌐 `ddgs` — Real web images (news photos, specific people, events, places). Query is written journalist-style: `"Udhayanidhi Stalin Deputy CM Tamil Nadu 2024"`
- 📸 `pexels` — High-quality stock photography (abstract concepts, office, technology). Query is written stock-style: `"artificial intelligence neural network"`
- 🎨 `none` — No image (stat / cta / engage slides use colour cards)

### 🎨 Render Engine

HTML templates (Jinja2) → Playwright headless Chromium → 2160px screenshot → Pillow LANCZOS downscale to **1080×1080 PNG**.

Two visual themes:

- 🌑 **Aurora** — Dark background, high contrast. Used for: Anger, Fear, Urgency, Controversy, Surprise topics.
- ☀️ **Lumina** — Light and clean. Used for: Hope, Inspiration, Curiosity topics.

Content slides adapt their layout to the downloaded image's aspect ratio:

- 🖼️ Portrait / square image → Layout 0: left text, right portrait card
- 🏞️ Landscape image (alternating) → Layout 1: text top, image bottom / Layout 2: image top, text bottom
- 📝 No image → Full-width text-only layout (no skeleton placeholder)

---

## 📁 Output Structure

Every pipeline run produces a complete, versioned output folder:

```
outputs/<run_id>/
├── research/
│   ├── research_result.json    ← Confidence scores, iteration history, best synthesis
│   ├── evidence.json           ← All accumulated sources (grows with each retry loop)
│   └── synthesis.md            ← Best synthesis in readable markdown
├── angles/
│   └── angles.json             ← All 5 angles + selected 3 with reasoning
└── content/
    ├── angle_0/
    │   ├── slides.json         ← Full slide data (type, text, chart data, image queries)
    │   ├── carousel.json       ← Final carousel with caption + hashtags
    │   ├── image_assets.json   ← Per-slide image source, URL, local path
    │   ├── images/             ← Downloaded images (slide_01.jpg … slide_12.jpg)
    │   ├── slides/             ← Rendered HTML (slide_01.html … slide_12.html)
    │   └── png/                ← ✅ Final carousel images (slide_01.png … slide_12.png) ← PUBLISH THESE
    ├── angle_1/
    └── angle_2/
```

The `png/` folders are your deliverables. Everything else is the audit trail.

---

## 🛠️ Getting Started

### Prerequisites

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) package manager
- Node.js 20+ and [`pnpm`](https://pnpm.io/) (for the frontend)
- Playwright Chromium

```bash
# Clone and enter
git clone <repo-url>
cd Multi-Agent-Content-Producer

# ── Backend ──────────────────────────────────────────────────────────
cd backend
uv sync
uv run playwright install chromium
cp .env.example .env   # fill in your API keys

# ── Frontend ─────────────────────────────────────────────────────────
cd ../frontend
pnpm install
```

### Running the Full Stack

```bash
# Terminal 1 — Backend API
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
pnpm dev
```

Open `http://localhost:3000` for the Studio UI, or `http://localhost:8000/docs` for the raw API.

### 🔑 Environment Variables (`.env`)

```bash
# Required — LLM provider (Claude via HAI Proxy is the default)
HAI_PROXY_API_KEY=your_key_here
HAI_PROXY_URL=http://localhost:6655/anthropic
LLM_MODEL=anthropic--claude-4.5-sonnet

# Optional — additional news sources
NEWSAPI_API_KEY=your_newsapi_key       # newsapi.org — adds 100 articles/day free tier
PEXELS_API_KEY=your_pexels_key         # pexels.com — higher quality stock images

# Optional — switch LLM provider
LLM_PROVIDER=claude                    # claude | openai | gemini
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

---

## ▶️ Running the Pipeline

### The One Command You Need

```bash
uv run python -m apps.cli.run_workflow "your topic here"
```

That's it. Everything else has sensible defaults.

---

### 🏳️ All Flags and Modes

```
uv run python -m apps.cli.run_workflow <topic> [options]
```

| Flag               | Values                                | Default      | What It Does                            |
| ------------------ | ------------------------------------- | ------------ | --------------------------------------- |
| `--mode`         | `quick` `standard` `deep`       | `standard` | Controls research depth and tool budget |
| `--freshness`    | `breaking` `recent` `evergreen` | `recent`   | Signals how time-sensitive the topic is |
| `--angle-mode`   | `auto` `manual`                   | `auto`     | How angles are selected                 |
| `--image-source` | `auto` `pexels` `ddgs`          | `auto`     | Override image tool for all slides      |

---

### `--mode` — 🔍 Research Depth

Controls how many tools are used, how many query variants are generated, and how many refinement loops are allowed.

```bash
# ⚡ Quick — fast turnaround, fewer sources, 1 tool pass
# Good for: trending topics, well-covered subjects, testing
uv run python -m apps.cli.run_workflow "ChatGPT vs Gemini 2026" --mode quick

# ⚖️ Standard — default, balanced depth and speed
# Good for: most use cases
uv run python -m apps.cli.run_workflow "Rise of agentic AI in enterprise software"

# 🔬 Deep — maximum research, all tools, full retry budget
# Good for: complex topics, niche subjects, investigative content
uv run python -m apps.cli.run_workflow "How central banks are responding to AI-driven deflation" --mode deep
```

---

### `--freshness` — 🕐 Information Freshness Signal

Tells the query preprocessor and router how to prioritise sources.

```bash
# 🔴 breaking — last 48 hours only; routes to news APIs first
# Good for: breaking news, announcements, earnings, live events
uv run python -m apps.cli.run_workflow "Apple WWDC 2026 announcements" --freshness breaking

# 🟡 recent — last few months; balanced news + web search
# Good for: trends, product launches, ongoing stories (DEFAULT)
uv run python -m apps.cli.run_workflow "Tesla FSD adoption rates 2026" --freshness recent

# 🟢 evergreen — historical/structural topics; web search + deep crawl
# Good for: explainers, "how it works", timeless concepts
uv run python -m apps.cli.run_workflow "Why most startups fail in year 3" --freshness evergreen
```

---

### `--angle-mode` — 🎯 Angle Selection

```bash
# 🤖 auto — LLM picks the top 3 angles from 5 candidates (default)
# Best for: unattended runs, batch production
uv run python -m apps.cli.run_workflow "The loneliness epidemic" --angle-mode auto

# 🙋 manual — Pipeline pauses after generating angles; you select via the API
# Best for: when you want editorial control over the angle before committing
# After running, call: POST /api/v1/angles/{run_id}/select with your chosen indices
uv run python -m apps.cli.run_workflow "Why Gen Z is leaving big tech" --angle-mode manual
```

---

### `--image-source` — 🖼️ Image Tool Override

By default the LLM decides per-slide which tool to use (real photo vs stock). Override when you want consistency.

```bash
# 🧠 auto — LLM decides per slide: ddgs for real people/events, pexels for concepts (DEFAULT)
uv run python -m apps.cli.run_workflow "Sam Altman's OpenAI journey" --image-source auto

# 📸 pexels — force all slides to Pexels stock photography
# Best for: brand-safe content, abstract topics, no recognisable faces wanted
uv run python -m apps.cli.run_workflow "The future of remote work" --image-source pexels

# 🌐 ddgs — force all slides to DuckDuckGo web images
# Best for: news-heavy topics, real events, specific public figures
uv run python -m apps.cli.run_workflow "India vs Pakistan ICC World Cup 2026" --image-source ddgs
```

---

### 🔥 Common Combinations

```bash
# 📰 Breaking news carousel — fast, fresh, web images
uv run python -m apps.cli.run_workflow "RBI rate cut May 2026" \
  --mode quick --freshness breaking --image-source ddgs

# 📚 Deep evergreen explainer — thorough research, stock images, human angle review
uv run python -m apps.cli.run_workflow "Why compounding works and most people miss it" \
  --mode deep --freshness evergreen --angle-mode manual --image-source pexels

# 🗳️ Standard political/investigative topic
uv run python -m apps.cli.run_workflow "Dirty politics of DMK in Tamil Nadu" \
  --mode standard --freshness recent --image-source ddgs

# 💡 Tech product launch — quick + recent
uv run python -m apps.cli.run_workflow "SAP Joule AI agent capabilities 2026" \
  --mode quick --freshness recent
```

---

## 🖥️ Studio AI — Browser Interface

The frontend is a full production control room that exposes every pipeline capability in a sleek, dark-themed UI. No terminal required.

### Pages

| Route | Description |
|---|---|
| `/pipeline` | **Main Studio** — topic input, all flags, live stage progress, HITL angle selector, Instagram carousel preview |
| `/research` | **Research Explorer** — run research in isolation, inspect evidence, confidence scores, and synthesis |
| `/images` | **Visual Intelligence** — search Pexels and DuckDuckGo Images with AI-refined queries |
| `/news` | **Signal Monitor** — cross-reference news across Google News, NewsAPI, and DuckDuckGo with time filters |
| `/chat` | **LLM Interface** — direct conversation with the pipeline's LLM for brainstorming and query refinement |

### Frontend Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |
| State | Redux Toolkit 2 |
| Icons | Lucide React |

### Starting the Frontend

```bash
cd frontend
pnpm install
pnpm dev
# → http://localhost:3000
```

The frontend connects to the backend at `http://localhost:8000`. Start the backend first (see below).

### What the Studio Looks Like

**Pipeline Page** — Type a topic, choose depth and freshness, hit Produce. Watch Research, Angle, and Content stages light up one by one. In manual angle mode a full-screen modal pauses the run so you can pick which angles to develop. Once content is done, the Instagram carousel preview loads with swipeable slides, caption, and hashtags.

**Research Page** — Runs the research graph standalone. Shows confidence score, LLM/source score breakdown, synthesis summary, and expandable evidence cards colour-coded by source type (news/web/crawl).

**Images and News** — Standalone search tools backed by the same APIs used internally by the pipeline, with AI query refinement applied before every search.

**Chat** — System persona presets (Content Strategist, Research Analyst, Copywriter) plus a persistent message history that survives page navigation.

→ Full frontend documentation: [`Docs/content-orchestrator/FRONTEND.md`](Docs/content-orchestrator/FRONTEND.md)

---

## 🌐 REST API

Start the server:

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive docs available at: `http://localhost:8000/docs`

### Endpoints

| Method   | Endpoint                           | Description                               |
| -------- | ---------------------------------- | ----------------------------------------- |
| `GET`  | `/health`                        | ✅ Health check                            |
| `POST` | `/api/v1/research/run`           | 🔬 Run research only                       |
| `POST` | `/api/v1/angles/run`             | 🎯 Run angle generation (requires synthesis) |
| `POST` | `/api/v1/angles/{run_id}/select` | 🙋 Submit manual angle selection           |
| `POST` | `/api/v1/content/run`            | ✍️ Run content generation (requires angles) |
| `POST` | `/api/v1/pipeline/run`           | 🚀 Run full pipeline end-to-end            |
| `POST` | `/api/v1/tools/query-refine`     | 🧠 AI query preprocessing                  |
| `POST` | `/api/v1/tools/images`           | 🖼️ Image search (Pexels / DDGS)            |
| `POST` | `/api/v1/tools/news`             | 📰 News search (Google / NewsAPI / DDGS)   |
| `POST` | `/api/v1/chat/`                  | 💬 Direct LLM chat with message history    |

### Full Pipeline via API

```bash
curl -X POST http://localhost:8000/api/v1/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How SAP is betting on AI agents in 2026",
    "mode": "standard",
    "freshness": "recent",
    "angle_mode": "auto",
    "image_source": "auto"
  }'
```

### Research Only

```bash
curl -X POST http://localhost:8000/api/v1/research/run \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Agentic AI in enterprise ERP",
    "mode": "deep",
    "freshness": "recent",
    "needs_claim_verification": false
  }'
```

---

## 🔒 How the Quality Gate Works

Every research run is scored before proceeding to content:

```
📊 Source Score  = 0.5 × (sources / 8)  +  0.5 × (unique_domains / 4)
🧑‍⚖️ LLM Score     = independent judge reads raw evidence → scores factual_grounding,
                   topic_relevance, specificity, coverage_breadth → overall_score

⚡ Combined      = LLM_score × 0.35  +  source_score × 0.65

🔁 If combined < 0.60  →  retry with next query variant, accumulate more evidence
✅ If combined ≥ 0.60  →  proceed to angle generation
```

The final `research_result.json` shows the full iteration history:

```json
{
  "combined_confidence": 0.902,
  "total_iterations": 1,
  "best_iteration": 1,
  "iterations": [
    {
      "iteration": 1,
      "evaluation": { "combined_confidence": 0.902, "llm_content_score": 0.72, "source_score": 1.0 },
      "evidence_count": 22
    }
  ]
}
```

---

## 🏗️ Architecture

```
Multi-Agent-Content-Producer/
├── frontend/                   ← Next.js 16 Studio UI
│   ├── app/                    ← App Router pages (pipeline, research, images, news, chat)
│   ├── components/             ← Pipeline components + UI primitives
│   ├── store/                  ← Redux Toolkit (pipeline, chat, history slices)
│   └── lib/api.ts              ← Typed fetch client
│
└── backend/
    ├── apps/
    │   ├── api/v1/              ← FastAPI routers (research, angles, content, pipeline, tools, chat)
    │   └── cli/run_workflow.py  ← CLI entry point
    ├── core/
    │   ├── graphs/              ← LangGraph StateGraph definitions
    │   │   ├── research_graph.py
    │   │   ├── angle_graph.py
    │   │   └── content_graph.py
    │   ├── nodes/               ← Pipeline stage entry points (research, angle, content)
    │   ├── orchestrators/
    │   │   ├── research/        ← router, executor, normalizer, synthesizer, evaluator
    │   │   ├── angle/           ← generator, evaluator, auto_selector, finalizer
    │   │   └── content/         ← slide_generator, reorder, image_fetcher,
    │   │                           carousel_generator, caption_generator, finalizer
    │   ├── prompts/
    │   │   ├── system_prompts.py        ← Agent personas + date-aware context
    │   │   └── templates/               ← Editable .txt prompt templates
    │   ├── schemas/workflow_state.py    ← TypedDict state definitions
    │   ├── orchestration/contracts.py  ← All Pydantic request/response models
    │   └── templates/carousel/         ← Jinja2 HTML slide templates
    │       ├── aurora/                  ← 🌑 Dark theme (Anger/Fear/Urgency topics)
    │       └── lumina/                  ← ☀️ Light theme (Hope/Inspiration topics)
    ├── infra/
    │   ├── llm/                 ← Provider-agnostic LLM adapters (Claude, OpenAI, Gemini)
    │   ├── logging.py           ← Structlog structured logging
    │   └── output_manager.py    ← Versioned output file management
    └── configs/settings.py      ← All tunable parameters (Pydantic Settings)
```

### ⚙️ Key Settings (`configs/settings.py`)

| Setting                             | Default               | What It Controls                               |
| ----------------------------------- | --------------------- | ---------------------------------------------- |
| `research_max_refinement_loops`   | `2`                 | 🔁 Max retry loops if confidence < threshold    |
| `research_quality_min_confidence` | `0.60`              | 🔒 Combined confidence threshold to pass research |
| `research_quality_min_sources`    | `3`                 | 📰 Minimum evidence items required              |
| `research_max_tool_calls`         | `6`                 | ⚡ Budget cap on total tool executions           |
| `content_max_slides`              | `12`                | 🎨 Hard cap on slides per carousel              |
| `content_min_slides`              | `4`                 | 📋 Minimum slides to generate                   |
| `llm_model`                       | `claude-4.5-sonnet` | 🤖 LLM model for all agents                     |
| `llm_temperature`                 | `1.0`               | 🌡️ Generation temperature                       |

All settings can be overridden via environment variables (uppercase, no prefix).

---

## 🧪 Real Examples

### Example 1 — 💼 Tech topic, standard run

```bash
uv run python -m apps.cli.run_workflow \
  "How SAP is betting on AI agents to transform enterprise ERP in 2026"
```

Result: 22 sources, confidence 0.902, 3 angles, 36 slides (3 × 12), SAP Sapphire 2026 content, Pexels stock images for tech concepts.

### Example 2 — 🗳️ Political topic, DDGS images

```bash
uv run python -m apps.cli.run_workflow \
  "Politics of DMK — from Karunanidhi to Stalin to Udhayanidhi" \
  --image-source ddgs
```

Result: Real photos of Udhayanidhi, Stalin, protest scenes. Research grounded in news articles.

### Example 3 — 🤖 Agentic AI deep dive

```bash
uv run python -m apps.cli.run_workflow \
  "Agentic AI agents in enterprise software" \
  --mode quick --angle-mode auto
```

Result: Confidence 0.9545 (LLM=0.87, sources=1.0), GitLab restructuring cited, SAP's 200+ AI agents stat used.

---

## 🔧 Extending the System

### ➕ Add a new slide type

1. Add enum value to `SlideType` in `contracts.py`
2. Add handling in `slide_generation.txt` prompt
3. Create `<type>.html.j2` in both `aurora/` and `lumina/` template folders

### ➕ Add a new research tool

1. Implement tool class in `core/tools/`
2. Add tool name to `research_allowed_tools` in settings
3. Handle it in `executor.py` and `normalizer.py`

### 🎨 Change the carousel theme logic

Edit `_TEMPLATE_MAP` in `carousel_generator.py` — maps emotional hook strings to theme folder names.

### 📝 Edit any prompt

All prompts live as plain `.txt` files in `core/prompts/templates/`. Edit them directly — no code changes needed.

---

## 🧰 Tech Stack

| Layer            | Technology                                           |
| ---------------- | ---------------------------------------------------- |
| 🖥️ Frontend        | Next.js 16 · Redux Toolkit · Framer Motion · Tailwind v4 |
| 🔄 Orchestration    | LangGraph (StateGraph)                               |
| 🤖 LLM              | Claude (Anthropic) via HAI Proxy · OpenAI · Gemini |
| 🔍 Web Search       | DuckDuckGo Search (DDGS)                             |
| 📰 News             | NewsAPI · Google News RSS                           |
| 🕷️ Web Scraping     | Crawl4AI (MCP server)                                |
| 🖼️ Image Search     | Pexels API · DuckDuckGo Images                      |
| 🧩 Templating       | Jinja2                                               |
| 📸 Rendering        | Playwright (headless Chromium)                       |
| 🖼️ Image Processing | Pillow                                               |
| 🌐 API              | FastAPI + Uvicorn                                    |
| ✅ Validation       | Pydantic v2                                          |
| 📋 Logging          | Structlog                                            |
| ⚡ Runtime          | Python 3.12 · uv                                    |

---
