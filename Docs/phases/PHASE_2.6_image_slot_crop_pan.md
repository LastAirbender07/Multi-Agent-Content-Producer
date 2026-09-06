# PHASE 2.6 — Image Slot Crop / Pan Mode

## Status
APPROVED — Loop 1 complete (2026-09-06), ready to implement

---

## Problem Statement

When a user fills a phone mockup, image-pair, or polaroid slot with a photo, the image is always cover-scaled and centered. A landscape photo dropped into a portrait phone slot shows only the center strip — the top, bottom, or sides of the photo are inaccessible. There is no way to reposition the photo without ungrouping the slot (which destroys the clip boundary) and manually repositioning the image.

**After this phase:** selecting a filled slot shows a "Drag to adjust photo" right-panel. Clicking the image area inside the slot makes the image child the active Fabric object. The user drags it to reposition which part of the photo is visible. The clip boundary is enforced at all times — the image can never leave a gap showing through to the frame background.

---

## Requirements

**Functional:**
- Any filled `phone_mockup`, `image_pair`, or `polaroid_frame` slot group shows "Drag to reposition" affordance in the right panel when selected
- Clicking the image area inside the slot makes the image child active and draggable
- Dragging the image repositions it within the slot; the clip shape stays fixed
- Position is clamped at all times: the image can never leave a gap — it must always cover the full slot area
- A "Lock photo" / "Done" button in the right panel returns the selection to the parent group
- Escape key also exits pan mode (returns selection to parent group)
- The image child shows NO resize handles or border while in pan mode (clean UX, not cluttered)
- After pan, the change is saved to canvas JSON (persists across reload)
- Works for all 3 slot types: phone_mockup (portrait), image_pair (both slots), polaroid_frame (inner photo)

**Non-functional:**
- No new npm dependencies
- No changes to `canvasDropHandlers.ts::fillImageSlot` — the pan behavior is handled purely through Fabric events
- `interactive: true` is already set on all 3 slot groups — no template file changes needed
- Backward compatible: slots without filled images (placeholder rects, `selectable: false`) are unaffected

---

## External Verification Log

| Claim | Verified against | Verified on |
|---|---|---|
| Fabric v7.4.0 is the installed version | `ls frontend/node_modules/.pnpm/ \| grep fabric` → `fabric@7.4.0` | 2026-09-06 |
| `interactive: true` on a Group enables child hit-testing on single click | `fabric/dist/index.js` line 11385: `container.interactive && subTargets[0]` → child becomes target | 2026-09-06 |
| `activeOn: "down"` is the Fabric v7 default | `fabric/dist/index.js` line 4500 | 2026-09-06 |
| With `interactive: true` + child `selectable: true`, mousedown on child calls `setActiveObject(child)` | `fabric/dist/index.js` line 12475 | 2026-09-06 |
| `object:moving` fires on the canvas while an object is being dragged | `fabric/dist/index.js` — standard Fabric event, same as v6 | 2026-09-06 |
| `hasControls: false, hasBorders: false` hides transform handles without affecting selectability | Standard Fabric API — `.set({hasControls: false, hasBorders: false})` | 2026-09-06 |
| Setting `parent.dirty = true` invalidates a group's render cache | `canvasDropHandlers.ts` line 180 — already used in `fillImageSlot` | 2026-09-06 |
| `canvas.on("mouse:dblclick", ...)` fires for double-clicks | `fabric/dist/index.js` line 12153 | 2026-09-06 |
| All 3 slot groups already have `interactive: true` | `makeTiltedPhoneMockup.ts:92`, `makeTiltedImagePair.ts:94`, `makePolaroidFrame.ts:154` | 2026-09-06 |
| `IMAGE_SLOT_ROLES` set already exported from `canvasDropHandlers.ts` line 68 | Read of `canvasDropHandlers.ts` | 2026-09-06 |

---

## Entry Conditions (verify before starting)

- [ ] `npx tsc --noEmit` from `frontend/` → 0 errors
  - verify: `cd frontend && npx tsc --noEmit`
- [ ] Backend running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/analytics/summary` → `200`
- [ ] Frontend running: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200` or `307`
- [ ] `window.__fc` accessible in browser console (dev mode)

---

## Files to Create or Modify

