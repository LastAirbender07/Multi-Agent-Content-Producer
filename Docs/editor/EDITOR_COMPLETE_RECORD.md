# Canvas Editor — Full Historical Record

> **Scope:** Requirements → Architecture → Implementation Plan → Bug Fixes  
> **Maintained:** 2026-06-18 → 2026-06-19  
> **Status:** Living document — the single source of truth for the editor  
> **Method:** GAN-style adversarial iteration used for template validation (see §GAN Testing)

---

## Table of Contents

1. **[Part 1 — Requirements](#part-1--requirements)** — Why we built this, what the user needs
2. **[Part 2 — Master Implementation Plan](#part-2--master-implementation-plan)** — Full architecture, design tokens, template system, chart editor
3. **[Part 3 — Bug Fixes & Validation](#part-3--bug-fixes--validation)** — Sprint-by-sprint fixes, RCA, verification
4. **[Part 4 — GAN Template Testing](#part-4--gan-template-testing)** — Adversarial iteration methodology and results

---

---

# Part 1 — Requirements

> Originally: `EDITOR_REQUIREMENTS.md` — Written 2026-06-18


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

---

# Part 2 — Master Implementation Plan

> Originally: `EDITOR_MASTER_PLAN.md` — Written 2026-06-18, merged 2026-06-18


> Written: 2026-06-18 (merged from CANVAS_TEMPLATE_SYSTEM_PLAN.md + CHART_EDITOR_PLAN.md)  
> Status: Approved for implementation  
> Supersedes: Both previous documents

---

## 0. Problem Statement

```
Today:
  Pipeline  → slides.json → Jinja2 → Playwright PNG → read-only preview
  Editor    → slides.json → generic Fabric textboxes → looks nothing like the PNG

Target:
  Pipeline  → slides.json → Jinja2 → Playwright PNG  (unchanged, export only)
  Editor    → slides.json → Fabric canvas templates  (pixel-faithful + fully editable)
  User      → any slide   → insert/edit own charts   (full data editor, 13 chart types)
```

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CANVAS EDITOR                                    │
│                                                                       │
│  ┌──────────────┐  ┌──────────────────────────────┐  ┌───────────┐ │
│  │ Left Panel   │  │ FabricCanvas (1080×1080)      │  │ Right     │ │
│  │              │  │                               │  │ Panel     │ │
│  │ • Files      │  │  [bg_image]                   │  │           │ │
│  │ • Images     │  │  [bg_overlay]                 │  │ Text:     │ │
│  │ • Templates  │  │  [glass_card]                 │  │  font/sz  │ │
│  │   ├ Slides   │  │  [hook_headline]  ←selected   │  │  color    │ │
│  │   ├ Charts   │  │  [hook_sub]                   │  │           │ │
│  │   └ My saved │  │  [brand_bar]                  │  │ Image:    │ │
│  │              │  │                               │  │  opacity  │ │
│  │              │  │  ContextToolbar ↑ (floating)  │  │  filters  │ │
│  │              │  │                               │  │           │ │
│  └──────────────┘  └──────────────────────────────┘  │ Chart:    │ │
│                                                        │  type     │ │
│  CanvasToolbar: breadcrumb · undo · redo · Save ·     │  data tbl │ │
│                Export PNG · zoom                       │  preview  │ │
└─────────────────────────────────────────────────────────────────────┘
```

**Three concerns, cleanly separated:**

| Layer | What | Files |
|---|---|---|
| **Data** | Token system, chart types, slide schema | `canvasTokens.ts`, `types/chart.ts` |
| **Render** | Templates, charts, shared components | `canvasTemplates/*` |
| **UI** | Panels, toolbar, editor interactions | `components/editor/*` |

---

## 2. Shared Foundations (Build First)

### 2.1 Design Tokens — `frontend/utils/canvasTokens.ts`

```typescript
export interface CanvasTokens {
  bg: string;       surface: string;
  primary: string;  secondary: string;  accent: string;
  text: string;     muted: string;
  fontTitle: string; fontBody: string;
  brandBarH: number; progressH: number;
  canvasSize: number;
}

export const AURORA: CanvasTokens = {
  bg: "#090909",      surface: "#131313",
  primary: "#7C6EFA", secondary: "#2DD4BF", accent: "#F59E0B",
  text: "#FAFAFA",    muted: "#71717A",
  fontTitle: "Syne",  fontBody: "Plus Jakarta Sans",
  brandBarH: 72, progressH: 2, canvasSize: 1080,
};

export const LUMINA: CanvasTokens = {
  bg: "#F8F8F6",      surface: "#FFFFFF",
  primary: "#7C6EFA", secondary: "#2DD4BF", accent: "#F59E0B",
  text: "#0A0A0A",    muted: "#71717A",
  fontTitle: "Syne",  fontBody: "Plus Jakarta Sans",
  brandBarH: 72, progressH: 2, canvasSize: 1080,
};

export const CHART_COLORS = {
  aurora: ["#7C6EFA","#2DD4BF","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#10B981","#F97316"],
  lumina: ["#7C6EFA","#0D9488","#D97706","#DC2626","#7C3AED","#0284C7","#059669","#EA580C"],
};

export const CHART_PALETTE = {
  aurora: {
    COLORS: CHART_COLORS.aurora,
    TICK:   "rgba(250,250,250,0.65)",
    GRID:   "rgba(255,255,255,0.08)",
    LABEL:  "rgba(250,250,250,0.80)",
    BG:     "#131313",
  },
  lumina: {
    COLORS: CHART_COLORS.lumina,
    TICK:   "rgba(10,10,10,0.55)",
    GRID:   "rgba(0,0,0,0.08)",
    LABEL:  "rgba(10,10,10,0.70)",
    BG:     "#FFFFFF",
  },
};

export function getTokens(templateId: string): CanvasTokens {
  return templateId.startsWith("lumina") ? LUMINA : AURORA;
}

export function applyOverrides(t: CanvasTokens, o: Record<string, string> = {}): CanvasTokens {
  const r = { ...t };
  if (o.accent_color) r.primary   = o.accent_color;
  if (o.title_color)  r.text      = o.title_color;
  return r;
}
```

### 2.2 Chart Types — `frontend/types/chart.ts`

```typescript
// ALL chart types — used by AI pipeline AND user-created charts
export type ChartType =
  // Tier 1: AI-generated (already in Jinja2 templates)
  | "bar" | "column" | "line" | "donut" | "radar" | "funnel"
  // Tier 2: User-created (new — Chart.js)
  | "area" | "stacked-bar" | "stacked-column" | "comparison" | "scatter" | "bubble"
  // Tier 3: User-created (Fabric Group, no Chart.js)
  | "progress" | "number-stat";

export interface ChartSeries   { label: string; values: number[]; color?: string; }
export interface ScatterPoint  { x: number; y: number; label?: string; }
export interface BubblePoint   { x: number; y: number; r: number; label?: string; }

export interface ChartData {
  // Universal (single-series charts)
  labels:  string[];
  values:  number[];
  // Multi-series: stacked-bar, stacked-column, comparison, radar
  series?: ChartSeries[];
  // Scatter / Bubble
  points?: ScatterPoint[] | BubblePoint[];
  // number-stat
  statValue?:   string;   // e.g. "₹1.1 Lakh Cr"
  statLabel?:   string;   // e.g. "EdTech market size"
  statContext?: string;   // e.g. "Source: KPMG 2024"
  // progress
  progressItems?: Array<{ label: string; value: number; max?: number }>;
  // Styling overrides (optional)
  colors?:     string[];  // per-bar/series color overrides
  showLegend?: boolean;
  showGrid?:   boolean;
  unit?:       string;    // "%" | "$" | "K"
  title?:      string;    // chart title above the chart
}

// Stored on every Fabric chart object's .data property
export interface ChartObjectData {
  role:       "chart";
  chartType:  ChartType;
  chartData:  ChartData;
  theme:      "aurora" | "lumina";
  width:      number;
  height:     number;
}
```

### 2.3 Font Loader — `frontend/utils/canvasFonts.ts`

```typescript
const BASE  = "http://localhost:8000";
const FONTS = [
  { family: "Syne",              weight: "700", path: "/assets/fonts/Syne-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "700", path: "/assets/fonts/PlusJakartaSans-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "600", path: "/assets/fonts/PlusJakartaSans-SemiBold.woff2" },
  { family: "Plus Jakarta Sans", weight: "400", path: "/assets/fonts/PlusJakartaSans-Regular.woff2" },
];
let _loaded = false;

export async function loadCanvasFonts(): Promise<void> {
  if (_loaded) return;
  await Promise.all(FONTS.map(async ({ family, weight, path }) => {
    const face = new FontFace(family, `url(${BASE}${path})`, { weight });
    document.fonts.add(await face.load());
  }));
  _loaded = true;
}
```

### 2.4 CSV Parser — `frontend/utils/parseChartCsv.ts`

```typescript
import type { ChartData, ScatterPoint, BubblePoint } from "@/types/chart";

export function parseChartCsv(csv: string): Partial<ChartData> {
  const rows = csv.trim().split("\n").map(l => l.split(",").map(c => c.trim()));
  if (rows.length < 2) return {};
  const [header, ...data] = rows;

  // x,y or x,y,r → scatter/bubble
  if (header.length === 2 && !isNaN(Number(data[0]?.[0]))) {
    return { points: data.map(r => ({ x: Number(r[0]), y: Number(r[1]) } as ScatterPoint)) };
  }
  if (header.length === 3 && !isNaN(Number(data[0]?.[0]))) {
    return { points: data.map(r => ({ x: Number(r[0]), y: Number(r[1]), r: Number(r[2]) } as BubblePoint)) };
  }
  // Label,Value → single series
  if (header.length === 2) {
    return { labels: data.map(r => r[0]), values: data.map(r => Number(r[1])) };
  }
  // Label,S1,S2,... → multi-series
  return {
    labels: data.map(r => r[0]),
    values: data.map(r => Number(r[1])),
    series: header.slice(1).map((name, si) => ({
      label: name,
      values: data.map(r => Number(r[si + 1])),
    })),
  };
}
```

---

## 3. Chart Rendering — `frontend/utils/canvasTemplates/chartRenderer.ts`

**Single file. Used by both AI-generated templates AND user-created charts.**

```typescript
import { Chart, registerables } from "chart.js";
import * as fabric from "fabric";
import { CHART_PALETTE } from "@/utils/canvasTokens";
import type { ChartType, ChartData, ChartObjectData } from "@/types/chart";
import type { CanvasTokens } from "@/utils/canvasTokens";

Chart.register(...registerables);

// ── Chart.js types (Tier 1 + 2) ────────────────────────────────────────────

export async function renderChartToDataURL(
  chartType: ChartType,
  chartData: ChartData,
  theme: "aurora" | "lumina" = "aurora",
  width = 952,
  height = 440,
): Promise<string> {
  if (["funnel", "progress", "number-stat"].includes(chartType)) {
    throw new Error(`${chartType} is a Fabric Group, not a Chart.js chart. Use createChartGroup() instead.`);
  }

  const palette = CHART_PALETTE[theme];
  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  canvas.style.cssText = `position:fixed;left:-9999px;top:-9999px;background:${palette.BG}`;
  document.body.appendChild(canvas);

  const instance = new Chart(canvas, buildConfig(chartType, chartData, palette));
  await new Promise<void>(r => requestAnimationFrame(() => r()));

  const dataUrl = canvas.toDataURL("image/png");
  instance.destroy();
  document.body.removeChild(canvas);
  return dataUrl;
}

export async function createChartFabricImage(
  chartType: ChartType,
  chartData: ChartData,
  theme: "aurora" | "lumina",
  opts: { left: number; top: number; width?: number; height?: number },
): Promise<fabric.FabricImage> {
  const w = opts.width  ?? defaultSize(chartType).w;
  const h = opts.height ?? defaultSize(chartType).h;
  const dataUrl = await renderChartToDataURL(chartType, chartData, theme, w, h);
  const img = await fabric.FabricImage.fromURL(dataUrl);
  img.set({
    left: opts.left, top: opts.top, width: w, height: h,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType, chartData, theme, width: w, height: h } satisfies ChartObjectData,
  });
  return img;
}

// ── Fabric Groups (Tier 3) ──────────────────────────────────────────────────

export function createFunnelGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const { labels, values } = chartData;
  const W      = opts.width ?? 860;
  const maxVal = Math.max(...values);
  const ROW_H  = 44;
  const GAP    = 18;
  const LABEL_W = 190;
  const BAR_AREA = W - LABEL_W - 14;
  const items: fabric.FabricObject[] = [];

  labels.forEach((label, i) => {
    const y      = i * (ROW_H + GAP);
    const barW   = Math.max(60, BAR_AREA * (values[i] / maxVal));
    const barX   = LABEL_W + 14;

    // Label (right-aligned text)
    items.push(new fabric.Textbox(label, {
      left: 0, top: y + 12, width: LABEL_W, textAlign: "right",
      fontSize: 16, fontWeight: "600", fill: tokens.muted,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
    // Gradient bar
    const bar = new fabric.Rect({
      left: barX, top: y, width: barW, height: ROW_H, rx: 5,
      fill: new fabric.Gradient({ type: "linear",
        coords: { x1: 0, y1: 0, x2: barW, y2: 0 },
        colorStops: [{ offset: 0, color: tokens.primary }, { offset: 1, color: tokens.secondary }],
      }),
      originX: "left" as const, originY: "top" as const,
    });
    items.push(bar);
    // Value text inside bar
    items.push(new fabric.Text(String(values[i]), {
      left: barX + barW - 8, top: y + 14, fontSize: 15, fontWeight: "700",
      fill: "#fff", originX: "right" as const, originY: "top" as const,
    }));
  });

  return new fabric.Group(items, {
    left: opts.left, top: opts.top,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType: "funnel", chartData, theme: "aurora",
            width: W, height: labels.length * (ROW_H + GAP) } satisfies ChartObjectData,
  });
}

export function createProgressGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const items = (chartData.progressItems ?? []).map(({ label, value, max = 100 }, i) => {
    const W     = opts.width ?? 780;
    const y     = i * 60;
    const pct   = Math.min(1, value / max);
    const fillW = Math.max(8, (W - 120) * pct);

    return [
      new fabric.Textbox(label, {
        left: 0, top: y + 2, width: 200, fontSize: 16, fill: tokens.text,
        fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
      }),
      // Track
      new fabric.Rect({
        left: 210, top: y + 10, width: W - 280, height: 12, rx: 6,
        fill: tokens.muted + "40", originX: "left" as const, originY: "top" as const,
      }),
      // Fill
      new fabric.Rect({
        left: 210, top: y + 10, width: fillW, height: 12, rx: 6,
        fill: new fabric.Gradient({ type: "linear",
          coords: { x1: 0, y1: 0, x2: fillW, y2: 0 },
          colorStops: [{ offset: 0, color: tokens.primary }, { offset: 1, color: tokens.secondary }],
        }),
        originX: "left" as const, originY: "top" as const,
      }),
      // Value
      new fabric.Text(`${Math.round(pct * 100)}%`, {
        left: W - 60, top: y + 4, fontSize: 15, fontWeight: "700",
        fill: tokens.text, originX: "left" as const, originY: "top" as const,
      }),
    ];
  }).flat();

  const height = (chartData.progressItems?.length ?? 0) * 60;
  return new fabric.Group(items, {
    left: opts.left, top: opts.top,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType: "progress", chartData, theme: "aurora",
            width: opts.width ?? 780, height } satisfies ChartObjectData,
  });
}

export function createBigNumberGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const W = opts.width ?? 952;
  const items: fabric.FabricObject[] = [
    new fabric.Textbox(chartData.statValue ?? "—", {
      left: 0, top: 0, width: W, textAlign: "center",
      fontSize: 120, fontWeight: "700", fontFamily: tokens.fontTitle,
      fill: tokens.primary, lineHeight: 1,
      originX: "left" as const, originY: "top" as const,
    }),
  ];
  if (chartData.statLabel) {
    items.push(new fabric.Textbox(chartData.statLabel, {
      left: 0, top: 132, width: W, textAlign: "center",
      fontSize: 28, fontWeight: "700", fill: tokens.text,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
  }
  if (chartData.statContext) {
    items.push(new fabric.Textbox(chartData.statContext, {
      left: 0, top: 174, width: W, textAlign: "center",
      fontSize: 16, fill: tokens.muted,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
  }
  return new fabric.Group(items, {
    left: opts.left, top: opts.top,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType: "number-stat", chartData, theme: "aurora",
            width: W, height: 220 } satisfies ChartObjectData,
  });
}

// ── Dispatcher (used by templates + user insert) ────────────────────────────

export async function createChartObject(
  chartType: ChartType,
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number; height?: number },
  theme: "aurora" | "lumina" = "aurora",
): Promise<fabric.FabricObject> {
  switch (chartType) {
    case "funnel":      return createFunnelGroup(chartData, tokens, opts);
    case "progress":    return createProgressGroup(chartData, tokens, opts);
    case "number-stat": return createBigNumberGroup(chartData, tokens, opts);
    default:            return createChartFabricImage(chartType, chartData, theme, opts);
  }
}

// ── Default sizes ───────────────────────────────────────────────────────────

export function defaultSize(type: ChartType): { w: number; h: number } {
  const MAP: Partial<Record<ChartType, { w: number; h: number }>> = {
    "donut":          { w: 480, h: 420 },
    "radar":          { w: 480, h: 480 },
    "funnel":         { w: 860, h: 320 },
    "number-stat":    { w: 952, h: 280 },
    "progress":       { w: 780, h: 0 },  // height computed dynamically
  };
  return MAP[type] ?? { w: 952, h: 420 };
}

// ── Internal Chart.js config builder ───────────────────────────────────────

function buildConfig(type: ChartType, data: ChartData, palette: typeof CHART_PALETTE.aurora) {
  const { labels, values, series, points, colors, showLegend, showGrid, unit } = data;
  const base = { animation: false as const, responsive: false };
  const bg   = (colors ?? palette.COLORS).slice(0, Math.max(labels?.length ?? 1, values?.length ?? 1));

  const xScale = { grid: { display: showGrid ?? false, color: palette.GRID }, ticks: { color: palette.TICK } };
  const yScale = { grid: { display: showGrid ?? true,  color: palette.GRID }, ticks: { color: palette.TICK } };

  switch (type) {
    case "bar":
      return { type: "bar" as const, data: { labels, datasets: [{ data: values, backgroundColor: bg, borderRadius: 6 }] },
        options: { ...base, indexAxis: "y" as const, plugins: { legend: { display: false } }, scales: { y: { ...xScale, grid: { display: false } }, x: yScale } } };

    case "column":
      return { type: "bar" as const, data: { labels, datasets: [{ data: values, backgroundColor: bg, borderRadius: 7, borderSkipped: false }] },
        options: { ...base, indexAxis: "x" as const, plugins: { legend: { display: false } }, scales: { x: { ...xScale, grid: { display: false } }, y: yScale } } };

    case "line":
      return { type: "line" as const, data: { labels, datasets: [{ data: values, borderColor: palette.COLORS[0], backgroundColor: "transparent",
          pointBackgroundColor: palette.COLORS[0], pointRadius: 7, tension: 0.35, borderWidth: 3, fill: false }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "area":
      return { type: "line" as const, data: { labels, datasets: [{ data: values, borderColor: palette.COLORS[0],
          backgroundColor: `${palette.COLORS[0]}33`, pointRadius: 5, tension: 0.35, borderWidth: 3, fill: true }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "donut":
      return { type: "doughnut" as const, data: { labels, datasets: [{ data: values, backgroundColor: palette.COLORS.slice(0, values.length), borderWidth: 0 }] },
        options: { ...base, cutout: "58%",
          plugins: { legend: { display: showLegend ?? true, position: "right" as const,
            labels: { color: palette.LABEL, font: { size: 17 }, padding: 20, boxWidth: 18 } } } } };

    case "radar": {
      const rds = series?.length
        ? series.map((s, i) => ({ label: s.label, data: s.values, backgroundColor: `${palette.COLORS[i]}30`, borderColor: palette.COLORS[i], borderWidth: 2.5 }))
        : [{ data: values, backgroundColor: `${palette.COLORS[0]}30`, borderColor: palette.COLORS[0], borderWidth: 2.5 }];
      return { type: "radar" as const, data: { labels, datasets: rds },
        options: { ...base, plugins: { legend: { display: showLegend ?? (series?.length ?? 0) > 1, labels: { color: palette.LABEL } } },
          scales: { r: { grid: { color: palette.GRID }, angleLines: { color: palette.GRID }, pointLabels: { color: palette.LABEL, font: { size: 15 } }, ticks: { display: false } } } } };
    }

    case "stacked-bar": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s" }));
      return { type: "bar" as const, data: { labels, datasets: ds },
        options: { ...base, indexAxis: "y" as const, plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
          scales: { y: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } }, x: { stacked: true, ...yScale } } } };
    }

    case "stacked-column": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s" }));
      return { type: "bar" as const, data: { labels, datasets: ds },
        options: { ...base, indexAxis: "x" as const, plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
          scales: { x: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } }, y: { stacked: true, ...yScale } } } };
    }

    case "comparison": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 6, borderSkipped: false }));
      return { type: "bar" as const, data: { labels, datasets: ds },
        options: { ...base, plugins: { legend: { display: true, labels: { color: palette.LABEL } } }, scales: { x: { ...xScale, grid: { display: false } }, y: yScale } } };
    }

    case "scatter":
      return { type: "scatter" as const, data: { datasets: [{ data: (points ?? []) as { x: number; y: number }[], backgroundColor: palette.COLORS[0], pointRadius: 8 }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "bubble":
      return { type: "bubble" as const, data: { datasets: [{ data: (points ?? []) as { x: number; y: number; r: number }[], backgroundColor: palette.COLORS.map(c => `${c}99`) }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    default:
      throw new Error(`Unhandled Chart.js type: ${type}`);
  }
}
```

---

## 4. Backdrop Filter Solution — `frontend/utils/canvasTemplates/shared.ts` (excerpt)

```typescript
let _ctxFilter: boolean | null = null;

export function supportsCtxFilter(): boolean {
  if (_ctxFilter !== null) return _ctxFilter;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.filter = "blur(1px)";
  _ctxFilter = ctx.filter !== "none" && ctx.filter !== "";
  return _ctxFilter;
}

/**
 * Returns a FabricImage of the background image blurred to the card region.
 * Used for the glassmorphism card effect on hook/quote slides.
 * Falls back to a high-opacity dark rect on Safari (where ctx.filter is unsupported).
 */
export async function createBlurredRegion(
  imageUrl: string,
  region:   { left: number; top: number; width: number; height: number },
  blur = 16,
): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = 1080; off.height = 1080;
      const ctx = off.getContext("2d")!;
      if (supportsCtxFilter()) {
        ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(img, 0, 0, 1080, 1080);
        ctx.filter = "none";
      } else {
        ctx.drawImage(img, 0, 0, 1080, 1080); // no blur (Safari)
      }
      const crop = document.createElement("canvas");
      crop.width = region.width; crop.height = region.height;
      crop.getContext("2d")!.drawImage(off, region.left, region.top, region.width, region.height, 0, 0, region.width, region.height);
      fabric.FabricImage.fromURL(crop.toDataURL())
        .then(fi => { fi.set({ left: region.left, top: region.top, originX: "left" as const, originY: "top" as const, selectable: false, evented: false }); resolve(fi); })
        .catch(reject);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}
```

**Why not stackblur-canvas:** Extra dependency, slower CPU-bound blur vs GPU-accelerated `ctx.filter`, Safari fallback (solid rect) is visually identical at Instagram display sizes. Discarded.

---

## 5. Slide Schema Addition

### `backend/core/orchestration/contracts.py`

```python
class Slide(BaseModel):
    # ... all existing fields unchanged ...
    # NEW — optional, backward-compatible
    canvas_template: Optional[str] = Field(
        default=None,
        description="Fabric template ID e.g. 'aurora-hook', 'aurora-content-0'"
    )
    model_config = ConfigDict(populate_by_name=True)
```

### `backend/core/orchestrators/content/carousel_generator.py`

```python
def _canvas_template_id(slide_type: str, theme: str, layout_variant: int, has_image: bool) -> str:
    if slide_type == "content":
        return f"{theme}-content-text" if not has_image else f"{theme}-content-{layout_variant}"
    return f"{theme}-{slide_type}"

# In render_slides_node, after computing layout_variant + has_image:
slide_dict["canvas_template"] = _canvas_template_id(
    slide.type.value, template_name, layout_variant, has_image
)
```

**That's the only backend change.** 5 lines total.

---

## 6. Slide Template System — `frontend/utils/canvasTemplates/`

### 6.1 Shared component factories — `shared.ts`

Every factory uses `originX: "left", originY: "top"` — **this is non-negotiable.** Fabric v7 defaults to center origin; every object must override this explicitly.

| Function | Returns | Used by |
|---|---|---|
| `createBrandBar(t, logo, name, num, total)` | `fabric.FabricObject[]` | All 9 templates |
| `createBgImage(url, fit, t)` | `fabric.FabricImage` | hook, content, quote |
| `createOverlay(variant, t)` | `fabric.Rect` (gradient) | hook, content, quote |
| `createAccentLine(t, w?)` | `fabric.Rect` | content, stat, quote |
| `createBulletItem(text, idx, t, sz)` | `fabric.Group` | content |
| `createInsightItem(text, t)` | `fabric.Group` | quote |
| `createGlassCard(region, url, blur, t)` | `fabric.FabricObject[]` | hook, quote |
| `createGradientBg(t, angle?)` | `fabric.Rect` | cta, engage |
| `createBlurredRegion(url, region, blur)` | `fabric.FabricImage` | (internal, via createGlassCard) |
| `supportsCtxFilter()` | `boolean` | (internal) |

### 6.2 Template registry — `index.ts`

```typescript
export interface SlideMeta {
  slideNum: number; totalSlides: number;
  logoUrl: string;  brandName: string;
}

// Lumina = Aurora with LUMINA tokens — zero code duplication
const lw = (fn: TemplateBuilder): TemplateBuilder =>
  (s, i, _t, m) => fn(s, i, LUMINA, m);

export const REGISTRY: Record<string, TemplateBuilder> = {
  "aurora-hook":          buildAuroraHook,
  "aurora-content-0":     (s,i,t,m) => buildAuroraContent(s,i,t,m,0),
  "aurora-content-1":     (s,i,t,m) => buildAuroraContent(s,i,t,m,1),
  "aurora-content-2":     (s,i,t,m) => buildAuroraContent(s,i,t,m,2),
  "aurora-content-text":  (s,i,t,m) => buildAuroraContent(s,i,t,m,-1),
  "aurora-stat":          buildAuroraStat,
  "aurora-quote":         buildAuroraQuote,
  "aurora-cta":           buildAuroraCta,
  "aurora-engage":        buildAuroraEngage,
  "lumina-hook":          lw(buildAuroraHook),
  "lumina-content-0":     (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,0),
  "lumina-content-1":     (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,1),
  "lumina-content-2":     (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,2),
  "lumina-content-text":  (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,-1),
  "lumina-stat":          lw(buildAuroraStat),
  "lumina-quote":         lw(buildAuroraQuote),
  "lumina-cta":           lw(buildAuroraCta),
  "lumina-engage":        lw(buildAuroraEngage),
};

function inferTemplate(slide: SlideData & { canvas_template?: string }): string {
  const theme = (slide._theme ?? "aurora").toLowerCase();
  if (slide.type === "content") return `${theme}-content-0`;
  return `${theme}-${slide.type}`;
}

export async function buildSlideCanvas(
  slide: SlideData & { canvas_template?: string },
  imageUrl: string | null,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  await loadCanvasFonts();
  const id      = slide.canvas_template ?? inferTemplate(slide);
  const builder = REGISTRY[id] ?? REGISTRY["aurora-hook"];
  const tokens  = applyOverrides(getTokens(id), slide.slide_overrides ?? {});
  return builder(slide, imageUrl, tokens, meta);
}
```

### 6.3 Template specifications (all 9 Aurora types)

**Key principle for every template:** All objects use `originX: "left", originY: "top"`.

---

**`aurora-hook`** — Full-bleed image + glassmorphism card
```
1. bg_image       FabricImage, 1080×1080, cover-fit
2. bg_overlay     Rect gradient: #090909/88% → #090909/65% → primary/25%, 135deg
3. glass_blur     createBlurredRegion(card_region, 16) [or fallback rect if !ctx.filter]
4. glass_overlay  Rect 880×h, rgba(19,19,19,0.65), rx:24
5. card_border    Rect 880×h, stroke rgba(255,255,255,0.08), fill:none, rx:24
6. hook_label     Text "THREAD", 14px primary, charSpacing 200, uppercase
7. hook_headline  Textbox, Syne 72px Bold, white, lineHeight 1.05
8. hook_sub       Textbox (if body), 24px, muted, lineHeight 1.5
9. swipe_hint     Text "Swipe →", 14px muted, x=920, y=930
10. brand_bar[]   createBrandBar()

Card: left=100, w=880, top = 540 - cardHeight×0.55
Padding inside card: 56px top/bottom, 64px left/right
```

---

**`aurora-content-{0/1/2/text}`** — Text + image, 4 layout variants
```
All variants share:
  bg_texture   createBgImage(url, "blur-darken") [blur+brightness(0.15), scale 1.15×]
  bg_dim       Rect, gradient #090909/93% → #090909/78%
  accent_line  createAccentLine()
  slide_title  Textbox, 44px Bold white
  slide_body   Textbox, 22px muted, lineHeight 1.6
  bullet_N     createBulletItem() × n
  brand_bar[]

Layout 0 (left text / right image):  text x=40 w=576 | image x=664 w=368
Layout 1 (top text / bottom image):  text x=56 y=36 w=968 | image below text
Layout 2 (top image / bottom text):  image x=36 y=28 | text below image
Text-only:                            text x=60 w=960, title 48px, body 23px
```

---

**`aurora-stat`** — Corrected hierarchy
```
stat.html.j2 field mapping:
  stat_value → 116px Syne gradient (primary→secondary)
  stat_label → 24px Bold white [BESIDE stat_value]
  slide.title → 16px muted [BELOW stat_label]
  slide.body  → 20px, left-border accent
  chart_data  → createChartObject() [below divider]

Objects:
  bg_rect    Rect 1080×1080, surface #131313
  accent_line 60×3, x=64 y=52
  stat_value  Textbox Syne 116px, gradient fill, left=64 top=68
  stat_label  Textbox 24px Bold white, left=stat_value_right+28 top=78
  stat_title  Textbox 16px muted, same x as stat_label, below
  stat_divider Rect 60×3 gradient, below stat block
  stat_body   Textbox 20px, left-border accent bar
  chart_obj   createChartObject(chart_type, chart_data, ...) [funnel|image]
  brand_bar[]
```

---

**`aurora-quote`** — Corrected: slide.title = quote, slide.body = attribution
```
bg_texture   createBgImage(url, "blur-darken")
bg_dim       Rect gradient #090909/78% → #090909/62%, 160deg
quote_mark   Text '"', Syne 100px, primary opacity 0.55, lineHeight 0.65
quote_text   Textbox (slide.title), 40px SemiBold Italic white, lineHeight 1.42
quote_attr   Text "— " + body (strip leading dash), 20px muted
[if bullets:]
  divider      Rect 100%×1, rgba(255,255,255,0.10)
  insights_lbl Text "KEY INSIGHTS", 13px secondary uppercase
  insight_N    createInsightItem() × n
brand_bar[]

Inner block: left=72, w=936, centered vertically
```

---

**`aurora-cta`** — Dark bg + radial glows
```
glow_1        Ellipse 540×430, primary/0.35, left=-220 top=540
glow_2        Ellipse 430×430, secondary/0.25, left=760 top=-130
bg_rect       Rect 1080×1080, #090909
cta_headline  Textbox (slide.title), Syne 64px Bold white, centered
cta_sub       Textbox (slide.body), 26px muted, centered, lineHeight 1.5
cta_button    Group [Rect gradient rx:100 + Text "Follow for more →" 22px white]
brand_bar[]
Inner: left=80, right=80, centered vertically, gap=40px
```

---

**`aurora-engage`** — Gradient bg + rings + eyebrow (NOT the same as CTA)
```
engage_bg     Rect 1080×1008, gradient primary→secondary 135deg
ring_1        Circle 560, stroke rgba(255,255,255,0.14), left=-180 top=-200
ring_2        Circle 360, stroke rgba(255,255,255,0.14), left=-100 bottom
ring_3        Circle 200, stroke rgba(255,255,255,0.14) opacity:0.6
eyebrow_pill  Group [Rect rgba(255,255,255,0.12) rx:999 + Text "Follow for more insights"]
engage_title  Textbox (slide.title), Syne 46px Bold white, centered
engage_body   Textbox (slide.body), 22px rgba(255,255,255,0.82), centered
engage_pill   Group [Rect rgba(255,255,255,0.20) border rx:999 + Text "Hit Follow — it's worth it"]
brand_bar[]
Inner: left=80, right=80, centered, gap=28px
```

**Lumina variants** = Same builders, LUMINA token set. Zero duplicated code. Single `lw()` wrapper.

---

## 7. UI Components

### 7.1 `ChartEditorPanel.tsx`

Used in TWO contexts:
- **Slide-over** (full height, right side) — when inserting new chart from Templates panel
- **Compact** (inside RightPanel) — when selecting existing chart on canvas

```typescript
interface ChartEditorPanelProps {
  initialType?: ChartType;
  initialData?: ChartData;
  theme:        "aurora" | "lumina";
  onApply:      (type: ChartType, data: ChartData) => Promise<void>;
  onCancel?:    () => void;
  compact?:     boolean;   // hides live preview when compact=true (canvas IS the preview)
}
```

**Layout (full mode):**
```
ChartTypePicker           — visual grid of 13 chart types
ChartDataTable            — editable grid (label + N series columns)
  [+ Add row]  [Paste CSV]  [+ Add series]
Options row               — Unit | Legend toggle | Grid toggle | Title input
Live Preview              — <ChartPreview> debounced 200ms (hidden in compact mode)
[Apply to Slide]  [Cancel]
```

**Live preview uses the existing `ChartPreview.tsx` (react-chartjs-2)** — not the offscreen renderer. Only `onApply` triggers the full offscreen render.

### 7.2 `ChartTypePicker.tsx`

Grid of tiles, each with inline SVG icon + label:

```typescript
// Each tile has a 48×32px SVG representing the chart shape
// Active: violet border + bg-violet-600/10
// Categories: "basic" (bar/column/line/area/donut), "comparative" (stacked/comparison/radar),
//             "special" (scatter/bubble/funnel), "data" (progress/number-stat)
```

### 7.3 `ChartDataTable.tsx`

Spreadsheet-like component:
- Column 0: Label (text input)
- Columns 1..N: Series values (number input)
- Row controls: Enter = new row, Tab = next cell, Delete on empty = remove row
- Header: editable series names + color picker per series
- Footer: `[+ Add row]` `[Paste CSV]` `[+ Add series]` (for multi-series types)

### 7.4 `RightPanel.tsx` — Updated routing

```typescript
if (selectedObject?.data?.role === "chart") {
  return <ChartEditorPanel compact initialType={...} initialData={...} onApply={handleChartApply} />;
}
if (selectedObject?.type === "textbox") { return <TextPanel ... />; }
if (selectedObject?.type === "image")   { return <ImagePanel ... />; }
return <CanvasPanel canvas={canvas} />;
```

`handleChartApply` in the editor page:
```typescript
async function handleChartApply(type: ChartType, data: ChartData) {
  const obj = canvasApiRef.current?.getCanvas()?.getActiveObject();
  if (!obj || !canvasInstance) return;
  commit("edit chart");
  const tokens = getTokens(selectedTemplate ?? "aurora-hook");
  const newObj = await createChartObject(type, data, tokens, {
    left: obj.left ?? 64, top: obj.top ?? 300,
    width: (obj as fabric.FabricObject & { width?: number }).width,
    height: (obj as fabric.FabricObject & { height?: number }).height,
  });
  canvasInstance.remove(obj);
  canvasInstance.add(newObj);
  canvasInstance.setActiveObject(newObj);
  canvasInstance.renderAll();
  handleCanvasChanged();
}
```

### 7.5 `TemplatesPanel.tsx` — 3rd left panel tab

Three sections:

**Slide Templates** — 9 tiles (one per slide type), click to create new slide with that template
**Charts** — 13 chart tiles, click opens `ChartEditorPanel` slide-over
**Components** — draggable Fabric Groups:
  Brand Bar · Thread Label · Dark Card · Stat Block · Quote Block · Bullet List · Insight List · Accent Line · CTA Button · Eyebrow Pill · Radial Glow · Deco Rings

**My Templates** — user-saved full-slide templates
  `POST/GET/DELETE /api/v1/content/assets/templates`

---

## 8. Complete File Structure

```
frontend/
├── types/
│   └── chart.ts                     ← ChartType, ChartData, ChartObjectData
│
├── utils/
│   ├── canvasTokens.ts              ← AURORA, LUMINA, CHART_PALETTE, getTokens, applyOverrides
│   ├── canvasFonts.ts               ← loadCanvasFonts() singleton
│   ├── parseChartCsv.ts             ← CSV → ChartData
│   └── canvasTemplates/
│       ├── index.ts                 ← REGISTRY, buildSlideCanvas, inferTemplate, SlideMeta
│       ├── shared.ts                ← createBrandBar, createBgImage, createOverlay,
│       │                                createAccentLine, createBulletItem, createInsightItem,
│       │                                createGlassCard, createBlurredRegion, supportsCtxFilter,
│       │                                createGradientBg
│       ├── chartRenderer.ts         ← renderChartToDataURL, createChartFabricImage,
│       │                                createFunnelGroup, createProgressGroup,
│       │                                createBigNumberGroup, createChartObject, defaultSize
│       ├── aurora_hook.ts
│       ├── aurora_content.ts        ← variants 0/1/2/-1 (layout param)
│       ├── aurora_stat.ts           ← imports createChartObject
│       ├── aurora_quote.ts
│       ├── aurora_cta.ts
│       └── aurora_engage.ts
│
└── components/editor/
    ├── FabricCanvas.tsx             ← loadInitial() calls buildSlideCanvas()
    ├── CanvasToolbar.tsx
    ├── ContextToolbar.tsx
    ├── RightPanel.tsx               ← routes to TextPanel / ImagePanel / ChartEditorPanel / CanvasPanel
    ├── TextPanel.tsx                ← text property controls (split from RightPanel)
    ├── ImagePanel.tsx               ← image property controls (split from RightPanel)
    ├── CanvasPanel.tsx              ← canvas bg color (split from RightPanel)
    ├── ChartEditorPanel.tsx         ← full + compact mode
    ├── ChartTypePicker.tsx          ← visual grid of 13 types
    ├── ChartDataTable.tsx           ← editable data grid
    ├── TemplatesPanel.tsx           ← slides / charts / components / my-saved
    ├── ImagesPanel.tsx              ← asset library (already built)
    ├── EditorLeftPanel.tsx          ← Files | Images | Templates tabs
    └── SlidePngPreview.tsx          ← PNG preview mode (already built)
```

**No `lumina_*.ts` files.** Lumina uses Aurora builders with LUMINA tokens. One line each in the registry.

---

## 9. Build Order (Strict Dependency Sequence)

Dependencies flow downward. **Never build a phase before its dependencies are done.**

```
Phase 0 — Foundation (no deps, pure TypeScript)
  ├── types/chart.ts
  ├── utils/canvasTokens.ts
  ├── utils/canvasFonts.ts
  └── utils/parseChartCsv.ts

Phase 1 — Chart rendering engine (deps: Phase 0)
  └── utils/canvasTemplates/chartRenderer.ts
      Verify: all 13 chart types render to correct PNGs
      Test:   renderChartToDataURL("bar", {...}) → non-empty dataUrl
              createFunnelGroup / createProgressGroup / createBigNumberGroup → Fabric Groups

Phase 2 — Shared Fabric components (deps: Phase 0)
  └── utils/canvasTemplates/shared.ts
      Verify: createBrandBar renders brand bar correctly
              createBgImage("blur-darken") produces blurred FabricImage
              createGlassCard produces blur layer + overlay + border

Phase 3 — Aurora slide templates (deps: Phase 1 + 2)
  ├── aurora_hook.ts       → screenshot vs slide_01.png ≥90% match
  ├── aurora_content.ts    → 4 variants, each screenshot vs reference PNG
  ├── aurora_stat.ts       → stat hierarchy + chart image
  ├── aurora_quote.ts      → quote + attribution + insights
  ├── aurora_cta.ts        → dark bg + radial glows + pill button
  └── aurora_engage.ts     → gradient bg + rings + eyebrow pill

Phase 4 — Template registry (deps: Phase 3)
  └── utils/canvasTemplates/index.ts
      Verify: buildSlideCanvas() works for all 18 template IDs

Phase 5 — Backend schema (1-day, independent)
  ├── contracts.py: +canvas_template field
  └── carousel_generator.py: +_canvas_template_id() + 5-line addition

Phase 6 — FabricCanvas.loadInitial() wiring (deps: Phase 4 + 5)
  └── components/editor/FabricCanvas.tsx — replace loadInitial() body
      Verify: open any generated slide → matches reference PNG

Phase 7 — Chart UI components (deps: Phase 1)
  ├── components/editor/ChartTypePicker.tsx
  ├── components/editor/ChartDataTable.tsx
  └── components/editor/ChartEditorPanel.tsx
      Verify: all 13 types selectable, data table Tab/Enter/Delete navigation
              CSV paste: single-series, multi-series, scatter all parse correctly
              Live preview updates within 200ms of data change

Phase 8 — RightPanel split + chart wiring (deps: Phase 7)
  ├── components/editor/TextPanel.tsx    (extracted from RightPanel)
  ├── components/editor/ImagePanel.tsx   (extracted from RightPanel)
  ├── components/editor/CanvasPanel.tsx  (extracted from RightPanel)
  └── components/editor/RightPanel.tsx   (now a router only)
      Verify: select text → TextPanel; select image → ImagePanel;
              select chart → ChartEditorPanel compact;
              deselect → CanvasPanel

Phase 9 — Templates panel (deps: Phase 6 + 7)
  └── components/editor/TemplatesPanel.tsx
      Verify: slide tiles create slides; chart tiles open editor;
              components drag onto canvas; user-saved templates save/load

Phase 10 — EditorLeftPanel 3rd tab (deps: Phase 9)
  └── components/editor/EditorLeftPanel.tsx — add Templates tab
      Verify: 3 tabs; Files/Images/Templates all work

Phase 11 — Backend user templates endpoints
  ├── POST /api/v1/content/assets/templates
  ├── GET  /api/v1/content/assets/templates
  └── DELETE /api/v1/content/assets/templates/:id
```

---

## 10. Quality Bar

| Element | Requirement | Fallback |
|---|---|---|
| Fonts | Syne Bold + Plus Jakarta Sans exact weights | None — fonts must load |
| `originX/Y` | Always `"left"/"top"` on every Fabric object | None — WILL break layout |
| Colors | Exact hex from token system | None — must match |
| Backdrop blur | Offscreen canvas `ctx.filter` | Higher-opacity rect (Safari) |
| Brand bar | Always present, always correct | None |
| Progress bar | Proportional width, gradient fill | None |
| Charts (AI) | Chart.js colors matching Jinja2 template | Chart types must match |
| Charts (user) | All 13 types render, correct palette | None |
| Funnel | Fabric Group matching CSS funnel layout | None |
| Template match | ≥90% visual fidelity vs reference PNG | Minor position offsets OK |
| Gradient text | White text (CSS gradient-clip not in Fabric) | Acceptable |

---

## 11. What Does NOT Change

- `slides.json` format (except +`canvas_template`)
- Jinja2 HTML templates
- Playwright PNG generation
- All 61 E2E tests
- Blog post generation
- Research / angle / content orchestration pipeline
- `image_assets.json` format
- All existing backend endpoints

---

# Part 3 — Bug Fixes & Validation

> Originally: `EDITOR_FIXES_IMPLEMENTATION.md` — Written 2026-06-19 (v3)


> Written: 2026-06-19 (v3 — every fix validated against actual file content)  
> All line numbers verified. Solutions tested for correctness before writing.  
> Status: Implement in order shown.

---

## Summary of Changes from v2

After reading every file line-by-line, several v2 solutions were wrong or incomplete:

| Fix | v2 Status | v3 Correction |
|---|---|---|
| 3-A duplicate chart picker | `onChartEditorOpen` callback approach | Same approach but confirmed `EditorLeftPanel` wiring |
| 3-B components drag | `buildComponent` inline in FabricCanvas | Correct, but `createBrandBar` is `async` — need `await` |
| 3-C multi-series columns | "logic is correct, may not be a bug" | **Confirmed BUG in `ChartDataTable`**: `numSeries` at line 22 uses `series.length` which is 0 before data is set |
| 4-D radar validation | "add length equality check" | **Already exists** at line 21: `len(ds.get("values", [])) != len(labels)`. Only missing: min 3 labels |

---

## Sprint 1 — Chart Rendering

---

### Fix 1-A: Column chart renders single-color

**Confirmed problem:** `chartRenderer.ts` line 229 — `bg` IS an array of correct colors. The real render bug: Chart.js v4 `bar` chart with a single dataset and `backgroundColor: array` CAN render per-bar colors IF `borderColor` is not interfering. The `bar` case (line 236) is missing `borderSkipped: false` — only `column` has it. More critically, neither case sets `borderColor: "transparent"` which means Chart.js renders a thin default black border on each bar that can visually dominate at certain sizes.

**File: `frontend/utils/canvasTemplates/chartRenderer.ts`**

Replace lines 235–241 (bar and column cases):

```typescript
case "bar":
  return {
    type: "bar" as const,
    data: { labels, datasets: [{
      data: values,
      backgroundColor: values.map((_, i) => palette.COLORS[i % palette.COLORS.length]),
      borderRadius: 6,
      borderSkipped: false,
      borderColor: "transparent",
      borderWidth: 0,
    }] },
    options: { ...base, indexAxis: "y" as const,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { display: false }, ticks: { color: palette.TICK, font: { size: 17 } } },
        x: { grid: { color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } },
      } },
  };

case "column":
  return {
    type: "bar" as const,
    data: { labels, datasets: [{
      data: values,
      backgroundColor: values.map((_, i) => palette.COLORS[i % palette.COLORS.length]),
      borderRadius: 8,
      borderSkipped: false,
      borderColor: "transparent",
      borderWidth: 0,
    }] },
    options: { ...base, indexAxis: "x" as const,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: palette.TICK, font: { size: 15 } } },
        y: { grid: { color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } },
      } },
  };
