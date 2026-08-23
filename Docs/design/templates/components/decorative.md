# Decorative Components

Art / texture / illustration primitives that add visual personality without content payload.

**Status:** all NEW.

---

## make-sticker-badge
**What:** Photorealistic sticker/medal PNG w/ optional stamped text.
**Ref:** `backend/outputs/slide-references/others/image copy 2.png` — red ribbon rosette
**Used by:** aurora-compact-badge-hook.
**Notes:** Ship ~10 sticker PNGs in `backend/assets/stickers/` + JSON metadata.

## make-doodle-registry
**What:** SVG-path registry: arrows/circles/scribbles. `backend/assets/doodles/registry.json`.
**Used by:** make-doodle-arrow, make-highlight-circle.

## make-grain-overlay
**What:** Noise texture PNG at 3-8% opacity + multiply blend.
**Ref:** `backend/outputs/slide-references/others/image copy 3.png`
**Used by:** aurora-carousel-cover-hero.

## make-metallic-gradient
**What:** Peach → beige → warm-brown radial/135° gradient.
**Ref:** `backend/outputs/slide-references/others/image copy 3.png`
**Used by:** aurora-carousel-cover-hero.

## make-silhouette-motif
**What:** Large flat-fill silhouette at 40% opacity behind text.
**Props:** `{shape: "longhorn"|custom-svg, color, opacity, x, y, w, h}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 14.png`
**Used by:** aurora-nextwork-spotlight-cover.

## make-scattered-icon-field
**What:** Scattered rounded-square icons (each = white tile w/ logo).
**Props:** `{icons, layout: "diamond"|"triangle"|"row"|"custom", tileStyle}`
**Ref:**
- `backend/outputs/slide-references/nextwork/image copy 9.png` — 7 tools
- `backend/outputs/slide-references/nextwork/image copy 16.png` — 4 job platforms
**Used by:** aurora-nextwork-cover.

## make-labelled-folder-card-row
**What:** N folder-cards side-by-side w/ Lvl-pill + name label. Visual TOC.
**Ref:** `backend/outputs/slide-references/nextwork/image copy 23.png` — 7-folder System Design
**Used by:** aurora-nextwork-cover.

## make-level-folder-card-header
**What:** Folder-icon + Lvl-pill compound. Variants: `stacked` / `overlap-bl` / `inline-right`.
**Ref:**
- `backend/outputs/slide-references/nextwork/image copy 24.png` — stacked
- `backend/outputs/slide-references/nextwork/image copy 30.png` — inline-right
**Used by:** aurora-nextwork-body.

## make-dot-progress-indicator
**What:** Row of tiny dots; N-th filled.
**Props:** `{count, activeIndex, size, gap, activeColor, dimColor}`
**Ref:** every PNG
**Used by:** every family.

## make-circular-nav-arrow
**What:** White circle + black chevron. Side-edge affordance.
**Props:** `{direction: "next"|"prev", x, y, size, fillColor, iconColor}`
**Ref:** every PNG
**Used by:** every family.

## make-editorial-header
**What:** Top or bottom eyebrow: hairline + handle L + series-title R.
**Props:** `{leftHandle, rightSeries, ruleWidth, ruleColor, position: "top"|"bottom"}`
**Ref:**
- `backend/outputs/slide-references/SahilBloom/image.png` — top
- `backend/outputs/slide-references/SahilBloom/image copy.png` — bottom
**Used by:** aurora-editorial-cover, aurora-editorial-list-item, aurora-essay-body.

## make-etched-illustration
**What:** WSJ-hedcut B&W illustration. Tiers: hero (500×500) + icon (200×200).
**Ref:** all SahilBloom slides
**Used by:** aurora-editorial-cover, aurora-editorial-list-item.
**Assets:** `backend/assets/illustrations/hedcut/` OR Midjourney prompt.

## make-illustration-diptych
**What:** 2 framed images side-by-side.
**Ref:** `backend/outputs/slide-references/SahilBloom/image copy 6.png` — frog before/after
**Used by:** aurora-essay-body.

## make-illustration-with-annotations
**What:** Single framed illustration + N on-image labels at hotspots.
**Ref:** `backend/outputs/slide-references/SahilBloom/image copy 7.png` — harbour w/ 2 CAPS labels
**Used by:** aurora-essay-body.

## make-hand-drawn-illustration-hero
**What:** Marker-line SVG hero (thick black + cream-yellow accent + wobble).
**Ref:** `backend/outputs/slide-references/claude/image copy 13.png` — Economic Index globe
**Used by:** aurora-product-cover (hand-drawn variant).

## make-portrait-strip
**What:** Strip of N B&W duotone portraits w/ coral rectangle accents.
**Props:** `{portraits, accentColor: "#D46A5E", accentWidth, height, treatment}`
**Ref:** `backend/outputs/slide-references/claude/image copy 9.png` — 3+3 portrait sandwich
**Used by:** aurora-product-cover.

## make-typography-art-hero
**What:** Pre-designed typography composition — big word + scattered smaller glyphs.
**Ref:** `backend/outputs/slide-references/claude/image copy 6.png` — `Claude` + multilingual glyphs
**Used by:** aurora-product-cover.

## make-glyph-cloud / make-multilingual-glyph-cloud
**What:** Programmatic version: central word + scattered glyphs at varied sizes/tilts.
**Notes:** Requires Noto Sans + Noto Serif for multilingual coverage.

## make-tool-card-column
**What:** Vertical/horizontal stack of tool-cards w/ logo + name + capability. Cream fill.
**Props:** `{tools, cardFillColor: "#F5F0E4", orientation, showCapabilityLine}`
**Ref:**
- `backend/outputs/slide-references/nextwork/image copy 26.png` — vertical
- `backend/outputs/slide-references/nextwork/image copy 28.png` — horizontal
**Used by:** aurora-nextwork-body.
