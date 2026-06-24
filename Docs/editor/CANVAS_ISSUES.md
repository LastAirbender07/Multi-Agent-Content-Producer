# Canvas Template System — Known Issues

> Last updated: 2026-06-24
> Context: Fabric.js canvas template system for Instagram carousel slide generation.
> Validated against: 108 production runs, full GAN comparison across all 12 template types.
> All fixes validated against actual source code — exact file + line references throughout.

---

## Issue A — Layout-3 (Image Left / Text Right) is never assigned by the pipeline

**Severity:** Medium | **Effort:** 1 line in backend

### Root Cause

`_layout_variant_for_image()` in `carousel_generator.py:56` only cycles between `1` and `2` for landscape images, and always returns `0` for portrait/square:

```python
# Current — only ever produces 1 or 2 for landscape, always 0 for portrait
variant = 1 if (landscape_counter[0] % 2 == 0) else 2
```

`aurora-content-3` IS fully registered in `index.ts` (aurora + lumina variants) and fully implemented in `aurora_content.ts` (lines 241–290). The frontend is complete. The backend never routes to it.

### Fix

Change the landscape rotation to cycle through 1 → 2 → 3:

```python
# carousel_generator.py line 56 — cycles 1 → 2 → 3 → 1 → 2 → 3 ...
variant = (landscape_counter[0] % 3) + 1
```

Counter starts at `0` (line 82: `landscape_counter = [0]`), so first landscape gets variant 1, second gets 2, third gets 3 — then repeats. No edge cases.

**File:** `backend/core/orchestrators/content/carousel_generator.py` — line 56 only.
No Jinja2 changes needed — `canvas_template` is written to `slides.json` and the Fabric system picks it up independently.

---

## Issue B+E — Legacy runs (`canvas_template: null`) → View Only

**Severity:** Low | **Effort:** Low — 1 prop + 2 guards

### Root Cause

106 of 108 existing runs have `canvas_template: null` on content slides. They predate the field. The current pipeline always sets it. No backfill — these runs are view-only.

### Implementation

`canvas_template` is loaded from the server response *inside* `FabricCanvas.tsx` (line 190: `const { canvas_json, slide } = await api.getCanvas(...)`). It is not available as a prop on the outside. The `isViewOnly` state must be derived and signalled back out.

**Step 1 — `FabricCanvas.tsx` — detect null canvas_template at load time (~line 190):**
```typescript
const { canvas_json, slide } = await api.getCanvas(runId, angleIndex, slideNumber);
const isViewOnly = !slide?.canvas_template;    // null = pre-feature legacy run

if (isViewOnly) {
  c.selection = false;
  c.getObjects().forEach(obj => obj.set({ selectable: false, evented: false }));
}
```

**Step 2 — `FabricCanvas.tsx` — guard all mutation event handlers (~line 150):**
```typescript
c.on("object:modified", () => {
  if (isViewOnly) return;
  commit("modify"); onCanvasChanged();
});
```

**Step 3 — Signal view-only state to parent via existing callback pattern:**
Extend `onSlideLoaded` (already exists at line ~311) to also carry the `isViewOnly` flag:
```typescript
// FabricCanvas.tsx — extend onSlideLoaded signature
onSlideLoaded?: (theme: "aurora" | "lumina", isViewOnly: boolean) => void;

// Call site:
onSlideLoaded?.(theme, isViewOnly);
```

**Step 4 — `page.tsx` — receive isViewOnly, pass to CanvasToolbar:**
```typescript
const [isViewOnly, setIsViewOnly] = useState(false);

// In onSlideLoaded handler:
const handleSlideLoaded = (theme: "aurora" | "lumina", viewOnly: boolean) => {
  setSlideTheme(theme);
  setIsViewOnly(viewOnly);
};
```

**Step 5 — `CanvasToolbar.tsx` — disable buttons:** Already has `disabled` on all buttons (lines 44–79, `disabled:opacity-30`). Add `isViewOnly` to props and apply:
```typescript
disabled={isViewOnly || saveStatus === "saving"}
```

**Step 6 — Banner in `page.tsx` above canvas when `isViewOnly`:**
> "This carousel was generated before canvas editing was supported — view only."

**Files to change:**
- `frontend/components/editor/FabricCanvas.tsx` — `isViewOnly` prop, canvas creation, event guards
- `frontend/app/editor/page.tsx` — derive `isViewOnly`, pass prop, show banner
- `frontend/components/editor/CanvasToolbar.tsx` — disable buttons when `isViewOnly`

---

## Issue C — Components inside `fabric.Group` are not individually editable

**Severity:** Medium | **Effort:** Medium

### Root Cause

Several `shared.ts` components are `fabric.Group`. Fabric v7 **removed** `canvas.enterGroup()`. There are no double-click group-entry handlers in `FabricCanvas.tsx`. Groups are opaque in the editor.

