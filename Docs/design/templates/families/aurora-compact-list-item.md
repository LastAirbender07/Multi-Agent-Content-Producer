# aurora-compact-list-item

**Family type:** Body slide — one ranked list item.
**Phase:** 2 (core). **Status:** NEW.

## What is it?

**One list item per slide** (or 3–5 items stacked). Left column = outlined-circle number badge; middle column = item name + 1-line description; right column = optional icon or etched illustration. Editorial book-page vibe.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *SahilBloom/image copy.png* (image 13) — numbered advice items
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *SahilBloom/image copy 2.png* (image 14) — items 9-12
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 2.png* (image 50) — 6-item flow-verb list

## Reference PNGs

- `backend/outputs/slide-references/SahilBloom/image copy.png` — items 1-4 with etched icons
- `backend/outputs/slide-references/SahilBloom/image copy 2.png` — items 9-12 with etched icons

## Does it already exist?

**No.** Net new.

## Composition

```
[bg-cream #F3ECD8]  // SahilBloom cream (warmer than default compact bg)
  → Per row (3-5 rows stacked vertically):
    [numbered outlined-circle badge (x=55, ~60px dia)]  // components/icons/make-number-badge.md
    [item body-text (x=145-740, ~600px wide)]           // Playfair Display Regular ~36pt
    [etched icon (x=760-1040, ~200px)]                  // components/decorative/make-etched-illustration.md
  → [bottom editorial header]                            // components/decorative/make-editorial-header.md
    - hairline rule + @handle + series-title
```

## Design tokens

- `bg-cream-warm = #F3ECD8`
- `ink-primary = #1B1B1B`
- Font: **Playfair Display Regular** (list item body copy) — book-editorial
- Font: **Playfair Display Italic** (eyebrow handle)

## Fonts to add

- **Playfair Display Regular + Italic** (NEW)

## Copy pattern

- Item body: `"[Imperative rule]. [Explanation with subordinate clauses]."` — first sentence is the rule, second elaborates. 3–20 words. Variable-length OK (item 2 might be 5 words, item 4 might be 26 words).
- Optional quote-wrapping around a testimonial phrase.
- Voice: first-person authoritative + warm essayistic. No emoji, no ALL-CAPS.

## Related components

- [make-number-badge](../components/icons/make-number-badge.md) (outlined variant)
- [make-editorial-list-item](../components/lists/make-editorial-list-item.md)
- [make-etched-illustration](../components/decorative/make-etched-illustration.md)
- [make-editorial-header](../components/decorative/make-editorial-header.md)

## GAN verification

- Content-zone diff ≤ 5 % vs `SahilBloom/image copy.png`.
- Etched illustration style match — Loop 3 A/B check on `#1B1B1B` on `#F3ECD8` cream.

## Notes

- **Etched illustration is the make-or-break asset.** Options: (1) commission library, (2) AI-image-gen with locked "WSJ hedcut" prompt, (3) prompt-engineer Midjourney/DALL-E. Recommend hybrid: 10 commissioned + long-tail prompt-engineered.
- Item count: 3–5 per slide (auto-adjusts row height + font size).
- Justified vs left-aligned: SahilBloom uses left-aligned ragged-right (verified after initial mistake).
