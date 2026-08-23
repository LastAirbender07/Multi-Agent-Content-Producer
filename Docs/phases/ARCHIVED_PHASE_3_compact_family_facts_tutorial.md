# PHASE 3 — Compact Template Family + FACTS + TUTORIAL

## Status
OUTLINE — Loop 1 review to be completed in full **at the start of this phase** (once Phase 2 is COMPLETE). This document captures scope, high-level design, dependencies, and open questions to be resolved during Loop 1.

## Problem Statement (from Master Plan)

Phase 2 gave every run a `post_format` label and a `template_family` route, but the pipeline still emits only `aurora-extended-*` templates because no `aurora-compact-*` builders exist. Casual Instagram followers abandon our carousels at slide 2 because they're too dense (40-70 words per slide vs. the industry-standard 10-20). Phase 3 builds the first three compact builders — enough to unlock **FACTS** and **TUTORIAL** formats end-to-end and prove the compact-family design.

## Scope (single source of truth: strategy doc `Docs/pending-works/MULTI_FORMAT_CONTENT_STRATEGY.md`, section "Week 2")

**In scope:**
- Three new Fabric.js builder functions with modern typography (52-64 px headline, 26-30 px body, one idea per slide, generous whitespace):
  - `aurora-compact-content` — bold headline + ≤20-word statement + optional icon/number accent
  - `aurora-compact-fact` — single revelation, headline-dominant, maximum whitespace, no bullets
  - `aurora-compact-step` — huge step number + action headline + one-sentence instruction
- Matching Lumina wrappers (`lumina-compact-*`) via the existing `lw()` helper
- Compact theme tokens (font sizes, padding, line-height per strategy doc)
- REGISTRY entries for the six new IDs (3 aurora + 3 lumina)
- Backend routing: when `format_selection.template_family == "compact"` and `slide_type` in `{content, fact, step}`, `_canvas_template_id()` returns the compact ID
- Slide-generator prompt injection for FACTS + TUTORIAL — reuses the Phase-2 `SLIDE_FORMAT_BLOCKS`; the LLM emits `slide.type` in `{"content","stat","fact","step"}` for these formats
- GAN validation catalog entries + 3 sample runs per new template
- E2E: full pipeline runs with topics that force FACTS and TUTORIAL, producing readable, on-brand compact PNGs

**Out of scope (deferred):**
- `aurora-compact-quote`, `-list-item`, `-rating`, `-comparison` → Phase 4
- Frontend UI for format recommendation display → Phase 5
- Analytics dashboard `post_format` distribution → Phase 5

## Dependencies

- **Phase 2 MUST be COMPLETE** — this phase reads `format_selection.template_family` and depends on `_canvas_template_id()` accepting the `template_family` argument
- `SLIDE_FORMAT_BLOCKS[PostFormat.facts]` and `SLIDE_FORMAT_BLOCKS[PostFormat.tutorial]` already exist (created in Phase 2)
- The `Slide.type` enum in `contracts.py` must be extended (see Open Questions)

## Preliminary File List (subject to Loop 1 confirmation)

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `frontend/utils/canvasTemplates/aurora_compact_content.ts` | CREATE | Builder for `aurora-compact-content` |
| 2 | `frontend/utils/canvasTemplates/aurora_compact_fact.ts` | CREATE | Builder for `aurora-compact-fact` |
| 3 | `frontend/utils/canvasTemplates/aurora_compact_step.ts` | CREATE | Builder for `aurora-compact-step` |
| 4 | `frontend/utils/canvasTokens.ts` | MODIFY | Add `COMPACT_TOKENS` overrides (larger fonts, tighter padding rules) |
| 5 | `frontend/utils/canvasTemplates/index.ts` | MODIFY | Register 3 aurora-compact-* + 3 lumina-compact-* keys |
| 6 | `backend/core/orchestration/contracts.py` | MODIFY | Extend `SlideType` enum: add `fact`, `step` |
| 7 | `backend/core/orchestrators/content/carousel_generator.py` | MODIFY | Confirm `_canvas_template_id()` handles new `slide_type` values under compact family |
| 8 | `backend/core/prompts/templates/slide_generation.txt` | MODIFY | Add `fact` and `step` slide type descriptions to the shared rules section (guarded by format_block for FACTS/TUTORIAL) |
| 9 | `scripts/GAN_CATALOG.json` | MODIFY | Add catalog entries for the 6 new template IDs |
| 10 | `frontend/constants/slideTemplates.ts` | MODIFY | Add `SLIDE_TYPES` entries for new template variants (auto-picked up by editor Templates panel) |
| 11 | `backend/renderer/renderer_entry.ts` | READ-ONLY | Verify: adding new REGISTRY keys requires only a rebuild — no entry-file changes |
| 12 | `backend/tests/test_compact_family.py` | CREATE | Unit tests: routing to compact templates when `template_family="compact"`; SlideType enum extended |
| 13 | `frontend/e2e/compact-family.spec.ts` | CREATE | Playwright: full pipeline runs with FACTS/TUTORIAL topics, PNG generated, no red errors |

