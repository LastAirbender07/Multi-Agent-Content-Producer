# aurora-compact-hook

**Family type:** Cover / hook slide — typography-only, no image mockup.
**Phase:** 2 (core). **Status:** NEW.
**Canvas:** 1080 × 1350 (4:5 portrait).

---

## What is it?

The **cover slide** for a compact-family carousel. It carries a HUGE bold sans-serif question or hook headline (100–140 pt on a 1080 canvas), a small ALL-CAPS peach category pill at top, and a brand pill + progress dots at the bottom. One idea per slide, ≤ 12 words.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` → *others/image.png* (image 1) — outer wrapper + big hook pattern
- `Docs/design/SLIDE_REFERENCES_FULL.md` → *others/image copy 4.png* (image 5) — `GOOGLE, WHERE AM I?` reference cover
- `Docs/design/SLIDE_REFERENCES_ANALYSIS.md` §"Templates catalogued" → `bold-headline-with-mockup` pattern

The **text-only cover slide** for a compact-format carousel. Huge black Inter-Black headline on warm cream, an outlined category pill at the top, and a brand pill + dot progress indicator at the bottom. Maximum impact with minimum elements.

> **Do not confuse with `aurora-carousel-cover-hero`.** That family (already built) pairs the big headline with a tilted phone mockup or image pair. This template is deliberately mockup-free — the headline IS the hero. It's the equivalent of a book title page: typography alone does the work.

**Primary reference images:**
- `backend/outputs/slide-references/others/image copy 3.png` — "FAKE POST" (bold black headline + peach pill + CTA line)
- `backend/outputs/slide-references/others/image copy 4.png` — "GOOGLE, WHERE AM I?" (multi-line headline variant)
- `backend/outputs/slide-references/others/image copy 5.png` — "CHECK MY CALENDAR" (2-line headline)

Note: these reference images actually contain the phone/image mockup (built as `aurora-carousel-cover-hero`). The compact-hook is the TYPOGRAPHY ZONE extracted from them — headline + pill + CTA text only, no mockup. Use the label/pill and headline zone as the design reference; ignore the mockup half.

---

## Does it already exist?

**No.** The carousel-cover-hero family is built. This compact-hook is the simpler sibling — same visual DNA (cream bg, black Inter, peach pill) but the entire slide is just type. Closest ancestor: `aurora_hook.ts` (glassmorphism body card variant).

---

## Visual spec

### Background

Warm cream flat fill. `#F5F0E8` — slightly warmer than the editorial list-item's near-white, which gives this slide a tactile analogue-printed feel vs. the SahilBloom cold-neutral. This distinction is intentional: compact-hook = warm/urgent, compact-list-item = cool/intellectual.

### Category pill (top-centre)

The pill straddling the design vocabulary from the reference images:

```
Shape:    Rounded rect, cornerRadius = height/2 (full pill)
Fill:     #E8CBA3  (warm peach — slightly darker than bg, same temperature)
Stroke:   #1B1B1B, 2px
Text:     ALL-CAPS Inter SemiBold 600, ~28pt, letter-spacing 0.12em, #1B1B1B
Size:     Auto-fit text + {paddingX: 28, paddingY: 14} — do not hardcode width
Position: Horizontally centred, y = 180 (clear of IG avatar safe zone)
```

The pill must be **auto-sized to its text**. Never hardcode width — `"VIRAL REEL"` and `"HOT TAKE"` are different widths. Compute: `pillWidth = estimatePillWidth(text, 28) + 56`. Then centre: `pillX = (1080 - pillWidth) / 2`.

### Display headline

```
Font:      Inter Black 900
Size:      100–140pt (LLM writer picks; use 140pt for 1-line, 120pt for 2-line, 100pt for 3-line)
Color:     #111111 (near-black — not pure black)
Width:     maxWidth = 900 (centred margins 90px each side)
Align:     center
Position:  x = 90, y = 320 (1-line) / y = 280 (2-line) / y = 240 (3-line)
LineHeight: 1.05 — tight, punchy
```

Optional: mark ONE word with `Playfair Display Bold Italic` for editorial serif contrast. The runs array:
```typescript
runs: [
  { text: "GOOGLE,\nWHERE AM " },
  { text: "I?", fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 700 }
]
```
Use this sparingly — 1 in 3 slides maximum.

