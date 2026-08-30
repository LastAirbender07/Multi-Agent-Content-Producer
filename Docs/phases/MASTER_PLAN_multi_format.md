# MASTER PLAN — Multi-Format Content Strategy (v4)

> **Status:** APPROVED — actively executing Phase 2 Stage D (final wiring)
> **Last synced with reality:** 2026-08-30
> **Revised on:** 2026-08-23 based on two user course corrections:
>   1. **Slides first, plumbing second** — the visible template design is the highest-leverage change; format-selection plumbing lands after.
>   2. **Don't waste tokens on format-selection in manual mode** — user's angle choice already signals format intent. Only auto mode runs the LLM.
> **Revised on:** 2026-08-23 (v3) — design catalog expanded. Reference analysis broadened from 13-sample to full 85-image corpus (see `Docs/design/SLIDE_REFERENCES_FULL.md` + `..._PART2.md`). Full family + component catalog now lives in `Docs/design/templates/` — one MD per family + component group, linked to the exact analysis section and reference PNG(s) for GAN diff.
>
> **Design source of truth (v3):**
>   - **`Docs/design/templates/README.md`** — index of every family + component we plan to build
>   - **`Docs/design/templates/families/`** — 26 family MDs, one per canonical template
>   - **`Docs/design/templates/components/`** — 9 component-group MDs covering ~90 primitives
>   - **`Docs/design/SLIDE_REFERENCES_FULL.md`** — full-fidelity analysis of images 1–47 (others/, SahilBloom/, claude/)
>   - **`Docs/design/SLIDE_REFERENCES_FULL_PART2.md`** — full-fidelity analysis of images 48–85 (nextwork/)
>   - `Docs/design/SLIDE_REFERENCES_ANALYSIS.md` (v1) — sample-only notebook, retained for historical context

---

## The North Star (unchanged)

Turn our pipeline from a **one-format producer** (opinion-only, dense-slide) into a **10-format producer** (OPINION / FACTS / TUTORIAL / EXPLAINER / TRENDING / STORY / LISTICLE / REVIEW / COMPARISON / CHECKLIST) with **two visual families**:

- **extended** — today's dense look, kept as-is
- **compact** — new modern Instagram-native look with big type, one idea per slide, 2-second readability

**Success metric:** we produce ≥ 3 format types per week; compact slides pass GAN validation ≤ 5 % content-zone diff; user runs no longer feel like a "wall of text on a phone".

**Non-goals (deferred):**
- Instagram auto-publisher
- Template Studio (no-code template creation)
- Mixed-format per-run (multiple formats in one run)
- Reel-format (9:16) rendering — see `Docs/design/templates/families/aurora-reel-cover.md` (deferred)
- Real-time image-gen for painterly artwork (Phase 6C dependency)

---

## Why This Order (Revised)

Old plan: **Plumbing → Templates → Formats → UI** (4 weeks)
New plan: **Templates → Plumbing → Formats fill-in → UI** (4 weeks)

Rationale:
- The **visible slide design is the actual problem** the strategy doc identified (Side B: "our slides are too dense to read"). Solving this first delivers immediate visible value even before any format infrastructure lands.
- Once we have working compact templates on real runs, the plumbing job (format_selection_node, `{format_block}` injection, prompt tweaks) becomes obvious — because we KNOW what data the templates need.
- If we build plumbing first, we ship a version with `template_family="extended"` on every slide (zero visible change), then have to build templates ANYWAY. The user gets value 2 weeks later.
- **Manual angle mode already signals format intent** — a user who picks "5 things I wish I knew…" has already told us it's a LISTICLE. Wasting an LLM call to re-classify is inefficient.

---

## Phase Breakdown

