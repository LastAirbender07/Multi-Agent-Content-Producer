# Editor UI Test Protocol — Hands-Dirty Browser Validation

> **Created:** 2026-09-06  
> **Scope:** Canvas editor — templates, components, image replacement, text editing, ungroup, persistence  
> **Audience:** Any AI agent, LLM session, or human QA running validation after a Phase 2.x or later code change  
> **Companion script:** `scripts/editor_ui_audit.cjs` (Playwright)  
> **Parent protocol:** `Docs/protocol/REVIEW_PROTOCOL.md` — Loop 3 section

---

## Why This Document Exists

GAN-score validation (pixel similarity %) is **dead**. It measures whether a slide looks like its reference screenshot — not whether a real user can actually *use* it. You can have a 98% GAN score on a slide where:
- Text boxes overlap each other
- Nothing is selectable because `selectable: false` was accidentally left on
- The "Replace Photo" button appears but crashes on click
- An image fills the slot but overflows the component's border
- Changes don't survive a page reload

This protocol is the replacement gate. **Every template and component must pass all applicable dimensions in a real Chromium browser before it is considered done.** No exceptions. No "it looks fine in the source code."

---

## Core Philosophy

> **Make your hands dirty.** Click it. Type in it. Drag it. Replace the image. Save. Reload. If you can't do all of that fluidly in under 60 seconds per component, it is not done.

Every test in this document is a **browser action**, not a code inspection. The only code you should read during testing is error messages in the browser console.

---

## Section 1 — Test Environment Setup

### 1.1 Start the servers

```bash
# Terminal A — backend
cd backend && uv run uvicorn main:app --port 8000 --reload

# Terminal B — frontend
cd frontend && pnpm dev

# Terminal C — health probe (wait until both return 200)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/v1/analytics/summary
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

### 1.2 Confirm `window.__fc` is accessible

`window.__fc` is the live Fabric.js canvas instance — exposed in dev mode only. The Playwright audit scripts use it to inspect object state without relying on visual heuristics.

```bash
# In browser console (DevTools → Console):
window.__fc.getObjects().map(o => ({ type: o.type, role: o.data?.role, sel: o.selectable }))
```

Expected: array of objects, each with a `role` field. If `window.__fc` is undefined → check that `NODE_ENV !== "production"` and that `FabricCanvas.tsx` line 160 is present.

### 1.3 Create a test fixture slide

Each test starts by creating a fresh slide from the template tile. The editor URL pattern is:

```
http://localhost:3000/editor?run=<run_id>&view=slide&angle=0&slide=<n>
```

You don't need a pre-existing run. Click a template tile in the Templates panel → a new slide is created → URL updates → click the "Open in canvas" / "Edit in canvas" button. That is your test canvas.

### 1.4 Screenshot output directory

All audit screenshots go to:

```
scripts/playwright_shots/ui_audit/
```

One subdirectory per template or component. Each test step gets a numbered screenshot: `01_drop.png`, `02_select.png`, `03_replace.png`, etc.

---

## Section 2 — The 7 Test Dimensions

Every template and every component is scored against these 7 dimensions. Each is either **PASS** or **FAIL** — no partial credit.

---

### Dimension 1 — Aesthetic & Visual Clarity

**What to look at:**
- The slide renders with the correct visual DNA (cream/dark/white/aurora) — no wrong background colour
- No text overlaps another text element
- No element is clipped by the canvas edge (unless intentional — e.g. a bleed effect)
- Padding is consistent — text doesn't start at x=0 or touch the canvas edge
- No z-order accident — the background rect is behind everything else
- Font renders correctly (Playfair, Inter — not a fallback sans-serif)
- Colors match the family palette — no aurora purple on a compact-clean cream slide

**How to check:**
1. Create the slide from the template tile
2. Enter canvas edit mode
3. Take a screenshot
4. Zoom to 100% in your browser (Cmd+0)
5. Visually inspect each of the bullet points above

**PASS criteria:** All bullet points above are true. No element looks misplaced or wrong.

**FAIL examples:**
- Text rendered at wrong y-position, overlapping an image
- Background is black on a cream template
- Playfair font not loaded → falls back to Times New Roman

---

### Dimension 2 — Selectability

**What to look at:**
- Every non-decorative element must show a blue selection border + handles when clicked
- Decorative elements (background rects, gradient overlays, hairline rules, dot progress indicators used as pure decoration) should NOT be selectable
- Clicking empty space should deselect everything
- Clicking a Group should select the group — not nothing

**How to check:**
```
For each visible element on the slide:
  1. Click it
  2. Expected: blue border + transform handles appear in Fabric canvas
  3. Verify: right panel updates (shows Text panel, Image panel, or Group panel)
  4. Click canvas background (empty space)
  5. Expected: selection clears
