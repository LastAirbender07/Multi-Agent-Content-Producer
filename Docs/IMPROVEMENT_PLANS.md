# Implementation Plans: 6 Product Improvements

---

## 1. Image Deduplication Across Carousel

### Problem

`fetch_images_node` processes each slide independently. The same image URL can appear on multiple slides in the same carousel because there is no cross-slide awareness — `ranked[0]` is picked for slide 2, then the same `ranked[0]` is picked again for slide 5 because it scores best for both queries.

### Root cause

In `backend/core/orchestrators/content/image_fetcher.py`, the `for slide in slides` loop maintains no set of already-used URLs.

### Solution

**One-line conceptual change:** maintain a `used_urls: set[str]` across the loop. After picking `ranked[0]`, add its URL to the set. For subsequent slides, filter the ranked list before picking.

**Implementation — `fetch_images_node` in `image_fetcher.py`:**

```python
# Before the for loop:
used_urls: set[str] = set()

# Inside the loop, replace:
best = ranked[0]

# With:
best = next((img for img in ranked if img.get("url", "") not in used_urls), ranked[0])
used_urls.add(best.get("url", ""))
```

Fetch 20 candidates instead of 15 to keep the pool large enough after deduplication:

```python
results = await _search_pexels(query, per_page=20)   # was 15
results = await _search_ddgs(query, max_results=20)  # was 15
```

**Edge case:** If all candidates are already used (rare — would need >20 identical results), fall back to `ranked[0]` without blocking (the `next(... , ranked[0])` default handles this silently).

**Files changed:** `backend/core/orchestrators/content/image_fetcher.py` only — no schema changes, no API changes.

**Verification:** Run a carousel on a narrow topic (e.g. "Narendra Modi"). Before the fix, slides 3 and 7 often share the same headshot. After the fix, each slide should have a visually distinct image. Log `"image_fetched"` events and confirm no two slides share the same `original_url`.

---


## 3. Angle Re-generation

### Problem

There is no way to regenerate angles without re-running the full pipeline. The `/angle/run` endpoint runs the full graph from scratch each time — it does not expose "give me a new set of angles for the same synthesis."

### Solution

**Add `POST /api/v1/angle/regenerate`** — accepts an existing `synthesis` + `run_id` (same as `/angle/run`) but seeds the generation with a `exclude_statements` list so the LLM knows what was already generated.

**Backend — `apps/api/v1/angle.py`:**

```python
class AngleRegenerateRequest(BaseModel):
    topic: str
    synthesis: ResearchSynthesis
    run_id: str
    mode: Literal["auto", "manual"] = "auto"
    max_angles_to_select: int = 3
    exclude_statements: list[str] = []   # statements from the previous run

@router.post("/regenerate", response_model=AngleResponse)
async def regenerate_angles(request: AngleRegenerateRequest) -> AngleResponse:
    """Generate a fresh set of angles for the same synthesis, avoiding previously seen ones."""
    return await _orchestrator.run(request.model_dump())
```

Move `AngleRegenerateRequest` to `schemas.py`.

**Prompt update — `angle_generation.txt`:**
Add a section at the end:

```
{exclude_block}
```

Where `exclude_block` is either empty (normal run) or:

```
PREVIOUSLY GENERATED ANGLES (DO NOT REPEAT THESE):
- {statement_1}
- {statement_2}
...
Generate completely different angles that approach the topic from new directions.
```

**`angle_generation.py` (generator node):**
Read `exclude_statements` from request dict. If non-empty, inject them into the `exclude_block` template variable.

**`AngleRequest` contract — `contracts.py`:**
Add optional field:

```python
exclude_statements: list[str] = Field(default_factory=list)
```

**Frontend — `lib/api.ts`:**
Add:

```ts
regenerateAngles: (body: AngleRegenerateBody) =>
  post<AngleResponse>("/angle/regenerate", body),
```

**Frontend — Stage 2 card in `pipeline/page.tsx`:**
Add a "Regenerate Angles" button below the angle list, visible when `stages.angle.status === "done" && stages.content.status === "idle"`. On click: collect current `angleResult.angles.map(a => a.statement)` as `exclude_statements`, call `api.regenerateAngles(...)`, dispatch `setAngleResult`, keep angle stage as `done`.

**Files changed:**

- `backend/core/orchestration/contracts.py` — add `exclude_statements` to `AngleRequest`
- `backend/core/orchestrators/angle/generator.py` — pass `exclude_block` to prompt
- `backend/core/prompts/templates/angle_generation.txt` — add `{exclude_block}` variable
- `backend/apps/api/v1/angle.py` — add `/regenerate` endpoint
- `backend/apps/api/v1/schemas.py` — add `AngleRegenerateRequest`
- `frontend/lib/api.ts` — add `regenerateAngles`
- `frontend/app/pipeline/page.tsx` — add Regenerate button in Stage 2 card

**Verification:** Run a pipeline, observe 5 angles. Click "Regenerate". Confirm: (a) `/angle/regenerate` is called with the original statements in `exclude_statements`, (b) new angles returned have different statements, (c) Stage 2 card updates in place without re-running research.

---

## 4. Progress Percentage in Research Stage

### Problem

The research graph runs 9 nodes taking 30–90s. The UI shows only `"Running…"` with no indication of which node is executing or how far along the run is.

### Solution

**Polling approach** (no SSE/WebSocket infra needed, simplest to implement):

**Backend — add `GET /api/v1/research/status/{run_id}`:**
Store per-run node progress in a lightweight in-memory dict keyed by `run_id`. Each node logs its completion into this dict before returning.

