# aurora-compact-rating

**Family type:** Body — REVIEW criterion + score. **Phase:** 4. **Status:** NEW.

## What
One criterion per slide: criterion name (top-left, 40pt bold sans) + huge display score (140pt Syne Bold, e.g. "4.2/5") + thin score-bar (mint fill percentage-scaled) + 1-sentence verdict.

**Sources:** synthesised from `claude/image copy 4.png` (image 27) two-stat comparison pattern + `nextwork/image copy 11.png` (image 59) salary-bar chart.

## Reference PNGs
- `backend/outputs/slide-references/claude/image copy 4.png`
- `backend/outputs/slide-references/nextwork/image copy 11.png` — compact bar chart reference

## Exists? No. Net new.

## Composition
```
[bg-cream]
  → [criterion name (top-left, 40pt Inter Bold)]
  → [big score "4.2/5" (centre, 140pt Syne Bold, near-black)]
  → [thin score-bar (10px tall, rounded pill, mint fill %-scaled)]  // components/charts/make-progress-bar-stat.md
  → [verdict body (1 sentence, 24pt Inter Regular)]
  → [brand pill + dot indicator]
```

## Design tokens
- `bg-cream = #F5F0E8`, `ink-primary = #1B1B1B`, `accent-mint = #4AC48D`
- Font: **Syne Bold** (already loaded) — big score
- Font: **Inter Bold + Regular**

## Copy pattern
- Criterion: 1–3 words (`Battery`, `Camera`, `Value for money`).
- Score: `X.Y/Z` format — `4.2/5`, `88/100`, `8.6/10`.
- Verdict: 1 sentence, 15-25 words, plain-language rationale.

## Related components
- [make-progress-bar-stat](../components/charts/make-progress-bar-stat.md)
- [make-brand-pill](../components/cards/make-brand-pill.md)
