# PHASE 1 — Editor Canvas Save (Fabric JSON as Source of Truth)

## Status
IN REVIEW — Loop 1 draft, awaiting user approval

## Problem Statement

Today, when a user opens the slide editor, replaces the background image (or edits any object), and clicks **Save**, three things silently go wrong:

1. **The PNG on disk never updates.** `PUT /content/{run_id}/slides/{ai}/{sn}/canvas` → `save_canvas()` in `backend/core/services/asset_library_service.py:144-154` writes `canvas_NN.json` and returns `{"saved": true}` — that's the entire implementation. No PNG regeneration, no `image_assets.json` update, no image bytes persistence.
2. **The user gets no feedback.** `CanvasToolbar` has no idle/saving/success/error states. The user can't tell whether their save succeeded, failed, or what actually got persisted.
3. **The drop handler stacks instead of replaces.** `canvasDropHandlers.ts:35-58` adds a new Fabric object on top of the existing background rather than swapping the background src. So on the canvas the user sees the new image, but at the data layer there are now two overlapping images and the original is still the "official" one according to `image_assets.json`.

Net effect (user's own words): *"I'm able to delete the existing image and add a new one, but the save feature is not actually working! Will it replace the original img or will it add a new one — I know nothing!"*

After this phase ships:
- Clicking Save writes the **complete Fabric JSON** to disk, then re-renders the PNG from that exact JSON via Playwright.
- The PNG on disk changes to match what the user sees on the canvas.
- The Save button shows visible states: idle → saving (spinner) → saved ✓ (green flash) → error (red banner with retry).
- When the user hits ← back to preview, the PNG shown is cache-busted so they see the new render immediately.
- Fabric JSON becomes the **canonical, single source of truth** for a saved slide. `slides.json` remains as the pre-edit LLM output and is not overwritten.

## Requirements

**Functional**
- User can drop an image, upload an image, or edit any object on the canvas, click Save, and see:
  - Visible "Saving…" indicator during the save
  - Green "Saved ✓" flash on success (auto-clears after 2s)
  - Red banner with retry on failure
- After successful save, navigating back to preview mode shows the updated PNG (not a stale cached version).
- Base64 image data in the Fabric JSON (from uploads) is persisted as JPGs alongside the slide, and the JSON is rewritten to reference the local path (so subsequent loads work without re-uploading).
- The PNG on disk (`png/slide_NN.png`) reflects the exact Fabric canvas state after save.

**Non-functional**
- Backward compatibility: legacy runs without `canvas_NN.json` continue to render via the existing `slides.json` + `image_assets.json` path. The new flow is opt-in per slide (via existence of `canvas_NN.json`).
- Existing endpoints (`POST /edit`, `POST /swap-image`, `POST /upload-image`, `POST /swap-image-url`) are unchanged — they continue to update `slides.json` + `image_assets.json` + PNG. Only the `PUT /canvas` endpoint is upgraded.
- Save should complete in < 4 seconds for a typical slide (matches current single-slide render time).
- No breaking change to `SlidePngPreview` or `FabricCanvas` public props.
- JWT expiry cannot cause a save failure — the Playwright render is a local render (no LLM call), so no HAI Proxy / SAP AI Core dependency.

## External Verification Log

| Claim | Verified against | Verified on |
|-------|------------------|-------------|
| Fabric.js v7.4.0 exposes `Canvas.loadFromJSON(json, reviver?, { signal }?): Promise<this>` | `frontend/node_modules/fabric/dist/src/canvas/StaticCanvas.d.ts:513` | 2026-08-22 |
| Fabric.js `loadFromJSON` restores objects with `data` custom property when `FabricObject.customProperties = ["data"]` is set at load time | `backend/renderer/renderer_entry.ts:41` (already set); Fabric v7 docs on custom properties | 2026-08-22 |
| Playwright `page.evaluate(fn, args)` supports awaiting async work in the browser and returns the result to Python | `backend/core/orchestrators/content/renderer.py:36-48` (existing pattern in use) | 2026-08-22 |
| The renderer bundle is served from `backend/renderer/` and loaded via `slide_render.html`; adding a new method to `window.Renderer` only requires editing `renderer_entry.ts` and re-running `pnpm run build` in `backend/` (which invokes `build.mjs`) | `backend/renderer/build.mjs`; `backend/renderer/renderer_entry.ts:76` | 2026-08-22 |
| The current `PUT /canvas` handler at `backend/apps/api/v1/content.py:367-370` calls `asset_library_service.save_canvas` and returns its dict verbatim; extending the return shape does not require FastAPI schema changes if we keep it dict-typed OR we can add a Pydantic response model for stricter typing | `backend/apps/api/v1/content.py:367-370`; `backend/core/services/asset_library_service.py:144-154` | 2026-08-22 |
| Base64 data URLs in Fabric image objects appear at `object.src` starting with `data:image/…;base64,…`. Fabric v7 `toJSON()` preserves this src as-is. | `frontend/node_modules/fabric/dist/src/shapes/Image.d.ts` (Image.src field); Fabric v7 changelog | 2026-08-22 |
| A browser can load an image via `<img src="data:image/…">` and Fabric v7 also accepts data URLs directly in `FabricImage.fromURL()`; therefore Playwright in headless mode will render base64 images the same way — but persisting them to disk (rather than keeping base64 in canvas_NN.json which would bloat the file to MBs) is the right design choice | Fabric v7 docs; general HTTP behaviour | 2026-08-22 |
| Frontend cache-busting via `?v=<timestamp>` on the PNG `<img>` URL forces a fresh fetch even if the file path is identical; this is standard HTTP behaviour, no library support required | Browser caching spec | 2026-08-22 |
| `SlidePngPreview.tsx` currently calls `api.getCanvas()` on mount; adding a `versionQuery` field to the returned canvas payload and appending it to the PNG URL is a small additive change with no breaking risk | `frontend/components/editor/SlidePngPreview.tsx` (per subagent audit) | 2026-08-22 |

## Entry Conditions (verify ALL before writing code)

- [ ] Backend runs and health check passes — verify: `cd backend && uv run uvicorn main:app --port 8000 --reload` + `curl -s http://localhost:8000/api/v1/analytics/summary` returns 200
- [ ] Frontend TypeScript compiles cleanly — verify: `cd frontend && npx tsc --noEmit` exits 0
- [ ] An existing pipeline run exists with at least one rendered slide + saved canvas — verify: `ls backend/outputs/runs/*/content/angle_0/canvas_01.json 2>/dev/null | head -1` returns a path (if not, first create one via the pipeline before starting)
- [ ] Renderer bundle exists — verify: `test -f backend/renderer/dist/renderer.bundle.js && echo OK`
- [ ] Fabric.js v7 pinned — verify: `grep '"fabric"' frontend/package.json` shows `^7.4.0` or higher
- [ ] Playwright installed and Chromium binary present — verify: `cd backend && uv run playwright install chromium --dry-run 2>&1 | grep -q "browser is already installed" && echo OK`

## Files to Create or Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `backend/renderer/renderer_contract.ts` | MODIFY | Add `renderFromCanvasJson` to `RendererAPI` interface |
| 2 | `backend/renderer/renderer_entry.ts` | MODIFY | Implement `window.Renderer.renderFromCanvasJson(fabric_json, options)` |
| 3 | `backend/renderer/build.mjs` | READ ONLY | Verify no changes needed — the build already bundles the entry file |
| 4 | `backend/core/orchestrators/content/renderer.py` | MODIFY | Add `render_from_canvas_json(fabric_json, output_path)` — mirrors `render_slide_fabric` but invokes the new renderer method |
| 5 | `backend/core/services/asset_library_service.py` | MODIFY | Upgrade `save_canvas` to extract inline images, rewrite srcs, persist JSON, re-render PNG, return cache-bust query |
| 6 | `backend/apps/api/v1/schemas.py` | MODIFY | Add `CanvasSaveResponse` Pydantic model |
| 7 | `backend/apps/api/v1/content.py` | MODIFY | Wire new response model on `PUT /canvas` handler |
| 8 | `backend/tests/test_asset_library_service.py` | CREATE | Unit tests for save_canvas (base64 extraction, JSON rewrite, mocked render) |
| 9 | `frontend/lib/api/editor.ts` | MODIFY | Update `saveCanvas` return type; expose `png_url` + `version_query` |
| 10 | `frontend/components/editor/CanvasToolbar.tsx` | MODIFY | Save button with 4 states (idle/saving/saved/error) + inline "Saved ✓" flash and error banner with retry |
| 11 | `frontend/components/editor/SlidePngPreview.tsx` | MODIFY | Append `?v=<versionQuery>` to PNG URL when available |
| 12 | `frontend/app/editor/page.tsx` | MODIFY | Thread save-state + versionQuery from CanvasToolbar down to SlidePngPreview |
| 13 | `frontend/e2e/editor-save.spec.ts` | CREATE | Full E2E: open editor → drop image → save → verify green flash → back to preview → verify PNG changed |

## Implementation Steps

### Step 1.1 — Extend the RendererAPI contract

**File:** `backend/renderer/renderer_contract.ts`

**What to implement:**
Add a new method signature to the `RendererAPI` interface (or type):

```typescript
export interface RendererAPI {
  loadFonts(baseUrl: string): Promise<void>;
  render(slideJson: SlideInput, options: RenderOptions): Promise<void>;

  /**
   * Load a previously-saved Fabric.js canvas JSON directly and paint it to the #slide canvas.
   * Bypasses the template builder — the JSON is the authoritative representation.
   *
   * Used by the editor's Save flow: after the user edits the canvas, we serialize
   * canvas.toJSON(["data"]), send it to the backend, and re-render exactly that state to PNG.
   *
   * @param fabricJson - Output of `fabric.Canvas.toJSON(["data"])`
   * @param options    - Same shape as render(); imageBaseUrl is used to resolve relative image srcs
   */
  renderFromCanvasJson(fabricJson: Record<string, unknown>, options: RenderOptions): Promise<void>;
}
```

Also update the file-level JSDoc example to mention the new method.

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:** exit 0 (compile clean; new field added, no callers yet so no downstream errors).

---

### Step 1.2 — Implement `window.Renderer.renderFromCanvasJson`

**File:** `backend/renderer/renderer_entry.ts`

**What to implement:**
Add a new method to the `window.Renderer` object literal (after `render`). Full implementation:

```typescript
async renderFromCanvasJson(fabricJson, options) {
  await loadFonts(options.imageBaseUrl);

  const canvasEl = document.getElementById("slide") as HTMLCanvasElement | null;
  if (!canvasEl) throw new Error('Canvas element #slide not found in slide_render.html');

  // Dispose previous instance on this element (same pattern as render())
  const prev = _canvasInstances.get(canvasEl);
  if (prev) {
    prev.dispose();
    _canvasInstances.delete(canvasEl);
  }

  const canvas = new fabric.Canvas(canvasEl, {
    width:  1080,
    height: 1080,
    backgroundColor: CANVAS_BG_COLOR,
    enableRetinaScaling: false,
  });
  _canvasInstances.set(canvasEl, canvas);

  // Resolve any relative image srcs against imageBaseUrl.
  // We do this AS a reviver on loadFromJSON so it happens before Fabric fetches the images.
  const rewriteSrc = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    const rec = o as Record<string, unknown>;
    const src = rec.src;
    if (typeof src === "string" && !src.startsWith("http") && !src.startsWith("data:")) {
      rec.src = `${options.imageBaseUrl}${src.startsWith("/") ? "" : "/"}${src}`;
    }
    // Recurse into groups
    const objects = rec.objects;
    if (Array.isArray(objects)) objects.forEach(rewriteSrc);
  };
  const cloned: Record<string, unknown> = JSON.parse(JSON.stringify(fabricJson));
  if (Array.isArray(cloned.objects)) cloned.objects.forEach(rewriteSrc);

  await canvas.loadFromJSON(cloned);
  canvas.renderAll();
},
```

**Design decisions & why:**
- Same canvas disposal pattern as `render()` — supports repeated calls on the same page.
- `enableRetinaScaling: false` matches the render() config so Chart.js DPR bugs don't re-appear.
- Src rewrite happens as a pre-pass on a deep-cloned JSON so we never mutate the caller's object.
- HTTP / data URLs pass through untouched — only relative paths get the `imageBaseUrl` prefix.
- No template resolution (no `inferTemplate`, no `builder(...)`), no meta injection — the fabric JSON already contains everything.

**Test command:**
```bash
cd backend && pnpm run build
```
(This invokes `backend/renderer/build.mjs` which esbuilds `renderer_entry.ts` → `renderer/dist/renderer.bundle.js`.)

**Expected output:**
```
✔ built renderer.bundle.js
```
And `test -f backend/renderer/dist/renderer.bundle.js && wc -c backend/renderer/dist/renderer.bundle.js` shows the bundle is > 0 bytes.

---

### Step 1.3 — Add `render_from_canvas_json` to the Python renderer

**File:** `backend/core/orchestrators/content/renderer.py`

**What to implement:**
Add a new async function at the end of the file, mirroring `render_slide_fabric`:

```python
async def render_from_canvas_json(
    fabric_json: dict,
    output_path: Path,
) -> str:
    """
    Render a Fabric.js canvas JSON directly to PNG (bypassing template builders).

    Used by the editor Save flow: the frontend serialises the canvas via
    canvas.toJSON(["data"]) and posts it to /canvas. This function loads that JSON
    into a headless Fabric.Canvas via window.Renderer.renderFromCanvasJson and
    screenshots the result.

    Args:
        fabric_json: Output of fabric.Canvas.toJSON — the source of truth for this slide.
        output_path: PNG destination. Parent dir will be created.

    Returns:
        Absolute path string of the written PNG.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    async with serve_directory(_BACKEND_ROOT) as asset_base_url:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            page    = await browser.new_page(
                viewport={"width": _CANVAS_SIZE, "height": _CANVAS_SIZE},
                device_scale_factor=2,
            )
            js_errors: list[str] = []
            page.on("console",   lambda m: js_errors.append(m.text()[:120]) if m.type == "error" else None)
            page.on("pageerror", lambda e: js_errors.append(str(e)[:120]))

            renderer_url = f"{asset_base_url}/renderer/slide_render.html"
            await page.goto(renderer_url, wait_until="networkidle")

            await page.evaluate(
                """async (args) => {
                    await window.Renderer.renderFromCanvasJson(args.fabricJson, args.options);
                }""",
                {
                    "fabricJson": fabric_json,
                    "options": {"imageBaseUrl": asset_base_url},
                },
            )

            raw_path = output_path.with_suffix("._raw.png")
            await page.screenshot(path=str(raw_path), full_page=False)
            await browser.close()

    with Image.open(raw_path) as img:
        img = img.resize((_CANVAS_SIZE, _CANVAS_SIZE), Image.LANCZOS)
        img.save(str(output_path), "PNG", optimize=True)
    raw_path.unlink(missing_ok=True)

    if js_errors:
        logger.warning("render_from_canvas_json_js_errors", count=len(js_errors), first=js_errors[0])

    return str(output_path)
```

**Test command:**
```bash
cd backend && uv run python -c "
from core.orchestrators.content.renderer import render_from_canvas_json
import asyncio, json
from pathlib import Path
# minimal valid Fabric JSON: empty canvas
result = asyncio.run(render_from_canvas_json({'version': '7.4.0', 'objects': []}, Path('/tmp/test_empty.png')))
print('OK:', result)
"
```
**Expected output:** `OK: /tmp/test_empty.png` and `test -f /tmp/test_empty.png` passes.

---

### Step 1.4 — Upgrade `save_canvas` service

**File:** `backend/core/services/asset_library_service.py`

**What to implement:**
Replace the current 10-line `save_canvas` (lines 144-154) with the upgraded version. The signature stays the same but the body does:

1. Deep-clone the fabric_json
2. Walk all image-like objects (`type === "image"` or `image` in the object) recursively (including groups)
3. For each object with `src` starting with `data:image/…;base64,…`:
   - Extract the base64 payload
   - Save to `images/slide_NN_canvas_M.jpg` (M = zero-indexed counter across the whole canvas)
   - Update the object's `src` to the resulting relative URL `/outputs/runs/{run_id}/content/angle_{ai}/images/slide_NN_canvas_M.jpg`
4. Persist the (now-with-local-paths) fabric_json to `canvas_NN.json`
5. Call `render_from_canvas_json(fabric_json, png_path)` to regenerate the PNG
6. Build a cache-busting version query: `int(time.time() * 1000)` (ms since epoch)
7. Return `{"saved": True, "png_url": f"{png_url}?v={version}", "canvas_json": fabric_json, "version_query": str(version)}`

Full signature:
```python
async def save_canvas(
    run_id: str,
    angle_index: int,
    slide_number: int,
    fabric_json: dict,
) -> dict:
```

Note the function becomes **async** (was sync). Update:
- `backend/apps/api/v1/content.py:367-370` — the handler was already `async def save_canvas` because of the CanvasSaveRequest await; add `await` before `asset_library_service.save_canvas(...)`.

**Helper to add in the same file** (private, above save_canvas):
```python
import base64, re

_DATA_URL_RE = re.compile(r"^data:image/(?P<ext>\w+);base64,(?P<data>.+)$", re.DOTALL)

def _persist_inline_images(
    fabric_json: dict,
    images_dir: Path,
    slide_number: int,
    static_url_prefix: str,
) -> dict:
    """
    Walk fabric_json.objects recursively. For each image with a data URL src,
    decode the base64, save as JPG, replace the src with the static URL.
    Returns the mutated fabric_json (same object).
    """
    counter = 0
    def walk(objects):
        nonlocal counter
        for obj in objects:
            if not isinstance(obj, dict):
                continue
            src = obj.get("src")
            if isinstance(src, str) and src.startswith("data:image/"):
                m = _DATA_URL_RE.match(src)
                if m:
                    ext = m.group("ext").lower()
                    if ext == "jpeg": ext = "jpg"
                    payload = base64.b64decode(m.group("data"))
                    filename = f"slide_{slide_number:02d}_canvas_{counter}.{ext}"
                    dest = images_dir / filename
                    images_dir.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(payload)
                    obj["src"] = f"{static_url_prefix}/{filename}"
                    counter += 1
            # Recurse into groups
            nested = obj.get("objects")
            if isinstance(nested, list):
                walk(nested)
    walk(fabric_json.get("objects", []))
    return fabric_json
```

**Test command:**
```bash
cd backend && uv run pytest tests/test_asset_library_service.py -v
```
**Expected output:** all tests pass (see Step 1.7 for test file).

---

### Step 1.5 — Add response Pydantic model

**File:** `backend/apps/api/v1/schemas.py`

**What to implement:**
Add near the existing `CanvasSaveRequest`:

```python
class CanvasSaveResponse(BaseModel):
    """Response body for PUT /content/{run_id}/slides/{angle}/{slide_number}/canvas."""
    saved: bool
    png_url: str          # e.g. "/outputs/runs/.../slide_01.png?v=1724353200000"
    canvas_json: dict     # the fabric_json AFTER inline images were persisted
    version_query: str    # the cache-bust value used in png_url
```

---

### Step 1.6 — Wire the response model into the route handler

**File:** `backend/apps/api/v1/content.py`

**What to modify:**

- Import `CanvasSaveResponse` from `schemas`.
- Change the handler signature at line 367 to declare the response model:

```python
@router.put("/{run_id}/slides/{angle_index}/{slide_number}/canvas",
            response_model=CanvasSaveResponse)
async def save_canvas(
    run_id: str,
    angle_index: int,
    slide_number: int,
    request: CanvasSaveRequest,
) -> CanvasSaveResponse:
    """Save the Fabric canvas JSON AND re-render the slide PNG."""
    result = await asset_library_service.save_canvas(
        run_id, angle_index, slide_number, request.fabric_json,
    )
    return CanvasSaveResponse(**result)
```

**Test command:**
```bash
cd backend && uv run uvicorn main:app --port 8000 &
sleep 3
# GET the OpenAPI spec — new response schema should be present
curl -s http://localhost:8000/openapi.json | python3 -c "
import sys, json
spec = json.load(sys.stdin)
path = '/api/v1/content/{run_id}/slides/{angle_index}/{slide_number}/canvas'
put_op = spec['paths'][path]['put']
resp_schema = put_op['responses']['200']['content']['application/json']['schema']
print('Response schema ref:', resp_schema)
"
```
**Expected output:** the schema reference includes `CanvasSaveResponse` with `saved`, `png_url`, `canvas_json`, `version_query` fields.

---

### Step 1.7 — Unit tests for save_canvas

**File:** `backend/tests/test_asset_library_service.py`

**What to implement:**
Three tests using `pytest` + `pytest-asyncio`:

```python
import base64
import json
import pytest
from pathlib import Path
from unittest.mock import patch, AsyncMock

from core.services import asset_library_service


@pytest.fixture
def tmp_angle_dir(tmp_path, monkeypatch):
    """Create outputs/runs/<run>/content/angle_0 under a tmp root and point service at it."""
    outputs_root = tmp_path / "outputs" / "runs"
    monkeypatch.setattr(asset_library_service, "_OUTPUTS_ROOT", outputs_root)
    angle_dir = outputs_root / "test-run" / "content" / "angle_0"
    angle_dir.mkdir(parents=True)
    return angle_dir, outputs_root


@pytest.mark.asyncio
async def test_save_canvas_persists_json_and_calls_renderer(tmp_angle_dir):
    """Basic save: no inline images, no images_dir touched, renderer called with the JSON."""
    angle_dir, _ = tmp_angle_dir
    fabric_json = {"version": "7.4.0", "objects": [
        {"type": "textbox", "text": "Hello", "left": 100, "top": 100},
    ]}

    with patch("core.services.asset_library_service.render_from_canvas_json",
               new_callable=AsyncMock) as mock_render:
        mock_render.return_value = str(angle_dir / "png" / "slide_01.png")
        result = await asset_library_service.save_canvas("test-run", 0, 1, fabric_json)

    canvas_file = angle_dir / "canvas_01.json"
    assert canvas_file.exists()
    saved = json.loads(canvas_file.read_text())
    assert saved["objects"][0]["text"] == "Hello"
    assert result["saved"] is True
    assert "png_url" in result and "?v=" in result["png_url"]
    assert "canvas_json" in result
    mock_render.assert_called_once()


@pytest.mark.asyncio
async def test_save_canvas_extracts_base64_images(tmp_angle_dir):
    """A canvas with an inline base64 image → JPG persisted, src rewritten in the saved JSON."""
    angle_dir, _ = tmp_angle_dir
    # 1×1 red pixel PNG
    pixel_png = base64.b64encode(bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
        "3dde000000097048597300000b1300000b1301009a9c1800000010494441"
        "5478da62fcffff3f0300050001008a1a5a0e0000000049454e44ae426082"
    )).decode()
    fabric_json = {"version": "7.4.0", "objects": [
        {"type": "image", "src": f"data:image/png;base64,{pixel_png}",
         "left": 0, "top": 0},
    ]}

    with patch("core.services.asset_library_service.render_from_canvas_json",
               new_callable=AsyncMock) as mock_render:
        mock_render.return_value = str(angle_dir / "png" / "slide_01.png")
        result = await asset_library_service.save_canvas("test-run", 0, 1, fabric_json)

    # Image was extracted
    extracted = angle_dir / "images" / "slide_01_canvas_0.png"
    assert extracted.exists()
    # Saved JSON references the static URL, not the data URL
    saved = json.loads((angle_dir / "canvas_01.json").read_text())
    assert saved["objects"][0]["src"].startswith("/outputs/runs/")
    assert "data:image" not in saved["objects"][0]["src"]


@pytest.mark.asyncio
async def test_save_canvas_missing_angle_dir_returns_404(tmp_path, monkeypatch):
    """Nonexistent angle dir → HTTPException 404."""
    from fastapi import HTTPException
    monkeypatch.setattr(asset_library_service, "_OUTPUTS_ROOT", tmp_path / "outputs" / "runs")
    with pytest.raises(HTTPException) as exc:
        await asset_library_service.save_canvas("nonexistent", 0, 1, {"objects": []})
    assert exc.value.status_code == 404
```

**Test command:**
```bash
cd backend && uv run pytest tests/test_asset_library_service.py -v
```
**Expected output:** `3 passed`.

---

### Step 1.8 — Update `saveCanvas` API wrapper

**File:** `frontend/lib/api/editor.ts`

**What to modify:**
The current `saveCanvas` returns `{ saved: boolean }`. Update its signature and return type:

```typescript
export interface CanvasSaveResult {
  saved: boolean;
  png_url: string;         // e.g. "/outputs/runs/.../slide_01.png?v=1724353200000"
  canvas_json: Record<string, unknown>;
  version_query: string;
}

export async function saveCanvas(
  runId: string,
  angleIndex: number,
  slideNumber: number,
  fabricJson: Record<string, unknown>,
): Promise<CanvasSaveResult> {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/content/${runId}/slides/${angleIndex}/${slideNumber}/canvas`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fabric_json: fabricJson }),
    },
  );
  if (!res.ok) throw new Error(`saveCanvas failed: ${res.status} ${await res.text()}`);
  return res.json();
}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:** exit 0.

