# Cover-Hero POC — Learnings, Architecture & Phase 2 Path

> **Status:** COMPLETE (2026-08-28)
> Templates: `aurora-carousel-cover-hero-phone` + `aurora-carousel-cover-hero-images`
> Both registered in REGISTRY, rendering clean, all content inside frame.

---

## 1. What Was Built

### Two production-ready 1080×1080 Instagram cover-hero templates

| Template key | Concept | Visual layout |
|---|---|---|
| `aurora-carousel-cover-hero-phone` | "Fake Post" — viral phone-in-reel hook | Large headline top · phone mockup left · body text right · italic CTA bottom-right |
| `aurora-carousel-cover-hero-images` | "Google Where Am I?" — travel/identity hook | Large headline top · body text center · tilted image pair bottom-right · italic CTA bottom-left |

### Shared component library — `shared/cover/`

Every piece that appears in a template is a named function returning a Fabric object. **No inline Fabric code in templates.**

| Component | File | Returns | Purpose |
|---|---|---|---|
| `makeMetallicGradient` | `makeMetallicGradient.ts` | `fabric.Rect` | Warm peach-to-cream outer gradient, full-bleed |
| `makeWhiteCardWithStraddlingTitle` | `makeWhiteCardWithStraddlingTitle.ts` | `fabric.Group` | White rounded card + category-pill chip straddling the top edge |
| `makeDisplayHeadline` | `makeDisplayHeadline.ts` | `fabric.Textbox` | Inter Black display type, configurable size/align |
| `makeBodyText` | `makeBodyText.ts` | `fabric.Textbox` | Inter Regular body copy, configurable size/align/width |
| `makeTiltedPhoneMockup` | `makeTiltedPhoneMockup.ts` | `fabric.Group` | Full-bleed screen phone shape, group-level clip, warm-gray outline, shadow |
| `makeTiltedImagePair` | `makeTiltedImagePair.ts` | `fabric.Group` | Two overlapping image cards, configurable tilts and corner radii |
| `makeItalicCtaLine` | `makeItalicCtaLine.ts` | `fabric.Textbox` | Playfair Display Bold Italic CTA, e.g. `*Comment "TEMPLATE" for the Canva Link` |

### Template architecture — pure orchestrators

Each template builder is **only** a layout orchestrator:
```typescript
export async function buildAuroraCarouselCoverHeroPhone(slide, imageUrl, _tokens, _meta) {
  return [
    makeMetallicGradient(W, H),                    // 1. bg
    makeWhiteCardWithStraddlingTitle({ ... }),      // 2. card + chip
    makeDisplayHeadline({ ... }),                  // 3. headline
    await makeTiltedPhoneMockup({ ... }),           // 4. phone (async — loads image)
    makeBodyText({ ... }),                         // 5. body copy
    makeItalicCtaLine({ ... }),                    // 6. CTA
  ];
}
```

No `new fabric.Rect(...)`, no inline geometry math, no Fabric primitives in the template file itself.  
**If it isn't in a shared component file, it doesn't belong in a template.**

---

## 2. GAN Evaluation — How It Works

### The pipeline

```
fixture JSON → Playwright → Fabric renderer → PNG → pixelmatch → content-zone diff %
```

1. `scripts/gan_fixtures/<template>/<name>.json` — mock slide data with real content
2. `node scripts/gan_reference.js --template <key> --max-iter 1` — renders and saves:
   - `backend/outputs/gan-runs/<template>/iter0/gen_<name>.png` — the generated render
   - `backend/outputs/gan-runs/<template>/iter0/ref_<name>_1080.png` — the reference letterboxed to 1080×1080
   - `backend/outputs/gan-runs/<template>/iter0/diff_<name>.png` — pixel diff map
   - `backend/outputs/gan-runs/<template>/iter0/composite_<name>.png` — side-by-side ref | gen | diff (requires ImageMagick)
3. Content-zone diff = bottom 55% of canvas only (avoids letterbox bars)

### What the diff % means

| Range | Signal | Action |
|---|---|---|
| 0–5% | Layout matches reference closely | Ship |
| 5–15% | Reasonable layout variation | Inspect composite, decide |
| 15–30% | Noticeable layout/proportion mismatch | Fix specific issue |
| > 30% | Structural mismatch or broken render | Debug renderer |

> **The diff % is a structural signal, not a quality gate for these cover-hero templates.** The reference PNGs (`others/image copy 3.png`, `others/image copy 4.png`) are the original Canva/Instagram designs, not our Fabric renders. A 57% diff is normal when comparing different rendering stacks — what matters is **visual inspection** of `gen_*.png`.

### What to actually look at

1. **Open `gen_<name>.png`** — does it look like a polished Instagram post?
2. **Bounds check** — nothing outside the white card frame
3. **Typography** — headline center-aligned, body legible at 1080px
4. **Image placement** — phone/image pair fully inside frame, no clipping
5. **CTA** — readable, center-aligned, not overlapping body text
6. **Shadow + depth** — phone/images have appropriate drop shadow