### CTA line (optional)

```
Font:     Playfair Display Bold Italic
Size:     28pt
Color:    #1B1B1B
Align:    center
Position: x = 90, y = (bottom of headline + 60), maxWidth = 900
```

Format: `*Comment "KEYWORD" for the [resource]` — the asterisk prefix is a visual signal; render as italic prose.

### Brand pill + dot indicator (bottom)

```
Brand pill:      x=55, y=1260  (make-brand-pill — existing component)
Dot indicator:   centred at x=540, y=1298  (make-dot-progress-indicator — existing component)
```

---

## Composition (Fabric.js build order)

```typescript
objects.push(makeMetallicGradient(1080, 1350));       // or Rect fill #F5F0E8

// pill
const pw = estimatePillWidth(m.category_pill, 28) + 56;
objects.push(makeOutlinedPill({
  text: m.category_pill,
  x: (1080 - pw) / 2,
  y: 180,
  fillColor: "#E8CBA3",
  strokeColor: "#1B1B1B",
  strokeWidth: 2,
  fontSize: 28, fontWeight: 600, letterSpacing: 0.12,
  paddingX: 28, paddingY: 14, cornerRadius: "pill",
}));

// headline
const lineCount = m.headline.split('\n').length;
const headlineFontSize = lineCount >= 3 ? 100 : lineCount === 2 ? 120 : 140;
const headlineY = lineCount >= 3 ? 240 : lineCount === 2 ? 280 : 320;
objects.push(makeMixedWeightText({
  runs: m.headline_runs ?? [{ text: m.headline }],
  size: headlineFontSize,
  align: "center",
  lineHeight: 1.05,
  maxWidth: 900,
  x: 90,
  y: headlineY,
}));

// cta
if (m.cta_line) {
  const headlineBottom = headlineY + lineCount * headlineFontSize * 1.05;
  objects.push(makeItalicCtaLine({ text: m.cta_line, y: headlineBottom + 60, ... }));
}

// bottom chrome
objects.push(makeBrandPill({ x: 55, y: 1260 }));
objects.push(makeDotProgressIndicator({ x: 540, y: 1298, active: m.slide_index, total: m.slide_count }));
```

---

## Design tokens

| Token | Value |
|---|---|
| `bg-warm-cream` | `#F5F0E8` |
| `ink-primary` | `#111111` |
| `pill-fill` | `#E8CBA3` |
| `pill-stroke` | `#1B1B1B` |
| `pill-stroke-width` | 2px |
| `headline-line-height` | 1.05 |

**Fonts:** Inter Black 900 (headline), Inter SemiBold 600 (pill label), Playfair Display Bold Italic (optional emphasis + CTA).

---

## Copy pattern

- **Category pill:** 1–2 ALL-CAPS words. `VIRAL REEL`, `HOT TAKE`, `TUTORIAL`, `MONEY TIPS`, `AI TOOLS`. Max 3 words — the pill auto-sizes but long labels look ungainly.
- **Headline formula:** `"[VERB], [FRAGMENT]?"` OR `"[NOUN PHRASE]\n[QUALIFIER]"`. Max 12 words across all lines. Every word pulls its weight. The goal is a scroll-stopping question or claim.
- **CTA line:** optional, but when present always uses the `*Comment "KEYWORD"` pattern.

---

## Related components

- `make-outlined-pill` (typography.md)
- `make-mixed-weight-text` (typography.md)
- `make-italic-cta-line` (typography.md)
- `make-brand-pill` (cards.md)
- `make-dot-progress-indicator` (decorative.md)

---

## GAN verification

- Diff ≤ 5% vs `others/image copy 3.png` headline + pill zone (crop to y=140–800, ignore mockup half).
- Pill: verify auto-sizing — text must not be clipped and pill must not be 30% wider than text.
- Bg hex spot-check: must read as warm cream not yellow, not beige-grey.

---

## Notes

- **Zoom-hook variant:** If the hook image is a zoomed emoji or zoomed photo with tiny unreadable text (the "I'm THIS close" pattern), that is `aurora-compact-zoom-hook` — a different template.
- **IG safe zone:** top-200px avatar overlap risk. The pill at y=180 intentionally sits at the safe-zone edge. In production builds, bump to y=220 if the avatar bar is visible.
