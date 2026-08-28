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

### Stage A — Foundation (POC v1) ✅ COMPLETE 2026-08-28

_Proved the tooling PLUMBING works with synthetic stubs. All 8 gates green._

| Step | Description | Status |
|---|---|---|
| 2.A.1-6 | Fonts + tokens + GAN scripts (plumbing) | ✅ DONE 2026-08-28 |
| POC v1 Gate | `bash scripts/poc_stage_a.sh` → `POC_STAGE_A=PASS` | ✅ GREEN 2026-08-28 |

### Stage A.5 — POC v2 (one real end-to-end template) 🟠 YELLOW/RED with valuable finding — 2026-08-28

_v1 was synthetic solid-colour rects. v2 renders `aurora-compact-hook` for real, iterates GAN loop vs user reference PNGs. Loop-1 APPROVED 2026-08-28 (3 clean passes). Full implementation shipped 2026-08-28._

| Sub-stage | Description | Status |
|---|---|---|
| 1 | 4 MVP primitives + `component_test` bundle + isolated snapshots | ✅ DONE — all 4 pass at 0.00% self-ref |
| 2 | `aurora_compact_hook.ts` + REGISTRY entry + 2 fixtures | ✅ DONE — template renders, 5 objects on canvas |
| 3 | `gan_reference.js` with `runTemplate()` — real template GAN loop | ✅ DONE — Playwright + static-server + letterbox + LLM strict-JSON w/ path guardrails |
| 4 | `scripts/poc_v2_stage.sh` — one-command runner (6 gates) | ✅ DONE — all 6 gates work end-to-end |
| **POC v2 Gate** | `bash scripts/poc_v2_stage.sh` → `POC_V2=?` | **`POC_V2=RED best=42.88%/52.25%`** — SEE FINDING BELOW |

**⚠ Critical POC finding (this is exactly what POC v2 exists to catch):**

The 2 user reference PNGs (`others/image copy 3.png`, `others/image copy 4.png`) are **photographs of an actual iPhone displaying an Instagram carousel**, complete with the brown phone case frame and photo distortion — NOT clean digital design mockups. Pixel probing confirmed:
- Corners contain brown phone-case pixels `[168,134,110]`
- Bottom rows contain photo-shadow gradient
- The actual slide content occupies only ~60% of the ref PNG's area, wrapped in phone-case chrome

**What this means for Stage B:**
- Before Stage B begins, either **(a)** hand-crop new reference PNGs to isolate the slide content (removing the phone-case frame), OR **(b)** relax the ≤ 5 % tolerance to ≤ 15 % accepting the photo-frame noise, OR **(c)** switch to structural comparison (object bounding boxes) instead of pixel diff.
- The infrastructure — Playwright + fabric render + pixelmatch + LLM analysis with path guardrails — is proven to work end-to-end. The pipeline is not the blocker.
- **The LLM analysis is genuinely useful** — over 8 iterations it produced 62 total fixes, correctly identifying real position and sizing issues (5 filtered fixes in path-guardrail bucket, so guardrail works too).

**Decision point:** the POC v2 has served its purpose — it proved the pipeline works AND caught a real Loop-1-missed assumption (that user PNGs were clean design refs). Stage B needs a design-input clarification before starting.

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