### Running a render

```bash
# After any TypeScript change:
node backend/renderer/build.mjs

# Render and inspect:
node scripts/gan_reference.js --template aurora-carousel-cover-hero-phone --max-iter 1
node scripts/gan_reference.js --template aurora-carousel-cover-hero-images --max-iter 1

# Output PNGs:
open backend/outputs/gan-runs/aurora-carousel-cover-hero-phone/iter0/gen_fake-post.png
open backend/outputs/gan-runs/aurora-carousel-cover-hero-images/iter0/gen_google-where-am-i.png
```

---

## 3. Key Technical Learnings

### Fabric.js clipPath inside a Group — use group-level clip, not per-object

**Problem:** Applying a `clipPath` directly to an image inside a `fabric.Group` is unreliable. The clip's coordinate system shifts when the image's natural dimensions cause it to overflow the group's computed bounding box. Result: visible gaps between the image and the clip shape.

**Solution:** Apply the `clipPath` to the **Group**, not the image. In the group's local coordinate system `(0,0)` = group center:
```typescript
const group = new fabric.Group(objects, { ... });
group.clipPath = new fabric.Rect({
  left: -phoneW / 2, top: -phoneH / 2,
  width: phoneW, height: phoneH,
  rx: cornerRadius, ry: cornerRadius,
  originX: "left", originY: "top",
});
```
This clips ALL group children to the phone shape, rotates with the group, and is coordinate-system safe.

### Rotation geometry — calculate corner positions before placing elements

With tilt angle θ, a rectangle of width W, height H centered at (cx, cy) has its corners at:
```
top-left canvas x = cx + (-W/2)*cos(θ) - (-H/2)*sin(θ)
```
Always verify the rotated corners stay within the card bounds (54 ≤ x ≤ 1026, 54 ≤ y ≤ 1026) **before** choosing PHONE_X/Y and tilt. Small tilts (3–7°) can push corners 20–40px outside the expected bounds.

Rule of thumb for a 321×617 phone at tilt -3°: need PHONE_X ≥ CARD_X + 42 to keep rotated top-left inside the card.

### Fabric.js image cover-fit

```typescript
const scale = Math.max(containerW / img.width, containerH / img.height);
img.set({
  left: (containerW - img.width  * scale) / 2,
  top:  (containerH - img.height * scale) / 2,
  scaleX: scale, scaleY: scale,
});
```
This is CSS `object-fit: cover`. Combine with the group clipPath above for full-bleed fills.

### Frame-over-image layering

Put the phone outline **stroke rect after the image** in the `objects` array so the stroke always renders on top, giving a clean border regardless of image content near the edges.

### Shadow on Group vs on child objects

Shadow applied to a `fabric.Group` renders around the group's bounding box after the group clipPath is applied. Shadow on a child rect renders before clipping. For a phone with a drop shadow, put the shadow on the Group (not on the frame rect inside it) to ensure the shadow extends outside the clipped shape.

---

## 4. Fixture + Real-Data Test

Both templates are registered and can render immediately with the existing fixture data:

```bash
# Phone template — uses /assets/dev/phone-screen.jpg as the phone screen
cat scripts/gan_fixtures/aurora-carousel-cover-hero-phone/fake-post.json

# Images template — uses /assets/dev/tablet-scene-1.jpg + tablet-scene-2.jpg
cat scripts/gan_fixtures/aurora-carousel-cover-hero-images/google-where-am-i.json
```

**To render with a real production run's data**, map the run's slide JSON to the `cover_hero` sub-object shape:
```json
{
  "canvas_template": "aurora-carousel-cover-hero-phone",
  "type": "hook",
  "_theme": "aurora",
  "cover_hero": {
    "category_pill": "YOUR PILL TEXT",
    "headline": "YOUR HEADLINE",
    "body_text": "Your body copy paragraph here.\n\nSecond paragraph if needed.",
    "cta_line": "*Comment \"KEYWORD\" for the link",
    "screen_image_url": "/assets/dev/phone-screen.jpg"
  }
}
```

Save as a new fixture at `scripts/gan_fixtures/aurora-carousel-cover-hero-phone/<name>.json` and run the GAN script.

---

## 5. Path Forward — Phase 2 Compact Templates

The compact template family (`shared/compact/`) follows the same pattern but with different visual language (cream `#F5F0E8` background, dot-progress indicator, brand pill, larger typography hierarchy).

### Reuse from cover-hero directly

| Cover-hero component | Compact equivalent | Notes |
|---|---|---|
| `makeDisplayHeadline` | Reuse as-is with `fontSize: 140` | Same Inter Black font |
| `makeBodyText` | Reuse as-is | Same Inter Regular |
| `makeItalicCtaLine` | Reuse as-is | Same Playfair Display Bold Italic |
| `makeMetallicGradient` | NOT reused — compact uses `#F5F0E8` cream bg | Different background system |
| `makeWhiteCardWithStraddlingTitle` | NOT reused — compact has no card | Different layout model |

