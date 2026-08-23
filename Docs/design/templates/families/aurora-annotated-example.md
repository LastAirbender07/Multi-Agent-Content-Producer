# aurora-annotated-example

**Family type:** Meta-tutorial wrapper — post-inside-a-post. **Phase:** 5+. **Status:** NEW.

## What
Outer wrapper for @holler.academy-style tutorial slides: full-bleed photo background + mocked IG post card + italic-serif caption + 8-dot indicator. Used to *teach* a template inside another template.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 1-8 — outer wrapper convention.

## Reference PNGs
- `backend/outputs/slide-references/others/image.png`
- `backend/outputs/slide-references/others/image copy.png` through `image copy 7.png`

## Exists? No.

## Composition
```
[full-bleed grass/photo background]
  → [mocked IG post card (centred, ~475x590px)]
    - White bezel + inner artwork slot + mini IG toolbar (heart/comment/share/bookmark)
  → [italic-serif caption block (bottom)]
    - Headline (~52pt Playfair Italic) + 3-line body (~34pt italic serif)
  → [left/right chevron nav arrows (grey #8A8A8A, ~48pt)]
  → [dot progress indicator (8 dots)]
```

## Design tokens
- Card fill: `#FFFFFF`, drop shadow (y=8, blur=24, opacity 20%)
- Caption ink: `#1B1B1B`
- Font: **Playfair Display Italic**

## Related
- [make-annotated-example](../components/layouts.md#make-annotated-example)
- [make-ig-post-chrome](../components/mockups.md#make-ig-post-chrome)
- [make-dot-progress-indicator](../components/decorative.md#make-dot-progress-indicator)

## Notes
- Likely defer — a `@holler.academy` tutorial convention, not clearly product-relevant.
