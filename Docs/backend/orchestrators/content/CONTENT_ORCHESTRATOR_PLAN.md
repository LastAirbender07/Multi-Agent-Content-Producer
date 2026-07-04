# Content Orchestrator — Design & Implementation Plan (v2)

**Stage:** 3 of 5 in the content production pipeline  
**Depends on:** Research Orchestrator (Stage 1), Angle Orchestrator (Stage 2)  
**Produces:** Carousel images (1080×1080 PNG) per selected angle — ready to post

---

## 1. What This Stage Does

```
outputs/<run_id>/research/synthesis.md       ← research facts
outputs/<run_id>/research/evidence.json      ← raw evidence
outputs/<run_id>/angles/selection.json       ← selected angles (1–N)
                   │
                   ▼
        Content Orchestrator (Stage 3)
                   │
                   ▼
outputs/<run_id>/content/
  angle_0/
    slides.json          ← LLM-generated slide text (ordered, validated)
    caption.md           ← post caption + hashtags
    hook.md              ← opening hook line
    images/
      raw/               ← original downloads
      slide_01.jpg       ← 1080×1080 processed
    carousel/
      slide_01.png       ← final 1080×1080 PNG
      slide_02.png
      ...                ← up to 20 slides
  angle_1/
    ...
```

One carousel per selected angle. 3 angles selected = 3 complete carousels.

---

## 2. Slide Structure

### Count rules

| | Value |
|---|---|
| LLM target (in prompt) | 7 slides |
| Minimum (evaluator rejects below) | 4 |
| Hard maximum (Instagram cap, evaluator enforces) | 20 |
| Ideal for completion rate | 6–8 |
| Max body words per slide (evaluator rejects above 30) | 25 |

### Mandatory arc (enforced by `reorder_slides_node`, not the LLM)

```
Slide 1      → hook     (mandatory — sets the angle, visible before swiping)
Slide 2      → stat     (if present — most shocking number, while attention is highest)
Slides 3–N-2 → content  (insights, facts — alternate text-heavy and image-textured)
Slide N-1    → quote    (if present — slows pace, creates emotional beat before CTA)
Slide N      → cta      (mandatory — explicit action, logo prominent)
```

The LLM generates the content. `reorder_slides_node` sorts them into this arc regardless
of the order the LLM returned them. Content of each slide is unchanged — only order adjusts.

---

## 3. Architecture

```
ContentOrchestrator
  │
  ├── 1. ContentGeneratorOrchestrator    (LLM)
  │       └── Reads research + angle → slides, caption, hook
  │
  ├── 2. ImagePipelineOrchestrator       (MCP clients + Pillow)
  │       ├── Pexels MCP                 ← primary
  │       ├── Unsplash MCP               ← secondary
  │       ├── DDGS search_images         ← tertiary (no key, fallback only)
  │       ├── brand/default_bg.jpg       ← fallback
  │       └── solid colour #090909       ← final fallback, never crashes
  │
  └── 3. CarouselGeneratorOrchestrator   (Jinja2 + local HTTP + Playwright)
          ├── Local HTTP render server   ← serves HTML + fonts + images
          ├── Jinja2 template render     ← one template file per slide type
          ├── Playwright screenshots     ← 2160×2160 (2× scale)
          └── Pillow downscale           ← → 1080×1080 LANCZOS
```

---

## 4. Technology Decisions

### 4.1 HTML → Image: Jinja2 + local HTTP server + Playwright

**Why not `file://` URLs:**  
Playwright's sandbox blocks cross-origin requests from `file://` — this breaks Google Fonts
CDN, relative asset paths, and CSS `@import`. Tools like Taplio solve this by serving HTML
from a local HTTP server per render job. We do the same.

**Why not Satori (Vercel):**  
Satori converts JSX+CSS to SVG without a browser — fast but supports only CSS Flexbox subset.
No `backdrop-filter`, no CSS Grid, no blur, no Tailwind. JavaScript-only. Not suitable.

**Why not PIL/Pillow for layout:**  
Text wrapping, font loading, and layout are painful. No gradients, no blur, no shadows.

**Our stack — confirmed correct, with one fix:**

