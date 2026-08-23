# aurora-compact-quote

**Family type:** Body slide — pull-quote / testimonial.
**Phase:** 2 (core). **Status:** NEW.

## What is it?

A **pull-quote slide** with a bold coloured background (terracotta / burnt-orange / coral), giant serif quote with curly quotes + inline-bold emphasis on the "money-line", small attribution at bottom, optional portrait cutout on the right. Emotional peak / rhetorical anchor of a carousel.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 10.png* (image 33) — Dan Alistarh coral pull-quote
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 11.png* (image 34) — Thomas Hofmann coral pull-quote (7-word bold span)
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 12.png* (image 35) — stacked-quotes on stone bg

## Reference PNGs

- `backend/outputs/slide-references/claude/image copy 10.png` — Dan Alistarh telescope quote
- `backend/outputs/slide-references/claude/image copy 11.png` — Thomas Hofmann publication quote
- `backend/outputs/slide-references/claude/image copy 12.png` — stacked two-quote body

## Does it already exist?

**No.** Related: `aurora_quote.ts` (extended family) is a plain-quote slide; this compact variant is designed for **portrait + colour-hero** pairing.

## Composition

```
[bg-terracotta #C36749 or coral #D46A5E]  // full-bleed
  → [portrait cutout on right ~40%]        // components/cards/make-portrait-cutout.md
    - Duotone (highlight cream, shadow deep-coral)
    - Silhouette mask, no rectangular frame
  → [top intro question (y≈100)]           // Inter Bold ~30pt cream
  → [pull-quote body (y≈240-880)]          // Fraunces Bold / Playfair Bold ~72pt cream
    - Curly quotes at both ends
    - One inline-bold span for the money-line
  → [attribution (y≈920)]                  // 2 lines
    - Line 1: Name in Inter Bold ~26pt cream
    - Line 2: Role, Institution in Inter Regular ~22pt cream
```

## Design tokens

- `bg-terracotta = #C36749` OR `bg-hero-coral = #D46A5E`
- `text-on-coral = #F5EFE0` cream
- `duotone-shadow-deep = #8A3A32`
- Font: **Fraunces Bold** OR **Playfair Display Bold** — serif quote body
- Font: **Inter Bold + Regular** — intro question + attribution

## Fonts to add

- **Fraunces Bold** (NEW — recommended over Playfair for more modern feel)
- **Playfair Display Bold Italic** (fallback / alternate)

## Copy pattern

- **Intro question:** conversational bridge from previous slide, ends with `?`. Optional.
- **Pull-quote body:** direct quotation from a named source, 30–80 words, wraps 4–10 lines. Contains ONE bold-span (2–10 words) that carries the emotional/argumentative peak.
- **Attribution:** `[Name] / [Role], [Institution]` — 2 lines.

## Related components

- [make-pull-quote-card](../components/cards/make-pull-quote-card.md) — for the standalone burnt-orange card variant
- [make-portrait-cutout](../components/cards/make-portrait-cutout.md)
- [make-mixed-weight-text](../components/typography/make-mixed-weight-text.md) — for inline-bold span

## GAN verification

- Content-zone diff ≤ 5 % vs `claude/image copy 10.png` and `claude/image copy 11.png`.
- Portrait duotone: pre-masked PNG asset OR runtime `rembg` (Phase 4+ enhancement).

## Notes

- **Two colour variants:**
  - Coral `#D46A5E` (Anthropic-style, human-editorial mood)
  - Terracotta `#C36749` (spotlight sub-brand, warmer)
- **Portrait pipeline:** LLM writer emits `portrait: {url, duotone: {highlight, shadow}}` — renderer applies duotone LUT + alpha mask. MVP: user-supplied pre-masked PNG. Loop 4: `rembg` server-side.
- **Bold-span rule:** the LLM picks ONE phrase (typically 2-4 words, sometimes up to 10) that is the "money-line" of the quote. Length is semantic, not syntactic.