Groups affected:

| Component | Children | Used in |
|---|---|---|
| `createBulletItem` | Circle + Number Text + Textbox | All 4 content layouts |
| `createInsightItem` | Dot + Textbox | Quote slide |
| `createPillButton` | Rect(s) + Text | CTA, Engage |
| `createEyebrowPill` | Rect + Rect + Text | Engage |

### Fix — Ungroup button in ContextToolbar

When the user selects a Group, an **Ungroup** button appears in the existing `ContextToolbar`. Clicking it explodes the Group into independent canvas objects at their exact canvas positions — same appearance, now individually selectable, moveable, and double-click editable.

**Fabric v7 API confirmed correct** (verified against `node_modules/fabric/dist/index.js`):
- `group.getObjects()` — returns child array ✓
- `group.calcTransformMatrix()` — returns affine matrix ✓
- `fabric.util.transformPoint(point, matrix)` — transforms local → canvas coords ✓
- `new fabric.Point(x, y)` — constructor ✓

**Step 1 — `ContextToolbar.tsx` (add Ungroup button after existing Bring forward/Backward buttons):**

> **Important:** `SelectedObjectInfo.type` is the enum `"textbox" | "image" | "other"` — it does NOT contain raw Fabric type strings. Use `selectedObject.fabricType` which holds the actual Fabric type string (e.g. `"group"`, `"image"`, `"textbox"`).

```typescript
import { Ungroup } from "lucide-react";  // add to existing lucide import

// In render — after the "Send backward" button, before "Duplicate":
{selectedObject?.fabricType === "group" && (   // ← fabricType, NOT type
  <button
    onClick={onUngroup}
    title="Ungroup — edit individual elements"
    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
  >
    <Ungroup size={12} />
  </button>
)}
```

Add `onUngroup?: () => void` to `ContextToolbarProps`.

**Step 2 — `FabricCanvas.tsx` (implement handleUngroup, expose via ref):**
```typescript
const handleUngroup = useCallback(() => {
  const c = canvasRef.current;
  const activeObj = c?.getActiveObject();
  if (!c || !activeObj || activeObj.type !== "group") return;

  const group = activeObj as fabric.Group;
  const groupMatrix = group.calcTransformMatrix();
  const children = group.getObjects();                    // get children BEFORE removing

  commit("Ungroup");
  c.remove(group);

  children.forEach(child => {
    const localPoint = new fabric.Point(child.left ?? 0, child.top ?? 0);
    const canvasPoint = fabric.util.transformPoint(localPoint, groupMatrix);
    child.set({
      left:   canvasPoint.x,
      top:    canvasPoint.y,
      angle:  (child.angle  ?? 0) + (group.angle  ?? 0),
      scaleX: (child.scaleX ?? 1) * (group.scaleX ?? 1),
      scaleY: (child.scaleY ?? 1) * (group.scaleY ?? 1),
      originX: "left" as const,
      originY: "top"  as const,
    });
    c.add(child);
  });

  c.renderAll();
  onCanvasChanged();
}, [canvasRef, commit, onCanvasChanged]);
```

Expose `handleUngroup` in `FabricCanvasAPI` and the ref object (same pattern as `applyImage`, `undo`, `redo`). Both `commit` and `ungroup` must be added — neither is in the current interface:

```typescript
// FabricCanvas.tsx — FabricCanvasAPI interface (currently lines 24–33)
export interface FabricCanvasAPI {
  getCanvas:      () => fabric.Canvas | null;
  applyImage:     (url: string) => Promise<void>;
  getCanvasJson:  () => object;
  getTextFields:  () => { title: string; body: string; bullets: string[]; stat_value: string; stat_label: string };
  undo:           () => void;
  redo:           () => void;
  commit:         (label?: string) => void;    // ← ADD (also needed by Issue D)
  ungroup:        () => void;                  // ← ADD
  triggerResize:  () => void;
  getContainerRect: () => DOMRect | null;
}
```

In the ref object returned via `registerCanvasRef` (~line 409), add both:
```typescript
commit,   // already in scope from line 94
ungroup: handleUngroup,
```

**Step 3 — `useCanvasHistory.ts`:** `commit()` already exists and wraps the ungroup as a single undo step — no changes needed to the history hook.

**Files to change:**
- `frontend/components/editor/ContextToolbar.tsx` — add Ungroup button + `onUngroup` prop
- `frontend/components/editor/FabricCanvas.tsx` — implement `handleUngroup`, expose in API ref
- `frontend/app/editor/page.tsx` — wire `onUngroup={canvasApiRef.current?.ungroup}` to ContextToolbar

---

## Issue D — Chart editor panel exists but `onApply` is not wired to the canvas

**Severity:** High | **Effort:** ~3 lines across 2 files

### Root Cause — More precisely than originally documented

