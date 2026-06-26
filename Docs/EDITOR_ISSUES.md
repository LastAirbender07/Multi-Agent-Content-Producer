# Editor Issues — Deep Analysis

> Created: 2026-06-26
> Scope: 8 reported bugs/gaps in the Fabric.js canvas editor.
> Context: The editor uses a Fabric.js canvas that builds slide objects from `canvasTemplates/`. Charts are rasterized via Chart.js → data URL → FabricImage. Undo/redo snapshots via `useCanvasHistory`.

---

## Issue 1 — Stat Slide Renders Incomplete/Broken in Edit Mode

### What the user sees
Opening a stat slide (e.g. slide 3 of the run) in edit mode shows something visually different from the Playwright-rendered PNG. Elements appear misplaced or the chart is missing.

### Root cause
`buildAuroraStat` (canvas template) approximates text heights using character-count heuristics:
```typescript
const labelCharsPerLine = Math.max(1, Math.floor(META_WIDTH / (24 * 0.58)));
const labelLines = Math.max(1, Math.ceil(slide.stat_label.length / labelCharsPerLine));
```
This is a rough estimate. The Jinja2 HTML template uses real browser text layout (flex boxes, CSS wrapping), which the Fabric canvas cannot replicate exactly — font metrics differ between Playwright headless Chromium and the browser running the editor. The layout math compounds across multiple stacked elements (stat value → label → title → divider → body → chart), so small per-element errors accumulate into visible misalignment.

Additionally, `buildAuroraStat` hardcodes `"aurora"` in the chart call regardless of what tokens are passed:
```typescript
// aurora_stat.ts line 166
objects.push(await createChartObject(
  slide.chart_type as ChartType,
  slide.chart_data as ChartData,
  t,
  { left: STAT_LEFT, top: curY, width: CS - STAT_LEFT * 2, height: chartH },
  "aurora",   // ← always aurora, ignores that `t` might be LUMINA tokens
));
```
On a lumina stat slide, the chart is rendered with dark aurora colours on top of a light lumina background — visually broken.

### What needs to change
- Pass the theme dynamically: detect from tokens whether `t` is lumina and pass `"lumina"` or `"aurora"` accordingly.
- Improve height estimations: use actual Fabric `Textbox.calcTextHeight()` (synchronous) rather than char-count math. This is available after instantiating the object. Build the object first at throwaway position, measure, then place.
- Accept that pixel-perfect parity with Playwright is not achievable. The editor is an *editing* surface; PNG export re-renders via Playwright. Document this as intentional.

---

## Issue 2 — Chart Becomes a Plain Image After Full Undo

### What the user sees
After editing a chart and then undoing all changes, the chart becomes unselectable as a "chart" — the Chart Editor panel no longer appears; instead it shows the Image property panel or nothing.

### Root cause — critical serialization gap
`useCanvasHistory` saves and restores canvas snapshots like this:
```typescript
// useCanvasHistory.ts — line 22
undoStack.current.push(JSON.stringify(c.toJSON()));
// ...
// on undo:
c.loadFromJSON(JSON.parse(snapshot)).then(() => c.renderAll());
```
`canvas.toJSON()` without arguments serializes only the built-in Fabric properties. The custom `data` property (which carries `{ role: "chart", chartType, chartData, theme }`) is **not included**.

When undo restores a snapshot, the FabricImage for the chart is reconstituted without its `data` property. The RightPanel inspects `selectedObject.role` (which comes from `obj.data?.role`) — it finds `undefined`, so it falls back to showing the generic image panel, not the chart editor.

The same applies to ALL custom role annotations: `stat_value`, `stat_label`, `bullets`, `slide_title`, `engage_pill`, `cta_button`, etc. A full undo silently strips all semantic metadata from the canvas.

### Exact fix
In `useCanvasHistory.ts`, pass `["data"]` everywhere `toJSON` is called:
```typescript
undoStack.current.push(JSON.stringify(c.toJSON(["data"])));
// line 28, 37 — same pattern
const current = JSON.stringify(c.toJSON(["data"]));
```
This is a one-line fix per call site (3 total). The `data` property is a Fabric v6/v7 custom property mechanism — listing it in the array opt-in ensures it is included in serialization.

The same fix is needed wherever the canvas JSON is persisted: `getCanvasJson()` in `FabricCanvas.tsx` line 297 also calls `canvas.toJSON()` without `["data"]`, meaning **saves to the backend also lose all role annotations**. Loading a saved canvas then loses the ability to identify which object is the chart, title, bullets, etc.