```

**Automated check (paste in browser console):**
```js
window.__fc.getObjects().map((o,i) => ({
  i,
  role: o.data?.role ?? '(no role)',
  type: o.type,
  selectable: o.selectable,
  evented: o.evented,
}))
```
Any object with `selectable: false` that is NOT a known decorative element is a bug.

**PASS criteria:**
- All content objects (text, images, groups) are selectable
- All decorative objects (bg, overlay, hairline, dots) are NOT selectable
- Right panel updates when any content object is selected

**FAIL examples:**
- Click on a text box → nothing selected (selectable: false left on)
- Click on a Group → group is selected but right panel says "Nothing selected"
- Background rect is selectable (interferes with clicking content behind it)

---

### Dimension 3 — Text Editing

**What to look at:**
- Double-click any Textbox or Text element → cursor appears, text is editable inline
- Typing changes the text immediately on the canvas
- Pressing Enter within a multiline Textbox adds a new line (doesn't submit a form)
- The ContextToolbar (floating bar) appears above the selection when text is selected
- Bold / Italic / font size / alignment buttons in the ContextToolbar work
- TextPropertyPanel in the right sidebar shows the text content and allows editing
- Long text does NOT overflow beyond the defined Textbox width

**How to check:**
```
1. Click a text element → it becomes selected
2. Double-click → text cursor appears (Fabric IText mode)
3. Select all text (Cmd+A) → type replacement text
4. Click outside → text updates on canvas
5. Click the text again → in ContextToolbar: change font size → text resizes
6. Change alignment (left/center/right) → verifiable
7. Check TextPropertyPanel in right panel → shows the new text
```

**PASS criteria:**
- Double-click to edit works on every Textbox
- Font size, bold, italic, alignment all apply and persist
- No text overflow outside the Textbox width boundary

**FAIL examples:**
- Double-click does nothing (Text object instead of Textbox — no cursor)
- Changing font size in toolbar has no effect
- Text wraps and goes below the canvas bottom (height not constrained)

---

### Dimension 4 — Ungroup & Re-edit

**What to look at:**
- Multi-object components (Brand Bar, Glass Card, Overlay Cards, Phone Mockup, etc.) render as a Fabric.Group
- The group is selectable and shows a bounding box handle
- Clicking the "Ungroup" button in ContextToolbar separates all children
- Each child is independently selectable, moveable, and editable after ungrouping
- Children land at their correct canvas positions after ungroup (not stacked at 0,0)

**How to check:**
```
1. Drop a group-based component (e.g. brand-bar, cover-phone-mockup) onto the canvas
2. Click it → group is selected
3. Click "Ungroup" in the ContextToolbar (the ⊞ icon)
4. Each child becomes independently selectable
5. Click each child — right panel updates correctly (Text panel for text, Image panel for images)
6. Drag one child → it moves independently without affecting siblings
7. Edit the text child → change is visible
```

**PASS criteria:**
- Ungroup produces independently moveable children
- All children land at correct positions (no stacking at origin)
- Each child is selectable and shows the correct right panel

**FAIL examples:**
- After Ungroup, all children appear at 0,0 (coordinate system bug)
- After Ungroup, children are not selectable (selectable: false not cleared)
- Ungroup button is greyed out / missing for a group object

---

### Dimension 5 — Image Replacement (slot-based)

**Applies to:** `cover-phone-mockup`, `cover-image-pair`, `cover-polaroid-frame`, `aurora-compact-quote` (portrait), and any template containing a tilted phone or image pair as part of its layout.

**What to look at:**
- When the component is selected, a "Replace Photo" button appears in ContextToolbar (camera icon, violet)
- Clicking "Replace Photo" opens the OS file picker without deselecting the component
- Choosing a file → image loads and fills the slot
- The image fills its designated area and does NOT overflow outside the component's boundary
- The image is cover-fit (fills completely, no empty white gaps)
- The component's decorative frame / stroke / shadow is preserved after fill

**How to check:**
```
1. Drop the image-slot component onto canvas
2. Click it → "Replace Photo" button appears in ContextToolbar
3. Click "Replace Photo" → OS file picker opens
4. Select any photo from disk (e.g. a 4000×3000 landscape photo)
5. Verify: image appears inside the slot (not as a new free-floating image on canvas)
6. Verify: image is clipped to the slot shape (no overflow)
7. Check that the phone frame / polaroid border is still visible on top of the image
8. Take a screenshot
```

**PASS criteria:**
- "Replace Photo" button appears when and only when an image-slot component is selected
- File picker opens; selecting a file fills the slot
- Image is clipped to the slot shape — no overflow outside the component boundary
- Component frame/border remains visible over the image
- The image actually fills (no empty grey placeholder visible)

**FAIL examples:**
- Clicking "Replace Photo" opens picker but image appears as a new free-floating canvas object instead of filling the slot
- Image fills the slot but overflows the rounded-corner boundary (clipPath not working)
- After fill, the phone frame disappears (z-order issue — image rendered on top of frame)
- "Replace Photo" button does not appear when the component is selected

---

### Dimension 6 — Image Crop / Free Edit

**Applies to:** Same as Dimension 5.

This is the dimension most likely to FAIL on Phase 2.5 components. The user must be able to reposition an image within its slot after filling it. Without this, a wide landscape photo dropped into a tall portrait slot will show only the image center — the user can't adjust which part of the image shows.

**What "done" looks like:**
- After dropping an image into a slot, the user can enter a "crop/pan" mode
- In crop mode: drag the image to reposition it within the slot boundary
- The slot's clip shape stays fixed; only the image moves
- Alternatively: a set of crop preset buttons (fill/fit/center/top/left-align)

**Current state (as of Phase 2.5):**
- Image fills the slot via cover-scale (always centered) ← implemented
- No user-adjustable crop/pan mode ← **NOT YET IMPLEMENTED — known gap**
- This is a Blocker-level UX issue for any image-slot component

**How to check (what currently works):**
```
1. Fill the slot (as per Dimension 5)
2. Try to double-click the group to enter the image's pan mode
3. Expected (Phase 2.5): nothing happens — no pan mode
4. Note: this is a KNOWN GAP — record it, do not mark as FAIL for now
   but DO mark as "Crop/Pan: TODO" in the test result