```
PHASE 2 ── Compact Template Family — 5 core builders (Week 1)          🟡 STAGE D PARTIAL
   │
   │  ✅ SHIPPED (2026-08-29):
   │      ├── aurora-compact-hook       ✅ REGISTRY + builder + fixtures + GAN PASS
   │      ├── aurora-compact-fact       ✅ (2 variants: fact, fact-compare) GAN YELLOW 13%
   │      ├── aurora-compact-step       ✅ (3 variants: step, step-index, step-detail + stat-hero) GAN FAIR 26-35%
   │      ├── aurora-compact-list-item  ✅ GAN YELLOW 14%
   │      ├── aurora-compact-quote      ✅ GAN YELLOW 55% (portrait ref mismatch — acceptable)
   │      ├── Compact design tokens ✅ + Playfair Display Italic Bold ✅ + Inter Black ✅
   │      ├── Shared compact primitives ✅ (make-brand-pill, make-outlined-pill, make-mixed-weight-text,
   │      │   make-dot-progress-indicator, make-number-badge, make-editorial-header-bar)
   │      ├── Editor Templates panel — all 11 compact tiles visible ✅
   │      ├── Starter content wired ✅
   │      ├── canvas_template race eliminated ✅
   │      └── 21/21 templates pass Playwright audit ✅
   │
   │  ❌ NOT YET SHIPPED (Stage D remaining):
   │      ├── Lumina wrappers via lw() — lumina-compact-{hook,fact,step,list-item,quote} NOT in REGISTRY
   │      ├── frontend/e2e/compact-templates.spec.ts — NOT written
   │      └── Full Playwright regression (≥ 45/47 baseline) — NOT re-verified
   │
   │  Templates exist, editable, screenshottable — pipeline still emits extended defaults
   ↓
PHASE 3 ── Format Plumbing (Week 2)
   │      ├── PostFormat + TemplateFamily enums (Pydantic)
   │      ├── format_selection_node — ONLY runs in auto mode
   │      ├── Manual angle-mode: user picks format in the same modal as angles
   │      ├── {format_block} injection into 3 prompts (angle, slide, caption)
   │      ├── _canvas_template_id() gains template_family
   │      ├── Backfill script for existing 35 runs
   │      └── GET /content/{run_id}/format-selection endpoint
   │      Pipeline now produces the right slides for the right format
   ↓
PHASE 4 ── Remaining 5 Compact Builders (Week 3)
   │      ├── aurora-compact-comparison        → aurora-compact-comparison.md
   │      ├── aurora-compact-rating            → aurora-compact-rating.md
   │      ├── aurora-compact-photo-caption     → aurora-compact-photo-caption.md
   │      ├── aurora-compact-annotated-shot    → aurora-compact-annotated-shot.md
   │      ├── aurora-compact-visual-stat       → aurora-compact-visual-stat.md
   │      ├── Ship additional components (per family MDs):
   │      │   • diagrams.md → make-vpc-boundary-box, make-hand-drawn-callout-arrow, make-highlight-circle
   │      │   • typography.md → make-handwritten-annotation, make-monospace-label
   │      │   • charts.md → make-progress-bar-stat, make-figure-row-with-anomaly, make-compact-bar-chart
   │      │   • Caveat + JetBrains Mono fonts
   │      ├── E2E pipeline runs for REVIEW, COMPARISON, STORY, CHECKLIST
   │      └── GAN validation ≤ 5 % on all 10 compact templates
   │      All 10 compact templates operational; all 10 formats can run end-to-end
   ↓
PHASE 5 ── UI & Analytics (Week 4)
   │      ├── AUTO MODE: FormatSelectionCard between Stage 1 and Stage 2
   │      ├── MANUAL MODE: format chip picker inside AngleSelector modal
   │      ├── post_format chip on every angle card
   │      ├── Analytics: format distribution + per-format quality metrics
   │      ├── Settings: default_post_format + auto_accept_format_recommendation
   │      └── E2E Playwright for auto + manual paths
   ↓
PHASE 6 ── Advanced Template Families (Weeks 5–8, phased incrementally)
          These families are large enough that each ships as its own sub-phase.
          Ordering is by ROI — most-broadly-useful first.

          Sub-phase 6A — aurora-editorial-* (SahilBloom book-page family)
             • aurora-editorial-cover, aurora-editorial-list-item, aurora-editorial-quote-tweet, aurora-essay-body
             • WSJ-hedcut illustration library (10 commissioned + prompt-engineered fallback)
             • Fraunces Bold font
             → catalog: families/aurora-editorial-*.md, families/aurora-essay-body.md

          Sub-phase 6B — aurora-product-* (Anthropic-style product marketing)
             • aurora-product-cover (4 heroType variants) + aurora-product-body (11 bodyLayout variants)
             • Requires ~90% of components/{charts,cards,decorative,mockups}.md
             → catalog: families/aurora-product-cover.md, families/aurora-product-body.md

          Sub-phase 6C — aurora-nextwork-* (dark-cinematic AWS-education family)
             • aurora-nextwork-cover + aurora-nextwork-body (20+ bodyLayout variants)
             • aurora-nextwork-spotlight-cover + aurora-nextwork-spotlight-body
             • Painterly artwork library (AI-image-gen with locked style prompt)
             • Full AWS icon asset library (30+ services)
             → catalog: families/aurora-nextwork-*.md, families/aurora-nextwork-spotlight-*.md

          Sub-phase 6D — aurora-carousel-cover-hero + supporting families ✅ PARTIALLY BUILT
             • aurora-carousel-cover-hero (peach pill + display + mockup family)
               → aurora-carousel-cover-hero-phone: BUILT (POC v2, 2026-08-28)
               → aurora-carousel-cover-hero-images: BUILT (POC v2, 2026-08-28)
               → Shared component library: shared/cover/ (7 components) — BUILT
             • aurora-trend-brief, aurora-annotated-example — Deferred until user demand
             → catalog: families/aurora-carousel-cover-hero.md, families/aurora-trend-brief.md
```

