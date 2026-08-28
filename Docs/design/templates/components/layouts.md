# Layout Composers

High-level composers that glue primitives into a full family template. These are the "outer builders" that take content JSON and lay out the whole slide.

**Status:** all NEW.

---

## make-comparison-layout
**What:** 2-column skeleton w/ thin central divider. Left + Right groups.
**Props:** `{left: FabricGroup, right: FabricGroup, bg, dividerColor, dividerWidth, columnPadding}`
**Ref:** `backend/outputs/slide-references/others/image copy.png` — Millennial vs Gen Z 50/50
**Used by:** aurora-compact-comparison.

## make-image-pair
**What:** 2 images side-by-side within a group, matched sizing + optional drop shadow.
**Props:** `{leftUrl, rightUrl, gap: 20, shadow}`
**Ref:** `backend/outputs/slide-references/others/image copy.png` — 2 handbags per column
**Used by:** aurora-compact-comparison (image-pair-per-side variant).

## make-section-block
**What:** One section block: heading (serif teal) + body (sans charcoal) OR bullet list. Multiple stacked with hairline rule dividers.
**Props:** `{heading, body OR listItems, headingColor: "#1E4B4B", ruleColor: "#B5A990", ruleWidth, gapAbove, gapBelow}`
**Ref:** `backend/outputs/slide-references/others/image copy 8.png` — trend-brief 3-section right column
**Used by:** aurora-trend-brief.

## make-vertical-content-brief
**What:** Whole 2-column trend-brief layout: top headline + left phone mockup + right N section-blocks separated by hairline rules.
**Props:** `{topHeadline, phoneMockup, sections: [{heading, body|bullets}]}`
**Ref:** `backend/outputs/slide-references/others/image copy 8.png` through `image copy 10.png`
**Used by:** aurora-trend-brief.

## make-editorial-body-slide
**What:** SahilBloom essay-body composer: eyebrow + prose stack + pluggable embed + optional footer.
**Props:** `{eyebrowTop, prose: [paragraphs], embedComponent, prose2?, navArrows}`
**Used by:** aurora-essay-body.

## make-essay-body-slide
**Alias of** make-editorial-body-slide.

## make-product-cover-slide
**What:** Anthropic-style cover composer: bg + hero (heroType-dependent) + optional monospace label + optional kicker + display headline + optional subtitle + nav chevron + dot indicator.
**Props:** `{heroImage, technicalLabel?, seriesEyebrow?, displayHeadline, subtitle?, navArrow, dotIndicator, bg}`
**Ref:** `backend/outputs/slide-references/claude/image.png`
**Used by:** aurora-product-cover.

## make-product-body-slide
**What:** Anthropic-style body composer: bg + optional top section-heading + pluggable content zone (11+ bodyLayout variants) + optional closing serif finding + nav chevrons + dot indicator.
**Props:** `{topSectionHeading?, contentZone, closingFinding?, headingPosition: "above"|"below", chrome}`
**Used by:** aurora-product-body.

## make-annotated-example
**What:** Post-inside-a-post wrapper: photo bg + mocked IG post card + italic-serif caption below + chevrons + dot indicator.
**Props:** `{photoBg, cardChildren, captionHeadline, captionBody, activeDot, dotCount}`
**Ref:** `backend/outputs/slide-references/others/image.png`
**Used by:** aurora-annotated-example.

## make-nextwork-card
**What:** Whole nextwork card composition: dark canvas + inset rounded card + painterly artwork inside + AWS icon strip (or scattered/folder-preview/bar-chart) + display headline + brand pill + chevron + dot indicator.
**Props:** `{paintingUrl, heroContent: {type: "icon-strip"|"scatter"|"folder-preview"|"bar-chart", data}, displayHeadline, brandPill, chevron, dotIndicator, cardInset: 25, cardRadius: 44}`
**Ref:** all `backend/outputs/slide-references/nextwork/*.png` covers
**Used by:** aurora-nextwork-cover.

## make-white-card-with-straddling-title
**Status:** NEW. **Composite** — bundles a white rounded card + a smaller titled chip that straddles the card's top edge (chip centre-Y sits exactly on the card's top-Y). Used as the shell for `aurora-carousel-cover-hero`. Reject any usage that inlines the card and chip separately.

**Why a composite?**  The card + straddling chip is a strongly-coupled visual unit — the chip's fill colour is bound to the outer background, its centre-Y is bound to the card's top-Y, its width is a ratio of the card's width. Passing these as two independent objects to a template causes drift (chip floats above the card, chip too wide, chip fills white, etc.). A composite enforces the invariant.

**Props:**
```ts
{
  // Card shell
  cardX: number, cardY: number,   // top-left of the card
  cardWidth: number,              // typically 0.9 * canvasWidth
  cardHeight: number,             // typically 0.9 * canvasHeight
  cardFill: "#FFFFFF",
  cardRadius: 48,
  cardShadow?: { y: 8, blur: 24, opacity: 0.20 },

  // Straddling title chip
  chipText: string,               // e.g. "Fake Post"
  chipFillColor: string,          // MUST equal the outer-bg mid-tone (e.g. "#D0BFA0")
  chipStrokeColor: "#1B1B1B",
  chipStrokeWidth: 3,
  chipHeight: 64,
  chipWidthRatio: 0.2,            // 1/5 of cardWidth; clamped to [0.15, 0.30] internally
  chipCornerRadius: 32,           // pill / rounded rect
  chipFontFamily: "Inter",
  chipFontWeight: 700,
  chipFontSize: 28,
  chipTextColor: "#1B1B1B",
}
```

**Contract (must be enforced by the builder, not the caller):**
- `chip.centerY === card.y` (the chip's vertical centre sits on the card's top edge).
- `chip.width === card.width * chipWidthRatio` (recomputed if `chipWidthRatio` changes).
- `chip.width` is clamped to `[card.width * 0.15, card.width * 0.30]` — the caller cannot make the chip wider than 30% of the card.
- The chip is rendered **above** the card in Z-order.
- The chip's fill is passed by the outer template — this composite does not know the outer bg colour, but it accepts the value and does not modify it.

**Return value:** A single `FabricGroup` containing `[cardShadowRect, cardRect, chipRect, chipText]` so the caller can position and animate it as one unit.

**Ref PNGs:**
- `backend/outputs/slide-references/others/image copy 3.png` — chip: "Fake Post"
- `backend/outputs/slide-references/others/image copy 4.png` — chip: "Google Trick" (illustrative)

**Used by:** `aurora-carousel-cover-hero`.

---

## Layout composer conventions

1. **Consumers pass content JSON, not Fabric objects.** Composer instantiates primitives.
2. **Composers own `canvas.backgroundColor`.** Never let a primitive set it.
3. **Font loading** happens ONCE via `loadFonts()` singleton (existing pattern in `renderer_entry.ts`).
4. **All measurements at 1080×1350 base.** Renderer scales via `devicePixelRatio` for retina.
5. **IG safe-zone respect:** the master plan mandates top ≥ 220 px and bottom ≤ 1170 px for critical elements. Composers should honour this even when reference PNGs don't.