```

**What the future implementation needs:**
- `interactive: true` on the group allows double-click to enter group editing mode
- Inside the group, the image child should be draggable within the group-local clip boundary
- Fabric v7's `Group.enterEditing()` or a custom overlay approach
- A "Done Cropping" escape mechanism (click outside group or press Escape)

**PASS criteria (future state):**
- Double-click the slot component → enters crop mode
- In crop mode: drag image → it pans within the clip boundary
- Click outside / Escape → exits crop mode, image position saved
- Image does not escape the component's clip boundary during pan

---

### Dimension 7 — Persistence

**What to look at:**
- After editing text / replacing an image / moving an element: the canvas auto-saves (or the user can manually save)
- Reload the browser tab → the slide reopens at the same URL → all edits are present
- The rendered PNG (shown in the slide thumbnail) updates to reflect the canvas state

**How to check:**
```
1. Edit a text element — change its content
2. Move an element — drag it to a new position
3. Wait 2 seconds (auto-save), or click the manual Save button if present
4. Reload the browser (Cmd+R or Cmd+Shift+R to hard-reload)
5. Navigate back to the same slide
6. Verify: text change and element position are preserved
7. Check the slide thumbnail in the slide list — it should show the updated state
```

**PASS criteria:**
- All text changes survive a page reload
- Element positions survive a page reload
- Image fills survive a page reload (slot image is not reset to placeholder)
- PNG thumbnail updates within 10 seconds of saving

**FAIL examples:**
- Text reverts to original content after reload (canvas_json not saved)
- Image fill is lost after reload (slot group's `data.filledSlots` not persisted)
- Thumbnail still shows the old state after editing

---

## Section 3 — Template Test Matrix

For each template: **Family**, **Visual DNA** (what it should look like), and **which Dimensions to focus on** (all 7 always apply, but these are the high-risk ones for each template).

### Phase 2.5 Templates (primary focus — 7 new)

| Template ID | Family | Visual DNA | High-Risk Dimensions |
|---|---|---|---|
| `aurora-compact-clean-cta` | compact-clean | Cream bg, peach pill top-centre, Inter Black 900 headline centred, brand pill bottom-left | D1 (pill centering), D2, D3 |
| `aurora-compact-clean-quote` | compact-clean | Cream bg, decorative peach `"` top-left (220pt), Playfair Bold Italic centred quote, attribution below, brand pill | D1 (deco quote glyph size), D2, D3 |
| `aurora-compact-clean-engage` | compact-clean | Cream bg, peach pill top-centre, Inter Black action verb, muted supporting copy, brand pill | D1, D2, D3 |
| `aurora-editorial-hook` | editorial | White bg, 5px black border frame, editorial header bar (handle + series title + rule), Playfair Bold Italic headline, Inter muted body, chapter label bottom-right | D1 (border + frame), D2, D3, D4 (header bar group) |
| `aurora-editorial-cta` | editorial | White bg, 5px border, editorial header, large Playfair closing CTA line, series label bottom | D1, D2, D3 |
| `aurora-nextwork-dark-cta` | nextwork-dark | Near-black `#0D0D0D` bg, white outlined pill left-aligned, Inter Black white headline, muted off-white sub-copy, cream brand pill | D1 (dark bg, light type), D2, D3 |
| `aurora-nextwork-dark-engage` | nextwork-dark | Same dark DNA as dark-cta, action verb headline, SAVE THIS pill | D1, D2, D3 |

