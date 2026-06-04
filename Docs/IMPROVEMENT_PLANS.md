# Implementation Plans — Remaining Items

Items completed: **1** (Image Dedup), **3** (Angle Re-generation), **4** (Research Progress Bar), **7** (Blog Post Export).
Item **2** (Hashtag Quality Control) deliberately skipped — quality is already good in practice.

---

## 5. Multi-Topic Batch Mode

### Problem

The API and CLI accept one topic per call. Producing a 10-post content calendar requires 10 sequential invocations (5–15 minutes total). There is no way to submit a batch and have them run concurrently.

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
    max_concurrent: int = Field(default=3, ge=1, le=5)

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
                result = await run_pipeline(PipelineRequest(topic=topic, mode=request.mode, ...))
                return BatchTopicResult(topic=topic, run_id=result.run_id, status=result.status, ...)
            except Exception as e:
                return BatchTopicResult(topic=topic, run_id="", status="failed", errors=[str(e)])

    batch_id = str(uuid.uuid4())
    results = await asyncio.gather(*[run_one(t) for t in request.topics])
    return BatchPipelineResponse(batch_id=batch_id, total=len(results), ...)
```

Move `BatchPipelineRequest`, `BatchTopicResult`, `BatchPipelineResponse` to `schemas.py`.
Also move inline `PipelineRequest`/`PipelineResponse` from `pipeline.py` to `schemas.py` (known tech debt).

**Frontend — `/pipeline/batch` page:**

- Textarea: one topic per line
- Mode / freshness / angle-mode selectors (same as single pipeline)
- "Run Batch" button → calls `api.runBatch()`
- Results table: topic, status badge (✅/❌), output path link

**`lib/api.ts`:**
```ts
runBatch: (body: BatchPipelineBody) => post<BatchPipelineResponse>("/pipeline/batch", body),
```

**Files changed:**

| File | Change |
|---|---|
| `backend/apps/api/v1/pipeline.py` | Add `/batch` endpoint |
| `backend/apps/api/v1/schemas.py` | Add 3 batch models + move `PipelineRequest/Response` |
| `frontend/lib/api.ts` | Add `runBatch` |
| `frontend/app/pipeline/batch/page.tsx` | New batch input page |

**Verification:** Submit 3 topics with `max_concurrent=2`. Confirm logs show ≤2 simultaneous `content_orchestrator_started`. Confirm all 3 produce output in `outputs/<run_id>/`.

---

## 6. Slide Editor UI

### Problem

After content is generated the user can only view slides. There is no way to edit text, swap an image, or regenerate a single slide — the only option is re-running the entire pipeline.

### Solution

#### Backend — two new endpoints

**`POST /api/v1/content/{run_id}/slides/{slide_number}/regenerate`**

Uses existing `slide_regen.txt` prompt. Re-renders the slide HTML → PNG. Returns updated slide + new PNG path.

```python
class SlideRegenRequest(BaseModel):
    angle_index: int
    topic: str
    angle_statement: str
    emotional_hook: str
    prev_slide: dict | None = None
    next_slide: dict | None = None
    feedback: str = ""

class SlideRegenResponse(BaseModel):
    slide: dict
    png_path: str
    error: str | None = None
```

**`POST /api/v1/content/{run_id}/slides/{slide_number}/swap-image`**

Searches Pexels/DDGS, downloads best result, re-renders PNG. Returns updated image_asset + new PNG path.

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

Both endpoints read `slides.json`, update the relevant slide, write back to disk, re-screenshot that one slide only.

#### Frontend — inline editor on carousel preview

**`InstagramPreview.tsx`** — pencil icon on slide hover:
- Click → edit mode: `title`/`body` become `<textarea>`, "Search new image" opens mini image panel, "Regenerate with AI" opens feedback input
- Save / Cancel buttons

**`lib/api.ts`:**
```ts
regenerateSlide: (runId: string, slideNum: number, body: SlideRegenBody) =>
  post<SlideRegenResponse>(`/content/${runId}/slides/${slideNum}/regenerate`, body),
swapSlideImage: (runId: string, slideNum: number, body: ImageSwapBody) =>
  post<ImageSwapResponse>(`/content/${runId}/slides/${slideNum}/swap-image`, body),
```

On success: update `contentResult.carousel_paths[angleIdx][slideIdx]` in Redux → carousel preview re-renders.

**Files changed:**

| File | Change |
|---|---|
| `backend/apps/api/v1/content.py` | Add 2 endpoints |
| `backend/apps/api/v1/schemas.py` | Add 4 models |
| `backend/core/orchestrators/content/carousel_generator.py` | Extract `render_and_screenshot_single_slide()` helper |
| `backend/core/orchestrators/content/image_fetcher.py` | Extract `fetch_single_slide_image()` helper |
| `frontend/lib/api.ts` | Add `regenerateSlide`, `swapSlideImage` |
| `frontend/components/pipeline/InstagramPreview.tsx` | Add edit overlay + inline editor |
| `frontend/app/pipeline/page.tsx` | Pass `runId` + `editingSlide` state to `InstagramPreview` |

**Verification:**
1. Generate a carousel. Hover a slide — pencil appears.
2. Edit title → Save → PNG re-renders with new text.
3. "Regenerate with AI" + feedback → new slide content appears.
4. "Search new image" → image swaps on carousel preview.
5. Navigate away and back — edits persist (stored in Redux `contentResult`).

---

*Last updated: 2026-05-31*
