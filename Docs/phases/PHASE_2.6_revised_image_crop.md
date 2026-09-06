# PHASE 2.6 (REVISED) — Proper Image Crop Mode Using Fabric v7 Extensions

## Status
APPROVED — Loop 1 complete (2026-09-06)

> **This replaces the broken PHASE_2.6_image_slot_crop_pan.md entirely.**
> The slot/group replace system built in the first attempt was the wrong architecture.
> See § "Why the first attempt failed" below.

---

## Why the First Attempt Failed (Root Cause)

The slot/group system was designed from scratch without first checking what Fabric v7 already provides. This violated the hard rule added to REVIEW_PROTOCOL.md:

> **Always check existing APIs before building anything from scratch.**

Fabric v7.4.0 ships with a complete, production-quality image crop extension at:
```
fabric/dist-extensions/fabric-extensions.min.js
```

It exports:
- `enterCropMode(event)` — double-click handler; switches image to crop controls + ghost overlay
- `createImageCroppingControls()` — 8 handles: 4 corners (scale within bounds) + 4 edges (crop width/height)
- `cropPanMoveHandler` — `object:moving` listener that converts drag → `cropX/cropY` change (image stays fixed, viewport moves)
- `renderGhostImage` — `before:render` hook that draws the full image at 50% opacity OUTSIDE the crop boundary, so the user can SEE what they are cropping to

The result: a `FabricImage` with `cropX/cropY/width/height` set shows only the cropped portion but the user can see the full image ghosted behind it while in crop mode. This is the standard Canva/Figma behaviour. It was already implemented. We just didn't look.

The first attempt built invisible slot groups, a fillImageSlot function, getPanImageChild helpers, a custom clamp-in-group drag system, ImageSlotPanel, etc. — 8+ files of complexity to deliver worse UX than what a 4-line function call already provides.

---

## Problem Statement (What the User Actually Needs)

The user has images in the **Images panel** (Pexels search, web search, run images). They want to:

1. Drag an image from the Images panel onto the canvas (already works — drops as FabricImage)
2. Resize/position it freely (already works — ImagePropertyPanel handles opacity/rotation/filters)
3. **Crop it** — show only a portion of the image, with visual feedback of what's hidden
4. Position frame components (phone mockup, polaroid, image pair) as visual overlays

The user discovered #4 naturally (drag Spiderman image + position manually). The ONLY thing missing is #3.

The slot/group "Replace Photo" flow is not needed. Remove it.

---

## What Changes

### REMOVE (all from the broken first attempt):
| What | Where |
|---|---|
| `fillImageSlot()` function | `canvasDropHandlers.ts` |
| `getPanImageChild()` helper | `canvasDropHandlers.ts` |
| `SLOT_IMAGE_CHILD_ROLES` export | `canvasDropHandlers.ts` |
| Auto-select image child after fill | `canvasDropHandlers.ts` |
| `data.role = "slot_image_child"` tagging | `canvasDropHandlers.ts` |
| `ImageSlotPanel.tsx` panel | `panels/ImageSlotPanel.tsx` |
| ImageSlotPanel routing | `RightPanel.tsx` |
| `mouse:dblclick` pan mode handler | `FabricCanvas.tsx` |
| `object:moving` clamp handler | `FabricCanvas.tsx` |
| `panModeGroupRef` state ref | `FabricCanvas.tsx` |
| `selection:cleared/updated` pan exit | `FabricCanvas.tsx` |
| `onSelectedWithPanCheck` | `FabricCanvas.tsx` |
| Escape key pan mode handler | `FabricCanvas.tsx` |
| "Replace Photo" button + file input | `ContextToolbar.tsx` |
| "Adjusting Photo" amber toolbar | `ContextToolbar.tsx` |
| `isSlotImageChild` check | `ContextToolbar.tsx` |

### ADD (the correct implementation):
| What | Where |
|---|---|
| `enterCropMode` wired on double-click of any FabricImage | `FabricCanvas.tsx` |
| "Crop" button in ImagePropertyPanel | `panels/ImagePropertyPanel.tsx` |
| Visual "CROPPING" indicator in ContextToolbar | `ContextToolbar.tsx` |
| "Done Cropping" Escape / click-outside handler | `FabricCanvas.tsx` |
| Multi-select group fix (exclude deco objects) | `FabricCanvas.tsx` |