### Existing Templates (regression check — must not break)

| Template ID | Family | High-Risk After Phase 2.5 |
|---|---|---|
| `aurora-hook` | aurora-extended | D2 (still selectable), D7 |
| `aurora-content-0` | aurora-extended | D2, D3 |
| `aurora-stat` | aurora-extended | D2, D3 (stat number editable) |
| `aurora-quote` | aurora-extended | D2, D3 |
| `aurora-cta` | aurora-extended | D2 |
| `aurora-engage` | aurora-extended | D2 |
| `aurora-compact-hook` | compact-clean | D2, D3 |
| `aurora-compact-fact` | compact-clean | D2, D3 |
| `aurora-compact-fact-compare` | compact-clean | D2, D3 |
| `aurora-compact-step` | compact-clean | D2, D4 |
| `aurora-compact-step-index` | compact-clean | D2, D3, D4 |
| `aurora-compact-step-detail` | compact-clean | D2, D5 (card contains image area) |
| `aurora-compact-stat-hero` | nextwork-dark | D2, D5 (photo bg) |
| `aurora-compact-list-item` | editorial | D2, D3, D4 |
| `aurora-compact-quote` | editorial | D2, D3, D5 (portrait image) |
| `aurora-carousel-cover-hero-phone` | cover-hero | **D2, D4, D5, D6** (phone mockup — most critical) |
| `aurora-carousel-cover-hero-images` | cover-hero | **D2, D4, D5, D6** (image pair — most critical) |

---

## Section 4 — Component Test Checklist

For every tile in the Components panel. Run in this order: **Aurora section → Compact section → Cover section**.

### How to test each component

```
1. Open /editor → create any slide (e.g. aurora-hook)
2. Enter canvas edit mode
3. Open Templates panel → switch to "Components" tab
4. Find the component tile
5. Drag the tile from the panel → drop it onto the canvas
6. VERIFY each checkpoint below
```

### Per-Component Checkpoints

For every component, verify ALL of the following:

- [ ] **C1 — Lands at drop coords:** Component appears near where you dropped it, not at 0,0 or off-screen
- [ ] **C2 — Immediately selectable:** Click it → blue selection border appears
- [ ] **C3 — Right panel updates:** Selection shows the correct panel (Group, Text, or Image panel)
- [ ] **C4 — No console errors:** Browser DevTools Console shows no red errors after drop
- [ ] **C5 — Visual appearance:** Looks like its label description — not a blank rect, not invisible, no garbled text

### Aurora Extended Components (15 tiles)

| Component ID | Label | Expected appearance after drop | Image slot? |
|---|---|---|---|
| `brand-bar` | Brand Bar | Logo + "THEOPINIONBOARD" pill + progress bar at canvas bottom. Draggable group. | No |
| `dark-card` | Glass Card | Dark frosted-glass rounded card, centred on drop point | No |
| `stat-block` | Stat Block | Large coral number + muted label text | No |
| `quote-block` | Quote Block | Teal insight dot + white italic quote text | No |
| `bullet-list` | Bullet List | 3 numbered bullets with gradient number circles | No |
| `accent-line` | Accent Line | Thin gradient horizontal divider bar | No |
| `eyebrow-pill` | Eyebrow Pill | Frosted small pill chip with label text | No |
| `glow-blob` | Glow Blob | Soft radial gradient circle (atmospheric, partially transparent) | No |
| `deco-ring` | Deco Ring | Thin circle outline, decorative | No |
| `btn-gradient` | Btn: Gradient | Pill with aurora gradient fill + white text | No |
| `btn-ghost` | Btn: Ghost | Pill with transparent fill, white border + text | No |
| `btn-frosted-glow` | Btn: Frosted Glow | Pill with glass fill + purple outer glow | No |
| `btn-solid-white` | Btn: Solid White | White pill + gradient text label | No |
| `btn-dark-pill` | Btn: Dark Pill | Near-black pill with white border + text | No |
| `btn-dark-gradient` | Btn: Dark+Gradient | Dark fill + gradient text label | No |

