# PHASE 3 — Format Plumbing (smart, conditional on auto mode)

## Status
OUTLINE — Loop 1 review to be completed in full at the start of this phase (once Phase 2 is COMPLETE).

## Problem Statement (from Master Plan v2)

Phase 2 will ship 5 working compact templates that users can pick manually in the editor — but the pipeline itself still emits extended-family defaults on every run. Phase 3 wires the pipeline to select the right family (compact / extended) based on the post-format, without wasting an LLM call when the user has already signalled intent through manual angle selection.

## Scope

**In scope**
- **Pydantic schema:** `PostFormat` and `TemplateFamily` enums + `FormatSelectionOutput` in `contracts.py`
- **`Angle.post_format` field** — optional, default `OPINION` for backward compat
- **New async function `format_selection_node(state)`** — runs the LLM classification, saves to `outputs/runs/{run_id}/format_selection.json`
- **Smart activation rule** (the key correction from the user):
  - `angle_mode == "auto"` → run `format_selection_node` (LLM cost incurred)
  - `angle_mode == "manual"` → **skip the LLM entirely**. The `AngleRequest` schema gets `post_format: Optional[PostFormat]` so the frontend can pass the user's manual pick (from the AngleSelector modal — Phase 5). If missing, defaults to `OPINION`.
- **Prompt injection:** `{format_block}` placeholder in `angle_generation.txt`, `slide_generation.txt`, `caption_generation.txt`
- **`FORMAT_BLOCKS: dict[PostFormat, str]`** in a new `format_blocks.py` — 10 entries per prompt
- **`_canvas_template_id()` wired up:** Phase 2 added the `template_family` param with default `"extended"`. Phase 3 reads `state["format_selection"]["template_family"]` at the call site and passes it through. For FACTS/TUTORIAL/LISTICLE etc., this routes slides to `aurora-compact-fact`, `aurora-compact-step`, `aurora-compact-list-item` respectively.
- **Slide-type routing table** — the LLM emits `slide.type` as before (hook/content/stat/quote), and the routing rules map `(post_format, slide_type)` to a compact template ID:
  - FACTS: hook→`compact-hook`, content→`compact-fact`, stat→`compact-fact` (with number emphasis)
  - TUTORIAL: hook→`compact-hook`, content→`compact-step`
  - LISTICLE: hook→`compact-hook`, content→`compact-list-item`
  - REVIEW: hook→`compact-hook`, content→`compact-fact` (temp until Phase 4), quote→`compact-quote`
  - STORY: hook→`compact-hook`, quote→`compact-quote`, content→`extended-content` (temp until compact-photo-caption in Phase 4)
  - CHECKLIST: hook→`compact-hook`, content→`compact-list-item`
  - OPINION/EXPLAINER/TRENDING: unchanged — extended family
- **Slide validator** (`slide_validator.py`) — extend with compact-family rules: body ≤ 20 words, zero bullets. Auto-regen slides that fail.
- **Backfill script** — `backfill_post_format.py`, only run once. Reads every `outputs/runs/*/research/research_result.json`, calls LLM once per run, writes `format_selection.json` + patches `angles/selection.json[*].post_format`
- **New endpoint** — `GET /content/{run_id}/format-selection`

**Out of scope**
- The 5 compact templates that Phase 4 will fill in (comparison, rating, photo-caption, annotated-shot, visual-stat) — Phase 3 falls back to `extended-content` for the corresponding formats until Phase 4 lands
- UI changes — Phase 5 owns the FormatSelectionCard, AngleSelector chip picker, analytics
- Instagram publisher, template studio, mixed-format runs — all deferred

## Dependencies

- **Phase 2 MUST be COMPLETE** — this phase wires the pipeline to REAL compact templates. Without them, we'd route to non-existent REGISTRY keys.
- `_canvas_template_id()` already has the `template_family` param (added in Phase 2 Step 2.12 — call site keeps default `"extended"` — Phase 3 changes the call site).
- The 5 Phase-2 templates (`aurora-compact-hook`, `-fact`, `-step`, `-list-item`, `-quote`) must be present in REGISTRY.
- `ContentOrchestrator.run()` is imperative — new `format_selection_node` is called as a plain async function, not a LangGraph node.

