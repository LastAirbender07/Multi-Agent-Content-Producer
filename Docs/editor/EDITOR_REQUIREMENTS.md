# Editor Requirements v2 — Canvas-First Redesign

> Written: 2026-06-18  
> Status: Requirements gathering + technology validation  
> Supersedes: EDITOR_PLAN.md (iteration 1 — iframe-preview approach)

---

## Context: Why a Redesign?

The current editor works like this:

```
Backend renders slide → Jinja2 HTML → Playwright PNG → iframe preview
```

The iframe is **read-only**. Edits happen in a sidebar panel, the backend re-renders, and the iframe reloads. This creates a fundamentally broken editing loop:

- You can't click a text on the slide and edit it there
- You can't drag an image box around the canvas
- Auto-save races with user input (a save mid-keystroke reloads the iframe)
- There is no concept of "canvas elements" — just a rendered image

The user's requirements demand a **canvas-first** architecture. This document captures those requirements, validates them against existing tools, and outlines the required changes.

---

## Requirement 1 — In-Place Text Editing on the Canvas

### What the user wants

Click any text on the slide (title, body, bullet, stat, caption) → an editable text box appears **on the canvas at that exact position**. You edit inline. The canvas reflects the change live. No side panel needed for basic text edits.

Text boxes must:
- Expand/shrink vertically within fixed canvas bounds (1080×1080px)
- Support style controls (font size, weight, color, alignment) in a floating toolbar that appears above the selection
- Respect canvas boundaries — text cannot overflow the 1080×1080 box

### Why the current approach can't support this

The current slide is an HTML file rendered by Jinja2 into a screenshot. The HTML has no interactive contract with the React app. Injecting `postMessage` click listeners was a workaround, but it cannot support:
- Cursor positioning within text
- Live text reflow on the canvas
- Floating per-element toolbars
- Mixed font/style within a text element

### Validation

This is exactly what **Konva.js** (and its React wrapper `react-konva`) was designed for. Konva's `Text` node supports interactive editing via `dblclick` → `textarea` overlay pattern (industry standard for canvas text editing). **Fabric.js** also supports this with its `IText`/`Textbox` objects which have built-in cursor, selection, and multi-style support.

Both approaches are used in production Canva-like editors (see: Fabritor, react-image-editor).

**Decision: Fabric.js `Textbox` is better here** — it natively handles multi-line text, cursor positioning, text selection, and per-character styling without custom overlay logic. Konva requires manual `<textarea>` DOM overlay, which replicates what Fabric already does.

---

## Requirement 2 — Save / Undo / Redo Architecture

### What the user wants

> "Automatic saving is an overkill for now — let the user do the editing and then save it. Then we normally provide undo/redo."

Or if auto-save is used:
> "Continuously scrape the changes into another object which will be like a checkpoint. Do not save the original thing — save these checkpoints of the copy. So when user wants to redo/undo — use the backup copy."

### The current approach's problem

`use-undoable` tracks simple React state (a `SlideSnapshot` object). But:
1. Any auto-save fires a backend call which reloads the iframe preview
2. The reload interrupts mid-keystroke editing
3. The undo stack only holds the snapshot values, not the *intent* behind changes (e.g., "user repositioned image" vs "user typed letter A")

### How industry products handle this

#### Figma
- Canvas state is an **immutable tree** (not mutable DOM). Every action produces a new state version.
- Undo/redo operates on the version tree — no backend calls involved.
- Auto-save is **async and non-blocking**: it serializes the current version tree to the server in the background. The UI never waits for it.
- The user's in-progress edit (e.g., dragging) is **not committed to the undo stack** until the gesture ends (mouseup).

#### Google Docs
- Keystrokes are buffered into a **pending operation** object.
- That object is only pushed to the undo stack when the user pauses (300ms) or presses a structural key (Enter, Backspace).
- This means typing "hello" creates **one** undo entry, not five.