### KEEP (from the broken attempt — these were correct):
- `subTargetCheck: true` on phone/polaroid/image-pair groups — still useful for interactive editing
- `interactive: true` on slot groups — still useful

---

## External Verification Log

| Claim | Verified against | Verified on |
|---|---|---|
| `fabric/dist-extensions/fabric-extensions.min.js` ships with fabric v7.4.0 | `ls frontend/node_modules/.pnpm/fabric@7.4.0/node_modules/fabric/dist-extensions/` | 2026-09-06 |
| `enterCropMode` is exported from the min bundle | `grep -n "enterCropMode" fabric-extensions.min.js` → found at line 1 | 2026-09-06 |
| `renderGhostImage` draws full image at 50% opacity outside crop boundary | Read `croppingHandlers.ts` line 347–367: `ctx.globalAlpha *= 0.5; ctx.drawImage(element, ghostX, ghostY)` | 2026-09-06 |
| `cropPanMoveHandler` converts drag → `cropX/cropY` change (image stays fixed) | Read `croppingHandlers.ts` line 175–208 | 2026-09-06 |
| `FabricImage.cropX/cropY/width/height` persisted via `customProperties` | `fabric/dist/index.js` line 19367: `const IMAGE_PROPS = ["cropX", "cropY"]` — auto-serialized | 2026-09-06 |
| Double-click on FabricImage fires `mousedblclick` event on the image object | `fabric/dist/index.js` line 17835: `this.on("mousedblclick", this.doubleClickHandler)` on IText; canvas fires `mouse:dblclick` generally | 2026-09-06 |
| `fabric-extensions.min.js` CANNOT be imported directly | It requires `westures` which is not installed. Use individual `.mjs` files instead. | 2026-09-06 |
| `fabric/dist-extensions/cropping_controls/enterCropMode.mjs` imports fine | `node -e "import('./...enterCropMode.mjs').then(m => console.log(typeof m.enterCropMode))"` → `function` ✅ | 2026-09-06 |
| `FabricObject.customProperties` already includes "data" | `FabricCanvas.tsx` line 21: `fabric.FabricObject.customProperties.push("data")` | 2026-09-06 |

---

## Entry Conditions

- [ ] `npx tsc --noEmit` from `frontend/` → 0 errors: `cd frontend && npx tsc --noEmit`
- [ ] Both servers running
- [ ] **Verify crop mjs import still works** (confirm no regression from pnpm update): `cd frontend && node -e "import('./node_modules/.pnpm/fabric@7.4.0/node_modules/fabric/dist-extensions/cropping_controls/enterCropMode.mjs').then(m=>console.log(typeof m.enterCropMode))"` → `function`

---

## Step 0 — Import path (VERIFIED 2026-09-06)

**The correct import path is the individual `.mjs` files in `dist-extensions/cropping_controls/`.**

The `fabric-extensions.min.js` bundle fails because it depends on `westures` (gesture library, not installed). The `dist-extensions/index.mjs` also imports westures. But the individual crop files have NO westures dependency:

```
fabric/dist-extensions/cropping_controls/
  enterCropMode.mjs      ← imports only croppingHandlers.mjs + croppingControls.mjs
  croppingControls.mjs   ← imports only croppingHandlers.mjs + fabric
  croppingHandlers.mjs   ← imports only fabric
```

**Verified working:**
```bash
node -e "import('./node_modules/.pnpm/fabric@7.4.0/node_modules/fabric/dist-extensions/cropping_controls/enterCropMode.mjs').then(m => console.log(typeof m.enterCropMode))"
# → function  ✅
```

**Import strategy decision (verified 2026-09-06):**

`fabric/extensions` → types work but runtime fails (westures not installed).  
`fabric/dist-extensions/cropping_controls/*.mjs` → runtime works but NOT in package `exports` map → Turbopack may reject.

**→ PRIMARY STRATEGY: inline the 3 functions in `frontend/utils/fabricCrop.ts`.**

This is zero-risk: the functions are ~80 lines, pure TypeScript, only import from `fabric`. No external dependencies, no Turbopack uncertainty. The source is in `fabric/extensions/cropping_controls/` — we copy it and own it.

