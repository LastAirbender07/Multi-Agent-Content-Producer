# PHASE 5 — UI & Analytics for Multi-Format

## Status
OUTLINE — Loop 1 review to be completed in full at the start of this phase (once Phase 4 is COMPLETE).

## Problem Statement (from Master Plan)

Phases 2-4 built the entire multi-format pipeline server-side: `format_selection.json` is written per run, `Angle.post_format` is set on every angle, both extended and compact template families work end-to-end. But **the user still has no way to see or control any of this from the browser**. The pipeline UI shows nothing about the chosen format; the angle cards show only the emotional hook; the analytics dashboard shows no format distribution. Phase 5 closes that gap.

## Scope

**In scope — pipeline page (`/pipeline`):**
- Format recommendation card that appears right after research completes, before Stage 2 (angle generation) begins
  - Shows `recommended` + `reasoning` prominently
  - Offers a "Use different format" dropdown with `alternatives` + all other formats accessible via "See all 10 formats" link
  - Confirming (auto or manual) writes the choice into the `runAngle` request body
- Chip on each angle card showing `post_format` (colour-coded per format, same style as the existing `EmotionalHook` chip)
- Setting to auto-accept the recommendation without showing the card (for power users)

**In scope — analytics page (`/analytics`):**
- New KPI card: "Formats used this month" (distribution)
- Histogram or pie chart of `post_format` distribution across all runs
- Filter to see quality metrics (confidence, image source, publish rate) per format
- Cross-tab of `post_format × emotional_hook` to spot underused combinations

**In scope — settings page (`/settings`):**
- New "Default post_format preference" — if set, overrides the LLM recommendation on every run
- Toggle: "Auto-accept format recommendations" (skip the pipeline UI card)

**In scope — backend endpoint changes:**
- `POST /content/run` request body accepts an optional `override_post_format: PostFormat` field — if set, overrides the auto-selected recommendation
- `GET /analytics/summary` includes new fields: `format_distribution: dict[PostFormat, int]`, `quality_by_format: dict[PostFormat, {avg_confidence, blog_rate, ...}]`

**Out of scope:**
- Mixed-format runs (see Master Plan Phase D) — one format per run remains the contract
- Full A/B testing of formats — deferred until we have real Instagram performance data flowing back
- Post-scheduling calendar based on the Appendix B weekly mix — deferred

## Dependencies

- **Phase 4 MUST be COMPLETE** — all 10 formats must produce visually-distinct output before it's worth showing users which format was chosen
- Backend `GET /content/{run_id}/format-selection` from Phase 2 is the data source for the UI card
- Analytics service (in `backend/core/services/analytics/`) must be extended to compute per-format aggregates
- `run_loader.py` must read `post_format` from `angles/selection.json` (already writing during Phase 2)

## Preliminary File List (subject to Loop 1 confirmation)

**Frontend:**

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `frontend/components/pipeline/FormatSelectionCard.tsx` | CREATE | The card shown between Stage 1 and Stage 2 with recommendation + override picker |
| 2 | `frontend/components/pipeline/AngleCard.tsx` | MODIFY | Add `post_format` chip (colour-coded, tooltipped) |
| 3 | `frontend/store/slices/pipelineSlice.ts` | MODIFY | Add `formatSelection` + `overrideFormat` state; add reducers `setFormatSelection`, `setOverrideFormat`, `clearOverrideFormat`. Preserve through `resetPipeline`. |
| 4 | `frontend/hooks/usePipelineOrchestration.ts` | MODIFY | Send `override_post_format` in the `/content/run` request body when set |
| 5 | `frontend/app/pipeline/page.tsx` | MODIFY | Wire `FormatSelectionCard` between Stage 1 done and Stage 2 running |
| 6 | `frontend/lib/api/content.ts` | MODIFY | `runContent()` accepts optional `overridePostFormat` param |
| 7 | `frontend/lib/api/types.ts` | MODIFY | Extend `ContentRequestBody` with `override_post_format` |
| 8 | `frontend/components/analytics/FormatDistributionSection.tsx` | CREATE | Pie/bar chart of formats used |
| 9 | `frontend/components/analytics/QualityByFormatSection.tsx` | CREATE | Table: format × {confidence, blog rate, image source rate} |
| 10 | `frontend/app/analytics/page.tsx` | MODIFY | Wire the two new sections + one new KPI card |
| 11 | `frontend/lib/api/analytics.ts` | MODIFY | Extend `AnalyticsSummary` type with new fields |
| 12 | `frontend/app/settings/page.tsx` | MODIFY | Add "Default post_format" chip picker + "Auto-accept recommendations" toggle |
| 13 | `frontend/lib/api/settings.ts` | MODIFY | Extend `SettingsContent` interface with `default_post_format`, `auto_accept_format_recommendation` |
| 14 | `frontend/e2e/format-picker.spec.ts` | CREATE | Playwright: full flow — research → format card appears → override → correct format used |

**Backend:**

