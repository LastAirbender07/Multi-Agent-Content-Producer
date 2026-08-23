# List Components

List-row / chip-row / grid helpers.

**Status:** all NEW.

---

## make-editorial-list-item
**What:** Single 3-column list row: number-badge + body-text + illustration.
**Props:** `{number, bodyText, illustration, numberBadge, fontFamily: "Playfair", fontSize: 36, layout: "row"}`
**Ref:** `backend/outputs/slide-references/SahilBloom/image copy.png` — one row of items 1-4
**Used by:** aurora-editorial-list-item.

## make-editorial-list-layout
**What:** Whole list-slide: N `editorial-list-item` rows + bottom eyebrow band. Auto-adjusts row height per body length.
**Props:** `{items: [{number, bodyText, illustration}], footerEyebrow}`
**Ref:** `backend/outputs/slide-references/SahilBloom/image copy.png` — 4-item list
**Used by:** aurora-editorial-list-item.

## make-flow-verb-list
**What:** N-item numbered list w/ colour-coded bullets + inter-item **lowercase verb connectors** on vertical grey lines.
**Props:** `{items: [{number, bulletColor, name, connectorVerb?: string}], numberFont, nameFont, verbFont, connectorLineColor, x, y, itemGap}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 2.png` — 6 VPC parts w/ `split`/`direct`/`open`/`hide`/`allow` verbs
**Used by:** aurora-nextwork-body (parts-of-X legend slide), aurora-compact-step (companion legend).

## make-bulleted-recap-list
**What:** Vertically-stacked bullets w/ coloured-dot marker + Bold text. 3 bullets typical.
**Props:** `{bullets: [text], bulletColor: "#E4C93C", textColor: "#FFFFFF", bulletSize: 10, lineHeight: 1.35, x, y, width}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 22.png` — 3-bullet takeaway recap
**Used by:** aurora-nextwork-body (takeaway-recap).

## make-facts-grid
**What:** 4-column grid of small icon+label+value mini-cards. Structured metadata visualisation.
**Props:** `{facts: [{iconGlyph, label, value}], cardStyle, gap, columns: 4, x, y, width}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 15.png` — Dhatri's `On campus`/`Off screen`/`When they meet`/`How they meet`
**Used by:** aurora-nextwork-spotlight-body.

## make-use-case-chip-row
**What:** Row of dark-green rounded pills w/ mint ✓ + white label. `orientation: horizontal | vertical`, 2-3 chips.
**Props:** `{label: "use it for", chips: [{text, iconGlyph: "check"|"star"|"bolt"|"arrow"}], chipFillColor: "#1F2E1E", chipTextColor: "#FFFFFF", iconColor: "#4AC48D", gap, orientation, x, y, width}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 24.png` — `✓ sketching a new service` etc.
**Used by:** aurora-nextwork-body (level-deep-dive slides).

## make-skill-tag-row
**What:** Row of pill-tags w/ variant hierarchy. Variants:
- `variant: "hierarchical"` — 1 filled (canonical role) + N outlined (supporting keywords)
- `variant: "flat-keywords"` — all white-fill pills, equal weight
**Props:** `{tags: [{label, variant: "filled"|"outlined"}], gap, textColor, fillColor, strokeColor, radius, padding, x, y}`
**Ref:**
- `backend/outputs/slide-references/nextwork/image copy 11.png` — `Security Architect` filled + `AWS`/`Zero Trust` outlined
- `backend/outputs/slide-references/nextwork/image copy 34.png` — flat white keyword tags
**Used by:** aurora-nextwork-body (skill-deep-dive), aurora-nextwork-body (golden-paths keywords).

## make-keyword-tag-row
**What:** Flat white-fill pill row for stage-level vocabulary. Simpler variant of skill-tag-row.
**Props:** `{tags: string[], fillColor: "#FFFFFF", textColor: "#141414", radius: "pill", padding, gap}`
**Ref:** `backend/outputs/slide-references/nextwork/image copy 34.png` — `backstage` / `golden paths` / `self-service` / `scaffolder` / `portal`
**Used by:** aurora-nextwork-body (form-mockup close).

## make-categorical-legend
**What:** Small horizontal legend w/ N pill-swatch + label pairs. `swatchShape: "pill"|"square"`.
**Props:** `{items: [{swatch, label}], swatchShape, gap, itemFont, itemSize, x, y}`
**Ref:** `backend/outputs/slide-references/claude/image copy 16.png` — Work/Personal/Other pills + labels
**Used by:** aurora-product-body (stacked-100pct-bar-chart legend).