What to copy into `fabricCrop.ts`:
- `enterCropMode` (18 lines from `enterCropMode.ts`)
- `renderGhostImage` (21 lines from `croppingHandlers.ts`)
- `cropPanMoveHandler` (34 lines from `croppingHandlers.ts`)
- `createImageCroppingControls` (88 lines from `croppingControls.ts`) — this is the largest but still manageable

Total: ~161 lines. All already verified correct by Fabric maintainers. We pin them to fabric v7.4.0.

---

## Implementation Steps

### Step 2.6.1 — Create `frontend/utils/fabricCrop.ts`

**File:** `frontend/utils/fabricCrop.ts` (new)

Single source-of-truth for crop mode imports. Using the verified `.mjs` paths.

**File content for `frontend/utils/fabricCrop.ts`:**

Inline the functions from `fabric/extensions/cropping_controls/` source (pinned to v7.4.0).
Copy verbatim from:
- `node_modules/.pnpm/fabric@7.4.0/node_modules/fabric/extensions/cropping_controls/enterCropMode.ts`
- `node_modules/.pnpm/fabric@7.4.0/node_modules/fabric/extensions/cropping_controls/croppingHandlers.ts` (only `cropPanMoveHandler` and `renderGhostImage`)
- `node_modules/.pnpm/fabric@7.4.0/node_modules/fabric/extensions/cropping_controls/croppingControls.ts` (only `createImageCroppingControls`)

Add header comment:
```typescript
/**
 * fabricCrop.ts — Fabric v7.4.0 image crop helpers (inlined from fabric/extensions)
 *
 * Source: fabric/extensions/cropping_controls/ — pinned to v7.4.0
 * Why inlined: fabric/extensions runtime import pulls in 'westures' (not installed).
 *              deep .mjs path imports are outside the package exports map (Turbopack risk).
 * If fabric is upgraded: re-copy from the new version's cropping_controls/ folder.
 *
 * DO NOT build custom crop/pan — these are the canonical Fabric implementations.
 */
```

**Test:**
```bash
cd frontend && npx tsc --noEmit
```
Expected: 0 errors.

**Test:**
```bash
cd frontend && npx tsc --noEmit
```

---

### Step 2.6.2 — Wire `enterCropMode` on double-click of FabricImage in FabricCanvas.tsx

**File:** `frontend/components/editor/FabricCanvas.tsx`

**Remove all pan-mode code from the broken first attempt** (panModeGroupRef, mouse:dblclick handler, object:moving clamp, selection:cleared/updated pan exits, Escape handler, onSelectedWithPanCheck).

**Add:**

```typescript
import { enterCropMode } from "@/utils/fabricCrop"; // our inlined copy — see fabricCrop.ts

// Inside the canvas setup useEffect, after the existing event listeners:

// ── Image crop mode: double-click any FabricImage → enter crop mode ─────────
// Uses Fabric v7's built-in enterCropMode extension:
// - Swaps to 8 crop handles (4 corners = scale within src bounds, 4 edges = crop)
// - renderGhostImage draws the full image at 50% opacity OUTSIDE the visible area
//   so the user can see what they're cropping to
// - cropPanMoveHandler converts drag → cropX/cropY change (image stays fixed)
// - Second double-click exits crop mode (built into enterCropMode)
c.on("mouse:dblclick", (e) => {
  if (isViewOnlyRef.current) return;
  const target = e.target as fabric.FabricObject | null;
  if (!target || target.type !== "image") return;
  // enterCropMode expects to be called as an event handler with { target }
  enterCropMode.call(undefined as unknown as () => void, { target } as Parameters<typeof enterCropMode>[0]);
  c.requestRenderAll();
});
```

**Also add Escape to exit crop mode:**
```typescript
const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    // If an image is in crop mode, double-click it programmatically to exit
    const active = c.getActiveObject() as (fabric.FabricImage & { _cropMode?: boolean }) | null;
    if (active?.type === "image") {
      // Fire mousedblclick on the active image to trigger the exitCropMode
      // that enterCropMode registered via fabricImage.once('mousedblclick', exitCropMode)
      active.fire("mousedblclick", { target: active });
      c.requestRenderAll();
      e.preventDefault();
    }
  }
};
window.addEventListener("keydown", onKeyDown);
// Cleanup: return () => { window.removeEventListener("keydown", onKeyDown); c.off(); c.dispose(); ... }
```