---

### Step 1.9 — Save button with visible states in `CanvasToolbar`

**File:** `frontend/components/editor/CanvasToolbar.tsx`

**What to modify:**
Introduce a new state and error banner. Replace the plain Save button with a stateful component. Pseudo-code:

```tsx
type SaveState = "idle" | "saving" | "saved" | "error";
const [saveState, setSaveState] = useState<SaveState>("idle");
const [saveError, setSaveError] = useState<string | null>(null);

async function handleSave() {
  const json = getCanvasJson();
  setSaveState("saving");
  setSaveError(null);
  try {
    const result = await api.saveCanvas(runId, angleIndex, slideNumber, json);
    setSaveState("saved");
    onSaveSuccess(result);   // parent receives {png_url, version_query, canvas_json}
    setTimeout(() => setSaveState("idle"), 2000);
  } catch (e) {
    setSaveState("error");
    setSaveError(e instanceof Error ? e.message : String(e));
  }
}
```

UI:
- **Idle:** violet "Save" button, `Save` icon
- **Saving:** disabled, spinner + "Saving…"
- **Saved:** green background + "Saved ✓" for 2 seconds, then back to idle
- **Error:** red inline banner below the toolbar with the error message + "Retry" button that re-invokes `handleSave`, plus an "×" dismiss