---

## Issue 3 — Resizing a Chart Resizes the Wrapper, Not the Chart

### What the user sees
Dragging the corner handles of a chart object makes the bounding box grow/shrink but the chart content stays the same size (or worse, appears pixelated/blurry).

### Root cause — rasterized chart architecture
Charts rendered via `createChartFabricImage` are not Fabric vector objects. They are:
1. A Chart.js instance rendered onto a hidden `<canvas>` at a fixed pixel size (`defaultSize(type)` — e.g. 952×500 for column)
2. That canvas converted to a PNG data URL
3. That data URL loaded into a `fabric.FabricImage`

When the user drags the corner handles, Fabric's default behaviour changes `scaleX`/`scaleY` of the FabricImage. The underlying PNG is fixed at 952×500 px. Scaling it to 800px wide means Fabric CSS-scales the 952px raster — visually degraded.

The chart is not re-rendered at the new size. There is no re-render hook on `object:scaling:end` or `object:modified`.

For the funnel, progress, and number-stat chart types this is not an issue — they are rendered as Fabric Groups (vector), so they scale correctly. Only Chart.js-backed charts (bar, column, line, area, donut, radar, scatter, bubble, stacked variants) suffer from this.

### What needs to change
On `object:modified` (or more precisely after scaling ends), detect if the modified object is a chart image and re-render:
```typescript
c.on("object:modified", async (e) => {
  const obj = e.target as FabricObject & { data?: { role?: string; chartType?: ChartType; chartData?: ChartData; theme?: string } };
  if (obj?.data?.role === "chart" && obj.data.chartType && obj.data.chartData) {
    const br = obj.getBoundingRect();
    const newChart = await createChartObject(
      obj.data.chartType, obj.data.chartData, tokens,
      { left: obj.left, top: obj.top, width: Math.round(br.width), height: Math.round(br.height) },
      obj.data.theme ?? "aurora",
    );
    canvas.remove(obj);
    canvas.add(newChart);
    canvas.setActiveObject(newChart);
    canvas.renderAll();
  }
});
```
This requires Issue 2 to be fixed first (so `data` survives snapshots and is readable post-undo).

---

## Issue 4 — Image Cannot Be Deleted/Cropped/Rotated; Only a Wrapper Is Visible

### What the user sees
On an image slide (e.g. `angle=2, slide=2`), clicking on the image shows a rounded box that represents the image wrapper. The user wants to: delete the image, move it freely, crop it, rotate it, or change the corner radius.

### Root cause — `loadPanelImage` creates a clipped FabricImage
Panel images in content layouts are loaded with a built-in clip path:
```typescript
// contentLayouts/panelImage.ts (inferred from usage)
// Creates a FabricImage with a fabric.Rect clipPath (rx: 18)
```
The rounded corners are a `clipPath` on the FabricImage, not a separate wrapper object. The image object is selectable and movable by default. However:

1. **Delete**: should work via `Delete`/`Backspace` keyboard handler in FabricCanvas — but only if the image is correctly selectable. If the background blur layer is in front, the user might be clicking the wrong object.
2. **Move**: works if the object is selected. The issue may be that the blurred background image (role `bg_image`) is captured as the click target before the panel image.
3. **Crop**: not implemented. Fabric supports cropping via `cropX`, `cropY`, `width`, `height` of FabricImage but no UI exposes these.
4. **Rotate**: Fabric's default corner handles include a rotation handle but no numeric input exists in `ImagePropertyPanel`.
5. **Corner radius**: the clip path's `rx` value is hardcoded to `18` in the layout builder. There is no UI to change it.

### What needs to change
For the immediate gaps (delete, move, rotate) — these already work at the Fabric level; a usability fix is needed so the user can clearly select the panel image rather than the background layer. Setting `z-index` order explicitly (the panel image should be `bringToFront` relative to background layers) and adding a visual selection indicator would help.

