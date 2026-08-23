# aurora-product-body

**Family type:** Anthropic-style product body (11+ bodyLayout variants). **Phase:** 5+. **Status:** NEW.

## What
"Swiss-army knife" body template for Anthropic product carousels. Same chrome + **pluggable content zone** that swaps between 11+ layouts.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 24-47.

## bodyLayout variants

| Variant | Reference PNG |
|---|---|
| `single-hero` | `claude/image copy.png`, `image copy 2.png`, `image copy 5.png` |
| `thumbnail-grid` | `claude/image copy 3.png` |
| `stat-comparison` | `claude/image copy 4.png` |
| `spectrum-chart` | `claude/image copy 7.png` |
| `axis-shift-chart` | `claude/image copy 8.png` |
| `pull-quote` | `claude/image copy 10.png`, `image copy 11.png` |
| `stacked-quotes` | `claude/image copy 12.png` |
| `prose-only` | `claude/image copy 14.png` |
| `state-heatmap-grid` | `claude/image copy 15.png` |
| `stacked-100pct-bar-chart` | `claude/image copy 16.png` |
| `treemap` | `claude/image copy 17.png` |

## Reference PNGs (subset)
- `backend/outputs/slide-references/claude/image copy.png` — annotated protein render
- `backend/outputs/slide-references/claude/image copy 4.png` — stat comparison
- `backend/outputs/slide-references/claude/image copy 10.png` — pull-quote
- `backend/outputs/slide-references/claude/image copy 15.png` — states cartogram
- `backend/outputs/slide-references/claude/image copy 17.png` — treemap

## Exists? No.

## Composition
```
[bg warm off-white / stone / cream / pale-blue]
  → [optional top section-heading]
  → [content zone — bodyLayout-dependent]
  → [optional closing serif finding (Fraunces Medium ~34-40pt)]
  → [L/R nav chevrons + dot indicator]
```

## Design tokens (semantic categorical palettes)
- **Pastel-5:** rose #B58C97, lime #DDE49E, lavender #B7BEDE, terracotta #C97F5F, slate #8EA0C0
- **Mint-5 sequential (heatmap):** #DDE8DD → #B8D4B8 → #8FB897 → #5F9772 → #3C6E4F
- **3-category (Work/Personal/Other):** lavender #A9AEDC, forest #3E6B4F, sage #C7D68A

## Related
- [make-product-body-slide](../components/layouts.md#make-product-body-slide)
- [make-illustration-with-annotations](../components/decorative.md#make-illustration-with-annotations)
- [make-spectrum-chart](../components/charts.md#make-spectrum-chart)
- [make-axis-shift-chart](../components/charts.md#make-axis-shift-chart)
- [make-pull-quote-card](../components/cards.md#make-pull-quote-card)
- [make-state-cartogram](../components/charts.md#make-state-cartogram)
- [make-stacked-100pct-bar-chart](../components/charts.md#make-stacked-100pct-bar-chart)
- [make-treemap](../components/charts.md#make-treemap)
- [make-portrait-cutout](../components/cards.md#make-portrait-cutout)