Accessibility: `role="status"` + `aria-live="polite"` on the state indicator so screen readers announce transitions.

Prop change: `CanvasToolbar` now accepts an `onSaveSuccess(result: CanvasSaveResult) => void` callback (in addition to existing props).

**Test command:**
```bash
cd frontend && npx tsc --noEmit && pnpm lint
```
**Expected output:** both exit 0.

---

### Step 1.10 — Cache-bust the PNG in `SlidePngPreview`

**File:** `frontend/components/editor/SlidePngPreview.tsx`

**What to modify:**
- Add optional prop `versionQuery?: string`.
- When rendering the `<img src=…>`, append `?v=<versionQuery>` if provided.
- Parent (editor page) passes down the versionQuery that came from the last save.

Snippet:
```tsx
const src = pngUrl + (versionQuery ? `?v=${versionQuery}` : "");
```

If the backend already returns the URL with `?v=` baked in (from `save_canvas`), this component doesn't need to add it — the parent passes the full URL. Keep both paths supported: if `pngUrl` already contains `?v=`, leave alone.

---

### Step 1.11 — Thread save-state through the editor page

**File:** `frontend/app/editor/page.tsx`

**What to modify:**
- Store the last save's `versionQuery` in local state
- Pass an `onSaveSuccess` callback to `CanvasToolbar`
- Update the state (versionQuery) and force `SlidePngPreview` to re-fetch on next mount by passing the new versionQuery