## Dependencies Between Phases

| Phase | Depends on | Provides for next |
|-------|-----------|-------------------|
| 2 | Phase 1 (canvas save) shipped | 5 working compact builders + tokens + fonts; user can manually pick them in the editor |
| 3 | Phase 2 shipped (so plumbing routes to real builders, not stubs) | PostFormat enum + format_selection_node + prompt injection + backfill |
| 4 | Phase 3 shipped | Remaining 5 compact builders + full E2E for all 10 formats |
| 5 | Phase 4 shipped | UI + analytics for format visibility & control |
| 6A (editorial) | Phase 5 shipped; extended-family stability | New Playfair Display Bold + hedcut illustration library + 4 editorial families |
| 6B (product) | Phase 6A shipped (Fraunces already loaded there) | Anthropic-style product-marketing families for AI/research topics |
| 6C (nextwork) | Phase 6B shipped (mockup primitives reused); painterly-artwork pipeline decision | Dark-cinematic AWS-education family + spotlight sub-brand |
| 6D (carousel-cover-hero) | On-demand only — deferred until content team requests | Remaining @holler.academy-style covers + trend-brief + annotated-example |

---

## Loop 1 verification for THIS master plan

### External Verification Log

| Claim | Verified against | Verified on |
|-------|------------------|-------------|
| The user's own reference images (nextwork, claude, SahilBloom, others) show 10 distinct compact-slide layouts we can extract as canonical templates | Direct read of 13 PNGs via `read_file` — notes in `Docs/design/SLIDE_REFERENCES_ANALYSIS.md` | 2026-08-23 |
| Fabric.js v7 supports arbitrary font families via `FontFace` loading — same pattern as existing Plus Jakarta Sans + Syne Bold | `backend/renderer/renderer_entry.ts:32-43` (existing FontFace loop) | 2026-08-23 |
| REGISTRY in `frontend/utils/canvasTemplates/index.ts:31` supports adding new builder keys — 20+ Lumina wrappers already prove multiple keys point at same builder function | Direct read of `index.ts:31-56` | 2026-08-23 |
| Editor's Templates panel auto-picks up new REGISTRY keys via `SLIDE_TYPES = Object.keys(REGISTRY).filter(k=>k.startsWith("aurora-"))` — proven pattern | `AI_CHANGELOG.md` 2026-06-25 "SLIDE_TYPES derives from Object.keys(REGISTRY)…" | 2026-08-23 |
| AngleSelector modal already exists as `frontend/components/pipeline/AngleSelector.tsx` (per Phase 1 audit) — a format chip picker can be added inline without a new component surface | Codebase grep for AngleSelector | 2026-08-23 |
| `_canvas_template_id()` at `carousel_generator.py:30` accepts new args with default values without breaking existing callers (3 hits, all internal) | grep -n `_canvas_template_id` | 2026-08-23 |
| LangGraph orchestrator (`ContentOrchestrator.run()`) supports conditional imperative calls — pattern used already for angle_mode auto/manual branching | Direct read of `orchestrator.py` (Phase 1 audit) | 2026-08-23 |
| Backfill scripts against `outputs/runs/*` are safe and non-destructive — established by `backfill_categories.py` in 2026-07 | `AI_CHANGELOG.md` 2026-07-04 "35 runs updated, 38 hooks normalised" | 2026-08-23 |
| Fabric text sizes 90-120pt render crisp at 2× device_scale_factor — verified in existing extended aurora-hook builder | GAN validation results (AI_CHANGELOG 2026-06-19 iter 7 — 10.5 % avg diff) | 2026-08-23 |

