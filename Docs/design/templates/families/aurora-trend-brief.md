# aurora-trend-brief

**Family type:** 2-column trend brief — phone mockup + 3-section Q&A stack. **Phase:** 4/5. **Status:** NEW.

## What
Deep-teal serif headings + cream bg + left iPhone mockup + right 3-section stack (`What's the Trend?` / `How to create:` / `Why should I use it?`). Editorial newsletter feel.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 9-11.

## Reference PNGs
- `backend/outputs/slide-references/others/image copy 8.png` — Punch Cards trend
- `backend/outputs/slide-references/others/image copy 9.png` — Never Have I Ever trend
- `backend/outputs/slide-references/others/image copy 10.png` — Poster Trend

## Exists? No.

## Composition
```
[bg cream #F5EFE4, flat]
  → [top headline: serif ~72pt deep-teal #1E4B4B, centred]
  → 2-column layout:
    Left (~450 x 950px): iPhone mockup with black bezel
    Right: 3 stacked sections separated by hairline rules (~1px #B5A990):
      - Section 1 heading (serif 40pt teal) + body (sans 30pt charcoal)
      - Section 2 heading + body
      - Section 3 heading + 3-item bulleted list
```

## Design tokens
- `bg-cream = #F5EFE4`
- `ink-teal = #1E4B4B` (headings)
- `ink-charcoal = #3A3A3A` (body)
- `rule-taupe = #B5A990`

## Fonts to add
- **Playfair Display Regular + Semibold** (or **Cardo**)
- Inter Regular (body)

## Copy pattern
- Section 1: 10-20 word definition.
- Section 2: 25-40 word how-to.
- Section 3: 2-4 bullets, ≤ 5 words each.

## Related
- [make-section-block](../components/layouts.md#make-section-block)
- [make-vertical-content-brief](../components/layouts.md#make-vertical-content-brief)
- [make-browser-window-mockup](../components/mockups.md#make-browser-window-mockup)