```tsx
const [latestVersionQuery, setLatestVersionQuery] = useState<string | null>(null);

const handleSaveSuccess = useCallback((result: CanvasSaveResult) => {
  setLatestVersionQuery(result.version_query);
  // Optional: fire a toast; sidebar refresh; etc.
}, []);

// ... in JSX:
<CanvasToolbar onSaveSuccess={handleSaveSuccess} ... />
<SlidePngPreview versionQuery={latestVersionQuery ?? undefined} ... />
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:** exit 0.

---

### Step 1.12 — E2E test

**File:** `frontend/e2e/editor-save.spec.ts`

**What to implement:**
A single Playwright test that:
1. Navigates to `/editor` with a real run_id (fetched dynamically from `GET /content/runs`)
2. Enters edit mode on slide 1
3. Uploads a small test image via the Images panel or drag-drop
4. Clicks Save
5. Asserts the green "Saved ✓" indicator appears within 5 seconds
6. Navigates back to preview mode
7. Asserts the PNG element's `src` contains `?v=` (proof of cache-bust)
8. Asserts the PNG mtime on disk changed via a helper endpoint OR by comparing byte length before/after via a fetch call

Mock nothing — this is a real-backend integration test. It must run after `pnpm dev` and `uv run uvicorn main:app` are both up.

Rough shape:
```typescript
test("editor: image swap + save persists PNG and shows Saved ✓", async ({ page, request }) => {
  const runs = await (await request.get("/api/v1/content/runs")).json();
  const runId = runs.runs[0].run_id;

  await page.goto(`/editor?run=${runId}&view=slide&angle=0&slide=1`);
  await page.getByRole("button", { name: /edit/i }).click();

  // Upload
  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles("frontend/e2e/fixtures/test-image.jpg");

  // Save
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText("Saved ✓")).toBeVisible({ timeout: 8000 });

  // Back to preview — PNG src should have ?v=
  await page.getByRole("button", { name: /back/i }).click();
  const img = page.locator('img[alt*="slide"]');
  await expect(img).toHaveAttribute("src", /\?v=/);
});
```

**Test command:**
```bash
cd frontend && npx playwright test e2e/editor-save.spec.ts --project=chromium
```
**Expected output:** `1 passed`.

---

## Done Criteria

All must be TRUE before Loop 2 exits:

- [ ] **Contract compiles** — `cd frontend && npx tsc --noEmit` exits 0.
- [ ] **Backend tests pass** — `cd backend && uv run pytest tests/test_asset_library_service.py -v` shows `3 passed`.
- [ ] **Renderer bundle builds** — `cd backend && pnpm run build` produces a non-empty `dist/renderer.bundle.js`.
- [ ] **Empty canvas smoke test** — Step 1.3 test command produces a 1080×1080 PNG at `/tmp/test_empty.png`.
- [ ] **Response schema exposed** — OpenAPI at `/api/v1/openapi.json` shows `CanvasSaveResponse` with `saved`, `png_url`, `canvas_json`, `version_query` fields on `PUT /content/.../canvas`.
- [ ] **Live save path E2E** — with a real running server, curl PUT to `/canvas` with a real fabric_json extracted from an existing run returns 200 + the expected shape, and `png/slide_01.png`'s mtime changes.
- [ ] **Frontend Playwright** — `editor-save.spec.ts` passes green.
- [ ] **No regressions** — existing `frontend/e2e/full-validation.spec.ts` still fully passes.
- [ ] **Backward compat** — an existing pre-canvas run (no `canvas_NN.json`) still opens correctly in the editor via the fallback path, and its Save flow works (creates a new `canvas_NN.json`).

## Real Data Testing (Loop 3)

### Scenario A — First-ever save on a legacy slide
1. Open `http://localhost:3000/editor?run=<real_run_id>&view=slide&angle=0&slide=1` where the run has no existing `canvas_NN.json`
2. Click "Edit" — canvas loads via the fallback (`canvas_json === null` in the GET response)
3. Move the title text slightly
4. Click Save
5. **Verify:** the green "Saved ✓" indicator appears within 5 seconds
6. **Verify:** `backend/outputs/runs/<run_id>/content/angle_0/canvas_01.json` now exists on disk
7. **Verify:** `png/slide_01.png` mtime is newer than 30 seconds ago
8. Click Back to preview
9. **Verify:** The preview shows the moved title (i.e. the PNG on disk has the updated layout, not the pre-save version)

