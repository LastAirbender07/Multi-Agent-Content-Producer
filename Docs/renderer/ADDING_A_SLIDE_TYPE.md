# Adding a New Slide Type

> **For:** Developers adding new slide layouts to the content pipeline  
> **Companion reading:** `RENDERER_CODEBASE_GUIDE.md` — understand the code before modifying it

---

## The 6 Touch Points

```
1. Backend contracts     ← tell the data model the type exists
2. Fabric.js builder     ← define how it looks on canvas
3. REGISTRY              ← wire it into the renderer (editor + Playwright)
4. carousel_generator    ← tell the pipeline how to assign canvas_template
5. LLM prompt            ← tell the AI how to write content for it
6. (optional) reorder    ← control where it sits in the carousel sequence
```

Each step is independent — the renderer does not care about the LLM, the LLM does not care about Fabric.js. They communicate through the `Slide` JSON schema.

---

## Worked Example: the `checklist` type

A slide that presents 3–5 items with coloured checkmarks.

---

### Step 1 — Backend: register the type

**File:** `backend/core/orchestration/contracts.py`

```python
class SlideType(str, Enum):
    hook      = "hook"
    content   = "content"
    stat      = "stat"
    quote     = "quote"
    cta       = "cta"
    engage    = "engage"
    checklist = "checklist"   # ← add this
```

The `Slide` model's `bullets: list[str]` field is already available — the LLM populates it with checklist items. No schema change needed.

---

### Step 2 — Fabric.js: write the builder

**File:** `frontend/utils/canvasTemplates/aurora_checklist.ts` ← create new

```typescript
import * as fabric from "fabric";
import {
  createBrandBar, createAccentLine,
  makeText, makeTitleText, createGlowBg,
} from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

export async function buildAuroraChecklist(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // Background
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: t.bg,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));
  objects.push(...createGlowBg([
    { rx: 500, ry: 500, left: CS * 0.5, top: -CS * 0.2, color: t.secondary, opacity: 0.12 },
  ]));

  // Title — two-pass: create, measure, position
  const PAD = 72;
  let curY = 80;
  objects.push(createAccentLine(t, 52, PAD, curY));
  curY += 20;

  const titleObj = makeTitleText(slide.title || "", {
    t, role: "checklist_title", fontSize: 52, lineHeight: 1.15,
    width: CS - PAD * 2, left: PAD, top: 0,
  });
  titleObj.set({ top: curY });
  objects.push(titleObj);
  curY += titleObj.calcTextHeight() + 32;

  // Checklist items
  const ITEM_W   = CS - PAD * 2 - 52;
  const itemObjs = (slide.bullets ?? []).map(text =>
    makeText(text, {
      role: "checklist_item", fontSize: 26, fill: t.muted,
      lineHeight: 1.5, width: ITEM_W, left: 0, top: 0,
      originX: "left" as const, originY: "top" as const,
    })
  );

  itemObjs.forEach(textObj => {
    const rowH = textObj.calcTextHeight();
    const circle = new fabric.Circle({
      radius: 14, left: PAD, top: curY + rowH / 2,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 28, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      originX: "left" as const, originY: "center" as const,
    });
    const check = new fabric.Text("✓", {
      left: PAD + 14, top: curY + rowH / 2,
      fontSize: 14, fontWeight: "700", fill: "#fff", fontFamily: t.fontBody,
      originX: "center" as const, originY: "center" as const,
    });
    textObj.set({ left: PAD + 44, top: curY });
    objects.push(circle, check, textObj);
    curY += rowH + 20;
  });

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
```

**Shared components to use** (see `RENDERER_CODEBASE_GUIDE.md` for the full list):

| Component | What it does |
|-----------|-------------|
| `createAccentLine(t, width, left, top)` | Gradient accent bar — same styling as content/stat |
| `makeTitleText(text, opts)` | Title Textbox with theme font + `calcTextHeight()` |
| `makeText(text, opts)` | Body Textbox with muted colour + `calcTextHeight()` |
| `createGlowBg([...])` | Radial gradient atmosphere |
| `createLuminaBg(t)` | Diagonal gradient + corner glows (for Lumina light slides) |
| `createBrandBar(t, logo, name, num, total)` | Bottom bar — always the last push |

