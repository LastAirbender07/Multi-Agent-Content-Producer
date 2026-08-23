# aurora-compact-photo-caption

**Family type:** Body — hero photo + caption. **Phase:** 4. **Status:** NEW.

## What
Full-width hero photograph (45% of slide height, top) + big caption headline + short body copy below. Photojournalism / storytelling vibe.

**Sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *others/image copy 2.png* (image 3) — full-bleed photo + medallion
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 2.png* (image 25) — cinematic lab photograph
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *claude/image copy 5.png* (image 28) — over-the-shoulder lab photo

## Reference PNGs
- `backend/outputs/slide-references/others/image copy 2.png`
- `backend/outputs/slide-references/claude/image copy 2.png`
- `backend/outputs/slide-references/claude/image copy 5.png`

## Exists? No. Net new.

## Composition
```
[bg-cream #F5F0E8]
  → [hero photo (top 45%, y≈70-620, full-width or inset ~40px)]
    - clipPath: rounded-rect radius 24px
    - optional grayscale filter or slight desaturation
  → [section heading (y≈650, Inter Bold ~44pt)]
  → [body paragraph (y≈700-900, Inter Regular ~30pt, 3-4 lines)]
  → [brand pill + dot indicator]
```

## Design tokens
- `bg-cream = #F5F0E8` (default) or `bg-warm-offwhite = #F5F0E5` (Anthropic)
- `ink-primary = #1B1B1B`

## Copy pattern
- Section heading: `"[Adjective], [adjective] [process/noun]"` (e.g. `"A slow, manual process"`).
- Body: 25–40 words, 2-3 sentences, factual + observation.

## Related
- [make-brand-pill](../components/cards/make-brand-pill.md)
- [make-dot-progress-indicator](../components/decorative/make-dot-progress-indicator.md)

## GAN
- Content-zone diff ≤ 5 % vs `claude/image copy 2.png`.

## Notes
- Photo can be user-uploaded (accessible fallback when AI-generated hero not available).
- Inset variant (~40px from all edges) gives "windowed / matted" feel; full-bleed gives editorial.