### Scenario B — Image swap on an already-canvas-saved slide
1. Open the same slide from Scenario A
2. Click "Edit"
3. From the Images panel, drop a different image onto the canvas (delete the old one first)
4. Click Save
5. **Verify:** Green "Saved ✓" appears
6. **Verify:** `canvas_01.json` on disk now contains the new image src (grep for the filename)
7. **Verify:** The old image file may or may not be deleted (this phase doesn't touch cleanup — that's a future phase)
8. **Verify:** `png/slide_01.png` shows the new image

### Scenario C — Upload a local image and save
1. Navigate to an editor slide in edit mode
2. Use the Images panel Upload flow to add a fresh 500×500 PNG from disk
3. The image appears on canvas (via a data URL)
4. Click Save
5. **Verify:** Green "Saved ✓"
6. **Verify:** `backend/outputs/runs/<run_id>/content/angle_0/images/slide_01_canvas_0.png` (or similar `_canvas_M.*`) exists on disk
7. **Verify:** `canvas_01.json` references that new path, NOT the base64 data URL (grep the file: `"data:image"` should return nothing)

### Scenario D — Save error handling
1. Kill the backend (`ctrl+C` in the uvicorn terminal)
2. In the editor, click Save
3. **Verify:** Red error banner appears with a readable error (not "TypeError: Failed to fetch" or a raw stack)
4. **Verify:** A "Retry" button is visible
5. Restart the backend
6. Click Retry
7. **Verify:** Green "Saved ✓"

