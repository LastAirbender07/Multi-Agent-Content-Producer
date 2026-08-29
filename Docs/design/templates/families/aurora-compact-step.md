# aurora-compact-step

**Family type:** Body slide — one educational or tutorial step / concept deep-dive.
**Phase:** 2 (core). **Status:** NEW.
**Canvas:** 1080 × 1080.

---

## What is it?

A **single tutorial step** — giant step number (e.g. `1`, `2`, `3`) + short verb-phrase describing the action. Uses colour-coded bullets/numbers that map to a legend slide. One step per slide.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 2.png* (image 50, "parts of a VPC" numbered list — bullet colour contract)
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 3.png* (image 51) — deep-dive per numbered step
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *SahilBloom/image copy.png* (image 13) — numbered-list-item pattern
A **full-bleed atmospheric body slide** used for tutorial and concept carousels. Warm atmospheric photography fills the entire canvas; white text overlays it. The step's topic name is rendered huge (the headline); below it, 2–3 sentences explain the concept. A coloured dot prefix marks which item in the series this is.

Two layout variants:
- **`index`** — Shows all N steps as a scannable list (numbered dots + short verb-phrases). Used once, early in the carousel.
- **`detail`** — One step in depth: dot + topic name (large) + explanation + optional content card. Used for every step.

**Primary reference images:**
- `backend/outputs/slide-references/nextwork/image copy 2.png` — 6-item index slide ("The parts of a VPC")
- `backend/outputs/slide-references/nextwork/image copy 3.png` — detail slide ("Subnets" with AWS console inset card)
- `backend/outputs/slide-references/nextwork/image.png` — cover/context (visual language anchor) [4 numbered list items on cream]

---

## Does it already exist?

**No.** Net new.

---

## Visual spec (from reference images — source of truth)

### Background

Full-bleed warm landscape photograph — golden hour, painterly, atmospheric. NOT flat cream. The image should occupy 100% of the canvas with a **dark-to-transparent overlay gradient** (bottom-heavy) to ensure white text reads over the photo.

```
Fabric: FabricImage (cover-fit, 1080×1350)
Then: LinearGradient overlay Rect, 1080×1350
  stops: [{offset:0, color:"rgba(0,0,0,0)"}, {offset:0.55, color:"rgba(0,0,0,0.60)"}]
  angle: 90 (top-transparent → bottom-dark)
```

The user/LLM supplies a `backgroundImageUrl`. The dark-gradient overlay is always applied by the builder — never skip it.

### Detail layout

```
[photo bg + gradient overlay]
  → [topic icon badge: top-right, y=60, x=960]         // single app-icon style (see icons.md / make-topic-badge)
    - 80×80px rounded-rect (cornerRadius 20), coloured fill matching step colour
    - White icon SVG inside

  → [dot + topic name (left, y=760)]
    - Colour dot:  ●  18px dia, fill = step-colour, x=55, baseline-aligned to topic name
    - Topic name:  Inter Bold 110pt, white #FFFFFF, x=88, y=760 (baseline)
    - 1–2 lines — wraps naturally at maxWidth=950

  → [explanation (y = topic_bottom + 28)]               // always below topic name, dynamic Y
    - Inter SemiBold 34pt, white #FFFFFF, lineHeight 1.5, maxWidth=940
    - 2–3 sentences, ≤ 35 words

  → [optional inset content card (y=100, x=52)]        // e.g. AWS console mockup, browser mockup
    - White rounded card, cornerRadius 24, fills top ~40% of canvas
    - Acts as a "screenshot" of the real tool — uses make-aws-console-mockup or make-browser-window-mockup
    - Only include when the step benefits from showing the actual UI

  → [dot progress indicator (bottom-centre, y≈1290)]   // make-dot-progress-indicator
```

### Index layout (overview slide)

```
[photo bg + gradient overlay]
  → [section heading (top-left, y=80)]                  // Inter Bold 64pt, white
    e.g. "The parts of a VPC"

  → [topic icon badge: top-right, y=60]                 // same as detail

  → [step list (y=200)]                                 // 6 items stacked, 130px row height
    Each row:
      [num label: "1", Inter Light 24pt, muted-white #FFFFFF99, x=55, vertically centred to row]
      [color dot: ●, 14px, step-colour, x=95, vertically centred to row]
      [item name: Inter SemiBold 46pt, white, x=120]
      [sub-label: italic concept tag, Inter Italic 22pt, #FFFFFF80, x=120, below item name, 6px gap]
```

---

## Step colour contract

The colour for each step is assigned ONCE on the index slide and must be used consistently across all subsequent detail slides in the same carousel.

| Step | Colour | Hex |
|---|---|---|
| 1 | Blue | `#3B7EDC` |
| 2 | Yellow/Amber | `#E8B045` |
| 3 | Mint | `#4AC48D` |
| 4 | Purple | `#B65FE0` |
| 5 | Orange | `#F08A3D` |
| 6 | Coral-white | `#EDE8D8` (light, for contrast on dark bg) |

The LLM content schema emits `stepColorMap: Record<number, string>` on the index slide data; every detail slide receives its step's colour as `stepColor: string`.

---

## Fabric.js two-pass layout

Because `explanation` Y depends on `topic name` height (which varies with line count):

```typescript
// Phase 1: measure
const topicLines = topicName.split('\n').length; // or measure with Textbox probe
const topicH = topicLines * 110 * 1.0;          // lineHeight 1.0 for display type
const explanationY = 760 + topicH + 28;

// Phase 2: place
objects.push(makeTopicName({ text, y: 760, ... }));
objects.push(makeExplanation({ text, y: explanationY, ... }));
```

Never hardcode `explanationY` — two-word topic names and three-word topic names end at different Y positions.

---

## Design tokens

| Token | Value | Notes |
|---|---|---|
| `topic-name-size` | 110pt | Inter Bold, white |
| `explanation-size` | 34pt | Inter SemiBold, white |
| `index-heading-size` | 64pt | Inter Bold, white |
| `index-item-size` | 46pt | Inter SemiBold, white |
| `overlay-gradient-start` | `rgba(0,0,0,0)` | Top of canvas |
| `overlay-gradient-end` | `rgba(0,0,0,0.60)` | Bottom of canvas |
| `step-dot-size` | 18px | Detail layout prefix dot |
| `index-dot-size` | 14px | Index list dot |

**Fonts:** Inter Bold, Inter SemiBold, Inter Light — all white on the dark overlay.

---

## Copy pattern

- **Index slide heading:** `"The [N] parts of [topic]"` or `"[N] things [audience] should know"` — direct, clear.
- **Detail topic name:** 1–3 words naming the concept. Not a question. Not a verb phrase. Noun. e.g. `"Subnets"`, `"Route Tables"`, `"IAM Roles"`.
- **Explanation:** 2–3 sentences. First = define/describe. Second = WHY it matters or what it does. Third = optional analogy or consequence.

---

## Related components

- `make-topic-badge` — app-icon style badge (icons.md)
- `make-aws-console-mockup` — for tech step content cards (mockups.md)
- `make-browser-window-mockup` — alternate content card (mockups.md)
- `make-dot-progress-indicator` — bottom chrome (decorative.md)
- `make-brand-pill` — optional for non-nextwork brand variants (cards.md)

---

## GAN verification

- Detail slide: diff ≤ 5% vs `nextwork/image copy 3.png` (Subnets deep-dive).
- Index slide: diff ≤ 5% vs `nextwork/image copy 2.png` (6-item parts list).
- Gradient overlay check: no text should be unreadable — min contrast ratio 4.5:1 for explanation text.
