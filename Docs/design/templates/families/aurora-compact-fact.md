# aurora-compact-fact

**Family type:** Body slide — revelation / single-stat / fact card.
**Phase:** 2 (core). **Status:** NEW.

## What is it?

A body slide that presents **one fact or revelation per slide** — a big-number stat or a single sentence claim, with tiny attribution. Extreme "one idea per slide" discipline: ≤ 15 words + optional 1-line source.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 4.png* (image 27) — `10-15%` / `22-35%` stat-comparison
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *others/image copy.png* verbatim body copy pattern
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 10.png* (image 58) — `$112,521` stat-callout card

## Reference PNGs

- `backend/outputs/slide-references/claude/image copy 4.png` — `10-15% → 22-35%` two-stat contrast on cream
- `backend/outputs/slide-references/nextwork/image copy 10.png` — `$112,521` stat callout with description
- `backend/outputs/slide-references/others/image copy 4.png` — headline + body pair on cream card

## Does it already exist?

**No.** Related: `aurora_stat.ts` (extended family) uses dense chart layouts; this compact variant is a stripped-back "1 stat, 1 attribution" slide.

## Composition

```
[bg-cream #F5F0E8]
  → [big-stat text (left-aligned, y≈120–340)]           // components/typography/make-mixed-weight-text.md
    - Inter Black ~156 pt
    - Two-stat mode: muted-grey #B8B0A5 (baseline) then coral #D46A5E (highlight)
  → [caption text (y≈380)]                              // Inter Regular ~30pt, INK_BLACK
  → [claim/body (y≈600–850)]                            // Inter Bold ~40pt, 2-3 lines
  → [tiny attribution (y≈1100)]                         // Inter Regular ~24pt italic
  → [brand pill (bottom-left)]                          // components/cards/make-brand-pill.md
  → [dot progress indicator (bottom-centre)]
```

## Design tokens

- `bg-cream = #F5F0E8`
- `ink-primary = #1B1B1B`
- `ink-muted = #B8B0A5` (baseline stat)
- `accent-coral = #D46A5E` (highlight stat)
- Font: **Inter Black** (display stat) + **Inter Regular/Bold** (body)

## Fonts to add

Same as `aurora-compact-hook` — Inter family + Playfair Italic Bold.

## Copy pattern

- Big stat: `"[+/-][X%]"` or `"$[N]k"` — must fit visually as a display headline.
- Optional pair: `[baseline stat, muted] → [highlight stat, coral]` (mimics `10-15%` → `22-35%` Anthropic pattern).
- Caption: descriptor of what the stat measures, ≤ 5 words.
- Body claim: 1–2 sentences, ≤ 20 words total. First = fact, second = implication.
- Attribution: `"[Source, Year Report]"`, italic, tiny.

## GAN verification

- Content-zone diff ≤ 5 % vs `claude/image copy 4.png` (two-stat comparison).
- Content-zone diff ≤ 5 % vs `nextwork/image copy 10.png` (single-stat callout).

## Related components

- [make-stat-callout-card](../components/cards/make-stat-callout-card.md)
- [make-mixed-weight-text](../components/typography/make-mixed-weight-text.md)
- [make-brand-pill](../components/cards/make-brand-pill.md)

## Notes

- Variants: `single-stat` vs `two-stat-comparison`. LLM writer emits `variant: "single" | "compare"` and populates 1 or 2 stat blocks accordingly.
- Coral is nextwork/claude's semantic "attention / featured value" — same colour serves both brand systems.