## Design Reference

**Primary catalog:** `Docs/design/templates/` — one MD per canonical family + one MD per component group. Every entry links to the exact section of the analysis docs + reference PNGs used for GAN verification.

**Full analysis (all 85 images):**
- `Docs/design/SLIDE_REFERENCES_FULL.md` — images 1–47 (others/, SahilBloom/, claude/)
- `Docs/design/SLIDE_REFERENCES_FULL_PART2.md` — images 48–85 (nextwork/)

Key expanded takeaways vs the v1 sample analysis:

- **26 canonical template families** identified (up from 10 in the v1 sample) — 5 Phase 2 core, 5 Phase 4 remaining, 16 Phase 5+ advanced (editorial book-page, tweet-quote, essay-body, Anthropic product cover/body with 11+ bodyLayout sub-variants, nextwork cover/body with 20+ sub-variants, nextwork spotlight sub-brand).
- **~90 shared components** documented across 9 groups (typography, cards, mockups, charts, diagrams, decorative, icons, lists, layouts).
- **Common signature (Phase 2 core):** cream `#F5F0E8` bg + huge black sans-serif headline (52-140 pt) + ALL-CAPS peach pill label + small brand pill.
- **Advanced brand systems:**
    - SahilBloom editorial — cream `#F3ECD8` + Playfair serif + WSJ-hedcut B&W illustrations.
    - Anthropic product — 4 palette variants (warm-off-white/stone/pale-blue/warm-cream) + Inter+Fraunces+JetBrains Mono + coral accent + duotone portrait cutouts.
    - nextwork dark-cinematic — dark canvas + inset rounded card + AI-generated painterly artwork + Inter+Fraunces + mint/warn-red/yellow semantic accents.
    - nextwork spotlight — light cream + burnt-orange accent + Caveat handwritten + serif display.
- **New fonts required:**
    - **Phase 2 core:** Playfair Display Italic Bold (quote emphasis) + Inter Black (display headlines).
    - **Phase 4:** Caveat (handwritten annotations), JetBrains Mono (technical labels), Bebas Neue/Barlow Condensed (stamp text).
    - **Phase 5+:** Fraunces Bold (Anthropic + nextwork concept covers), Noto Sans + Noto Serif (multilingual glyph coverage).
- **Design rules (unchanged):** one idea per slide (hard), ≤ 20 words per body on compact family (~40 words on essay/product families), zero bullet lists on compact, one supporting visual per slide, colour-locked contracts across a carousel (e.g. step-N always uses colour-N).

