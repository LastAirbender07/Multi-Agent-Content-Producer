# aurora-compact-zoom-hook

**Family type:** Cover / hook variant — pinch-to-zoom gimmick. **Phase:** 5+. **Status:** NEW.

## What
Hook cover with a giant OK-hand / pinch emoji + 3-word headline, and tiny hidden text stamped inside the emoji's pinch aperture. The engagement mechanic IS the design (user must pinch-zoom to read).

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §image 1 — *others/image.png* inner example.

## Reference PNGs
- `backend/outputs/slide-references/others/image.png`

## Exists? No.

## Composition
```
[bg warm off-white #E4DED2 with grain 5% opacity]
  → [headline (top, 44pt mixed-weight sans, emphasis word bolder)]
  → [giant emoji (👌 / 🤏), ~70% card height]
  → [tiny mystery text (~14pt) inside emoji pinch aperture]
```

## Design tokens
- `bg-warm-cream = #E4DED2`, `ink-primary = #111111`
- Font: Inter Regular + Bold

## Copy pattern
- Headline: `"[Pronoun] [EMPHASIS-WORD] [state-adverb]"` (e.g. `"I'm THIS close"`).
- Mystery text: 15-25 words, the actual payload.

## Related
- [make-mixed-weight-text](../components/typography/make-mixed-weight-text.md)
- [make-grain-overlay](../components/decorative/make-grain-overlay.md)

## Notes
- Emoji rendering: PNG asset from `backend/assets/emojis/` (safer than font-emoji for GAN diff).
- Highly niche — only useful when topic has "close call / one detail matters" angle.