### Compact Family Components (6 tiles)

| Component ID | Label | Expected appearance | Image slot? |
|---|---|---|---|
| `compact-brand-pill` | Brand Pill | Dark rounded pill with `@yourbrand` wordmark in cream text | No |
| `compact-outlined-pill` | Category Pill | Cream-outline rounded pill, ALL-CAPS peach label | No |
| `compact-mixed-weight-text` | Mixed Weight Text | "Regular and **Black**" inline — two weights in one Textbox | No |
| `compact-dot-progress` | Dot Progress | 5 small circles (3 filled, 2 hollow) in a row | No |
| `compact-number-badge` | Number Badge | Outlined circle (no fill) with "01" number inside | No |
| `compact-editorial-header` | Editorial Header | `@handle` left-aligned + italic series title right-aligned + thin horizontal rule below | No |

### Cover Hero Components (9 tiles)

| Component ID | Label | Expected appearance | Image slot? |
|---|---|---|---|
| `cover-phone-mockup` | Tilted Phone | Rounded dark phone shape, tilted -8°, shadow, gradient screen fill | **YES** |
| `cover-image-pair` | Image Pair | Two overlapping colour-block placeholders at different tilts | **YES** |
| `cover-overlay-cards` | Overlay Cards | Two small dark frosted cards with stat/label text | No |
| `cover-straddling-title` | Straddling Title | White card with a pill chip sitting on its top edge | No |
| `cover-metallic-gradient` | Metallic Gradient | Soft peach-to-brown radial gradient rect | No |
| `cover-display-headline` | Display Headline | Inter Black ~140pt placeholder headline text | No |
| `cover-body-text` | Cover Body Text | Inter 400 muted supporting copy block | No |
| `cover-italic-cta` | Italic CTA Line | Playfair Italic "Swipe to see →" style closing line | No |
| `cover-polaroid-frame` | Polaroid Frame | White bordered polaroid with placeholder inner area + caption zone | **YES** |

---

## Section 5 — Deep Test: Image-Slot Components

These three components require the most thorough testing. They are the most likely to have visual or UX failures.

---

### 5.1 Tilted Phone Mockup (`cover-phone-mockup`)

**Steps:**

```
STEP 1 — Drop
  Action: Drag "Tilted Phone" tile → drop at canvas center
  Expected: Rounded phone shape appears, tilted at ~-8°, with shadow
  Screenshot: 01_dropped.png

STEP 2 — Select
  Action: Click the phone group
  Expected: Blue selection border around entire phone shape (not inner objects)
  Expected: Right panel shows "Group" or similar
  Expected: ContextToolbar shows "Replace Photo" button (camera icon)
  Screenshot: 02_selected.png

STEP 3 — Replace Photo
  Action: Click "Replace Photo" in ContextToolbar
  Expected: OS file picker opens
  Action: Select any photo (portrait or landscape)
  Expected: Photo appears filling the phone screen area
  Expected: Photo is CLIPPED to the rounded phone shape — no overflow outside
  Expected: Phone frame stroke (#C4BAB0) is still visible OVER the photo
  Expected: Shadow is still visible
  Screenshot: 03_filled.png

STEP 4 — Check clip boundary
  Action: Zoom browser to 200%
  Expected: Photo pixels do not extend outside the rounded-rectangle clip
  Expected: Rounded corners are sharp (no aliasing beyond boundary)
  Screenshot: 04_zoomed_clip.png

STEP 5 — Ungroup
  Action: With phone selected, click Ungroup in ContextToolbar
  Expected: Phone splits into: [image/placeholder, phone frame rect]
  Expected: Each child is independently selectable at correct canvas position
  Expected: No child appears at 0,0
  Screenshot: 05_ungrouped.png

STEP 6 — Crop / Pan (known gap — document current state)
  Action: Double-click the phone group (before ungrouping)
  Expected (future): enters crop mode where image can be panned
  Actual (Phase 2.5): nothing happens — no crop mode
  Record: "Crop/Pan: TODO — Blocker for production use"
```

**Known Issues:**
- **No crop/pan mode** — image always centered in slot. If user uploads a wide landscape photo into a portrait phone slot, the photo is auto-cropped to center. User cannot choose which part of the image shows. **Status: OPEN / Blocker**

---

### 5.2 Image Pair (`cover-image-pair`)

**Steps:**