| # | File | Action | Description |
|---|------|--------|-------------|
| 15 | `backend/apps/api/v1/schemas.py` | MODIFY | Extend `ContentRequest` (or the equivalent) with `override_post_format: PostFormat \| None` |
| 16 | `backend/core/orchestrators/content/orchestrator.py` | MODIFY | If `override_post_format` is set, skip `format_selection_node` and construct a `FormatSelectionOutput` from the override |
| 17 | `backend/core/services/analytics/run_loader.py` | MODIFY | Extract `post_format` per run (from `angles/selection.json` or `format_selection.json`) |
| 18 | `backend/core/services/analytics/aggregator.py` | MODIFY | Compute `format_distribution` + `quality_by_format` aggregates |
| 19 | `backend/core/services/analytics/summary.py` | MODIFY | Expose new aggregates on the summary response |
| 20 | `backend/apps/api/v1/analytics.py` | READ-ONLY | Confirm the summary schema is dict-passthrough (no explicit Pydantic model constraining the shape) |
| 21 | `backend/configs/settings.py` | MODIFY | Add `default_post_format: str | None`, `auto_accept_format_recommendation: bool` settings |
| 22 | `backend/core/services/settings_service.py` | MODIFY | Include the two new fields in editable set |
| 23 | `backend/tests/test_analytics_format.py` | CREATE | Unit tests for the two new aggregates |

## Open Questions (to resolve during Loop 1)

- **Q1: When the user picks an override, does the format card show the LLM's `reasoning` too?** Preferred: yes — reasoning is signal, not noise.
- **Q2: Where does the format card go — Stage 2 area of pipeline, or a separate "1.5" stage?** Preferred: **inside** Stage 2 as a "chooser" that must be resolved before Stage 2 runs. Auto-mode still shows the card briefly (2 s toast) then proceeds.
- **Q3: Which chart type for `format_distribution` — pie, donut, or horizontal bars?** Preferred: horizontal bars — clearer for 10 categories than a pie.
- **Q4: If the user sets `default_post_format` in settings, does it override the LLM recommendation silently or still show the card with an explanatory note?** Preferred: still show the card ("Your default is FACTS — using it") so the user is always aware.
- **Q5: Analytics data source — read `format_selection.json` per run, or a new denormalised `format_analytics.json`?** Preferred: read from `format_selection.json` directly on each analytics fetch — simpler, and the analytics service has a TTL cache (`analytics_cache.py`) so cost stays low.
- **Q6: How to handle old runs without `format_selection.json`?** Preferred: bucket them into `LEGACY` (a synthetic category shown in the distribution chart) rather than skipping them.

## Preliminary External Verification Claims (to document during Loop 1)

- Redux Toolkit slices tolerate optional fields on state — verified by existing `discoverUrl?` and `attachedEvidence?` patterns
- The pipeline SSE stream doesn't need changes — format-selection completes synchronously as part of the imperative orchestrator call, so the existing `research → done` transition is when the format card should appear
- The analytics page's existing `RunReadinessTable` and `ContentStrategySection` components use a `DistributionRow` primitive — the new `FormatDistributionSection` should reuse that primitive for visual consistency
- Recharts (already installed for the existing token chart) is used across analytics — no new charting dependency

## Preliminary Design Notes (visual)

- Format-selection card: same styling as the existing `AngleCard` and `StageCard` components — glassmorphism, dark theme, violet accent
- Format chips: 10 distinct colours, semantic (e.g. FACTS = amber, TUTORIAL = teal, OPINION = red, EXPLAINER = blue) — palette defined once in `frontend/utils/formatPalette.ts`
- Reasoning text: italic, small, muted — 2-3 sentences maximum
- Override picker: same `OptionChip` dropdown as the existing budget picker in `PipelineConfig.tsx`

## Preliminary Success Criteria (Loop 2 hooks)

- `pytest tests/test_analytics_format.py -v` → all pass
- `cd frontend && npx tsc --noEmit` → exits 0
- `cd frontend && pnpm lint` → exits 0
- E2E: run pipeline → format card appears with LLM recommendation + reasoning
- E2E: click "Use different format" → dropdown appears → pick FACTS → Stage 2 uses FACTS (verified by inspecting the run's `angles/selection.json[*].post_format`)
- Analytics page shows format-distribution chart with real data across ≥ 40 runs (35 backfilled + at least 5 new)
- Every angle card shows the `post_format` chip, colour-coded correctly

## Preliminary Real Data Testing Scenarios (Loop 3 hooks)

- **A**: Fresh run → format card appears → auto mode → 2-second toast → Stage 2 proceeds
- **B**: Fresh run → format card appears → manual override → dropdown → pick TUTORIAL → Stage 2 uses TUTORIAL
- **C**: Set `default_post_format = FACTS` in Settings → next run auto-uses FACTS with the "Your default is FACTS" note visible
- **D**: Open analytics → format distribution chart shows ≥ 3 formats (from Phases 2-4 test runs + backfilled runs)
- **E**: Open analytics → quality-by-format section shows meaningful numbers (not all zeros)
- **F**: Angle cards on the pipeline page show the correct `post_format` chip for the chosen format
- **G**: Regression — run OPINION pipeline, verify slides still use extended templates and everything is unchanged

## Rollback Plan (Preliminary)

1. Revert ~23 files
2. Delete `default_post_format` / `auto_accept_format_recommendation` settings from `settings_overrides.json` (safe — pipeline defaults still work)
3. Analytics chart hides itself if `format_distribution` is empty (defensive rendering)
4. Existing pipeline runs remain intact — the override flow is additive

## Loop 1 To-Do (before coding)

- [ ] Answer 6 open questions above
- [ ] Fill External Verification Log with concrete source references (Recharts docs, Redux Toolkit docs, existing component snippets)
- [ ] Write full Implementation Steps (~15-20 steps) with exact code snippets
- [ ] Write Done Criteria as objectively testable commands + Playwright test expected outputs
- [ ] Complete 2 clean passes of Loop 1
- [ ] Update status from "OUTLINE" to "APPROVED"