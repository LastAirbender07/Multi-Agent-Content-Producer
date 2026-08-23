# aurora-compact-step

**Family type:** Body slide — one tutorial step.
**Phase:** 2 (core). **Status:** NEW.

## What is it?

A **single tutorial step** — giant step number (e.g. `1`, `2`, `3`) + short verb-phrase describing the action. Uses colour-coded bullets/numbers that map to a legend slide. One step per slide.

**Analysis sources:**
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 2.png* (image 50, "parts of a VPC" numbered list — bullet colour contract)
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — *nextwork/image copy 3.png* (image 51) — deep-dive per numbered step
- `Docs/design/SLIDE_REFERENCES_FULL.md` — *SahilBloom/image copy.png* (image 13) — numbered-list-item pattern

## Reference PNGs

- `backend/outputs/slide-references/nextwork/image copy 2.png` — 6 numbered VPC parts with colour-coded bullets
- `backend/outputs/slide-references/nextwork/image copy 3.png` — 1 numbered deep-dive slide (Subnets)
- `backend/outputs/slide-references/SahilBloom/image copy.png` — 4 numbered list items on cream

## Does it already exist?

**No.** Net new.

## Composition

```
[bg-cream #F5F0E8]
  → [step number (top-left, y≈120)]                   // 240pt Inter Black, coloured (blue/mint/amber/purple/orange/cream)
  → [step verb-phrase (below number, y≈420)]           // Inter Bold ~110pt, 1-2 lines, near-black
  → [step explanation (y≈680)]                          // Inter Regular ~34pt, 3-4 lines
  → [optional: tiny inline mockup or icon (right column)]
  → [brand pill + dot indicator]
```

## Design tokens

- `bg-cream = #F5F0E8`
- `ink-primary = #1B1B1B`
- Step colours (locked contract across the carousel):
  - Step 1 = `#3B7EDC` blue
  - Step 2 = `#E8B045` amber
  - Step 3 = `#4AC48D` mint
  - Step 4 = `#B65FE0` purple
  - Step 5 = `#F08A3D` orange
  - Step 6 = `#F5F0E8` cream-white

## Copy pattern

- Step number: 1-2 digits, huge Inter Black.
- Verb-phrase: `"[Verb] [Object]"` — 3–6 words, Inter Bold. Examples: `"Split the address range"`, `"Route traffic outbound"`.
- Explanation: 1–2 sentences, ≤ 30 words.

## Related components

- [make-number-badge](../components/icons/make-number-badge.md)
- [make-flow-verb-list](../components/lists/make-flow-verb-list.md) (for the legend-slide sibling)
- [make-brand-pill](../components/cards/make-brand-pill.md)

## GAN verification

- Content-zone diff ≤ 5 % vs `nextwork/image copy 3.png`.

## Notes

- **Carousel-locked colour contract:** step-N always uses colour-N across ALL slides in the same carousel. LLM writer emits `carousel.stepColorMap: { 1: blue, 2: amber, ... }` once on the enumeration slide; every subsequent deep-dive slide honours it.