**Reference PNGs live at:** `backend/outputs/slide-references/{others,SahilBloom,claude,nextwork}/*.png`. Every catalog entry lists which PNGs are the GAN diff targets.

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Phase |
|------|-----------|--------|-----------|-------|
| Compact templates don't render crisp at Playwright 2× DPI (font weight or sizing bug) | Medium | Visible quality regression | GAN validation ≤ 5 % gate + iterate before shipping (matches Phase 1 fix pattern for chart DPR) | 2 |
| Playfair Display font takes too long to load in headless Playwright, screenshot fires before fonts ready | Low | Blank/fallback fonts in PNG | `document.fonts.ready` await + 300 ms buffer (already used) | 2 |
| Compact builders violate the "one idea per slide" rule due to LLM stuffing 3 bullets in body | High if we don't gate it | Slides look dense again | Extend `slide_validator.py` with word-count + no-bullet check for compact family; auto-regen if fails | 3 |
| Manual format picker in AngleSelector adds UI complexity users don't grok | Medium | Poor UX | Loop 3 real-data scenarios: run 5 users through, check < 10 s to complete both picks | 5 |
| Format selection LLM in auto mode returns invalid PostFormat | Low | Pipeline halts | Pydantic-enforced enum + auto-retry + fallback to OPINION | 3 |
| Backfill script fails on old runs missing `research_result.json` | Low | Backfill partial | Skip-with-log pattern (same as `backfill_categories.py`) | 3 |
| WSJ-hedcut illustration library cannot be produced consistently (either via commission or Midjourney LoRA) | High | Phase 6A cannot ship convincingly — SahilBloom family looks unauthentic | Ship hybrid: 10 commissioned illustrations for high-frequency topics + prompt-engineered fallback for long tail; log any slide where illustration was auto-generated for QA review | 6A |
| Anthropic 3D-render / painterly-artwork pipeline unavailable at required quality | High | Phase 6B/6C fall back to user-uploaded hero images (accessible fallback) | Accept user-supplied heroes as MVP for both product-cover + nextwork-cover; iterate on AI-image-gen prompt library in parallel | 6B, 6C |
| `rembg` server-side background-removal for portrait cutouts blocks Phase 6B | Medium | pull-quote slides look worse (rectangular photos instead of silhouettes) | MVP: user-supplies pre-masked PNG; Phase 6B+1: add `rembg` in backend pipeline | 6B |
| Nextwork's 20+ bodyLayout variants tempt scope creep in Phase 6C | High | Phase 6C never ships — perfectionism trap | Ship 5 highest-value bodyLayouts first (component-deep-dive-with-console-mockup, single-hero, stat-comparison, pull-quote, prose-only), defer remaining 15 to iterative releases | 6C |
| Multilingual glyph coverage (Noto Sans + Noto Serif for CJK / Devanagari / Arabic / Cyrillic) breaks bundle size | Medium | Renderer bundle grows > 10 MB | Load Noto fonts on-demand only when a slide has `heroType: "typography-art"` or `variant: "multilingual"`; keep default bundle Latin-only | 6B |

## Rollout & Safety Rails

- **Phase 2 is 100 % additive** — adds new REGISTRY keys + tokens. Zero risk to existing runs. If Phase 2 ships alone, users can *manually* pick a compact template in the editor via the Slides panel. Pipeline still emits extended.
- **Phase 3** flips the automatic route only for FACTS/TUTORIAL/LISTICLE etc. — OPINION/EXPLAINER/TRENDING stay on extended by design.
- **The `extended` family remains the default** for OPINION/EXPLAINER/TRENDING even after all phases ship.
- **All 35+ existing runs render unchanged** via the fallback path (`inferTemplate()` legacy). No migration needed.

## Sub-Phase Plans

| Phase | Status | Plan file |
|-------|--------|-----------|
| 2 — Compact Template Family (5 core, sequential + GAN-iterate) | 🟡 IN PROGRESS — Stage D partial (3 items remain) | `Docs/phases/PHASE_2_compact_templates.md` |
| 3 — Format Plumbing (smart) | OUTLINE — Loop 1 needed before start | `Docs/phases/PHASE_3_format_plumbing.md` |
| 4 — Remaining 5 Compact Builders + Format Fill-in | OUTLINE — Loop 1 needed before start | `Docs/phases/PHASE_4_remaining_compact_formats.md` |
| 5 — UI & Analytics | OUTLINE — Loop 1 needed before start | `Docs/phases/PHASE_5_ui_and_analytics.md` |
| 6A — aurora-editorial-* family (SahilBloom style) | NOT STARTED — spec ready in template catalog | *(sub-phase plan not yet drafted)* |
| 6B — aurora-product-* family (Anthropic style) | NOT STARTED — spec ready in template catalog | *(sub-phase plan not yet drafted)* |
| 6C — aurora-nextwork-* family (dark cinematic + spotlight) | NOT STARTED — spec ready in template catalog | *(sub-phase plan not yet drafted)* |
| 6D — aurora-carousel-cover-hero + companions | 🟡 PARTIALLY BUILT — phone + images variants shipped; overlay cards restored | *(no standalone plan — tracked in PHASE_2)* |

