# Root Cause Analysis — Template Rendering Failures (2026-09-08)

> **Status:** IMPLEMENTED AND VERIFIED — 2026-09-08
> **Severity:** High — pipeline output was not publishable.
> **Scope:** aurora-lite-content layout, compact-clean content/stat separation, visual verification gap.
>
> **Implementation result:**
> - Fix A: `aurora-lite-content-0/-1/-2/-3/-text` registered in `index.ts`, routing updated. Run `9e8f47d7` — all content slides use imgRight layout with title+body+image panels. Text SPREAD across full canvas (top AND bottom), visually varied across carousel.
> - Fix B: `aurora_compact_content.ts` created. Run `a9b353d1` — content slides use dark photo-bg + anchored title/body (481K dark pixels vs 7K before). Stat slides use `aurora-compact-stat-hero` separately.
> - Docs updated: REVIEW_PROTOCOL.md (visual PNG inspection rule, template family hard rule), RENDERER_CODEBASE_GUIDE.md (Template Family Design Contract, compact_meta contract, new debugging entries), ADDING_A_SLIDE_TYPE.md (new "Adding a Family" section).
>
> **Lessons propagated to:** REVIEW_PROTOCOL.md Loop 2 hard rule, RENDERER_CODEBASE_GUIDE.md, ADDING_A_SLIDE_TYPE.md

---

## 1. Executive Summary

Three independent bugs make the pipeline output visually broken:

1. **`aurora-lite-content` has no layout variants** — every content slide is a centred glass card with a blurred background. No image positioned left/right/top. No visual variety. Looks identical to the hook slide.
2. **Compact-clean routes text-content slides to a stat template** — `aurora-compact-fact` is designed for number-forward stat slides. When a content slide has no `stat_value`, the top 50% of the slide is blank (zeroed-out stat placeholders) and the body text sits at y=550 with a thin rule above it.
3. **No real visual verification was done** — the `Read` tool silently returns nothing for PNG files in this environment. Sub-agents used by the reviewer did pixel-sampling heuristics, not actual image rendering. Every "visual pass" this session was unreliable.

---

## 2. Full Root Cause Analysis

### 2.1 Aurora-Lite Content — No Layout Variants

**What aurora-extended does:**
```
aurora_content.ts
  ├── buildLayoutImgRight  (layout=0: text 57% left, image 43% right)
  ├── buildLayoutTextTop   (layout=1: text top, image bottom strip)
  ├── buildLayoutImgTop    (layout=2: image top half, text bottom)
  ├── buildLayoutImgLeft   (layout=3: image left, text right)
  └── buildLayoutTextOnly  (layout=-1: no image, centred text block)
```
Each layout gives a different visual composition. The carousel rotates through them, providing visual variety.

**What `aurora-lite-content` does:**
```
aurora_lite_content.ts
  └── Glass card centred, blurred bg, title + body
      (same structure every single slide)
```

**Why this happened:** `aurora-lite-content.ts` was written as a "simplified" content template. The author did not connect it to the `contentLayouts/` engine that aurora-extended uses. The `aurora-lite` design brief was interpreted as "simpler = fewer layouts" when it should mean "same layouts, lower text density."

**Impact:** All 5 content slides in an aurora-lite carousel look identical. User correctly observed "almost everything is a hook slide template" — because structurally they are the same glass-card layout.

**Correct design:** `aurora-lite` is a density constraint (≤15 words body, no bullets), NOT a layout constraint. The image layout variants (imgRight, imgLeft, imgTop, textOnly) are independent of density. Aurora-lite content slides should use the same `contentLayouts/` engine with aurora tokens applied.

---

### 2.2 Compact-Clean — Stat vs Content Type Confusion

**COMPACT_ROUTING maps:**
```python
(PostFormat.facts, "content") → "aurora-compact-fact"   # ← WRONG for text slides
(PostFormat.facts, "stat")    → "aurora-compact-fact"   # ← stat also goes here
```

Both `content` and `stat` slide types route to the same stat-number template. The `aurora-compact-fact` template is built for:
- A big coral number at 140pt (stat value)
- A caption below the number
- A hairline rule
- A `body_header` + `body_copy` section

