# aurora-nextwork-spotlight-body

**Family type:** Profile spotlight body — dense editorial. **Phase:** 5+. **Status:** NEW.

## What
The **densest slide format** in the corpus. Chunky cream name-card + portrait card + rotated handwritten sticker tag (credentials) + 4-fact grid + Q&A description card + burnt-orange pull-quote card. Packs a full profile into one slide.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` §image 63 — *nextwork/image copy 15.png*.

## Reference PNGs
- `backend/outputs/slide-references/nextwork/image copy 15.png`

## Exists? No.

## Composition
```
[bg cream #F5E8D0]
  → [name card (chunky, top-left): "Dhatri" / "Jayanth" Inter Bold ~110pt]
    // components/cards.md#make-name-card
  → [portrait card (top-right, rectangular w/ rounded corners)]
    // components/cards.md#make-portrait-card
  → [rotated sticker tag (~-5° tilt) with credentials + arrow-underline swoosh]
    // components/typography.md#make-rotated-sticker-tag
  → [4-fact grid (labelled icon+label+value cards, 4-column horizontal)]
    // components/lists.md#make-facts-grid
  → [description card (Q&A cream card with orange header)]
    // components/cards.md#make-description-card
  → [pull-quote card (burnt-orange bg + big cream quotation mark)]
    // components/cards.md#make-pull-quote-card
  → [L/R nav chevrons + 3-dot indicator]
```

## Design tokens (Spotlight sub-brand)
- `bg-cream-spotlight = #F5E8D0`
- `bg-card-cream = #F0DFB8` (name card, description card fills)
- `accent-burnt-orange = #B85A25` (headers + pull-quote bg)
- `text-on-orange-cream = #F5E8D0`
- Font: **Inter Bold + Regular** (name, labels)
- Font: **Fraunces Bold** OR **Playfair Display Bold** (pull-quote body)
- Font: **Caveat** OR **Kalam** (handwritten sticker tag)

## Copy pattern
- Name card: 2 lines (first + last name), giant Bold.
- Sticker tag: `"[credentials] · [year]"` (e.g. `"design + informatics · sophomore"`).
- 4-fact grid: each fact = icon + label (`On campus` / `Off screen` / `When they meet` / `How they meet`) + value (2-5 words).
- Description card: Q&A — `"Why [Subject]'s [thing]?"` + 20-30 word answer.
- Pull-quote: 30-40 word direct quote + attribution.

## Related
- [make-name-card](../components/cards.md#make-name-card)
- [make-portrait-card](../components/cards.md#make-portrait-card)
- [make-rotated-sticker-tag](../components/typography.md#make-rotated-sticker-tag)
- [make-facts-grid](../components/lists.md#make-facts-grid)
- [make-description-card](../components/cards.md#make-description-card)
- [make-pull-quote-card](../components/cards.md#make-pull-quote-card)

## Notes
- Combines 6 major components in one slide — highest-density in the entire corpus.
- Card fills at 2-tier lightness: cream `#F0DFB8` (info cards) + orange `#B85A25` (spotlight quote).
