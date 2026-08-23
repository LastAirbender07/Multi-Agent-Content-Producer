# aurora-nextwork-spotlight-cover

**Family type:** Light-cream editorial spotlight cover. **Phase:** 5+. **Status:** NEW.

## What
The nextwork **light-mode sub-brand** for profile / interview / event covers. Cream canvas (no dark frame), tan silhouette motif behind headline, 3-line serif display headline w/ last-word-in-accent orange, profile-name card, avatar chip, short-carousel dot indicator (3 dots).

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` §image 62 — *nextwork/image copy 14.png*.

## Reference PNGs
- `backend/outputs/slide-references/nextwork/image copy 14.png` — "Build Master Spotlight" / Dhatri Jayanth

## Exists? No.

## Composition
```
[bg cream #F5E8D0, full-bleed, NO inset card]
  → [large flat silhouette motif behind text (tan #E8D4A8, 40% opacity, topical shape)]
    // components/decorative.md#make-silhouette-motif
  → [kicker (top): "NextWork's Build & Brew" in Inter Bold ~28pt burnt-orange]
  → [3-line serif display headline: "Build" / "Master" / "Spotlight" (last word burnt-orange)]
    // components/typography.md#make-serif-display-headline
  → [orange horizontal rule (~40px wide) — kicker divider]
  → [profile-name-card: "Meet [Name]" + role]
    // components/cards.md#make-name-card (variant: profile-name)
  → [avatar chip (bottom-left circle)]
  → [right nav chevron + 3-dot indicator]
```

## Design tokens (Spotlight sub-brand)
- `bg-cream-spotlight = #F5E8D0`
- `bg-tan-motif = #E8D4A8`
- `accent-burnt-orange = #B85A25`
- `ink-primary = #1A1A1A`
- Font: **Fraunces Bold** (or **Newsreader Bold** / **IBM Plex Serif** / **Playfair Display Bold**) — 3-line serif display
- Font: Inter Bold + Regular (kicker + attribution)

## Copy pattern
- Kicker: `"[Brand Name]'s [Series Name]"` (e.g. `"NextWork's Build & Brew"`).
- Title: 3 stacked words, last in accent colour: `"Build"` / `"Master"` / `"Spotlight"`.
- Attribution: `"Meet [Name]"` + `[Role Title]`.

## Related
- [make-silhouette-motif](../components/decorative.md#make-silhouette-motif)
- [make-mixed-weight-text](../components/typography.md#make-mixed-weight-text) — 3-axis with colour-per-run
- [make-avatar-chip](../components/cards.md#make-avatar-chip)
- [make-name-card](../components/cards.md#make-name-card)

## Notes
- 3-slide mini-carousel format (short spotlight arc): cover / body / close.
- Silhouette library needed: longhorn (Texas), coffee-cup (event), figure, book, custom-svg per topic.