| File | Action | Description |
|---|---|---|
| `frontend/components/editor/FabricCanvas.tsx` | MODIFY | Add `mouse:dblclick` + `object:moving` handlers; enter/exit pan mode state ref; clamp logic |
| `frontend/components/editor/ContextToolbar.tsx` | MODIFY | Show "Adjusting Photo" amber indicator + Escape hint when in pan mode |
| `frontend/components/editor/panels/ImageSlotPanel.tsx` | CREATE | Right-panel content when slot group OR slot image child is selected |
| `frontend/components/editor/RightPanel.tsx` | MODIFY | Route to `ImageSlotPanel` when role is a slot role |
| `frontend/components/editor/canvasDropHandlers.ts` | MODIFY | Export `getPanImageChild()` helper; export `SLOT_IMAGE_CHILD_ROLES` |

---

## Implementation Steps

### Step 2.6.1 — Export helpers from canvasDropHandlers.ts

**File:** `frontend/components/editor/canvasDropHandlers.ts`

Add two exports after the existing `IMAGE_SLOT_ROLES` constant:

```typescript
/** Role of the image child inside a filled slot — used to detect pan mode */
export const SLOT_IMAGE_CHILD_ROLES = new Set(["slot_image_child"]);

/**
 * Given a slot group, return its fillable image child (FabricImage).
 * Returns null if the slot is not filled (still has a placeholder rect).
 * Used by pan mode to identify what to make active.
 *
 * Phone:    children[0] is the screen image (index 0 always)
 * ImagePair: children[slotIdx] where slotIdx = d.filledSlots % 2 - 1 (last filled)
 * Polaroid:  children[1] is the photo slot
 */
export function getPanImageChild(
  slotGroup: fabric.Group,
): fabric.FabricImage | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (slotGroup as any).data;
  if (!d?.role) return null;

  const children = slotGroup.getObjects();

  if (d.role === "phone_mockup") {
    const c = children[0];
    return c?.type === "image" ? (c as fabric.FabricImage) : null;
  }

  if (d.role === "image_pair") {
    // The most recently filled slot. filledSlots is incremented after each fill,
    // so the last filled index is (filledSlots - 1) % 2.
    const filled = d.filledSlots ?? 0;
    if (filled === 0) return null; // nothing filled yet
    const slotIdx = (filled - 1) % 2;
    const c = children[slotIdx];
    return c?.type === "image" ? (c as fabric.FabricImage) : null;
  }

  if (d.role === "polaroid_frame") {
    const c = children[1]; // index 1 = photo slot
    return c?.type === "image" ? (c as fabric.FabricImage) : null;
  }

  return null;
}
```

Also: after `fillImageSlot` completes (at the very end, after `canvas.requestRenderAll()`), tag the inserted image with a role so RightPanel can detect it:

```typescript
// At end of each fill branch, before the dirty/renderAll block:
(img as fabric.FabricImage & { data?: unknown }).data = { role: "slot_image_child", parentRole: d.role };
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected:** 0 errors

---

### Step 2.6.2 — Create ImageSlotPanel.tsx

**File:** `frontend/components/editor/panels/ImageSlotPanel.tsx`

This panel renders in the right panel when:
- A slot GROUP is selected (shows info + "Adjust Photo" instruction)
- A slot IMAGE CHILD is selected (shows "Drag to reposition" + "Done" button)

```typescript
"use client";
import { Move } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface Props {
  obj: AnyObj;           // the Fabric object currently selected
  canvas: AnyObj;
  onChanged: () => void;
}

export function ImageSlotPanel({ obj, canvas, onChanged }: Props) {
  const role = obj?.data?.role as string | undefined;
  const isImageChild = role === "slot_image_child";
  const isSlotGroup  = !isImageChild; // we only render for slot roles

  function exitPanMode() {
    // Return selection to the parent group
    if (!canvas || !obj) return;
    const parent = obj.group ?? obj.parent;
    if (parent) {
      // Restore transform handles on the image child
      obj.set({ hasControls: true, hasBorders: true });
      canvas.setActiveObject(parent);
      canvas.requestRenderAll();
      onChanged();
    }
  }

  if (isImageChild) {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Move size={13} className="text-amber-400 shrink-0" />
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
            Adjusting Photo
          </p>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Drag the photo to reposition it inside the frame. The clip boundary stays fixed.
        </p>
        <p className="text-[10px] text-zinc-600">
          Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px]">Esc</kbd> or click outside to finish.
        </p>
        <button
          onClick={exitPanMode}
          className="w-full py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all border border-amber-500/30"
        >
          ✓ Lock Photo Position
        </button>
      </div>
    );
  }

  // Slot group selected — show Replace + Adjust instructions
  return (
    <div className="p-3 space-y-3">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
        Photo Slot
      </p>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Use <strong className="text-zinc-300">Replace Photo</strong> in the toolbar above to fill this slot with your image.
      </p>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        After filling, <strong className="text-zinc-300">click the photo area</strong> to drag and reposition it inside the frame.
      </p>
    </div>
  );
}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected:** 0 errors