```python
# In research_graph.py — module-level:
_run_progress: dict[str, dict] = {}   # run_id → {node, step, total, started_at}

# In each node, add at the START (after intake):
_run_progress[state["run_id"]] = {"node": "route", "step": 2, "total": 9}
```

Node → step mapping:

```
intake=1, route=2, llm_knowledge=3, execute_tools=4,
normalize=5, score_evidence=6, synthesize=7, evaluate=8, finalize=9
```

Add endpoint in `research.py`:

```python
@router.get("/status/{run_id}")
async def research_status(run_id: str) -> dict:
    prog = _run_progress.get(run_id)
    if not prog:
        return {"run_id": run_id, "status": "unknown"}
    return {
        "run_id": run_id,
        "node": prog["node"],
        "step": prog["step"],
        "total": prog["total"],
        "pct": round(prog["step"] / prog["total"] * 100),
        "label": _NODE_LABELS[prog["node"]],
    }

_NODE_LABELS = {
    "intake": "Starting…",
    "route": "Planning queries…",
    "llm_knowledge": "Loading background knowledge…",
    "execute_tools": "Searching news & web…",
    "normalize": "Processing sources…",
    "score_evidence": "Scoring evidence…",
    "synthesize": "Synthesising findings…",
    "evaluate": "Evaluating quality…",
    "finalize": "Saving results…",
}
```

**Frontend — poll during research running state:**

In `pipeline/page.tsx`, add a `useEffect` that fires every 2s when `stages.research.status === "running"`:

```ts
const [researchProgress, setResearchProgress] = useState<{pct: number; label: string} | null>(null);

useEffect(() => {
  if (stages.research.status !== "running" || !runId) return;
  const interval = setInterval(async () => {
    try {
      const prog = await fetch(`http://localhost:8000/api/v1/research/status/${runId}`).then(r => r.json());
      setResearchProgress({ pct: prog.pct ?? 0, label: prog.label ?? "Running…" });
    } catch {}
  }, 2000);
  return () => clearInterval(interval);
}, [stages.research.status, runId]);
```

In Stage 1 card running state (currently just a spinner), replace with:

```tsx
<div className="text-xs text-zinc-500 font-medium">{researchProgress?.label ?? "Researching…"}</div>
<div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
  <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
       style={{ width: `${researchProgress?.pct ?? 0}%` }} />
</div>
```

**Files changed:**

- `backend/core/graphs/research_graph.py` — add `_run_progress` dict + update at each node
- `backend/apps/api/v1/research.py` — add `GET /status/{run_id}` endpoint
- `frontend/app/pipeline/page.tsx` — add poll + progress bar in Stage 1 running state

**No schema changes to `ResearchResponse`. No breaking changes.**

**Verification:** Start a research run. Watch Stage 1 card in the UI — label should update every 2s from "Planning queries…" → "Searching news & web…" → "Synthesising findings…" etc. Progress bar should advance from 0% to 100% before the stage card transitions to done state.

---

## 5. Multi-Topic Batch Mode

### Problem

The API and CLI accept one topic per call. Producing a 10-post content calendar requires 10 sequential invocations (total: 5–15 minutes). There is no way to submit a batch and have them run concurrently.

### Solution

**Add `POST /api/v1/pipeline/batch`** with a bounded async worker pool.

**Backend — `apps/api/v1/pipeline.py`:**

```python
class BatchPipelineRequest(BaseModel):
    topics: list[str] = Field(..., min_length=1, max_length=20)
    mode: str = "standard"
    freshness: str = "recent"
    angle_mode: str = "auto"
    image_source: str = "auto"
    max_concurrent: int = Field(default=3, ge=1, le=5,
        description="Max simultaneous pipeline runs (1-5, default 3)")

class BatchTopicResult(BaseModel):
    topic: str
    run_id: str
    status: str         # "complete" | "failed"
    output_path: str
    errors: list[str]

class BatchPipelineResponse(BaseModel):
    batch_id: str
    total: int
    completed: int
    failed: int
    results: list[BatchTopicResult]

@router.post("/batch", response_model=BatchPipelineResponse)
async def run_pipeline_batch(request: BatchPipelineRequest) -> BatchPipelineResponse:
    semaphore = asyncio.Semaphore(request.max_concurrent)

    async def run_one(topic: str) -> BatchTopicResult:
        async with semaphore:
            try:
                result = await run_pipeline(PipelineRequest(
                    topic=topic,
                    mode=request.mode,
                    freshness=request.freshness,
                    angle_mode=request.angle_mode,
                ))
                return BatchTopicResult(
                    topic=topic, run_id=result.run_id,
                    status=result.status, output_path=result.output_path,
                    errors=result.errors,
                )
            except Exception as e:
                return BatchTopicResult(
                    topic=topic, run_id="", status="failed",
                    output_path="", errors=[str(e)]
                )

    batch_id = str(uuid.uuid4())
    results = await asyncio.gather(*[run_one(t) for t in request.topics])

    return BatchPipelineResponse(
        batch_id=batch_id,
        total=len(results),
        completed=sum(1 for r in results if r.status == "complete"),
        failed=sum(1 for r in results if r.status == "failed"),
        results=list(results),
    )