For crop/rotate UI: `ImagePropertyPanel` needs:
- Rotation input (°) — reads/writes `obj.angle`
- Corner radius slider — reads/writes `(obj.clipPath as fabric.Rect).rx` and re-applies
- Crop would need a dedicated Crop Mode (a separate interaction state beyond this issue's scope)

---

## Issue 5 — Lumina Slides Convert to Aurora Colours During Editing

### What the user sees
A slide that was generated with the lumina theme (light background, blue/teal palette) renders with aurora colours (dark background, violet/cyan) when opened in the canvas editor.

### Root cause — two separate bugs

**Bug A: `buildAuroraStat` hardcodes `"aurora"` in chart theme** (same as Issue 1):
```typescript
// aurora_stat.ts line 166
"aurora",  // ← should be derived from `t`
```
The `lw()` wrapper in `REGISTRY` (index.ts line 27-28) passes `LUMINA` tokens to the aurora builder functions, but the chart call inside ignores the tokens and forces aurora colours.

**Bug B: `canvasDropHandlers.ts` hardcodes `"aurora-hook"` tokens for component drops**:
```typescript
// canvasDropHandlers.ts line 67
const t = getTokens("aurora-hook");
```
When a user on a lumina slide drags a component (glass card, stat block, bullet list, button) from the Templates panel, the dropped component always uses aurora dark colours. The correct approach is to pass the current `slideTheme` from the parent into `addComponentToCanvas`.

### What needs to change
- `aurora_stat.ts` line 166: Derive theme from tokens — add a helper or pass theme as a parameter.
- `canvasDropHandlers.ts`: Accept `theme` as parameter, call `` getTokens(`${theme}-hook`) `` instead of hardcoding.

---

## Issue 6 — Ungroup Places Components Outside Canvas / Wrong Position

### What the user sees
Clicking Ungroup on a button group (e.g. the gradient pill button on `angle=1, slide=5`) scatters child objects to positions outside the visible canvas area or to incorrect positions.

### Root cause — coordinate system mismatch in `handleUngroup`

The current ungroup logic:
```typescript
const groupMatrix = group.calcTransformMatrix();
const localPoint = new fabric.Point(child.left ?? 0, child.top ?? 0);
const canvasPoint = fabric.util.transformPoint(localPoint, groupMatrix);
child.set({ left: canvasPoint.x, top: canvasPoint.y, ... });
```

The issue: in Fabric v6+, when objects are inside a group, their `left` and `top` properties are stored in the group's **local coordinate system**, where the group's center is the origin. These are NOT the same as "offset from group top-left". The pill button Group (created with `originX: "left", originY: "top"`) positions its children relative to its own internal canvas, but the children's stored `left/top` are relative to the group's bounding box center by default.

`calcTransformMatrix()` returns the 6-element affine matrix that transforms from group-local space to canvas-global space. The `transformPoint` call should work — but the children inside a `fabric.Group` have their own `originX/Y` settings that affect how Fabric interprets their `left/top`. If a child has `originX: "left"` but `left: 0` means "left edge at group center X", the calculation is correct. If Fabric interprets it differently based on the group's own origin, the point ends up wrong.

The more reliable approach is to use `getAbsoluteCoords()` or decompose via `group.forEachObject()` with `toAbsolute()`:
```typescript
group.forEachObject(child => {
  const absPos = child.getAbsoluteCoords();  // Fabric v6 API
  // OR: use the group transform to convert correctly
});
```

Additionally, buttons are created with `originX: "left", originY: "top"` in the Group constructor. When the group's internal children have `originX: "left"`, their `left/top` within the group are offsets from the group's top-left corner (not center). This may interact incorrectly with `calcTransformMatrix()` which assumes center-origin group coordinates.

### What needs to change
Replace the manual coordinate math with Fabric's own `toAbsoluteTransform` / `getAbsoluteCoords()` utilities which correctly handle all origin/transform combinations:
```typescript
const group = activeObj as fabric.Group;
commit("Ungroup");
const ungrouped = group.toActiveSelection();  // Fabric v6 built-in ungroup
c.discardActiveObject();
ungrouped.forEach((obj: fabric.FabricObject) => {
  c.add(obj);
});
c.remove(group);
c.renderAll();
```
Fabric's `Group.toActiveSelection()` handles all the coordinate math internally and is the canonical ungroup method in v6+.

---

## Issue 7 — Bullet Points Cannot Be Edited

### What the user sees
On a content slide with bullets (e.g. `angle=1, slide=2`), clicking on a bullet point does not make it editable. The text cannot be changed.

### Root cause — bullets are Fabric Groups, not Textboxes

`createBulletItem` (shared/components.ts) creates each bullet as a `fabric.Group([circle, num, label])` where `label` is a `fabric.Textbox`. Fabric does not allow direct text editing of a Textbox nested inside a Group — double-clicking a Group enters the group's selection mode but does not forward text editing events to inner Textboxes.

Additionally, `getTextFields()` in FabricCanvas looks for an object with `data.role === "bullets"`:
```typescript
const get = (role: string) => objs.find(o => o.data?.role === role)?.text ?? "";
const bulletsRaw = get("bullets");
```
But `createBulletItem` sets `data.role = "bullet_item"` on each Group, not "bullets". There is no single "bullets" textbox. So even if the user edits via ungroup → type, the changes are not picked up by `getTextFields()` and are not exported when "Export PNG" is clicked.

The whole bullet architecture has a fundamental mismatch: the canvas templates create bullets as individual visual Groups (for the numbered circle + text layout), but `getTextFields` expects a single textbox with role "bullets" containing newline-separated text.

### What needs to change
Two possible approaches:

**Option A (minimal):** Keep bullet Groups as visual elements but add a hidden Textbox with `role: "bullets"` as a sync target. When any bullet Group is edited (after ungroup), the text syncs back to the hidden Textbox. Complex to maintain.

**Option B (clean):** Add a `role: "bullets"` Textbox alongside the visual bullet Groups. When the user edits the Textbox (which shows the raw text), the visual bullets re-render. This is the "edit mode vs display mode" split — simpler, but requires a re-render on text change.

**Option C (pragmatic, current arch):** Keep bullet Groups as-is for display, but add a bullet editing UI to the RightPanel. When the user selects any bullet Group (or the slide), the RightPanel shows a `BulletsPropertyPanel` with an editable list (add/remove/edit per line). Changes update the Group children directly. This keeps the visual architecture intact and gives a good UX without architectural surgery.

Option C is the least invasive given the current canvas template system.

---

## Issue 8 — Template Decorative Elements Missing / Not User-Accessible

### What the user sees
The decorative elements that define the slide template identity — the large radial glows on CTA slides, the oversized decorative rings on Engage slides — are either not visible in the canvas editor or cannot be added to other slides.

### Two separate problems

**Problem A: Decorative elements ARE created but are non-selectable/evented**

Looking at `aurora_cta.ts`:
```typescript
// createGlowBg objects — generated with selectable:false, evented:false
```
And `aurora_engage.ts`:
```typescript
makeRing(720, CS-280, -320)  // selectable: false, evented: false
```
These objects are deliberately non-interactive. They appear in the canvas but the user cannot click them to move/delete them. If they are off-screen (the rings bleed outside the 1080×1080 canvas boundary), they may not be visible at all in the editor view.

**Problem B: These decorative elements are not available in the TemplatesPanel**

The TemplatesPanel offers components the user can drag onto the canvas: brand-bar, dark-card, stat-block, quote-block, bullet-list, accent-line, eyebrow-pill, and 6 button styles. The CTA gradient glows and Engage rings are NOT in this list. Users who want to add a background tinge to a content slide or a decorative ring to a quote slide cannot do so.

### What needs to change

For **Problem A**: Decorative elements should still be non-clickable by default (background elements), but the TemplatesPanel should offer toggle controls like "Show/hide background glow" or "Show/hide decorative rings" for the slide types that have them.

For **Problem B**: Add `glow-blob` and `deco-ring` to the component dropper registry. These are simple Fabric objects (Ellipse with gradient fill + opacity for glows; Circle with stroke for rings) and require only a new entry in `canvasDropHandlers.ts` and a corresponding dropper function in `componentDroppers/`.

The deeper issue is that `createGlowBg` and `makeRing` produce objects without `data.role` annotations. Without a role, the TemplatesPanel cannot identify these as "template elements" vs "user-added elements" for display purposes. All template-generated decorative elements should have `data.role` set, even if non-interactive.

---

## Summary Table

| # | Issue | Root Cause | Severity |
|---|-------|-----------|----------|
| 1 | Stat slide renders differently in edit | Heuristic text height estimation + aurora hardcoded in chart call | Medium |
| 2 | Chart loses identity after undo | `canvas.toJSON()` missing `["data"]` parameter — loses ALL role annotations | **Critical** |
| 3 | Chart resize scales wrapper, not chart | Rasterized chart arch — no re-render on scale | High |
| 4 | Image has inaccessible wrapper | clip path misunderstood as wrapper; limited crop/rotate UI | Medium |
| 5 | Lumina slides show aurora in editor | Hardcoded `"aurora"` in stat chart call + hardcoded tokens in component dropper | High |
| 6 | Ungroup places objects wrongly | Manual coordinate math doesn't match Fabric v6 group-local origin conventions | **High** |
| 7 | Bullet points not editable | Bullets are Groups, not Textboxes; `getTextFields` looks for wrong role | **High** |
| 8 | Template decorations missing/inaccessible | Non-interactive, not in dropper registry, missing `data.role` | Low–Medium |

---

## Cross-Cutting Issue: `canvas.toJSON()` Missing Custom Properties

Issues 2, 5 (partial), and 8 share a common root: the custom `data` property is not included in Fabric serialization. This affects:
- Undo/redo snapshots (lose `data.role`, `chartType`, `chartData`)
- Canvas saves to backend (`api.saveCanvas()`)
- Checkpoint saves to localStorage

Every call to `canvas.toJSON()` in the codebase must be audited and changed to `canvas.toJSON(["data"])`. There are **5 call sites**:
1. `useCanvasHistory.ts` line 22 — undo push
2. `useCanvasHistory.ts` line 28 — undo current state capture
3. `useCanvasHistory.ts` line 37 — redo current state capture
4. `FabricCanvas.tsx` line 297 — `getCanvasJson()` (used for save)
5. `useCanvasCheckpoint.ts` line 15 — auto-checkpoint to localStorage (confirmed, same pattern)

---

## Cross-Cutting Issue: Legacy Runs Are View-Only — No Edit, No Migration

Slides that were generated before the Fabric canvas editor existed have no `canvas_template` field in `slides.json`. In `canvasSlideLoader.ts`:
```typescript
const viewOnly = !tmpl;   // line 104
```
This correctly locks them as view-only — and that is the **right behaviour**. Legacy runs lack the template metadata needed to build a Fabric canvas from their slide data reliably. Rather than attempting a best-effort reconstruction that might produce a broken editing surface, the editor should be explicit about this.

### What to show the user
When `viewOnly === true` (i.e. `canvas_template` is absent), the canvas area should display a clear "not editable" state instead of a silent read-only canvas:
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   ⚠  This slide format is not supported             │
│      for canvas editing.                             │
│                                                      │
│      Regenerate this carousel to enable editing.     │
│                                                      │
└──────────────────────────────────────────────────────┘
```
The "Edit" button should be hidden or replaced with this message banner. PNG preview still works — the user can view and download; only canvas editing is unavailable.

**No migration needed. No fallback rebuild. Legacy slides are view-only, full stop.**

---

## Additional Finding: Issue 6 — Verify `toActiveSelection()` API Before Shipping

The recommended fix for Issue 6 uses `group.toActiveSelection()` as the canonical Fabric v6 ungroup method. Before implementing:

- Confirm this method exists in the exact installed Fabric version: `grep -r "toActiveSelection" node_modules/fabric/src/` — if absent, the fallback is `group._restoreObjectsState()` + manual re-add.
- The current broken implementation silently produces wrong positions (objects fly off-screen) rather than crashing. The replacement must be tested with: a pill button group placed at a non-zero position, a group that has been moved after creation, and a group that has been scaled.
- Do not ship without a manual test on `angle=1, slide=5` confirming ungrouped children land at their visible positions.

---

## Additional Finding: Issue 7 — Bullet Sibling Selection for RightPanel

Option C (BulletsPropertyPanel in RightPanel) requires collecting **all** bullet items from the current slide when any single bullet Group is selected. The problem: bullets are independent objects in the canvas — selecting bullet 2 does not give access to bullets 1 and 3.

### Correct approach
When a `data.role === "bullet_item"` object is selected, the RightPanel must scan all canvas objects for siblings:
```typescript
const canvas = canvasApiRef.current?.getCanvas();
const allBullets = canvas?.getObjects()
  .filter(o => (o as any).data?.role === "bullet_item")
  .sort((a, b) => (a as any).data.index - (b as any).data.index);
```
Each bullet Group contains a `fabric.Textbox` as its third child (index 2: `[circle, num, label]`). To read/write text:
```typescript
const label = (bulletGroup as fabric.Group).getObjects()[2] as fabric.Textbox;
// read:  label.text
// write: label.set("text", newValue); canvas.renderAll();
```
This avoids architectural surgery while giving a working edit UX. The alternative — wrapping all bullets in a `bullets_container` Group — would require changes to every content layout builder and is out of scope for a bug fix.