---

### Step 2.6.3 — Wire ImageSlotPanel in RightPanel.tsx

**File:** `frontend/components/editor/RightPanel.tsx`

Add import:
```typescript
import { ImageSlotPanel } from "@/components/editor/panels/ImageSlotPanel";
```

Add routing in the return block — BEFORE the existing `selectedObject?.type === "textbox"` check:

```typescript
// Image slot group selected (phone_mockup, image_pair, polaroid_frame)
const IMAGE_SLOT_GROUP_ROLES = new Set(["phone_mockup", "image_pair", "polaroid_frame", "slot_image_child"]);
if (selectedObject && IMAGE_SLOT_GROUP_ROLES.has(selectedObject.role) && obj) {
  return (
    <div className="w-56 shrink-0 bg-zinc-950 border-l border-zinc-800/50 overflow-y-auto custom-scrollbar flex flex-col">
      <ImageSlotPanel obj={obj} canvas={canvas} onChanged={onChanged} />
    </div>
  );
}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected:** 0 errors

---

### Step 2.6.4 — Add pan mode state + handlers in FabricCanvas.tsx

**File:** `frontend/components/editor/FabricCanvas.tsx`

**What to add:**

1. Import `getPanImageChild` and `IMAGE_SLOT_ROLES` from `canvasDropHandlers`:
```typescript
import { addImageToCanvas, addComponentToCanvas, IMAGE_SLOT_ROLES, getPanImageChild } from "./canvasDropHandlers";
```

2. Add a ref for tracking pan mode (no re-render needed):
```typescript
const panModeGroupRef = useRef<fabric.Group | null>(null); // non-null = currently in pan mode
```

3. In the canvas setup `useEffect`, after the existing event listeners, add:

```typescript
// ── Pan mode: double-click on a slot group → enter image pan mode ──────────
c.on("mouse:dblclick", (e) => {
  const target = e.target as (fabric.FabricObject & { data?: { role?: string } }) | null;
  if (!target) return;

  // Check if the target is a slot group
  if (target.type === "group" && target.data?.role && IMAGE_SLOT_ROLES.has(target.data.role)) {
    const slotGroup = target as fabric.Group;
    const imgChild = getPanImageChild(slotGroup);
    if (!imgChild) return; // slot not filled — nothing to pan

    // Enter pan mode
    panModeGroupRef.current = slotGroup;
    imgChild.set({ hasControls: false, hasBorders: false }); // clean look
    c.setActiveObject(imgChild);
    c.requestRenderAll();
    return;
  }

  // Also handle: user double-clicked the image child directly (via interactive hit-test)
  const parentGroup = (target as fabric.FabricObject & { group?: fabric.Group }).group;
  if (parentGroup && parentGroup.data?.role && IMAGE_SLOT_ROLES.has(parentGroup.data.role)) {
    const imgChild = target as fabric.FabricImage;
    panModeGroupRef.current = parentGroup;
    imgChild.set({ hasControls: false, hasBorders: false });
    c.setActiveObject(imgChild);
    c.requestRenderAll();
  }
});

// ── Pan mode: constrain image position during drag ────────────────────────
c.on("object:moving", (e) => {
  const img = e.target as fabric.FabricImage & { data?: { role?: string; parentRole?: string } };
  if (!img || img.data?.role !== "slot_image_child") return;

  const parentGroup = (img as fabric.FabricObject & { group?: fabric.Group }).group;
  if (!parentGroup) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (parentGroup as any).data as { role: string; phoneW?: number; phoneH?: number; innerW?: number; innerH?: number; slotDimensions?: Array<{ w: number; h: number }> };
  if (!d) return;

  const iw = (img.width  ?? 1) * (img.scaleX ?? 1);
  const ih = (img.height ?? 1) * (img.scaleY ?? 1);

  let slotW: number, slotH: number;
  if (d.role === "phone_mockup") {
    slotW = d.phoneW ?? 360;
    slotH = d.phoneH ?? 780;
  } else if (d.role === "image_pair") {
    // Use dimensions of the slot this image occupies
    const dims = d.slotDimensions ?? [{ w: 340, h: 460 }, { w: 300, h: 400 }];
    const filledSlots = (parentGroup as any).data?.filledSlots ?? 1;
    const slotIdx = (filledSlots - 1) % 2;
    slotW = dims[slotIdx].w;
    slotH = dims[slotIdx].h;
  } else if (d.role === "polaroid_frame") {
    slotW = d.innerW ?? 332;
    slotH = d.innerH ?? 336;
  } else {
    return;
  }

  // In group-local coords, the slot occupies from -(slotW/2) to +(slotW/2) on X,
  // -(slotH/2) to +(slotH/2) on Y (group center = 0,0 in Fabric v7 after centering).
  // Constraint: image must cover the entire slot area.
  // Image left edge must be ≤ -(slotW/2)  → img.left ≤ -(slotW/2)
  // Image right edge must be ≥ +(slotW/2) → img.left + iw ≥ +(slotW/2) → img.left ≥ slotW/2 - iw
  // Same for top/bottom.
  const minLeft = slotW / 2 - iw;   // rightmost the image can go (right edge at slot right)
  const maxLeft = -(slotW / 2);      // leftmost the image can go (left edge at slot left)
  const minTop  = slotH / 2 - ih;
  const maxTop  = -(slotH / 2);

  img.left = Math.max(minLeft, Math.min(maxLeft, img.left ?? 0));
  img.top  = Math.max(minTop,  Math.min(maxTop,  img.top  ?? 0));

  // Dirty the parent group cache so it re-renders with new image position
  (parentGroup as fabric.Group & { dirty?: boolean }).dirty = true;
});

