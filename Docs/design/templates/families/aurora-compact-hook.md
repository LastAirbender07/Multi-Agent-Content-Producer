# aurora-compact-hook

**Family type:** Cover / hook slide (first slide of a compact-format carousel).
**Phase:** 2 (core).
**Status:** NEW.

---

## What is it?

The **cover slide** for a compact-family carousel. It carries a HUGE bold sans-serif question or hook headline (100–140 pt on a 1080 canvas), a small ALL-CAPS peach category pill at top, and a brand pill + progress dots at the bottom. One idea per slide, ≤ 12 words.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL.md` → *others/image.png* (image 1) — outer wrapper + big hook pattern
- `Docs/design/SLIDE_REFERENCES_FULL.md` → *others/image copy 4.png* (image 5) — `GOOGLE, WHERE AM I?` reference cover
- `Docs/design/SLIDE_REFERENCES_ANALYSIS.md` §"Templates catalogued" → `bold-headline-with-mockup` pattern

## Reference PNGs (for GAN diff)

- `/Users/i750332/Library/CloudStorage/OneDrive-SAPSE/projects/learnings/Multi-Agent-Content-Producer/backend/outputs/slide-references/others/image copy 3.png` — `FAKE POST` cover (bold black headline + peach pill)
- `/Users/i750332/Library/CloudStorage/OneDrive-SAPSE/projects/learnings/Multi-Agent-Content-Producer/backend/outputs/slide-references/others/image copy 4.png` — `GOOGLE, WHERE AM I?` (multi-line headline)
- `/Users/i750332/Library/CloudStorage/OneDrive-SAPSE/projects/learnings/Multi-Agent-Content-Producer/backend/outputs/slide-references/others/image copy 5.png` — `CHECK MY CALENDAR` (2-line headline)

## Does it already exist?

**No.** Closest existing template is `aurora_hook.ts` (extended family) — dense-slide variant. This file introduces the compact variant.

## Composition (Fabric.js primitives)

```
[bg-cream #F5F0E8 Rect (full canvas)]
  → [peach category pill (top-centre, y≈120)]         // components/typography/make-outlined-pill.md variant
    - text: ALL-CAPS letter-spaced label, ~30 pt, weight 500
    - fill: #E8CBA3, dark charcoal text
  → [display headline (centre, y≈340–780)]            // components/typography/make-mixed-weight-text.md
    - font: Inter Black or Söhne Kraftig, ~140 pt
    - fill: #111111 near-black
    - 1–3 lines, left- or centre-aligned
    - optional italic-serif emphasis word (Playfair Italic Bold)
  → [brand pill (bottom-left, y≈1240)]                // components/cards/make-brand-pill.md
  → [dot progress indicator (bottom-centre, y≈1290)]   // components/decorative/make-dot-progress-indicator.md
```

## Design tokens

- `bg-cream = #F5F0E8`
- `ink-primary = #111111`
- `accent-peach = #E8CBA3`
- Font: **Inter Black** (900) — display headline
- Font: **Playfair Display Italic Bold** — optional emphasis word
- Font: **Inter Regular** — pill label + brand pill

## Fonts to add

- **Inter Black + Regular** (already loaded — verify)
- **Playfair Display Italic Bold** (NEW — add to `backend/renderer/renderer_entry.ts` via FontFace)

## Copy pattern (LLM writer hint)

- Formula: `"[VERB], [QUESTION-FRAGMENT]?"` OR `"[NOUN-PHRASE][emphasis-word][qualifier]"`
- Max 12 words, 1–3 lines.
- Optional: mark ONE word with `italic-serif` styling for editorial drama.
- ALL-CAPS category pill: 1–2 words describing the format (`VIRAL DESIGN`, `HOT TAKE`, `TUTORIAL`).

## GAN verification acceptance

- Content-zone diff ≤ 5 % vs reference `others/image copy 3.png` for `FAKE POST`-style headline.
- Content-zone diff ≤ 5 % vs `others/image copy 4.png` for multi-line headline.
- Peach pill top clears IG-safe-zone (y ≥ 220 px in production build).

## Related components used

- [make-outlined-pill](../components/typography/make-outlined-pill.md)
- [make-mixed-weight-text](../components/typography/make-mixed-weight-text.md)
- [make-brand-pill](../components/cards/make-brand-pill.md)
- [make-dot-progress-indicator](../components/decorative/make-dot-progress-indicator.md)

## Notes

- IG safe-zone: the top 200 px avatar-bar risk zone means the peach pill MUST be lowered to y ≥ 220 px in production (contradicts reference PNG placement).
- Two-line headline: line-break honors natural sentence flow — LLM writer emits `text` string with natural spacing; Fabric wraps at `maxWidth`.