---

### Step 2.6.3 — Add "Crop" button to ImagePropertyPanel

**File:** `frontend/components/editor/panels/ImagePropertyPanel.tsx`

Add a "Crop Image" button that triggers `enterCropMode`:

```typescript
import { enterCropMode } from "@/utils/fabricCrop";

// Inside ImagePropertyPanel, add after the "Bring Forward" button:
<Row label="">
  <button
    onClick={() => {
      if (!obj || !canvas) return;
      enterCropMode.call(undefined as unknown as () => void, { target: obj });
      canvas.requestRenderAll();
    }}
    className="w-full py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 hover:bg-amber-600/20 hover:text-amber-300 transition-all"
  >
    ✂ Crop Image
  </button>
</Row>
```

---

### Step 2.6.4 — Show "CROPPING" indicator in ContextToolbar

**File:** `frontend/components/editor/ContextToolbar.tsx`

**Remove:** the `isSlotImageChild` amber toolbar and Replace Photo button + file input (entire blocks from the broken first attempt).

**Add:** detect if an image is in crop mode (Fabric adds specific crop controls; we can detect by checking if controls include `mlc`):

```typescript
// Detect crop mode: enterCropMode replaces the standard controls with crop controls
// The crop controls include 'mlc' (middle-left crop handle) which normal controls don't
const isCropMode = selectedObject.fabricType === "image" &&
  !!(canvas?.getActiveObject() as fabric.FabricImage & { controls?: Record<string, unknown> })
    ?.controls?.mlc;

// In the toolbar JSX, add at the very top, before text controls:
{isCropMode && (
  <div className="flex items-center gap-1.5 px-2 py-1">
    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
    <span className="text-[10px] font-semibold text-amber-400">Cropping</span>
    <span className="text-[10px] text-zinc-600">· Drag to pan · Handles to crop · Dbl-click or Esc to finish</span>
  </div>
)}
```

---

### Step 2.6.5 — Fix multi-select: exclude decorative objects

**File:** `frontend/components/editor/FabricCanvas.tsx`

The user reported: when selecting image + polaroid component together, the background slide objects move too. This is because multi-select includes all objects at click positions.

Fix: in the `selection:created` handler, if the active selection includes objects with decorative roles (bg, overlay, etc.), remove them from the selection:

```typescript
// In the canvas setup useEffect, add after the existing selection:created listener:
c.on("selection:created", (e) => {
  const sel = c.getActiveObject();
  if (!sel || sel.type !== "activeselection") return;
  const activesel = sel as fabric.ActiveSelection;
  const objs = activesel.getObjects();
  // Remove decorative objects from multi-select
  const DECO_ROLES = new Set([
    "compact_bg", "editorial_bg", "dark_bg", "aurora_bg",
    "bg_overlay", "glass_overlay", "gradient_overlay",
    "bg_glow_0", "bg_glow_1", "brand_bar_bg", "brand_bar_border",
    "progress_bar", "brand_logo", "editorial_border", "editorial_rule",
    "compact_deco_quote",
  ]);
  const decoObjs = objs.filter(o =>
    DECO_ROLES.has((o as fabric.FabricObject & { data?: { role?: string } }).data?.role ?? "")
  );
  if (decoObjs.length > 0 && decoObjs.length < objs.length) {
    // Remove decorative from selection, keep content
    decoObjs.forEach(o => activesel.remove(o));
    c.requestRenderAll();
  }
});
```

---

### Step 2.6.6 — Remove broken slot/group code

**File:** `frontend/components/editor/canvasDropHandlers.ts`