**What to work on next (in order):**
1. **Finish Phase 2 Stage D** — add 5 Lumina wrappers + write compact-templates E2E spec + run full regression → mark Phase 2 COMPLETE
2. **Start Phase 3 Loop 1** — run architect review, write `PHASE_3_format_plumbing.md`, 2 clean passes → then implement
3. **Phase 4** follows Phase 3 automatically

**Note:** The old Phase 2 and Phase 3 plans (format-selection-first ordering) are **retired**. Phase 2 is now Compact Templates. Phase 3 is now Format Plumbing.

**Phase 6 sub-phases are not yet drafted as standalone plan files** — each will get its own `PHASE_6X_<family>.md` Loop-1 plan when it's the next thing to ship. Until then the family + component MDs under `Docs/design/templates/` are the authoritative spec for their scope.

## Loop 1 Passes Log for the Master Plan (v2)

### Pass 1 — 2026-08-23
- Read the strategy doc + user's 2 course corrections + REVIEW_PROTOCOL
- Read 13 reference images across 4 design brands → wrote `Docs/design/SLIDE_REFERENCES_ANALYSIS.md`
- Extracted 10 canonical compact templates + design tokens
- Verified 9 external claims against actual code
- **Issues found in draft:** (a) initial re-ordering left Phase 3 as "add plumbing" but format-selection LLM was going to run on manual mode too (waste); (b) Phase 5's manual-mode format chip belongs in the AngleSelector modal, not a separate stage card; (c) risk register missed "compact templates fail GAN diff" and "compact LLM stuffs bullets"; (d) design token names had inconsistent hex casing.
- **Fixes applied:** all 4 issues resolved

### Pass 2 — 2026-08-23 (mandatory cold re-read)
- Re-read the fixed master plan end-to-end, ignoring pass-1 memory
- Confirmed the phase order is now: **Templates → Plumbing → Fill-in → UI**
- Confirmed the manual-mode rule ("skip format_selection LLM if user is manually picking angle") is documented in Phase 3's row and Phase 5's row
- Confirmed each phase has (a) dependencies, (b) success criteria, (c) status
- Confirmed the design reference doc is linked and non-negotiable as source of truth
- Confirmed all 9 external claims have file:line refs or AI_CHANGELOG citations
- Confirmed the risk register has phase ownership
- **Issues found:** none
- **"Handed to unknown developer" test:** PASS — a dev can read master + Phase 2 and start building the 5 compact builders without asking a single question
- **Status:** APPROVED

### Pass 3 — 2026-08-23 (v3 revision — expanded design catalog)
- Full 85-image reference analysis was completed (`Docs/design/SLIDE_REFERENCES_FULL.md` + `..._PART2.md`) — 26 canonical template families + ~90 reusable Fabric.js components identified (up from 10 templates in the v1 sample analysis).
- Created `Docs/design/templates/` — one MD per family (`families/*.md`, 26 files) + one MD per component group (`components/*.md`, 9 files) + a catalog `README.md`.
- Each family MD lists: description, source-doc section, reference PNG absolute paths for GAN diff, existence status, composition (primitives), design tokens, fonts, copy pattern, GAN acceptance criteria, related components.
- Each component MD contains one section per primitive w/ prop signature, reference PNGs, families that use it.
- Added **Phase 6 (advanced families, 4 sub-phases)** to the phase breakdown. Phases 2–5 (compact core + plumbing + UI) are unchanged in scope; Phase 6A–D covers the SahilBloom / Anthropic / nextwork / carousel-cover-hero advanced families discovered by the full corpus analysis.
- Added deferred non-goals: Reel format (9:16 rendering), real-time image-gen for painterly artwork.
- Updated the Design Reference section to point at the new `Docs/design/templates/` catalog + list expanded takeaways from the 85-image analysis.
- **Issues found in v3 draft:** (a) initial draft merged all advanced families into one Phase 6 with no sub-structure — impossible to plan; (b) Phase 4 originally didn't list which components ship in it — now enumerated per family MD; (c) new fonts list wasn't split by phase — now separated. All 3 fixed.
- **"Handed to unknown developer" test (repeat):** PASS — a dev reading master + template catalog can pick any family MD and start building the primitive stack without needing to re-read the analysis docs.
- **Status:** APPROVED (v3)

*(Loop 1 exit condition satisfied: 3 passes, most recent clean, all external claims verified, template catalog integrated as the primary design source of truth.)*