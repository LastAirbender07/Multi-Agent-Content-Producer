# aurora-essay-body

**Family type:** Long-form essay body slide with pluggable embed. **Phase:** 4/5. **Status:** NEW.

## What
SahilBloom-style essay body: eyebrow + N sans-serif prose paragraphs (Inter Regular ~34pt) + optional inline-bold spans + **pluggable embed** mid-slide (chart / diptych / annotated illustration / single illustration).

**Sources:** `Docs/design/SLIDE_REFERENCES_FULL.md` §images 17-20, 22.

## Reference PNGs
- `backend/outputs/slide-references/SahilBloom/image copy 5.png` — schematicChart
- `backend/outputs/slide-references/SahilBloom/image copy 6.png` — illustrationDiptych
- `backend/outputs/slide-references/SahilBloom/image copy 7.png` — illustrationWithAnnotations
- `backend/outputs/slide-references/SahilBloom/image copy 8.png` — singleIllustration
- `backend/outputs/slide-references/SahilBloom/image copy 10.png` — split-scene singleIllustration

## Exists? No.

## Composition
```
[bg cream #F3ECD8]
  → [top eyebrow band]
  → [prose stack (N paragraphs, sans-serif ~34pt)]
    - Optional inline-bold spans for key terms
  → [pluggable embed]
    - schematicChart | illustrationDiptych | illustrationWithAnnotations |
      singleIllustration | quotePullout | photoWithCaption
  → [L/R circular nav arrows]
```

## Design tokens
- `bg-cream = #F3ECD8`, `ink-black = #1B1B1B`
- Font: **Inter Regular + Bold** (prose)
- Font: **Playfair Display Italic** (eyebrow)

## Copy pattern (variants)
- `hook-reframe-evidence` — question → reframe → data w/ bolded terms.
- `anaphora` — thesis + 3-5 parallel "The [X] of [gerund]" clauses.
- `staircase` — 3-5 short 1-line paragraphs (choices/steps).
- `quotation-lead` — bold-italic quote lead + interpretation.
- `conceptual-expansion` — claim → unfold → warn → escalate.

## Related
- [make-essay-body-slide](../components/layouts.md#make-essay-body-slide)
- [make-schematic-bar-chart](../components/charts.md#make-schematic-bar-chart)
- [make-illustration-diptych](../components/decorative.md#make-illustration-diptych)
- [make-illustration-with-annotations](../components/decorative.md#make-illustration-with-annotations)
- [make-framed-illustration](../components/decorative.md#make-framed-illustration)
- [make-mixed-weight-text](../components/typography.md#make-mixed-weight-text)