## Preliminary File List (subject to full Loop 1 at phase start)

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `backend/core/orchestration/contracts.py` | MODIFY | Add `PostFormat`, `TemplateFamily`, `FormatSelectionOutput`; extend `Angle.post_format` + `AngleRequest.post_format` |
| 2 | `backend/core/prompts/templates/format_selection.txt` | CREATE | LLM prompt for the auto-mode classification |
| 3 | `backend/core/orchestrators/content/format_blocks.py` | CREATE | 3 dicts (ANGLE / SLIDE / CAPTION blocks × 10 formats) |
| 4 | `backend/core/orchestrators/content/format_selector.py` | CREATE | `format_selection_node(state)` — imperative async function |
| 5 | `backend/core/orchestrators/content/orchestrator.py` | MODIFY | **Conditional** call: only if `angle_mode == "auto"`. Otherwise use `AngleRequest.post_format` (from the frontend). |
| 6 | `backend/core/prompts/templates/angle_generation.txt` | MODIFY | Add `{format_block}` placeholder |
| 7 | `backend/core/prompts/templates/slide_generation.txt` | MODIFY | Add `{format_block}` placeholder |
| 8 | `backend/core/prompts/templates/caption_generation.txt` | MODIFY | Add `{format_block}` placeholder |
| 9 | `backend/core/orchestrators/angle/generator.py` | MODIFY | Inject `ANGLE_FORMAT_BLOCKS[pf]` |
| 10 | `backend/core/orchestrators/content/slide_generator.py` | MODIFY | Inject `SLIDE_FORMAT_BLOCKS[pf]`; also produce `slide.type` values that map into the routing table |
| 11 | `backend/core/orchestrators/content/caption_generator.py` | MODIFY | Inject `CAPTION_FORMAT_BLOCKS[pf]` |
| 12 | `backend/core/orchestrators/content/carousel_generator.py` | MODIFY | Read `state["format_selection"]["template_family"]` at the call site, pass to `_canvas_template_id()`. Wire the `(post_format, slide_type) → template_id` routing table. |
| 13 | `backend/core/orchestrators/content/slide_validator.py` | MODIFY | Add compact-family rules: word count ≤ 20, no bullets, auto-regen if violated |
| 14 | `backend/scripts/backfill_post_format.py` | CREATE | One-off script — same pattern as `backfill_categories.py` |
| 15 | `backend/apps/api/v1/content.py` | MODIFY | `GET /content/{run_id}/format-selection` endpoint |
| 16 | `backend/apps/api/v1/schemas.py` | MODIFY | Extend `AngleRequestBody` (or equivalent) with `post_format: Optional[PostFormat]` |
| 17 | `frontend/lib/api/types.ts` | MODIFY | Add `PostFormat` + `TemplateFamily` string-literal types, extend `Angle` interface with optional `post_format`, extend `AngleRequestBody` with optional `post_format` |
| 18 | `frontend/lib/api/content.ts` | MODIFY | Add `getFormatSelection(runId)` fetch |
| 19 | `backend/tests/test_format_plumbing.py` | CREATE | Unit tests for enums, node, routing table, backfill, validator rules |

## Open Questions (to resolve during Loop 1 at phase start)

- **Q1: Where does the `post_format` come from in manual angle mode?** Preferred: from the frontend, passed in the `AngleRequest` body. The Phase-5 AngleSelector modal shows a small format chip picker alongside the angle picker.
- **Q2: What if the user runs manual mode without picking a format?** Preferred: default to `OPINION` — the safest fallback, keeps the extended family and Naval-style voice.
- **Q3: What if a slide's `(post_format, slide_type)` combo doesn't have a compact template yet (Phase 3 has only 5 of 10)?** Preferred: fall back to `aurora-extended-*` for that slide only. The routing table has explicit fallbacks; Phase 4 fills the gaps.
- **Q4: Does the slide validator's word-count check regenerate the whole slide, or truncate?** Preferred: regenerate ONCE via LLM with a "compact-body-only" reminder — same pattern as `_regen_single_slide` in `slide_validator.py`. If regen still fails, log a warning and keep the original.

## Preliminary Design Notes

- The routing table lives in `carousel_generator.py` as a dict:
  ```python
  COMPACT_ROUTING: dict[tuple[PostFormat, str], str] = {
      (PostFormat.facts,     "hook"):    "aurora-compact-hook",
      (PostFormat.facts,     "content"): "aurora-compact-fact",
      (PostFormat.facts,     "stat"):    "aurora-compact-fact",   # temp — Phase 4 has visual-stat
      (PostFormat.tutorial,  "hook"):    "aurora-compact-hook",
      (PostFormat.tutorial,  "content"): "aurora-compact-step",
      # ... etc
  }
  ```
- Only fires when `template_family == "compact"`. Otherwise `_canvas_template_id()` uses the existing extended logic (unchanged).
- LLM call cost: format_selection prompt ~600 tokens in + ~150 tokens out ≈ $0.003 per run in auto mode. Zero cost in manual mode.

## Preliminary Success Criteria (Loop 2 hooks — to expand at phase start)

- `pytest tests/test_format_plumbing.py -v` → all pass
- Full auto-mode pipeline run with a FACTS-triggering topic ("5 surprising facts about Indian tea") produces slides with `canvas_template: "aurora-compact-fact"` — verified in `slides.json`
- Full manual-mode pipeline run where the frontend passes `post_format: "TUTORIAL"` produces slides with `canvas_template: "aurora-compact-step"` — verified in `slides.json`
- Backfill script reports zero errors across all existing runs
- Existing OPINION runs still produce `aurora-content-*` templates (regression check)

## Preliminary Real Data Testing (Loop 3 hooks)

- **A**: Auto mode + facts-triggering topic → `format_selection.json` shows `recommended: FACTS`, all slides use compact templates
- **B**: Manual mode + explicit `post_format: TUTORIAL` in AngleRequest → compact-step used for content slides, no LLM call fired
- **C**: Manual mode + no `post_format` → defaults to OPINION → extended templates used (regression)
- **D**: Auto mode + LLM classification fails → falls back to OPINION → pipeline completes successfully

## Rollback Plan (Preliminary)

1. Revert the ~17 files
2. Delete every `outputs/runs/*/format_selection.json` (safe — no other file references it)
3. Remove `post_format` fields from `angles/selection.json` (or leave them — the pre-Phase-3 code ignores extra fields)
4. Re-run the Phase-2 renderer bundle (no changes needed)
5. Existing pipeline runs continue rendering exactly as before

## Loop 1 To-Do (before coding starts)

- [ ] Answer 4 open questions above
- [ ] Fill External Verification Log with concrete source refs
- [ ] Write full Implementation Steps with exact code snippets (as detailed as Phase 2)
- [ ] Write Done Criteria as objectively testable commands
- [ ] Complete 2 clean passes of Loop 1
- [ ] Update status from "OUTLINE" to "APPROVED" before implementation begins