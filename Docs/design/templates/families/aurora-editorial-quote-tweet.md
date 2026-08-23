# aurora-editorial-quote-tweet

**Family type:** Tweet-as-slide (Twitter/X screenshot). **Phase:** 4. **Status:** NEW.

## What
Pure-white minimalist "tweet screenshot" — circular avatar + display name + blue verified checkmark + @handle + large tweet body. No like/reply/timestamp chrome.

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §image 15.

## Reference PNGs
- `backend/outputs/slide-references/SahilBloom/image copy 3.png`

## Exists? No.

## Composition
```
[bg pure white #FFFFFF]
  → [user header (y≈180-310)]
    - Circular avatar (~100px dia)
    - Display name (Inter Bold ~36pt) + verified checkmark (~28px #1D9BF0)
    - @handle (Inter Regular ~28pt grey #6E767D)
  → [tweet body (y≈340-950, ~52pt Inter Regular, near-black #0F1419)]
```

## Design tokens
- `bg-white = #FFFFFF`, `ink-tweet = #0F1419`, `ink-handle-grey = #6E767D`, `verified-blue = #1D9BF0`
- Font: **Inter Regular + Bold**

## Copy pattern
- 30-80 words, short punchy sentences, ending with a philosophical/rebellious note.

## Related
- [make-tweet-slide](../components/mockups.md#make-tweet-slide)
- [make-verified-badge](../components/mockups.md#make-verified-badge)
- [make-avatar-chip](../components/cards.md#make-avatar-chip)

## Notes
- Variants: `style: "twitter-blue" | "x-black"` (verified badge colour).