```

Move `BatchPipelineRequest`, `BatchTopicResult`, `BatchPipelineResponse` to `schemas.py`.

**`PipelineRequest` and `PipelineResponse` should also move to `schemas.py`** as part of this work (currently inline in `pipeline.py` — a known tech debt item).

**Frontend — add a "Batch Mode" tab or secondary page `/pipeline/batch`:**

- Textarea where user pastes one topic per line
- Mode/freshness/angle-mode selectors (same as single pipeline)
- "Run Batch" button → calls `api.runBatch()`
- Results table: topic, status badge (✅/❌), output path link

**`lib/api.ts`:**

```ts
runBatch: (body: BatchPipelineBody) => post<BatchPipelineResponse>("/pipeline/batch", body),
```

**Files changed:**

- `backend/apps/api/v1/pipeline.py` — add `/batch` endpoint
- `backend/apps/api/v1/schemas.py` — add 3 batch models + move existing `PipelineRequest/Response`
- `frontend/lib/api.ts` — add `runBatch`
- `frontend/app/pipeline/batch/page.tsx` — new batch input page (or modal on existing pipeline page)

**Verification:** Submit 3 topics with `max_concurrent=2`. Confirm logs show at most 2 simultaneous `content_orchestrator_started` events. Confirm all 3 produce output in `outputs/<run_id>/`. Confirm `BatchPipelineResponse.completed === 3`.

---

## 6. Slide Editor UI

### Problem

After content is generated the user can only view slides. There is no way to edit text, swap an image, or regenerate a single slide — the only option is re-running the entire 3-stage pipeline.

This is the most complex of the six improvements. It requires:

1. A backend endpoint to regenerate a single slide
2. A backend endpoint to swap an image on a slide (search + replace + re-render PNG)
3. Frontend inline editing UI on the carousel preview

### Solution

#### Backend — two new endpoints

**`POST /api/v1/content/{run_id}/slides/{slide_number}/regenerate`**

Accepts: `angle_index`, `topic`, `angle_statement`, `feedback` (optional user instruction).
Uses the existing `slide_regen.txt` prompt template (already exists from the validation framework).
Re-renders the slide HTML → PNG via `carousel_generator.py`.
Returns: updated slide dict + new PNG path.

```python
class SlideRegenRequest(BaseModel):
    angle_index: int
    topic: str
    angle_statement: str
    emotional_hook: str
    prev_slide: dict | None = None
    next_slide: dict | None = None
    feedback: str = ""    # user instruction e.g. "make it more specific, add a stat"

class SlideRegenResponse(BaseModel):
    slide: dict            # updated Slide.model_dump()
    png_path: str
    error: str | None = None
```

**`POST /api/v1/content/{run_id}/slides/{slide_number}/swap-image`**

Accepts: `angle_index`, `query`, `source` ("pexels" or "ddgs").
Calls `_search_pexels` or `_search_ddgs`, picks best result, downloads, re-renders PNG.
Returns: updated `image_asset` dict + new PNG path.

```python
class ImageSwapRequest(BaseModel):
    angle_index: int
    query: str
    source: Literal["pexels", "ddgs"] = "pexels"

class ImageSwapResponse(BaseModel):
    image_asset: dict
    png_path: str
    error: str | None = None
```

Both endpoints read the current `slides.json` for the angle from disk, update the relevant slide, write back to disk, and re-screenshot only that one slide (not the full carousel).

Add these to `backend/apps/api/v1/content.py`. Add request/response models to `schemas.py`.

#### Frontend — inline editor on carousel preview

**In `InstagramPreview.tsx`**, add an edit overlay per slide:

- In view mode: pencil icon appears on slide hover (top-right corner, `opacity-0 group-hover:opacity-100`)
- Click pencil → slide enters **edit mode** (inline on the same card, not a new page):
  - **Text fields**: `title` and `body` become editable `<textarea>` elements
  - **Image area**: "🔄 Search new image" button opens a mini image search panel below the slide (reuse the existing Images page search UI as a component)
  - **"Regenerate with AI"** button: opens a 1-line feedback textarea + calls `api.regenerateSlide()`
  - **Save / Cancel** buttons

**State in `pipeline/page.tsx`:**

```ts
const [editingSlide, setEditingSlide] = useState<{angleIdx: number; slideNum: number} | null>(null);
```

**`lib/api.ts`:**

```ts
regenerateSlide: (runId: string, slideNum: number, body: SlideRegenBody) =>
  post<SlideRegenResponse>(`/content/${runId}/slides/${slideNum}/regenerate`, body),
swapSlideImage: (runId: string, slideNum: number, body: ImageSwapBody) =>
  post<ImageSwapResponse>(`/content/${runId}/slides/${slideNum}/swap-image`, body),
