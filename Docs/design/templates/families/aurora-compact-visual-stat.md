# aurora-compact-visual-stat

**Family type:** Body — icon-based stat. **Phase:** 4. **Status:** NEW.

## What
Row of icons (people / squares / other flat figures) with 1 highlighted (colour-coded anomaly) — visualises "1 in N" or "X of Y" stats. HUGE stat headline below. Iconographic-metaphor teaching.

**Sources:**
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 20.png* (image 68) — 4 stick-figures with 1 yellow highlighted "fake"
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 4.png* (image 27) — big grey vs coral stat

## Reference PNGs
- `backend/outputs/slide-references/nextwork/image copy 20.png`
- `backend/outputs/slide-references/claude/image copy 4.png`

## Exists? No. Net new.

## Composition
```
[bg-cream #F5F0E8]
  → [icon row (top, y≈80-290)]                     // components/charts/make-figure-row-with-anomaly.md
    - N flat-vector figures (people / squares / circles)
    - 1 highlighted in accent colour (yellow #E4C93C or coral)
    - Small label "fake" (or similar) directly beneath the anomaly
  → [HUGE stat headline (y≈530-770)]                 // Inter Bold ~80pt, near-black
  → [attribution / italic body (y≈810)]              // Inter Italic ~20pt
  → [citation line (y≈900)]                          // components/typography/make-monospace-label.md
  → [brand pill + dot indicator]
```

## Design tokens
- `bg-cream = #F5F0E8`, `ink-primary = #1B1B1B`
- Anomaly colours: `#E4C93C` yellow (attention), `#D46A5E` coral (featured), `#E27168` warn-red (danger)

## Copy pattern
- Stat headline: `"[Authority] expects [stat] [subject] to be [descriptor] by [year]"` OR `"[X%] of [audience] [action]"`
- Anomaly label: 1 word, matches accent colour (`fake`, `wins`, `at risk`).
- Citation: `[Source Name, Year Report]` + optional definition-context line.

## Related
- [make-figure-row-with-anomaly](../components/charts/make-figure-row-with-anomaly.md)
- [make-citation-with-context-line](../components/typography/make-monospace-label.md)
- [make-brand-pill](../components/cards/make-brand-pill.md)

## GAN
- Content-zone diff ≤ 5 % vs `nextwork/image copy 20.png`.

## Notes
- Figure count: 4-10 total for "1 in N" ratios. Never use for large denominators (1 in 100).
- Anomaly figure can have slight tilt (~5°) for humanising touch.