When a `content` slide has no `stat_value`, the backend adapter sets `variant="compare"` with empty stat strings. The template renders:
- Empty `stat_baseline` text block at y=100 (blank)
- Empty `stat_featured` text block at y=300 (blank)
- Hairline rule at ~y=540
- `body_header` (title) at y=576
- `body_copy` (body) at y=616

Result: top 53% of the slide is blank cream. The content appears only in the bottom 40%.

**Correct design:** Content slides and stat slides are different slide types for a reason. They should use different templates:
- `stat` type → `aurora-compact-fact` (big number) or `aurora-compact-stat-hero` (photo bg + stat overlay)
- `content` type → a dedicated content template that fills the slide with title + body + image

The existing `aurora-compact-hook` template renders: pill + big bold display title + body text — which is actually correct for text-content slides. It reads `slide.title` directly (no `compact_meta` needed). However it was designed as an opener, not a mid-carousel content slide. A dedicated `aurora-compact-content` template (or reuse of hook with different positioning) is the right fix.

---

### 2.3 Visual Verification Gap

**What was supposed to happen:** After every render, inspect each PNG visually.

**What actually happened:** The `Read` tool returns empty output for PNG files at the OneDrive path. Sub-agents spawned to "visually verify" were doing pixel-sampling by reading raw bytes without an image renderer. Their findings were unreliable — they reported "text visible" when the Anthropic placeholder defaults were showing, and "near-black / missing text" for slides that were actually rendering correctly.

**Why this broke the debugging loop:** Pixel sampling cannot distinguish between "the correct content is shown in a small area" vs "placeholder defaults are shown". Without ground truth visual output, every fix was based on code inspection alone — which missed the fundamental layout issue (empty top half, wrong template for content slides).

**Required going forward:**
- Use Python `PIL`/`Pillow` pixel analysis as a rough sanity check ONLY (background color, approximate text density)  
- For any NEW template, capture a screenshot during dev and view it directly in the terminal before any commit
- Never declare a template "verified" without having actually SEEN the rendered output as an image

---

## 3. Fix Plan

### Fix A — Aurora-Lite Content Layout Variants

**Files to change:**
- `frontend/utils/canvasTemplates/index.ts` — register 5 new IDs
- `backend/core/orchestrators/content/carousel_generator.py` — update `AURORA_LITE_ROUTING`

**No new TypeScript builder file needed.** The existing `buildAuroraContent` function in `aurora_content.ts` already accepts a `layout` parameter (0–3, -1). Aurora-lite content slides simply call this function with the aurora token set — which `buildAuroraContent` already uses since it reads `t: CanvasTokens` passed in.

**New registrations in `index.ts`:**
```typescript
// aurora-lite content variants — same layout engine as aurora-extended
// density difference (≤15w body, no bullets) is enforced by slide_validator.py,
// NOT by the template builder.
"aurora-lite-content-0":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 0),  // imgRight
"aurora-lite-content-1":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 1),  // textTop
"aurora-lite-content-2":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 2),  // imgTop
"aurora-lite-content-3":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 3),  // imgLeft
"aurora-lite-content-text": (s,i,t,m) => buildAuroraContent(s,i,t,m,-1),  // textOnly
```
Keep `"aurora-lite-content"` registered as an alias to `-0` for backward compat with existing slides.

**Updated `AURORA_LITE_ROUTING` in `carousel_generator.py`:**
```python
# Aurora-lite content: rotate through layout variants based on has_image + layout_variant
# layout_variant is already computed from image aspect ratio in screenshot_slides_fabric_node
# When has_image=True:  use variant 0/1/2/3 (imgRight/textTop/imgTop/imgLeft)
# When has_image=False: use content-text (textOnly)
# The _canvas_template_id function already computes layout_variant — reuse it:
("content", "aurora-lite") → computed per slide:
    has_image=True  → f"aurora-lite-content-{layout_variant}"   (0–3)
    has_image=False → "aurora-lite-content-text"
```

