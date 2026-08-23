# aurora-carousel-cover-hero

**Family type:** Carousel cover — peach pill + huge display + mockup. **Phase:** 5+. **Status:** NEW.

## What
Canonical @holler.academy carousel cover — peach category pill straddling top edge, giant black display headline (2-3 words all-caps), body copy, tilted mockup (phone/paper/tablet/calendar/imessage), italic-serif CTA.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 3-7 — *others/image copy 3.png* through *image copy 7.png*.

## Reference PNGs
- `backend/outputs/slide-references/others/image copy 3.png` — FAKE POST (phone-post mockup)
- `backend/outputs/slide-references/others/image copy 4.png` — GOOGLE WHERE AM I? (paper+tablet)
- `backend/outputs/slide-references/others/image copy 5.png` — CHECK MY CALENDAR
- `backend/outputs/slide-references/others/image copy 6.png` — HOLD & SCROLL
- `backend/outputs/slide-references/others/image copy 7.png` — WHAT'S THE VIBE (iMessage)

## Exists? No.

## Composition
```
[metallic pastel bg + subtle grain]  // components/decorative/make-metallic-gradient.md
  → [white rounded card ~90% canvas]
  → [peach category pill (top-centre, straddles card edge)]  // components/typography/make-outlined-pill.md
  → [giant display headline (Inter Black ~140pt, all-caps)]
  → [body copy (2-3 short paragraphs)]
  → [tilted mockup (bottom half, ~-6° or +4° tilt)]         // components/mockups/*
  → [italic-serif CTA (Playfair Italic Bold ~36pt)]
  → [dot indicator + chevrons (decorative)]
```

## Design tokens
- `bg-metallic-peach = #DAC7A5 → #DDD1C0 → #C6B6A0` (radial gradient)
- `ink-primary = #000000`, `accent-peach = #E8CBA3`, `ink-body = #1B1B1B`

## Fonts to add
- **Inter Black** (already needed)
- **Playfair Display Italic Bold** (CTA)

## Copy pattern
- Pill: 1-2 word category (`VIRAL DESIGN`, `VIRAL REEL`, `TUTORIAL`).
- Headline: 2-4 words ALL CAPS.
- Body: 2 short paragraphs, ≤ 20 words each.
- CTA: `"*Comment \"TEMPLATE\" for the [Freebie]"`.

## Related
- [make-metallic-gradient](../components/decorative/make-metallic-gradient.md)
- [make-outlined-pill](../components/typography/make-outlined-pill.md)
- Mockup helpers per variant: [make-browser-window-mockup](../components/mockups/make-browser-window-mockup.md), [make-calendar-mockup](../components/mockups/make-calendar-mockup.md), [make-imessage-mockup](../components/mockups/make-imessage-mockup.md), [make-ig-post-chrome](../components/mockups/make-ig-post-chrome.md)

## Notes
- ONE builder with `mockupType: "phone-post" | "phone-calendar" | "imessage" | "paper-tablet-pair" | "screenshot" | "none"` — highly parameterised.
