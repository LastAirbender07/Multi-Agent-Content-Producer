# aurora-product-cover

**Family type:** Anthropic-style product cover. **Phase:** 5+. **Status:** NEW.

## What
Warm off-white bg + hero (3D render / typography-art / portrait-strip / hand-drawn) + optional monospace technical label / series eyebrow + big Bold display headline + optional subtitle + circular nav chevron + dot indicator.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 23, 29, 32, 36.

## Reference PNGs (heroType variants)
- `backend/outputs/slide-references/claude/image.png` — `3d-render` (protein)
- `backend/outputs/slide-references/claude/image copy 6.png` — `typography-art` (multilingual glyphs)
- `backend/outputs/slide-references/claude/image copy 9.png` — `portrait-strip` (interview subjects)
- `backend/outputs/slide-references/claude/image copy 13.png` — `hand-drawn-illustration` (economic index)

## Exists? No.

## Composition
```
[bg warm off-white #F5F0E5 / stone #DFD8CB / pale-blue #C7D3DE (per topic)]
  → [hero (heroType-dependent, top ~70%)]
  → [optional monospace technical label (top-right)]
  → [optional series eyebrow / kicker]
  → [display headline (Inter Bold or Fraunces Bold ~72-118pt)]
  → [optional subtitle (Inter Regular ~30pt, 2 lines)]
  → [nav chevron (R side)] + [dot indicator]
```

## Design tokens (Anthropic palette)
- `bg-warm-offwhite = #F5F0E5` (clinical)
- `bg-warm-stone = #DFD8CB` (editorial)
- `bg-pale-blue-economic = #C7D3DE` (economic)
- `bg-warm-cream-economic = #F5EFDC` (Economic Index body)
- `ink-black = #1B1B1B`, `ink-muted-grey = #8A8A8A`
- `accent-coral = #D46A5E`
- Font: **Inter Bold + Regular** (declarative / product)
- Font: **Fraunces Bold** (editorial / philosophical)
- Font: **JetBrains Mono** OR **IBM Plex Mono** (technical labels)

## Copy pattern
- **serif for question/philosophical headlines**, **sans for declarative/data headlines**
- 7-15 words, 2-4 lines
- Subtitle optional

## Related
- [make-product-cover-slide](../components/layouts.md#make-product-cover-slide)
- [make-portrait-strip](../components/decorative.md#make-portrait-strip)
- [make-typography-art-hero](../components/decorative.md#make-typography-art-hero)
- [make-hand-drawn-illustration-hero](../components/decorative.md#make-hand-drawn-illustration-hero)
- [make-monospace-label](../components/typography.md#make-monospace-label)
