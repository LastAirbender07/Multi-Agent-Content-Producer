# aurora-compact-comparison

**Family type:** Body — 50/50 side-by-side comparison. **Phase:** 4. **Status:** NEW.

## What

Two vertical columns with a thin central divider. Each column: 2-line italic-serif column heading + hero image/icon + short body copy. Used for "A vs B", "Before vs After", "Millennial vs Gen Z", "Without VPC vs With VPC" comparisons.

**Sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *others/image copy.png* (image 2) `Millennial vs Gen Z` — hand-bag comparison
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy.png* (image 49) — Without-VPC-vs-With-VPC concept contrast

## Reference PNGs

- `backend/outputs/slide-references/others/image copy.png` — vertical 50/50, mauve bg
- `backend/outputs/slide-references/nextwork/image copy.png` — with/without VPC concept-contrast diagram

## Exists?

**No.** Net new. Related: none in extended family.

## Composition

```
[bg (per carousel: cream, mauve #A57880, or dark canvas)]
  → [central divider Line (x=540, full height, 1px darker than bg)]
  → Left column:
    [heading (italic serif, 72-80pt, cream/matched text)]
    [hero image (~180-380px)]
    [body copy (~28pt, centred, 3 lines max)]
  → Right column: same structure
  → [brand pill + dot indicator]
```

## Design tokens

- `bg-mauve = #A57880` (others reference) OR `bg-cream = #F5F0E8`
- `ink-cream = #F5EDE0` (light text on coloured bg)
- `divider-color = darken(bg, 20%)` — auto-computed
- Font: **Playfair Display Italic Bold** (headings) + **Plus Jakarta Sans Regular** (body)

## Copy pattern

- Column heading formula: `"[Group A] [role/topic]"` vs `"[Group B] [role/topic]"` — 3-4 words each, matched length for symmetry.
- Column body: EITHER matched-tone (both formal / both meme) OR contrasted-tone (one formal, one meme — where the humor lives).

## Related components

- [make-comparison-layout](../components/layouts/make-comparison-layout.md) — 2-column skeleton
- [make-italic-serif-headline](../components/typography/make-mixed-weight-text.md) — via italic-run
- [make-image-pair](../components/layouts/make-image-pair.md) — optional 2-images-per-side variant
- [make-concept-contrast-diagram](../components/diagrams/make-concept-contrast-diagram.md) — for the nextwork-style tech diagram variant

## GAN verification

- Content-zone diff ≤ 5 % vs `others/image copy.png` for 50/50 vertical.
- Content-zone diff ≤ 5 % vs `nextwork/image copy.png` for concept-contrast (colour-coded arrows + boundary box).

## Notes

- **Schema extension needed:** the compare template needs **2 image slots** (one per column). Extend `slide.assets.left_image` + `.right_image` (typed) OR use `slide.assets.images: List[ImageAsset]`.
- Sub-variants: `layout: "text-both" | "image-both" | "text-vs-image"`, plus nextwork's `variant: "concept-diagram"` (adds boundary boxes + coloured arrows).