```

On successful regen/swap: update `contentResult.carousel_paths[angleIdx][slideIdx]` in Redux with the new PNG path (backend returns it). The carousel preview re-renders automatically because `slide_png_paths` drives the `<img src>`.

#### Files changed

| File                                                         | Change                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `backend/apps/api/v1/content.py`                           | Add 2 new endpoints                                                                      |
| `backend/apps/api/v1/schemas.py`                           | Add 4 new models                                                                         |
| `backend/core/orchestrators/content/carousel_generator.py` | Extract `render_and_screenshot_single_slide(slide, angle, run_id, angle_index)` helper |
| `backend/core/orchestrators/content/image_fetcher.py`      | Extract `fetch_single_slide_image(slide, run_id, angle_index)` helper                  |
| `frontend/lib/api.ts`                                      | Add `regenerateSlide`, `swapSlideImage`                                              |
| `frontend/components/pipeline/InstagramPreview.tsx`        | Add edit overlay + inline editor                                                         |
| `frontend/app/pipeline/page.tsx`                           | Pass `runId` + `editingSlide` state to `InstagramPreview`                          |

**Verification:**

1. Generate a carousel. Hover a slide — pencil appears.
2. Click pencil. Title becomes editable — change it. Click Save. Confirm PNG re-renders with new text.
3. Click "Regenerate with AI", type "add a specific statistic". Confirm new slide content appears.
4. Click "Search new image", search "SAP Sapphire", click a result. Confirm image swaps on the carousel preview.
5. Navigate away and back — edits persist (stored in Redux `contentResult`).

---

## 7. Blog Post Export — Publish-Ready Markdown + HTML with Images, Citations & Engagement

### Problem

The pipeline produces pixel-perfect carousels for Instagram/LinkedIn but nothing for long-form publishing platforms (Medium, Blogger, Wix, Substack, Ghost). The research synthesis, slide content, real downloaded images (`content/angle_0/images/slide_XX.jpg`), and evidence URLs with source titles are all already on disk — they just need to be assembled into a structured, trustworthy, engaging blog article. Currently a user must copy-paste slide text, manually look up source URLs, and source images themselves.

### Design principles

1. **Images are mandatory** — every section gets a real image pulled from the already-downloaded `images/` folder. No placeholder. `source: colour` slides (stat/cta/engage) use the PNG screenshot of that slide instead.
2. **Citations are real** — inline `[Source Name](url)` links are built from actual `evidence.json` URLs. `llm://` sources are acknowledged as "Background Knowledge (LLM)" without a broken link.
3. **LLM-only mode degrades gracefully** — when there are no external URLs (full LLM-only run), the article still generates with engaging prose and slide images; citation section is replaced with an "LLM-generated — verify independently" callout.
4. **Two output files** — `blog_post.md` (paste into Medium/Substack/Ghost) and `blog_post.html` (paste into Wix/Blogger/any HTML editor, or serve directly).
5. **Non-fatal** — if blog generation fails, the carousel pipeline still succeeds.

---

### What gets generated

```
outputs/<run_id>/
├── research/
│   ├── research_result.json
│   ├── evidence.json
│   └── synthesis.md
├── angles/
│   └── angles.json
├── content/
│   ├── angle_0/
│   │   ├── slides.json
│   │   ├── image_assets.json      ← original_url + local_raw_path per slide
│   │   ├── images/                ← real downloaded JPGs (slide_01.jpg … slide_12.jpg)
│   │   └── png/                   ← rendered PNG carousels
├── blog_post.md        ← NEW: Markdown with real images + citations
└── blog_post.html      ← NEW: Styled standalone HTML, same content
```

The backend also serves `/outputs/` as static files (`main.py` already mounts this), so image URLs in the HTML can be either absolute paths or `http://localhost:8000/outputs/<run_id>/content/angle_0/images/slide_02.jpg` for live preview.

---

### Data mapping — what goes where

| Blog section             | Source                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Title, subtitle          | LLM-generated from `topic` + first angle statement                                       |
| Hero image               | Slide 1 or 2 image from `angle_0/images/slide_01.jpg` (first non-colour slide)           |
| Intro paragraph          | `synthesis.summary` (first 2 sentences) + LLM expansion                                  |
| Background section       | `synthesis.key_points` expanded into prose by LLM                                        |
| Key findings subsections | One per key point — LLM prose +`[Source](url)` citations from `evidence`              |
| Pull quotes              | `stat_value` slides from any angle — displayed as `> **stat_value** — stat_label`    |
| Angle sections (×3)     | Each angle: LLM prose using slide titles/bodies + angle image (slide 2–4 of that angle)   |
| Image captions           | `image_assets[n].source` → "Photo via Pexels" / "Photo via DuckDuckGo" / "Illustration" |
| Cited articles section   | All evidence with real URLs — title, snippet, source domain                               |
| LLM-only callout         | If all evidence is `source_type: llm_knowledge` — yellow callout box in HTML            |
| Tags / hashtags          | From `carousel.json` hashtags of angle_0                                                 |
| Conclusion               | LLM-generated from `synthesis.implications`                                              |

---

### Prompt template

**File:** `backend/core/prompts/templates/blog_post.txt`

```
You are a senior journalist and content strategist. Write a complete, engaging blog article.
The article will be published on Medium, Substack, and Blogger with real images already embedded.
Your output is ONLY the prose body sections — image placement markers and citation blocks are injected by code, not you.

TOPIC: {topic}
DATE: {current_date}
EMOTIONAL TONE: {primary_emotional_hook}

RESEARCH SUMMARY:
{research_summary}

KEY POINTS (expand each into a rich paragraph):
{key_points_block}

CONTRADICTIONS / NUANCE:
{contradictions_block}

ANGLE 1 — {angle_1_statement}
Slides content: {angle_1_slides}

ANGLE 2 — {angle_2_statement}
Slides content: {angle_2_slides}

ANGLE 3 — {angle_3_statement}
Slides content: {angle_3_slides}

IMPLICATIONS:
{implications_block}

---

Write these sections and NOTHING else. Return valid Markdown. No preamble, no "here is the article".

## [TITLE]
(One punchy, SEO-optimised title for the topic. 8-12 words.)

## [SUBTITLE]
(One sentence that creates urgency or curiosity. No full stop.)

## [INTRO]
(2-3 sentences: the hook. Why this matters right now. Do not repeat the title.)

## [BACKGROUND]
(2-3 paragraphs: context, history, what most people get wrong.)

## [FINDING: {key_point_1_short}]
(1-2 paragraphs expanding key point 1 with specific claims.)

## [FINDING: {key_point_2_short}]
(1-2 paragraphs expanding key point 2.)

## [FINDING: {key_point_3_short}]
(1-2 paragraphs expanding key point 3.)

## [ANGLE: {angle_1_heading}]
(2-3 paragraphs exploring angle 1. Use the slide content as your evidence base.)

## [ANGLE: {angle_2_heading}]
(2-3 paragraphs exploring angle 2.)

## [ANGLE: {angle_3_heading}]
(2-3 paragraphs exploring angle 3.)

## [IMPLICATIONS]
(2 paragraphs: so what? What should the reader do or think differently? Be direct.)

## [CONCLUSION]
(2-3 sentences: memorable close. Reinforce the main thesis. End with a question or call to action.)

RULES:
- 1100-1600 words total
- Tone must match: {primary_emotional_hook}
- No bullet lists in prose sections — paragraphs only
- Do NOT write "[IMAGE]", "[CITATION]" or any placeholder markers — those are injected by code
- Do NOT mention carousel, slides, or Instagram
- Bold key facts and statistics inline where appropriate
```

