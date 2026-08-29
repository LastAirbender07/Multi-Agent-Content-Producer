# aurora-compact-list-item

**Family type:** Body slide — editorial ranked list (3–5 items per slide).
**Phase:** 2 (core). **Status:** NEW.
**Canvas:** 1080 × 1350 (4:5 portrait, IG feed carousel format).

---

## What is it?

**One list item per slide** (or 3–5 items stacked). Left column = outlined-circle number badge; middle column = item name + 1-line description; right column = optional icon or etched illustration. Editorial book-page vibe.
One slide in an editorial numbered-list carousel. 3–5 items per slide, each row having:
a left-column outlined-circle number badge, a centre-column serif body paragraph with selective bold spans, and a right-column etched ink illustration. Clean, magazine-grade — the kind of slide people screenshot and save.

Inspired by Sahil Bloom's relationship/wealth advice carousels. The defining aesthetic: near-white page, book-quality serif type, quiet illustrations that reinforce rather than decorate.

**Reference PNGs (primary):**
- `backend/outputs/slide-references/SahilBloom/image.png` — cover slide (large serif headline + ink illustration)
- `backend/outputs/slide-references/SahilBloom/image copy.png` — items 1–4 with etched icons
- `backend/outputs/slide-references/SahilBloom/image copy 2.png` — items 9–12 with etched icons

---

## Does it already exist?

**No.** Net new.

---

## Visual spec (from reference images — source of truth)

**Background:** `#F9F9F7` near-white. **Not** a warm cream — the actual SahilBloom bg is essentially neutral off-white. A warm sandy tone (`#F3ECD8`) looks dated; `#F9F9F7` reads as a premium print page.

**Editorial header (TOP of slide — always first element):**
- `@handle` — Inter Light 400, ~20pt, charcoal `#3D3D3D`, x=55, y=52
- Series title — italic serif (Playfair Italic 400 or Charter Italic), ~20pt, `#3D3D3D`, right-aligned, x ends at 1025, same y=52
- Hairline rule — 1px, full width (x=0 to 1080), y=82, `#C8C2BA`

**Item rows (y starts at ~130, after the header):**

Each row is a 3-column structure:

```
Col A: numbered-circle badge   x=42  width=76px  (centred in col)
Col B: body text               x=138 width=580px
Col C: illustration            x=750 width=220px  height=220px  (centred to row height)
```

- **Number badge (Col A):** 76px diameter circle, stroke `#1B1B1B` at 1.5px width, fill transparent. Digit inside: Playfair Display Regular ~36pt, colour `#1B1B1B`. Vertically centred to the row's text height. NOT a filled badge — the outline-only style is the entire aesthetic.

- **Body text (Col B):** Playfair Display Regular ~36pt, leading 1.45, `#1B1B1B`, left-aligned (ragged right — NOT justified). Bold-span emphasis on the rule/key noun (Playfair Display Bold, same size, same color — just weight change). Variable height per item: use `calcTextHeight()` before positioning.

- **Illustration (Col C):** 220×220px ink etching, vertically centred to the row's computed height. PNG with transparent bg (black linework on transparent). Applied as `FabricImage` cover-fitted to a 220×220 clip rect.

**Row spacing:** 50px gap between the bottom of one row and the top of the next.

**Bottom of slide:** Nothing. No footer element. The editorial header at the top IS the only brand/attribution element.

---

## Composition (Fabric.js build order)

```
Phase 1 — measure (no canvas mutations):
  for each item:
    h[i] = calcTextHeight(item.body, {fontFamily:"Playfair Display", fontSize:36, lineHeight:1.45, width:580})
    rowH[i] = max(h[i], 220)  // illustration min-height anchor

Phase 2 — place:
  [Rect: full canvas, fill #F9F9F7]
  [Rect: hairline rule, 1080×1, y=82, fill #C8C2BA]
  [Textbox "@handle", x=55, y=52, Inter Light 400, 20pt, #3D3D3D]
  [Textbox "Series Title", x=right-aligned to 1025, y=52, Playfair Italic, 20pt, #3D3D3D]

  y_cursor = 130
  for each item at index i:
    badge_centerY = y_cursor + rowH[i] / 2
    [Circle: cx=80, cy=badge_centerY, r=38, stroke #1B1B1B 1.5px, fill transparent]
    [Textbox: digit, cx=80, cy=badge_centerY (centred), Playfair Regular 36pt]
    [Textbox: body copy with bold spans via styles{}, x=138, y=y_cursor, w=580]
    [FabricImage: illustration, x=750, y=badge_centerY - 110, w=220, h=220]
    y_cursor += rowH[i] + 50
```

---

## Design tokens

| Token | Value | Notes |
|---|---|---|
| `bg-page` | `#F9F9F7` | Near-white — NOT warm cream |
| `ink-primary` | `#1B1B1B` | Near-black |
| `ink-muted` | `#3D3D3D` | Header labels |
| `rule-hairline` | `#C8C2BA` | Top separator line |
| `badge-stroke` | 1.5px | Thin — key to the editorial feel |

**Fonts:**
- **Playfair Display Regular** — body copy (load via FontFace)
- **Playfair Display Bold** — inline bold spans (same FontFace family, weight 700)
- **Playfair Display Italic** — series title in header
- **Inter** — already loaded; used for @handle label

---

## The make-or-break detail: etched illustrations

The ink illustrations ARE the premium signal in this template. Options in priority order:
1. **Pre-commissioned SVG/PNG library** — 30–50 topic-agnostic illustrations (hand + tools, balance scale, two people, heart, plant, clock, etc.)
2. **Stable Diffusion / Midjourney** — prompt: `"pen and ink etching illustration of [subject], WSJ hedcut engraving style, black linework on white, no halftone, clean lines"` — export as PNG, remove bg with `rembg`
3. **Emoji at large scale** — last resort; loses the editorial feel entirely

The illustration picker must be deterministic: given the same item text → same illustration. Use a topic-tag enum (`"relationships/advice"`, `"finance/investing"`, etc.) in the data model.

---

## Copy pattern

- Item body: `"[Imperative or observation]. [Elaboration with specific concrete detail]."` — first sentence is the rule, second grounds it. 3–25 words. Variable length is fine and expected.
- Emphasis span: ONE key noun-phrase per item gets bolded — the thing someone would underline in a book.
- Voice: first-person warm essayistic. No emoji, no ALL-CAPS, no hashtags.

---

## Related components

- `make-number-badge` (outlined variant — NOT filled)
- `make-editorial-header-bar` (see typography.md)
- `make-mixed-weight-text` (for bold spans — use Fabric `styles{}` per-char approach)
- `make-etched-illustration` (see decorative.md)

---

## GAN verification

- Diff ≤ 5% vs `SahilBloom/image copy.png` for a 4-item slide.
- Spot check: bg hex must read as `#F9F9F7` (not cream-shifted) in color-sample from rendered PNG.
- Badge: stroke-only circle must be visually confirmed — no fill leak.
