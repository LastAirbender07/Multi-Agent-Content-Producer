# ROADMAP — Multi-Format Instagram Carousel Producer

> **One-pager index.** For any question of the form "what do we build next?" this is the answer.
> **Sources of truth:**
> - `Docs/phases/MASTER_PLAN_multi_format.md` — phase order, dependencies, risks
> - `Docs/phases/PHASE_N_*.md` — detailed step-by-step per phase
> - `Docs/design/templates/` — every family + component spec
> - `Docs/design/SLIDE_REFERENCES_FULL*.md` — 85-image analysis behind the design

---

## Where we are now (2026-08-28)

| # | Phase | Status | Detail plan |
|---|---|---|---|
| 1 | Editor Canvas Save | ✅ SHIPPED | `PHASE_1_editor_canvas_save.md` |
| 2 | Compact Template Family (5 core, sequential + GAN-iterate) | 🟢 **IN PROGRESS** — Stage A.1 done | [`PHASE_2_compact_templates.md`](phases/PHASE_2_compact_templates.md) |
| 3 | Format Plumbing (auto template selection LLM) | 📝 OUTLINE — needs Loop-1 | `PHASE_3_format_plumbing.md` |
| 4 | Remaining 5 Compact Families | 📝 OUTLINE — needs Loop-1 | `PHASE_4_remaining_compact_formats.md` |
| 5 | UI (format chip) & Analytics | 📝 OUTLINE — needs Loop-1 | `PHASE_5_ui_and_analytics.md` |
| 6A | aurora-editorial-* (SahilBloom style) | ⏸ NOT DRAFTED — family MDs are spec | *(pending Phase 5)* |
| 6B | aurora-product-* (Anthropic style) | ⏸ NOT DRAFTED — family MDs are spec | *(pending Phase 5)* |
| 6C | aurora-nextwork-* (dark cinematic) | ⏸ NOT DRAFTED — family MDs are spec | *(pending Phase 5)* |
| 6D | aurora-carousel-cover-hero | ⏸ DEFERRED — depends on user demand | — |

---

## What "in progress" means for Phase 2

Phase 2 is broken into **4 stages** — each with sequential sub-steps and green-light gates. **We do NOT skip stages or batch work.**

### Stage A — Foundation (POC gate) ✅ COMPLETE 2026-08-28

_Proved the tooling works end-to-end before touching templates. All 8 POC gates green._

| Step | Description | Status |
|---|---|---|
| 2.A.1 | Download Playfair Display Italic Bold + Inter Black woff2 | ✅ DONE 2026-08-28 |
| 2.A.2 | Register fonts in `renderer_entry.ts` + rebuild bundle | ✅ DONE 2026-08-28 |
| 2.A.3 | Add `COMPACT_TOKENS` to `design_tokens.ts` | ✅ DONE 2026-08-28 |
| 2.A.4 | Create `scripts/GAN_REFERENCES.json` — reference-PNG registry | ✅ DONE 2026-08-28 |
| 2.A.5 | Build `scripts/gan_reference.js` — main GAN loop | ✅ DONE 2026-08-28 |
| 2.A.6 | Build `scripts/gan_component_snapshots.js` — component GAN loop | ✅ DONE 2026-08-28 |
| **POC Gate** | `bash scripts/poc_stage_a.sh` prints `POC_STAGE_A=PASS` | ✅ **GREEN 2026-08-28** |

### Stage B — Build 6 components sequentially
_Each component: write TS → hand-crop reference PNG → GAN-iterate → ≤ 3 % → commit → next._

| # | Component | Iter budget | Status |
|---|---|---|---|
| 1 | `make-brand-pill` | 5 | pending |
| 2 | `make-dot-progress-indicator` | 5 | pending |
| 3 | `make-outlined-pill` | 5 | pending |
| 4 | `make-mixed-weight-text` | 8 (hardest) | pending |
| 5 | `make-number-badge` | 3 | pending |
| 6 | `make-circular-nav-arrow` | 3 (optional) | pending |

### Stage C — Build 5 families sequentially
_Each family: write TS + fixtures → register → GAN-iterate → ≤ 5 % → commit → next._

| # | Family | Iter budget | Status |
|---|---|---|---|
| 1 | `aurora-compact-hook` | 8 | pending |
| 2 | `aurora-compact-fact` | 8 | pending |
| 3 | `aurora-compact-step` | 10 | pending |
| 4 | `aurora-compact-list-item` | 10 | pending |
| 5 | `aurora-compact-quote` (terracotta) | 12 (hardest) | pending |

### Stage D — Wiring & regression
- Add Lumina wrappers
- Add starter content
- Update `_canvas_template_id()` signature (non-breaking)
- Full E2E regression: `pnpm playwright test` + `pytest tests/`
- Loop 2 + Loop 3 review

---

## After Phase 2 ships

**Phase 3 next.** Format Plumbing is the LLM upgrade that auto-selects the right compact template per slide (fact → `compact-fact`, tutorial-step → `compact-step`, etc.). Currently OUTLINE — will need its own Loop-1 review before we start.

Then Phase 4 (remaining compact families) and Phase 5 (UI polish).

**Phase 6A-D are advanced brand-specific families** (SahilBloom / Anthropic / nextwork). They ship independently, prioritized by user demand.

---

## Design source-of-truth

The **design catalog is complete** and locked in:
- `Docs/design/templates/README.md` — index of all 26 template families + 9 component groups
- `Docs/design/templates/families/*.md` — one MD per family with reference PNGs, tokens, primitives, GAN acceptance criteria
- `Docs/design/templates/components/*.md` — one MD per component group with prop signatures + reference PNGs

Every implementation phase pulls from this catalog — no design decisions are made ad-hoc in code.

---

## Rule: POC-before-E2E

Before every phase that introduces new tooling (LLM contract, image pipeline, font loading, etc.), the phase's Stage A must produce a **runnable proof** that the new tooling works end-to-end. Only after the POC gate is green do we invest in the full implementation.

For Phase 2, the POC gate is documented at the top of `PHASE_2_compact_templates.md` under "POC Gate — Stage A is the Proof-of-Concept".

---

## Rule: Loops (per `Docs/protocol/REVIEW_PROTOCOL.md`)

Every phase goes through 3 loops:
- **Loop 1** — plan the phase, minimum 2 clean passes (self-review), then approved
- **Loop 2** — implement, verify each Done Criterion against actual code + tests
- **Loop 3** — real-data testing (7+ scenarios per phase) on a live run before "COMPLETE"

Phase 2 is currently in **Loop 2 implementation** — Loop 1 was approved 2026-08-23.