```

Also add `borderColor: "transparent", borderWidth: 0` to lines 270, 277, 284 (stacked-bar, stacked-column, comparison).

---

### Fix 1-B: Chart background box

**Confirmed problem:** Line 45 sets `background:${palette.BG}` in `style.cssText`. Canvas CSS `background` does NOT write into the canvas pixel buffer — `toDataURL()` output is already transparent for aurora. This bug does not cause the visible dark box the user sees.

**The visible box** is the `FabricImage` having its dimensions set to the full chart canvas size. When the Fabric canvas renders it, the chart image occupies a rectangle of space. The impression of a "box" is because Chart.js axes and labels don't extend to the image edges, leaving dark/blank margins.

**Real fix:** Remove the background CSS to be clean, and for lumina add a white background plugin so legend text is readable against dark Fabric canvas backgrounds.

**File: `frontend/utils/canvasTemplates/chartRenderer.ts`**

Replace line 45:
```typescript
// Remove background — canvas toDataURL is transparent by default.
// For lumina: add white bg so donut legend is readable on dark Fabric canvas.
canvas.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
```

After `buildConfig(...)` call, conditionally apply lumina background plugin:
```typescript
const config = buildConfig(chartType, chartData, palette) as ConstructorParameters<typeof Chart>[1];

// Lumina: white background so donut/radar legend text isn't invisible
if (theme === "lumina") {
  (config as { plugins?: unknown[] }).plugins = [
    ...((config as { plugins?: unknown[] }).plugins ?? []),
    {
      id: "chartBg",
      beforeDraw(chart: { ctx: CanvasRenderingContext2D; width: number; height: number }) {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      },
    },
  ];
}
const instance = new Chart(canvas, config);
```

---

### Fix 1-C: Chart height compressed

**Confirmed:** `aurora_stat.ts` line 107 already computes dynamic height: `Math.max(200, CS - t.brandBarH - curY - 32)`. This IS correct and fills available space.

**Actual issue:** When `slide.body` is long (2 full sentences ~200 chars), the `curY` tracker runs to ~550px. This leaves `1080 - 72 - 550 - 32 = 426px` for the chart — close to the hardcoded 420 fallback, but slightly less than the reference PNG's ~650px chart.

**Why the reference PNG has a taller chart:** The Jinja2 template uses CSS `flex: 1` on the chart container which fills ALL remaining space dynamically. The Fabric template has the body text competing for that space.

**Fix A:** When `hasChart` is true, truncate `slide.body` display to 2 lines maximum to give the chart more room.

**File: `frontend/utils/canvasTemplates/aurora_stat.ts`**

Replace the body text block (lines 88–102):
```typescript
// Body text — truncated when chart is present to give chart more room
const bodyTextRaw = slide.body ?? "";
const bodyText = hasChart
  ? bodyTextRaw.split(" ").slice(0, 30).join(" ") + (bodyTextRaw.split(" ").length > 30 ? "…" : "")
  : bodyTextRaw;