---

### Step-by-Step Implementation

#### Step 1 — Prompt template file

Create `backend/core/prompts/templates/blog_post.txt` as above.

#### Step 2 — `blog_post_generator.py` (new orchestrator)

**File:** `backend/core/orchestrators/content/blog_post_generator.py`

This module has two responsibilities:

1. Call the LLM to generate prose sections
2. Assemble the final Markdown and HTML by injecting images, citations, and pull-quotes into the prose

```python
import json, re
from pathlib import Path
from dataclasses import dataclass
from core.orchestration.contracts import ContentRequest, ResearchSynthesis
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.tools.metadata_helper import get_llm_metadata_block
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)

@dataclass
class BlogAssets:
    """All structured data needed to assemble the blog post."""
    topic: str
    synthesis: ResearchSynthesis
    evidence: list[dict]           # from research_result.json
    all_angle_slides: list[dict]   # [{"angle": {...}, "slides": [...], "image_assets": [...]}]
    run_id: str
    outputs_root: Path
    is_llm_only: bool              # True if all evidence is source_type==llm_knowledge


def _pick_section_images(assets: BlogAssets) -> list[dict]:
    """
    Return a list of image dicts for each major section.
    Picks the best real image from each angle's image_assets.
    Falls back to the PNG screenshot for colour-only slides.
    Format: {"local_path": str, "url": str, "caption": str, "alt": str}
    """
    images = []
    for item in assets.all_angle_slides:
        angle = item["angle"]
        image_assets = item.get("image_assets", [])
        slides = item.get("slides", [])

        # Find first non-colour image asset
        real = next((a for a in image_assets if a.get("source") != "colour" and a.get("local_raw_path")), None)

        if real:
            slide_num = real["slide_number"]
            source_label = "Photo via Pexels" if real["source"] == "pexels" else "Photo via DuckDuckGo"
            # Find corresponding slide title for alt text
            slide = next((s for s in slides if s["slide_number"] == slide_num), {})
            images.append({
                "local_path": real["local_raw_path"],
                "original_url": real.get("original_url", ""),
                "caption": source_label,
                "alt": slide.get("title", assets.topic),
                "angle_index": item["angle_index"],
                "slide_number": slide_num,
            })
        else:
            # Fall back to first PNG screenshot of this angle
            png_dir = assets.outputs_root / assets.run_id / "content" / f"angle_{item['angle_index']}" / "png"
            pngs = sorted(png_dir.glob("slide_*.png")) if png_dir.exists() else []
            if pngs:
                images.append({
                    "local_path": str(pngs[0]),
                    "original_url": "",
                    "caption": "Content Studio AI",
                    "alt": angle.get("statement", assets.topic)[:80],
                    "angle_index": item["angle_index"],
                    "slide_number": 0,
                })

    return images


def _build_citations_block_md(evidence: list[dict]) -> str:
    """Build a '## References' section for Markdown."""
    real = [e for e in evidence if e.get("url") and not e["url"].startswith("llm://")]
    if not real:
        return ""
    lines = ["## References\n"]
    for i, e in enumerate(real[:15], 1):
        title = e.get("title") or "Source"
        url = e["url"]
        snippet = (e.get("snippet") or "")[:100]
        lines.append(f"{i}. **[{title}]({url})**  \n   {snippet}\n")
    return "\n".join(lines)


def _build_llm_callout_md() -> str:
    return (
        "> ⚠️ **Research Note:** This article was generated using LLM background knowledge "
        "rather than live web sources. The insights reflect the model's training data. "
        "Verify key claims independently before citing.\n"
    )


def _stat_pull_quotes(all_angle_slides: list[dict]) -> list[str]:
    """Extract stat slides as blockquote pull-quotes for Markdown."""
    quotes = []
    for item in all_angle_slides:
        for s in item.get("slides", []):
            if s.get("type") == "stat" and s.get("stat_value"):
                label = s.get("stat_label") or s.get("title") or ""
                quotes.append(f'> **{s["stat_value"]}** — {label}\n')
    return quotes[:4]   # max 4 pull-quotes across the article


def _assemble_markdown(prose: str, assets: BlogAssets, images: list[dict]) -> str:
    """
    Takes the raw LLM prose and splices in:
    - Hero image after the subtitle
    - Section images before each ANGLE section
    - Pull-quote stat callouts
    - Citations block
    - LLM callout if applicable
    """
    lines = prose.splitlines(keepends=True)
    result = []
    angle_img_idx = 0
    pull_quotes = _stat_pull_quotes(assets.all_angle_slides)
    pq_idx = 0

    for line in lines:
        result.append(line)

        # Insert hero image after subtitle line (first blockquote)
        if line.startswith("> ") and "hero_inserted" not in [x for x in result if x == "__hero__"]:
            if images:
                hero = images[0]
                img_url = hero.get("original_url") or f"http://localhost:8000/outputs/{assets.run_id}/content/angle_{hero['angle_index']}/images/slide_{hero['slide_number']:02d}.jpg"
                result.append(f"\n![{hero['alt']}]({img_url})\n*{hero['caption']}*\n\n")
                result.append("__hero__\n")   # sentinel (stripped later)

        # Insert section image before each ANGLE heading
        if re.match(r'^## \[ANGLE:', line) and angle_img_idx + 1 < len(images):
            angle_img_idx += 1
            img = images[angle_img_idx]
            img_url = img.get("original_url") or f"http://localhost:8000/outputs/{assets.run_id}/content/angle_{img['angle_index']}/images/slide_{img['slide_number']:02d}.jpg"
            result.append(f"\n![{img['alt']}]({img_url})\n*{img['caption']}*\n\n")

        # Inject a pull-quote after every FINDING section
        if re.match(r'^## \[FINDING:', line) and pq_idx < len(pull_quotes):
            result.append("\n" + pull_quotes[pq_idx])
            pq_idx += 1

    # Clean up sentinel
    result = [l for l in result if l.strip() != "__hero__"]

    # Append LLM callout or citations
    if assets.is_llm_only:
        result.append("\n\n---\n\n" + _build_llm_callout_md())
    else:
        citations = _build_citations_block_md(assets.evidence)
        if citations:
            result.append("\n\n---\n\n" + citations)

    return "".join(result)


def _markdown_to_html(md: str, topic: str, tags: list[str]) -> str:
    """
    Convert the assembled Markdown to a styled standalone HTML document.
    Uses Python's markdown library (already available in most environments).
    Falls back to a simple regex-based converter if markdown is not installed.
    """
    try:
        import markdown as md_lib
        body_html = md_lib.markdown(md, extensions=["extra", "tables", "toc"])
    except ImportError:
        # Minimal fallback — wrap in <p> tags
        body_html = "<p>" + md.replace("\n\n", "</p><p>") + "</p>"

    tags_html = " ".join(f'<span class="tag">#{t}</span>' for t in tags[:12])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{topic}</title>
  <style>
    :root {{
      --text: #1a1a1a; --muted: #555; --accent: #7c3aed;
      --bg: #fff; --border: #e5e7eb; --callout-bg: #fef9c3;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{ font-family: Georgia, 'Times New Roman', serif; background: var(--bg);
            color: var(--text); line-height: 1.75; max-width: 760px;
            margin: 48px auto; padding: 0 24px; }}
    h1 {{ font-size: 2.4rem; font-weight: 700; line-height: 1.2;
          margin-bottom: 12px; }}
    h2 {{ font-size: 1.5rem; font-weight: 600; margin: 40px 0 12px;
          border-bottom: 2px solid var(--accent); padding-bottom: 4px; }}
    h3 {{ font-size: 1.15rem; font-weight: 600; margin: 28px 0 8px;
          color: var(--accent); }}
    p {{ margin-bottom: 20px; font-size: 1.08rem; }}
    blockquote {{ border-left: 4px solid var(--accent); padding: 12px 20px;
                  margin: 24px 0; background: #f5f3ff; border-radius: 4px;
                  font-style: italic; color: #374151; }}
    blockquote strong {{ font-size: 1.4rem; color: var(--accent); }}
    img {{ width: 100%; max-height: 480px; object-fit: cover;
           border-radius: 8px; margin: 24px 0 8px; display: block; }}
    em {{ display: block; text-align: center; font-size: 0.85rem;
          color: var(--muted); margin-bottom: 20px; }}
    a {{ color: var(--accent); text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    .callout {{ background: var(--callout-bg); border: 1px solid #fde68a;
                border-radius: 6px; padding: 16px 20px; margin: 24px 0;
                font-size: 0.95rem; }}
    .references ol {{ padding-left: 20px; }}
    .references li {{ margin-bottom: 12px; font-size: 0.92rem; }}
    .tags {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }}
    .tag {{ display: inline-block; background: #f3f4f6; color: var(--muted);
             padding: 3px 10px; border-radius: 12px; font-size: 0.8rem;
             margin: 4px; font-family: sans-serif; }}
    .footer {{ margin-top: 32px; font-size: 0.8rem; color: var(--muted);
               text-align: center; font-family: sans-serif; }}
    @media (max-width: 600px) {{
      body {{ padding: 0 16px; margin: 24px auto; }}
      h1 {{ font-size: 1.8rem; }}
    }}
  </style>
</head>
<body>
  {body_html}
  <div class="tags">{tags_html}</div>
  <p class="footer">Originally produced by <strong>Content Studio AI</strong></p>
</body>
</html>"""


async def generate_blog_post(assets: BlogAssets) -> tuple[str, str]:
    """
    Generate blog post. Returns (markdown_str, html_str).
    """
    synthesis = assets.synthesis
    all_angle_slides = assets.all_angle_slides

    if not all_angle_slides:
        raise ValueError("No angle slides provided")

    # Build prompt variables
    key_points_block = "\n".join(f"- {p}" for p in synthesis.key_points)
    implications_block = "\n".join(synthesis.implications) if synthesis.implications else "Not specified"
    contradictions_block = "\n".join(synthesis.contradictions) if synthesis.contradictions else "None identified"

    def _slides_summary(slides: list[dict]) -> str:
        parts = []
        for s in slides:
            if s.get("type") in ("cta", "engage"):
                continue
            title = s.get("title", "")
            body = s.get("body", "")
            bullets = " | ".join(s.get("bullets", []))
            stat = f" [{s['stat_value']}]" if s.get("stat_value") else ""
            parts.append(f"• {title}{stat}: {body} {bullets}".strip())
        return "\n".join(parts)

    angles = [item["angle"] for item in all_angle_slides]
    slides_per_angle = [item.get("slides", []) for item in all_angle_slides]

    user_prompt = load_prompt(
        "blog_post",
        topic=assets.topic,
        current_date=get_llm_metadata_block(),
        primary_emotional_hook=angles[0].get("emotional_hook", "curiosity"),
        research_summary=synthesis.summary,
        key_points_block=key_points_block,
        contradictions_block=contradictions_block,
        implications_block=implications_block,
        angle_1_statement=angles[0].get("statement", "") if len(angles) > 0 else "",
        angle_2_statement=angles[1].get("statement", "") if len(angles) > 1 else "",
        angle_3_statement=angles[2].get("statement", "") if len(angles) > 2 else "",
        angle_1_slides=_slides_summary(slides_per_angle[0]) if len(slides_per_angle) > 0 else "",
        angle_2_slides=_slides_summary(slides_per_angle[1]) if len(slides_per_angle) > 1 else "",
        angle_3_slides=_slides_summary(slides_per_angle[2]) if len(slides_per_angle) > 2 else "",
        key_point_1_short=(synthesis.key_points[0][:50] if synthesis.key_points else ""),
        key_point_2_short=(synthesis.key_points[1][:50] if len(synthesis.key_points) > 1 else ""),
        key_point_3_short=(synthesis.key_points[2][:50] if len(synthesis.key_points) > 2 else ""),
    )

    llm = await LLMFactory.get_client()
    response = await llm.generate(
        prompt=user_prompt,
        system_prompt=get_system_prompt("content"),
    )
    prose = response.content

    # Collect images
    section_images = _pick_section_images(assets)

    # Assemble Markdown
    markdown_str = _assemble_markdown(prose, assets, section_images)

    # Get hashtags from first angle's carousel.json
    tags: list[str] = []
    carousel_path = assets.outputs_root / assets.run_id / "content" / "angle_0" / "carousel.json"
    if carousel_path.exists():
        carousel_data = json.loads(carousel_path.read_text())
        tags = carousel_data.get("hashtags", [])

    # Convert to HTML
    html_str = _markdown_to_html(markdown_str, assets.topic, tags)

    return markdown_str, html_str
```