### Build each compact component before the template

Per Phase 2 plan, the 6 compact components must be built first:
1. `make-brand-pill` — `@handle` wordmark pill (bottom-left)
2. `make-dot-progress-indicator` — slide N of M dots
3. `make-outlined-pill` — category pill (peach fill, traced border)
4. `make-mixed-weight-text` — per-word weight/style variance in one text block
5. `make-number-badge` — outlined numbered badge for step/list templates
6. `make-circular-nav-arrow` — decorative chevron

### Evaluation workflow per component

```bash
# 1. Write the component in shared/compact/<name>.ts
# 2. Export from shared/compact/index.ts
# 3. Add to component_test.ts bundle entry
node backend/renderer/build.mjs

# 4. Run the component snapshot
node scripts/gan_component_snapshots.js --component <name>

# 5. Open the output, iterate until it looks right
open backend/outputs/gan-runs/components/<name>/iter0/gen.png
```

### Evaluation workflow per template

```bash
# 1. Write aurora_compact_<name>.ts using only shared/compact/* components
# 2. Register in index.ts REGISTRY
# 3. Write fixture at scripts/gan_fixtures/aurora-compact-<name>/<slug>.json
node backend/renderer/build.mjs

# 4. Render and inspect
node scripts/gan_reference.js --template aurora-compact-<name> --max-iter 1
open backend/outputs/gan-runs/aurora-compact-<name>/iter0/gen_<slug>.png

# 5. Check bounds, typography, component placement
# 6. Iterate until visually polished
```

### Checklist before calling a template "done"

- [ ] All template code delegates to shared components — zero inline `new fabric.*` in the template file
- [ ] Rendered PNG inspected visually — looks like a real Instagram post
- [ ] Nothing outside the card frame (CARD_X=54 to CARD_X+CARD_W=1026, same for Y)
- [ ] Headline center-aligned
- [ ] CTA center-aligned and not overlapping body content
- [ ] Fixture JSON covers all fields the template reads
- [ ] Build passes: `node backend/renderer/build.mjs` exits clean
- [ ] Template key registered in `index.ts` REGISTRY

---

## 6. Component Naming Convention

```
shared/
  cover/          ← components used by cover-hero templates
    make*.ts
  compact/        ← components used by compact family
    make-*.ts     ← kebab-case (dash), consistent with Phase 2 spec
```

Cover-hero components use camelCase filenames (`makeBodyText.ts`).  
Compact components use kebab-case (`make-body-text.ts`) per Phase 2 spec.  
Both patterns work — pick one per family and stay consistent.

---

## 7. File Map

```
frontend/utils/canvasTemplates/
  aurora_carousel_cover_hero_phone.ts      ← template orchestrator
  aurora_carousel_cover_hero_images.ts     ← template orchestrator
  shared/cover/
    index.ts                               ← barrel export
    makeMetallicGradient.ts
    makeWhiteCardWithStraddlingTitle.ts
    makeDisplayHeadline.ts
    makeBodyText.ts                        ← NEW (extracted from inline code)
    makeTiltedPhoneMockup.ts               ← group-level clipPath approach
    makeTiltedImagePair.ts
    makeItalicCtaLine.ts
  shared/compact/                          ← Phase 2 components (to build)
    index.ts
    make-brand-pill.ts
    make-dot-progress-indicator.ts
    make-outlined-pill.ts
    make-mixed-weight-text.ts
    make-number-badge.ts
    make-circular-nav-arrow.ts

scripts/
  gan_reference.js                         ← GAN render + diff engine
  gan_fixtures/
    aurora-carousel-cover-hero-phone/
      fake-post.json
    aurora-carousel-cover-hero-images/
      google-where-am-i.json
  GAN_REFERENCES.json                      ← template → reference PNG mapping

backend/
  renderer/
    renderer_entry.ts                      ← font loading, window.Renderer
    build.mjs                              ← builds renderer.bundle.js + component_test.bundle.js
  outputs/gan-runs/                        ← rendered PNGs per template per iteration
  assets/dev/
    phone-screen.jpg                       ← dev fixture image (phone screen)
    tablet-scene-1.jpg                     ← dev fixture image (image card 1)
    tablet-scene-2.jpg                     ← dev fixture image (image card 2)
```

---

## 8. Reference PNGs

Original Instagram post references live at `backend/outputs/slide-references/others/`:
- `image copy 3.png` — phone/fake-post reference (used for cover-hero-phone GAN)
- `image copy 4.png` — images/google reference (used for cover-hero-images GAN)

These are the visual targets. The GAN diff against them is expected to be 50–60% because they were created in Canva with different fonts and exact pixel colors. That's normal — use the diff map to identify structural misalignments, not to chase a number.