if (bodyText) {
  const accentBar = new fabric.Rect({
    left: 64, top: curY,
    width: 3, height: Math.ceil(bodyText.length / 54) * (20 * 1.6) + 8,
    fill: "rgba(124,110,250,0.35)",
    originX: "left" as const, originY: "top" as const,
  });
  (accentBar as fabric.Rect & { data?: unknown }).data = { role: "stat_body_accent" };
  objects.push(accentBar);
  objects.push(makeText(bodyText, {
    role: "stat_body", fontSize: 20, fill: "rgba(250,250,250,0.72)",
    lineHeight: 1.6, width: CS - 64 - 64 - 20, left: 64 + 18, top: curY,
    originX: "left" as const, originY: "top" as const,
  }));
  curY += Math.ceil(bodyText.length / 54) * (20 * 1.6) + 24;
}
```

**Fix B:** Also increase the default chart height in `chartRenderer.ts` line 19:
```typescript
return MAP[type] ?? { w: 952, h: 500 };  // was 420
```

---

### Fix 1-D: Gradient fills (DEFERRED)

Chart.js gradient fills require a `beforeDatasetsDraw` plugin that accesses bar positions post-layout. This is non-trivial and could break on Chart.js updates. Current per-bar distinct colors match the reference PNG well enough. **Implement in V2 if requested.**

---

## Sprint 2 — Templates

---

### Fix 2-A: New slides show "New Slide" placeholder

**Confirmed problem:** `TemplatesPanel.tsx` line 60 calls `api.newSlide()` then immediately navigates. The new slide has `title: "New Slide"`, `body: ""`. The canvas template renders faithfully — showing a beautiful aurora layout with "New Slide" text.

**File: `frontend/components/editor/TemplatesPanel.tsx`**

Add `STARTER_CONTENT` constant above `TemplatesPanel` function, and update `createSlideWithType`:

```typescript
// Add above the TemplatesPanel function:
const STARTER_CONTENT: Record<string, {
  title: string; body: string;
  stat_value?: string; stat_label?: string;
}> = {
  hook:    { title: "Your Headline Here", body: "" },
  content: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable." },
  stat:    { title: "This number changes everything", body: "Here's the context behind why this stat matters.", stat_value: "42%", stat_label: "Key metric label" },
  quote:   { title: "The most powerful thing I learned was this.", body: "— Source, Year" },
  cta:     { title: "Follow for weekly research breakdowns", body: "We turn dense research into 2-minute reads." },
  engage:  { title: "Did this surprise you? Follow for more.", body: "We publish research-backed insights every week." },
};
```

Replace `createSlideWithType` (lines 49-69):
```typescript
async function createSlideWithType(slideType: string, canvasTemplate?: string) {
  setCreating(slideType);
  try {
    let targetRunId = runId;
    let targetAngle = angleIndex ?? 0;
    if (!targetRunId) {
      const { run_id } = await api.createBlankRun(`New ${slideType} post`);
      targetRunId = run_id;
      targetAngle = 0;
    }
    const { slide } = await api.newSlide(targetRunId, targetAngle, slideType, "aurora");
    const slideNum = (slide as { slide_number?: number }).slide_number ?? 1;

    // Seed with meaningful placeholder content
    const starter = STARTER_CONTENT[slideType] ?? { title: "New Slide", body: "" };
    await api.editSlide(targetRunId, targetAngle, slideNum, {
      ...starter,
      canvas_template: canvasTemplate,
    });

    if (onSlideCreated) {
      onSlideCreated(targetRunId, targetAngle, slideNum);
    } else {
      router.push(`/editor?run=${targetRunId}&view=slide&angle=${targetAngle}&slide=${slideNum}`);
    }
  } catch (e) {
    console.error("createSlideWithType failed:", e);
  }
  setCreating(null);
}
```

---

### Fix 2-B: Only one content layout variant

**Confirmed problem:** `SLIDE_TYPES` line 20 has single `content` entry.

**File: `frontend/components/editor/TemplatesPanel.tsx`**

Replace `SLIDE_TYPES` (lines 18-25) and update tile onClick:

```typescript
const SLIDE_TYPES = [
  { type: "hook",    label: "Hook",        desc: "Opening slide",   color: "#7C6EFA", emoji: "🎯", template: "aurora-hook" },
  { type: "content", label: "Img Right",   desc: "Text ← Image",    color: "#2DD4BF", emoji: "📝", template: "aurora-content-0" },
  { type: "content", label: "Img Bottom",  desc: "Text ↑ Image",    color: "#2DD4BF", emoji: "📐", template: "aurora-content-1" },
  { type: "content", label: "Img Top",     desc: "Image ↑ Text",    color: "#2DD4BF", emoji: "🖼", template: "aurora-content-2" },
  { type: "content", label: "Text Only",   desc: "No image",        color: "#2DD4BF", emoji: "📄", template: "aurora-content-text" },
  { type: "stat",    label: "Stat",        desc: "Big number",      color: "#F59E0B", emoji: "📊", template: "aurora-stat" },
  { type: "quote",   label: "Quote",       desc: "Pull quote",      color: "#EC4899", emoji: "💬", template: "aurora-quote" },
  { type: "cta",     label: "CTA",         desc: "Call to action",  color: "#10B981", emoji: "🚀", template: "aurora-cta" },
  { type: "engage",  label: "Engage",      desc: "Engagement",      color: "#6366F1", emoji: "✨", template: "aurora-engage" },
] as const;
```

Update tile click in JSX:
```tsx
onClick={() => createSlideWithType(t.type, t.template)}
```

**Backend changes for `canvas_template` field:**

`backend/apps/api/v1/schemas.py` — add to `SlideEditRequest`:
```python
canvas_template: Optional[str] = None
```

`backend/core/services/slide_editor_service.py` — in `edit_slide()` after patching fields:
```python
if request.canvas_template is not None:
    slide_data["canvas_template"] = request.canvas_template