#### Step 3 — Wire into `ContentOrchestrator`

**File:** `backend/core/orchestrators/content/orchestrator.py`

Collect slides and image_assets per angle during the loop, then call the generator after all angles complete:

```python
# Add before the for loop:
all_slides_per_angle: list[list[dict]] = []
all_image_assets_per_angle: list[list[dict]] = []

# Inside the loop, after result = await self._graph.ainvoke(initial):
all_slides_per_angle.append(result.get("slides", []))
all_image_assets_per_angle.append(result.get("image_assets", []))

# After the for loop, before building ContentResponse:
if request.research_summary and angles_processed:
    try:
        import json as _json
        from core.orchestrators.content.blog_post_generator import (
            generate_blog_post, BlogAssets
        )
        from core.orchestration.contracts import ResearchSynthesis

        synthesis = ResearchSynthesis(
            summary=request.research_summary,
            key_points=request.key_points,
        )

        # Load evidence from research_result.json written by the research stage
        research_result_path = _OUTPUTS_ROOT / run_id / "research" / "research_result.json"
        evidence = []
        if research_result_path.exists():
            data = _json.loads(research_result_path.read_text())
            evidence = data.get("evidence", [])

        is_llm_only = all(
            e.get("source_type") == "llm_knowledge" for e in evidence
        ) if evidence else True

        angle_slide_bundles = [
            {
                "angle": request.selected_angles[idx],
                "angle_index": idx,
                "slides": all_slides_per_angle[idx],
                "image_assets": all_image_assets_per_angle[idx],
            }
            for idx in angles_processed
        ]

        assets = BlogAssets(
            topic=request.topic,
            synthesis=synthesis,
            evidence=evidence,
            all_angle_slides=angle_slide_bundles,
            run_id=run_id,
            outputs_root=_OUTPUTS_ROOT,
            is_llm_only=is_llm_only,
        )

        md_str, html_str = await generate_blog_post(assets)

        manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
        manager.save_markdown(".", "blog_post.md", md_str)
        manager.save_text(".", "blog_post.html", html_str)
        logger.info("blog_post_generated", run_id=run_id, md_chars=len(md_str), html_chars=len(html_str))

    except Exception as e:
        logger.error("blog_post_generation_failed", run_id=run_id, error=str(e))
        # Non-fatal — carousel pipeline still succeeds
```