// ── Pan mode: exit when selection leaves the slot image ───────────────────
c.on("selection:cleared", () => {
  _exitPanMode(c);
});
c.on("selection:updated", (e) => {
  const incoming = e.selected?.[0] as (fabric.FabricObject & { data?: { role?: string } }) | undefined;
  if (!incoming || incoming.data?.role !== "slot_image_child") {
    _exitPanMode(c);
  }
});
```

4. Add the `_exitPanMode` helper inside the useEffect (local function, not exported):

```typescript
function _exitPanMode(canvas: fabric.Canvas) {
  const group = panModeGroupRef.current;
  if (!group) return;
  panModeGroupRef.current = null;

  // Restore transform handles on the image child
  const imgChild = getPanImageChild(group);
  if (imgChild) {
    imgChild.set({ hasControls: true, hasBorders: true });
  }
  // Dirty the group so it re-renders
  (group as fabric.Group & { dirty?: boolean }).dirty = true;
  canvas.requestRenderAll();
}
```

5. Add Escape key listener for pan mode exit (add to the cleanup ref pattern already in FabricCanvas):

```typescript
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && panModeGroupRef.current) {
    const group = panModeGroupRef.current;
    _exitPanMode(c);
    c.setActiveObject(group);
    c.requestRenderAll();
    e.preventDefault();
  }
};
window.addEventListener("keydown", onKeyDown);
// Add to cleanup: return () => { ... window.removeEventListener("keydown", onKeyDown); }
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected:** 0 errors

---

### Step 2.6.5 — Update ContextToolbar.tsx

**File:** `frontend/components/editor/ContextToolbar.tsx`

When `selectedObject.role === "slot_image_child"`, show an amber "Adjusting Photo" badge instead of the normal buttons:

```typescript
const isSlotImageChild = selectedObject.role === "slot_image_child";

// At the top of the toolbar return, before the text controls:
{isSlotImageChild && (
  <div className="flex items-center gap-1.5 px-2 py-1">
    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
    <span className="text-[10px] font-semibold text-amber-400">Adjusting Photo</span>
    <span className="text-[10px] text-zinc-600 ml-1">· Drag to reposition · Esc to finish</span>
  </div>
)}
```

Hide the standard Universal controls (Copy, Delete, etc.) when `isSlotImageChild` — pan mode only, no other transforms.

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected:** 0 errors

---

## Done Criteria

All of the following must be TRUE before this phase is considered complete:

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Drop `cover-phone-mockup` onto an aurora-hook slide; fill with a landscape photo; click image area → image becomes draggable, amber "Adjusting Photo" appears in toolbar
- [ ] Drag image left/right → photo repositions inside phone frame with no gap visible
- [ ] Phone frame and shadow remain visible during drag
- [ ] Press Escape → returns to slot group selection, pan mode exits
- [ ] Click "Lock Photo Position" in right panel → same result as Escape
- [ ] Click outside canvas → pan mode exits
- [ ] Reload page → repositioned photo is preserved (canvas JSON saved correctly)
- [ ] Same test for `cover-image-pair`: fill slot 1, fill slot 2, click each → independent pan per slot
- [ ] Same test for `cover-polaroid-frame`: fill inner photo, click → pan mode active
- [ ] No regression on aurora-hook, aurora-compact-clean-cta (random spot check)
- [ ] `node scripts/audit_one.cjs template aurora-carousel-cover-hero-phone` → exit 0

---

