# aurora-nextwork-cover

**Family type:** Dark-canvas + inset card + painterly-art cover. **Phase:** 5+. **Status:** NEW.

## What
The nextwork signature — dark near-black canvas frame + inset rounded card (radius ~44px) + full-bleed AI-generated painterly cinematic artwork (vineyard, misty forest, dusk queue, bright sky-grass) + AWS icon strip (or scattered icons) + huge sans display headline + brand pill + dot indicator. 4 cover subVariants.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` §images 48, 57, 64, 71, 77.

## Reference PNGs (heroType variants)
- `backend/outputs/slide-references/nextwork/image.png` — VPC (warm vineyard, 7-icon strip)
- `backend/outputs/slide-references/nextwork/image copy 9.png` — Security Skills (cool forest, scattered)
- `backend/outputs/slide-references/nextwork/image copy 16.png` — Resume/AI (dusk queue, 4-icon scatter + inline pill)
- `backend/outputs/slide-references/nextwork/image copy 23.png` — System Design (bright sky, folder preview row)
- `backend/outputs/slide-references/nextwork/image copy 29.png` — Platform Engineer Roadmap (bright sky, salary bar chart)

## Exists? No.

## Composition
```
[dark canvas #0D0906, full-bleed]
  → [inset rounded card (radius ~44px, ~25px inset from all sides)]
    → [full-bleed painterly artwork (FabricImage clipPath)]
    → [AWS icon strip OR scattered-icon field OR folder-preview row OR bar chart]
      // components/icons.md#make-aws-icon-strip
      // components/decorative.md#make-scattered-icon-field
      // components/decorative.md#make-labelled-folder-card-row
      // components/charts.md#make-salary-bar-chart
    → [display headline (Inter Bold or Fraunces Bold ~90-140pt white)]
    → [optional inline-highlight-pill wrapping stat/keyword]
    → [brand pill OR text-only NextWork wordmark]
    → [dot progress indicator (7-11 dots)]
    → [circular nav chevron (R side, only slide 1)]
```

## Design tokens
- `bg-dark-canvas = #0D0906`
- Painterly artwork variants (per carousel):
  - warm-vineyard (VPC): golds #C89860, ambers #E4A85D
  - cool-forest (Security-Skills): fog #7A8580, deep #2A3538
  - dusk-hill (Resume/AI): purple #5A4A6B, olive #4A6B4A
  - bright-sky-grass (System Design + Platform Engineer): cerulean #4A7BC8, grass #5D9040
- Accents: `mint #4AC48D`, `warn-red #E27168`, `highlight-yellow #E4C93C`

## Fonts to add
- **Inter Bold + Regular** (procedural/how-to carousels)
- **Fraunces Bold** (concept/theoretical carousels)
- **Caveat** (annotation labels — Phase 4)

## Copy pattern
- Beginner-empathetic-question: `"How does [X] actually work?"` (VPC)
- Listicle-with-money: `"N skills that pay $X above [baseline]"` (Security-Skills)
- Statistic-hook-conditional: `"If [X], Y% of [audience] [detect]"` (Resume/AI)
- Concept-listicle: `"The N levels of [Topic]"` (System Design)

## Related
- [make-nextwork-card](../components/layouts.md#make-nextwork-card)
- [make-aws-icon-strip](../components/icons.md#make-aws-icon-strip)
- [make-scattered-icon-field](../components/decorative.md#make-scattered-icon-field)
- [make-labelled-folder-card-row](../components/decorative.md#make-labelled-folder-card-row)
- [make-brand-pill](../components/cards.md#make-brand-pill)
- [make-inline-highlight-pill](../components/typography.md#make-inline-highlight-pill)
- [make-salary-bar-chart](../components/charts.md#make-salary-bar-chart)

## Notes
- **Painterly artwork is the make-or-break asset.** Options: user-supplied per carousel, AI-image-gen with locked style prompt, or curated stock library.
- Dark-canvas + inset-card composition is the distinctive brand signature — no other creator in our reference set uses it.