```
STEP 1 — Drop
  Action: Drag "Image Pair" tile → drop at canvas center
  Expected: Two overlapping tilted placeholder rectangles appear
  Expected: Left rect tilted ~-6°, right rect tilted ~+5°, overlapping
  Expected: Both have soft shadows
  Screenshot: 01_dropped.png

STEP 2 — Select
  Action: Click the pair group
  Expected: Blue border around the combined bounding box
  Expected: "Replace Photo" button in ContextToolbar
  Screenshot: 02_selected.png

STEP 3 — Fill first slot (index 0)
  Action: Click "Replace Photo" → select a photo
  Expected: First placeholder (left, larger) is replaced by the photo
  Expected: Photo is tilted at -6° matching the slot
  Expected: Photo has rounded corners (cornerRadius=20)
  Expected: Second placeholder (right, smaller) is unchanged
  Screenshot: 03_slot0_filled.png

STEP 4 — Fill second slot (index 1)
  Action: Click the group again → "Replace Photo" → select a different photo
  Expected: Second placeholder (right, smaller) is replaced
  Expected: Photo is tilted at +5° matching the slot
  Expected: First photo is unchanged
  Screenshot: 04_slot1_filled.png

STEP 5 — Verify cycle
  Action: Click "Replace Photo" a 3rd time
  Expected: First slot (index 0) is replaced again (cycles 0 → 1 → 0)
  Screenshot: 05_cycled.png

STEP 6 — Ungroup
  Action: Ungroup the image pair
  Expected: Two independent image objects, each independently moveable and at correct tilted positions
  Screenshot: 06_ungrouped.png
```

**Known Issues:**
- **No crop/pan mode** for either slot — same as phone mockup. **Status: OPEN / Blocker**
- When a landscape photo fills a portrait slot (or vice versa), the cover-scale crops heavily. User has no control. **Status: OPEN / Blocker**

---

### 5.3 Polaroid Frame (`cover-polaroid-frame`)

**Steps:**

```
STEP 1 — Drop
  Action: Drag "Polaroid Frame" tile → drop at canvas center
  Expected: White bordered rectangle (polaroid aesthetic), inner photo area (placeholder), caption text zone below
  Screenshot: 01_dropped.png

STEP 2 — Select
  Action: Click the polaroid group
  Expected: Blue border, "Replace Photo" in ContextToolbar
  Screenshot: 02_selected.png

STEP 3 — Fill inner photo
  Action: Click "Replace Photo" → select a photo
  Expected: Photo fills the inner area (index 1 child, NOT the white bg)
  Expected: Photo does NOT overflow into the caption area below
  Expected: White polaroid border remains visible
  Expected: Caption text remains readable below the photo
  Screenshot: 03_filled.png

STEP 4 — Edit caption
  Action: Double-click the caption text zone below the photo
  Expected: Text cursor appears → type new caption text
  Expected: Caption text is editable independently of the photo
  Screenshot: 04_caption_edited.png

STEP 5 — Save and reload
  Action: Wait 2s for auto-save → Cmd+R (reload)
  Expected: Photo fill is preserved — not reset to placeholder
  Expected: Caption text change is preserved
  Screenshot: 05_after_reload.png
```

---

## Section 6 — Known Issues Log

> Severity: **Blocker** (prevents basic use), **Major** (significantly degrades UX), **Minor** (cosmetic or low-impact)

| # | Component / Template | Dimension | Issue | Severity | Status | Code location |
|---|---|---|---|---|---|---|
| I-1 | All image-slot components | D6 | No crop/pan mode — user cannot reposition an image within its slot after filling | Blocker | OPEN | `canvasDropHandlers.ts:fillImageSlot` — crop mode not implemented |
| I-2 | `cover-phone-mockup` | D6 | Phone screen image always centered — landscape photo in portrait slot loses most of the image | Blocker | OPEN | `fillImageSlot phone_mockup` block — cover-scale only, no pan |
| I-3 | `cover-image-pair` | D6 | Same as I-2 for both slots | Blocker | OPEN | `fillImageSlot image_pair` block |
| I-4 | `cover-polaroid-frame` | D6 | Same as I-2 for inner photo | Blocker | OPEN | `fillImageSlot polaroid_frame` block |
| I-5 | `aurora-carousel-cover-hero-phone` | D6 | Template-level phone mockup (built-in, not dropped) has the same no-crop limitation | Blocker | OPEN | `makeTiltedPhoneMockup.ts` |
| I-6 | `aurora-carousel-cover-hero-images` | D6 | Template-level image pair — same | Blocker | OPEN | `makeTiltedImagePair.ts` |
| I-7 | Brand Bar | D2 | Was not selectable before Phase 2.5 fix — verify the fix holds | Major | Fixed (2026-09-06) | `componentDroppers/brandBar.ts` — `interactive: true` added |
| I-8 | Phone Mockup (dropped) | D2 | Was crashing on `canvas.add()` due to post-construction `clipPath` assignment — verify fix | Major | Fixed (2026-09-06) | `makeTiltedPhoneMockup.ts` — clipPath moved to constructor |