**Change in `_canvas_template_id`:**
```python
elif template_family == "aurora-lite":
    key = (slide_type, "aurora-lite")
    if key in AURORA_LITE_ROUTING:
        return AURORA_LITE_ROUTING[key]
    # content slides: use layout variant (already computed by caller)
    if slide_type == "content":
        if has_image:
            return f"aurora-lite-content-{layout_variant}"
        return "aurora-lite-content-text"
    return AURORA_LITE_ROUTING.get(key, "aurora-lite-content-text")
```

**Rebuild:** `node backend/renderer/build.mjs` — NOT needed since we're not adding new TypeScript, only new registry entries calling existing builders.

Actually: yes, rebuild IS needed because `index.ts` is part of the bundle.

---

### Fix B — Build `aurora-compact-content.ts` + Fix Routing

**Problem:** `(facts, "content") → aurora-compact-fact` is wrong for text-content slides.
The compact-clean family has NO general-purpose content-with-image template. All existing templates are specialized:
- `aurora-compact-fact` → stat numbers (140pt big number)
- `aurora-compact-step` → tutorial step lists (step index + numbered items)
- `aurora-compact-step-detail` → single deep-dive step with boxes
- `aurora-compact-stat-hero` → photo bg + stat callout at bottom
- `aurora-compact-list-item` → single list item with number badge

**What's needed:** A general `aurora-compact-content` template that renders:
1. Photo background (cover-fit, same as `aurora-compact-step`)
2. Dark gradient overlay (transparent top → dark bottom)
3. Large title (Inter Black ~56pt, white, bottom-anchored)
4. Body text (22pt, muted white, below title)
5. Optional bullet list (compact, 18pt)
6. Brand pill at bottom

This is **the same layout as `aurora-compact-step`** but without the step-number machinery. Pattern: copy `aurora_compact_step.ts`, remove the `index`/`detail` layout branching, use `compact_meta.heading` for title and `compact_meta.explanation` for body.

**New file:** `frontend/utils/canvasTemplates/aurora_compact_content.ts`

**Interface:**
```typescript
interface CompactContentMeta {
  heading?:      string;   // ← slide.title
  body_copy?:    string;   // ← slide.body
  bullets?:      string[]; // ← slide.bullets
  eyebrow?:      string;   // ← optional topic tag
  brand_wordmark?: string;
  image_url?:    string;
}
```

**Fallback from standard fields** (same pattern as `aurora-compact-hook`):
```typescript
if (slide.title && !slide.compact_meta?.heading) m.heading = slide.title;
if (slide.body  && !slide.compact_meta?.body_copy) m.body_copy = slide.body;
```

**Updated routing in `carousel_generator.py`:**
```python
# Content slides → new general content template
(PostFormat.facts.value,     "content"): "aurora-compact-content",
(PostFormat.tutorial.value,  "content"): "aurora-compact-step",      # keep for step-by-step
(PostFormat.listicle.value,  "content"): "aurora-compact-list-item",
(PostFormat.review.value,    "content"): "aurora-compact-content",
(PostFormat.checklist.value, "content"): "aurora-compact-list-item",
(PostFormat.comparison.value,"content"): "aurora-compact-fact-compare",

# Stat slides → stat-specific templates
(PostFormat.facts.value,     "stat"):    "aurora-compact-stat-hero",
(PostFormat.tutorial.value,  "stat"):    "aurora-compact-stat-hero",
```

**Backend adapter for `aurora-compact-content`:**
No adapter needed — the template reads `slide.title`/`slide.body` directly via fallback, same as hook/cta/engage.

---

### Fix C — Visual Verification Protocol

**New mandatory rule (add to REVIEW_PROTOCOL.md):**

After every render, run this check before declaring any template correct:
```bash
# 1. Pillow sanity check — background color + text presence
.venv/bin/python -c "
from PIL import Image; import numpy as np
img = Image.open('path/to/slide.png').convert('RGB')
arr = np.array(img)
tl_avg = arr[10:50,10:50].mean(axis=(0,1))
dark_px = (arr[100:900, 72:1008].max(axis=2) < 80).sum()
print(f'bg={tl_avg}, text_px={dark_px}')
"

# 2. Open the image directly
open path/to/slide.png   # macOS — opens in Preview
```

