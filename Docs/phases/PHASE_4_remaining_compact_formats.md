# PHASE 4 — Remaining Compact Builders + STORY / LISTICLE / REVIEW / COMPARISON / CHECKLIST

## Status
OUTLINE — Loop 1 review to be completed in full at the start of this phase (once Phase 3 is COMPLETE).

## Problem Statement (from Master Plan)

Phase 3 unlocks FACTS + TUTORIAL by building 3 compact builders. Five formats remain: STORY, LISTICLE, REVIEW, COMPARISON, CHECKLIST. Each needs one specialised compact builder (except CHECKLIST which reuses `aurora-compact-content` with a different data shape). After this phase all 10 formats produce visually distinct, Instagram-native carousels end-to-end.

## Scope

**In scope — four new builders:**
- `aurora-compact-quote` — short quote (≤15 words) + author, minimal chrome. Used by STORY (narrative pull-quotes) and REVIEW (verdict quote).
- `aurora-compact-list-item` — rank badge (`#1`, `#2`, …) + item name + 1-line description. Used by LISTICLE (rankings) and CHECKLIST (checked/unchecked variant).
- `aurora-compact-rating` — criterion name + score (e.g. `4.2/5`) + 1-line verdict. Used by REVIEW.
- `aurora-compact-comparison` — two-column split with option-A vs option-B + winner badge. Used by COMPARISON.

**Also in scope:**
- Matching Lumina wrappers for all four
- REGISTRY entries (8 new IDs: 4 aurora + 4 lumina)
- Extend `SlideType` enum: `list_item`, `rating`, `comparison` (quote already exists)
- Slide-generation prompt: extend `SLIDE_FORMAT_BLOCKS` for the five formats so the LLM produces the right `slide.type` values
- GAN catalog entries + 3 sample runs per builder
- Full pipeline E2E for each of the 5 formats

**Out of scope:**
- Frontend format-picker UI → Phase 5
- Analytics dashboard → Phase 5
- Mixed-format runs (multiple formats per single run) → deferred Phase D

## Dependencies

- **Phase 3 MUST be COMPLETE** — this phase reuses the `COMPACT_TOKENS` / theme-token structure, the `template_family="compact"` routing, and the GAN catalog scaffolding introduced in Phase 3
- Phase 2's `SLIDE_FORMAT_BLOCKS` will be extended for the 5 new formats (previously empty stubs)

## Preliminary File List (subject to Loop 1 confirmation)

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `frontend/utils/canvasTemplates/aurora_compact_quote.ts` | CREATE | Builder |
| 2 | `frontend/utils/canvasTemplates/aurora_compact_list_item.ts` | CREATE | Builder |
| 3 | `frontend/utils/canvasTemplates/aurora_compact_rating.ts` | CREATE | Builder |
| 4 | `frontend/utils/canvasTemplates/aurora_compact_comparison.ts` | CREATE | Builder |
| 5 | `frontend/utils/canvasTemplates/index.ts` | MODIFY | Register 4 aurora + 4 lumina keys |
| 6 | `backend/core/orchestration/contracts.py` | MODIFY | Extend `SlideType` enum: `list_item`, `rating`, `comparison` |
| 7 | `backend/core/orchestrators/content/format_blocks.py` | MODIFY | Fill in the 5 remaining `SLIDE_FORMAT_BLOCKS` entries with concrete rules |
| 8 | `backend/core/prompts/templates/slide_generation.txt` | MODIFY | Document new slide types in the shared rules; format-block still injects specifics |
| 9 | `scripts/GAN_CATALOG.json` | MODIFY | 8 new template-ID entries |
| 10 | `frontend/constants/slideTemplates.ts` | MODIFY | Add starter content + metadata for the 4 new template variants |
| 11 | `backend/tests/test_compact_family_phase4.py` | CREATE | Unit tests for 4 new slide types + prompt injection |
| 12 | `frontend/e2e/all-formats.spec.ts` | CREATE | Playwright: one E2E run per remaining format (STORY, LISTICLE, REVIEW, COMPARISON, CHECKLIST) |

## Open Questions (to resolve during Loop 1)

- **Q1: `aurora-compact-list-item` — does each list item get its own slide, or does the LLM produce N item slides sharing the same template?** Preferred: one item per slide (the strategy doc's "1 idea per slide" hard rule).
- **Q2: `aurora-compact-rating` — does score display use a chart-style bar, a raw number, or star icons?** Preferred: raw big number (e.g. `4.2/5`) + a thin gradient bar underneath — simple, brand-consistent.
- **Q3: `aurora-compact-comparison` — image + text per column? Or purely text? What's the fallback if only one image is provided?** Preferred: text-first columns with optional image on top of each — the LLM decides based on `image_query` fields.
- **Q4: CHECKLIST format — does it need its own builder or does `aurora-compact-list-item` with a checkbox glyph suffice?** Preferred: reuse `aurora-compact-list-item` with a `checklist_variant: true` flag on the slide — no new builder needed.
- **Q5: `aurora-compact-quote` for REVIEW verdict — same design as STORY quote or a "verdict card" style?** Preferred: same design; the surrounding context (verdict vs. narrative) is set by the surrounding slides, not the quote card itself.

## Preliminary External Verification Claims (to document during Loop 1)

- Fabric.js v7 supports two-column layouts with independent clipPaths per column — verify via `node_modules/fabric/dist/src/shapes/Rect.d.ts`
- Chart.js not needed for rating bars — Fabric.js `Rect` + gradient fill is enough (simpler + no DPR bugs)
- REGISTRY collision detection — adding 8 more entries doesn't slow REGISTRY lookup (O(1) hash) — pure fact, no verification needed but note in the plan

## Preliminary Success Criteria (Loop 2 hooks)

- `pytest tests/test_compact_family_phase4.py -v` → all pass
- One E2E pipeline run per format (5 topics, 5 runs) completes successfully
- Each run's slides use the expected template IDs — a manual check against `slides.json` for each run
- GAN validation: content-zone diff ≤ 8 % across all 4 new templates
- Every slide passes the "1 idea per slide, ≤20 words body" hard rule (LLM verification via post-generation validator — extend existing `slide_validator.py`)

## Preliminary Real Data Testing Scenarios (Loop 3 hooks)

- **A**: STORY run → open editor for hero slide (`aurora-compact-quote`), verify quote text + attribution + no bullets
- **B**: LISTICLE run → verify 5-10 slides use `aurora-compact-list-item` with rank badges `#1` through `#N`
- **C**: REVIEW run → verify criteria slides use `aurora-compact-rating` with visible score bar
- **D**: COMPARISON run → verify two-column comparison slide with winner badge
- **E**: CHECKLIST run → verify `aurora-compact-list-item` with checkbox glyph on each item
- **F**: Regression — OPINION and EXPLAINER (extended family) still render exactly as before

## Rollback Plan (Preliminary)

1. Revert ~12 files
2. Delete new template IDs from REGISTRY
3. Any real run that emitted these template IDs will fall back to `aurora-extended-*` via the same `inferTemplate()` fallback path already in place

## Loop 1 To-Do (before coding)

- [ ] Answer 5 open questions above
- [ ] Fill External Verification Log with concrete source references
- [ ] Write full Implementation Steps with exact code snippets
- [ ] Write Done Criteria as objectively testable commands
- [ ] Complete 2 clean passes of Loop 1
- [ ] Update status from "OUTLINE" to "APPROVED"