---

## Section 7 — Playwright Audit Script Spec

The companion script `scripts/editor_ui_audit.cjs` should implement the following test flow. Any AI agent asked to "write the editor audit script" should implement all of these.

### Script structure

```
SETUP
  browser = chromium.launch({ headless: false, slowMo: 80 })  ← headless:false so you can SEE it
  page.on("pageerror") → record all page errors
  page.on("console", type=error) → record all console errors

FOR EACH TEMPLATE in ALL_TEMPLATES:
  1. navigate to /editor
  2. click Templates tab
  3. find tile with data-slide-type="<template-id>"
  4. if not found → FAIL: "tile not found in panel"
  5. click tile → wait for URL to contain "view=slide"
  6. click "Open in canvas" / "Edit in canvas" button → wait for canvas element
  7. wait for canvas to settle (networkidle + 600ms)
  8. SCREENSHOT: <id>_01_rendered.png
  9. DIMENSION 1 check:
     - window.__fc.getObjects().length > 1  (has content beyond background)
  10. DIMENSION 2 check:
     - click multiple spots (9 CLICK_SPOTS pattern from existing audit)
     - verify at least one spot triggers a selection (getActiveObject() != null)
     - check that selected object's data.role is NOT a known-decorative role
  11. SCREENSHOT: <id>_02_selected.png
  12. DIMENSION 3 check (text editability):
     - find first Textbox in getObjects()
     - double-click its canvas position
     - check IText editing mode active (canvas._iTextInstances.length > 0 or similar)
     - type "TEST"
     - Escape
     - verify text changed
  13. SCREENSHOT: <id>_03_text_edited.png
  14. RECORD result: { template, d1_ok, d2_ok, d3_ok, apiErrors[], pageErrors[] }
  15. navigate back for next template

FOR EACH IMAGE-SLOT COMPONENT ["cover-phone-mockup", "cover-image-pair", "cover-polaroid-frame"]:
  1. create a base slide (aurora-hook)
  2. switch to Components tab
  3. drag component tile to canvas center
  4. click the dropped group
  5. check ContextToolbar has "Replace Photo" button
  6. SCREENSHOT: <id>_drop_selected.png
  7. verify window.__fc.getActiveObject().data.role is correct slot role

SUMMARY
  print pass/fail table
  write scripts/playwright_shots/ui_audit/report.json
  exit(1) if any failures
```

### Assertions format

```js
// Per-template result shape
{
  template: "aurora-compact-clean-cta",
  tileFound:    true | false,
  rendered:     true | false,   // objects.length > 1
  anySelected:  true | false,   // at least one click selected a content object
  textEditable: true | false,   // double-click Textbox worked
  apiErrors:    [],             // any non-2xx API responses during the test
  pageErrors:   [],             // window.onerror / console.error events
  issues:       [],             // human-readable list of failures
  screenshotDir: "scripts/playwright_shots/ui_audit/aurora-compact-clean-cta/"
}
```

---

## Section 8 — Completion Criteria

### Per-template "Done" definition

A template is **done** when ALL of the following are true:

- [ ] D1 Aesthetic — no overlapping elements, correct family colours, correct fonts, no clipping artefacts
- [ ] D2 Selectable — all content objects are selectable; all decorative objects are not
- [ ] D3 Text Editable — all Textboxes are double-click-editable; changes persist
- [ ] D4 Ungroup — multi-object groups split correctly into individually editable children at correct positions
- [ ] D5 Image Replace — (if applicable) Replace Photo button works; image fills slot without overflow
- [ ] D6 Crop/Pan — (if applicable) user can pan the image within the slot — **currently OPEN for all image slots**
- [ ] D7 Persistence — all edits survive a page reload

### Phase 2.5 "Done" definition

Phase 2.5 is done when:
- All 7 new templates pass D1–D5 and D7 (D6 is tracked separately as a known gap)
- All 15 new components pass C1–C5 (the component drop checklist)
- Zero regressions on the 16 existing templates (D2 and D7 minimum)
- `npx tsc --noEmit` → 0 errors
- Renderer bundle builds clean and contains all 7 new template IDs

### The D6 gap — crop/pan mode

D6 is a **known Blocker** that is out of scope for Phase 2.5 but must be in scope for the next phase that touches image-slot components. It should be tracked in `Docs/phases/` as a dedicated Phase item, not silently accepted.