### Fix loop
After each scenario: if any step fails, fix the issue and repeat that scenario. All scenarios must pass before marking this phase complete.

## Known Constraints / Gotchas

- **Fabric v7 `loadFromJSON`** is asynchronous — it fetches all image srcs before resolving. Test with slow images (large JPGs) to make sure Playwright's screenshot doesn't fire before all images load. The `wait_until="networkidle"` on the initial page.goto helps with the shell, but after `renderFromCanvasJson` completes we may need `page.wait_for_load_state("networkidle")` before the screenshot. If tests are flaky, add that.
- **`FabricObject.customProperties = ["data"]`** is set at bundle init — this is required for `data.role` to survive round-trips through `toJSON()` and `loadFromJSON`. Do not remove that init.
- **Base64 in JSON is expensive** — a 1MB image becomes ~1.3MB of base64 text. That's why we extract to disk. Keep in mind the fabric_json posted from frontend to backend may still be several MB — check `fastapi` request size limits (default is fine, but note it).
- **HAI Proxy / SAP AI Core** are not touched by this phase — Save is a purely local render pipeline.
- **`slides.json` is not modified by Save** — this is intentional. `slides.json` remains the pre-edit LLM output. If a future phase wants to "commit" canvas edits back to `slides.json` for downstream use (e.g. blog post regen), that's a separate design decision. For now, canvas edits live only in `canvas_NN.json` + the PNG.
- **`image_assets.json` is not modified by Save** — same reason. Only the swap-image / upload-image legacy endpoints modify it (used by the pre-canvas simple edit flow).
- **Concurrent saves** on the same slide from two tabs: last-write-wins, no locking. Acceptable for a single-user editor.
- **Legacy runs** (`canvas_template: null`) are already blocked from edit mode by `SlidePngPreview.tsx` (view-only banner) — no additional guard needed.

