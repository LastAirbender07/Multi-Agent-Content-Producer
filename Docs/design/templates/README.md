# Templates & Components Catalog

> **Purpose:** One markdown file per **new Fabric.js template or reusable component** for the editor / renderer.
> **Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` (images 1–47), `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` (images 48–85).
> **Convention:** each entry links to (a) analysis-doc section, (b) reference PNG paths under `backend/outputs/slide-references/` for GAN diff.

---

## How to read this catalog

Each entry answers 4 questions:

1. **What is it?** — description + which analysis section documents it.
2. **Where does it come from?** — reference PNG paths.
3. **Does it already exist?** — is it in `frontend/utils/canvasTemplates/`, or net-new?
4. **How do we know we shipped it right?** — primitives, tokens, fonts + GAN reference PNGs.

**Status:** `NEW` / `EXTEND` / `EXISTS`.

---

## Template families

### Phase 2 core (5 highest-value compact templates)

| Family | Slide types | Source | Status |
|---|---|---|---|
| [aurora-compact-hook](families/aurora-compact-hook.md) | Cover / hook | others/, SahilBloom/, claude/ | NEW |
| [aurora-compact-fact](families/aurora-compact-fact.md) | Revelation, single stat | others/, claude/ | NEW |
| [aurora-compact-step](families/aurora-compact-step.md) | Tutorial step | others/, nextwork/ | NEW |
| [aurora-compact-list-item](families/aurora-compact-list-item.md) | Ranked list item | SahilBloom/, others/ | NEW |
| [aurora-compact-quote](families/aurora-compact-quote.md) | Pull-quote (terracotta) | claude/, SahilBloom/ | NEW |

### Phase 4 remaining compact

| Family | Source | Status |
|---|---|---|
| [aurora-compact-comparison](families/aurora-compact-comparison.md) | others/image copy.png, nextwork/image copy.png | NEW |
| [aurora-compact-rating](families/aurora-compact-rating.md) | Synth. of claude/image copy 4.png | NEW |
| [aurora-compact-photo-caption](families/aurora-compact-photo-caption.md) | others/image copy 2.png, claude/image copy 2.png | NEW |
| [aurora-compact-annotated-shot](families/aurora-compact-annotated-shot.md) | nextwork/image copy 5.png, claude/image copy.png | NEW |
| [aurora-compact-visual-stat](families/aurora-compact-visual-stat.md) | nextwork/image copy 20.png, claude/image copy 4.png | NEW |

### Phase 5+ advanced families

| Family | Source | Status |
|---|---|---|
| [aurora-compact-zoom-hook](families/aurora-compact-zoom-hook.md) | others/image.png | NEW |
| [aurora-compact-badge-hook](families/aurora-compact-badge-hook.md) | others/image copy 2.png | NEW |
| [aurora-carousel-cover-hero](families/aurora-carousel-cover-hero.md) | others/image copy 3.png–image copy 7.png | NEW |
| [aurora-reel-cover](families/aurora-reel-cover.md) | others/image copy 3.png, image copy 5.png | NEW (deferred) |
| [aurora-trend-brief](families/aurora-trend-brief.md) | others/image copy 8.png–image copy 10.png | NEW |
| [aurora-annotated-example](families/aurora-annotated-example.md) | others/image.png–image copy 7.png | NEW |
| [aurora-editorial-cover](families/aurora-editorial-cover.md) | SahilBloom/image.png, image copy 4.png, image copy 9.png | NEW |
| [aurora-editorial-list-item](families/aurora-editorial-list-item.md) | SahilBloom/image copy.png, image copy 2.png | NEW |
| [aurora-editorial-quote-tweet](families/aurora-editorial-quote-tweet.md) | SahilBloom/image copy 3.png | NEW |
| [aurora-essay-body](families/aurora-essay-body.md) | SahilBloom/image copy 5.png–image copy 10.png | NEW |
| [aurora-product-cover](families/aurora-product-cover.md) | claude/image.png, image copy 6.png, image copy 9.png, image copy 13.png | NEW |
| [aurora-product-body](families/aurora-product-body.md) | claude/image copy.png–image copy 17.png | NEW |
| [aurora-nextwork-cover](families/aurora-nextwork-cover.md) | nextwork/image.png, image copy 9.png, image copy 22.png, image copy 23.png, image copy 29.png | NEW |
| [aurora-nextwork-body](families/aurora-nextwork-body.md) | nextwork/image copy.png–image copy 37.png | NEW |
| [aurora-nextwork-spotlight-cover](families/aurora-nextwork-spotlight-cover.md) | nextwork/image copy 14.png | NEW |
| [aurora-nextwork-spotlight-body](families/aurora-nextwork-spotlight-body.md) | nextwork/image copy 15.png | NEW |

---

## Components (shared primitives)

Components are **consolidated per group** — each group MD contains a section per primitive. This is more sustainable than one file per component.

- [**Typography**](components/typography.md) — mixed-weight text, pills (outlined, inline-highlight, framing-label, progress-counter, status), title-underline, section-label, handwritten annotation, rotated sticker tag, monospace label
- [**Cards**](components/cards.md) — brand pill, URL CTA pill, name card, portrait card, avatar chip, portrait cutout, description card, pull-quote card, brand CTA card, stat callout card, torn paper card, framed illustration
- [**Mockups**](components/mockups.md) — AWS console, browser window, terminal, dashboard, KPI grid, form, iMessage, calendar, IG post chrome, tweet slide, verified badge, overlapping mockup pair, mockup chrome, **tilted phone mockup (iPhone slot with tilt + overlay cards)**, **tilted image pair (Google-variant 2-image stack)**
- [**Charts**](components/charts.md) — salary bar, compact bar, stat comparison bars, progress bar stat, schematic bar, spectrum, axis shift, stacked-100%-bar, treemap, state cartogram, figure-row-with-anomaly
- [**Diagrams**](components/diagrams.md) — VPC boundary, concept contrast, client-server loop, load balancer fanout, request flow comparison, architecture flow, app tree, labelled box, tree fanout connector, L-shape connector, doodle arrow, hand-drawn callout arrow, highlight circle
- [**Decorative**](components/decorative.md) — sticker badge, doodle registry, grain overlay, metallic gradient, silhouette motif, scattered icon field, labelled folder card row, level folder card header, dot progress indicator, circular nav arrow, editorial header, etched illustration, illustration diptych, illustration with annotations, hand-drawn illustration hero, portrait strip, typography art hero, glyph cloud, multilingual glyph cloud, tool card column
- [**Icons**](components/icons.md) — AWS icon strip, AWS icon registry, resource mini card, topic badge, nextwork globe icon, company logo card row, number badge
- [**Lists**](components/lists.md) — editorial list item, editorial list layout, flow verb list, bulleted recap list, facts grid, use case chip row, skill tag row, keyword tag row, categorical legend
- [**Layouts**](components/layouts.md) — comparison layout, image pair, section block, vertical content brief, editorial body slide, essay body slide, product cover slide, product body slide, annotated example, nextwork card, **white card with straddling title chip (composite for `aurora-carousel-cover-hero`)**

---

## Extension rule for new primitives

Before inventing a new Fabric.js primitive:

1. Search `components/*/` for an existing one (or one that extends via `variant:` prop).
2. If a match exists, extend its MD.
3. Only if no match exists, add a new component MD + primitive.

---

## Roadmap alignment

`Docs/phases/MASTER_PLAN_multi_format.md` lists **which families ship in which phase**. This catalog is the descriptor; the master plan is the schedule.