#### Step 4 — Add `markdown` to dependencies

**File:** `backend/pyproject.toml`

```toml
dependencies = [
  ...
  "markdown>=3.5",
]
```

Run `uv sync` after.

#### Step 5 — API endpoints

**File:** `backend/apps/api/v1/content.py`

```python
from fastapi.responses import PlainTextResponse, HTMLResponse

@router.get("/{run_id}/blog-post", response_class=PlainTextResponse)
async def get_blog_post_markdown(run_id: str) -> str:
    path = Path("outputs") / run_id / "blog_post.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post not found for this run")
    return path.read_text(encoding="utf-8")

@router.get("/{run_id}/blog-post.html", response_class=HTMLResponse)
async def get_blog_post_html(run_id: str) -> str:
    path = Path("outputs") / run_id / "blog_post.html"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Blog post HTML not found for this run")
    return path.read_text(encoding="utf-8")
```

Add `blog_post_path: str = ""` and `blog_post_html_path: str = ""` to `ContentResponse` in `contracts.py`.

**`lib/api.ts`:**

```ts
getBlogPostMd:   (runId: string) =>
  fetch(`${BASE}/content/${runId}/blog-post`).then(r => r.text()),
getBlogPostHtml: (runId: string) =>
  fetch(`${BASE}/content/${runId}/blog-post.html`).then(r => r.text()),
```

