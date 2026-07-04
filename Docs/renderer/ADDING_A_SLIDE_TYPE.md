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

## Future: No-Code Template Studio

> The plan to create slide types visually — without writing TypeScript — is documented separately.  
> See `Docs/pending-works/TEMPLATE_STUDIO_PLAN.md`.