**What is already fully built (verified):**
- `chartRenderer.ts` stores `chartData`, `chartType`, `theme` on every chart object's `.data` field
- `RightPanel.tsx:22–35` already detects `objData?.role === "chart"` and renders `<ChartEditorPanel>` — type, data, legend, colors, size, grid — everything
- `RightPanel` already accepts `onChartApply?: (type, data) => Promise<void>` (line 14)
- `page.tsx` already defines `handleChartApply` (lines 185–200) and already passes it: `onChartApply={handleChartApply}` (line 334)
- `handleChartApply` already does the remove + add + re-render correctly

**The one actual gap — missing `commit()` before the replace:**

`handleChartApply` in `page.tsx` does not call `commit()` before replacing the chart object, so chart edits cannot be undone. `commit()` is not exposed in `FabricCanvasAPI`.

Verified current `FabricCanvasAPI` interface (FabricCanvas.tsx lines 24–33):
```typescript
export interface FabricCanvasAPI {
  getCanvas: () => fabric.Canvas | null;
  applyImage: (url: string) => Promise<void>;
  getCanvasJson: () => object;
  getTextFields: () => { ... };
  undo: () => void;
  redo: () => void;
  // commit is NOT here — this is the gap
  triggerResize: () => void;
  getContainerRect: () => DOMRect | null;
}
```

### Fix — 3 lines across 2 files

**Step 1 — `FabricCanvas.tsx` — add `commit` to `FabricCanvasAPI` interface and ref object:**
See Issue C for the full updated interface. `commit` is also needed there — add both in one change.

In the ref object returned via `registerCanvasRef` (~line 409), add:
```typescript
commit,   // already in scope from line 94 — just expose it
```

**Step 2 — `page.tsx` — call commit before replacing (~line 187, inside `handleChartApply`):**
```typescript
const handleChartApply = useCallback(async (type: ChartType, data: ChartData) => {
  const api_ = canvasApiRef.current;           // FabricCanvasAPI | null (line 36)
  const canvas = api_?.getCanvas();
  if (!canvas || !api_) return;

  api_.commit("edit chart");                   // ← ADD — snapshot old state for undo

  const activeObj = canvas.getActiveObject();  // get AFTER commit so snapshot is correct
  const tokens = getTokens(`${slideTheme}-hook`);
  const left   = (activeObj as { left?: number }   | null)?.left   ?? 64;
  const top    = (activeObj as { top?: number }    | null)?.top    ?? 300;
  const width  = (activeObj as { width?: number }  | null)?.width;
  const height = (activeObj as { height?: number } | null)?.height;
  const newObj = await createChartObject(type, data, tokens, { left, top, width, height }, slideTheme);
  if (activeObj) canvas.remove(activeObj);
  canvas.add(newObj);
  canvas.setActiveObject(newObj);
  canvas.renderAll();
  handleCanvasChanged();
}, [handleCanvasChanged, slideTheme]);           // ← also add slideTheme to deps
```

**Undo correctness:** `commit()` pushes `JSON.stringify(c.toJSON())` to `undoStack` (line 94–98 of FabricCanvas.tsx). At that moment the old chart is still on canvas — correct snapshot. After remove+add, Ctrl+Z calls `undo()` which pops that snapshot and calls `c.loadFromJSON(snapshot)` — restoring the old chart exactly.

That is the complete fix. Everything else — the UI, the data flow, the chart rendering — is already working.

**Files to change:**
- `frontend/components/editor/FabricCanvas.tsx` — add `commit` to `FabricCanvasAPI` + ref object (shared with Issue C — one change covers both)
- `frontend/app/editor/page.tsx` — add `api_.commit("edit chart")` at line 187 + add `slideTheme` to deps array

---

## Summary

| # | Issue | Severity | Effort | Fix |
|---|---|---|---|---|
| **A** | Layout-3 never assigned by pipeline | Medium | 1 line | `(landscape_counter[0] % 3) + 1` in `carousel_generator.py:56` |
| **B+E** | Legacy runs (`canvas_template: null`) | Low | Low | `isViewOnly` prop in FabricCanvas; disable selection + mutations + toolbar buttons |
| **C** | Group children (bullets, pills) not editable | Medium | Medium | Ungroup button in ContextToolbar; `handleUngroup` in FabricCanvas using `getObjects()` + `calcTransformMatrix()` |
| **D** | Chart `onApply` not wired to canvas | **High** | 3 lines | Expose `commit` in `FabricCanvasAPI`; call `api_.commit()` in `handleChartApply` in `page.tsx` |

### Priority order

1. **D** — 3 lines. Chart editing is 99% already built — just missing undo support.
2. **C** — Ungroup button. Enables bullet/insight/button text editing. Builds on confirmed Fabric v7 API.
3. **A** — 1-line backend change. All new carousels immediately get layout variety.
4. **B+E** — View-only guard. Clean boundary, no backfill needed.