```
1. Jinja2 renders slide_data → HTML file (per slide, per template type)
2. render_server.py starts a local HTTP server serving angle_N/ dir on a random port
3. Playwright opens http://localhost:{port}/slides/slide_01.html
4. await page.wait_for_load_state("networkidle")    ← fonts + assets fully loaded
5. await page.evaluate("document.fonts.ready")      ← font faces applied to DOM
6. Screenshot at viewport 1080×1080, device_scale_factor=2 → 2160×2160 PNG
7. Pillow: resize(1080, 1080, LANCZOS) → final PNG
8. HTTP server torn down after all slides are done
```

Step 4+5 are critical — without waiting for fonts, Playwright screenshots the fallback
font (Times New Roman or similar). This is the most common failure mode in HTML-to-image
pipelines.

Step 6+7 (2× scale + downscale) produces crisp text edges. Standard technique used by
all professional screenshot tools.

### 4.2 Self-hosted fonts (no CDN)

CDN fonts add 800ms–1.5s per render (network round trip). Self-hosted fonts add 0ms.
More importantly: self-hosted fonts render identically on every machine, CI, and Docker container.

Fonts stored in `assets/fonts/`, served by the local HTTP server:
- **Syne Bold** — hook slide headlines. Distinctive, punchy, premium.
- **Plus Jakarta Sans Bold/SemiBold/Regular** — all other text. More premium than Inter.

Download URLs (one-time setup):
- Syne Bold: https://fonts.google.com/specimen/Syne
- Plus Jakarta Sans: https://fonts.google.com/specimen/Plus+Jakarta+Sans

### 4.3 Image treatment — texture, not photo

Images fetched from Pexels/Unsplash are NOT shown as literal photographs. They're used as
**atmosphere and texture** behind designed typography. Two treatments:

**Hook slide — full-bleed + heavy gradient overlay:**
```css
.slide-bg { background-image: url(...); background-size: cover; }
.slide-overlay {
    background: linear-gradient(
        135deg,
        rgba(9,9,9,0.88) 0%,
        rgba(9,9,9,0.65) 50%,
        rgba(124,110,250,0.25) 100%   /* primary colour tint at edge */
    );
}
```
Image sets mood. Typography dominates. Dark enough that any image works.

**Content slides — blurred texture:**
```css
.slide-bg {
    background-image: url(...);
    background-size: cover;
    filter: blur(24px) brightness(0.25);
    transform: scale(1.1);  /* prevent blur white-edge artefact */
}
```
Image is unrecognisable as a photo — acts as a subtle colour field and texture.

**Stat/Quote/CTA slides — no image, solid dark background.**  
Typography is the visual on these slides.

### 4.4 Two templates, auto-selected by emotional tone

Same layouts, different palettes:

