# aurora-carousel-cover-hero

**Family type:** Carousel / Reel cover — @holler.academy signature layout: warm-brown metallic bg + inner white card + straddling title chip + tilted mockup + right-column body.
**Phase:** 5+. **Status:** NEW.

---

## 1. What this template is (visual anatomy, read this first)

The reference is **not** a full-bleed slide. It is a **frame-within-a-frame** composition. There are **two distinct background layers**, and confusing them is the #1 mistake:

```
+------------------------------------------------------+
|  OUTER: full-bleed warm-brown / metallic-peach bg    |  <- Layer 1
|                                                      |
|    +------------------------------------------+      |
|    |  +==========+                            |      |
|    |  || Fake Post||  <- Zone A: title chip   |      |
|    |  +====+=====+     straddles top edge     |      |
|    |       |                                  |      |
|    |  INNER: white rounded card               |  <- Layer 2
|    |  +--------+                              |      |
|    |  |  [P]   |  Right column body copy -    |      |
|    |  | tilted |  clear, readable, several    |      |
|    |  | iPhone |  short lines, left-aligned.  |      |
|    |  | mockup |                              |      |
|    |  | (slot) |  * Comment "TEMPLATE"...     |      |
|    |  +--------+                              |      |
|    |   ^ slightly pokes out of white card     |      |
|    +------------------------------------------+      |
|                                                      |
+------------------------------------------------------+
```