#### Step 6 — Frontend: export buttons in Stage 3

**File:** `frontend/app/pipeline/page.tsx`

Add two download buttons below the carousel navigation bar, visible when content is done:

```tsx
{contentResult && stages.content.status === "done" && runId && (
  <div className="flex items-center gap-3 pt-2">
    <button
      onClick={async () => {
        const md = await api.getBlogPostMd(runId);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
        a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.md`;
        a.click();
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700
                 text-zinc-400 text-xs font-semibold hover:border-violet-500/50
                 hover:text-violet-400 transition-all"
    >
      <FileText size={14} /> Export Markdown
    </button>
    <button
      onClick={async () => {
        const html = await api.getBlogPostHtml(runId);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.html`;
        a.click();
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700
                 text-zinc-400 text-xs font-semibold hover:border-violet-500/50
                 hover:text-violet-400 transition-all"
    >
      <Globe size={14} /> Export HTML
    </button>
  </div>
)}
```

---

### Output file structure (updated)

```
outputs/<run_id>/
├── research/
│   ├── research_result.json
│   ├── evidence.json
│   └── synthesis.md
├── angles/
│   └── angles.json
├── content/
│   ├── angle_0/
│   │   ├── slides.json
│   │   ├── image_assets.json
│   │   ├── images/              ← real JPGs used as blog images
│   │   └── png/                 ← carousel PNGs
├── blog_post.md        ← paste into Medium / Substack / Ghost
└── blog_post.html      ← paste into Wix / Blogger, or open in browser
```

---

### Markdown template — annotated example output

```markdown
# You Were Never the Customer: How Indian Cartoon Channels Engineered Your Nostalgia

> The "Golden Era" of Indian cartoons wasn't generosity — it was a calculated market experiment.

The shows you loved weren't made for you. Between 1995 and 2010, Indian children had
unprecedented access to sophisticated Western animation...

---

![The Illusion of the Golden Era](http://localhost:8000/outputs/.../images/slide_02.jpg)
*Photo via Pexels*

## Background

Between 1995 and 2010, channels like Cartoon Network, Nickelodeon, Disney XD, and Pogo...

> **1995–2010** — The window during which Western studios licensed premium content cheaply
> to build brand loyalty in India's emerging market.

## Key Findings

### India was always the production hub, never the priority market
...prose with citations [Is The Indian Animation Industry Struggling?](https://motionvillee.com/...) ...

### The decline was structural, not cultural
...

![Photo via DuckDuckGo](http://localhost:8000/outputs/.../images/slide_06.jpg)
*Photo via DuckDuckGo*

## The Extraction Model: You Were the Product, Not the Audience

...

## What This Means

...

## Conclusion

...

---

## References

1. **[Is The Indian Animation Industry Struggling or Soaring?](https://motionvillee.com/...)**
   The Indian animation industry is primarily focused on creating content for other countries...

2. **[40 Best Cartoon Network Shows](https://buzzfeed.com/...)**
   ...

---

**Tags:** #CartoonNetwork #90sKids #IndianTelevision ...
```

---

### Files changed / created

| File                                                          | Action                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `backend/core/prompts/templates/blog_post.txt`              | NEW — LLM prose prompt                                                                           |
| `backend/core/orchestrators/content/blog_post_generator.py` | NEW —`BlogAssets`, `generate_blog_post()`, `_assemble_markdown()`, `_markdown_to_html()` |
| `backend/core/orchestrators/content/orchestrator.py`        | MODIFY — collect image_assets per angle, call generator after loop                               |
| `backend/core/orchestration/contracts.py`                   | MODIFY — add `blog_post_path`, `blog_post_html_path` to `ContentResponse`                  |
| `backend/apps/api/v1/content.py`                            | MODIFY — add 2 GET endpoints                                                                     |
| `backend/pyproject.toml`                                    | MODIFY — add `markdown>=3.5` dependency                                                        |
| `frontend/lib/api.ts`                                       | MODIFY — add `getBlogPostMd`, `getBlogPostHtml`                                              |
| `frontend/app/pipeline/page.tsx`                            | MODIFY — add "Export Markdown" + "Export HTML" buttons in Stage 3                                |

---

### Verification

1. Run a full pipeline on any topic with web research.
2. Confirm `outputs/<run_id>/blog_post.md` and `blog_post.html` both exist.
3. `curl http://localhost:8000/api/v1/content/<run_id>/blog-post` → raw Markdown with `![alt](http://...)` image tags and `[Source](url)` citations.
4. `curl http://localhost:8000/api/v1/content/<run_id>/blog-post.html` → styled HTML with `<img src="...">` tags rendering properly.
5. Open the HTML in a browser — images load, blockquote pull-quotes render violet, references are clickable.
6. Paste Markdown into Medium's import — title, headings, images, bold text all parse correctly.
7. Re-run in **LLM-only mode** — Markdown contains the yellow ⚠️ callout instead of References, images still present from slide screenshots, article still generates without errors.
8. Confirm no external image CDN dependencies — all `<img src>` URLs either use `localhost:8000/outputs/...` (local preview) or the `original_url` from `image_assets.json` (Pexels CDN / DDGS direct).

---

*Plans written: 2026-05-24*