| Template | Palette | Auto-selected for |
|---|---|---|
| **aurora** | Dark (#090909 bg, violet primary, teal secondary) | Anger, Fear, Urgency, Controversy, Surprise |
| **lumina** | Light (#FAFAF8 bg, deep navy primary, warm teal secondary) | Hope, Inspiration, Curiosity, Admiration |

Selection in `content_node.py`:
```python
TEMPLATE_MAP = {
    "Anger": "aurora",  "Fear": "aurora",   "Urgency": "aurora",
    "Controversy": "aurora", "Surprise": "aurora",
    "Hope": "lumina",   "Inspiration": "lumina", "Curiosity": "lumina",
}
template = TEMPLATE_MAP.get(angle["emotional_hook"], "aurora")
```

### 4.5 Image source priority (revised)

DDGS image search has had multiple breaking API changes in 2024-2025. No license metadata.
Pexels is free, stable, and explicitly licenses for commercial use. Pexels is primary.

```
1. Pexels MCP server      ← primary (free tier: 200 req/hr, licensed, reliable)
2. Unsplash MCP server    ← secondary (free, very high quality, attribution recommended)
3. DDGS search_images     ← tertiary (no key needed, unreliable, no license — dev fallback)
4. brand/default_bg.jpg   ← fallback
5. solid colour #090909   ← final fallback (never crashes the pipeline)
```

### 4.6 Canvas size: fixed 1080×1080

Platform-independent. Square works on Instagram, LinkedIn, Twitter/X, Facebook without
cropping, padding, or compression artefacts. One template to maintain.

---

## 5. LangGraph Flows

### 5.1 ContentGeneratorOrchestrator

```
START
  │
  ▼
load_context_node
  (reads synthesis.md + evidence.json + selection.json — no LLM)
  │
  ▼
generate_slides_node                ← LLM structured output
  (hook + stat? + 3–5 content + quote? + cta, target 7 slides, max 20)
  │
  ▼
reorder_slides_node                 ← deterministic, no LLM
  (enforces hook→stat→content→quote→cta arc)
  │
  ▼
generate_caption_node               ← LLM structured output
  (caption, hashtags — generated after slide order is finalised)
  │
  ▼
evaluate_content_node
  (4 ≤ slides ≤ 20, body ≤ 30 words, first=hook, last=cta, caption non-empty)
  │
  ├── passed → finalize_content_node → END
  └── failed → finalize_content_partial_node → END
```

### 5.2 ImagePipelineOrchestrator

```
START
  │
  ▼
generate_image_queries_node         ← LLM (1 short search query per slide)
  │
  ▼
fetch_images_node
  (Pexels MCP → Unsplash MCP → DDGS → brand default → solid colour)
  (filter: reject results with width < 800px before downloading)
  │
  ▼
download_images_node                ← httpx async downloads → images/raw/
  │
  ▼
process_images_node                 ← Pillow
  (centre-crop to square, resize to 1080×1080, save to images/)
  │
  ▼
apply_brand_node
  (overlay logo bottom-left at 40px height — graceful skip if missing)
  │
  ▼
finalize_images_node → END
```

### 5.3 CarouselGeneratorOrchestrator

```
START
  │
  ▼
load_slide_data_node
  (reads slides.json + resolves image paths per slide)
  │
  ▼
render_html_node                    ← Jinja2
  (selects template by slide.type, renders to angle_N/slides/slide_NN.html)
  │
  ▼
screenshot_slides_node              ← Playwright async (headless Chromium)
  (starts local HTTP server on random port)
  (viewport 1080×1080, device_scale_factor=2 → 2160×2160 raw PNG)
  (wait_for_load_state("networkidle") + evaluate("document.fonts.ready"))
  (Pillow downscale 2160→1080 LANCZOS → final PNG)
  │
  ▼
validate_output_node
  (all PNGs exist, each 1080×1080, count matches slide count)
  │
  ▼
finalize_carousel_node → END
```

---

## 6. Schemas & Contracts

### `core/orchestration/contracts.py`

```python
class SlideType(str, Enum):
    hook    = "hook"      # first slide — visible before swiping
    content = "content"   # body slide — fact, insight, argument
    stat    = "stat"      # big number/data point — highest engagement type
    quote   = "quote"     # pullquote — emotional beat before CTA
    cta     = "cta"       # last slide — explicit action + logo

class Slide(BaseModel):
    slide_number: int                  # 1-based, set by reorder_slides_node
    type: SlideType
    title: str
    body: str                          # max 25 words (enforced in evaluator)
    stat_value: str = ""               # stat slides only: e.g. "400K+"
    stat_label: str = ""               # stat slides only: e.g. "workers forced back"
    image_query: str = ""              # short phrase for image search

class CarouselContent(BaseModel):
    angle_index: int
    angle_statement: str
    emotional_hook: str                # maps to template selection
    hook: str                          # first line shown before swiping
    slides: list[Slide]                # 4 ≤ len ≤ 20, ordered by reorder_node
    caption: str
    hashtags: list[str]
    cta: str

class ImageAsset(BaseModel):
    slide_number: int
    source: str                        # "pexels"|"unsplash"|"ddgs"|"brand"|"colour"
    original_url: str = ""
    local_raw_path: str = ""
    processed_path: str

class ContentRequest(BaseModel):
    run_id: str
    topic: str
    selected_angles: list[dict]
    research_summary: str
    key_points: list[str]
    template: str = "auto"             # "auto" = select by emotional_hook, else explicit
    max_slides: int = 9                # LLM target, hard cap is always 20
    min_slides: int = 4

class ContentResponse(BaseModel):
    run_id: str
    status: RunStatus
    angles_processed: int
    output_paths: list[str]
    carousel_paths: list[list[str]]    # PNG paths per angle
    errors: list[str]
```

### `core/schemas/workflow_state.py`

```python
class ContentGraphState(TypedDict, total=False):
    request: dict
    run_id: str
    current_angle_index: int
    carousel_contents: list[dict]
    image_assets: list[dict]
    carousel_paths: list[list[str]]
    errors: list[str]
    messages: list[str]
```

---

## 7. MCP Servers for Image APIs

### `pexels_server.py`

```python
@mcp.tool()
async def search_photos(query: str, per_page: int = 10, min_width: int = 800) -> dict:
    """Search Pexels for photos. Returns list of {id, url, photographer, width, height, src}."""

@mcp.tool()
async def download_photo(url: str, save_path: str) -> dict:
    """Download photo from URL to save_path. Returns {success, local_path, bytes}."""
```

API: `https://api.pexels.com/v1/search`  
Auth: `Authorization: {PEXELS_API_KEY}` header  
Free tier: 200 requests/hour, 20,000/month

### `unsplash_server.py`

```python
@mcp.tool()
async def search_photos(query: str, per_page: int = 10, min_width: int = 800) -> dict:
    """Search Unsplash for photos. Returns list of {id, urls, user, width, height, color}."""

@mcp.tool()
async def download_photo(url: str, save_path: str) -> dict:
    """Download photo from URL to save_path. Returns {success, local_path, bytes}."""
```

API: `https://api.unsplash.com/search/photos`  
Auth: `Authorization: Client-ID {UNSPLASH_ACCESS_KEY}` header  
Free tier: 50 requests/hour

Both follow the identical `FastMCP` + `@mcp.tool()` + `mcp.run()` pattern as `crawl4ai_server.py`.

---

## 8. Template System: aurora & lumina

### File structure

```
backend/
  assets/
    fonts/
      PlusJakartaSans-Bold.woff2
      PlusJakartaSans-SemiBold.woff2
      PlusJakartaSans-Regular.woff2
      Syne-Bold.woff2
    brand/
      .gitkeep        ← add logo.png, colors.json, default_bg.jpg here

  core/templates/carousel/
    aurora/
      _base.html.j2   ← font-face, CSS vars, 1080×1080 canvas, dot-grid pattern
      hook.html.j2
      content.html.j2
      stat.html.j2
      quote.html.j2
      cta.html.j2
      style.css
    lumina/
      _base.html.j2   ← same structure, light palette CSS vars
      hook.html.j2
      content.html.j2
      stat.html.j2
      quote.html.j2
      cta.html.j2
      style.css
```

### aurora palette

```css
--bg:         #090909;
--surface:    #131313;
--primary:    #7C6EFA;   /* violet */
--secondary:  #2DD4BF;   /* teal */
--accent:     #F59E0B;   /* amber — stats only */
--text:       #FAFAFA;
--muted:      #71717A;
```

### lumina palette

```css
--bg:         #FAFAF8;
--surface:    #FFFFFF;
--primary:    #1E40AF;   /* deep navy */
--secondary:  #0D9488;   /* deep teal */
--accent:     #D97706;   /* warm amber */
--text:       #111827;
--muted:      #6B7280;
```

### Slide layouts

**hook.html.j2**
```
┌─────────────────────────────────────────┐
│  [full-bleed bg image, heavy overlay]   │
│                                         │
│  ┌─────── glassmorphism card ─────────┐  │
│  │  HEADLINE (Syne Bold, 88px)        │  │
│  │  gradient text primary→secondary  │  │
│  └────────────────────────────────────┘  │
│                                         │
│  [logo 40px]       ██████  01 / 07      │
└─────────────────────────────────────────┘
Glassmorphism: background rgba(255,255,255,0.05), backdrop-filter: blur(12px),
               border: 1px solid rgba(255,255,255,0.10), border-radius: 16px
```

**content.html.j2**
```
┌─────────────────────────────────────────┐
│  [blurred+darkened image texture bg]    │
│                                         │
│  ▌ SLIDE TITLE (PJS Bold, 56px)         │  ← 4px primary left border
│                                         │
│    Body text, max 25 words.             │
│    PJS Regular 30px, --muted colour,    │
│    line-height: 1.65                    │
│                                         │
│  [logo 40px]       ██████  02 / 07      │
└─────────────────────────────────────────┘
```

**stat.html.j2** ← highest engagement slide type
```
┌─────────────────────────────────────────┐
│  [solid --bg, no image]                 │
│                                         │
│         400K+                           │  ← Syne Bold, 160px
│         ───────────────────             │    gradient text: primary→secondary
│         workers forced back             │  ← PJS Regular, 32px, --muted
│         to office in 2025               │
│                                         │
│  [logo 40px]       ██████  03 / 07      │
└─────────────────────────────────────────┘
```

**quote.html.j2**
```
┌─────────────────────────────────────────┐
│  [solid --surface bg]                   │
│                                         │
│  "                                      │  ← 280px, --primary, 8% opacity
│                                         │
│    "The real battle is hybrid vs        │
│     full office, not remote vs          │
│     office."                            │  ← PJS SemiBold Italic, 42px, centred
│                                         │
│    ── May 2025 GAO Report               │  ← PJS Regular, 24px, --muted
│                                         │
│  [logo 40px]       ██████  06 / 07      │
└─────────────────────────────────────────┘
```

**cta.html.j2**
```
┌─────────────────────────────────────────┐
│  [gradient bg: --primary → --secondary] │
│                                         │
│         Follow for more takes           │
│         that cut through the noise.     │  ← PJS Bold, 64px, white, centred
│                                         │
│         @handle                         │  ← PJS SemiBold, 36px, white/70%
│                                         │
│  [logo 80px, centred bottom]            │
└─────────────────────────────────────────┘
```

---

## 9. New Utility: `render_server.py`

```python
# core/orchestrators/content/render_server.py
# ~25 lines — async context manager that serves a directory over HTTP

import asyncio, socket, threading
from contextlib import asynccontextmanager
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

def _find_free_port() -> int:
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]

@asynccontextmanager
async def serve_directory(directory: Path):
    port = _find_free_port()
    handler = lambda *a, **kw: SimpleHTTPRequestHandler(*a, directory=str(directory), **kw)
    server = HTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server.shutdown()
```

Used in `screenshot_slides_node`:
```python
async with serve_directory(angle_output_dir) as base_url:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={"width": 1080, "height": 1080},
            device_scale_factor=2,
        )
        page = await context.new_page()
        for slide_html in slide_html_files:
            await page.goto(f"{base_url}/slides/{slide_html.name}")
            await page.wait_for_load_state("networkidle")
            await page.evaluate("document.fonts.ready")
            raw = await page.screenshot(full_page=False)
            # Pillow downscale 2160→1080
            ...
```

---

## 10. Full File & Folder Structure

```
backend/
  assets/
    fonts/
      PlusJakartaSans-Bold.woff2
      PlusJakartaSans-SemiBold.woff2
      PlusJakartaSans-Regular.woff2
      Syne-Bold.woff2
    brand/
      .gitkeep

  core/
    orchestrators/
      content/
        __init__.py
        orchestrator.py             ← ContentOrchestrator (parent)
        content_generator.py        ← ContentGeneratorOrchestrator
        image_pipeline.py           ← ImagePipelineOrchestrator
        carousel_generator.py       ← CarouselGeneratorOrchestrator
        render_server.py            ← local HTTP server context manager

    graphs/
      content_graph.py
      image_graph.py
      carousel_graph.py

    nodes/
      content.py                    ← bridge node (mirrors angle.py)

    tools/
      mcp_servers/
        crawl4ai_server.py          ← existing
        pexels_server.py            ← new
        unsplash_server.py          ← new
      schemas/
        image_schema.py             ← ImageAsset, ImageSearchOutput

    templates/
      carousel/
        aurora/  (5 slide templates + _base + style.css)
        lumina/  (5 slide templates + _base + style.css)

    prompts/
      slide_generation.md
      caption_generation.md
      image_query_generation.md

  apps/api/v1/
    content.py                      ← POST /api/v1/content/run
```

---

## 11. Settings to Add

```python
# Image APIs
pexels_api_key: str = Field(default="")
unsplash_access_key: str = Field(default="")

# Content generation
content_max_slides: int = Field(default=9)    # LLM target; hard cap always 20
content_min_slides: int = Field(default=4)
content_default_template: str = Field(default="auto")  # "auto"|"aurora"|"lumina"
content_body_max_words: int = Field(default=25)
content_image_min_width: int = Field(default=800)

# Brand
brand_assets_path: str = Field(default="assets/brand")
fonts_path: str = Field(default="assets/fonts")
```

---

## 12. Pipeline Integration

`apps/cli/run_workflow.py`:
```python
# Stage 3: Content generation (per selected angle)
state = await self._run_stage("content", content_node, state)
```

`main.py`:
```python
from apps.api.v1.content import router as content_router
app.include_router(content_router, prefix="/api/v1")
```

---

## 13. Implementation Phases

### Phase 1 — Content Generator (text only)
1. Add `SlideType`, `Slide`, `CarouselContent`, `ContentRequest`, `ContentResponse` to `contracts.py`
2. Add `ContentGraphState` to `workflow_state.py`
3. Add settings
4. Write `slide_generation.md` prompt (instruct: 7 slides, max 20, max 25 words/body, all types)
5. Write `caption_generation.md` prompt
6. Build `load_context_node`
7. Build `generate_slides_node` (LLM structured → `list[Slide]`)
8. Build `reorder_slides_node` (deterministic arc enforcement)
9. Build `generate_caption_node`
10. Build `evaluate_content_node` (count, body word limit, hook/cta enforcement)
11. Build `finalize_content_node`
12. Build `content_graph.py`, `ContentGeneratorOrchestrator`
13. Test: verify slide order, word counts, type distribution

### Phase 2 — Image Pipeline
1. Build `pexels_server.py` MCP (`search_photos`, `download_photo`)
2. Build `unsplash_server.py` MCP (`search_photos`, `download_photo`)
3. Add `ImageAsset` to `image_schema.py`
4. Write `image_query_generation.md` prompt
5. Build `generate_image_queries_node`
6. Build `fetch_images_node` (Pexels MCP → Unsplash MCP → DDGS → brand → colour)
7. Build `download_images_node`
8. Build `process_images_node` (Pillow: square centre-crop → 1080×1080)
9. Build `apply_brand_node` (logo overlay, graceful skip)
10. Build `image_graph.py`, `ImagePipelineOrchestrator`
11. Test: verify fallback chain, processed image dimensions

### Phase 3 — Carousel Generator (HTML → PNG)
1. Download font files into `assets/fonts/`
2. Create `assets/brand/` with `.gitkeep`
3. Build `render_server.py` (~25 lines)
4. Write all 5 aurora templates (`_base`, `hook`, `content`, `stat`, `quote`, `cta`)
5. Write all 5 lumina templates (same structure, light palette)
6. Build `load_slide_data_node`
7. Build `render_html_node` (Jinja2, selects template by slide.type)
8. Build `screenshot_slides_node` (local HTTP server + Playwright 2× + Pillow downscale)
9. Build `validate_output_node`
10. Build `carousel_graph.py`, `CarouselGeneratorOrchestrator`
11. Test: inspect PNG output, verify 1080×1080, check font rendering

### Phase 4 — Integration
1. Build `ContentOrchestrator` (parent: calls all 3 per angle)
2. Build `content_node` bridge
3. Build `POST /api/v1/content/run`
4. Add Stage 3 to `run_workflow.py`
5. E2E test: topic → research → angles → content → carousel PNGs

---

## 14. Dependencies to Add

```toml
"pillow>=10.0.0",
"playwright>=1.40.0",
"jinja2>=3.1.0",
```

```bash
uv pip install pillow playwright jinja2
playwright install chromium
```

---

## 15. Design Principles

| Principle | Applied here |
|---|---|
| Shared `run_id` | Content reads prior outputs by `run_id`, writes under same folder |
| `RunOutputManager` | All file I/O via the shared utility |
| Dict-only `GraphState` | No Pydantic in LangGraph state (MemorySaver safety) |
| Settings for all config | No hardcoded values |
| Graceful degradation | Image chain never crashes. Slide content never blocks carousel render |
| Node = single responsibility | `reorder_slides_node` only sorts. `render_html_node` only renders HTML |
| Prompts in files | All LLM instructions in `core/prompts/` |
| MCP for external APIs | Pexels + Unsplash as MCP servers — same pattern as crawl4ai |
| Fixed canvas | 1080×1080 everywhere — platform independent |
| Deterministic arc | Slide ordering is code, not LLM output |
| 2× render + downscale | Crisp text on any display |
| Self-hosted fonts | Fast, consistent, no CDN dependency |
| Texture, not photo | Images as atmosphere — typography always dominates |

---

_Last updated: 2026-05-07_