#### Canva
- Canvas state is a **JSON document** (similar to Figma's scene graph).
- Undo/redo is a stack of JSON patches (RFC 6902 format) — compact and reversible.
- Auto-save: debounced 2s after last change, background — never blocks the UI.

### Recommended approach for this project

**Command Pattern with explicit Save:**

```
Each user action → Command object { do(), undo() }
                 → pushed to local undoStack[]
                 → canvas re-renders immediately

Ctrl+Z → pop from undoStack → call cmd.undo() → canvas re-renders
Ctrl+Shift+Z → pop from redoStack → call cmd.do() → canvas re-renders

Save button → serialize current canvas state (Fabric JSON) → POST to backend
Auto-checkpoint (optional) → serialize to localStorage every 30s — not sent to server
```

Key principle: **the server only receives a save when the user explicitly asks for it (or on a long inactivity timeout)**. The undo/redo stack is entirely local. The canvas is the source of truth during an editing session.

This is how Fabritor (1.2k stars, Fabric.js) and react-image-editor (544 stars, Konva.js) both implement it.

---

## Requirement 3 — Image Panel as Persistent Left Side Panel (not a popup)

### What the user wants

> "It must be in a side panel — maybe the left side panel. Make 'Files' and 'Images' as collapsable side panels."

> "Once an image is saved — it is retained — I can use it whenever I want. Once I search for an image — the search results are saved — again I can use it whenever I want."

### Current problem

The `ImageEditModal` is a popup that disappears when closed. Search results are lost. Uploaded images are not shown in a browsable library. And critically: **the pipeline already downloads images into each run's folder, but the editor doesn't show them at all.**

When the pipeline generates a carousel it downloads images here:
```
backend/outputs/runs/{run_id}/content/angle_0/images/slide_01.jpg
backend/outputs/runs/{run_id}/content/angle_0/images/slide_02.jpg
backend/outputs/runs/{run_id}/content/angle_1/images/slide_01.jpg
...
```

These images are completely invisible to the user in the current editor. They exist on disk, were chosen by the AI for specific slides, and are high-quality (1080px+ from Pexels/DDG) — yet the user can't browse, reuse, or reassign them.

---

### North Star: A Unified Image Library

**The goal is to make every image you've ever touched in this tool one click away from the canvas.**

Think of it as a local, private Pexels — organised by where the images came from, searchable, persistent across sessions, and always ready to drag onto the canvas.

---

### 3a — Run Images (auto-populated, the critical missing piece)

When the user opens a run in the editor, the Images panel **automatically shows all images already downloaded for that run**, grouped by angle:

```
Run Images
├── Angle 1 (11 images)
│   ├── slide_01.jpg  [thumbnail]
│   ├── slide_02.jpg  [thumbnail]
│   └── ...
├── Angle 2 (11 images)
│   └── ...
└── Angle 3 (11 images)
    └── ...
```

These images are read directly from `outputs/runs/{run_id}/content/angle_n/images/` via a backend endpoint. No re-downloading. No duplication. Just exposing what's already there.

**Use cases this unlocks:**
- Angle 1 used a great photo of a person — user wants to use the same photo on Angle 2's slide 3. Currently impossible. With this: drag it over.
- Pipeline put an irrelevant image on slide 4 — user opens Images panel, picks a better one from the other 10 already downloaded, drags it onto slide 4.
- User wants to see all the images the AI picked before editing — now visible at a glance in one panel.

---

### 3b — Every canvas image feeds back into the library

Whenever an image enters the canvas — by any method — it is saved to disk and registered in the image library:

| Action | Where it's saved | Appears in library |
|---|---|---|
| Drag from Images panel → canvas | Already on disk | Already there |
| Search Pexels/DDG → apply | Downloaded to `runs/{id}/content/angle_n/images/` | Run Images section |
| Upload from filesystem | Saved to `assets/user_uploads/` | My Uploads section |
| Paste image URL → apply | Downloaded to `runs/{id}/content/angle_n/images/` | Run Images section |

This means the library is **append-only and cumulative** — images are never removed from the library even if removed from a slide. If you applied an image and changed your mind, it's still in the panel ready to use again.

---

### 3c — My Uploads (persistent, cross-run)

Images the user uploads from their filesystem are saved to `backend/assets/user_uploads/` — not tied to any run. They are available in every future session and every future run. This is the user's personal brand asset folder: logos, headshots, custom graphics, brand visuals.

```
My Uploads
├── logo_dark.png
├── founder_photo.jpg
└── brand_gradient.png
```

---

### 3d — Search (cached, persistent within session)

The last search query and results are cached in `localStorage`. Switching slides or even closing and reopening the Images panel shows the last search results instantly — no re-query needed.

Each cached result stores:
- Thumbnail URL (for the grid preview)
- Full-res URL (for download on apply)
- Source (Pexels / DDG)
- Query string

Cache is per-session (cleared on browser close). This is sufficient — images are cheap to re-search, but the cache prevents jarring blank-panel state when switching back to the panel mid-edit.

---

### 3e — Interaction model

The panel is **drag-and-drop first**:

1. Hover any image in the panel → shows a subtle drag handle
2. Drag it onto the canvas → drops as a `fabric.Image` object at cursor position with default 300×300px size and resize handles active
3. Drop it onto an existing image object on the canvas → **replaces** that image in-place (preserves position, size, filters)

Right-click any image in the panel:
- "Set as background on this slide" — fills canvas, behind all objects
- "Copy URL" — for external use
- "Delete from disk" — permanently removes the file (see §3f below)
- "Remove from uploads" (My Uploads only — also deletes from disk)

---

### 3f — Delete Image from Disk (bad AI picks)

The pipeline sometimes downloads unusable images: low resolution, CJK text overlaid (Chinese/Japanese/Korean characters from news sites), watermarked stock shots, irrelevant visuals, blurry thumbnails. These need to be permanently removed — not just swapped out on one slide, but gone from the folder so they don't accidentally get reused.

**Delete interaction:**

Right-click any image in the Run Images section → "Delete from disk"  
→ Confirmation chip appears inline (no full dialog): **"Delete permanently? [Yes] [No]"**  
→ On confirm: `DELETE /assets/image` call fires → file removed from disk → thumbnail removed from panel  
→ If that image was the active image on any currently-open slide: slide shows a "No image" placeholder state (same as slides that were generated without an image)

**What gets deleted:**

| Panel section | What "delete" removes |
|---|---|
| Run Images | The `.jpg`/`.png` file from `outputs/runs/{id}/content/angle_n/images/` |
| My Uploads | The file from `backend/assets/user_uploads/` |
| Search results | Nothing on disk (search results are remote URLs — no local file to delete; the option is not shown) |

**Why a confirmation chip, not a full modal:**

Deleting an image is a low-stakes but irreversible action. A full blocking modal for every bad image would slow down the workflow — the user might need to delete 3–4 bad AI picks in a row. An inline confirm chip (like GitHub's "Are you sure?" inline confirmation on destructive actions) is fast, clear, and recoverable by pressing No.

**Backend endpoint:**

`DELETE /assets/image`  
Body: `{ "path": "outputs/runs/{run_id}/content/angle_0/images/slide_03.jpg" }`  
- Path is validated to be within `outputs/runs/` or `assets/user_uploads/` (no path traversal)
- Returns `{ "deleted": true }` on success, 404 if file not found, 400 if path escapes allowed roots

**Visual indicator after deletion:**

The deleted image's slot in the panel shows a faint `✕ Deleted` ghost for ~1.5s then collapses out via animation — so the user has visual confirmation the action completed without a jarring jump in the grid layout.

---

**New endpoint: `GET /assets/library?run_id={id}`**

Returns a unified library object:
```json
{
  "run_images": {
    "angle_0": [
      { "filename": "slide_01.jpg", "url": "/outputs/runs/{id}/content/angle_0/images/slide_01.jpg", "slide_number": 1 },
      ...
    ],
    "angle_1": [...]
  },
  "user_uploads": [
    { "filename": "logo.png", "url": "/assets/user_uploads/logo.png" }
  ]
}
```

**New endpoint: `POST /assets/upload`**  
Saves to `backend/assets/user_uploads/`. Returns `{ filename, url }`.

**New endpoint: `DELETE /assets/image`**  
Accepts `{ path }`, validates path is within allowed roots, deletes file, returns `{ deleted: true }`. See §3f for full spec.

The search endpoint already exists (`/tools/images/search`). Search results are cached client-side only — no backend cache needed.

---

### Validation

This is the standard "asset panel" pattern used by:
- **Canva**: left sidebar has Photos, Elements, Text, Brand, Uploads tabs — each tab is persistent
- **Figma**: left panel has Layers, Assets, Plugins — Assets tab shows all design tokens and components ever used in the file
- **Adobe Express**: left panel has Photos, Icons, Backgrounds — all organised by source/type, not by page

The key insight is **separation of concerns**: images are assets that exist independently of which slide they are currently placed on. A slide uses an image; it does not own it. This makes reuse, reassignment, and browsing natural — exactly like Canva's asset panel.

---

## Requirement 4 — Full Image Editing on the Canvas

### What the user wants

> "Apply as background (with transparency editing, crop, adjust as background)"  
> "Drag and drop image inside our slide canvas — make it an 'image box' which I can make bigger/smaller and usual image editing"  
> "A clean canvas with fixed dimensions as well"

This breaks into four sub-features:

### 4a — Background Image Mode
- Right-click image → "Set as Background"
- Background images fill the canvas (1080×1080) with object-fit: cover
- Controls: transparency slider, brightness, contrast, blur
- Crop tool: drag handles to define visible region

### 4b — Freeform Image Box
- Drag image from Images panel → drops as a floating image object on canvas
- Has resize handles (corners + edges), rotation handle
- Double-click → enter crop mode (drag to reframe within box)
- Right-click → context menu: Send to back, Bring to front, Set as background, Delete

### 4c — Image Editing Controls
- When image is selected: floating toolbar appears with opacity slider, filters (grayscale, sepia, brightness, contrast)
- Fabric.js has built-in filter support (`fabric.Image.filters.*`) — no third-party needed

### 4d — Clean Canvas Mode
- Toggle between "Template" (current HTML-rendered slides) and "Canvas" (free Fabric.js canvas)
- Canvas mode: fixed 1080×1080, white/transparent background, user places any elements freely
- This is a "blank canvas" — no template constraints

### Validation

All of this is native to **Fabric.js**:
- `fabric.Image` with `clipPath` for cropping
- `canvas.setBackgroundImage()` for background mode
- `fabric.Image.filters.*` for brightness, contrast, opacity, blur, grayscale
- Built-in `fabric.Object` controls for resize/rotate handles
- `fabric.Canvas.toJSON()` for serialization

Fabritor (open source, MIT) is a working reference implementation of all of these features on top of Fabric.js.

---

## Requirement 5 — Every Element Editable In Its Own Right

### What the user wants

> "I want each component to be editable in its own sense — like a text-box, image-box etc."

### What this means

The canvas is a scene graph of **objects**:
```
Canvas
├── BackgroundImage  (locked, fills canvas, blends with bg color)
├── TextBox[title]   (x, y, w, h, fontFamily, fontSize, fill, fontWeight, ...)
├── TextBox[body]    (...)
├── ImageBox[hero]   (x, y, w, h, scaleX, scaleY, clipPath, filters, ...)
├── Shape[divider]   (...)
└── LogoImage        (locked position/size, always on top)
```

Each object has:
- Selection handles (Fabric's built-in Transformer)
- A context toolbar that changes based on object type (text → font controls; image → filter controls)
- Serializable state (`toJSON()` / `fromJSON()`)

This is the **scene graph pattern** used by every professional design tool.

### Current limitation

The current approach renders a Jinja2 HTML template into a PNG. The template has no object model — elements are just HTML divs positioned by CSS. To edit an element you have to know which field in the backend JSON it corresponds to.

With Fabric.js, each canvas object *is* the source of truth. No mapping from click position → backend field needed.

---

## Technology Decision

| Option | Fit | Stars | License | Verdict |
|---|---|---|---|---|
| **Fabric.js** | In-place text, image editing, background, filters, serialization | 31k | MIT | **Recommended** |
| react-konva | Fast 2D graphics, transformer for resize; text editing needs custom overlay | 14k | MIT | Strong alternative |
| tldraw | Infinite canvas, not fixed-size; licensing cost | — | Commercial | Skip |
| Polotno SDK | Full solution but vendor lock-in + cost | — | Commercial | Skip |

**Fabric.js wins** for this use case because:
1. `IText`/`Textbox` — native in-place text editing with cursor, selection, per-char styles
2. `fabric.Image.filters` — complete image filter pipeline without third-party deps  
3. `canvas.toJSON()` / `fabric.Canvas.loadFromJSON()` — exact serialization needed for save/load
4. MIT license, 31k stars, actively maintained (v7.4.0, May 2026)
5. Multiple production Canva clones built on it (Fabritor, react-design-editor)

**Reference implementations to study:**
- [Fabritor](https://github.com/sleepy-zone/fabritor-web) — 1.2k stars, MIT, Fabric.js + React, near-complete feature set
- [react-image-editor](https://github.com/swimmingkiim/react-image-editor) — 544 stars, MIT, Konva.js, excellent undo/redo reference

---

## Architecture Outline — Required Changes

### What stays the same
- FastAPI backend, LangGraph pipeline
- Slide data schema (JSON) — Fabric canvas JSON extends it, doesn't replace it
- Image assets storage (`outputs/runs/{id}/content/angle_{n}/images/`)
- Blog post generation
- Pipeline (research → angles → carousel generation)

### What changes fundamentally

#### Backend

1. **New endpoint: `GET /content/{run_id}/slides/{ai}/{sn}/canvas`**  
   Returns `fabric_json` field if it exists in slide data, else converts legacy slide data → initial Fabric canvas JSON.

2. **New endpoint: `PUT /content/{run_id}/slides/{ai}/{sn}/canvas`**  
   Accepts full Fabric canvas JSON, saves to `canvas.json` next to `slides.json`. Replaces the current `editSlide` + screenshot pipeline as the primary save path.

3. **Keep `editSlide` + Playwright screenshot** for export/generation (when you need a real PNG for the carousel download). The canvas JSON is the edit format; PNG is the export format.

4. **Image asset library endpoint: `GET /assets/library`**  
   Returns all images in `backend/assets/user_uploads/` + current run's images.

5. **Image upload endpoint: `POST /assets/upload`**  
   Saves to persistent `backend/assets/user_uploads/` (not tied to a run).

#### Frontend

The editor page (`/editor`) needs a **full component replacement**:

```
/editor
├── LeftPanel (resizable, collapsible)
│   ├── FilesTab       (current FileBrowser — unchanged)
│   └── ImagesTab      (new — asset library, search cache, drag-to-canvas)
├── CanvasArea
│   ├── Toolbar        (top — file actions, undo/redo, save, zoom, export)
│   ├── FabricCanvas   (main editing area — 1080×1080 with zoom/pan)
│   └── ContextToolbar (floating — appears above selected object, type-sensitive)
└── RightPanel (collapsible, type-sensitive)
    ├── (text selected)  → Font, Size, Color, Alignment
    ├── (image selected) → Filters, Opacity, Crop, Set as BG
    └── (nothing)        → Slide properties (theme, background color)
```

**New components:**
- `FabricCanvas.tsx` — mounts `fabric.Canvas`, handles load/save/undo/redo
- `ContextToolbar.tsx` — floating toolbar above selected object
- `ImagesPanel.tsx` — persistent left panel tab with asset library
- `RightPanel.tsx` — dynamic property panel
- `CanvasToolbar.tsx` — top bar with undo/redo, save, export buttons

**Removed/replaced:**
- `SlidePreviewFrame.tsx` — iframe approach replaced by Fabric canvas
- `SlideEditor.tsx` — replaced by `FabricCanvas.tsx` + `ContextToolbar.tsx` + `RightPanel.tsx`
- `ImageEditModal.tsx` — replaced by `ImagesPanel.tsx` in left sidebar

**State management:**
```typescript
// Local canvas state (not in Redux)
const commandStack: Command[] = [];
const redoStack: Command[] = [];

// Each user action:
interface Command {
  label: string;           // e.g., "Move image", "Edit text"
  snapshot: FabricJSON;    // full canvas state before this action
}

function execute(newState: FabricJSON, label: string) {
  commandStack.push({ label, snapshot: currentState });
  redoStack.length = 0; // clear redo
  applyToCanvas(newState);
}

function undo() {
  if (!commandStack.length) return;
  const { snapshot } = commandStack.pop()!;
  redoStack.push({ label: "redo", snapshot: currentState });
  applyToCanvas(snapshot);
}
```

---

## Migration Strategy

The pipeline still **generates** slides using the Jinja2 HTML → Playwright PNG approach. After generation:

1. User clicks "Open in Editor"
2. Backend converts the generated slide JSON → initial Fabric canvas JSON (one-time migration per slide)
3. User edits in the Fabric canvas
4. On Save → Fabric JSON stored; PNG re-exported via Playwright for download

This means the backend rendering pipeline stays untouched. The editor is a separate layer on top.

---

## Scope of Work (Major Refactor)

| Component | Change | Effort |
|---|---|---|
| `SlideEditor.tsx` | Full replacement with Fabric canvas | Large |
| `SlidePreviewFrame.tsx` | Deleted (iframe approach retired) | — |
| `ImageEditModal.tsx` | Deleted (replaced by Images panel) | — |
| `FileBrowser.tsx` | Wrap in tabbed left panel container | Small |
| New: `FabricCanvas.tsx` | Core canvas component | Large |
| New: `ImagesPanel.tsx` | Persistent image library panel | Medium |
| New: `ContextToolbar.tsx` | Floating per-object toolbar | Medium |
| New: `RightPanel.tsx` | Dynamic properties panel | Medium |
| New: `CanvasToolbar.tsx` | Top bar with undo/redo/save/export | Small |
| Backend: canvas save/load | New endpoints + JSON converter | Medium |
| Backend: image library | Upload to persistent storage | Small |
| Undo/redo | Replace `use-undoable` with Command pattern | Medium |

**New npm dependency: `fabric` (v7.x)**  
`pnpm add fabric`  
No other canvas library needed — Fabric ships with TypeScript types.

---

## What This Unlocks (Future)

Once the canvas-first architecture is in place:
- **Collaboration** — canvas JSON is CRDT-friendly (Yjs/Automerge integration)
- **Templates** — any canvas state can be saved as a template; templates are just Fabric JSONs
- **Animation** — Fabric supports `fabric.util.animate()` for simple slide transitions
- **Multi-page** — the carousel becomes an array of Fabric JSON documents, one per slide
- **Export formats** — Fabric → SVG, PNG, PDF (via jsPDF)
- **Brand kit** — pre-set colors/fonts stored as defaults in canvas JSON