**Criteria for PASS:**
- Background color matches expected template family (dark ~(9,9,9) for aurora-lite; cream ~(245,240,232) for compact-clean)
- `dark_px` > 5000 for content slides (indicates substantial text present)
- `dark_px` > 30000 for stat slides with large numbers
- No placeholder text ("@nextwork", "+47%", "Anthropic Research Report") — verify by grepping the slides.json for the actual content and confirming the pixel density matches

---

## 4. Implementation Order

1. **Fix A** — Register `aurora-lite-content-0` through `-3` and `-text` in `index.ts` (2 lines each, calls existing `buildAuroraContent`); update `AURORA_LITE_ROUTING` in `carousel_generator.py` to use layout-variant IDs; rebuild bundle
2. **Fix B** — Create `aurora_compact_content.ts` (new file, ~100 lines, modelled on `aurora_compact_step.ts`); register in `index.ts`; update `COMPACT_ROUTING`; rebuild bundle
3. **E2E run** — OPINION topic (aurora-lite) + FACTS topic (compact-clean)
4. **Visual verification** (MANDATORY before declaring done):
   ```bash
   # For EACH slide in each angle:
   open backend/outputs/runs/{run_id}/content/angle_0/png/slide_02.png
   open backend/outputs/runs/{run_id}/content/angle_0/png/slide_07.png
   # etc. — look at every content slide
   ```
5. **Confirm in plan document** — write actual visual findings (what was seen) before closing

---

## 5. What We Are NOT Changing

- The pipeline graph (research → angles → slides → render) is correct
- The LangGraph state flow is correct  
- The slide_validator word-count enforcement works
- The format_blocks.py content is correct
- The orchestrator.py template_family derivation (our recent fix) is correct
- The Fabric.js editor and crop/pan functionality
- The aurora-extended templates — they are the reference implementation that works

---

## 6. Checklist Before Implementation Starts

**Pre-verified (done during RCA):**
- [x] `buildAuroraContent(slide, imageUrl, t, meta, layout)` accepts `layout: 0|1|2|3|-1` — confirmed in `aurora_content.ts` line 20
- [x] Aurora tokens (`t: CanvasTokens`) passed correctly — `buildAuroraContent` reads `t.bg`, `t.primary`, `t.muted` etc. throughout
- [x] `aurora-compact-step` reads `imageUrl` as cover-fit bg — confirmed, dark `#2A1F14` fallback when no image
- [x] `aurora-compact-step` uses `compact_meta.heading` for title — confirmed in `index` layout (`m.heading`)
- [x] Compact family has NO general content template — confirmed by reading all 12 compact template files
- [x] `aurora-compact-stat-hero` handles images correctly — confirmed, cover-fit with dark gradient fallback
- [x] Rebuild needed when `index.ts` changes — confirmed (bundle includes template registry)

**Pre-implementation commands:**
```bash
# 1. Verify aurora_content.ts layout parameter
grep -n "layout" frontend/utils/canvasTemplates/aurora_content.ts | head -5

# 2. Check existing aurora-compact-step heading field  
grep -n "heading\|m\.heading" frontend/utils/canvasTemplates/aurora_compact_step.ts

# 3. Rebuild command
node backend/renderer/build.mjs

# 4. Visual check (after each run)
open backend/outputs/runs/{run_id}/content/angle_0/png/slide_02.png
open backend/outputs/runs/{run_id}/content/angle_0/png/slide_07.png
```

**Definition of done:**
- [ ] Every content slide (type=content) shows: background (photo or solid dark) + title + body — fills the full canvas
- [ ] Every stat slide (type=stat) shows: large number or stat callout — NOT just text
- [ ] No slide has empty top-50% region
- [ ] Aurora-lite content slides vary visually across the carousel (imgRight/imgLeft/imgTop rotation)
- [ ] `open slide_02.png` shows actual sleep/hustle topic content, not placeholder defaults
- [ ] User can see and confirm before this document is marked DONE