---

## Section 9 — Quick Reference: Template → Visual DNA

| Template ID | BG | Primary Font | Accent | Signature element |
|---|---|---|---|---|
| `aurora-hook` | Dark `#0F0C0A` | Inter | Aurora gradient | Gradient headline + glass eyebrow pill |
| `aurora-stat` | Dark | Inter | Aurora gradient | Coral big-number stat |
| `aurora-compact-hook` | Cream `#F5F0E8` | Inter Black 900 | Peach `#E8CBA3` | Peach outlined pill + Inter Black headline |
| `aurora-compact-fact` | Cream | Inter | Coral `#D46A5E` | 90pt grey baseline + 140pt coral featured stat |
| `aurora-compact-fact-compare` | Cream | Inter | Coral | Same as fact with side-by-side layout |
| `aurora-compact-step` | Cream | Inter | Peach | Numbered step with description |
| `aurora-compact-step-index` | Photo bg + dark overlay | Inter | Coloured dots | Vertical pipeline + step names |
| `aurora-compact-step-detail` | Photo bg | Inter | Coloured dots | VPC selector card + AZ subnet panel |
| `aurora-compact-stat-hero` | Photo bg + dark overlay | Inter | White | Full-bleed stat on photo |
| `aurora-compact-list-item` | White | Playfair Display | Black | 5px border frame, numbered serif list |
| `aurora-compact-quote` | Cream with terracotta card | Playfair | Terracotta | B&W portrait right + serif quote left |
| `aurora-carousel-cover-hero-phone` | Metallic peach | Inter Black | White | Tilted phone mockup with overlay cards |
| `aurora-carousel-cover-hero-images` | Metallic peach | Inter Black | White | Two tilted images |
| `aurora-compact-clean-cta` | Cream | Inter Black 900 | Peach | Centred pill + centred CTA headline |
| `aurora-compact-clean-quote` | Cream | Playfair Bold Italic | Peach | Decorative `"` + centred serif quote |
| `aurora-compact-clean-engage` | Cream | Inter Black 900 | Peach | SAVE+SHARE pill + action verb headline |
| `aurora-editorial-hook` | White | Playfair Bold Italic | Black | 5px border frame + `@handle` header bar |
| `aurora-editorial-cta` | White | Playfair Bold Italic | Black | Same editorial DNA, closing CTA copy |
| `aurora-nextwork-dark-cta` | Near-black `#0D0D0D` | Inter Black 900 | Warm white | White outlined pill + warm-white type |
| `aurora-nextwork-dark-engage` | Near-black | Inter Black 900 | Warm white | SAVE THIS pill + action verb |

---

## Appendix A — Decorative vs Content Object Classification

Use this to determine which objects should be `selectable: false` (decorative) vs `selectable: true` (content).

| Role (data.role) | Class | Reason |
|---|---|---|
| `compact_bg`, `editorial_bg`, `dark_bg` | Decorative | Background rectangle — never needs editing |
| `editorial_border` | Decorative | Frame stroke — visual only |
| `compact_category_pill` | **Content** | User may want to change label text |
| `compact_brand_pill` | **Content** | User may want to change wordmark |
| `compact_headline` | **Content** | Primary editable text |
| `compact_sub` | **Content** | Editable supporting text |
| `compact_deco_quote` | Decorative | The large `"` glyph is a design element, not content |
| `compact_quote_body` | **Content** | The actual quote text |
| `compact_attribution` | **Content** | Author attribution |
| `editorial_header` | **Content** | Handle and series title are editable |
| `editorial_headline` | **Content** | Primary headline |
| `editorial_body` | **Content** | Supporting body text |
| `editorial_chapter` | **Content** | Chapter/issue label |
| `dark_cta_pill` | **Content** | Editable pill label |
| `dark_headline` | **Content** | Primary headline |
| `dark_sub` | **Content** | Supporting copy |
| `dark_brand_pill` | **Content** | Wordmark |
| `phone_mockup` | **Content** | The whole group is selectable (Replace Photo) |
| `image_pair` | **Content** | The whole group is selectable (Replace Photo) |
| `polaroid_frame` | **Content** | The whole group is selectable (Replace Photo) |
| Gradient overlays (no role set) | Decorative | Background atmosphere effects |

---

*Protocol written 2026-09-06 — replaces GAN-score as the validation gate for all editor templates and components.*  
*This document should be updated whenever a new template family or component type is added.*  
*Next session: run the Playwright audit (`scripts/editor_ui_audit.cjs`) against this protocol.*