Remove:
- `fillImageSlot` export (entire function — it's no longer called anywhere after removing the Replace Photo button)
- `getPanImageChild` export
- `SLOT_IMAGE_CHILD_ROLES` export
- The `data.role = "slot_image_child"` tagging lines in each fill branch

Keep:
- `IMAGE_SLOT_ROLES` set (still useful to identify slot group types)
- `addImageToCanvas` (used when dragging images onto canvas)
- `addComponentToCanvas` (used for all component drops)

**File:** `frontend/components/editor/panels/ImageSlotPanel.tsx`
→ Delete entirely.

**File:** `frontend/components/editor/RightPanel.tsx`
→ Remove the `IMAGE_SLOT_ROLES` routing block.

---

## Done Criteria

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] Double-click any image on canvas → ghost overlay of full image appears at 50% opacity + 8 crop handles appear
- [ ] Drag image in crop mode → `cropX/cropY` change, image position stays fixed (viewport moves not the image)
- [ ] Drag corner handle → scales image within original pixel bounds
- [ ] Drag edge handle → crops from that edge
- [ ] Second double-click OR Escape → exits crop mode, returns to normal selection handles
- [ ] "Crop Image" button in ImagePropertyPanel triggers same crop mode
- [ ] "CROPPING" amber indicator in ContextToolbar when image is in crop mode
- [ ] `cropX/cropY/width/height` survive Save + Reload (persisted in canvas JSON)
- [ ] Multi-select: selecting aurora-hook headline + a dropped component does NOT include bg_overlay/glass_overlay
- [ ] No regression on `node scripts/audit_one.cjs template aurora-hook`
- [ ] `fillImageSlot`, `getPanImageChild`, `ImageSlotPanel` are gone from the codebase

---

## Real Data Testing (Loop 3)

### Scenario A — Crop landscape photo to show face
1. Search "rajini" in Images panel
2. Drag photo onto aurora-hook slide
3. Double-click the image → ghost shows full image at 50% opacity, 8 crop handles appear
4. Drag the image (pan) → `cropX/cropY` change, the ghost moves under the visible crop window
5. Drag edge handle to tighten crop → visible area shrinks, ghost still visible outside
6. Second double-click → exits crop mode, image shows only cropped area
7. Save → reload → crop is preserved

### Scenario B — Image behind polaroid frame
1. Drop `cover-polaroid-frame` component
2. Search any image in Images panel → drag onto canvas
3. Position image behind polaroid (use "Send backward" to layer correctly)
4. Crop image to show the right portion inside the polaroid frame
5. Select both image + polaroid → confirm background slide objects NOT included in selection

### Scenario C — Multi-select and group
1. Drop polaroid component, add an image behind it
2. Shift-click both → confirm only those 2 objects selected (not bg_overlay etc.)
3. Group them → they move together
4. Ungroup → both independently selectable again

---

## Known Constraints / Gotchas

### `enterCropMode` import under Turbopack
The `fabric/extensions/` directory contains TypeScript source. Turbopack may or may not be able to follow this path. If `npx tsc --noEmit` passes but the browser throws a runtime import error, fall back to Option C (inline the 4 functions). The functions are tiny and have zero external dependencies beyond `fabric`.

### `enterCropMode` signature
The source shows:
```typescript
export const enterCropMode = function enterCropMode(
  this: (args: TPointerEventInfo) => void,
  { target }: TPointerEventInfo,
)
```
It's designed to be called as a `mousedblclick` event handler. When calling manually, pass `{ target: fabricImageObject }` as the argument. The `this` context doesn't matter — set it to `undefined`.

### Crop mode persistence across saves
`FabricImage.cropX/cropY` are in `IMAGE_PROPS` and auto-serialized by Fabric. They survive `canvas.toJSON()` and `canvas.loadFromJSON()` correctly. The visible `width/height` (the crop window size) is also serialized. No special handling needed.

### `renderGhostImage` uses `before:render` on the image object
This fires every render frame. It draws the full image + outline at 50% opacity using the image's own canvas context. When `exitCropMode` is called, this listener is removed and the ghost disappears.

### The "ghost outside clip" problem for grouped slot objects
If the image is placed BEHIND a polaroid frame group (the user's scenario), the ghost image will render below the frame — which is correct. The ghost helps the user see what part of the photo is visible through the frame.

---

## Rollback Plan

Step 2.6.6 (removing broken slot code) is a breaking change for any existing slides that used "Replace Photo". Since that feature was never shipped to production (it's in the current uncommitted diff), rollback is: `git checkout -- frontend/` to restore the state before this phase.

---

*Loop 1 complete — 2 passes done, zero issues remaining.*
*RULE ADDED TO REVIEW PROTOCOL: see § "Hard rule on API research" in REVIEW_PROTOCOL.md*