---

### Step 3 — REGISTRY: wire it in

**File:** `frontend/utils/canvasTemplates/index.ts`

```typescript
import { buildAuroraChecklist } from "./aurora_checklist";

// In REGISTRY:
"aurora-checklist": buildAuroraChecklist,
"lumina-checklist": lw(buildAuroraChecklist),  // free — same builder, LUMINA tokens
```

Rebuild the bundle:

```bash
node backend/renderer/build.mjs
```

**The template now automatically appears in the editor's "Slides" tab.** `SLIDE_TYPES` in `frontend/constants/slideTemplates.ts` is derived from REGISTRY keys — any new `aurora-*` entry is picked up immediately with neutral defaults.

To control the tile's label, colour, and emoji, add one entry to `TEMPLATE_METADATA` in `slideTemplates.ts`:

```typescript
"aurora-checklist": {
  type: "checklist", label: "Checklist", desc: "Step-by-step list",
  color: "#10B981", emoji: "✅",
  starter: { title: "Before you do X, check these", body: "A checklist for your reader." },
},
```

Optional — but strongly recommended so the tile looks intentional. You can test the visual layout immediately by clicking it in the editor.

---

### Step 4 — Pipeline: canvas_template assignment

**File:** `backend/core/orchestrators/content/carousel_generator.py`

For types without layout variants, the rule `f"{theme}-{slide_type}"` produces the right template ID automatically. `checklist` → `aurora-checklist`. No code change needed.

If the type should never fetch an image:

```python
# backend/configs/settings.py
content_no_image_slide_types: list[str] = ["stat", "cta", "engage", "checklist"]
```

---

### Step 5 — LLM prompt: generation rules

**File:** `backend/core/prompts/system_prompts.py`

```python
CONTENT = """...existing rules...

Checklist slides (type: 'checklist'): 3-5 concrete, actionable items. Each item max
10 words. Title frames the list as a task or decision. Populate 'bullets' with items."""
```

---

### Step 6 — (Optional) Reorder: sequencing

**File:** `backend/core/orchestrators/content/reorder.py`

Unrecognised types default to the middle content zone. For custom placement:

```python
checklists = [s for s in slides if s.type == SlideType.checklist]
# slot into sequence at desired position
```

---

### Summary table

| Component | Change |
|-----------|--------|
| `contracts.py` | Add to `SlideType` enum |
| `aurora_checklist.ts` | New builder file |
| `index.ts` REGISTRY | Two entries (aurora + lumina) |
| `slideTemplates.ts` | Optional metadata entry for label/emoji/colour |
| `settings.py` | Add to `content_no_image_slide_types` if needed |
| `system_prompts.py` | Add generation rules |
| `reorder.py` | Only if custom sequencing needed |
| Playwright, Editor, API | No changes |
| `build.mjs` | No config change — just rerun |

---

---

## Adding a New Template FAMILY (not a new slide type)

> **Added 2026-09-08 after three sessions of broken output from the aurora-lite family.**
>
> A template **family** (aurora-extended, aurora-lite, compact-clean) is NOT a new slide type. It is a new visual aesthetic applied to the existing slide types (hook, content, stat, quote, cta, engage). Getting this wrong leads to carousels where every content slide looks identical — because the new family only built one content template instead of five layout variants.

### What You Are Actually Doing

You are creating a new token set (colours, fonts, backgrounds) and wiring it to the existing layout engine. You are NOT writing new layout code.

```
aurora-extended    =  AURORA tokens  +  contentLayouts/ engine
aurora-lite        =  AURORA tokens  +  contentLayouts/ engine  +  ≤15w body rule in validator
lumina             =  LUMINA tokens  +  contentLayouts/ engine  (via lw() wrapper)
compact-clean      =  COMPACT tokens +  photo-bg layout  +  compact_meta schema
```

### The 5 Things That Differ Per Family (And Only These)