```

`frontend/lib/api.ts` — add to `SlideEditRequest` interface:
```typescript
canvas_template?: string;
```

---

## Sprint 3 — Wiring and Interactions

---

### Fix 3-A: Duplicate chart picker

**Confirmed problem:** `TemplatesPanel.tsx` lines 88-100 show `ChartEditorPanel` in the left panel. `RightPanel.tsx` lines 23-36 show compact `ChartEditorPanel` when a chart object is selected. Both visible simultaneously.

**Confirmed implementation path:** `EditorLeftPanel.tsx` renders `TemplatesPanel` at line 188-195 and passes `onInsertChart` prop. Need to add `onChartEditorOpen` alongside it.

**File: `frontend/app/editor/page.tsx`**

Add to `EditorLeftPanel` props:
```tsx
<EditorLeftPanel
  ...
  onInsertChart={handleChartApply}
  onChartEditorOpen={() => {
    canvasApiRef.current?.getCanvas()?.discardActiveObject();
    canvasApiRef.current?.getCanvas()?.renderAll();
    setSelectedObject(null);
  }}
/>
```

**File: `frontend/components/editor/EditorLeftPanel.tsx`**

Add to `EditorLeftPanelProps` interface:
```typescript
onChartEditorOpen?: () => void;
```

Add to function params and pass to TemplatesPanel:
```typescript
export function EditorLeftPanel({
  ..., onInsertChart, onChartEditorOpen,
}: EditorLeftPanelProps) {
```

In the templates tab (line 188):
```tsx
<TemplatesPanel
  runId={runId}
  angleIndex={selectedAngle}
  onSlideCreated={(rid, ai, sn) => onSelectSlide(rid, ai, sn)}
  onInsertChart={onInsertChart}
  onChartEditorOpen={onChartEditorOpen}
/>
```

**File: `frontend/components/editor/TemplatesPanel.tsx`**

Add to `TemplatesPanelProps` interface:
```typescript
onChartEditorOpen?: () => void;
```

Update `openChartEditor`:
```typescript
function openChartEditor(type: ChartType) {
  setSelectedChartType(type);
  setChartEditorOpen(true);
  onChartEditorOpen?.();
}
```

---

### Fix 3-B: Components not drag-and-droppable

**Confirmed problem:** Source side IS wired (`draggable` + `onDragStart` at line 201). Drop handler in `FabricCanvas.tsx` line 287-288 only handles `imageUrl` and returns early if `url` is falsy — `componentId` is completely ignored.

**Confirmed complication:** `createBrandBar` in `shared.ts` is `async` (line 35). The `buildComponent` function must `await` it.

**File: `frontend/components/editor/FabricCanvas.tsx`**

Replace the drop handler `useEffect` (lines 282-321) with an extended version:

```typescript
useEffect(() => {
  const outer = outerRef.current; if (!outer) return;
  function onDragOver(e: DragEvent) { e.preventDefault(); }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    if (!canvasRef.current || !containerRef.current) return;

    const imageUrl    = e.dataTransfer?.getData("imageUrl");
    const componentId = e.dataTransfer?.getData("componentId");
    const c           = canvasRef.current;
    const s           = currentScale();
    const rect        = containerRef.current.getBoundingClientRect();
    const dropX       = (e.clientX - rect.left) / s;
    const dropY       = (e.clientY - rect.top) / s;

    if (imageUrl) {
      // ── Image from Images panel ──────────────────────────────────────
      commit("drop image");
      try {
        const naturalSize = await new Promise<{ w: number; h: number }>((resolve) => {
          const el = new Image(); el.crossOrigin = "anonymous";
          el.onload = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
          el.onerror = () => resolve({ w: 400, h: 400 });
          el.src = imageUrl;
        });
        const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
        const targetSize = 300;
        const imgScale = Math.min(targetSize / naturalSize.w, targetSize / naturalSize.h);
        img.set({
          left: Math.max(0, Math.min(dropX - targetSize / 2, CANVAS_SIZE - targetSize)),
          top:  Math.max(0, Math.min(dropY - targetSize / 2, CANVAS_SIZE - targetSize)),
          scaleX: imgScale, scaleY: imgScale,
          originX: "left" as const, originY: "top" as const,
        });
        (img as fabric.FabricImage & { data?: { role: string } }).data = { role: "dropped_image" };
        c.add(img); c.setActiveObject(img); c.renderAll(); onCanvasChanged();
      } catch (err) { console.error("Drop image error:", err); }

    } else if (componentId) {
      // ── Component from Templates panel ───────────────────────────────
      commit("drop component");
      try {
        const { createBrandBar, createAccentLine, createBulletItem } = await import("@/utils/canvasTemplates/shared");
        const { createBigNumberGroup } = await import("@/utils/canvasTemplates/chartRenderer");
        const { getTokens } = await import("@/utils/canvasTokens");
        const t = getTokens("aurora-hook");

        switch (componentId) {
          case "brand-bar": {
            // Brand bar: always at bottom of canvas
            const objs = await createBrandBar(
              t, "http://localhost:8000/assets/brand/logo.png", "THEOPINIONBOARD", 1, 11
            );
            for (const obj of objs) c.add(obj);
            break;
          }
          case "accent-line": {
            const line = createAccentLine(t, 44, dropX - 22, dropY - 2);
            c.add(line); c.setActiveObject(line);
            break;
          }
          case "stat-block": {
            const group = createBigNumberGroup(
              { statValue: "42%", statLabel: "Key Metric", statContext: "Source: 2024", labels: [], values: [] },
              t, { left: dropX - 476, top: dropY - 150 },
            );
            c.add(group); c.setActiveObject(group);
            break;
          }
          case "bullet-list": {
            const texts = ["Key insight number one", "Key insight number two", "Key insight number three"];
            const addedItems: fabric.FabricObject[] = [];
            for (let i = 0; i < texts.length; i++) {
              const bullet = createBulletItem(texts[i], i, t, 22);
              bullet.set({ left: dropX - 400, top: dropY - 80 + i * 54 });
              c.add(bullet);
              addedItems.push(bullet);
            }
            break;
          }
          default:
            console.warn(`Unknown component: ${componentId}`);
        }

        c.renderAll();
        onCanvasChanged();
      } catch (err) { console.error("Component drop error:", err); }
    }
  }

  outer.addEventListener("dragover", onDragOver);
  outer.addEventListener("drop", onDrop);
  return () => {
    outer.removeEventListener("dragover", onDragOver);
    outer.removeEventListener("drop", onDrop);
  };
}, [commit, onCanvasChanged]);
```

---

### Fix 3-C: Multi-series columns issue

**Confirmed problem (final):** After reading `ChartDataTable.tsx` fully:

Line 22: `const numSeries = multiSeries ? Math.max(1, series.length) : 1;`

When `ChartEditorPanel` opens for a NEW chart with `initialType="column"`, `chartData = DEFAULT_DATA["column"]` which has NO `series` field. `series = data.series ?? []` = empty array. So `series.length = 0`, `numSeries = max(1, 0) = 1`.

When user switches to `stacked-bar`, `handleTypeChange` does:
```typescript
setChartData({ ...DEFAULT_DATA["stacked-bar"], labels: chartData.labels, values: chartData.values });
```

`DEFAULT_DATA["stacked-bar"]` HAS `series` with 2 entries. So after this spread, `chartData.series` should be set.

**BUT** — the issue is the `chartType` state and `chartData` state update asynchronously in React. In the same render cycle, `isMultiSeries = MULTI_SERIES_TYPES.includes(chartType)` uses the NEW type (stacked-bar), but `ChartDataTable` receives the OLD `chartData` (still without series) until the state commit fires.

Actually React batches both state updates together. The real issue is subtler: `handleTypeChange` at line 77:
```typescript
} else if (type !== chartType) {
  setChartData({ ...DEFAULT_DATA[type], labels: chartData.labels, values: chartData.values });
```

This spreads `DEFAULT_DATA[type]` FIRST, then overwrites `labels` and `values`. If `DEFAULT_DATA["stacked-bar"]` has `series: [...]`, it IS included. The series SHOULD be there.

**Confirmed: this is NOT a bug in the current implementation.** The `ChartDataTable` correctly shows multi-series columns when `stacked-bar` is selected. The user's screenshot showed only 2 columns because the INITIAL type was `column` (single-series), which is correct.

**However**, one real edge case exists: when user types custom labels/values in a single-series chart, THEN switches to multi-series, the `else if` branch runs and DOES preserve `series` from DEFAULT (correct). But if user previously had data in a multi-series chart, switched to single-series, then back to multi-series — the `series` from DEFAULT overwrites their custom series data.

**Fix:** For multi-series types, preserve existing `series` if present:

**File: `frontend/components/editor/ChartEditorPanel.tsx`**

Replace `handleTypeChange` (lines 72-80):
```typescript
const handleTypeChange = useCallback((type: ChartType) => {
  setChartType(type);
  const defaults = DEFAULT_DATA[type];
  const isMulti = MULTI_SERIES_TYPES.includes(type);

  if (isMulti) {
    // Preserve user's existing series if they have data; fall back to defaults
    const existingSeries = chartData.series?.length ? chartData.series : defaults.series;
    setChartData({
      ...defaults,
      labels: chartData.labels?.length ? chartData.labels : defaults.labels,
      values: chartData.values?.length ? chartData.values : defaults.values,
      series: existingSeries,
    });
  } else if (type !== chartType) {
    // Single-series: carry labels/values, strip series
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { series: _s, ...rest } = defaults;
    setChartData({ ...rest, labels: chartData.labels ?? defaults.labels, values: chartData.values ?? defaults.values });
  }
}, [chartType, chartData]);
```

---

### Fix 3-D: Wrong theme tokens for chart insert

**Confirmed problem:** `editor/page.tsx` line 188: `getTokens("aurora-hook")` hardcoded. All charts inserted on lumina slides get dark aurora palette.

**File: `frontend/components/editor/FabricCanvas.tsx`** — add `onSlideLoaded` prop:

```typescript
// Add to FabricCanvasProps interface:
onSlideLoaded?: (theme: "aurora" | "lumina") => void;
```

In `loadSlide`, after resolving `canvas_json`/`slide`, before building objects, infer and emit theme:
```typescript
// After: const { canvas_json, slide } = await api.getCanvas(...)
const templateId = (slide as { canvas_template?: string })?.canvas_template ?? inferTemplate(slide);
const theme = templateId.startsWith("lumina") ? "lumina" : "aurora";
onSlideLoaded?.(theme);
```

Note: `inferTemplate` is in `canvasTemplates/index.ts` — import it, or inline the check:
```typescript
const theme = slide?.canvas_template?.startsWith("lumina") ||
              (slide?._theme?.toLowerCase() === "lumina") ? "lumina" : "aurora";
onSlideLoaded?.(theme);
```

**File: `frontend/app/editor/page.tsx`**

Add state and wire:
```typescript
const [slideTheme, setSlideTheme] = useState<"aurora" | "lumina">("aurora");
```

```tsx
<FabricCanvas
  ...
  onSlideLoaded={setSlideTheme}
/>
```

In `handleChartApply`:
```typescript
const tokens = getTokens(`${slideTheme}-hook`);
const newObj = await createChartObject(type, data, tokens, { left, top, width, height }, slideTheme);
```

---

## Sprint 4 — Backend Data Quality

---

### Fix 4-A: Funnel monotonic check

**Confirmed missing:** `graph_validator.py` — `_is_valid_chart()` has no funnel validation beyond standard checks.

**File: `backend/core/orchestrators/content/graph_validator.py`**

Add after line 52 (after the donut negative check), before `return True`:

```python
    # Funnel: each stage must be ≤ previous stage (with 5% tolerance for rounding)
    if chart_type == "funnel":
        for i in range(1, len(nums)):
            if nums[i] > nums[i - 1] * 1.05:
                return False
```

---

### Fix 4-B: Label length truncation

**Confirmed missing:** `validate_and_fix_slides()` has no truncation.

**File: `backend/core/orchestrators/content/graph_validator.py`**

Add function before `validate_and_fix_slides`:

```python
def _truncate_chart_labels(chart_data: dict, max_chars: int = 22) -> dict:
    """Truncate chart labels + dataset labels to prevent Chart.js visual truncation."""
    if "labels" in chart_data:
        chart_data = {
            **chart_data,
            "labels": [
                str(lbl)[:max_chars - 1] + "…" if len(str(lbl)) > max_chars else str(lbl)
                for lbl in chart_data["labels"]
            ],
        }
    if "datasets" in chart_data:
        new_ds = []
        for ds in chart_data["datasets"]:
            if "label" in ds and len(str(ds["label"])) > max_chars:
                ds = {**ds, "label": str(ds["label"])[:max_chars - 1] + "…"}
            new_ds.append(ds)
        chart_data = {**chart_data, "datasets": new_ds}
    return chart_data
```

In `validate_and_fix_slides()`, add after the single-char check (after line 98, before `elif not _is_valid_chart`):

```python
# Truncate labels before further validation
if slide.get("chart_data"):
    slide = {**slide, "chart_data": _truncate_chart_labels(dict(slide["chart_data"]))}
```

---

### Fix 4-C: Frontend validation warnings in chart editor

**Confirmed missing:** `ChartEditorPanel.tsx` has no pre-apply validation.

**File: `frontend/components/editor/ChartEditorPanel.tsx`**

Add above the `ChartEditorPanel` function:

```typescript
function getChartWarnings(type: ChartType, data: ChartData): string[] {
  const w: string[] = [];
  const vals = data.values ?? [];

  if (type === "donut" && vals.length > 0) {
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum < 80 || sum > 120) {
      w.push(`Values sum to ${Math.round(sum)} — donut charts should sum to ~100%`);
    }
  }

  if (type === "funnel" && vals.length > 1) {
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] > vals[i - 1]) {
        w.push(`Step ${i + 1} (${vals[i]}) > step ${i} (${vals[i - 1]}) — funnel values should decrease`);
        break;
      }
    }
  }

  const long = (data.labels ?? []).filter(l => String(l).length > 22);
  if (long.length > 0) {
    w.push(`${long.length} label${long.length > 1 ? "s" : ""} exceed 22 chars and will be truncated`);
  }

  return w;
}
```

Add in JSX, between the options block and the footer `div`:

```tsx
{/* Validation warnings — shown above Apply button */}
{(() => {
  const warnings = getChartWarnings(chartType, { ...chartData });
  return warnings.length > 0 ? (
    <div className="px-4 pb-2">
      <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2 space-y-1">
        {warnings.map((msg, i) => (
          <p key={i} className="text-[10px] text-amber-400 flex items-start gap-1.5 leading-relaxed">
            <span className="shrink-0">⚠</span><span>{msg}</span>
          </p>
        ))}
      </div>
    </div>
  ) : null;
})()}
```

---

### Fix 4-D: Radar dataset validation

**Confirmed:** The existing check at line 21 already validates `len(ds.get("values", [])) != len(labels)`. **This fix from v2 is already implemented in the current code.**

**Only real gap:** Radar requires ≥3 axes to be meaningful. Line 16 only checks `< 2`.

**File: `backend/core/orchestrators/content/graph_validator.py`**

Change line 16:
```python
if not labels or len(labels) < 3:  # was: < 2 — radar needs at least 3 axes
```

---

## Implementation Order

```
1.  chartRenderer.ts          → Fix 1-A: per-bar colors + borderColor/Width
2.  chartRenderer.ts          → Fix 1-B: remove bg from style.cssText + lumina plugin
3.  aurora_stat.ts            → Fix 1-C: truncate body when hasChart + defaultSize bump
4.  TemplatesPanel.tsx        → Fix 2-A: STARTER_CONTENT + createSlideWithType with editSlide
5.  TemplatesPanel.tsx        → Fix 2-B: 9 SLIDE_TYPES with template field
6.  api.ts                    → Fix 2-B: canvas_template in SlideEditRequest
7.  schemas.py                → Fix 2-B: canvas_template in SlideEditRequest
8.  slide_editor_service.py   → Fix 2-B: save canvas_template to slide_data
9.  TemplatesPanel.tsx        → Fix 3-A: onChartEditorOpen prop + call in openChartEditor
10. EditorLeftPanel.tsx       → Fix 3-A: onChartEditorOpen prop + pass to TemplatesPanel
11. editor/page.tsx           → Fix 3-A: deselect canvas + clear selectedObject
12. FabricCanvas.tsx          → Fix 3-B: extended drop handler with componentId branch
13. ChartEditorPanel.tsx      → Fix 3-C: improved handleTypeChange series preservation
14. FabricCanvas.tsx          → Fix 3-D: onSlideLoaded prop + emit in loadSlide
15. editor/page.tsx           → Fix 3-D: slideTheme state + use in handleChartApply
16. graph_validator.py        → Fix 4-A: funnel monotonic check
17. graph_validator.py        → Fix 4-B: _truncate_chart_labels + call in validate_and_fix_slides
18. ChartEditorPanel.tsx      → Fix 4-C: getChartWarnings + warning UI
19. graph_validator.py        → Fix 4-D: radar min 3 axes (change < 2 to < 3)
```

---

## Files Changed

| File | Fixes |
|---|---|
| `frontend/utils/canvasTemplates/chartRenderer.ts` | 1-A, 1-B, 1-C (defaultSize) |
| `frontend/utils/canvasTemplates/aurora_stat.ts` | 1-C (body truncation) |
| `frontend/components/editor/TemplatesPanel.tsx` | 2-A, 2-B, 3-A |
| `frontend/components/editor/EditorLeftPanel.tsx` | 3-A |
| `frontend/app/editor/page.tsx` | 3-A, 3-D |
| `frontend/components/editor/FabricCanvas.tsx` | 3-B, 3-D |
| `frontend/components/editor/ChartEditorPanel.tsx` | 3-C, 4-C |
| `frontend/lib/api.ts` | 2-B |
| `backend/apps/api/v1/schemas.py` | 2-B |
| `backend/core/services/slide_editor_service.py` | 2-B |
| `backend/core/orchestrators/content/graph_validator.py` | 4-A, 4-B, 4-D |

---

## Verification

| Test | Expected |
|---|---|
| Open slide 4 (b9ad0ca9/angle_1) | 4 distinct-colored bars in column chart |
| Chart height | Fills ~500-600px on stat slide |
| Templates > Slides > Hook | Canvas shows "Your Headline Here" in hook layout |
| Templates > Slides > CTA | Aurora CTA: glows, centered headline, pill button |
| Templates > Slides > Content | 5 sub-tiles visible; each creates correct layout variant |
| Templates > Charts > open | Right panel clears (no duplicate chart editor) |
| Drag "Brand Bar" to canvas | Brand bar appears at bottom of canvas |
| Drag "Accent Line" to canvas | Accent line appears at drop position |
| Switch to Stacked in chart editor | 2 series columns + [+ Series] button visible |
| Insert chart on lumina slide | Chart uses light palette colors |
| Pipeline: funnel with increasing values | chart_data nulled in slides.json |
| Long label (>22 chars) in pipeline | Truncated in slides.json |
| Donut values sum 400 in chart editor | Amber warning above Apply button |
| Funnel with increasing step | Amber warning above Apply button |

---

# Part 4 — GAN Template Testing

> Written: 2026-06-19  
> Method: Adversarial iteration — generate → compare → fix → repeat

## What is GAN-style Testing?

GAN = Generative Adversarial Network (adapted for template testing).

**Standard GAN:** A generator produces output, a discriminator critiques it, the generator improves.

**Our adaptation:**
- **Generator:** Fabric.js canvas templates rendering slides from `slides.json`
- **Discriminator:** Automated pixel-diff comparison (`pixelmatch`) against the reference Jinja2/Playwright PNGs
- **Training signal:** Diff percentage per slide + visual inspection of composite images
- **Iteration:** Fix the worst-scoring templates, re-render, re-compare

```
Iteration N:
  1. Playwright renders all 12 slides via the browser editor
  2. Each generated PNG cropped to exact canvas dimensions
  3. Resize to 1080×1080 to match reference
  4. pixelmatch computes per-pixel diff (threshold: 0.15 for anti-aliasing tolerance)
  5. Diff % per slide + overall average reported
  6. Composite image (reference | generated | diff) saved for visual inspection
  7. Worst slides identified → template bugs fixed → Iteration N+1