## Open Questions (to resolve during Loop 1)

- **Q1: Should `aurora-compact-content` re-use the `content` slide type or introduce `compact-content` as a distinct slide type?** Preferred: reuse `content` — the `template_family` param on `_canvas_template_id` picks the compact variant, no schema change to `SlideType`.
- **Q2: Where do `COMPACT_TOKENS` live — new `canvasTokensCompact.ts` or extended `canvasTokens.ts`?** Preferred: extend `canvasTokens.ts` with a `COMPACT_OVERRIDES` object that `getTokens(templateId)` merges when the ID contains `-compact-`.
- **Q3: Does GAN validation need a compact reference PNG set (bootstrapped from a first-generation output)?** Preferred: yes — generate 3 sample compact PNGs manually, save as GAN reference, then future runs are validated against them.
- **Q4: Does the LLM handle `fact` and `step` slide types correctly, or does it default back to `content`?** Preferred: extend `SlideType` enum with `fact` and `step`; add explicit rules in slide-generation prompt via FACTS/TUTORIAL format blocks.

Loop 1 must resolve all four questions before writing code.

## Preliminary External Verification Claims (to document during Loop 1)

- Fabric.js v7 handles font sizes up to 200 px on Textbox → verify via `node_modules/fabric/dist/src/shapes/Textbox.d.ts`
- Playwright screenshot at 2× device_scale_factor renders 52-64px headlines crisp → verify by first sample render
- Extending `SlideType` enum is Pydantic-safe → same pattern as `EmotionalHook` and `ContentCategory`
- GAN catalog accepts new keys → verified during Phase 1 (see AI_CHANGELOG.md 2026-06-24)

## Preliminary Design Principles (from strategy doc, hard rules)

| Rule | Value | Applies to |
|---|---|---|
| Headline font size | 52-64 px | all compact builders |
| Body font size | 26-30 px | all compact builders |
| Line-height (body) | 1.4-1.5 | all compact builders |
| Padding from edges | ≥ 60 px | all compact builders |
| Word count per slide | ≤ 20 (body) | all compact builders |
| Bullets per slide | 0 | all compact builders |
| Ideas per slide | 1 (hard rule) | all compact builders |
| Supporting visual | 1 (icon/number/chart) | all compact builders |

## Preliminary Success Criteria (Loop 2 hooks)

- `pytest tests/test_compact_family.py -v` → all pass
- Full pipeline run with topic `"5 surprising facts about Indian tea"` produces slides with `canvas_template: "aurora-compact-fact"` and body text ≤ 20 words
- Full pipeline run with topic `"How to negotiate salary in 7 steps"` produces slides with `canvas_template: "aurora-compact-step"` and visible step numbers
- Generated PNG headlines readable at thumbnail size (200 px preview) — verified by opening editor for the run and viewing at 20 % zoom
- GAN validation: content-zone diff ≤ 8 % on the 3 sample compact PNGs (looser than the 5 % target because we're bootstrapping — Phase 3 exit lowers this to 5 % after tuning)

## Preliminary Real Data Testing Scenarios (Loop 3 hooks)

- **A**: Run FACTS pipeline, open editor, verify compact-fact template renders with big headline and tiny body
- **B**: Run TUTORIAL pipeline, verify step numbers visible on every step slide
- **C**: Manually override a slide's `canvas_template` to `aurora-compact-content` in `slides.json`, click Edit in the editor, verify the canvas loads with the correct fonts
- **D**: Regression — run OPINION pipeline (Phase 2 default), verify slides still use `aurora-extended-*` templates, unchanged from Phase 2 output

## Rollback Plan (Preliminary)

1. Revert the ~13 files listed
2. Delete new template IDs from REGISTRY (no-op if `format_selection.template_family` never reached "compact" in any real run)
3. Existing runs with `canvas_template: "aurora-compact-*"` will not render — flag any such runs with a data migration step

## Loop 1 To-Do (before coding starts)

- [ ] Answer 4 open questions above
- [ ] Fill External Verification Log with concrete source references
- [ ] Write full Implementation Steps (~10-14 steps) with exact code snippets
- [ ] Write Done Criteria as objectively testable commands + expected outputs
- [ ] Complete 2 clean passes of Loop 1 (no shortcuts)
- [ ] Update status from "OUTLINE" to "APPROVED" before implementation begins