1. **Token set** (`canvasTokens.ts`) — bg, primary, secondary, text, muted, fonts
2. **Content density rules** (`slide_validator.py`) — max body words, bullets allowed?
3. **Routing table** (`carousel_generator.py`) — which template ID for which slide type
4. **REGISTRY entries** (`index.ts`) — 6 entries: hook, content-0/-1/-2/-3/-text, stat, quote, cta, engage
5. **Format blocks** (`format_blocks.py`) — LLM instructions per format (if family has tighter density)

### The Content Template Is Always 5 Entries, Not 1

```typescript
// ✅ CORRECT — layout variants provided
"aurora-lite-content-0":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 0),  // imgRight
"aurora-lite-content-1":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 1),  // textTop
"aurora-lite-content-2":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 2),  // imgTop
"aurora-lite-content-3":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 3),  // imgLeft
"aurora-lite-content-text": (s,i,t,m) => buildAuroraContent(s,i,t,m,-1),  // textOnly

// ❌ WRONG — one entry, every content slide looks identical
"aurora-lite-content": buildAuroraLiteContent,   // ← DO NOT DO THIS
```

The carousel routing in `_canvas_template_id` cycles through variants based on image aspect ratio. With only one content entry, all content slides get the same layout.

### The Compact-Clean Family Exception

Compact-clean uses its own layout engine (photo-bg + gradient overlay + bottom-anchored text), NOT the `contentLayouts/` engine. It has a different data schema (`compact_meta`) and its own template files. If you need a compact-style family:

1. **Content slides** → `aurora-compact-content` (photo bg, title+body anchored to bottom half)
2. **Stat slides** → `aurora-compact-stat-hero` (photo bg, large number callout) or `aurora-compact-fact` (cream bg, stat number)
3. **Never** route a `content` type slide to a stat template (aurora-compact-fact). The stat template renders a 140pt number as the hero. Without a stat value, the top 50% is blank.

### The compact_meta Schema Contract

Compact templates read from `slide.compact_meta` — NOT from `slide.title`, `slide.body`, `slide.bullets`. Each template defines its own TypeScript interface (e.g. `CompactFactMeta`, `CompactContentMeta`).

**When the pipeline generates slides (LLM produces title/body/bullets), compact_meta is absent by default.** You must handle this in one of two ways:

**Option A — Frontend fallback in the builder (preferred for new templates):**
```typescript
// Same pattern as aurora-compact-hook line 44:
if (slide.title && !slide.compact_meta?.heading) m.heading = slide.title;
if (slide.body  && !slide.compact_meta?.body_copy) m.body_copy = slide.body;
```

**Option B — Backend adapter in carousel_generator.py:**
```python
if canvas_template == "aurora-compact-content":
    slide_dict = {**slide_dict, "compact_meta": {
        "heading":   slide_dict.get("title", ""),
        "body_copy": slide_dict.get("body",  ""),
    }}
```

**If you omit both:** the template uses its DEFAULTS (hardcoded placeholder data like "@nextwork", "+47%", "Anthropic Research Report"). These will render in every pipeline-generated slide and are indistinguishable from correct content without visual inspection.

### Checklist for Adding a New Family

| Step | What | Command to verify |
|------|------|------------------|
| 1 | Add token set to `canvasTokens.ts` | Read the file, check token names match existing pattern |
| 2 | Add 5+ REGISTRY entries for content (with layout variants) | `grep "new-family-content" frontend/utils/canvasTemplates/index.ts` |
| 3 | Add 5 other REGISTRY entries (hook, stat, quote, cta, engage) | Same grep |
| 4 | Add routing table in `carousel_generator.py` | Confirm content→content template, stat→stat template |
| 5 | Add compact_meta fallback if compact-style | Read TypeScript interface, verify field names match |
| 6 | Rebuild bundle | `node backend/renderer/build.mjs` |
| 7 | **Visual inspection** — open slide_02.png in Preview | `open outputs/runs/{id}/content/angle_0/png/slide_02.png` |
| 8 | Confirm visual variety across carousel | `open slide_02.png slide_05.png slide_08.png` — should look different |
| 9 | Confirm no placeholder defaults visible | Content matches topic, not "@nextwork" or "+47%" |

---

## Future: No-Code Template Studio

> The plan to create slide types visually — without writing TypeScript — is documented separately.  
> See `Docs/pending-works/TEMPLATE_STUDIO_PLAN.md`.