```

## Results Summary

| Iter | Avg Diff | GOOD | FAIR | POOR | Key Fix |
|---|---|---|---|---|---|
| 1 | 22.12% | 5 | 4 | 3 | Baseline |
| 2 | 20.63% | 5 | 4 | 3 | Content template image panel sizing |
| 3 | 17.11% | 9 | 0 | 3 | `absolutePositioned:true` on Fabric clipPath |
| 4 | 13.68% | 10 | 0 | 2 | Correct layout variants per slide (content-1, content-2) |
| 5 | 12.69% | 11 | 0 | 1 | Engage gradient direction (CSS 135deg fix) |
| 6 | 11.28% | 10 | 1 | 1 | Visual polish: swipe pill, stat overlap, quote width, CTA glows |
| **7** | **10.49%** | **10** | **2** | **0** | Stat label dynamic width, layout-2 top-align — 0 POOR slides |

**Improvement: 52.6% reduction in average pixel diff over 7 iterations.**

## Key Bugs Found by GAN Testing

| Bug | Found by | Fix |
|---|---|---|
| Image panel shows tiny bottom-right thumbnail | Iter 1 | `loadPanelImage()` with proper cover-scale + `absolutePositioned:true` clipPath |
| All content slides using wrong layout | Iter 3 | Checked HTML `flex-direction` to identify real layout variants; patched `canvas_template` |
| Engage gradient wrong direction | Iter 4 | CSS `135deg` = top-right→bottom-left, not top-left→bottom-right. Fixed Fabric coords |
| Stat label overlaps huge number | Iter 6 | Dynamic width estimation based on actual character count |
| Layout-2 missing bullets | Iter 6 | Explicitly added bullet rendering to layout-2 block |
| Line chart no area fill | Iter 6 | `fill:true` + `backgroundColor: primary+'44'` in Chart.js config |

## Remaining Residual Gaps (~10%)

These are the theoretical floor — cannot be eliminated without deeper engine work:

1. **Image crop mismatch (~27% for slide 9, ~17% for slide 5):** Same photo, same layout, but CSS `object-fit:cover` and Fabric's `absolutePositioned` clip produce different pixel-level crops. Composure and content are correct.
2. **Font anti-aliasing (~3-5%):** Playwright headless Chrome and browser Chrome render subpixel fonts slightly differently.
3. **Gradient text fill:** CSS `background-clip:text` on stat values cannot be reproduced in Fabric — we use solid primary color instead.
4. **Box shadows on image cards:** Jinja2 uses `box-shadow: 0 28px 56px rgba(0,0,0,0.65)` — not native in Fabric.

## Tooling

- **Script:** `scripts/gan_iterate.js` — renders all 12 slides, compares, saves report + composite images
- **Results:** `backend/outputs/test-runs/{run_id}/iteration{N}/`
  - `generated/` — Playwright-rendered PNGs
  - `diff/` — pixelmatch diff PNGs (red = mismatched pixels)
  - `composite/` — side-by-side: reference | generated | diff
  - `report.json` — machine-readable scores
- **Final report:** `backend/outputs/test-runs/{run_id}/FINAL_GAN_REPORT.json`

