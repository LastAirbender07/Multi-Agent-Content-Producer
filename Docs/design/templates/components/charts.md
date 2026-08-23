# Chart Components

Data-viz primitives. All hand-composed in Fabric (not chart libraries) for pixel control + no runtime deps.

**Status:** all NEW.

---

## make-salary-bar-chart
**What:** N-bar vertical chart w/ value-above + category-below + horizon rule. Painterly-cover integration.
**Props:** `{bars: [{label, value, formattedLabel}], baselineY, barColor: "#D4A845", valueLabelFont, categoryLabelFont, horizonRuleColor}`
**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 23.png` — cover, entry/typical/senior
- `backend/outputs/slide-references/nextwork/image copy 37.png` — payoff-synthesis (same chart, larger)
**Used by:** aurora-nextwork-cover (listicle-with-bar-chart), aurora-nextwork-body (payoff-synthesis).

## make-compact-bar-chart
**What:** 2-3 row horizontal-bar comparison. Row = label + coloured bar + value on right.
**Props:** `{rows: [{label, value, valueFormatter, barColor, maxValue}], barHeight, labelWidth, x, y, width}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 11.png` — This-skill vs Tech-average
**Used by:** aurora-compact-rating, aurora-nextwork-body (skill-deep-dive).

## make-stat-comparison-bars
**What:** Labelled bar-race w/ time-frame accent word. Yellow-active + grey-baseline bars.
**Props:** `{rows: [{label, value, bar: {color, strokeColor?, widthRatio}}], activeIndex, y, x, width}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 17.png` — LinkedIn 11,000 vs 7,600
**Used by:** aurora-nextwork-body (bar-race).

## make-progress-bar-stat
**What:** Single horizontal capsule bar w/ %-filled + matching-colour caption.
**Props:** `{label, percent, fillColor: "#E4C93C", remainderColor: "#7A7A7A", labelColor: match-fill, cardHeight, cornerRadius, x, y, width}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 21.png` — `72% of recruiting leaders now interview in person`
**Used by:** aurora-compact-rating, aurora-nextwork-body.

## make-schematic-bar-chart
**What:** Hand-composed comparative bars w/ concept labels (not data-driven). Includes reference dashed lines, group headers, sub-captions.
**Props:** `{groups: [{header, bars: [{height, isHighlight, label}], caption: {primary, secondary}}], referenceLine: {yValue, label, dashPattern, color}, groundLine: true}`
**Ref PNGs:** `backend/outputs/slide-references/SahilBloom/image copy 5.png` — Frog-Pond effect chart
**Used by:** aurora-essay-body (schematicChart embed).

## make-spectrum-chart
**What:** 4-axis pole-vs-pole diagram inside a rounded white card. Each row = left pill + double-headed arrow + right pill + descriptors.
**Props:** `{axes: [{leftLabel, rightLabel, leftDescriptor, rightDescriptor, leftPillFill, rightPillFill}], x, y, width, height, cardFill, cardRadius}`
**Ref PNGs:** `backend/outputs/slide-references/claude/image copy 7.png` — 4-axis Anthropic values
**Used by:** aurora-product-body (spectrum-chart).

## make-axis-shift-chart
**What:** Per-instance shift chart w/ signed σ magnitudes, coloured pills at line tips.
**Props:** `{centralAxis: {xPosition, verticalRange}, ticks: [{value, label}], rows: [{leftLabel, shiftLabel, shiftValue, direction: "left"|"right", palette}], unit}`
**Ref PNGs:** `backend/outputs/slide-references/claude/image copy 8.png` — Hindi language shifts
**Used by:** aurora-product-body (axis-shift-chart).

## make-stacked-100pct-bar-chart
**What:** Grouped rows of 100%-stacked horizontal bars. Only highlight-category segments carry inline % labels.
**Props:** `{categories: [{key, label, color}], highlightCategory, groups: [{label, rows: [{label, segments: {[key]: pct}}]}], barConfig: {totalWidth, height, cornerRadius, inlineLabelOn}}`
**Ref PNGs:** `backend/outputs/slide-references/claude/image copy 16.png` — country personal-usage bars
**Used by:** aurora-product-body (stacked-100pct-bar-chart).

## make-treemap
**What:** Rectangular treemap w/ N cells sized proportional to values + labels + values inside each cell.
**Props:** `{cells: [{label, value, color}], layoutAlgorithm: "soft-grid"|"squarified", cellGap, cornerRadius, labelStyle, valuePosition, x, y, w, h}`
**Ref PNGs:** `backend/outputs/slide-references/claude/image copy 17.png` — US usage-category treemap
**Used by:** aurora-product-body (treemap).

## make-state-cartogram
**What:** US-states (or country) cartogram — grid of rounded-square tiles w/ 2-letter labels + 5-step colour scale + legend.
**Props:** `{region: "us"|"eu"|"india", tiles: [{code, value}], colorScale: "mint-5-step"|custom, tileSize, tileGap, tileRadius}`
**Ref PNGs:** `backend/outputs/slide-references/claude/image copy 15.png` — US states usage heatmap
**Used by:** aurora-product-body (state-heatmap-grid).

**Notes:** Requires a **tile-layout dictionary per region** — ship as JSON in `backend/assets/cartograms/`.

## make-figure-row-with-anomaly
**What:** N flat-vector figures in a row w/ 1 highlighted in accent colour + optional label under anomaly.
**Props:** `{totalFigures, anomalyIndex, defaultColor: "#F0EAD8", anomalyColor: "#E4C93C", anomalyLabel?, figureShape: "person"|"square"|"circle", size, gap, tilt?: {angle, target}}`
**Ref PNGs:** `backend/outputs/slide-references/nextwork/image copy 20.png` — 4 figures w/ yellow "fake"
**Used by:** aurora-compact-visual-stat.
