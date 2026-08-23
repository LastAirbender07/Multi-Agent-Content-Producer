# aurora-nextwork-body

**Family type:** nextwork body (20+ bodyLayout variants). **Phase:** 5+. **Status:** NEW.

## What
Body slides for nextwork carousels — same dark-canvas + inset-card + darkened-painterly-artwork shell as the cover, with a **highly-varied content zone**. 20+ documented layouts across 6 nextwork carousels.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` §images 49-85.

## bodyLayout variants (14 documented + subvariants)

| # | Variant | Reference PNG(s) |
|---|---|---|
| 1 | `concept-contrast-2-column` | `nextwork/image copy.png` |
| 2 | `numbered-list-with-flow-verbs` | `nextwork/image copy 2.png` |
| 3 | `component-deep-dive-with-console-mockup` | `nextwork/image copy 3.png`, `image copy 5.png` |
| 4 | `component-deep-dive-with-architecture-diagram` | `nextwork/image copy 4.png` |
| 5 | `component-deep-dive-with-comparison-diagram` | `nextwork/image copy 6.png` |
| 6 | `reveal-with-console-proof` | `nextwork/image copy 7.png` |
| 7 | `close-cta-with-product-mockup` | `nextwork/image copy 8.png` |
| 8 | `thesis-with-data-callout-card` | `nextwork/image copy 10.png` |
| 9 | `skill-deep-dive-with-salary-chart` | `nextwork/image copy 11.png`, `image copy 12.png`, `image copy 13.png` |
| 10 | `stat-comparison-bar-race` | `nextwork/image copy 17.png` |
| 11 | `myth-with-product-evidence` | `nextwork/image copy 18.png` |
| 12 | `stat-hook-with-product-mockup` | `nextwork/image copy 19.png` |
| 13 | `takeaway-recap-with-cta-card` | `nextwork/image copy 22.png` |
| 14 | `level-deep-dive-with-loop-diagram` (A/B/C) | `nextwork/image copy 24.png`, `image copy 25.png`, `image copy 26.png` |
| 15 | `level-deep-dive-with-tools-and-diagram` | `nextwork/image copy 28.png` |
| 16 | `level-deep-dive-with-terminal-hero` | `nextwork/image copy 30.png` |
| 17 | `level-deep-dive-with-tools-and-terminal` | `nextwork/image copy 31.png` |
| 18 | `level-deep-dive-with-dashboard-mockup` | `nextwork/image copy 32.png` |
| 19 | `level-deep-dive-with-overlapping-mockups` | `nextwork/image copy 33.png` |
| 20 | `level-deep-dive-with-form-mockup` | `nextwork/image copy 34.png` |
| 21 | `level-deep-dive-with-kpi-grid` | `nextwork/image copy 36.png` |
| 22 | `payoff-synthesis-with-cover-hero-reprise` | `nextwork/image copy 37.png` |

## Exists? No.

## Composition (generic)
```
[dark canvas #0D0906]
  → [inset rounded card]
    → [darkened painterly artwork (from cover, 40% brightness for dark-cinematic sub-brand
        OR full-brightness for Platform Engineer Roadmap variant)]
    → [OPTIONAL top hero: mockup / diagram / chart / grid / KPI]
    → [level-folder-card + level-pill header (or component title row)]
    → [Fraunces Serif or Inter Bold title]
    → [title underline rule (mint OR match-folder OR match-title)]
    → [body paragraph (Inter Bold or Regular ~30-40pt)]
    → [optional use-case chip row / keyword tag row / bulleted recap]
    → [L/R nav chevrons + dot indicator]
```

## Design tokens
- Same as [aurora-nextwork-cover](aurora-nextwork-cover.md)
- Level colours (carousel-locked contract):
  - Lvl 1 = `#B8D0E8` blue (universal — cross-carousel)
  - Lvl 2 = `#A8DDC8` mint
  - Lvl 3 = `#F0E098` butter-yellow (System Design) OR `#B8D048` yellow-green (Platform Engineer)
  - Lvl 4-6 = per-carousel
  - Lvl 7 = `#141414` black (universal cross-carousel "mastery")

## Related
- All the components — [components/README](../components/) covers nextwork's ~50 primitives.
- Especially: [make-terminal-mockup](../components/mockups.md#make-terminal-mockup), [make-dashboard-mockup-card](../components/mockups.md#make-dashboard-mockup-card), [make-form-mockup-card](../components/mockups.md#make-form-mockup-card), [make-vpc-boundary-box](../components/diagrams.md#make-vpc-boundary-box), [make-load-balancer-fanout-diagram](../components/diagrams.md#make-load-balancer-fanout-diagram).
