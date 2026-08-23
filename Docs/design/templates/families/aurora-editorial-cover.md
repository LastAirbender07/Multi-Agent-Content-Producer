# aurora-editorial-cover

**Family type:** Editorial book-page cover (SahilBloom style). **Phase:** 4/5. **Status:** NEW.

## What
Cream bg + serif hook + BW etched illustration + top eyebrow band (@handle + series title) + "Swipe for more>>" pill + dot indicator. Two subVariants: `text-hero` and `illustrated-frame`.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 12, 16, 21.

## Reference PNGs
- `backend/outputs/slide-references/SahilBloom/image.png` — text-hero
- `backend/outputs/slide-references/SahilBloom/image copy 4.png` — illustrated-frame ("Frog Pond Effect")
- `backend/outputs/slide-references/SahilBloom/image copy 9.png` — illustrated-frame ("Why Are You In Such A Rush?")

## Exists? No.

## Composition
```
[bg cream #F3ECD8, flat]
  → [top eyebrow band]                          // components/decorative.md#make-editorial-header
    - Hairline rule + @handle (italic serif L) + series-title (italic serif R)
  → [display title: 3-word serif ~180pt with optional italic-serif emphasis word]
    // components/typography.md#make-mixed-weight-text
  → [subtitle: single line, muted-brown or black]
  → [framed etched illustration]                  // components/decorative.md#make-framed-illustration
  → [circular nav arrow (R side)]
  → [swipe-for-more sticker + teaser "(EVERYONE NEEDS TO READ THIS)"]
  → [dot progress indicator (7-8 dots)]
```

## Design tokens
- `bg-cream = #F3ECD8`
- `ink-black = #1B1B1B`
- `ink-muted-brown = #8A7B6E`
- Font: **Playfair Display Bold + Regular + Italic** (or **Fraunces Bold**)

## Copy pattern
- Title formula: `"[Metaphor Title (2-4 words)]"` with ONE emphasis word in italic serif.
- Subtitle: counter-intuitive framing `"Why X Feels Like Y"`.
- Teaser: `(ALL CAPS ATTENTION HOOK)`.

## Related
- [make-editorial-header](../components/decorative.md#make-editorial-header)
- [make-framed-illustration](../components/decorative.md#make-framed-illustration)
- [make-mixed-weight-text](../components/typography.md#make-mixed-weight-text)
- [make-outlined-pill](../components/typography.md#make-outlined-pill)
- [make-etched-illustration](../components/decorative.md#make-etched-illustration)

## Notes
- **Illustration library is the make-or-break asset.** Recommend hybrid: 10 commissioned WSJ-hedcut illustrations + prompt-engineered fallback.