- **Outer layer:** full-bleed warm-brown / metallic-peach gradient (Layer 1). This is the slide background.
- **Inner white card:** a large rounded-rect (~90% of canvas) sitting on the outer bg. This is the primary content container. **This white card MUST exist. It is not optional.**
- **Title chip (a.k.a. "straddling label"):** a small rounded rectangle at the **top-centre of the white card**, positioned so its horizontal centre-line **sits on the card's top edge** — half of the chip is above the white card, half is on top of it. Its fill colour is **the same warm-brown as the outer bg** (so it blends into Layer 1 above the edge), with a bold outline and centered text (e.g. `Fake Post`). Occupies **~1/5 of the white card's width**, ~64 px tall.
- **Tilted iPhone (or 2 rounded-corner images):** a phone mockup slot placed in the **left ~40%** of the white card, tilted ~-6 deg. **Its bottom or left edge slightly pokes OUTSIDE the white card boundary** — this is intentional 3D depth. The phone's screen shows an image / GIF / screenshot slot.
- **Right column body copy:** occupies the right ~55% of the white card. Clean, readable sans-serif, several short lines, left-aligned. **The font is NOT giant.** (Only the title chip's text is emphasised — everything else is calm.)
- **CTA (optional):** small italic-serif "*Comment TEMPLATE …" line tucked at the bottom of the right column OR below the white card.

Variants (same skeleton, different mockup):
- **`image copy 3.png` — "Fake Post"** — one tilted iPhone, screen shows a Reel frame with 2 fake IG comment cards overlaid.
- **`image copy 4.png` — "Google, Where Am I?"** — instead of one iPhone, **two smaller rounded-corner images** (paper-cutout + tablet) in the left area, both tilted, slightly overlapping (subtle 3D stack).


---

## 2. Non-negotiable features (checklist for any implementer)

Every implementation MUST satisfy these. If any of these are false, the render is wrong:

- [x] **Two-layer background**: outer warm-brown / metallic-peach `#DAC7A5 -> #C6B6A0` + inner **white rounded card** (`#FFFFFF`, radius ~48 px, subtle drop shadow, ~90% of canvas).
- [x] **Title chip straddles the card's top edge** (chip centre-Y = card top-Y). Chip fill = **same warm-brown as outer bg** so it visually reads as "punched through the card". Chip has a **bold outline** (~3 px) and centered text.
- [x] **Title chip width ≈ 1/5 of the white card's width.** Not the whole width. Not centered floating text.
- [x] The **title text lives INSIDE the chip** — never rendered as bare text on the card.
- [x] **Tilted phone / image slot on the LEFT** of the white card (~40% width), rotated `-6 deg` (or `+4 deg` for the mirrored variant). Part of the phone/image protrudes past the white card edge.
- [x] **Right column** of the white card holds body copy — **short lines**, **normal readable font size** (~40–48 px on 1080 px canvas), sans-serif Regular, left-aligned.
- [x] **No IG-carousel dots as part of this template.** If dots are shown, they belong to a **separate reusable "dot-progress-indicator" component** used by the carousel wrapper, not by this cover template.
- [x] Uses `make-white-card-with-straddling-title` composite (see `components/layouts.md`) — the template does NOT redraw the card+chip logic itself.

---

## 3. What NOT to do (anti-patterns — the AI has failed on these before)

Reject any render that has any of the following:

- ❌ **No white inner card** (full-bleed brown with text directly on it) — this is the single most common failure mode.
- ❌ **Title chip rendered as inline text on the card** (no rectangle around it, no straddle across the top edge). The title MUST be inside a bordered rectangle at the top edge.
- ❌ **Giant title text spanning most of the card width.** The chip is small (~1/5 card width).
- ❌ **Body copy too large** (matching headline size). The body is normal-scale readable prose.
- ❌ **No phone/image mockup slot** on the left. If the reference has an iPhone, the render must have a phone mockup.
- ❌ **Instagram slide-progress dots baked into the template.** Dots are a separate component belonging to the carousel wrapper, not this cover.
- ❌ **Phone drawn flat / axis-aligned.** It must be tilted (~-6 deg) with a subtle drop shadow.

---


## 4. Composition (composed from existing components)

```
[bg-metallic-peach (full-bleed)]                       // make-metallic-gradient
  -> [make-white-card-with-straddling-title]           // NEW composite in components/layouts.md
       - card: white rounded-rect, ~90% canvas
       - chip: warm-brown fill + bold outline + centred text
              (chip centre-Y = card top-Y, chip width = card_width / 5)
  -> [make-tilted-phone-mockup]  OR  [make-tilted-image-pair]
       - placed at left ~40% of the white card, tilted -6 deg,
         intentionally extends past the card's left/bottom edge.
  -> [right-column body copy Textbox]
       - x = card_left + card_width * 0.5, width = card_width * 0.42
       - fontSize 44 px, fontWeight 400, Inter Regular, leading 1.35
  -> [optional italic-serif CTA line]                  // Playfair Italic Bold ~30 px
```

**Reusable component boundaries** (composition rule: the template MUST use each of these; it MUST NOT inline any of them):

| Piece | Component |
|---|---|
| Outer metallic bg | [`make-metallic-gradient`](../components/decorative.md#make-metallic-gradient) |
| White card + straddling title chip | [`make-white-card-with-straddling-title`](../components/layouts.md#make-white-card-with-straddling-title) |
| Tilted iPhone with screen slot | [`make-tilted-phone-mockup`](../components/mockups.md#make-tilted-phone-mockup) |
| Tilted image pair (Google variant) | [`make-tilted-image-pair`](../components/mockups.md#make-tilted-image-pair) |
| Italic-serif CTA line | [`make-italic-cta-line`](../components/typography.md#make-italic-cta-line) |
| Dot indicator (**not** used by this template — belongs to carousel wrapper) | [`make-dot-progress-indicator`](../components/decorative.md#make-dot-progress-indicator) |

---

## 5. Reference PNGs

- `backend/outputs/slide-references/others/image copy 3.png` — **"Fake Post"** — one tilted iPhone variant. **Canonical reference for `mockupType: "phone-post"`.**
- `backend/outputs/slide-references/others/image copy 4.png` — **"Google, Where Am I?"** — two tilted images variant. **Canonical reference for `mockupType: "image-pair"`.**
- `backend/outputs/slide-references/others/image copy 5.png` — `CHECK MY CALENDAR` (calendar-mockup variant).
- `backend/outputs/slide-references/others/image copy 6.png` — `HOLD & SCROLL`.
- `backend/outputs/slide-references/others/image copy 7.png` — `WHAT'S THE VIBE` (iMessage variant).

---


## 6. Builder API (single, parameterised)

```ts
makeCarouselCoverHero({
  // Backgrounds & shell
  outerBg: "metallic-peach" | "metallic-cream" | { gradientStops: [...] },
  cardFill: "#FFFFFF",
  cardRadius: 48,

  // Title chip (straddling)
  chipText: string,               // e.g. "Fake Post"
  chipFillMatchesOuterBg: true,   // MUST default to true; the chip blends with outer bg
  chipStrokeWidth: 3,
  chipStrokeColor: "#1B1B1B",
  chipWidthRatio: 0.2,            // 1/5 of card width; do NOT allow > 0.35

  // Mockup slot (left column of white card)
  mockup:
    | { type: "phone-post", screenImage: url, overlayCards?: Array<{...}>, tilt: -6 }
    | { type: "image-pair", images: [url, url], tilts: [-6, +4], overlapPct: 20 }
    | { type: "imessage", ... }
    | { type: "calendar", ... }
    | { type: "none" },

  // Body column (right)
  bodyText: string,               // ~30–70 words; ONE font size ~44 px; do NOT scale up
  bodyFontSize?: 44,

  // Optional CTA
  ctaLine?: string,               // italic-serif, small, e.g. '*Comment "TEMPLATE" for the link'
})
```

**Key parameter defaults that prevent the known failure modes:**

- `chipWidthRatio: 0.2` — enforce a cap of `0.35`. Do not let content force it wider.
- `bodyFontSize: 44` — do NOT auto-scale up if body is short. Keep body calm.
- `chipFillMatchesOuterBg: true` — the chip's fill is bound to the outer background token, not a hard-coded colour.
- Dots / IG-progress are **not** parameters of this builder. They live outside.

---

## 7. Design tokens

- `outer-bg-warm-brown = radial(#DAC7A5 -> #DDD1C0 -> #C6B6A0)` (subtle grain 3 % opacity)
- `card-fill = #FFFFFF`, `card-radius = 48 px`, `card-shadow = {y: 8, blur: 24, opacity: 0.20}`
- `chip-fill = <same as outer-bg mid-tone>`, `chip-stroke = #1B1B1B`, `chip-stroke-width = 3 px`
- `ink-primary = #000000`, `ink-body = #1B1B1B`
- `mockup-tilt = -6 deg` (primary), `+4 deg` (mirrored / second-of-pair)
- `mockup-shadow = {y: 12, blur: 36, opacity: 0.25}`

---

## 8. Fonts

- **Inter Bold / SemiBold** — chip text and body copy.
- **Playfair Display Italic Bold** — CTA line only.
- Explicitly **do not** use Inter Black display weight in the chip or body of this template — that's the *other* cover family (`aurora-editorial-cover`). This template is the calm-body, chip-title variant.

---

## 9. Copy pattern

- **Chip text:** 1–3 words, Title Case (`Fake Post`, `Google Trick`, `Calendar Recap`). Not ALL CAPS in this variant.
- **Body:** 30–70 words, 3–5 short lines, left-aligned. Sentence case. Conversational.
- **CTA (optional):** `*Comment "TEMPLATE" for the Canva Link` — small italic-serif.

---


## 10. Related

- [`make-metallic-gradient`](../components/decorative.md#make-metallic-gradient)
- [`make-white-card-with-straddling-title`](../components/layouts.md#make-white-card-with-straddling-title)  ← **NEW composite, defined for this family**
- [`make-tilted-phone-mockup`](../components/mockups.md#make-tilted-phone-mockup)  ← **NEW mockup**
- [`make-tilted-image-pair`](../components/mockups.md#make-tilted-image-pair)  ← **NEW mockup**
- [`make-italic-cta-line`](../components/typography.md#make-italic-cta-line)
- [`make-dot-progress-indicator`](../components/decorative.md#make-dot-progress-indicator) — used by the carousel *wrapper*, NOT by this template.

---

## 11. GAN acceptance

An implementation is accepted iff **all** of the following hold when diffed against `others/image copy 3.png` and `others/image copy 4.png`:

1. White inner card detected via edge-detection (contiguous white rect ≥ 80% of canvas area) — **PASS/FAIL**.
2. Straddling chip detected at card top edge (bounded rectangle whose centre-Y within [card_top +/- 20 px], width within [0.15, 0.30] × card_width, fill colour dE < 8 from outer-bg mid-tone) — **PASS/FAIL**.
3. Rotated mockup detected in left half of card (bounding-box angle within [-10 deg, -3 deg] for primary; part of bbox extends past card edge) — **PASS/FAIL**.
4. Right-column body text bbox occupies ≥ 30% of card width, aligned left, font size within 10% of 44 px — **PASS/FAIL**.
5. No IG-progress dot row inside the card boundary — **PASS/FAIL**.

Content-pixel diff on right-column zone ≤ 8 % vs reference.

---

## 12. Common failure modes observed & fixes

| Symptom | Root cause | Fix |
|---|---|---|
| No white card, everything on brown | Builder skipped the composite and drew title as a plain Textbox on the bg. | Enforce composite usage. |
| Title text huge and centered, no box | Builder used the display-headline pattern from `aurora-editorial-cover`. | Use `make-white-card-with-straddling-title` — chip is a bordered rect, not a Textbox. |
| Instagram dots at the bottom | Builder confused wrapper chrome with template content. | Dots are the carousel *wrapper*'s concern. Remove from this builder entirely. |
| Body text same size as headline | Builder auto-scaled body to fill vertical space. | Fix `bodyFontSize` at 44 px; if body is short, add whitespace, don't scale. |
| Phone rendered upright / no tilt | Builder rotated the group but not the shadow — or omitted rotation. | `mockup.tilt = -6 deg` MUST be applied to the entire mockup group including its shadow. |
| Phone fully inside the card, no protrusion | Builder clipped mockup to card bounds. | Do not clip — overflow is a feature, not a bug. |