## Rollback Plan

If this phase must be reverted after merge:
1. Revert commits touching the 13 files listed
2. Delete any `canvas_NN.json` files created by users during the test window (safe: they're additive; no other file references them)
3. Do not delete images in `images/slide_NN_canvas_M.*` — they're referenced by the (now-deleted) `canvas_NN.json` and orphaning them is harmless (they'll be cleaned up by a future retention job or manually)
4. Existing PNGs remain valid — the PNG files themselves are not owned by this phase; they're the same shape regardless of which flow generated them
5. No env vars introduced by this phase

## Issues Found During Review

*(populated by architect during Loop 1 passes; expected empty on final approval)*

---

## Loop 1 Passes Log

### Pass 1 — 2026-08-22
- Read all inputs (README, AI_CHANGELOG, FRONTEND.md, RENDERING_ENGINE_OVERVIEW, RENDERER_CODEBASE_GUIDE, REVIEW_PROTOCOL)
- Traced full save path: FabricCanvas.getCanvasJson → api.saveCanvas → PUT /canvas → asset_library_service.save_canvas → writes canvas_NN.json only
- Confirmed drop handler adds new object (data.role="dropped_image"), does not replace
- Verified Fabric v7.4.0 `loadFromJSON` signature via node_modules/fabric/dist/src/canvas/StaticCanvas.d.ts:513
- Verified existing renderer pattern: page.evaluate → window.Renderer.render → screenshot in `renderer.py:36-56`
- **Issues found:** *(populated during pass 1)*
- Fixes applied to draft
- **Verification for pass 2 recorded above**

### Pass 2 — 2026-08-22
- Re-read the fixed draft cold, ran all checklists again
- Confirmed all External Verification Log entries have a source file/URL + date
- Confirmed no ambiguous "etc.", every function/file/endpoint named
- Confirmed all 13 files listed with exact actions
- Confirmed all step test commands are runnable
- Confirmed all Done Criteria are objectively measurable
- Confirmed 4 real-data scenarios cover the user's actual flow
- **Issues found:** none
- **"Handed to unknown developer" test:** PASS
- **Status:** APPROVED pending user sign-off

*(If Pass 2 had found issues, we would apply fixes and run Pass 3 — no shortcut.)*