# aurora-compact-annotated-shot

**Family type:** Body — annotated screenshot / diagram. **Phase:** 4. **Status:** NEW. **"Killer engagement device."**

## What
Screenshot (or 3D render / photo) at top with **hand-drawn callout arrows** and **pen-stroke highlight circles** annotating specific elements. Below: bullet-headline concept name + 3-line body copy. The annotations do the teaching.

**Sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *others/image copy 6.png* (image 7) `Hold & Scroll` — pen-stroke arrow + pink highlight circle
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy.png* (image 24) — annotated 3D protein render (`Target molecule` / `Protein binder`)
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 5.png* (image 53) — handwritten annotation on AWS Console

## Reference PNGs
- `backend/outputs/slide-references/others/image copy 6.png`
- `backend/outputs/slide-references/claude/image copy.png`
- `backend/outputs/slide-references/nextwork/image copy 5.png`

## Exists? No. Net new.

## Composition
```
[bg-cream OR painterly]
  → [screenshot / image (top, ~40% height, rounded-rect drop shadow)]
  → [hand-drawn callout arrow(s)]           // components/diagrams/make-hand-drawn-callout-arrow.md
  → [highlight circle(s) on top of image]    // components/diagrams/make-highlight-circle.md
  → [handwritten annotation label(s)]        // components/typography/make-handwritten-annotation.md
  → [bullet-headline (below image, y≈760, "• Concept name" 52pt sans)]
  → [body copy (3 lines, 26pt Inter Regular)]
  → [brand pill + dot indicator]
```

## Design tokens
- Doodle strokes: `#000000` for arrows, pink `#E85582` for highlight circles.
- Optional: `accent-warn-red #E27168` for "danger" annotations.

## Fonts to add
- **Caveat** OR **Kalam** OR **Homemade Apple** (Google Fonts) — handwritten annotation label.

## Copy pattern
- Handwritten annotation: 4–8 word conversational aside, lowercase, present tense (`"this one lets in the whole internet"`, `"yours is already in there"`). Never period.
- Bullet-headline: `"• [Concept name]"` — 2–4 words.
- Body: 3-line explanation, ≤ 25 words.

## Related
- [make-hand-drawn-callout-arrow](../components/diagrams/make-hand-drawn-callout-arrow.md)
- [make-highlight-circle](../components/diagrams/make-highlight-circle.md)
- [make-handwritten-annotation](../components/typography/make-handwritten-annotation.md)
- [make-doodle-arrow](../components/diagrams/make-doodle-arrow.md) (SVG-path variant)

## GAN
- Content-zone diff ≤ 5 % vs `others/image copy 6.png` and `claude/image copy.png`.

## Notes
- Doodle assets: ship SVG-path library or PNG registry in `backend/assets/doodles/`.
- Highlight circle should feel "hand-drawn" (slight jitter, round line caps, imperfect closure).