## Real Data Testing (Loop 3 Scenarios)

### Scenario A — Portrait phone with landscape photo
1. Create slide from `aurora-carousel-cover-hero-phone`
2. Enter canvas edit mode
3. Click the phone mockup group → "Replace Photo" appears
4. Click "Replace Photo" → choose a wide landscape photo (e.g. 16:9 aspect ratio)
5. **Verify:** Photo fills phone screen (no gap), but only center strip is visible
6. Click the image area inside the phone → amber "Adjusting Photo" banner appears
7. Drag image upward → reveal the top portion of the photo
8. Verify: Phone frame stays fixed; no gap appears at any point during drag
9. Press Escape → group re-selected, position locked
10. Reload page → photo position is preserved

### Scenario B — Image pair, two different photos
1. Drop `cover-image-pair` component onto a blank slide
2. Fill slot 0 (left) with a portrait photo
3. Fill slot 1 (right) with a landscape photo
4. Click slot 0's image area → pan mode on slot 0 only
5. Drag → slot 0 image pans; slot 1 image unaffected
6. Click outside → exit pan mode
7. Click slot 1's image area → pan mode on slot 1 independently

### Scenario C — Polaroid caption still editable in pan mode
1. Drop `cover-polaroid-frame`, fill inner photo
2. Enter pan mode on inner photo (click it)
3. Verify: right panel shows "Adjusting Photo" + "Lock Photo Position"
4. Exit pan mode
5. Double-click the caption text → text editing activates normally

---

## Known Constraints / Gotchas

### Fabric v7 group-local coordinate system
After `new fabric.Group(objects)`, Fabric re-centers all children. `img.left` inside a group is in group-local coordinates where `(0,0) = group center`. The constraint math in `object:moving` must use slot dimensions in group-local space (half-dimensions, not absolute).

**Constraint math derivation:**
```
Group center = (0, 0) in group-local coords
Slot occupies: x ∈ [-slotW/2, +slotW/2], y ∈ [-slotH/2, +slotH/2]
Image dimensions (scaled): iw × ih

For image to cover the slot with no gap:
  img.left + iw ≥ +slotW/2     →  img.left ≥ slotW/2 - iw  (min: rightmost allowed)
  img.left ≤ -slotW/2          →  img.left ≤ -slotW/2       (max: leftmost allowed)
  (same for top/bottom)

Clamp: img.left = clamp(img.left, slotW/2 - iw, -slotW/2)
       img.top  = clamp(img.top,  slotH/2 - ih, -slotH/2)
```
Note: `min` ≤ `max` requires `iw ≥ slotW` (image larger than slot). This is guaranteed because `fillImageSlot` uses cover-scale: `scale = Math.max(slotW/iw, slotH/ih)`, so `iw * scale ≥ slotW` always.

### `dirty: true` required on parent group
Fabric's `objectCaching: true` groups cache a bitmap. If the child image moves without invalidating the cache, the group renders the old cached image. Always set `parentGroup.dirty = true` in `object:moving` after clamping.

### `interactive: true` hit-test note
With `interactive: true`, a single click on the image area already makes the image child the active object (Fabric v7 default `activeOn: "down"`). Pan mode is entered on single click, not double-click. The `mouse:dblclick` listener is added as a fallback for when users expect double-click (e.g. if they previously single-clicked the group border, not the image area).

### Escape key cleanup
The `keydown` listener must be cleaned up in the `useEffect` return function. Add `window.removeEventListener("keydown", onKeyDown)` to the existing cleanup.

### image_pair slot index for getPanImageChild
The `filledSlots` counter in `image_pair` tracks how many fills have been done (increments on each fill). The LAST filled slot is `(filledSlots - 1) % 2`. On single click with `interactive: true`, Fabric returns the clicked child as the direct target — so the `mouse:dblclick` handler receives the actual image child, not the group. The `selection:updated` handler identifies the child by `data.role === "slot_image_child"`.

---

## Rollback Plan

All changes are additive:
1. `canvasDropHandlers.ts` — remove `getPanImageChild` export and `SLOT_IMAGE_CHILD_ROLES`. The `data.role = "slot_image_child"` tag on image children is harmless if unused.
2. `FabricCanvas.tsx` — remove the 4 new `c.on(...)` listeners and the `panModeGroupRef`.
3. `panels/ImageSlotPanel.tsx` — delete the file.
4. `RightPanel.tsx` — remove the 3-line routing block.
5. `ContextToolbar.tsx` — remove the `isSlotImageChild` block.

No backend changes. No data migration. All `slides.json` files remain valid — the `data` property on Fabric objects is already persisted via `customProperties`.
