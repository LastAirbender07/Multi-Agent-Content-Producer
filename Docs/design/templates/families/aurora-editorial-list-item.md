# aurora-editorial-list-item

**Family type:** Editorial numbered list (3-col rows, SahilBloom). **Phase:** 4. **Status:** NEW.

## What
Numbered outlined-circle badge (col 1) + serif body text (col 2) + small etched icon (col 3). N rows stacked on cream bg. Bottom eyebrow band w/ handle + series title + dots.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 13, 14.

## Reference PNGs
- `backend/outputs/slide-references/SahilBloom/image copy.png` — items 1-4
- `backend/outputs/slide-references/SahilBloom/image copy 2.png` — items 9-12

## Exists? No.

## Composition
```
[bg cream #F3ECD8]
  → 3-5 stacked list rows (auto-height per body length):
    Col 1 (~80px): outlined circle badge + number (Playfair Regular ~38pt)
    Col 2 (~600px): serif body text (Playfair Regular ~36pt, left-aligned ragged-right)
    Col 3 (~280px): small etched icon (~200x180px, B&W engraving)
  → [bottom eyebrow band]
```

## Design tokens
- `bg-cream = #F3ECD8`, `ink-black = #1B1B1B`, `rule-grey = #3A3A3A`
- Font: **Playfair Display Regular + Italic**

## Copy pattern
- Item body: `"[Imperative rule]. [Explanation]."` — 3-20 words.

## Related
- [make-editorial-list-item](../components/lists.md#make-editorial-list-item)
- [make-editorial-list-layout](../components/lists.md#make-editorial-list-layout)
- [make-number-badge](../components/icons.md#make-number-badge) — outlined variant
- [make-etched-illustration](../components/decorative.md#make-etched-illustration)
- [make-editorial-header](../components/decorative.md#make-editorial-header)
