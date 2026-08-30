# AI Development Changelog

**Purpose:** Track architectural decisions for quick context restoration in new sessions.

**Format:** Stack-based (newest first), concise summaries only.

---

## 2026-08-30 — Editor audit follow-up: 21/21 templates green

**What was fixed / built:**

- **Cover-Hero TypeScript debt (3 errors → 0):**
  - `makeMetallicGradient` call site: was passing `(canvas, {stops})`, now passes `(CANVAS_W, CANVAS_H, {stops})` matching signature
  - `OverlayCardDef` re-export removed from `shared/cover/index.ts` (type was stripped from `makeTiltedPhoneMockup` in a prior session)
  - Inline `bodyText` Textbox in `aurora_carousel_cover_hero.ts` had stale `selectable:false, evented:false` removed

- **Content objects unlocked across shared helpers:**
  - `makeBodyText.ts`, `makeDisplayHeadline.ts`, `makeItalicCtaLine.ts` — all had `selectable:false, evented:false` removed. Decorative rects (bg fills, overlay gradients, hairline rules, dots) still lock correctly.

- **`fabric.Text` objects now show Text panel:**
  - `FabricCanvas.tsx` type routing: `obj.type === "text"` now maps to `"textbox"` for panel routing (same as `fabric.Textbox`). `TextPropertyPanel` gained a "Content" textarea for editing `fabric.Text` values without double-click.

- **`canvas_template` race condition eliminated (Option A):**
  - `create_slide()` in `slide_editor_service.py` now accepts optional `canvas_template: str | None` and writes it immediately to the slide record.
  - API endpoint `content.py` passes `body.get("canvas_template")` through.
  - Frontend `api.newSlide()` in `lib/api/editor.ts` accepts optional `canvasTemplate` and sends it in the POST body.
  - `TemplatesPanel` passes `canvasTemplate` to `newSlide()` — slide is editable the moment it's created, no second-call race window.

- **Cover-Hero phone overlay cards restored:**
  - New `makeOverlayCards.ts` helper: frosted-glass dark rounded-rect cards (semi-transparent `rgba(15,12,10,0.72)` bg, bold white value, muted label, border `rgba(255,255,255,0.12)`). Each card is a selectable `fabric.Group` so users can drag and reposition.
  - Exported from `shared/cover/index.ts` as `makeOverlayCards` + `OverlayCardDef`.
  - `aurora_carousel_cover_hero.ts` renders two default cards ("22–35% / organic reach", "4.2k / new followers") over the phone, or caller-supplied `opts.mockup.overlayCards`.

- **`playwright_full_audit.cjs` hardened:**
  - `waitForTimeout(2000)` after tile click → `waitForURL(url => url.includes("slide="), {timeout:15000})` + `waitForLoadState("networkidle")`
  - `waitForTimeout(2500)` after edit-button click → `waitForLoadState("networkidle")` + 600ms settle
  - Added `page.goto("/editor")` at start of each iteration for clean Templates panel state
  - Click spots expanded from 4 → 9 (added `top-left`, `left-upper`, `right-upper`, `right-center`, `very-top-center`)

**Verification:**
- `npx tsc --noEmit` — **0 errors**
- `node playwright_full_audit.cjs` — **21/21 templates pass** (render, selectable, right panel active, zero API errors)

**Files touched (12):**
- `backend/apps/api/v1/content.py` — `canvas_template` passthrough in `new_slide` endpoint
- `backend/core/services/slide_editor_service.py` — `canvas_template` param on `create_slide()`
- `frontend/components/editor/TemplatesPanel.tsx` — pass `canvasTemplate` to `newSlide()`
- `frontend/lib/api/editor.ts` — `newSlide()` signature + body
- `frontend/utils/canvasTemplates/aurora_carousel_cover_hero.ts` — TS fixes + overlay cards wired
- `frontend/utils/canvasTemplates/shared/cover/index.ts` — overlay exports added
- `frontend/utils/canvasTemplates/shared/cover/makeBodyText.ts` — selectable unlocked
- `frontend/utils/canvasTemplates/shared/cover/makeDisplayHeadline.ts` — selectable unlocked
- `frontend/utils/canvasTemplates/shared/cover/makeItalicCtaLine.ts` — selectable unlocked
- `frontend/utils/canvasTemplates/shared/cover/makeOverlayCards.ts` — new file
- `frontend/playwright_full_audit.cjs` — timing + click spot fixes
- `frontend/playwright_targeted_audit.cjs` — new targeted audit helper

**Rollback:** all changes are additive or bug-fixes; `canvas_template` in `create_slide` is optional with `None` default — fully backward compatible.

---

---

## 2026-08-29 — Phase 2 Stage D: Compact Template Editor Visibility

**What was built / improved:**
- All 11 `aurora-compact-*` + `aurora-carousel-cover-hero-*` templates now appear in the editor Slides tab with proper labels/colours/emojis (previously grey with 🗂 fallback).
- Clicking any compact tile creates a slide **without a 422 error** — root cause was `autoMeta()` deriving `type="compact-hook"` which isn't in the `SlideType` enum. Fix: explicit `type` field in each of the 11 TEMPLATE_METADATA entries mapped to a valid enum value (`hook`, `content`, `stat`, or `quote`).
- Compact slides render the builder's DEFAULTS on creation — starter uses `compact_meta: {}` so `{ ...DEFAULTS, ...{} } = DEFAULTS`. Users see meaningful demo content immediately (VPC/Nextwork content, SahilBloom "5 Types of Wealth", etc.) and can edit from there.
- `compact_meta` propagates end-to-end: `TEMPLATE_METADATA.starter.compact_meta` → `TemplatesPanel.editSlide()` → `SlideEditRequest` → `slide_editor_service.edit_slide()` → `slide_data["compact_meta"]` → written to slides.json → read by Fabric builder.

**Architectural decisions:**
- **`compact_meta` is `Optional[dict]`, not typed** — deliberate escape hatch. Each builder has its own meta shape (headline_runs, step items, list items, etc.) and typing this at the API boundary would require 11 separate schemas. Pydantic silently accepts extra keys on the `Slide` model (no `extra='forbid'` config), and rendering uses the raw `slide_data` dict, not the typed model.
- **No SlideType enum change** — compact templates are visually distinct but still map to existing enum values (`hook`/`content`/`stat`/`quote`). Adding new enum values would require migration.
- **No compact_meta editor panel yet** — Phase 5 scope. Stage D only covers creation + initial render.
- **SLIDE_TEMPLATES quick-strip unchanged** — that's the compact 6-slot picker in `EditorLeftPanel`, kept curated. Only the `TemplatesPanel` gallery (auto-derived from REGISTRY) shows all 11.

**Files touched (5, ~20 lines):**
- `frontend/constants/slideTemplates.ts` — TemplateMeta.starter interface + 11 entries after `aurora-engage`
- `frontend/lib/api/types.ts` — `compact_meta` on `SlideData` and `SlideEditRequest`
- `backend/apps/api/v1/schemas.py` — `compact_meta: Optional[dict] = None` on `SlideEditRequest`
- `backend/core/services/slide_editor_service.py` — 2-line guard in `edit_slide()` mirroring `canvas_template`
- `frontend/components/editor/TemplatesPanel.tsx` — `compact_meta: starter.compact_meta` in `editSlide` call

**Verification:**
- Backend roundtrip: `SlideEditRequest(compact_meta={"foo": "bar"}).model_dump(exclude_none=True)` preserves `compact_meta` intact ✅
- `SlideEditRequest().compact_meta` → `None` (backward compatible) ✅
- `npx tsc --noEmit` — 0 new errors (3 pre-existing errors in `aurora_carousel_cover_hero.ts` from Phase 5 POC are unrelated and predate Stage D)

**Rollback:** clean 5-file `git revert` — no data migrations, `compact_meta` is additive optional at every layer.

**Plan doc:** `Docs/phases/PHASE_2_stage_d_editor_visibility.md` (Loop 1 approved + Loop 2 verification log inline).

---

## 2026-08-29 — aurora-compact-list-item: Notebook List Template

**What was built / improved:**
- White page background, thick black border frame (5px stroke, 8px inset)
- 4-item list, each row: outlined circle number badge (r=26) + Playfair Display body text + dashed illustration placeholder
- Pass 1 probes each item's text height (using serif font for accuracy); Pass 2 distributes rows evenly across available vertical space
- `illustrationUrl` per item: loads real image if provided, falls back to dashed-outline placeholder `rx=6` box
- Footer: `@handle` left, italic serif series title right
- Left-align chosen over justify — Fabric's `textAlign: "justify"` forces all lines including the last, causing ugly wide gaps on short lines ("Never keep score in love." → "Never  keep  score  in  love." stretched across 606px)
- Removed row separator hairlines — reference uses whitespace only between items

**GAN results:**
- cloud-roles: 14.44% YELLOW. relationship-rules: 11.48% YELLOW.
- Floor from: Instagram nav chrome + real sketch illustrations vs dashed boxes (irreducible without actual artwork). Template structure matches reference exactly.

**Lessons learned:**
- Fabric `textAlign: "justify"` has no `text-align-last: left` equivalent — every line including single-word last lines gets full-width spacing. Use left-align and accept the delta vs a justified reference.
- Height probe in Pass 1 must use the same font family as the actual render — otherwise row heights are wrong (Inter vs Playfair have different metrics at same size).

---



**What was built:**
- `aurora-compact-step_index.ts` — photo-background slide listing all 6 VPC components on a vertical pipeline. 90pt 2-line heading (Textbox, width=680), coloured step dots on pipeline line, 40pt step name + italic sub-label per row. Dark gradient overlay (0.22→0.55→0.88).
- `aurora-compact-step_detail.ts` — photo-background slide with white "Preview" card in upper half + large topic name + explanation copy in lower half. Preview card: VPC selector panel (left) with outlined input field + AZ subnet rows panel (right, 3 AZ zones each with outlined subnet entry box). Connector line at input-field height.
- Background asset: `backend/assets/images/step-bg-terrain.jpg` (green rolling hills landscape).
- Fixtures: `vpc-parts-index.json`, `vpc-subnets-detail.json`, `vpc-secgroups-detail.json`.

**GAN results:**
- Index: 26.06% FAIR. Detail: 34.93% FAIR (boundary).
- **The ~25-35% is the photo-bg floor** — fixture photo (green rolling hills) ≠ reference photo (warm amber vineyard nextwork/image copy 3.png). GAN diff is dominated by photo tone mismatch, not layout error. Card structure confirmed correct by visual inspection of composites.
- Detail GAN diff image showed card area as grey (matching) — all red was from: (1) photo tone mismatch in lower half, (2) Instagram nav chrome in reference, (3) second reference (`image copy 4.png` = Internet Gateway slide) being a completely different step.

**Design decisions:**
- Index heading changed from 64pt `Text` to 90pt `Textbox` (width=680) — wraps to 2 lines matching reference character
- Removed right-side strip rectangle (STRIP_X=830) that was in initial implementation but not in reference — pure diff noise
- LIST_TOP pushed to 278 (from 210) to accommodate larger heading
- ROW_H reduced to 118 (from 120) for tighter fit within canvas
- Detail card connector positioned at VPC input-field midY (not box midpoint) — matches reference exactly
- Detail right panel: "Subnets (3)" title + "within this VPC" subtitle + 3 AZ rows with `stepColor`-outlined subnet entry boxes — matches reference structure

**Bugs found + fixed:**
- Step fixtures had no `image_url` → fell back to solid `#2A1F14` dark rect instead of photo → added `"image_url": "/assets/images/step-bg-terrain.jpg"` to all 3 fixtures
- Static server root is `backend/` so `/assets/images/step-bg-terrain.jpg` resolves correctly via the existing `imageBaseUrl` prepend logic in the renderer
- Initial detail card was empty below the "Preview" label — added full two-panel diagram (VPC selector left, AZ subnet list right)
- Connector line was at BOX midpoint — moved to INPUT_Y+17 (input field mid) to match reference

**Lessons learned:**
- Photo-background templates have irreducible ~25-35% GAN floor when fixture photo ≠ reference photo. This is structural to photo-bg templates. Accept FAIR as the gate when card/text structure is confirmed visually.
- GAN diff images are diagnostic gold: grey = matching, red = diverging. A diff showing grey in the card region + red only in the photo region confirms the layout is correct.
- Two references assigned to the same template key means the GAN compares against both simultaneously. If one reference is a completely different variant (e.g. Internet Gateway vs Subnets), the diff will always show that content overlaid. Each fixture should ideally have exactly one matching reference.

---

## 2026-08-29 — aurora-compact-step-index: Optional right image panel

**What was added:**
- `right_image?: string` field in `CompactStepIndexMeta`
- When set: heading width narrows to 490px (from 680), a 440×960 rounded-rect (r=18) panel is clipped from the image URL and rendered on the right side with a subtle `rgba(255,255,255,0.18)` border
- When absent: zero change to existing full-width layout — fully backward-compatible
- New fixture `vpc-parts-index-with-panel.json` demonstrates the variant

**Design decisions:**
- Panel starts at x=580 leaving a natural gutter from the widest left-column text (~x=530)
- Image is cover-fit (scale to fill, centred crop) — same pattern as background photo
- Panel takes full canvas height (y=60 to y=1020) for maximum visual weight
- `clipPath` uses `absolutePositioned: true` so Fabric clips against canvas coords, not image-local coords
- GAN score for panel fixture is 37% (expected: reference has no right panel, so that area is 100% diff by definition)

---



**What was built:**
- `aurora-compact-fact.ts` — two variants behind a `variant: "compare" | "single"` toggle
- **Compare**: baseline stat 90pt muted grey (`#B8B0A5`) + featured stat 140pt coral (`#D46A5E`) on cream full-bleed. Hairline rule + bold body header + 22pt body copy + brand pill.
- **Single**: left-aligned outlined pill (category label) + 140pt coral stat + 26pt muted caption + hairline rule + 34pt bold claim + 18pt italic attribution + brand pill.
- Both use `originX: "left", originY: "top"` on all Rects (Fabric v7 requirement).
- Fixtures: `compare-protein-design.json`, `single-salary-stat.json`.

**GAN results:**
- Compare: 13.3% YELLOW. Single: 13.9% YELLOW.
- **The 13% is a floor from irreducible Instagram UI chrome** — the reference (`claude/image copy 4.png`) is a screenshot with a thick black card frame + nav dots baked in. Pixel diff is structurally unavoidable. Content-zone layout quality is confirmed by aesthetic gate, not GAN score.
- Removed wrong reference (`nextwork/image copy 10.png` — dark photo style, belongs to future `aurora-compact-stat-hero`) from `GAN_REFERENCES.json`.

**Design decisions:**
- Baseline stat intentionally smaller (90pt) and muted — communicates "control" vs featured "result"
- Featured stat larger (140pt) + coral — the instant-read focal point
- Caption color for baseline uses `STAT_MUTED` (same as stat color) — they form a visual unit; featured caption stays dark for contrast
- `make-stat-callout-card` component was NOT built — inline stat code is simpler and matched the reference exactly without an abstraction layer
- Single variant pill left-aligned (not centered) — consistent with stat/text left edge

**Bugs found + fixed:**
1. Wrong GAN reference: `nextwork/image copy 10.png` (dark forest photo) assigned to cream fact template. Removed.
2. Stat sizing identical for both stats (110pt each) — reference shows clear size hierarchy. Fixed to 90pt baseline / 140pt featured.
3. Single variant pill was centered horizontally; left-aligned to match the template's left-column layout.
4. Fixture body copy too short — updated to full reference copy ("Adaptyv Bio and Twist Bioscience...").

**What to do differently next time:**
- When the reference is an Instagram screenshot (not a raw Canva export), expect a ~5% noise floor from UI chrome. Don't chase it — run the aesthetic gate instead.
- Check the GAN reference images BEFORE building to confirm they match the intended aesthetic. The dark photo reference was registered before anyone looked at it.

---

## 2026-08-28/29 — aurora-compact-quote: B&W Portrait + Hard-Cut Edge Treatment

### Summary

Built `aurora-compact-quote` — the first Phase 2 compact template with a real Fabric.js image component. Editorial B&W portrait on the right, large Playfair Display serif quote on the left, terracotta card floated on cream canvas. Iteratively refined layout from initial placeholder to production state. Locked portrait edge treatment to "hard cut" after 3-way visual comparison.

---

### What Was Built

**Template:** `frontend/utils/canvasTemplates/aurora_compact_quote.ts`

Key layout constants:
```
CANVAS_SIZE = 1080
CARD_INSET  = 36        (cream border)
IMG_X       = 582       (portrait left edge — abs)
IMG_TOP     = 211       (portrait top — abs)
IMG_W       = 462px     (right to card edge)
IMG_H       = 833px     (bottom to card edge)
TEXT_W      = ~458px    (left column width)
QUOTE_FONT_CANDIDATES = [62, 54, 46, 40, 34]  (adaptive)
```

Features:
- B&W Grayscale filter via `fabric.filters.Grayscale()` — editorial magazine look
- Adaptive font sizing — probes largest first, steps down on overflow above SAFE_BOT
- Dynamic attribution placement — `ATTR_Y = QUOTE_Y + quoteProbeH + ATTR_GAP` (not pinned to bottom)
- `portrait_edge` field: `"fade" | "hard" | "rule"` — controls left-edge treatment
- DEFAULTS: `portrait_edge: "hard"` (locked after comparison)

**Fixtures:** `scripts/gan_fixtures/aurora-compact-quote/{community-quote,telescope-quote}.json`

**GAN scores (iter0, hard cut default):** community-quote 56%, telescope-quote 55% — YELLOW (acceptable for portrait template vs editorial reference)

---

### Bugs Found and Fixed

#### 1. Curly quotes in TypeScript interface type literals
**File:** `aurora_compact_quote.ts` line 44
**Cause:** VSCode/editor autocorrected `"fade" | "hard" | "rule"` to use Unicode U+201C/U+201D curly quotes as TYPE STRING DELIMITERS in the interface definition.
**Symptom:** `esbuild` parse error `Unexpected """` at that line.
**Fix:** Python replace — swap `\xe2\x80\x9cfade\xe2\x80\x9d` etc → ASCII `"fade"` etc.
**Rule for next time:** After writing TypeScript interfaces with string union types, always run `python3 -c "data=open(f,'rb').read(); [print(i+1,repr(l)) for i,l in enumerate(data.split(b'\\n')) if b'\\xe2\\x80\\x9c' in l or b'\\xe2\\x80\\x9d' in l]"` to verify no curly quotes snuck in.

#### 2. Curly quotes in DEFAULTS string values
**File:** `aurora_compact_quote.ts` DEFAULTS block
**Cause:** ALL string values in DEFAULTS used curly quotes as delimiters (not just content). esbuild sees `"..."` inside a `"..."` string and fails.
**Fix:** Rewrite ALL DEFAULTS values as backtick template literals.
**Rule:** In this file, DEFAULTS values MUST be backtick template literals — never double-quoted strings.

#### 3. Curly quotes in JSON fixture values via Write tool
**Cause:** Write tool normalizes U+201C/U+201D to ASCII `"` — `"It's..."` becomes `""It's..."` (broken JSON).
**Fix:** Use `“` and `”` JSON escape sequences for curly quotes in fixture files.

#### 4. Stale renderer bundle — GAN always rendered old code
**This was the most important bug of the session.**
**Root cause:** `gan_reference.js` loads a pre-built static bundle from `backend/renderer/renderer.bundle.js`. It does NOT rebuild on every run. If the template TypeScript changed after the bundle was last built, all GAN renders use stale code.
**Symptom:** All 3 comparison fixtures (fade/hard/rule) rendered identically despite different `portrait_edge` values. Took multiple debugging rounds to identify.
**Fix:** `node backend/renderer/build.mjs` before EVERY GAN run where the template changed.
**Rule for next time:** The GAN run sequence MUST be: 1) Edit template TS → 2) `node backend/renderer/build.mjs` → 3) `node scripts/gan_reference.js --template <key>`. Never skip step 2.

#### 5. Light-background portrait makes edge treatments invisible
**Cause:** `portrait-test.jpg` had a light grey studio background. After B&W filter, the left edge of the portrait zone was also light → fade vs hard vs rule all looked identical.
**Fix:** Downloaded `portrait-contrast.jpg` (pure black background) — the dark-to-orange boundary makes all 3 treatments clearly distinguishable.
**Rule:** When building edge-treatment comparison fixtures, always use a portrait with HIGH CONTRAST between background and the adjacent template color.

---

### Key Design Decisions

**Hard cut chosen over soft fade:** The black portrait background naturally creates maximum contrast against the terracotta card. The gradient fade adds complexity without adding drama. Hard cut is the most editorial, magazine-quality treatment for this color palette.

**Portrait covers most of right half of card:** `IMG_TOP = 211` (portrait starts at upper-third), bleeds to card edges on right and bottom. This matches the SahilBloom editorial reference where the portrait dominates the right column.

**Adaptive font sizing with probe loop:** Quote body text must fit within `SAFE_BOT` regardless of content length. Probe largest font first, step down until it fits. Attribution placed dynamically after quote body, never pinned to bottom.

**Two-pass layout:** Pass 1 (probe textboxes, no canvas) determines heights. Pass 2 places real objects. This avoids the classic Fabric.js issue where adding objects to canvas changes their measured height.

---

### What to Do Differently Next Time

1. **Always rebuild bundle before running GAN.** Add a comment or script alias: `alias gan-run='node backend/renderer/build.mjs && node scripts/gan_reference.js'`. The silent stale-bundle failure cost multiple debugging rounds.

2. **Scan new template files for curly quotes immediately after writing.** Before running build, run the byte-scan one-liner. This is a recurring issue with any tool that does smart-quote substitution.

3. **For portrait/image comparison testing:** choose a dark-background test image from the start. Studio grey doesn't create enough contrast to see edge treatments.

4. **The `portrait_edge` pattern is reusable.** Any future template with a configurable visual treatment should follow the same pattern: typed union field in the meta interface, DEFAULTS set to the preferred value, fixture overrides for comparison runs.

5. **Bundle staleness is not obvious from GAN output.** The pixel-diff scores look plausible even when all variants render identically (they all score around 50% vs the editorial reference). There is no error — it silently "works". The only clue is when multiple variants have suspiciously similar scores.

---

## 2026-08-13 — SSE Real-Time Pipeline Progress

### Summary

Replaced polling-based/simulated progress with push-based Server-Sent Events across both the Research and Content pipeline stages. Research shows 10–16 granular events per run. Content tracks per-slide rendering across all selected angles with monotonic global pct.

---

### What Changed

**Backend**

- `core/services/progress_store.py` — New push-based queue singleton. `update()` stores latest state and immediately delivers to all subscriber queues (zero CPU when idle). `finish()` sends `None` sentinel. `subscribe()` replays last known state on connect; if run is already complete, replays final event + sentinel so the stream closes in <1ms.
- `core/graphs/research_graph.py` — All nodes call `_emit()` with `{phase, pct, message}`. Namespaced key `research:{run_id}`.
- `apps/api/v1/research.py` — Push-based SSE endpoint `GET /research/{run_id}/events`.
- `apps/api/v1/content.py` — Push-based SSE endpoint `GET /content/{run_id}/events`.
- `core/orchestrators/content/orchestrator.py` — Emits `starting`, per-angle `generating_carousel`, and `complete` events. `complete` only fires after ALL angles and blog post generation finish.
- `core/orchestrators/content/carousel_generator.py` — Per-slide rendering events with angle-proportional global pct. For multi-angle runs, message includes `"Angle A/B — slide N of M…"` context.
- `core/schemas/workflow_state.py` — Added `angle_index`, `total_angles` to `ContentGraphState`.

**Frontend**

- `hooks/usePipelineSSE.ts` — Absolute URL (`ASSET_BASE/api/v1/...`, not relative), monotonic pct via `Math.max`, state preserved across `active` flips.
- `components/pipeline/ResearchStageCard.tsx` — SSE activity log (running) + full research summary + LLM knowledge accordion (done).
- `components/pipeline/ContentStageCard.tsx` — SSE activity log (running) + CarouselViewer + TokenChips + BlogExportBar + Editor button (done).

**Tests** — `frontend/e2e/sse-ui.spec.ts`, 9 tests, all passing.
- Group A (6 mocked, ~23s): UI state, element presence, no static tick marks, screenshots at 1440×900.
- Group B (3 real-backend, ~7–10 min): B1 — 16 live research events; B2 — late-join replay; B3 — 16 content events including per-slide rendering.

---

### Key Design Decisions

**Research pct can go backwards in raw SSE events** (refine loop resets to 55%). Frontend applies `Math.max(prev, incoming)` — bar never moves backwards. Raw events are intentionally non-monotonic to reflect actual graph state.

**`complete` is not emitted per-angle** — only once after all angles + blog post finish. Per-angle context is in the `generating_carousel` and `rendering` message text.

**Pipeline advancement is POST-driven, not SSE-driven** — a broken SSE stream can never stall the pipeline. SSE is purely cosmetic progress display.

**B1 test design** — `POST /research/run` blocks until completion so run_id is only available after the run finishes. B1 pre-generates a UUID, passes it as `run_id` in the request body (supported by `ResearchRequest.run_id: Optional[str]`), and opens SSE concurrently before POSTing.

---

## 2026-08-08 — LLM Layer: SAP AI Core + HAI Proxy, LLMFactoryAdapter, uv.lock cleanup

### Summary

Full LLM provider layer audit and expansion. Added SAP AI Core Orchestration provider, built `LLMFactoryAdapter` to unify all providers under one LangChain interface, fixed missing structured logs for HAI proxy, removed dead code, and untracked `uv.lock` from git.

---

### New: SAP AI Core Providers

Two new providers added to `infra/llm/providers/`:

**`sap_ai_core.py`** — Direct model deployment via `gen_ai_hub`. Uses `AICORE_*` env vars (read by SDK automatically). `LLM_MODEL` = deployment name in AI Launchpad.

**`sap_ai_core_orch.py`** — Orchestration Service via `gen_ai_hub`. Supports Anthropic/Claude, GPT-4o, etc. `LLM_MODEL` = model_name in orchestration config (e.g. `anthropic--claude-4.6-sonnet`).

`factory.py` updated: `_build_instance()` extracted from `get_client()` (cleaner); `hai_proxy` added as alias for `claude`; both SAP AI Core providers added. Error message updated with all valid provider names.

`main.py`: `load_dotenv()` called before all imports so `AICORE_*` environment variables are available to the gen_ai_hub SDK at startup.

---

### New: `LLMFactoryAdapter(BaseChatModel)` in `langchain_adapter.py`

**Problem:** `sap_ai_core_orch` had no native LangChain class for Claude/Anthropic models. `ChatAnthropic` (native) also bypassed `LLMFactory` entirely, producing no provider-level logs.

**Solution:** `LLMFactoryAdapter` — a thin `BaseChatModel` wrapper that:
- Converts LangChain message list → `(system_prompt, user_prompt)` text
- Calls `LLMFactory.get_client_with_retry()` (JWT retry included)
- Returns `AIMessage`

**Provider routing in `_build_client()`:**

| `LLM_PROVIDER` | `langchain_adapter` → | structured logs |
|---|---|---|
| `claude` / `hai_proxy` | `LLMFactoryAdapter` → `ClaudeLLM` | ✅ `llm_generate_start/complete` |
| `openai` | `ChatOpenAI` (native) | LangChain internal |
| `gemini` | `ChatGoogleGenerativeAI` (native) | LangChain internal |
| `sap_ai_core` | `gen_ai_hub ChatOpenAI` | SDK internal |
| `sap_ai_core_orch` | `LLMFactoryAdapter` → `SAPAICoreOrchestrationProvider` | ✅ `sap_ai_core_orch_generate_start/complete` |

---

### Bug Fix: HAI Proxy Missing Structured Logs

**Before:** `claude`/`hai_proxy` routed to `ChatAnthropic` (native LangChain). `ChatAnthropic` calls Anthropic directly — `LLMFactory` and `ClaudeLLM` never touched → no `llm_generate_start` / `llm_generate_complete` logs.

**After:** Both `claude` and `hai_proxy` now route through `LLMFactoryAdapter` → `ClaudeLLM.generate()` → structured logs always fire.

**Verified:** Chat endpoint with `LLM_PROVIDER=claude` (HAI proxy) produces:
```
2026-08-08T11:09:59Z [info] llm_generate_start  [infra.llm.providers.claude]
2026-08-08T11:10:02Z [info] llm_generate_complete [infra.llm.providers.claude] elapsed_ms=2594
```

---

### `BaseLLM` refactored (`base.py`)

`generate_structured()` moved from `ClaudeLLM` into `BaseLLM` as a concrete shared method. Providers implement only `generate()` (transport). `_strip_fences()` centralised in `base.py`. `MAX_VALIDATION_RETRIES = 3` class constant. `close()` made abstract.

`ClaudeLLM` now inherits `generate_structured()` — no duplication across providers.

---

### `jwt_handler.py` expanded

`_AUTH_ERROR_TOKENS` frozenset covers both HAI Proxy JWT and SAP XSUAA token errors: `jwt`, `expired`, `401`, `unauthorized`, `403`, `forbidden`, `invalid_token`, `token_expired`, `authentication`.

---

### Callers updated to `get_client_with_retry()`

`caption_generator.py` and `llm_drafter.py` updated from `get_client()` → `get_client_with_retry()` so auth retry is automatic. Unnecessary `_prompt`/`_run_id` variable aliases (workarounds, not needed outside loops) cleaned up.

---

### Documentation updates

- `settings.py` docstring updated with all 5 providers + model name conventions
- `.env.example` rewritten: provider options, model name per provider, explicit WARNING about `anthropic--*` being SAP AI Core–only naming convention
- `langchain_adapter.py` module docstring updated with actual provider routing table

---

### `uv.lock` untracked from git

`git rm --cached backend/uv.lock` + `backend/uv.lock` added to `.gitignore`. File stays on disk for `uv` to use. Removed from GitHub remote via commit `84d94f1`.

---

## 2026-07-04 to 2026-07-05 — Analytics, Content Strategy, LLM Mode Bug Fix

### Summary

Analytics system deep audit and 10 bug fixes (stage latency, category classification, quality gate rate, cost extrapolation). LLM-assigned categories + EmotionalHook enum shipped and backfilled across all runs. Content strategy V2 document written covering format diversity + compact template family design. LLM mode run_id mismatch bug found and fixed (tested).

---

### Analytics — 10 Bugs Fixed

**Stage latency algorithm replaced:**  
Old: `max(timestamps) - min(timestamps)` per stage per run — excluded single-call stages (research/angles always 0), conflated pipeline overhead with LLM time, produced 1181s "angles" value from a re-trigger artifact.  
New: `sum(duration_ms)` per stage per run — uses the actual per-call LLM wall time already stored in `token_usage.json`. All 4 stages now appear correctly.

**Other fixes:**
- `"ai"` keyword matched `"captain"`, `"brain"`, `"Airbender"` — fixed with `\b` word-boundary regex for 11 ambiguous keywords
- `evidence_count` fallback returned `0` for 9 older runs → fixed to `len(evidence[])` 
- Non-UUID directories (e.g. `test-run-concurrent`) polluted `total_runs` and cost averages → UUID regex guard in `summary.py`
- Older runs used `evaluation.passed` (final) as `first_pass` → now returns `None` (excluded from gate rate)
- `avg_key_points` / `avg_gaps_found` used `depth` filter (evidence_count > 0) — excluded 9 older runs → fixed to use `q_runs`
- `avg_iterations` always ~2.0, never displayed → removed from backend + frontend interface
- Cold-miss `async` summary path ran `_scan_and_compute()` twice → background refresh only on warm-cache returns
- Wrong env var `NEXT_PUBLIC_API_BASE` in analytics page → fixed to `NEXT_PUBLIC_API_BASE_URL`
- Dead fields in `ResearchQualityEntry` TS interface (`evidence`, `cost_usd`, `slides`) removed; `first_pass_runs` added
- `_VALID_CATEGORIES` / `_VALID_HOOKS` were hardcoded sets → now derived from `ContentCategory` and `EmotionalHook` enums (auto-sync)
- `per_count` dead variable in `aggregator.py` removed
- `asyncio.get_event_loop()` deprecated → replaced with `asyncio.get_running_loop()`

---

### LLM-Assigned Categories + EmotionalHook Enum

**`ContentCategory` enum** (10 values) added to `contracts.py`. `ResearchSynthesis.categories: list[ContentCategory]` field added. `research_synthesis.txt` prompt updated with rule 7 to classify 1–3 categories. LLM is now the source of truth — no more keyword heuristics.

**`EmotionalHook` enum** (8 values: Anger/Hope/Curiosity/FOMO/Surprise/Fear/Urgency/Inspiration) enforced via Pydantic on `Angle.emotional_hook` and `CarouselContent.emotional_hook`. `angle_generation.txt` prompt updated with all 8 values and guidance per hook.

**`backfill_categories.py`** — one-time script run against all 35 existing runs. Called LLM to classify `synthesis.categories` and normalised verbose hook strings (e.g. `"Anger - exposing systemic exploitation"` → `"Anger"`). 35 runs updated, 38 hooks normalised.

`run_loader.py` now reads `synthesis.categories` directly from `research_result.json`. `_classify_legacy()` and all keyword matcher code deleted. `_VALID_CATEGORIES` / `_VALID_HOOKS` derive from enums.

**Analytics impact:** `topic_distribution` and `category_confidence` fan out across all categories a run belongs to (multi-category runs counted in each applicable category).

---

### Content Strategy V2 Document

`Docs/pending-works/CONTENT_STRATEGY_V2.md` created — supersedes `MULTI_FORMAT_CONTENT_PLAN.md`.

**Two interconnected problems treated as one:**
1. We only produce one format (opinion/analysis) — no facts, tutorials, comparisons, reviews, etc.
2. Our slides are too dense — 40–70 words per content slide vs 10–20 word industry standard

**Key decisions:**
- Current templates retained as `extended` family (relabelled, not modified). New `compact` family to be built: smaller word count, bigger fonts (52–64px headline, 26–30px body), one idea per slide.
- Format selection step added to pipeline between research and angles — LLM reads synthesis and recommends format. Auto mode picks top recommendation.
- One prompt file per concern, `{format_block}` injection — no file proliferation.
- 10 formats mapped to extended/compact families. OPINION/EXPLAINER/TRENDING stay extended; FACTS/TUTORIAL/LISTICLE/REVIEW/COMPARISON/CHECKLIST use compact.
- Schema: `PostFormat` enum, `TemplateFamily` enum, `FormatSelectionOutput` model, `Angle.post_format` field.
- `aurora-extended-*` IDs registered alongside old IDs (backward compat). Old IDs still work.

**Weekly content mix recommended:** OPINION 2×, FACTS 2×, EXPLAINER 1×, TRENDING 1×, TUTORIAL 1× per week.

---

### LLM Mode Bug Fix

**Bug:** In LLM research mode, `handleRun` generated a local `pendingRunId` and dispatched it to Redux, but called `api.llmDraftResearch({ topic })` without passing the ID. The server created a different UUID. When "Generate Angles →" was clicked, `runAngleAndContent` used the server UUID correctly, but Redux and the UI tracked the local UUID — causing content to save to an unreachable directory.

**Fix:** One line in `usePipelineOrchestration.ts`:
```ts
// Before:
const res = await api.llmDraftResearch({ topic });
// After:
const res = await api.llmDraftResearch({ topic, run_id: pendingRunId });
```

**Tested:** Draft → angles flow confirmed end-to-end. Server returned matching `run_id`, `research/` and `angles/` directories both written under the same UUID. Test run cleaned up.

---

### Web Search API Endpoint Added

`backend/apps/api/v1/tools_search.py` created — exposes `POST /api/v1/tools/web-search` backed by the existing `DDGSSearch` tool. Used during this session for Instagram carousel design research.

---

### Git Author Fixed

Repo-local git config set to `LastAirbender07 / jayarajviswanathan@gmail.com`. Previous commits used SAP work account `I750332` due to global git config. Future commits in this repo will be attributed correctly.

---

### Summary

Completed the full rendering engine consolidation: all 6 slide types × 2 themes migrated to Fabric.js (Jinja2 deleted), renderer moved to `shared/`, TypeScript contract formalised, `brandName` wired end-to-end, architectural review applied across 20+ files, REGISTRY auto-wired to editor template picker, and full documentation suite written. Pipeline runs end-to-end validated with Avatar S2 test query.

---

### Phase 2 — All 6 Slide Types Migrated

**GAN validation result (iteration 26):** 86/89 slides pass. The 3 hook/lumina failures are intentional design divergence — our modern aesthetic (sharp image + glass card) preferred over the Jinja2 reference.

| Type | Aurora | Lumina |
|------|--------|--------|
| Hook | ✅ 10/10 avg 7.2% | 🎨 intentional divergence |
| Content | ✅ 10/10 avg 8.5% | ✅ 10/10 avg 7.2% |
| Stat | ✅ 10/10 avg 3.1% | ✅ 7/7 avg 4.2% |
| Engage | ✅ 10/10 avg 5.1% | ✅ 3/3 avg 6.0% |
| Quote | ✅ 10/10 avg 7.9% | ✅ 3/3 avg 7.4% |
| CTA | ✅ 10/10 avg 5.4% | ✅ 3/3 avg 6.9% |

**Key bugs fixed during Phase 2:**
- `createGlowBg`: `"transparent"` → `g.color.slice(0,7) + "00"` (invalid Fabric color)
- `hexToRgb`: added shorthand hex support
- `createGradientBg`: gradient direction was inverted (315deg vs 135deg)
- LUMINA tokens were using Aurora values — corrected to match Jinja2 CSS
- `aurora_engage.ts`: char-count height estimation → two-pass `calcTextHeight()`
- `aurora_quote.ts`: same fix, plus insight pre-pass now uses `calcTextHeight()`
- `statFontSize()`: char-width estimation → `calcTextWidth()` with probe Textbox
- All hardcoded Aurora colours in shared components → theme tokens

**CTA Aurora spotlight fix (iterated 10+ times):** Final config — two `rx=ry=900` ellipses at CSS-equivalent positions `(864,216)` and `(216,864)`, opacity 0.28 (teal) and 0.40 (purple). Centers inside canvas at low opacity = diffuse corner wash, not visible hotspot.

**Lumina content background:** `createLuminaBg()` factory added to `overlays.ts` — diagonal `#E0E7FF → #F4F7FF → #CCFBF1` gradient + corner glows at 0.22/0.26 opacity. Used by `aurora_content.ts` and `aurora_cta.ts` Lumina branches.

**Architectural improvements:**
- `buildSideBySideLayout` extracted — eliminates 50-line duplication between imgRight/imgLeft
- `measureBulletHeight` extracted to `shared/components.ts` — removes 5× inline traversal
- `FabricFill` centralised in `shared/types.ts`
- `estimatePillWidth` exported from `shared/buttons.ts`
- `setData()` used consistently everywhere (replaced direct `.data =` casts)
- `createLuminaBg()` shared factory — Lumina bg no longer duplicated across templates

---

### Phase 3 — Renderer Moved to shared/ (with Turbopack caveat)

**What was attempted:** Move `frontend/utils/canvasTemplates/` → `shared/renderer/templates/` and add tsconfig path alias `@/renderer/*` → `../shared/renderer/*`.

**What failed:** Next.js Turbopack (v16.2.6) **cannot follow tsconfig paths that point outside the project root**. This is a security restriction. Symlinks also fail. `turbopack.resolveAlias` crashed the server silently.

**Final resolution:**
- **Canonical source stays in `frontend/utils/canvasTemplates/`** — this is where Turbopack can reach it natively
- `shared/renderer/templates/` contains one `index.ts` re-exporting from `frontend/utils/canvasTemplates/`
- `backend/renderer/renderer_entry.ts` imports directly from `frontend/utils/canvasTemplates/`
- `shared/node_modules` symlink → `frontend/node_modules` (TypeScript resolution only)
- **Key lesson:** `rm -rf frontend/.next` required after any tsconfig change — stale cache causes silent Turbopack hang

---

### Phase 4 — Renderer API Formalised

- `backend/renderer/renderer_contract.ts` — `RendererAPI`, `RenderOptions`, `SlideInput` interfaces
- `loadFonts(baseUrl)` exposed as explicit public method on `window.Renderer`
- `renderer_entry.ts` imports types from contract; `asSlide()` boundary cast closes `SlideInput`/`SlideData` type gap

---

### Architectural Review Fixes (20 files)

**Critical:**
- `createGlowBg`: `"transparent"` → zero-alpha hex (Fabric rejects CSS `transparent`)
- `hexToRgb`: shorthand hex support

**High:**
- `TemplateBuilder` type: `ReturnType<typeof getTokens>` → `CanvasTokens` (exported)
- `SlideInput` vs `SlideData` gap: `asSlide()` cast at renderer entry boundary
- `inferTemplate()` aligned to Python's `_canvas_template_id` logic (removed diverging density-based branching)
- `brandName` wired end-to-end: `settings.brand_name` → `SlideRenderTask.brand_name` → Playwright options → `meta.brandName` in builder
- `createLuminaBg()` shared factory: Lumina background no longer duplicated across 3 templates

**Medium:**
- `aurora_cta.ts`: dead `createAccentLine` import removed
- `aurora_stat.ts`: `barH = rawH` dead alias removed
- `aurora_hook.ts`: swipe-hint pill now theme-aware (dark/light colours)
- `aurora_content.ts`: stale `export { loadPanelImage }` removed; switch dispatch replaces if/else chain
- `carousel_generator.py`: `landscape_counter = [0]` → `_Counter` class; `slide_type` enum coercion via `.split(".")[-1]`
- `sideBySide.ts`: `imageUrl: string | null` → `imageUrl: string` (caller guarantees); unnecessary type cast removed
- `build.mjs`: dead `NEXT_PUBLIC_API_BASE_URL` define removed; `minify` driven by `NODE_ENV`
- `brand.ts`: `t.text === "#FAFAFA"` magic-string check → `isDarkTheme(t)`
- `aurora_quote.ts`: insight pre-pass uses `calcTextHeight()` (was char-width estimate)

---

### Pipeline Bug: canvas_template + _theme Not Persisted

**Bug:** `slides.json` had `canvas_template: null` and `_theme` missing for all slides. Templates were computed at render time but never written back.

**Root cause:** `screenshot_slides_fabric_node` injected `_theme` and computed `canvas_template` on the fly but returned them only to Playwright, not back to LangGraph state for `finalize_content_node` to persist.

**Fix:** Build `enriched_slides` list with both fields set, return as `{"slides": enriched_slides}` in node return dict. `finalize_content_node` picks it up and writes `slides.json`.

**Also fixed:** `slide_type = slide_dict.get("type")` was returning `SlideType.stat` enum object, not `"stat"` string → `.split(".")[-1]` coercion added.

---

### Editor Template Picker Auto-Wired to REGISTRY

**Before:** `SLIDE_TYPES` in `frontend/constants/slideTemplates.ts` was a hardcoded list of 10 entries. Adding a new template required manually adding a tile entry.

**After:** `SLIDE_TYPES` derives from `Object.keys(REGISTRY).filter(k => k.startsWith("aurora-"))`. Any new `aurora-*` REGISTRY entry appears in the editor's "Slides" tab automatically.

**`TEMPLATE_METADATA` map** provides label/emoji/colour per template. New types without a metadata entry get neutral defaults but still appear. `STARTER_CONTENT` also derived from the same map.

**`TemplatesPanel.tsx`** updated: starter content lookup prefers template-specific key (`"aurora-stat"`) over generic type key (`"stat"`).

---

### Jinja2 Deleted

- Deleted: `backend/core/templates/carousel/aurora/` and `lumina/` (16 `.html.j2` files + CSS)
- Deleted from `carousel_generator.py`: `render_slides_node`, `render_and_screenshot_single_slide`, `screenshot_slides_node`, `jinja2` import, `_TEMPLATES_ROOT`
- `slide_editor_service.py`: Jinja2 preview replaced with `_fabric_preview_html()` — renders slide via `window.Renderer` in an iframe

---

### Documentation

- `Docs/renderer/RENDERING_ENGINE_ADR.md` — updated: Phases 1–4 complete, results tables, bugs fixed
- `Docs/renderer/RENDERING_ENGINE_OVERVIEW.md` — complete rewrite: problem, decision, architecture in plain language, interview Q&A, codebase map, developer setup, Turbopack caveat, known limitations
- `Docs/renderer/RENDERER_CODEBASE_GUIDE.md` — NEW: folder map, shared component library, theme token system, data flow diagram, two-pass layout pattern, debugging patterns
- `Docs/renderer/ADDING_A_SLIDE_TYPE.md` — NEW: end-to-end worked example (checklist type), 6 touch points, summary table, pointer to Template Studio plan
- `Docs/pending-works/TEMPLATE_STUDIO_PLAN.md` — NEW: no-code template creation vision (design → LLM evaluate → register → validate), technical prerequisites

---

### Summary

Two major architectural decisions documented this session: (1) a formal ADR for consolidating from two rendering engines (Jinja2 + Fabric.js) into one (Fabric.js only), and (2) a multi-format content strategy plan expanding beyond the current opinion-only carousel format. Also: minor fixes — `frontend/lib/api` unblocked from git (root `.gitignore` was matching it via bare `lib/` pattern), LLM knowledge UI updated to show all 12 structured claims instead of only the first one.

---

### Rendering Engine ADR (Architecture Decision Record)

**Document:** `Docs/content-strategy/RENDERING_ENGINE_ADR.md`

**The problem:** Every slide type requires two independent implementations that must produce identical output — `backend/core/templates/carousel/aurora/*.html.j2` (Jinja2 + CSS + Playwright) and `frontend/utils/canvasTemplates/aurora_*.ts` (Fabric.js). Any visual change or new slide type must be written twice. The GAN validation system exists specifically to manage the drift between them. Multi-format expansion (10 new slide types) would require 20 implementations.

**The decision (Option D+):** One rendering engine. Fabric.js template builders (`canvasTemplates/`) are the single canonical visual implementation. Playwright stops being a layout engine and becomes a deterministic browser runtime that executes the renderer and captures a screenshot. Jinja2 templates are deleted. The `canvas_template` field (already in every `slides.json`) + the REGISTRY (already in `canvasTemplates/index.ts`) form the existing routing contract — no new protocol needed.

**Key architectural insight:** Identified by Claude during codebase audit — `canvas_template: "aurora-content-2"` already exists in every slide. The REGISTRY already maps these IDs to builder functions. The proof-of-concept is: bundle the REGISTRY + builders, load them in a static HTML shell, inject slide JSON, call `window.Renderer.render(slideJson)`, Playwright screenshots the canvas. The routing mechanism already exists.

**The `window.Renderer` contract (permanent API boundary):**
```typescript
interface SlideRenderer {
  render(slideJson: SlideData, options: RenderOptions): Promise<void>;
}
// Playwright never knows about Fabric, fonts, or images — renderer internals
```

**What was deferred:**
- Scene Graph abstraction (`Slide JSON → Scene → Fabric Runtime`) — Fabric Objects are already a scene graph; defer until a second runtime (SVG/PDF) actually exists
- `shared/` directory at repo root — mechanical refactor, do after migration is proven
- Additional export targets (LinkedIn, PDF) — future design problems

**The canonical boundary rule (goes in README):**
> There must exist exactly one implementation of every visual layout in the repository. If visual layout logic exists outside the renderer, that is a bug in the architecture.

**Migration phases:**
1. POC — prove with `aurora-hook` (3 days). Success = visual pixel tolerance < 2% vs current Jinja2 PNG
2. Migrate remaining 5 aurora + 6 lumina types. Delete Jinja2. (3–5 days)
3. Move to `shared/renderer/`. Update import paths. (2 days)
4. Formalise `window.Renderer` API. Stop. Ship.
5. Scene abstraction only when a second runtime exists.

**Discussion context:** This ADR emerged from a three-way architecture discussion between Claude, ChatGPT, and the project owner. Claude contributed the `canvas_template` insight and grounded bundling cost estimates. ChatGPT contributed the "rendering platform" mental model and Scene Graph long-term vision. The Scene Graph was deferred by agreement — Fabric Objects are already a scene graph, no second runtime justifies the abstraction yet.

---

### Multi-Format Content Strategy

**Document:** `Docs/content-strategy/MULTI_FORMAT_CONTENT_PLAN.md`

**The problem:** Every carousel produced is opinion/analysis format with 4 emotional hooks (Anger/Hope/Curiosity/FOMO) and a "what would Naval say?" reference frame. This is one format masquerading as a content strategy.

**10 carousel formats identified:** Opinion (current), Facts/Did-You-Know, Tutorial/Step-by-Step, Review/Rating, Comparison/X-vs-Y, Listicle/Countdown, Explainer/Concept-Breakdown, Trending/News, Story/Narrative, Checklist/Resource.

**Key finding:** The research pipeline (tools, synthesis, evaluation) works for all formats — zero changes needed. The bottleneck is entirely the content layer: angle prompts, slide structure rules, caption hooks.

**Lowest-hanging fruit (Phase A, ~4 hours, prompt changes only):**
1. Expand emotional hooks — add Surprise, Empowerment, Nostalgia, Trust, Urgency, Pride, Relatability
2. Add `post_format` field to angle generation — LLM selects the best format per angle
3. Inject format-specific slide rules into slide generation (FACTS, TUTORIAL, TRENDING use existing slide types with different structure)
4. Adapt caption hook per format

This expands from 1 format to 5 formats with no infrastructure work.

**Recommended weekly content mix:** Opinion 2×, Facts 2×, Explainer 1×, Trending 1×, Tutorial 1×, Review 1/2×, Story 1/2×.

---

### Frontend: Structured LLM Knowledge View

**File:** `frontend/components/pipeline/ResearchStageCard.tsx`

**Bug fixed:** `evidence.find()` was grabbing only the first LLM knowledge item. With 12 structured claims now generated (after the classification fix), 11 were silently invisible in the UI.

**Fix:** `evidence.filter()` collects all LLM knowledge items. Claims rendered grouped by type (Historical Fact → Published Work → Direct Quote → Recent Statistic → Causal Inference) with colour-coded badges. Each claim shows text + time period from `source_name` encoding. Header shows total claim count ("12 claims").

---

### Git: `frontend/lib/api` untracked — fixed

**Root cause:** The root `.gitignore` contained `lib/` (a Python packaging convention). Since it had no path prefix, git treated it as a global pattern matching `frontend/lib/` too. All 11 modular API files in `frontend/lib/api/` were invisible to git; only the old monolith `frontend/lib/api.ts` escaped because it was committed before the rule.

**Fix:** Changed `lib/` → `backend/lib/` in `.gitignore`. Ran `git rm -r --cached frontend/lib/` + `git add frontend/lib/api/` to stage all 11 files. `frontend/lib/api.ts` (old monolith) correctly removed and replaced by the directory.

---



### Summary

Root cause analysis of a broken carousel where slides discussed the research pipeline's internal gaps instead of presenting facts, and historically accurate LLM knowledge (Tilak, Savarkar, etc.) was discarded because the evaluator couldn't distinguish it from uncorroborated speculation. Eight fixes shipped across 9 files with 44 unit tests all passing. Frontend updated to show structured LLM knowledge view.

---

### The Core Problem (corrected understanding)

The original characterisation of LLM knowledge as "unverified hallucination" was wrong. Claude is trained on verified historical documents — "Tilak opposed the Age of Consent Bill (1891)" is a documented fact, not a hallucination. The real failure was a **classification and routing failure**:

1. `llm_knowledge_node` assigned every claim a flat `credibility_score=0.5` — historical facts and causal inferences received the same score
2. The synthesiser treated "no web URL found" = "unverified" even for pre-1900 historical events
3. This caused the synthesiser to flag valid historical knowledge as "gaps"
4. The slide generator received those gaps in its input and wrote Slide 9 explaining what the research pipeline couldn't find
5. The evaluator's source_score was inflated to 1.0 by 21 low-quality snippets, letting the run pass despite synthesis confidence of 0.35

---

### Fix 1 — Claim classification in `llm_knowledge_node` (P1)

**Files:** `core/orchestration/contracts.py`, `core/orchestrators/research/llm_knowledge.py`, `core/prompts/templates/llm_knowledge.txt`

`LLMKnowledgeClaim` and `LLMKnowledgeOutput` Pydantic schemas added to `contracts.py`. The node now uses `generate_structured(output_schema=LLMKnowledgeOutput)` — same pattern as all other pipeline nodes. Invalid claim types are rejected by Pydantic and retried automatically (max 3 attempts).

Each claim is classified as `HISTORICAL_FACT | PUBLISHED_WORK | DIRECT_QUOTE | RECENT_STATISTIC | CAUSAL_INFERENCE` with type-based credibility:

| Type | Score | Meaning |
|---|---|---|
| HISTORICAL_FACT | 0.85 | Documented event from training corpus |
| PUBLISHED_WORK | 0.80 | Specific book/document content |
| DIRECT_QUOTE | 0.60 | Verbatim — quote text should be confirmed |
| RECENT_STATISTIC | 0.30 | May be stale since training cutoff |
| CAUSAL_INFERENCE | 0.25 | Always needs independent verification |

Claim type encoded in `source_name`: `"llm:HISTORICAL_FACT:1891"` — downstream reads it with `_extract_claim_type_from_source_name()`.

Result: single Evidence blob → 12 typed Evidence items per run.

---

### Fix 2 — Synthesiser gap logic (P1)

**File:** `core/prompts/templates/research_synthesis.txt`

Prompt updated to distinguish claim types: `llm:HISTORICAL_FACT` items are high-confidence training knowledge — the synthesiser must NOT flag them as gaps just because no web URL was returned. Only `llm:RECENT_STATISTIC` and `llm:CAUSAL_INFERENCE` require web corroboration.

---

### Fix 3 — `ContentEvidenceBundle` — meta-commentary firewall (P0)

**File:** `core/orchestrators/content/content_evidence_bundle.py` (new)

Centralised filter module. `filtered_research_summary()` strips 17 phrase-level regex patterns from research text before it reaches the slide/caption generators. Patterns are **phrase-level** not word-level — "generation gap", "India lacks infrastructure", "groundbreaking research" all pass; "the research reveals a critical gap" and "claims remain unverified" are stripped.

`_extract_claim_type_from_source_name()` extracts claim type from the `source_name` encoding.

`build_content_evidence_bundle()` classifies evidence by type: HISTORICAL_FACT/PUBLISHED_WORK → `llm_historical_facts`, CAUSAL_INFERENCE/RECENT_STATISTIC → excluded, web evidence → `verified_claims`.

---

### Fix 4 — Slide generator receives filtered input (P0)

**File:** `core/orchestrators/content/slide_generator.py`

Calls `filtered_research_summary()` before building the prompt. The slide LLM never sees gaps, contradictions, or meta-commentary. Also wired into `caption_generator.py` for the angle statement.

---

### Fix 5 — Slide generation prompt anti-patterns (P0)

**File:** `core/prompts/templates/slide_generation.txt`

`ABSOLUTE PROHIBITIONS` block replaced word-bans with curated forbidden phrases: "research shows", "evidence suggests", "the original angle", "claims are unverified", etc. Explicit note: the word "research" is allowed in historical content ("research by Ramanujan in 1913") — only pipeline-process phrases are banned.

---

### Fix 6 — Weighted source score in evaluator (P2)

**File:** `core/orchestrators/research/evaluator.py`

`_compute_source_score()` now uses `avg_credibility × log_volume_factor` instead of `sum / saturation`:
```
coverage = avg_credibility × min(1.0, log(n+1) / log(9))
```
Result: 21 items × credibility 0.4 = **0.70** (not 1.0). 8 items × credibility 0.9 = **0.95**. High-quality sources beat low-quality volume. LLM items excluded from web coverage; modest bonus (+0.015 per high-confidence item, max +0.12).

---

### Fix 7 — Synthesis confidence floor (P2)

If `synthesis.confidence_score < 0.50`, force another refinement loop regardless of `combined_confidence`. A synthesiser that self-reports low confidence should never auto-pass.

---

### Fix 8 — Critical gap gate (P2)

If `synthesis.gaps[]` contains "COMPLETE ABSENCE", "central to the topic", "core claim", etc., evaluation fails and triggers refinement regardless of numeric score.

---

### Test coverage

44 unit tests added covering all 8 fixes. Key scenarios:
- Pydantic schema rejects invalid claim types and empty claim lists
- `_extract_claim_type_from_source_name` round-trip: encode → decode
- 7 false-positive cases confirmed NOT stripped by regex
- 8 meta-commentary cases confirmed stripped
- Evaluator score: 21×0.4 items score 0.70 (not 1.0); 8×0.9 items score 0.95
- Critical gap detection correct for 3 gap severity levels

---

### Frontend — Structured LLM Knowledge View

**File:** `frontend/components/pipeline/ResearchStageCard.tsx`

`evidence.find()` → `evidence.filter()`. Now collects all LLM knowledge items (was silently showing only the first of 12). Claims rendered grouped by type in display order: Historical Fact → Published Work → Direct Quote → Recent Statistic → Causal Inference. Each group shows a colour-coded badge + claim count. Each item shows the claim text and time period (from `source_name` encoding). Header shows total claim count ("12 claims").

---

### Documentation

- `Docs/rca/RCA_RESEARCH_CONTENT_INTEGRITY.md` — deleted (findings incorporated into this changelog entry)
- `Docs/rca/` folder retained for future RCAs

---



### Summary

Shipped end-to-end Google Blogger publishing: backend OAuth service, bulk publish script for all 19 existing posts, frontend "Publish to Blogger" button with full error handling, hashtag-as-labels, and cross-platform links (Instagram + Medium + Blogger) injected into every caption and blog post. Analytics data bugs fixed. Roadmap updated to reflect everything complete.

---

### Blogger Auto-Publishing — Full Stack

**Backend service (`core/services/blogger_service.py`):**

- OAuth 2.0 Desktop app flow via `google-auth-oauthlib` + `google-api-python-client`
- `_get_credentials()` — loads `credentials.json`, auto-refreshes expired tokens, runs browser consent on first call only
- `publish_post(title, html_content, labels, is_draft, blog_id)` — `POST /blogger/v3/blogs/{blogId}/posts`
- `get_blog_info()` — used for the health-check status endpoint
- Token saved to `blogger_token.json` at backend root (gitignored)

**API router (`apps/api/v1/publishing.py`):**

- `GET /api/v1/publishing/blogger/status` — confirms credentials work, returns blog name/URL/post count
- `POST /api/v1/publishing/blogger` — publishes HTML post; `is_draft: false` for immediate publish

**`re_auth.py`** — one-liner token refresh script for the 7-day Testing mode expiry.

**Frontend (`BlogExportBar.tsx`):**

- "Publish to Blogger" amber button alongside existing Edit/Markdown/HTML buttons
- Fetches `blog_post.html` and `caption` (for hashtags) in parallel before posting
- 4 clear states: idle → publishing (spinner) → success (green "Published! View post ↗" link) → error (red banner)
- `friendlyError()` maps raw HTTP/exception messages to plain English:
  - 429 → token expiry instruction
  - 403 → Test User setup instruction
  - 401 → backend restart instruction
  - missing credentials.json → file path instruction
  - network error → backend offline instruction
- Retry button on error, dismiss ×, no page reload needed

---

### Cross-Platform Links in Every Piece of Content

**Caption footer (new format):**

```
Read the full story 👉 {medium_url}
📖 Also on Blogger: {blogger_url}

Follow us on Instagram: {instagram_url}
```

**Blog post CTA block:** Instagram + "Read more on Blogger" + "Long reads on Medium" links side by side.

**Blog post footer attribution:** `Originally produced by [@Handle](ig) · [Blogger](blogger) · [Medium](medium)`

All three links come from settings — configurable in `/settings` page and stored in `settings_overrides.json`.

---

### Settings — Blogger URL Added

- `configs/settings.py` — `blogger_url: str = "https://theopinionboard07.blogspot.com/"` added to Brand section
- `settings_service.py` — `blogger_url` added to `_EDITABLE_FIELDS` and brand return dict
- `frontend/app/settings/page.tsx` — Blogger URL field added to Brand Identity card
- `frontend/lib/api/settings.ts` — `SettingsBrand` interface gains `blogger_url?: string`

---

### Analytics Bug Fixes

**Blog count wrong (showing 3 instead of 20):** Was computed from `run_readiness[-10:]` (last 10 runs only). Fixed: `blog_count` now scanned across ALL runs in `aggregator.py`, exposed as a dedicated field separate from the readiness table.

**Quality gate 100% instead of ~92%:** Was checking `evaluation.passed` (final result, which always passes). Fixed: now reads `iterations[0].evaluation.passed` — the first real evaluation before the forced second loop. Correct value: 92%.

**Emotional hooks showing 40+ verbose strings:** LLM returns `"Anger - exposing systemic exploitation"` instead of `"Anger"`. Fixed: `_normalise_hook()` in `run_loader.py` regex-matches canonical prefix, collapses to `{Anger, Hope, Curiosity, FOMO, Other}`. `_sort(hooks, cap=5)` caps display at top-5 with tie-breaking.

**Blog path wrong:** Was checking `content/blog_post.md` — actual path is `{run_dir}/blog_post.md`. Fixed in `run_loader.py`.

**`image_assets.json` parse bug:** File is stored as `{"image_assets": [...]}` dict wrapper, not flat list. Old code iterated over dict keys, counting nothing. Fixed: handle both `raw if isinstance(raw, list) else raw.get("image_assets", [])`.

---

### Documentation

- `Docs/publishing/BLOGGER_COMPLETE_RECORD.md` — living doc: auth flow, token expiry caveat, error messages table, all files involved, API endpoints, limitations
- `Docs/pending-works/IMPROVEMENT_ROADMAP.md` — fully updated: all 13 items marked ✅, Blogger publishing added as #13 ✅, auth removed as "not needed", Instagram API publishing correctly deferred with pointer to its own doc
- Old `Docs/pending-works/BLOGGER_AUTOMATION.md` deleted (replaced by BLOGGER_COMPLETE_RECORD.md)

---

### Summary

Full sprint covering: editor bug fixes (8 issues), analytics complete rebuild with caching, Phase 3 roadmap items (slide reorder drag UI, run search+tagging, settings page, batch style editing), Google Blogger automation docs, and a DPR-related chart rendering bug that only manifested on real browsers (not Playwright headless).

---

### Editor Bug Fixes (8 issues from EDITOR_ISSUES.md)

**Critical — `canvas.toJSON()` missing `["data"]` parameter:**
All 5 call sites (`useCanvasHistory.ts` ×3, `FabricCanvas.tsx` `getCanvasJson`, `useCanvasCheckpoint.ts`) were serializing without custom properties. In Fabric v7, custom properties (`data.role`, `chartType`, `chartData`) must be registered via `FabricObject.customProperties.push("data")` at init — done once in `FabricCanvas`. This fixed undo/redo losing role annotations, save/load losing chart identity, and checkpoint losing all semantic metadata.

**Legacy view-only banner:** Slides without `canvas_template` field (generated before the canvas editor existed) are now blocked from edit mode in `SlidePngPreview.tsx` with amber badge: "This slide format is not supported for editing — regenerate to enable editing." Previously they silently opened a broken canvas.

**Lumina theme pollution:** Two hardcoded `"aurora"` strings fixed:

- `aurora_stat.ts` line 166 — chart theme now derived from `t.bg === LUMINA.bg` check
- `canvasDropHandlers.ts` — `addComponentToCanvas()` now accepts `theme` param, tracked via `slideThemeRef` in `FabricCanvas`

**Ungroup coordinate bug:** `handleUngroup` was using `fabric.util.transformPoint(child.left, groupMatrix)` — wrong in Fabric v7 where group-local coords use center origin. Replaced with `child.getXY()` (reads absolute canvas position before removal) + `child.setXY(pos, originX, originY)` after removal. This is Fabric v7's correct API (`toActiveSelection()` doesn't exist in v7).

**Bullet editing via RightPanel:** `createBulletItem` creates Groups `[circle, num, label]` — `label` at index 2 is a Textbox but groups don't forward text editing. New `BulletsPropertyPanel.tsx` scans all canvas objects for `data.role === "bullet_item"`, reads `getObjects()[2]` (the label Textbox), renders editable textareas, writes back via `label.set("text", value)`.

**Chart resize re-render:** `object:modified` hook detects `data.role === "chart"` + scale change → re-renders Chart.js at new `getBoundingRect()` dimensions → swaps old image object.

**Image panel additions:** `ImagePropertyPanel` now includes rotation slider (−180°→180°), corner radius slider (reads/writes `obj.clipPath.rx`), and "Bring Forward" button.

**Decorative elements (P3):** `glow-blob` and `deco-ring` added to component dropper registry + `COMPONENTS` constant. All template decorative elements now have `data.role` set.

---

### Chart DPR Bug Fix (the real responsiveness issue)

**Root cause confirmed via Playwright DPR=2 testing:** `Chart.js` reads `window.devicePixelRatio` and calls `ctx.setTransform(DPR, 0, 0, DPR, 0, 0)` internally. On a DPR=2 display, Chart.js rendered all bars at 2× width, so only the left half of the chart fit in the canvas — only the first bar was visible, second bar was off-screen to the right.

**Fix:** Single line in `chartImageRenderer.ts`:

```typescript
(config as any).options = { ...(config as any).options, devicePixelRatio: 1 };
```

Also added `enableRetinaScaling: false` to the Fabric canvas constructor — prevents Fabric from creating a 2160×2160 backing store on DPR=2 displays which caused the canvas coordinate system to mismatch CSS dimensions.

**Validation:** Playwright tested at DPR=1.0, 1.25, 1.5, and 2.0 — all show both bars correctly. The earlier aurora_stat body text heuristic was also replaced with `calcTextHeight()` + `chartH = clamp(availH, 220, 520)`.

---

### Analytics — Complete Rebuild

**Modularised into `core/services/analytics/` package:**

| File                     | Responsibility                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `cache.py`             | Thread-safe TTL cache (`_AnalyticsCache`, 5-min TTL, explicit invalidation)                           |
| `run_loader.py`        | All I/O for one run: research quality, hooks, slide types, image sources, blog check, publish readiness |
| `aggregator.py`        | Pure computation — no I/O, all new aggregations                                                        |
| `summary.py`           | Cache-aware public entry points                                                                         |
| `analytics_service.py` | 10-line shim (re-exports from package)                                                                  |

**New data extracted from existing files (no new storage):**

- `research_result.json` → `combined_confidence`, `passed` (iteration 1 via `iterations[0].evaluation`), `key_points_count`, `gaps_count`, `evidence_count`, `total_iterations`
- `angles/selection.json` → `emotional_hook` (normalised via `_normalise_hook()` — collapses verbose LLM strings like `"Anger - exposing..."` to canonical 4 values)
- `content/angle_*/slides.json` → slide type distribution
- `content/angle_*/image_assets.json` → image source breakdown (fixed dict/list wrapper bug)
- `blog_post.md` → existence check (fixed path — was `content/blog_post.md`, correct is `{run_dir}/blog_post.md`)

**Bug fixes during analytics rebuild:**

- Blog count was pulled from `run_readiness[-10:]` (last 10 runs only) → now scanned across ALL runs, exposed as `blog_count` field
- Quality gate was 100% because it checked `evaluation.passed` (final result always passes). Now checks `iterations[0].evaluation.passed` — the first real evaluation before the forced second loop. Result: 92% (correct)
- Hook deduplication: `_sort(hooks, "hook", cap=5)` keeps top-5 and excludes tail; `_normalise_hook()` maps verbose strings to `{Anger, Hope, Curiosity, FOMO, Other}`
- `image_assets.json` parse bug: file is `{"image_assets": [...]}` dict wrapper, not flat list — loader now handles both

**Cache layer:**

- `_AnalyticsCache` is thread-safe with `threading.Lock`, 5-min TTL
- `analytics_cache.invalidate()` called from `save_research_output()` and `finalize_content_node()` — fresh data on next load after any pipeline run
- `POST /api/v1/analytics/invalidate-cache` endpoint for the UI Refresh button
- `Cache-Control: public, max-age=60, stale-while-revalidate=300` on the GET endpoint
- `get_analytics_summary_async()` ready for 200+ run scale (background executor)

**Frontend analytics page modularised:**

| Component                      | Purpose                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `Card.tsx`                   | `Card`, `CardHeader`, `DistributionRow` primitives |
| `ResearchQualitySection.tsx` | Confidence bar list + depth stats                        |
| `StageSections.tsx`          | Cost by Stage + Stage Performance latency table          |
| `TopicSections.tsx`          | Topics by Category + Quality by Topic heatmap            |
| `ContentStrategySection.tsx` | Hooks + Slide Types + Image Sources (3-col grid)         |
| `PublishReadinessTable.tsx`  | Last 10 runs ✓/✗ grid                                  |

**New KPI layout:** 2 rows of 4 cards. Row 1: Cost & Volume. Row 2: Quality & Content (Research Efficiency, Avg Confidence, Blog Posts Written, Pexels Image Rate). Refresh button in header calls `POST /invalidate-cache` + re-fetches. `computed_at` timestamp shows data freshness.

---

### Phase 3 Roadmap — All 4 Items Shipped

**#4 — Slide Reorder Drag UI (RunRow.tsx)**

- New `DraggableSlideList` component inside RunRow using native HTML5 drag (no DnD library)
- `GripVertical` handle (hover-reveal), violet drop indicator line, `Trash2` delete button
- Delete: inline confirm chip `[Delete / ×]` → `api.deleteSlide()` → local state renumbers
- Reorder: `onDrop` computes new order array → `api.reorderSlides()` → `toggleAngle()` re-fetches manifest
- `busy` flag dims list during API call

**#6 — Run Search + Tagging**

- Backend: `list_runs(search, starred)` — topic substring filter + starred flag from `run_metadata.json`. New `update_run_metadata()`. `GET /content/runs?search=&starred=`, `PATCH /content/{run_id}/metadata`
- Frontend: `RunSummary` gains `starred?` + `tags?`. `getRunsList(opts)` + `updateRunMetadata()` in API client. FileBrowser gets search input (300ms debounce) + ⭐ filter toggle. RunRow gets hover-reveal star button.

**#8 — /settings Page**

- Backend: `settings_service.py` — `get_user_settings()` / `update_user_settings()` read/write `settings_overrides.json`. API keys always masked in GET (`sk-••••last4`). `GET/PUT /api/v1/settings/`
- Frontend: `lib/api/settings.ts`, `app/settings/page.tsx` — 3 sections: Brand Identity, Content Defaults (chip selectors), API Keys (masked with Replace/Add buttons + show/hide toggle). Settings added to Sidebar nav.

**#5 — Batch Style Editing**

- Backend: `bulk_style_slides()` in `slide_editor_service.py` — reads slides.json once, merges overrides into N slides, writes once, re-renders PNGs sequentially. `POST /content/{run_id}/slides/{angle}/bulk-style`
- Frontend: `BulkStyleModal.tsx` — checkbox grid (current slide excluded as source reference), "Select All / None", style preview, spinner. `CanvasToolbar` gains amber "Style →" button when slide has `slide_overrides`. Editor page loads slide overrides on slide change.

---

### Google Blogger Automation Documentation

`Docs/publishing/BLOGGER_AUTOMATION.md` — Complete guide covering:

- Why service accounts don't work for personal Blogger (OAuth 2.0 required)
- Google Cloud project setup + OAuth consent screen + Desktop app credentials
- Token lifecycle: first-run browser login → `token.json` → automatic refresh
- Blog ID discovery methods
- Full API reference (insert post endpoint, request/response schema)
- Python implementation skeleton (`blogger_service.py` + `publishing.py` FastAPI router)
- The "Testing mode" 7-day refresh token expiry gotcha + `re_auth.py` workaround
- Frontend integration plan for "Publish to Blogger" button

---

### Documentation Updates

- `Docs/ANALYTICS_DEEP_DIVE.md` — Full inventory of all data collected vs displayed
- `Docs/ANALYTICS_IMPLEMENTATION_PLAN.md` — Phase A-E implementation guide with exact code snippets
- `Docs/EDITOR_ISSUES.md` — 8 editor issues with root causes and fixes
- `Docs/analytics/ANALYTICS_COMPLETE_RECORD.md` — Living doc (mirrors editor doc style)
- `Docs/frontend/FRONTEND.md` — Fully updated to reflect current state (moved from wrong location in orchestrators/content/)
- `Docs/orchestrators/` — research, content, angle subdirs (reorganised from flat structure)

---

### Summary

Phase 2 of the Improvement Roadmap: built the analytics page, caption editor, real-time generation progress bar, slide reorder/delete backend, and completed multiple Playwright visual audit cycles.

---

### #11 — Analytics Page (`/analytics`)

**Backend:** `analytics_service.py` scans all run dirs, reads `token_usage.json`, classifies topics via 13-category keyword rules, returns KPIs + per-stage costs + token series + activity map + model breakdown. `GET /api/v1/analytics/summary` registered in `main.py`. Bugs fixed: unused `import re`, dead `run_ts` variable, `import time as _time` inside function body.

**Frontend:** `app/analytics/page.tsx` (245 lines) + extracted components:

- `components/analytics/KpiCard.tsx` (29 lines) — pure display
- `components/analytics/ContributionCalendar.tsx` (230 lines) — SVG grid + tooltip
- `lib/api/analytics.ts` — `getSummary()` + full TypeScript types
- Analytics added to sidebar nav

**Activity calendar — 3 redesign iterations to reach final SVG version:**

| Version                | Problem                                                                                        | Fix     |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------- |
| CSS flex grid          | Month labels misaligned; tooltip clipped at top; grid only 70% wide                            | —      |
| 12 per-month cards     | Too bulky; doesn't feel like GitHub                                                            | —      |
| SVG-based 53-week grid | ✅ Final: pixel-exact`<text x={DOW_LABEL_W + col*STEP}>`, fixed-position tooltip, full-width | Shipped |

**Tooltip jitter root cause and fix:** `onMouseMove` + `setState` was re-rendering 371 SVG `<rect>` elements on every pixel of cursor movement, causing visible page vibration. Fixed by:

1. Removing `onMouseMove` (only `onMouseEnter`/`onMouseLeave` needed)
2. Replacing `useState<TooltipState>` with `useRef<HTMLDivElement>` — tooltip always mounted at `opacity:0`, position + text set via direct DOM mutation (`tipRef.current.style.left/top/opacity`). React render cycle never triggered on hover.

**Token chart empty state:** Filtered to `runsWithTokens.filter(r => r.total_tokens > 0)` — was showing 19 zero-bar rows before one real bar.

---

### #2 — Progress Feedback During Carousel Generation

- `backend/core/orchestrators/content/_progress_store.py` — module-level dict matching research progress store pattern
- Wired into `screenshot_slides_node` — emits `update(run_id, current, total)` before each screenshot
- `GET /api/v1/content/{run_id}/render-status`
- `hooks/useContentProgress.ts` — 1.5s polling while content stage running
- `ContentStageCard` — animated progress bar + "Rendering slide N of M…" label replaces plain spinner

---

### #3 — Caption + Hashtag Editor

- `backend/core/services/caption_service.py` — `get_caption()` / `update_caption()` read/write `carousel.json`
- `GET/PUT /api/v1/content/{run_id}/caption/{angle_index}`
- `components/pipeline/CaptionEditor.tsx` — char counter bar (green→amber at 1800→red at 2200), hook preview (first 125 chars), hashtag chips with × remove, copy buttons, `loadError`/`saveError` states surface failures instead of silent fail
- `CarouselViewer` — "Caption" button alongside each Download button

---

### #4 — Slide Reorder + Delete (backend + API)

- `backend/core/services/slide_reorder_service.py` — `reorder_slides()` permutes `slides.json` + renames PNGs via tmp-prefix buffer (prevents rename collisions on overlap); `delete_slide()` removes PNG and renumbers
- `PUT /api/v1/content/{run_id}/slides/{angle}/reorder` + `DELETE /{angle}/{slide_number}`
- `api.reorderSlides()` + `api.deleteSlide()` added to `lib/api/editor.ts`

---

### UI Audit Fixes (Playwright)

| Issue                                      | Fix                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Analytics crashes on`activity.map`       | Destructure all array fields with`= []` defaults                                     |
| Token chart 19 empty bars                  | Filter to runs with actual token data                                                  |
| Caption editor blank on backend offline    | `loadError` state shows message                                                      |
| Research page native`<select>` dropdowns | Segmented chip controls with icons                                                     |
| Research idle state sparse                 | 3-card explainer + tip banner                                                          |
| Compare button disrupting slider           | Moved to action row below carousel                                                     |
| `claude.py` fence strip bug              | `str.strip("```json")` strips chars not substring — fixed with `startswith/split` |

---

## 2026-06-25 — Sessions 52+: Pipeline Modularisation, Recovery System, Improvement Roadmap Phase 1

### Summary

Full feature sprint: recovery for interrupted pipeline runs, complete pipeline frontend modularisation, 6 Improvement Roadmap items shipped, full Playwright visual audit with UI fixes.

---

### Pipeline Run Recovery System

**Problem:** Runs interrupted after research (or mid-pipeline) were invisible in Recent Runs — `addRun` only fires when content stage completes. Users lost access to completed research and generated carousels on disk.

**`PipelineRecentRuns` cross-references backend:**

- Fetches `api.getRunsList()` on mount; diffs against Redux `state.history.runs`
- Runs on disk but not in Redux → shown as amber orphaned cards with "Recover →" button
- `useRecoverRun` hook: fetches `research_result.json`, `angles/generated.json`, `angles/selection.json`, and `content/angle_N/carousel.json` from backend static files; reconstructs full `AngleResponse` + `ContentResponse`; dispatches both `loadRun` (active pipeline) and `addRun` (history, moves run out of orphan list permanently)

**"Continue → Generate Angles" button:**
When research is recovered but angles are idle, Stage 2 shows a violet "Continue → Generate Angles & Carousel" button calling `handleGenerateAngles()` from `usePipelineOrchestration`.

---

### Pipeline Frontend Modularisation (page.tsx 390 → 145 lines)

**New hooks:**

- `hooks/useAngleRegeneration.ts` — `regenerating` state + `handleRegenerateAngles`
- `hooks/useTopicRefinement.ts` — `topicLoading`, `refineHint`, `applyArticleAsTopic` (renamed from `useArticleAsTopic` — violated React hook naming convention)
- `hooks/useResearchProgress.ts` — 2s polling interval for research progress
- `hooks/useRecoverRun.ts` — full run recovery from disk

**New stage card components (each reads Redux directly):**

- `components/pipeline/ResearchStageCard.tsx` — owns `showLlmKnowledge`, progress bar, TokenChip
- `components/pipeline/AngleStageCard.tsx` — recover button, angle section, regenerate
- `components/pipeline/ContentStageCard.tsx` — carousel viewer, blog export, editor button, TokenChips

**`PipelineRecentRuns.tsx` modularised:**

- `components/pipeline/OrphanedRunCard.tsx` — amber card UI
- `PipelineRecentRuns.tsx` → 60 lines, pure orchestration

---

### Improvement Roadmap Phase 1 — 6 Items Shipped

**#7 — Flexible Slide Count:**

- Default 12 → 10 (Instagram single-post limit)
- Chip toolbar: `5 · 7 · 10 · 12` quick-select inline; green dot marks 10 as recommended
- AdvancedSettings: chip presets replacing dual steppers

**#1 — Carousel ZIP Download:**

- `backend/core/services/carousel_export_service.py` — builds ZIP: slide PNGs + `caption.txt` + `hashtags.txt` + `README.txt`; private helpers `_read_carousel_meta()` + `_build_readme()`
- `GET /api/v1/content/{run_id}/carousel-download?angle=0`
- `CarouselViewer` — "Download Angle N" buttons, spinner, browser download

**#9 — Caption Validation Backend:**

- `backend/core/services/caption_validator.py` — checks `IG_CAPTION_MAX=2200`, `IG_HASHTAG_MAX=30`, `IG_HOOK_CHARS=125`; `enforce_caption_limits()` silently trims
- Wired into `caption_generator.py`

**#12 — A/B Carousel Comparison (full redesign):**

- `CarouselCompare.tsx` — full-viewport overlay, violet/cyan color identity per side
- **Synced mode** — shared `←→` nav moves both; dots show unequal lengths honestly
- **Independent mode** — each column has own dots nav + arrows
- **Mismatch handling** — amber badge + strip when one angle has more slides than the other; nothing hidden or truncated
- Compare button moved from nav bar to action row (keeps slider aesthetic clean)

**#10 — Token Tracking:**

- `backend/core/services/token_tracker.py` — writes `token_usage.json` per run; per-run `threading.Lock` prevents race conditions; `_aggregate_records()` eliminates duplication
- **Live pricing:** `_LiveCache` fetches exchange rate (`exchangerate-api.com`) + LLM pricing (LiteLLM's community JSON, 2785 models), both cached 6h. At build time INR=94.65 (was hardcoded 84.0 — 12.5% off)
- `_token_meta=(run_id, stage)` opt-in kwarg in `ClaudeLLM.generate()` — zero regression; wired in caption, slide, angle generators
- `GET /api/v1/content/{run_id}/token-usage`
- `TokenChip.tsx` — 🪙 badge ₹/$ cost per stage; appears at bottom of each completed stage card

---

### Critical Bug Fixes

| Bug                                            | Root cause                                                                                                                       | Fix                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `claude.py` JSON stripping                   | `str.strip("```json")` strips individual chars (j,s,o,n,backtick), not substring — corrupts valid JSON like `{"json":true}` | Explicit`startswith`/`split`/`rsplit` with comment        |
| Token tracker`total_runs_with_data=0`        | Tried reading`run_id` field that doesn't exist in `TokenRecord`                                                              | Count run directories containing`token_usage.json` instead    |
| Carousel export crash on corrupt JSON          | `json.loads()` propagated `JSONDecodeError` to user                                                                          | `_read_carousel_meta()` with try/except + safe defaults       |
| Caption validator`IndexError`                | `caption[124]` on strings shorter than 125 chars                                                                               | Guard: only check if`len(caption) >= IG_HOOK_CHARS`           |
| Token tracker race condition                   | Read-modify-write without lock — concurrent LLM calls lose records                                                              | Per-run`threading.Lock` via `_get_lock(run_id)`             |
| Hydration mismatch pipeline page               | `useState(() => typeof window !== 'undefined')` runs on server (always `false`), client renders `true`                     | `useState(false)` + `useEffect(() => setMounted(true), [])` |
| `handleGenerateAngles is not defined`        | `usePipelineOrchestration()` placed after `useEffect` hooks — JSX referenced it before declaration in render                | Moved to line 40 with other hook calls                          |
| `PipelineRecentRuns` duplicate body          | Edit tool matched substring, appended instead of replacing — two function bodies                                                | Full`Write` rewrite                                           |
| `catch (e: any)` in `useAngleRegeneration` | Untyped catch                                                                                                                    | `catch (e: unknown)` with `instanceof Error` guard          |
| Silent`.catch(() => {})`                     | Errors silently swallowed                                                                                                        | `console.warn("Could not fetch server runs:", err)`           |

---

### UI Audit via Playwright — Changes Made

Playwright screenshot audit across all pages. Visual scores and fixes:

**Research page `ResearchConfigPanel.tsx` (5/10 → 9/10):**

- Native `<select>` dropdowns → custom segmented chip controls with icons per option
- Claim verification → toggle row with mini pill switch
- Idle right panel → 3-card explainer (Web Search / Deep Read / Synthesis) + amber depth tip banner

**`CarouselCompare.tsx` — complete redesign (see #12 above)**

**Final scores:** Pipeline idle 8/10 · Pipeline loaded 7/10 · Advanced Settings 7/10 · Research 9/10 · A/B Compare 9/10 · Editor 8/10

---

## 2026-06-25 — Sessions 51+: Code Splitting Round 4 + Canvas Component System

### What Changed

Continued systematic code splitting using a two-pass exhaustive audit. 13 splitting opportunities identified; all implemented and tested.

---

### Canvas Component System Expansion

**Content layout-3 (Image Left / Text Right)** added — `aurora-content-3` registered in REGISTRY and in backend `_layout_variant_for_image()` (cycles 1→2→3 for landscape images).

**Button component library** — all 6 styles now exposed in the editor TemplatesPanel Components tab:

- `btn-gradient` — filled aurora gradient
- `btn-ghost` — transparent + white border (used on Engage slide)
- `btn-frosted-glow` — glassmorphism + glow shadow
- `btn-solid-white` — white pill + gradient text
- `btn-dark-pill` — dark cutout + white border
- `btn-dark-gradient` — dark fill + gradient text

**Component drop system refactored** — `canvasDropHandlers.ts` is now a 91-line router; each component has its own file in `componentDroppers/`:

```
canvasDropHandlers.ts     (91 lines)  — router + image drop
componentDroppers/
  brandBar.ts, glassCard.ts, statBlock.ts, quoteBlock.ts
  bulletList.ts, accentLine.ts, eyebrowPill.ts, buttons.ts
```

**Bugs fixed in drop handler:**

- `dark-card` and `brand-bar` were not moveable/deleteable — objects had `selectable: false`. Fixed by re-enabling before grouping with `fabric.Group`.
- 4 missing component IDs (`dark-card`, `quote-block`, `eyebrow-pill`, `cta-button`) caused `Unknown component` warnings — all now handled.

---

### Chart Rendering Fully Decoupled

`chartRenderer.ts` went from **369 → 54 lines**. Three levels of splitting:

```
chartRenderer.ts            (54)   — defaultSize + createChartObject dispatcher
chartConfigs/
  barConfig.ts              (44)   — bar + column
  lineConfig.ts             (29)   — line + area
  donutConfig.ts            (15)   — donut
  radarConfig.ts            (20)   — radar
  stackedConfig.ts          (46)   — stacked-bar + stacked-column + comparison
  scatterConfig.ts          (22)   — scatter + bubble
chartGroupBuilders/
  helpers.ts                (24)   — makeGroup + makeFabricImage (shared)
  funnelGroup.ts            (56)   — horizontal bar funnel (pure Fabric, no Chart.js)
  progressGroup.ts          (51)   — track progress bars (pure Fabric, no Chart.js)
  bigNumberGroup.ts         (44)   — stat value display (pure Fabric, no Chart.js)
  chartImageRenderer.ts     (94)   — Chart.js → PNG → FabricImage
```

**Key architecture decision:** `chartGroupBuilders/` (funnel, progress, bigNumber) has zero Chart.js dependency — they're pure Fabric objects. Only `chartImageRenderer.ts` touches Chart.js and the DOM.

---

### Pill Button Styles Decoupled

`shared/buttons.ts` went from **223 → 86 lines**:

```
shared/buttons.ts                          (86)  — createPillButton dispatcher + createEyebrowPill
shared/pillButtons/styleBuilders.ts       (107)  — 6 style builder functions + FabricFill type + createShimmer
```

Each button style (`buildGradientStyle`, `buildGhostStyle`, etc.) is independently testable.

---

### ChartTypePicker SVG Icons

`ChartTypePicker.tsx` 179 → **85 lines**. 13 chart-type preview SVGs moved to `chartTypeIcons.tsx` (117 lines). These are NOT generic icons — they're miniature data-structure previews showing what each chart type looks like. No icon library ships these.

---

### Code Splitting Round 4 — Full Audit (13 Opportunities)

Two-pass exhaustive audit found 13 splitting opportunities. All implemented:

**Phase 1 — Data extractions:**

- `ASSET_BASE` centralised in `lib/api/client.ts` — 7 components were each defining their own `process.env... ?? "http://localhost:8000"`. Now all import from one source.
- `constants/slideTemplates.ts` — `SLIDE_TYPES`, `STARTER_CONTENT`, `COMPONENTS` deduplicated across `TemplatesPanel.tsx` and `EditorLeftPanel.tsx`
- `constants/chartDefaults.ts` — `MULTI_SERIES_TYPES`, `NO_PREVIEW_TYPES`, `DEFAULT_DATA` out of `ChartEditorPanel.tsx`
- `utils/chartValidation.ts` — `getChartWarnings()` function extracted, independently testable

**Phase 2 — Logic separation:**

- `utils/canvasTextHelpers.ts` — `trunc`, `estimateLines`, `autoSize`, `tb` helpers extracted from `slideToCanvas.ts`. The duplicate `estimateLines` in `aurora_content.ts` also eliminated.
- `utils/canvasTemplates/contentLayouts/` — `aurora_content.ts` 294 → **54 lines**. Five layout builders each in own file: `textOnly.ts`, `imgRight.ts`, `textTop.ts`, `imgTop.ts`, `imgLeft.ts`
- `store/slices/pipelineReducers/` — `pipelineSlice.ts` 241 → **141 lines**. 30+ reducers grouped into 6 domain files: `configReducers`, `budgetReducers`, `discoveryReducers`, `evidenceReducers`, `stageReducers`, `resultReducers`. Zero breaking changes — action creators still exported from `pipelineSlice.ts`.

**Phase 3 — Large component splits:**

- `ImagesPanel.tsx` 380 → **331 lines**. Three new hooks: `useImageLibrary`, `useImageUpload`, `useImageContextMenu`
- `SlideEditor.tsx` 455 → **291 lines**. Extracted: `types/slideEditor.ts`, `hooks/useSlideAI.ts`, `panels/ContentTab.tsx`, `panels/StyleTab.tsx`, `panels/ChartTab.tsx`, `panels/ImageTab.tsx`

**Total new files created across all splitting rounds:** 50+ files

---

### Test Results

E2E suite `e2e/full-validation.spec.ts` — **47/47 tests pass** after every change.
TypeScript: **0 errors** after every phase.

---

### Architectural Pattern Established

All code splitting follows the same pattern from `componentDroppers/`:

1. One thin **router/dispatcher** file — reads like a table of contents
2. Each independent branch/concern in its **own focused file**
3. Shared helpers in a **helpers.ts** within the same folder
4. **Barrel re-exports** where needed (zero call-site breakage)

To add a new chart type, button style, or content layout: create one file, import in the dispatcher, add one `case` line.

---

## 2026-06-24 — Sessions 41–50: Major Frontend Refactor (Rounds 1–3) + E2E Validation

### What Changed

Three consecutive refactor rounds restructured the entire frontend codebase. Focus shifted from feature delivery to code maintenance, testability, and correctness.

---

### Round 1 — File Splitting (lib/api + shared.ts + RightPanel)

**Problem:** `lib/api.ts` (499 lines, 23 endpoints, 52 types in one flat namespace), `shared.ts` (673 lines, 12 component factories), `RightPanel.tsx` (271 lines, filter helpers duplicated).

**Decision:** Split by semantic domain, not file size. Re-export from `index.ts` so zero call-sites change.

```
lib/api.ts → lib/api/ (client, research, angles, content, editor, assets, tools, types)
shared.ts  → shared/  (buttons, brand, backgrounds, overlays, components, text, types)
RightPanel → panels/  (TextPropertyPanel, ImagePropertyPanel, CanvasPropertyPanel, Row)
utils/fabricFilters.ts — extracted from RightPanel, shared with ContextToolbar
```

**Why barrel re-exports:** 42 files import `@/lib/api`. Splitting without re-exports would break all 42. With `lib/api/index.ts` re-exporting everything, zero callers change.

---

### Round 2 — Component Extractions + Inline Simplifications

**Files extracted:** `RunRow.tsx` (140 lines from FileBrowser), `ImageThumb.tsx`, `SectionHeader.tsx`, `AiPanel.tsx`, `PipelineRecentRuns.tsx`

**Hooks created:** `useExpandedSet<T>` (replaces identical Set toggle pattern in both FileBrowser and pipeline page), `useToolbarPosition`, `timeUtils.ts`

**Inline fixes:**

- `pipeline/page.tsx` — 3× duplicate `useEffect` for stage auto-expand → 1 effect with `STAGE_KEYS.forEach`
- `editor/page.tsx` — `editMode: Record<string, boolean>` (accumulating per-slide history) → `useState(false)` that resets on slide change
- `research/page.tsx` — `useState(6)` × 3 for budget constants that never update → plain `const`
- `pipeline/page.tsx` — raw `fetch()` with hardcoded URL → `api.getResearchStatus()` via api module

---

### Round 3 — Logic Decoupling + Correctness Bugs

**Context:** Previous rounds fixed file size. Round 3 found bugs and wrong coupling regardless of size.

**4 correctness bugs fixed in FabricCanvas.tsx:**

| Bug                                                | Line     | Fix                                                                                                |
| -------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| View-only race condition                           | 241–265 | `c.selection = false` set immediately when `viewOnly` determined, before loadInitial async gap |
| Commit before async mutation (drop handler)        | 370      | `commit()` moved to AFTER `FabricImage.fromURL()` succeeds                                     |
| Commit before async mutation (applyImage)          | 478      | Same fix — was missing from original plan                                                         |
| `handleRestoreYes` missing `onCanvasChanged()` | 337      | Added — RightPanel wasn't re-rendering after checkpoint restore                                   |

**FabricCanvas.tsx decoupled: 575 → 371 lines**

Key insight: previous reviews said "don't extract hooks — canvasRef has 13 couplings." This was wrong. `React.MutableRefObject<T>` is stable across renders by design. Passing refs to hooks is standard React. `useCanvasHistory(canvasRef, onUndoRedoStateChange)` unlocked all other extractions.

```
FabricCanvas.tsx (371 lines) — orchestration only
useCanvasHistory.ts  (49 lines) — undo/redo state machine
useCanvasCheckpoint.ts (19 lines) — 30s localStorage auto-save
canvasDropHandlers.ts (78 lines) — pure addImageToCanvas, addComponentToCanvas
canvasSlideLoader.ts (139 lines) — loadSlide + loadInitial via SlideLoaderContext
```

**Other logic decoupling:**

- `useDiscoverDrawer` extracted from PipelineConfig (4 useState + 3 async functions → 1 hook call)
- `buildSeededEvidence()` extracted from `usePipelineOrchestration` as pure function
- `useBlankRunCreation` hook replaces `api.createBlankRun` duplicated in 3 places
- `onUndoRedoStateChange` stabilised in `editor/page.tsx` with empty deps `useCallback`
- `pipelineSlice.loadRun` now restores `config` (mode/freshness/angleMode); `PipelineRun` type gains `config?` field
- `resetPipeline` reducer documented: preserves config, clears run results

**3 proposals rejected after architect review:**

- useMemo on FabricCanvas API ref — `useMemo` not imported; real fix is stable parent props
- REGISTRY generation (`Object.fromEntries`) — loses TypeScript key verification at compile time
- `loadSlide`/`loadInitial` extraction via hooks — fixed instead via `SlideLoaderContext` interface

---

### GAN Multi-Run Validation System

**Built:** `scripts/gan_multi.js` — catalog-driven, tests up to 10 samples per template type across all 13 Aurora template variants.

**GAN Catalog:** `scripts/GAN_CATALOG.json` — 106 entries, aurora-* and lumina-* keys. 3 Lumina runs (16d6ff62, 9d73b8f6, f3c6d794) correctly reclassified after being misidentified as Aurora.

**Scoring:** Content-zone diff (bottom 55% of canvas) + full diff. Bands: <5% EXCELLENT, <15% GREAT, <25% GOOD, <35% FAIR, >35% BROKEN.

**Final Aurora scores (content-zone):**

- stat::line 1.6%, stat::column 1.9%, stat 2.8%, stat::bar 4.3% — EXCELLENT
- engage 4.7%, cta 4.8%, stat::donut 5.3%, stat::funnel 5.8% — EXCELLENT/GREAT
- content-text 6.4%, content-0 7.3%, quote 6.1% — GREAT
- hook 22% — image blur engine noise only (HTML CSS blur ≠ Canvas 2D blur, layout correct)

---

### Canvas Template Additions

**Content layout-3 added:** Image LEFT / Text RIGHT — mirror of layout-0. Registered in REGISTRY. Backend `_layout_variant_for_image()` updated to cycle 1→2→3 for landscape images.

**Button component library expanded:** 6 named styles in `createPillButton()`:

- `gradient` — filled aurora gradient (CTA)
- `ghost` — transparent + white border + white text (Engage bottom)
- `frosted-glow` — translucent white + bright border + glow shadow (Engage top pill)
- `solid-white` — white pill + gradient text
- `dark-pill` — dark cutout + white border (on gradient bg)
- `dark-gradient` — dark fill + lighter gradient text (on gradient bg)

**Eyebrow pill redesigned:** B3 frosted-glow style — white fill + shimmer + white glow border.

**Engage slide:** Top pill = `createEyebrowPill` (frosted-glow). Bottom button = `createPillButton(ghost)`.

---

### Known Issues Documented

`Docs/editor/CANVAS_ISSUES.md` — 5 issues tracked:

- A: Layout-3 never assigned by backend pipeline (1-line fix applied)
- B+E: Legacy runs (`canvas_template: null`) → view-only mode implemented
- C: Groups not individually editable → Ungroup button added to ContextToolbar
- D: Chart `onApply` not wired → `commit` exposed in `FabricCanvasAPI`, `handleChartApply` fixed
- E: Legacy null canvas_template count — addressed by view-only guard

---

### Backend Fixes (Sessions 41–50)

- `research.py` — orchestrator calls wrapped in try/except with proper HTTP 500
- `content.py` — `GET /{run_id}/slides/{angle_index}` returns 404 if angle doesn't exist
- `chat.py` — error response now sets `reply=f"Sorry..."` instead of empty string
- `pipeline.py` — `mode`/`freshness`/`angle_mode` use `Literal` types (was plain `str`)
- `schemas.py` — `when` param uses `Literal["1d","3d","7d","1w","1m"]`, `slide_overrides: Dict[str, str]`
- `pipeline/page.tsx` — research status polling uses `api.getResearchStatus()` (was raw fetch)
- `lib/api.ts` — all `fetch()` calls use 30s `AbortController` timeout via `fetchWithTimeout`

---

### E2E Test Suite Created

**File:** `e2e/full-validation.spec.ts` — 47 tests, 12 sections, 3.7 minutes runtime.

**Coverage:**

- All 6 routes load correctly (pipeline, research, images, news, chat, editor)
- Dark theme verified (`rgb(0,0,0)` background, not white)
- No `NaN`, `undefined`, raw HTML visible to users
- Canvas renders real slide (930KB PNG confirmed)
- View-only banner confirmed on legacy run `b9ad0ca9`
- FabricCanvas decoupling confirmed (useCanvasHistory, canvasSlideLoader working)
- RightPanel dispatch verified (CanvasPropertyPanel shows correctly)
- Templates panel shows all 9 slide types
- No horizontal scroll on any page
- 20 screenshots captured in `test-results/screenshots/`

**Result: 47/47 passed.**

---

## 2026-06-19 — Session 40: GAN-Style Template Validation + Visual Fixes

**Decision:** Introduced adversarial iteration methodology (GAN-style) to validate Fabric.js canvas templates against Jinja2/Playwright reference PNGs, then fixed all identified bugs over 7 iterations.

---

**Method: GAN-Style Adversarial Testing**

Standard software testing checks "does it run." This method checks "does it look right" — the hardest thing to test in a visual editor.

```
Loop:
  Generator  → Playwright renders all 12 slides via browser editor
  Discriminator → pixelmatch computes per-pixel diff vs reference PNGs
  Signal     → diff % per slide + composite images (ref | generated | diff)
  Fix        → worst-scoring templates patched
  Repeat     → until 0 POOR slides
```

Tooling: `scripts/gan_iterate.js` — renders, compares, saves `report.json` + composite images per iteration.

**Why this works:** The "discriminator" (pixel comparison) is objective and fast. Each iteration takes ~3 minutes for all 12 slides. The composite images let you visually inspect exactly which pixels differ, making root cause identification instant.

---

**7 Iterations — 52.6% Improvement**

| Iter        | Avg Diff        | POOR        | Key Fix                                                                            |
| ----------- | --------------- | ----------- | ---------------------------------------------------------------------------------- |
| 1           | 22.1%           | 3           | Baseline                                                                           |
| 2           | 20.6%           | 3           | Image panel sizing rewrite                                                         |
| 3           | 17.1%           | 3           | `absolutePositioned:true` on Fabric clipPath                                     |
| 4           | 13.7%           | 2           | Correct layout variants (content-1, content-2) from HTML flex-direction check      |
| 5           | 12.7%           | 1           | CSS 135deg gradient direction (top-right→bottom-left, not top-left→bottom-right) |
| 6           | 11.3%           | 1           | Visual polish pass                                                                 |
| **7** | **10.5%** | **0** | Stat label dynamic width, layout-2 top-align                                       |

**Final: 10/12 GOOD, 2/12 FAIR, 0/12 POOR.** The two FAIR slides are image crop mismatches — same photo, same layout, but CSS `object-fit:cover` and Fabric's clipPath crop to different pixel boundaries.

---

**Root Causes Found**

| Bug                        | Discovery     | Fix                                                                                                                                      |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Image panel tiny thumbnail | Iter 1 visual | `loadPanelImage()` with cover-scale. Old code set `width/height` on `FabricImage` which resizes bounding box but not visual output |
| Image not clipped to panel | Iter 2        | `absolutePositioned:true` on clipPath rect — Fabric v7 interprets clipPath in canvas space not local space                            |
| Wrong layout variants      | Iter 3        | Checked rendered HTML`flex-direction` values to identify which variant each slide used; patched `canvas_template` into slides.json   |
| Engage gradient flipped    | Iter 4        | CSS`linear-gradient(135deg)` = top-right→bottom-left. Fabric gradient used `cos(135°)*h` which computed the wrong vector           |
| Stat label overlaps number | Iter 6        | Dynamic stat_value width:`min(660, charCount * 67px)` instead of fixed 520px                                                           |
| Layout-2 missing bullets   | Iter 6        | Accidentally omitted bullet loop in layout-2 block (content with top-image)                                                              |
| Line chart no area fill    | Iter 6        | `fill:true` + `backgroundColor: primary+'44'` in Chart.js config to match reference                                                  |

---

**Visual Improvements Applied**

All from user visual review of iteration 5 generated slides:

- **Hook**: Swipe hint → subtle frosted-glass pill (`rgba(255,255,255,0.07)` rect + border)
- **Stat**: Removed wrongly-placed top accent line; accent divider only AFTER stat block
- **Quote**: Attribution set to `INNER_W=936px` to prevent single-word line wrapping
- **CTA**: Radial glows enlarged (rx:520/480 vs 270/215) to cover ~40% of slide for modern drama
- **CTA/Engage**: Modern gradient pill buttons with `BTN_H/2` border-radius
- **Engage**: Larger rings (720/480/240px) positioned at corners for dramatic depth
- **Line chart**: Purple area fill under curve
- **All**: Accent lines: height 5px (was 4px), 3-stop gradient with fade, rounder (rx:3)
- **Layout-2**: Top-align image crop (people photos show faces, not torsos)
- **Content**: Tighter line-height (1.45-1.5 vs 1.6-1.65)

---

**Documentation consolidated**

Three editor docs (`EDITOR_REQUIREMENTS.md`, `EDITOR_MASTER_PLAN.md`, `EDITOR_FIXES_IMPLEMENTATION.md`) merged into one: **`Docs/editor/EDITOR_COMPLETE_RECORD.md`** — includes full requirements history, architecture decisions, implementation plan, bug fix sprints, and GAN testing methodology.

**Tests: 61/61 E2E passing.**

---

**Decision:** Introduced adversarial iteration methodology (GAN-style) to validate Fabric.js canvas templates against Jinja2/Playwright reference PNGs, then fixed all identified bugs over 7 iterations.

---

**Method: GAN-Style Adversarial Testing**

Standard software testing checks "does it run." This method checks "does it look right" — the hardest thing to test in a visual editor.

```
Loop:
  Generator  → Playwright renders all 12 slides via browser editor
  Discriminator → pixelmatch computes per-pixel diff vs reference PNGs
  Signal     → diff % per slide + composite images (ref | generated | diff)
  Fix        → worst-scoring templates patched
  Repeat     → until 0 POOR slides
```

Tooling: `scripts/gan_iterate.js` — renders, compares, saves `report.json` + composite images per iteration.

**Why this works:** The "discriminator" (pixel comparison) is objective and fast. Each iteration takes ~3 minutes for all 12 slides. The composite images let you visually inspect exactly which pixels differ, making root cause identification instant.

---

**7 Iterations — 52.6% Improvement**

| Iter        | Avg Diff        | POOR        | Key Fix                                                                            |
| ----------- | --------------- | ----------- | ---------------------------------------------------------------------------------- |
| 1           | 22.1%           | 3           | Baseline                                                                           |
| 2           | 20.6%           | 3           | Image panel sizing rewrite                                                         |
| 3           | 17.1%           | 3           | `absolutePositioned:true` on Fabric clipPath                                     |
| 4           | 13.7%           | 2           | Correct layout variants (content-1, content-2) from HTML flex-direction check      |
| 5           | 12.7%           | 1           | CSS 135deg gradient direction (top-right→bottom-left, not top-left→bottom-right) |
| 6           | 11.3%           | 1           | Visual polish pass                                                                 |
| **7** | **10.5%** | **0** | Stat label dynamic width, layout-2 top-align                                       |

**Final: 10/12 GOOD, 2/12 FAIR, 0/12 POOR.** The two FAIR slides are image crop mismatches — same photo, same layout, but CSS `object-fit:cover` and Fabric's clipPath crop to different pixel boundaries.

---

**Root Causes Found**

| Bug                        | Discovery     | Fix                                                                                                                                      |
| -------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Image panel tiny thumbnail | Iter 1 visual | `loadPanelImage()` with cover-scale. Old code set `width/height` on `FabricImage` which resizes bounding box but not visual output |
| Image not clipped to panel | Iter 2        | `absolutePositioned:true` on clipPath rect — Fabric v7 interprets clipPath in canvas space not local space                            |
| Wrong layout variants      | Iter 3        | Checked rendered HTML`flex-direction` values to identify which variant each slide used; patched `canvas_template` into slides.json   |
| Engage gradient flipped    | Iter 4        | CSS`linear-gradient(135deg)` = top-right→bottom-left. Fabric gradient used `cos(135°)*h` which computed the wrong vector           |
| Stat label overlaps number | Iter 6        | Dynamic stat_value width:`min(660, charCount * 67px)` instead of fixed 520px                                                           |
| Layout-2 missing bullets   | Iter 6        | Accidentally omitted bullet loop in layout-2 block (content with top-image)                                                              |
| Line chart no area fill    | Iter 6        | `fill:true` + `backgroundColor: primary+'44'` in Chart.js config to match reference                                                  |

---

**Visual Improvements Applied**

All from user visual review of iteration 5 generated slides:

- **Hook**: Swipe hint → subtle frosted-glass pill (`rgba(255,255,255,0.07)` rect + border)
- **Stat**: Removed wrongly-placed top accent line; accent divider only AFTER stat block
- **Quote**: Attribution set to `INNER_W=936px` to prevent single-word line wrapping
- **CTA**: Radial glows enlarged (rx:520/480 vs 270/215) to cover ~40% of slide for modern drama
- **CTA/Engage**: Modern gradient pill buttons with `BTN_H/2` border-radius
- **Engage**: Larger rings (720/480/240px) positioned at corners for dramatic depth
- **Line chart**: Purple area fill under curve
- **All**: Accent lines: height 5px (was 4px), 3-stop gradient with fade, rounder (rx:3)
- **Layout-2**: Top-align image crop (people photos show faces, not torsos)
- **Content**: Tighter line-height (1.45-1.5 vs 1.6-1.65)

---

**Documentation consolidated**

Three editor docs (`EDITOR_REQUIREMENTS.md`, `EDITOR_MASTER_PLAN.md`, `EDITOR_FIXES_IMPLEMENTATION.md`) merged into one: **`Docs/editor/EDITOR_COMPLETE_RECORD.md`** — includes full requirements history, architecture decisions, implementation plan, bug fix sprints, and GAN testing methodology.

**Tests: 61/61 E2E passing.**

---

## 2026-06-18 - Session 39: Canvas Template System + Chart Editor — Master Plan + Phase 0-1 Implementation

**Decision:** Designed and began implementing the full canvas-first editor — faithful Fabric.js templates that match the Jinja2 PNG output, plus a 13-type user chart editor. Consolidated all prior planning docs into one authoritative plan.

---

**Planning work:**

**`Docs/editor/EDITOR_MASTER_PLAN.md`** (new — supersedes all prior editor plans)

Merged `CANVAS_TEMPLATE_SYSTEM_PLAN.md` + `CHART_EDITOR_PLAN.md` into a single document. Key decisions:

- **9 Aurora templates** (`aurora-hook`, `aurora-content-{0/1/2/text}`, `aurora-stat`, `aurora-quote`, `aurora-cta`, `aurora-engage`) + Lumina variants (thin wrappers, zero code duplication via `lw()` helper)
- **Backdrop filter**: Offscreen canvas `ctx.filter = "blur(16px)"` → crop to card region → FabricImage. Safari fallback: high-opacity solid rect. `stackblur-canvas` rejected (CPU-bound, unnecessary dependency)
- **Charts**: Chart.js offscreen → `toDataURL()` → `FabricImage` for Tier 1+2 types; `fabric.Group` for funnel/progress/number-stat (Tier 3). Single `createChartObject()` dispatcher used by both pipeline templates and user insert
- **Lumina = Aurora + LUMINA tokens** — `lw()` one-liner in registry, no separate template files
- **`originX: "left", originY: "top"` on every Fabric object** — hard rule, root cause of all prior left-clip bugs
- **`canvas_template` field added to `Slide` model** — optional, backward-compatible. Backend writes it in `carousel_generator.py` via `_canvas_template_id()` (5-line addition)
- Deleted `CANVAS_EDITOR_IMPLEMENTATION_PLAN.md`, `CANVAS_TEMPLATE_SYSTEM_PLAN.md`, `CHART_EDITOR_PLAN.md` — all superseded

**Bugs caught during plan audit (vs. original drafts):**

1. Quote slide: `slide.title` = quote text, `slide.body` = attribution (NOT swapped)
2. Quote slide has "Key Insights" section from `slide.bullets` (omitted in draft)
3. Stat slide hierarchy: `stat_value` BIG beside `stat_label`, `slide.title` = context text
4. Engage ≠ CTA (gradient bg + rings vs. dark bg + glows)
5. `carousel_generator.py` already computes `layout_variant` + `has_image` — just needs to write field

---

**Implementation — Phase 0 (Foundation, no deps):**

| File                                | Purpose                                                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/types/chart.ts`         | `ChartType` union (13 types), `ChartData`, `ChartSeries`, `ScatterPoint`, `BubblePoint`, `ChartObjectData`                                                             |
| `frontend/utils/canvasTokens.ts`  | `AURORA` + `LUMINA` tokens, `CHART_PALETTE` (aurora/lumina), `getTokens()`, `applyOverrides()`                                                                           |
| `frontend/utils/canvasFonts.ts`   | `loadCanvasFonts()` singleton — loads Syne-Bold + Plus Jakarta Sans (3 weights) via FontFace API. Non-fatal: `Promise.allSettled()` so canvas works even if fonts unavailable |
| `frontend/utils/parseChartCsv.ts` | `parseChartCsv(csv)` — auto-detects single-series, multi-series, scatter, bubble from header shape                                                                              |

**Implementation — Phase 1 (Chart rendering engine):**

`frontend/utils/canvasTemplates/chartRenderer.ts` — single file, used by both pipeline templates and user-created charts:

- `renderChartToDataURL(type, data, theme, w?, h?)` — renders Chart.js to offscreen `<canvas>` → PNG dataURL. Throws for Tier 3 types (funnel/progress/number-stat)
- `createChartFabricImage(...)` — wraps dataURL as `fabric.FabricImage` with `data: ChartObjectData` for re-editing
- `createFunnelGroup(...)` — Fabric Group replicating CSS funnel: gradient bars + right-aligned labels + value text inside bars
- `createProgressGroup(...)` — Fabric Group: label + track rect + gradient fill rect + percentage text per row
- `createBigNumberGroup(...)` — Fabric Group: giant Syne stat value + label + context text
- `createChartObject(...)` — single dispatcher; caller doesn't need to know which tier a chart type belongs to
- `buildConfig(type, data, palette)` — internal Chart.js config builder covering all 10 Chart.js types (bar, column, line, area, donut, radar, stacked-bar, stacked-column, comparison, scatter, bubble)

All chart palettes match the Jinja2 templates exactly: `#7C6EFA` primary, `#2DD4BF` secondary, etc.

---

**Build order (remaining):**

| Phase                                                                 | Status  |
| --------------------------------------------------------------------- | ------- |
| Phase 0: Foundation                                                   | ✅ Done |
| Phase 1: Chart renderer                                               | ✅ Done |
| Phase 2: shared.ts (Fabric components)                                | 🚧 Next |
| Phase 3: Aurora templates (6 files)                                   | Pending |
| Phase 4: Template registry + buildSlideCanvas()                       | Pending |
| Phase 5: Backend canvas_template field                                | Pending |
| Phase 6: FabricCanvas.loadInitial() wiring                            | Pending |
| Phase 7: Chart UI (ChartTypePicker, ChartDataTable, ChartEditorPanel) | Pending |
| Phase 8: RightPanel split + chart wiring                              | Pending |
| Phase 9-11: TemplatesPanel + EditorLeftPanel + user templates backend | Pending |

**TypeScript: 0 errors across all new files. 61/61 E2E tests passing (unchanged).**

---

## 2026-06-18 - Session 38: Architecture Decision — Editor Pivot from Iframe to Canvas-First (Fabric.js)

**Decision:** Retired the iframe-preview editor architecture in favour of a canvas-first redesign using Fabric.js. Requirements documented in `Docs/editor/EDITOR_REQUIREMENTS.md`.

---

### Why the iframe approach cannot grow

The editor built in Session 37 works like this:

```
Backend Jinja2 template → Playwright PNG → served as iframe → side-panel fields → save → iframe reloads
```

This hit three hard walls:

1. **In-place editing is a postMessage workaround, not real editing.** Clicking the slide sends a message to the parent; the parent focuses a sidebar textarea. The user edits in a panel, not on the slide. True in-place editing — click text on the image and type there — is impossible because the iframe is a rendered static HTML snapshot, not an interactive object graph.
2. **Auto-save races with the user's keystrokes.** A debounced save fires a backend call that re-renders the Jinja2 HTML and reloads the iframe. If the user is mid-word when the 300ms debounce fires, the iframe reload interrupts them. The only safe fix is to block saves until the user stops typing — which is exactly "explicit save button", making auto-save meaningless.
3. **No concept of canvas objects.** The slide has no element model — it is a rendered image. There is no way to drag an image box, resize a text element in-place, set transparency on a background, or apply per-element filters. These require a scene graph, not a screenshot.

---

### Chosen approach: Fabric.js canvas

**Why Fabric.js over alternatives:**

| Library                  | Fit           | Reason                                                                                                                                                                                                 |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fabric.js v7.x** | ✅ Best       | Native`Textbox` (cursor, selection, per-char styles); `Image.filters.*` (brightness, contrast, blur, grayscale built-in); `canvas.toJSON()` exact serialization; MIT, 31k stars, v7.4.0 May 2026 |
| react-konva              | ✓ Strong alt | Good transformer/resize handles, but text editing requires manual`<textarea>` DOM overlay — replicating what Fabric already ships                                                                   |
| tldraw                   | ✗ Skip       | Designed for infinite canvas; commercial license for production                                                                                                                                        |
| Polotno SDK              | ✗ Skip       | Vendor lock-in; paid; overkill                                                                                                                                                                         |

Reference implementations validated: **Fabritor** (1.2k ★, MIT, Fabric.js + React — production Canva clone), **react-image-editor** (544 ★, MIT, Konva — undo/redo reference).

---

### What changes

**Retired components:**

- `SlidePreviewFrame.tsx` — iframe approach retired
- `ImageEditModal.tsx` — popup approach replaced by persistent panel
- `use-undoable` hook — replaced by Command Pattern

**New architecture:**

```
/editor
├── LeftPanel (collapsible tabs)
│   ├── FilesTab       — current FileBrowser (unchanged)
│   └── ImagesTab      — persistent asset library (search cache + uploads + run images)
├── CanvasArea
│   ├── CanvasToolbar  — undo/redo, save, zoom, export
│   ├── FabricCanvas   — main 1080×1080 editing canvas
│   └── ContextToolbar — floating toolbar above selected object (type-sensitive)
└── RightPanel (collapsible)
    ├── (text selected)  → Font, Size, Color, Alignment
    ├── (image selected) → Filters, Opacity, Crop, Set as BG
    └── (nothing)        → Slide properties (theme, background color)
```

**Undo/Redo: Command Pattern (industry standard)**

Each user action pushes a `{ label, snapshot: FabricJSON }` onto a local `commandStack[]`. Undo pops the stack and restores the snapshot. The server receives a save only when the user explicitly clicks Save (or after a long inactivity timeout — async, never blocking UI). This is the Figma/Canva/Google Docs pattern: local undo stack, async background save, UI never waits.

**Images: persistent left panel (not a modal)**

Canva, Figma, and Adobe Express all use a persistent left asset panel. Search results and uploads survive across slides. Images are dragged from the panel onto the canvas, becoming first-class `fabric.Image` objects with resize/rotate handles.

**Backend changes needed:**

- `GET /content/{run_id}/slides/{ai}/{sn}/canvas` — returns Fabric JSON (converts legacy slide JSON on first load)
- `PUT /content/{run_id}/slides/{ai}/{sn}/canvas` — stores Fabric JSON (explicit save)
- Playwright PNG export still used for download/generation — rendering pipeline untouched

**Migration path:** Pipeline still generates slides via Jinja2 → Playwright. "Open in Editor" converts the generated slide JSON to an initial Fabric canvas JSON (one-time). The user edits in Fabric. On Save → Fabric JSON stored; PNG re-exported for download. Backend rendering pipeline is unchanged.

**New dependency:** `pnpm add fabric` (v7.x, TypeScript types included)

**Status:** 🚧 Requirements captured. Implementation not yet started. Reference: `Docs/editor/EDITOR_REQUIREMENTS.md`.

---

## 2026-06-15 - Session 37: Editor Overhaul — In-Place Editing, Image Modal, Undo/Redo, Add Slide, New Blank Post

**Decision:** Implemented all 6 requirements from `Docs/editor/EDITOR_PLAN.md` on top of the existing iframe-preview editor. This is the **first iteration** — later superseded by the canvas-first pivot (Session 38).

---

**R1 — In-place editing via postMessage**

`backend/core/services/slide_editor_service.py` — `_CLICK_LISTENER_SCRIPT` constant injected before `</body>` in every `get_slide_html_preview()` call. Script attaches `click` listeners to `.hook-headline`, `.slide-title`, `.slide-body`, `.bullet-text`, `.bg-image`, `.image-card` — each fires `window.parent.postMessage({type: 'SLIDE_ELEMENT_CLICK', field: 'title'|'body'|'bullet'|'image'}, '*')`.

`SlidePreviewFrame.tsx` — added `onElementClick` prop; `useEffect` on `window.message` calls it when `e.data.type === 'SLIDE_ELEMENT_CLICK'`.

`SlideEditor.tsx` — `handleElementClick(field)` switches to Content tab + focuses the matching textarea (`id="slide-field-title"` etc.) with a 200ms yellow flash animation. Image field → opens `ImageEditModal`.

---

**R2 — Image management modal (`ImageEditModal.tsx` — new)**

Three-tab modal:

- **Search** — Pexels or Web (DDG), 12-result grid, click to stage (violet border), Apply → `api.swapSlideImage()`
- **Upload** — `react-dropzone` v15; accepts JPG/PNG/WEBP ≤ 10MB; drag-drop or click; calls new `api.uploadSlideImage()`
- **URL** — paste URL, live `<img>` thumbnail preview, "Use This Image" → `api.swapSlideImageUrl()`

New backend endpoints:

- `POST /content/{run_id}/slides/{ai}/{sn}/upload-image` — Pillow converts to JPG, saves, re-renders PNG
- `POST /content/{run_id}/slides/{ai}/{sn}/swap-image-url` — httpx downloads URL, validates content-type, same save/render pipeline

New service functions in `slide_editor_service.py`: `upload_image()`, `swap_image_url()`.
New schemas: `SwapImageUrlRequest`.

---

**R3 — Pipeline → Editor button**

`frontend/app/pipeline/page.tsx` — "Open in Editor" button added after Stage 3 carousels complete. Appears alongside `BlogExportBar`. Navigates to `/editor?run={runId}&view=slide&angle=0&slide=1`.

---

**R4 — Undo/Redo with `use-undoable`**

`SlideEditor.tsx` — replaced all individual `useState` fields with `useUndoable<SlideSnapshot>`. `resetInitialState(loaded)` called after server load so the undo stack doesn't go past the load point. `Ctrl+Z`/`Cmd+Z` → `undo()`, `Ctrl+Shift+Z`/`Cmd+Shift+Z` → `redo()`. Undo/Redo buttons in top bar. Status indicator shows "⟳ Saving…" / "● Saved".

**Note:** Auto-save (300ms debounce) was included in this iteration but later identified as a problem — see Session 38 for why this approach was superseded.

**New dependency:** `pnpm add use-undoable` (v5.0.0, zero deps)

---

**R5 — Add slide wired to UI**

`FileBrowser.tsx` — inline type picker (Hook/Content/Stat/Quote/CTA/Engage) below each expanded angle's slide list. Confirm → `api.newSlide()` → `api.editSlide()` for first render → reload manifest → navigate to new slide.

---

**R6 — New blank post (no pipeline)**

`FileBrowser.tsx` — `+ New` button in header, inline title input (Enter to confirm). Calls `api.createBlankRun(topic)`.

`backend/core/services/run_browser_service.py` — `create_blank_run(topic)`: UUID, creates directory structure, writes minimal `slides.json` + `research_result.json`, returns `{run_id, topic}`.

New endpoint: `POST /content/new-blank-run`.

---

**Backend route count:** 15 (was 12, +3: `new-blank-run`, `upload-image`, `swap-image-url`)
**New packages:** `use-undoable` (frontend), `react-dropzone` v15 (frontend)
**Tests:** 61/61 E2E passing.

---

## 2026-06-14 - Session 36: Backend Round 3 — Service Layer Extraction & Final Cleanup

**Decision:** Third comprehensive backend audit and refactor pass. Tackled the biggest remaining structural problem (`content.py` at 483 lines mixing routing + business logic + I/O) plus duplicate JWT detection, scattered helper functions, and remaining hardcoded constants.

---

**P1 — `content.py` split into proper layers (483 → 119 lines)**

| New file                                  | Purpose                                                                                                                                                                                                       | Lines |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `core/services/slide_editor_service.py` | All slide editing logic: preview, edit, AI rewrite, swap image, create. Deduplicated Jinja2 env (cached per theme) + single`_render_and_save_png()` helper replacing two identical render+screenshot blocks | 238   |
| `core/services/run_browser_service.py`  | `list_runs()` + `get_run_manifest()`                                                                                                                                                                      | 88    |
| `core/persistence/slide_repository.py`  | `read_slides()`, `write_slides()`, `read_image_assets()`, `write_image_assets()` — handles both flat list and `{"slides": [...]}` wrapper JSON formats                                             | 76    |
| `core/persistence/run_repository.py`    | `read_topic()`, `static_image_url()`                                                                                                                                                                      | 42    |

`apps/api/v1/content.py` is now **119 lines of pure routing** — every handler is validate → delegate → respond.

---

**P2 — `infra/llm/jwt_handler.py` — deduplicated JWT detection**

`_is_jwt_error()` was defined identically in both `factory.py` and `langchain_adapter.py`. Extracted to `infra/llm/jwt_handler.py` as `is_jwt_error()`. Both files now import from there.

---

**P3 — Helper functions moved to `core/` from API layer**

| Function                                         | From                | To                                    |
| ------------------------------------------------ | ------------------- | ------------------------------------- |
| `_fetch_category()` + `_DISCOVER_CATEGORIES` | `tools_news.py`   | `core/tools/News/discovery.py`      |
| `_age_label()`                                 | `tools_news.py`   | `core/utils/time_utils.py`          |
| `_ddgs_multi_search()`                         | `tools_images.py` | `core/tools/Search/multi_search.py` |

`tools_news.py` 237 → 120 lines. `tools_images.py` 164 → 113 lines.

---

**P4 — `domain_from_url()` added to `core/utils/text_utils.py`**

Was duplicated inline in `news_api.py` and `evaluator.py`. Now centralized in `text_utils.py`. `evaluator.py` updated to import it.

---

**P5 — 5 new settings added to `configs/settings.py`**

`instagram_handle`, `blog_min_images`, `news_request_timeout_seconds`, `content_no_image_slide_types`. Callers updated in `blog_post_generator.py` and `image_fetcher.py`.

`claude.py`: `max_retries` renamed to `max_validation_retries` with an inline comment clarifying it controls structured-output validation retry loops, NOT HTTP client retries.

---

**New files created:** `core/services/__init__.py`, `core/persistence/__init__.py`, `core/utils/time_utils.py`, `core/tools/News/discovery.py`, `core/tools/Search/multi_search.py`, `infra/llm/jwt_handler.py`

**44 backend tests + 61/61 E2E — all passing.**

---

**Decision:** Implemented the final major planned feature — the `/editor` page. A Canva-inspired slide editor where users can edit text, font sizes, colors, accents, slide type, theme, chart data, swap images, and AI-rewrite any slide, plus a full Markdown blog editor with an LLM assistant sidebar. Architecture validated by research: Canva uses DOM+CSS (not canvas), and our Playwright pipeline already matches the Chart.js rendering engine (Skia), so no visual mismatch.

---

**Backend — 9 new endpoints in `content.py`**

| Method   | Path                                                | Purpose                                                          |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| `GET`  | `/content/runs`                                   | List all pipeline runs from disk with metadata                   |
| `GET`  | `/content/{run_id}/manifest`                      | File tree: angles, slide counts, png paths, blog flag            |
| `GET`  | `/content/{run_id}/slides/{angle}`                | Raw slides.json for an angle                                     |
| `GET`  | `/content/{run_id}/slides/{angle}/{n}/preview`    | **Live Jinja2 render → HTMLResponse** (powers the iframe) |
| `POST` | `/content/{run_id}/slides/{angle}/{n}/edit`       | Patch slide fields, re-render, re-screenshot                     |
| `POST` | `/content/{run_id}/slides/{angle}/{n}/ai-rewrite` | LLM rewrite with feedback                                        |
| `POST` | `/content/{run_id}/slides/{angle}/{n}/swap-image` | Fetch + download new image, re-render                            |
| `POST` | `/content/{run_id}/slides/{angle}/new`            | Create blank slide from template                                 |
| `PUT`  | `/content/{run_id}/blog-post`                     | Save updated markdown, regenerate HTML                           |

New schemas: `SlideEditRequest`, `SlideEditResponse`, `BlogPostUpdateRequest` in `schemas.py`.

---

**Backend — prerequisite extractions**

- `carousel_generator.py` — `render_and_screenshot_single_slide(html_path, output_path, serve_root)` extracted as public function. `screenshot_slides_node` loops calling it. Used by the edit/swap/ai-rewrite endpoints.
- `image_fetcher.py` — `fetch_and_download_single_image(query, source, dest_path)` extracted. Used by swap-image endpoint.
- `contracts.py` — `slide_overrides: dict` added to `Slide` model. Per-slide CSS variable overrides.
- `_base.html.j2` (aurora + lumina) — override injection block added: renders `--ov-{key}: {val}` CSS variables into `:root` when `slide.slide_overrides` is non-empty.

---

**Frontend — 6 new components**

| File                                        | Purpose                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| `app/editor/page.tsx`                     | Two-panel shell; URL params drive which editor panel shows                              |
| `components/editor/FileBrowser.tsx`       | Left panel: recent runs (Redux) + all runs (API), expand to slides + blog               |
| `components/editor/SlidePreviewFrame.tsx` | `<iframe>` pointing to `/preview` endpoint; `previewKey` forces reload on save    |
| `components/editor/SlideEditor.tsx`       | 5-tab Canva-style editor: Content / Style / Chart / Image / AI                          |
| `components/editor/ChartPreview.tsx`      | `react-chartjs-2` live preview (same Skia engine as Playwright — no visual mismatch) |
| `components/editor/MarkdownEditor.tsx`    | `@uiw/react-md-editor` dark mode + LLM chat sidebar using existing `api.chat()`     |

**New packages:** `react-chartjs-2`, `chart.js`, `@uiw/react-md-editor`

---

**Style controls implemented (per-slide, Canva-style):**

- Font size (XS/SM/MD/LG/XL) → `slide_overrides.title_font_size`
- Title color (swatches + `<input type="color">`) → `slide_overrides.title_color`
- Accent color (preset palette + custom) → `slide_overrides.accent_color`
- Slide type switcher (hook/content/stat/quote/cta/engage) → re-renders with new template
- Theme switcher (Aurora dark / Lumina light) → re-renders with correct template family

---

**`/blog-preview` → redirect**

`app/blog-preview/page.tsx` replaced with a redirect to `/editor?run={id}&view=blog`. The editor is now the canonical viewer and editor for blog posts. `BlogExportBar.tsx` "Preview" button updated to point directly to the editor.

---

**`api.ts` additions:** `getRunsList`, `getRunManifest`, `getSlides`, `editSlide`, `aiRewriteSlide`, `swapSlideImage`, `newSlide`, `updateBlogPost` + TypeScript interfaces `RunSummary`, `RunManifest`, `AngleManifest`, `SlideData`, `SlideEditRequest`, `SlideEditResponse`.

**Architecture note:** The live preview uses a server-rendered Jinja2 iframe (same rendering path as Playwright PNG generation). This means what you see in the editor is pixel-accurate to the final PNG — no canvas-based replication needed. Validated by research: this is the same approach used by Slidev, Marp, and conceptually similar to Canva's DOM-based editor with separate rasterization for export.

**TypeScript: 0 errors. E2E: 61/61 passing.**

---

**Decision:** Second comprehensive audit of the entire backend. Extracted the embedded HTML template, deduplicated `_has_cjk`, moved all remaining hardcoded constants to settings, split two large functions, extracted an LLM prompt, and made a dozen minor clarity fixes. No behaviour changes.

---

**Change 1 — HTML template extracted from `blog_post_generator.py`**

47 lines of inline HTML+CSS removed from `_markdown_to_html()`. Moved to `core/templates/blog/blog_post.html.j2`. Function now uses `jinja2.Environment` to render the template — same library already used for carousel templates. `_BLOG_TEMPLATE_DIR` path constant added at module level.

---

**Change 2 — `_has_cjk()` deduplicated**

Function was defined identically in both `slide_validator.py` and `image_fetcher.py`. Added as `has_cjk(text)` to `core/utils/text_utils.py`. Both files now import from there. Test file updated to import from new location.

---

**Change 3 — Image relevance LLM prompt extracted**

Inline f-string prompt in `apps/api/v1/tools_images.py` (used for LLM filtering of DDGS image results) moved to `core/prompts/templates/image_relevance_filter.txt`. Called via `load_prompt("image_relevance_filter", ...)`.

---

**Change 4 — 11 new settings added to `configs/settings.py`**

All remaining hardcoded values consolidated:

| Setting                           | Was hardcoded in                |
| --------------------------------- | ------------------------------- |
| `medium_url`                    | `caption_generator.py`        |
| `backend_base_url`              | `blog_post_generator.py`      |
| `cors_origins`                  | `main.py`                     |
| `image_relevance_threshold`     | `tools_images.py`             |
| `image_max_tags`                | `tools_images.py`             |
| `image_tag_stopwords`           | `tools_images.py`             |
| `carousel_viewport_size`        | `carousel_generator.py` (×2) |
| `carousel_scale_factor`         | `carousel_generator.py`       |
| `carousel_chart_render_wait_ms` | `carousel_generator.py`       |
| `crawl_markdown_max_chars`      | `normalizer.py`               |
| `crawl_snippet_max_chars`       | `normalizer.py`               |

---

**Change 5 — `execute_tools_node` split (executor.py)**

`execute_tools_node` was 132 lines — a single function running 4 tools in sequence with ~30 lines each. Extracted four module-level helpers:

- `_run_ddgs_text(ddgs, query)`
- `_run_ddgs_news(ddgs, query)`
- `_run_news_api(query, run_id, degraded_flags)`
- `_run_crawl4ai(plan, max_crawl_urls)`

Node becomes a 40-line coordinator using a `_TOOL_RUNNERS` dispatch dict. Commented-out stale code also removed.

---

**Change 6 — `_run_blog_post_generation()` extracted (content orchestrator)**

65-line deeply nested blog generation block extracted from `ContentOrchestrator.run()` into a module-level `_run_blog_post_generation(run_id, request, angles_processed, all_slides, all_assets) -> tuple[str, str]`. `run()` calls it as one line.

---

**Change 7 — Evaluator saturation constants**

Magic numbers `15.0` and `8.0` in `evaluator.py` replaced with named constants `_COVERAGE_SATURATION` and `_DIVERSITY_SATURATION` with comments explaining the rationale (calibrated for 3 always-on tools).

---

**Minor fixes**

- `_progress_store.py`: `_TOTAL = 9` annotated with inline comment listing all 9 node names
- `run_workflow.py`: deleted stale commented-out `post_design` stage line
- `main.py`: CORS origins from `settings.cors_origins`; startup log includes `environment` field
- `tools_images.py`: stopwords and max-tags use settings; `load_prompt` for LLM filter

**44 backend tests + 61/61 E2E — all passing.**

---

## 2026-06-14 - Session 33: Backend Round 1 — Modularisation & Cleanup

**Decision:** First comprehensive backend audit and cleanup pass. Extracted inline prompts, eliminated duplicate code, removed dead code, moved inline imports to file tops, cleaned up `langchain_adapter.py`, added constants to settings, split functions, added credibility constants.

---

**Changes made:**

- `core/utils/text_utils.py` (new) — `strip_fences()`, `format_evidence_block()`, `make_llm_url()`, `LLM_EVIDENCE_URL_PREFIX`
- `core/prompts/templates/topic_from_url.txt` (new) — extracted from `tools_news.py`
- `core/prompts/templates/angle_auto_select.txt` (new) — extracted from `auto_selector.py`
- `infra/llm/langchain_adapter.py` — deleted unused `create_langchain_llm()` (40 lines); replaced `getattr()` with direct settings access
- `llm_drafter.py` + `query_preprocessor.py` — deleted local `_strip_fences()` duplicates; now import from `text_utils`
- `synthesizer.py` + `evaluator.py` — deleted local `_build_evidence_block*()` duplicates; now use `format_evidence_block()`
- `llm_knowledge.py` + `llm_drafter.py` — inconsistent `llm://background/` vs `llm://knowledge/` URLs unified via `make_llm_url()`
- `tools_news.py` + `tools_images.py` — inline `import json` moved to file tops
- `normalizer.py` — `_CRED_WEB/NEWS/CRAWL/API` named constants replace magic `0.4/0.6/0.7/0.8`
- `research_graph.py` — 7 `_*_tracked` wrapper functions replaced by `_tracked(fn, step)` factory; `Evidence` import moved to top
- `configs/settings.py` — added `pexels_base_url`, `document_max_upload_bytes`, `document_supported_formats`, `discover_cache_ttl_seconds`, `evidence_score_max_items`, `evidence_snippet_len`, `instagram_url`
- `caption_generator.py` — Instagram URL from settings
- `tools_docs.py` — file size limit and supported formats from settings
- `tools_news.py` — cache TTL from settings; uses `load_prompt()` for topic-from-url
- `tools_images.py` — Pexels base URL from settings
- `main.py` — CORS and logging improvements
- `ddgs_search_schema.py` — `VideoResult` documented as reserved for future video search
- `_progress_store.py` — `_TOTAL` comment added
- `routing.py` — design rationale comment added

**44 backend tests + 61/61 E2E — all passing.**

---

**Decision:** Two evidence pipeline gaps filled: (1) the full article content already fetched during Discover was being discarded after topic drafting — now injected as a seeded evidence item into the research pipeline; (2) users can now attach documents (PDF, DOCX, TXT, MD, JSON, CSV, PPTX, XLSX, etc.) from the Discover drawer and have them incorporated as high-credibility evidence in the research run.

---

**Change 1 — New `source_type` values in `contracts.py`**

`Evidence.source_type` Literal extended to include `"discover"` (credibility 0.85 — real published article) and `"document"` (credibility 0.9 — user explicitly chose this source). `url` field changed from required to `default=""` to support document uploads without a URL.

---

**Change 2 — `seeded_evidence` field in `ResearchRequest`**

`backend/core/orchestration/contracts.py` — added `seeded_evidence: list[dict] = []`. The `intake_node` in `backend/core/graphs/research_graph.py` reads this field and pre-populates `state["evidence"]` before tool execution. Seeded items bypass tool selection and are always present — the normalizer's existing URL dedup means the article URL won't be re-fetched redundantly.

---

**Change 3 — `POST /tools/parse-doc` endpoint**

`backend/apps/api/v1/tools.py` — new multipart endpoint. Uses **markitdown** (Microsoft, `uv add markitdown`) to convert PDF, DOCX, PPTX, XLSX, HTML, CSV, XML → Markdown. Plain text types (txt, md, json) handled without markitdown for speed. 10MB size limit enforced. Processes in memory — no files stored on disk. Returns `ParseDocResponse { title, text, char_count, file_type }`.

---

**Change 4 — Frontend evidence wiring**

- `frontend/store/slices/pipelineSlice.ts` — added `attachedEvidence: AttachedEvidence[]`; actions `addAttachedEvidence`, `removeAttachedEvidence`, `clearAttachedEvidence`; preserved through `resetPipeline`.
- `frontend/hooks/usePipelineOrchestration.ts` — `handleRun` now builds `seeded_evidence` array from both `discoveryArticle.snippet` (if present) and all `attachedEvidence` items, then passes as `seeded_evidence` to `api.runResearch`.
- `frontend/lib/api.ts` — added `api.parseDoc(file)` (FormData, no Content-Type header), `SeedEvidence`, `ParseDocResponse`, `AttachedEvidence` interfaces; `seeded_evidence?: SeedEvidence[]` added to `ResearchRequestBody`.

---

**Change 5 — `AttachedSourcesPanel.tsx` component (new)**

`frontend/components/pipeline/AttachedSourcesPanel.tsx` — drag-and-drop + click-to-upload panel. Each file calls `api.parseDoc()` with a per-file loading spinner. On success dispatches to Redux with char count. On error shows inline error chip (auto-clears after 4s). Files shown as a list with filename, char count, type icon. `[×]` removes from Redux.

---

**Change 6 — Discover Drawer UI update**

`frontend/components/pipeline/DiscoverDrawer.tsx` — `AttachedSourcesPanel` pinned at the bottom of the drawer. Header shows a `📎 N` badge when any evidence is attached. Clicking the badge re-opens the drawer.

`frontend/components/pipeline/PipelineConfig.tsx` — when `attachedEvidence.length > 0`, a violet `📎 N` chip appears in the topic row next to the Discover button.

---

**TypeScript: 0 errors. E2E: 61/61 passing.**

---

**Decision:** Audited every non-test `.tsx`/`.ts` file for inline component definitions and large page files. Extracted all remaining inline components into dedicated files organised by feature folder. Every page is now pure layout wiring — no component or business logic defined inline.

---

**Files decomposed:**

| Page (before → after)                     | Extracted to                                                                                                                                                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/images/page.tsx` 480 → 168 lines   | `components/images/ImageCard.tsx` (`PexelsCard`, `DDGSCard`, `SelectOverlay`), `components/images/ImageTagChips.tsx`, `components/images/SelectionActionBar.tsx`, `hooks/useImageSearch.ts` (all search + download logic) |
| `app/research/page.tsx` 428 → 224 lines | `components/research/ConfidenceBar.tsx` (`ConfidenceBar`, `Badge`), `components/research/EvidenceCard.tsx`, `components/research/ResearchConfigPanel.tsx` (full left sidebar)                                                 |
| `app/news/page.tsx` 307 → 177 lines     | `components/news/NewsCard.tsx`                                                                                                                                                                                                        |
| `app/chat/page.tsx` 210 → 153 lines     | `components/chat/MessageBubble.tsx` (`MessageBubble`, `TypingIndicator`)                                                                                                                                                          |

**New folders created:** `components/images/`, `components/research/`, `components/news/`, `components/chat/`, `hooks/`

**Pattern applied consistently across all pages:**

- Reusable UI → `components/<feature>/ComponentName.tsx`
- Business/async logic → `hooks/useFeatureName.ts`
- Page files contain only: imports, state wiring, layout JSX

**No logic changes** — pure structural refactor. TypeScript: 0 errors. E2E: 61/61 passing.

---

**Decision:** Three compounding sessions of UI work culminating in a fully decomposed, maintainable pipeline frontend with a modern command bar, enriched topic discovery, and zero dead code.

---

**Change 1 — Command bar complete redesign (PipelineConfig)**

Replaced the old cluttered horizontal toolbar with a card-based launcher:

- **Row 1:** Full-width topic textarea (transparent, no border) + Discover button right-aligned
- **Row 2:** Chip toolbar — LLM mode toggle, depth/freshness/angles `OptionChip` dropdowns, spacer, Config button, Produce Content CTA
- **Settings panel:** Expands inline inside the card (not a floating popover) — 2-column grid with Research Budget (tool calls, sources, loops, crawl URLs, claim verification) and Content Generation (angles, slide range, image source)

Key UX fixes vs old design:

- Advanced settings now expands **downward inside the card** — no longer clips above viewport
- "Source" label renamed to **"LLM Mode"** — chip shows "Web" or "LLM only" clearly
- All configs exposed: `max_angles_to_select`, `needs_claim_verification`, `min_slides`, `max_crawl_urls`, `image_source` (in advanced)
- Dropdown chips (`OptionChip`) replace old pill segment buttons — each option has a label + description sub-line
- **Produce Content button and textarea both lock** (`disabled` / `readOnly`) while topic is being drafted from an article

---

**Change 2 — Discover flow: URL-based LLM topic drafting**

Old behaviour: selecting a discover article called `/tools/query-refine` with just the headline → returned a raw keyword list with no context, dumped into the query strip automatically.

New behaviour:

1. User clicks "Use →" on a discover article card
2. Topic field immediately seeds with the article headline
3. `POST /tools/topic-from-url` fires in background — LLM drafts a **one rich research statement** (15–25 words) grounded in the article's actual content
4. Topic field updates to the drafted statement; textarea and CTA are locked during drafting
5. `✦ Topic drafted from article content` hint appears (amber `⚠` if content couldn't be read)
6. Article URL stored as `discoverUrl` in Redux — passed as `explicit_urls` to research pipeline so Crawl4AI uses it

**Why no Crawl4AI for drafting:** The news APIs (Google News / DDGS) already return full article content in `a.content` / `r.body`. The `_fetch_category` function was truncating to 200 chars — removed that truncation. The full content is now passed directly to the LLM in the `topic-from-url` endpoint. No additional web requests needed.

**New backend endpoint (`backend/apps/api/v1/tools.py`):**

- `POST /tools/topic-from-url` — accepts `{url, title, snippet}` (snippet = full article content from news API), calls LLM, returns `{topic, freshness, entities, crawl_failed}`
- `crawl_failed: bool` is always `False` in normal flow (snippet-based); used as fallback signal if LLM fails

**New backend schemas (`backend/apps/api/v1/schemas.py`):**

- `TopicFromUrlRequest`, `TopicFromUrlResponse`

**New Redux field (`pipelineSlice.ts`):**

- `discoverUrl: string | null` — cleared on `resetPipeline`, wired into `runResearch` as `explicit_urls`

---

**Change 3 — Discover drawer card redesign (`DiscoverDrawer.tsx`)**

Old: `line-clamp-2` truncated both title and snippet; clicking anywhere on the card selected it.

New layout per card:

- Full title (semibold, no truncation)
- Full snippet (no line-clamp)
- Source + age in footer
- **Two explicit action buttons:** `[↗ Read]` (opens URL in new tab, no selection) and `[Use →]` (triggers topic drafting flow)
- Entire card is NOT clickable — prevents accidental selection

Category filter chips now have full category names; loading skeleton has realistic shimmer shape.

---

**Change 4 — Full component decomposition of `PipelineConfig.tsx` (742 → 234 lines)**

All inlined helper components and logic extracted to dedicated files:

| File                                            | Content                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/pipeline/OptionChip.tsx`          | Dropdown chip with animated popover, click-outside close                                               |
| `components/pipeline/LlmChip.tsx`             | LLM mode toggle button with mini inline switch                                                         |
| `components/pipeline/SettingsPrimitives.tsx`  | `Stepper`, `SettingRow`, `ToggleRow`, `SectionHead`                                            |
| `components/pipeline/AdvancedSettings.tsx`    | Full settings expansion panel (reads/dispatches Redux)                                                 |
| `components/pipeline/RefinedQueriesStrip.tsx` | Collapsible query editor strip                                                                         |
| `hooks/usePipelineOrchestration.ts`           | All pipeline run logic:`handleRun`, `handleGenerateAngles`, `runContent`, `runAngleAndContent` |

`PipelineConfig.tsx` is now **pure layout wiring** — imports everything, defines nothing inline.

---

**Change 5 — Dead code removal**

Deleted two orphaned files that were never imported anywhere:

- `components/pipeline/RefinedQueriesStrip.tsx` (old stale version — shadowed by inline duplicate in PipelineConfig)
- `components/pipeline/PipelineProgress.tsx` (superseded by StageCard-based layout in pipeline/page.tsx)

---

**Change 6 — Hydration bug fix**

`RefinedQueriesStrip` had `<button>` inside `<button>` (the collapse toggle wrapping the clear X button). Fixed by converting the outer toggle to `<div role="button" tabIndex={0}>`. Browser hydration error eliminated.

---

**Redux slice additions (`pipelineSlice.ts`)**

New fields: `maxTools`, `maxSources`, `maxLoops`, `maxSlides`, `minSlides`, `maxCrawlUrls`, `maxAnglesSelect`, `needsClaimVerification`, `discoverUrl`. All preserved through `resetPipeline`. All wired into `runResearch` / `runAngle` / `runContent` API calls via `usePipelineOrchestration`.

---

**E2E test updates**

Updated selectors across `pipeline-config.spec.ts`, `llm-research-mode.spec.ts`, `pipeline-normal-flow.spec.ts` for new dropdown-chip UI:

- Pill button checks → chip label visibility checks
- Active class `bg-violet-600` → chip label text presence
- `getByRole("button", { name: /^auto$/ })` → open dropdown first, then pick option
- Advanced settings locator → `page.getByRole("button", { name: "+" })` stepper interaction

**Test result: 61/61 passing**

---

## 2026-06-08 - Session 28: Output Path Restructure + Collapsible Sidebar (Plan 8)

**Decision:** Two infrastructure changes plus Plan 8 (Collapsible Sidebar) fully implemented and validated.

---

**Change 1 — Output path restructure**

- `backend/configs/settings.py` — `research_output_dirs` and `content_output_dir` changed from `"outputs"` to `"outputs/runs"`. Image downloads remain at `outputs/downloads/images`. All pipeline runs now write to `outputs/runs/{run_id}/` — clean separation from image downloads and no UUID filter needed for the editor's file browser.
- `backend/apps/api/v1/content.py` — Updated to use `_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir` (resolves to `outputs/runs/`).
- **28 existing run folders migrated** from `outputs/{run_id}/` to `outputs/runs/{run_id}/`.
- `frontend/components/pipeline/InstagramPreview.tsx` — `slideImageUrl()` rewritten to handle both legacy paths (`/outputs/{id}/...`) and new paths (`/outputs/runs/{id}/...`). Legacy paths are transparently rewritten to the new format so existing runs still display correctly. Also fixed Tailwind v4 class names: `bg-linear-to-tr`, `w-95`, `p-0.5`.

---

**Change 2 — Tailwind v4 gradient class consistency**

- `frontend/components/layout/Sidebar.tsx` — `bg-gradient-to-br` → `bg-linear-to-br`, `bg-gradient-to-r` → `bg-linear-to-r` (canonical Tailwind v4 syntax).

---

**Change 3 — Plan 8: Collapsible Sidebar**

- `frontend/components/layout/Sidebar.tsx` — Full rewrite. Key changes:
  - `motion.aside` with `animate={{ width: expanded ? 256 : 80 }}` — smooth Framer Motion width transition (0.2s easeInOut). Avoids SSR mismatch from Tailwind class switching.
  - `useState(true)` + `useEffect` reading `localStorage("sidebar_expanded")` — preference persists across page reloads. No Redux.
  - **New header layout**: hamburger `≡` (`Menu` icon, 18px) is the LEFT-MOST element in a fixed `w-20 h-18` column — always visible in both states, always centered in the collapsed 80px column. Brand (small logo + "CONTENT / Studio AI") slides in to the right via `AnimatePresence` only when expanded.
  - `AnimatePresence` on all text labels — each `<motion.span>` fades out before the width shrinks, preventing text overflow flash.
  - Native `title` attribute on collapsed `<Link>` elements — zero-JS browser tooltip showing the label on hover.
  - `layoutId="active-nav"` gradient pill — still animates between pages in both states.
  - **Added "Editor" nav item** (`PencilRuler` icon, href `/editor`) — entry point for Plan 6R+9.
  - Removed unused `cn()` helper and `clsx`/`twMerge` imports (replaced with template literal classNames).
  - **Bug fixed in first implementation**: hamburger was in `justify-between` flex alongside the logo, causing it to be clipped 36px outside the 80px viewport when collapsed. Fixed by restructuring header so hamburger is a fixed `w-20` element always at position 0.

**Validation:** 61/61 Playwright E2E tests passing. Playwright screenshots confirm both expanded and collapsed states render correctly at 1440px, 1280px, and 1024px viewport widths.

**Status:** ✅ Plan 8 complete. Ready for Plan 7R (Pipeline Page Redesign + Smart Topic Discovery Drawer).

---

## 2026-06-07 - Session 27: Research Pipeline Fixes, LLMFactory JWT Retry, Codebase Cleanup

**Decision:** Fixed three research pipeline bugs identified from live run analysis: URLs in topics being silently discarded, query_variants being static boilerplate instead of LLM-refined, and LLM background knowledge failing due to JWT expiry on the singleton client. Added LLMFactory retry pattern to all callers. Pinned llm_knowledge evidence outside relevance ranking. Embedded evidence list in research_result.json. Deleted dead files.

---

**Change 1 — Stale file cleanup**

Deleted: `core/graphs/content_workflow.py` (empty), `tests/test_frontend.py` (superseded by `frontend/e2e/`), `tests/demo_llm.py` (exploratory script), `scripts/__init__.py` (empty dir), `build/` (pip artefact).
Kept: `tests/test_executor_crawl4ai_mcp.py` and `core/tools/mcp_servers/date_time_server.py` — user's learning references.
Updated `.gitignore`: added `backend/build/` and `frontend/test-results/`.

---

**Change 2 — URL extraction in `intake_node` (Fix 1)**

- `backend/core/graphs/research_graph.py` — `intake_node` now runs a regex `_URL_RE = re.compile(r'https?://\S+')` on `request.topic` at intake time. Any found URLs are merged into `request.explicit_urls`. The routing policy already handles `explicit_urls` → crawl4ai. Previously: URLs embedded in the topic (e.g. espncricinfo stats links) were silently discarded.

---

**Change 3 — QueryPreprocessor wired into `intake_node` (Fix 2)**

- `backend/core/graphs/research_graph.py` — `intake_node` now calls `QueryPreprocessor().process(request.topic)` when `preprocessed_queries` is empty. Sets `request.preprocessed_queries` from the result (6-10 LLM-refined, facet-targeted queries). Also updates `freshness` if the preprocessor infers a stronger signal (e.g. breaking vs recent). Non-fatal — falls through silently on error.
- Previously: `QueryPreprocessor` was only called from the legacy CLI node (`core/nodes/research.py`). The main API path (`/research/run`) always hit the static fallback.
- `backend/core/orchestration/policies/routing.py` — Removed the useless `" analysis trends"` / `" expert perspectives research"` suffix fallback. Fallback now uses a single raw topic query instead.

---

**Change 4 — LLMFactory JWT auto-retry (Fix 3)**

- `backend/infra/llm/factory.py` — Added `reset()` classmethod (sets `_instance = None`) and `get_client_with_retry(call)` (executes `call(llm)`, on JWT/401 error resets singleton and retries once). Added `_is_jwt_error(exc)` helper — detects "jwt", "expired", "401" in message.
- Root cause: `LLMFactory._instance` holds a `ClaudeLLM` with the HAI Proxy API key baked into `httpx.AsyncClient` headers at construction. When the JWT expires during a long server session, the singleton fails on every subsequent call.
- Updated callers to use `get_client_with_retry`: `llm_knowledge.py`, `query_preprocessor.py`, `angle/generator.py`, `auto_selector.py`, `content/slide_generator.py`, `content/blog_post_generator.py`.

---

**Change 5 — llm_knowledge pinned outside relevance ranking (Fix 4)**

- `backend/core/orchestrators/research/evidence_scorer.py` — `score_evidence_node` now separates `llm_knowledge` items before scoring. Only `source_type != "llm_knowledge"` items go through the LLM relevance ranker. Merge order: `llm_knowledge` items first (always reach the synthesiser), then ranked external sources. Previously: the single `llm_knowledge` item competed against 30+ news articles and was often ranked below the synthesiser's evidence window.

---

**Change 6 — Evidence list embedded in `research_result.json` (Fix 5)**

- `backend/core/orchestrators/research/orchestrator.py` — `_build_response_data()` now includes `"evidence": [e.model_dump() for e in state.get("evidence", [])]`. Previously: only `evidence_count` was saved; loading a run from history showed empty evidence (no `llm_knowledge` chip, no source cards). Evidence is still also written separately to `evidence.json`.

---

**Docs updated**

- `backend/infra/llm/README.md` — Added JWT caveat for `LLMFactory`, documented `get_client_with_retry()`, `reset()`, and recommended usage pattern.
- `Docs/content-orchestrator/FRONTEND.md` — Updated E2E table (61 tests across 7 suites), added stage timers section, added blog export buttons/preview modal, updated API client list, updated running state description.
- `Docs/RCA_Research_Pipeline_Issues.md` (new) — Full RCA document covering all 6 issues + stale file audit with delete/keep decisions.

**Tests:** 44/44 backend unit tests passing. 61/61 frontend E2E tests passing. All 5 fixes verified with dedicated assertions.

**Status:** ✅ Complete.

---

## 2026-05-30 - Session 26: Blog Post Export (Markdown + HTML + In-App Preview)

**Decision:** Auto-generate a publish-ready blog article at the end of every content run. Produces `blog_post.md` (Medium/Substack/Ghost) and `blog_post.html` (Wix/Blogger/standalone) with real images, inline citations, stat pull-quotes, and a branded footer. Accessible from the frontend via a full-screen preview modal + two download buttons.

---

**Change 1 — `markdown` dependency**

- `backend/pyproject.toml` — Added `"markdown>=3.5"`. Installed v3.10.2 via `uv sync`.

---

**Change 2 — Prompt template**

- `backend/core/prompts/templates/blog_post.txt` (NEW) — 19-variable template. LLM writes prose sections only; image injection, pull-quotes, and citations are assembled by Python code afterwards. Section markers (`## [TITLE]`, `## [FINDING: {key_point_1_short}]`, `## [ANGLE: {angle_1_heading}]`) are parsed by regex in `_assemble_markdown`. Rules enforce 1100-1600 words, no bullet lists in prose, no mentions of "carousel" or "slides".

---

**Change 3 — `blog_post_generator.py`** (NEW)

`backend/core/orchestrators/content/blog_post_generator.py`

- `BlogAssets` dataclass — carries `topic`, `synthesis`, `evidence`, `all_angle_slides`, `run_id`, `outputs_root`, `is_llm_only`.
- `_pick_section_images()` — one image per angle section; picks first non-colour asset from `image_assets.json`, uses `original_url` (CDN) if available, falls back to localhost URL, falls back to first PNG screenshot.
- `_img_url()` — CDN URL first, `localhost:8000/outputs/...` fallback.
- `_assemble_markdown()` — splices hero image after first blockquote (subtitle), section images before each `## [ANGLE:` heading, stat pull-quotes (`> **value** — label`) after each `## [FINDING:` heading, then appends either ⚠️ LLM callout (is_llm_only) or `## References` block (web evidence).
- `_build_citations_md()` — top 15 real-URL evidence items, filters `llm://` URLs.
- `_stat_pull_quotes()` — extracts stat slides with `stat_value`, capped at 4.
- `_markdown_to_html()` — uses `markdown` lib with `extra`, `tables`, `toc` extensions; wraps in full styled HTML (serif font, violet accent, responsive, tag chips). Footer: `@TheOpinionBoard`.
- `generate_blog_post(assets)` → `(markdown_str, html_str)` — calls LLM via `LLMFactory.get_client()` (no JWT risk), assembles markdown, converts to HTML, loads hashtags from `carousel.json` for tag chips.

**Bugs fixed vs original plan:**

1. `synthesis` was built only from `ContentRequest.research_summary + key_points` — missing `implications`, `contradictions`, `gaps`. Fixed: load full `research_result.json` from disk and parse complete synthesis dict.
2. HTML footer said "Content Studio AI" — corrected to `@TheOpinionBoard`.
3. `markdown` package wasn't installed — added to `pyproject.toml`.

---

**Change 4 — `ContentOrchestrator` wiring**

`backend/core/orchestrators/content/orchestrator.py` — Added `_BACKEND_ROOT` + `_OUTPUTS_ROOT` at module level (pattern from `finalizer.py`). During the angle loop, collects `all_slides_per_angle` and `all_image_assets_per_angle`. After the loop: loads `research_result.json` for full synthesis + evidence, builds `BlogAssets`, calls `generate_blog_post`, saves `.md` and `.html` via `RunOutputManager(".", ...)`. Entire block is `try/except` — blog failure never breaks the carousel response.

---

**Change 5 — `ContentResponse` schema + API endpoints**

- `backend/core/orchestration/contracts.py` — Added `blog_post_path: str = ""` and `blog_post_html_path: str = ""` to `ContentResponse`. Additive, default empty — no breaking changes to existing callers.
- `backend/apps/api/v1/content.py` — Added `GET /content/{run_id}/blog-post` (`PlainTextResponse`) and `GET /content/{run_id}/blog-post.html` (`HTMLResponse`). Both serve from `outputs/{run_id}/blog_post.*`, 404 if not found.

---

**Change 6 — Frontend**

- `frontend/lib/api.ts` — Added `getBlogPostMd(runId)` and `getBlogPostHtml(runId)` methods (raw fetch, throws on non-OK). Added `blog_post_path` + `blog_post_html_path` to `ContentResponse` interface.
- `frontend/app/pipeline/page.tsx`:
  - Added `Eye`, `XIcon` to lucide-react imports alongside existing `FileText`, `Globe`.
  - Added `showBlogPreview: boolean` state.
  - Stage 3 bottom bar (visible when `contentResult && stages.content.status === "done" && runId`): "BLOG POST" label + violet **Preview** button + zinc **Markdown** download + zinc **HTML** download.
  - Full-screen blog preview modal (`fixed inset-0 z-50`): dark header bar with topic, Eye icon, Markdown/HTML download buttons, ✕ close. Body is `<iframe src="/api/v1/content/{runId}/blog-post.html">` — loads the styled HTML directly from the backend static endpoint.

---

**Output structure (updated):**

```
outputs/<run_id>/
├── research/        ← unchanged
├── angles/          ← unchanged  
├── content/         ← unchanged (carousels)
├── blog_post.md     ← NEW: paste into Medium / Substack / Ghost
└── blog_post.html   ← NEW: paste into Wix / Blogger, or open in browser
```

**Tests:** 44 backend unit tests passing. 30 new assertions covering all generator functions, edge cases (empty evidence, LLM-only mode, img_url fallback, max 4 pull-quotes, citation filtering). 61/61 Playwright E2E tests passing.

**Status:** ✅ Complete — blog post auto-generated after every content run, viewable in-app, downloadable as .md and .html.

---

## 2026-05-30 - Session 25: Research Progress Bar, run_id Pipeline Fix, E2E Test Suite, Stage Timers

**Decision:** Four separate deliverables in one session — research progress polling, critical run_id bug fix, full E2E Playwright coverage for all 5 pages, and live stage timers in the pipeline UI.

---

**Change 1 — Research progress bar (backend + frontend)**

- `backend/core/orchestrators/research/_progress_store.py` (NEW) — Lightweight module-level `_store: dict[str, dict]` with `update(run_id, node, step)`, `get()`, `clear()`, and `NODE_LABELS` dict mapping all 11 node names to human-readable labels ("Searching news & web…", "Synthesising findings…" etc).
- `backend/core/graphs/research_graph.py` — All 9 external nodes wrapped with `_tracked` variants that call `progress.update()` before delegating. Inline nodes (`intake`, `refine`, `finalize`, `finalize_partial`) updated directly. Both finalize paths call `progress.clear()` to prevent memory leak.
- `backend/apps/api/v1/research.py` — Added `GET /research/status/{run_id}` endpoint returning `{pct, label, step, total, node}`.
- `frontend/store/slices/pipelineSlice.ts` — Added `setRunId` reducer so `pendingRunId` can be set before the research API call returns.
- `frontend/components/pipeline/PipelineConfig.tsx` — `pendingRunId = crypto.randomUUID()` generated before `resetPipeline`, dispatched immediately so the poller has the right ID from tick 1.
- `frontend/app/pipeline/page.tsx` — `researchProgress` state, 2s poll `useEffect` (clears on non-running status), thin violet progress bar + node label replacing plain spinner in Stage 1.

**Critical bug fixed during this work:** `pendingRunId` was never sent to the backend — the orchestrator generated its own UUID, so the poll always returned `{"status": "unknown"}`. Fixed by adding `run_id: Optional[str]` to `ResearchRequest` and `run_id = run_id or parsed_request.run_id or str(uuid.uuid4())` in the orchestrator. Frontend passes `run_id: pendingRunId` in the research request body. Also added `run_id?: string` to `ResearchRequestBody` in `api.ts`.

---

**Change 2 — run_id consistency verified across full pipeline**

Traced run_id through all three phases:

- **Research:** `pendingRunId` → `/research/run` → `researchRes.run_id === pendingRunId` → `setResearchResult` overwrites Redux `runId` with same value ✅
- **Angle:** `research.run_id` passed to `/angle/run` → orchestrator uses it → `angleRes.run_id === pendingRunId` ✅
- **Content (auto):** `angle.run_id` used in `/content/run` → same UUID → all outputs in `outputs/{pendingRunId}/` ✅
- **Content (manual HITL, AngleSelector):** `resumedAngle.run_id` from `/angle/{id}/select` response → correct ✅
- **LLM-only mode:** `llmDraftResearch` generates its own UUID (no progress polling needed) → Redux `runId` overwritten by `setResearchResult` → consistent within that run ✅

---

**Change 3 — Full E2E Playwright test suite (5 new spec files, 61 tests total)**

Added `test-results/` and `playwright-report/` to `frontend/.gitignore` — Playwright auto-generates `error-context.md` files in `test-results/` on failure; these are diagnostic artifacts, not code.

| File                                 | Tests | Coverage                                                                                        |
| ------------------------------------ | ----- | ----------------------------------------------------------------------------------------------- |
| `e2e/pipeline-normal-flow.spec.ts` | 12    | Auto mode end-to-end, manual HITL modal, angle regeneration, progress bar polling, error banner |
| `e2e/pipeline-config.spec.ts`      | 8     | Mode/freshness selectors, advanced settings, LLM mode persistence through reset                 |
| `e2e/research-page.spec.ts`        | 5     | Query refinement, results display, error state                                                  |
| `e2e/images-page.spec.ts`          | 5     | Pexels/DDGS search, tag chips, download                                                         |
| `e2e/news-page.spec.ts`            | 5     | Source switching, time filters, results render                                                  |
| `e2e/chat-page.spec.ts`            | 5     | Message send, multi-turn history in request, error reply, clear chat                            |
| `e2e/llm-research-mode.spec.ts`    | 20    | *(existing)* LLM-only research flow                                                           |

All tests mock backend via `page.route()`. Key selector fixes discovered during test runs: research page button is "START RESEARCH" not generic text; images placeholder is "Describe the visual concept…"; news placeholder is "Search global events and signals…"; source button labels are "PEXELS"/"DUCKDUCKGO"/"DDG"; HITL modal confirm button text is "Generate Content for N Angles"; angle text in HITL modal must be scoped inside `[class*='fixed'][class*='inset']` to avoid strict mode violation with stage card backdrop.

---

**Change 4 — Live stage timers in pipeline UI**

- `frontend/app/pipeline/page.tsx`:
  - Added `useStageTimer(status: StageStatus): number | null` hook — starts a 500ms `setInterval` when `status === "running"`, freezes elapsed on done/error, resets to `null` on idle. Uses `useRef` to track start time and interval handle.
  - Added `formatElapsed(seconds: number): string` — formats as `M:SS` (e.g. `0:03`, `1:42`).
  - `StageCard` receives optional `elapsed?: number | null` prop — renders a `font-mono tabular-nums` chip left of the status label: violet `bg-violet-500/10 text-violet-400` while running, zinc `bg-zinc-800 text-zinc-400` when frozen after completion.
  - Three `useStageTimer` calls in `PipelinePage`: `researchElapsed`, `angleElapsed`, `contentElapsed` — each passed to its respective `StageCard`.

Each stage runs its own independent stopwatch. Timer appears only when the stage has been touched (non-null), so idle stages show no timer. After completion the time is permanently visible as a subtle zinc chip — user can always see "research took 0:47, angles took 0:12, content took 1:23".

**Status:** ✅ Complete — 61/61 E2E tests passing, progress bar + timers verified via Playwright screenshots.

---

## 2026-05-24 - Session 24: Branding, JWT Fix, Image Dedup, Angle Re-gen, Progress Bar

**Decision:** Applied branding to carousel slides, fixed JWT expiry auto-recovery, fixed image deduplication across carousels, added angle re-generation feature, removed slide counter from brand bar, and restored the progress bar.

---

**Change 1 — Brand identity on every carousel slide**

- `backend/configs/settings.py` — Added `brand_name: str = "TheOpinionBoard"` and `brand_logo_path: str = "assets/brand/logo.png"` settings. Override via `.env` without code changes.
- `backend/core/orchestrators/content/carousel_generator.py` — Changed `brand_name=""` and `logo_path=""` hardcoded values to read from `_settings`. Logo path prefixed with `/` so the aiohttp render server resolves it from `_BACKEND_ROOT`.
- `backend/core/templates/carousel/aurora/_base.html.j2` + `lumina/_base.html.j2` — Brand bar left side changed from plain `<span>` text to a `<div class="brand-identity">` with a circular 36×36px `<img class="brand-logo">` (guarded by `{% if logo_path %}`) followed by the handle text. Lumina progress bar track fixed from `rgba(255,255,255,0.08)` (invisible on white) to `rgba(0,0,0,0.08)`.
- `frontend/components/pipeline/InstagramPreview.tsx` — Footer text changed from "Produced by Content Studio AI" to "@TheOpinionBoard".

**Change 2 — Slide counter removed, progress bar kept**

- Both `_base.html.j2` files — Removed `N / 12` counter text (`<span class="progress">`) and its `.progress` CSS class from the brand bar. Progress fill bar retained (position + gradient unchanged). Rationale: Instagram provides its own counter; the hardcoded number causes confusion if slides are skipped during posting.

**Change 3 — JWT auto-recovery for LangChain adapter**

- `backend/infra/llm/langchain_adapter.py` — Replaced `@lru_cache()` on `get_langchain_llm()` with a resettable module-level `_cached_client`. Added `reset_langchain_llm()` and `get_langchain_llm_with_retry(call)` — on JWT/401 error, resets cache and retries once with a fresh client. `_is_jwt_error()` detects by checking `"jwt"`, `"expired"`, or `"401"` in the exception message (case-insensitive).
- `backend/apps/api/v1/chat.py` — Switched from `llm = get_langchain_llm(); await llm.ainvoke(...)` to `await get_langchain_llm_with_retry(lambda llm: llm.ainvoke(messages))`.
- `backend/apps/api/v1/tools.py` — Same switch for the DDGS image LLM relevance filter.

**Change 4 — Image deduplication across carousel slides**

- `backend/core/orchestrators/content/image_fetcher.py` — Added `used_urls: set[str]` before the slide loop. Pool size raised 15→20 for all four fetch calls (primary + fallback for both sources). Best image picked with `next((img for img in ranked if download_url not in used_urls), ranked[0])` where `download_url = img.get("src", {}).get("large2x") or img.get("url", "")` — uses the actual CDN download URL (not Pexels page URL) as the dedup key. `used_urls.add(download_url)` runs after the `if not download_url` guard so empty strings never pollute the set.

**Change 5 — Angle re-generation**

- `backend/core/orchestration/contracts.py` — Added `exclude_statements: list[str] = Field(default_factory=list)` to `AngleRequest`.
- `backend/core/prompts/templates/angle_generation.txt` — Added `{exclude_block}` variable at the end of the prompt.
- `backend/core/orchestrators/angle/generator.py` — Builds `exclude_block` string from `request.exclude_statements`: if non-empty, injects a "PREVIOUSLY GENERATED ANGLES (DO NOT REPEAT THESE)" section; empty string if none.
- `backend/apps/api/v1/angle.py` — Added `POST /angle/regenerate` endpoint that calls `_orchestrator.run(request.model_dump())` with the same `AngleRequest` body — no new schema class needed.
- `frontend/lib/api.ts` — Added `regenerateAngles` method; added `exclude_statements?: string[]` to `AngleRequestBody`.
- `frontend/app/pipeline/page.tsx` — Added `handleRegenerateAngles()` function and `regenerating` state. Added "Regenerate Angles" button below the angle list in Stage 2, visible when `stages.angle.status === "done" && stages.content.status === "idle"`. Styled as a zinc secondary button (distinct from the violet primary "Open Angle Selector"). Fixed bug: `isAnyRunning` const definition was accidentally displaced during edit — restored.

**Status:** ✅ Complete — 5 changes, verified via Playwright screenshots.

---

**Decision:** Implemented a post-generation validation pipeline (new LangGraph node) that enforces slide structure, filters irrelevant content, strengthens image/graph quality. Then diagnosed three production bugs from a live run and fixed them.

---

## 2026-05-24 - Session 22: Content Validation Pipeline + Production Bug Fixes

**Decision:** Implemented a post-generation validation pipeline (new LangGraph node) that enforces slide structure, filters irrelevant content, strengthens image/graph quality. Then diagnosed three production bugs from a live run and fixed them.

---

**Change 1 — New `validate_content` node in content graph**

- `backend/core/graphs/content_graph.py` — Added `validate_content_node` between `reorder` and `generate_caption`. Graph order: `generate_slides → reorder → validate_content → generate_caption → fetch_images → render_slides → screenshot_slides → finalize`.
- `backend/core/orchestrators/content/slide_generator.py` — Removed old `_enforce_cta_constraint()` (superseded by new node).

---

**Change 2 — Slide structure enforcement (engage + CTA)**

- `backend/core/orchestrators/content/slide_validator.py` (**NEW**) — `_enforce_cta_count_and_position()` enforces the rule:
  - **≥10 slides**: 1 `engage` slide at midpoint + 1 `cta` at end. Any extra CTAs or engage slides are stripped. If LLM's `engage` already exists it is reused; otherwise `_make_engage_slide()` synthesises one. Same for `cta` via `_make_cta_slide()`.
  - **<10 slides**: 1 `cta` at end only. Any LLM-generated `engage` slides are removed.
  - All slides renumbered 1..N after repositioning.
- **Bug fixed (same-dict alias)**: Previous logic used `ctas[len//2]` for mid which equals `ctas[-1]` when `len==2` → same Python dict object at both positions → renumber loop made both slide_number=N. Fixed by always using `ctas[0]` for mid and `ctas[-1]` for end.
- **Bug fixed (extra visual CTA)**: `engage` type renders identically to `cta` (gradient, centred text, action button). Old logic synthesised a mid-CTA even when an `engage` already existed → 3 CTA-looking slides. New rule makes `engage` the intentional mid-CTA for long decks; separate `cta` type is end-only.

---

**Change 3 — Content relevance validation (LLM batch + single-slide regen)**

- `backend/core/orchestrators/content/slide_validator.py` — `_check_slide_relevance()`: single LLM call over all slides as JSON; returns failing `slide_number`s. CTA slides always exempt. `_regen_single_slide()`: rewrites one failing slide using prev/next context; 1 attempt max, keeps original on failure.
- `backend/core/prompts/templates/slide_relevance_check.txt` (**NEW**) — batch relevance prompt; returns `{"irrelevant": [slide_numbers]}`.
- `backend/core/prompts/templates/slide_regen.txt` (**NEW**) — single-slide regen prompt with prev/current/next context.

---

**Change 4 — Image selection: CJK disqualification + query relevance scoring**

- `backend/core/orchestrators/content/image_fetcher.py` — Added `_has_cjk(text)` (CJK Unified Ideographs, Hiragana+Katakana, Hangul Unicode ranges). Updated `_score_image(img, query="")`: CJK in title or URL → score `-99.0` (disqualified). Query relevance bonus: word-match hits × 1.5, capped at +4.0.

---

**Change 5 — Graph/stat validation strengthening**

- `backend/core/orchestrators/content/graph_validator.py` — `validate_and_fix_slides()` now also: (1) clears `stat_value` to `None` if it contains no digit (`"Many"` → `null`); (2) defaults `stat_label` to `"Key Statistic"` when `stat_value` is set but label is empty; (3) nulls out chart when all labels are single characters (LLM placeholder A/B/C data).

---

**Change 6 — Stat slide empty space fix**

- `backend/core/templates/carousel/aurora/stat.html.j2` + `lumina/stat.html.j2` — Changed `.stat-wrapper` from `justify-content: flex-start` to `{{ 'flex-start' if slide.chart_data else 'center' }}`. Stat slides with no chart were rendering content pinned to the top with the bottom 2/3 empty black. Now centers content vertically when no chart is present.

---

**Tests**

- `backend/tests/test_validation_framework.py` (**NEW**) — 44 unit tests covering all new logic: CJK detection (8), slide structure enforcement (11), async validate_content_node (4), image scoring (9), graph validator (12). All passing in ~0.4s (no LLM calls; async node tests use mocked LLM).

---

**Status:** ✅ Complete — 6 backend changes, 2 new prompt templates, 44 new tests all passing.

---

## 2026-05-22 - Session 21: 4-Feature Sprint (Image Search, Chat, Prev Runs, Carousel UX)

**Decision:** Implemented 4 UX/product improvements based on user feedback, plus 3 follow-up polish fixes on the Recent Runs section and carousel navigation.

---

**Feature 1 — Image search: raw query + entity tags + DDGS multi-query + LLM filter**

- `backend/core/tools/schemas/image_schema.py` — Added `queries: Optional[list[str]]` field to `ImageSearchRequest` for multi-query DDGS.
- `backend/apps/api/v1/tools.py` — Added `POST /tools/images/tags` endpoint: heuristic entity extractor (`_extract_tags()`), groups consecutive title-cased tokens as named entities, no LLM call, instant response. Added `_ddgs_multi_search()`: runs 3 query variants in parallel via `asyncio.gather`, deduplicates by image URL, then runs a single LLM relevance filter (drops results < 0.4 relevance) using inline prompt. Falls back gracefully if LLM filter fails.
- `frontend/lib/api.ts` — Added `fetchImageTags()` method; added optional `queries?: string[]` to `ImageSearchBody`.
- `frontend/app/images/page.tsx` — Removed `api.refineQuery()` entirely (was producing research-optimised long strings like "Indian cricketer Virat Kohli's career…" which broke Pexels/DDGS results). Tags fetch fires concurrently (non-blocking, updates chip strip when ready). Pexels uses raw `query`. DDGS sends `queries: [query, "${query} photo", "${query} ${year}"]`. Removed `ProcessedQuery`, `refining`, `processed` states; removed `Sparkles` AI refinement status bar.

---

**Feature 2 — Chat: metadata-only system prompt**

- `backend/apps/api/v1/chat.py` — Always prepends `get_llm_metadata_block()` as `SystemMessage`; ignores `request.system` field (kept in schema for backward compat). Removed configurable system prompt.
- `frontend/app/chat/page.tsx` — Removed `SYSTEM_PRESETS` array, `system` state, `showSystemEdit` state, preset tab selector UI, and `system` field from `api.chat()` call. Chat is now a clean single-purpose assistant with date/time context injected server-side.

---

**Feature 3 — Previous runs: click to load into stage cards**

- `frontend/store/slices/pipelineSlice.ts` — Added `loadRun` reducer (imports `PipelineRun` from `historySlice`): repopulates `topic`, `runId`, all 3 results, and stage statuses from a saved run. Resets `errors`.
- `frontend/app/pipeline/page.tsx` — Run cards changed from non-interactive `<div>` to `<button>`. Clicking dispatches `loadRun(run)` + calls `setOpenSections` to auto-expand only sections that have saved data. Recent Runs section moved **outside** the `(hasAnyResult || isAnyRunning)` guard so it's always visible on the idle page (shows up to 5 runs). While a pipeline is active, a condensed version (3 runs) remains inside the stage cards area.

---

**Feature 4 — Carousel: horizontal snap + one-at-a-time + nav indicators**

- `frontend/app/pipeline/page.tsx` — Stage 3 carousel changed to horizontal snap scroll (`overflow-x-auto snap-x snap-mandatory`). Each angle's carousel item is `snap-start shrink-0 w-full flex justify-center` — fills full container width so only one carousel is visible at a time. Added navigation bar below track (only when `total > 1`): prev/next chevron buttons (disabled at boundaries), dot indicators (active = violet pill `w-5 h-2`, inactive = grey circle `w-2 h-2`, clickable to jump), and "N / total" counter. Active index tracked via `onScroll → Math.round(scrollLeft / offsetWidth)` stored in `activeCarousel` state with `useRef` on the scroll container.
- `frontend/components/pipeline/InstagramPreview.tsx` — Caption truncated at 125 chars with inline "…more" / "less" toggle. `captionExpanded` state per post. When collapsed shows first 125 chars; expansion wraps vertically (no horizontal growth).

---

**Follow-up polish (same session):**

- `RunCard` component extracted in `pipeline/page.tsx`: shows first 90 chars of topic, then "…more" inline — expansion wraps to multiple lines vertically (no horizontal resize). `e.stopPropagation()` on toggle prevents accidental `loadRun` dispatch. `TOPIC_PREVIEW = 90` (topics ≤ 90 chars show no toggle).
- Carousel `activeCarousel` resets to 0 when a new run is loaded (stage cards re-render).

**Status:** ✅ Complete — all 4 features implemented and verified.

---

## 2026-05-22 - Sessions 18–20: 5-Bug Sprint + Architectural Refactor + Playwright Tests

**Decision:** Fixed 5 product bugs, resolved 6 architectural concerns raised during review, and built a full Playwright test suite (backend curl + 19 frontend tests — all passing).

---

**Bug 1 — Pipeline page: collapsible stage cards, angle re-open, carousel image URL fix**

- `frontend/app/pipeline/page.tsx` — Replaced static layout with 3 collapsible Stage Cards (chevron toggle, `openSections: Set<"research"|"angle"|"content">`). Auto-expands on stage completion via `useEffect` wrapped in `startTransition()` (React 19 requirement — avoids "setState inside effect" lint error). Stage 2 card shows "Open Angle Selector" button when manual mode + angle done + content idle.
- `frontend/components/pipeline/InstagramPreview.tsx` — Fixed `slideImageUrl()`: backend stores absolute system paths (`/Users/.../backend/outputs/...`). Previous code prepended `http://localhost:8000/` to the full path, producing a broken URL. Fix: extract everything from `/outputs/` onwards and prepend the backend base URL.
- Added `showLlmKnowledge` collapsible section in Stage 1 card that renders the LLM background knowledge evidence item (identified by `source_type === "llm_knowledge"`).

---

**Bug 2 — Images page: multi-select + local download**

- `frontend/app/images/page.tsx` — Added `selected: Set<number>` state, per-card checkbox overlay (violet when selected, hidden until hover or in select mode), floating action bar with `AnimatePresence` (count badge, Download, X clear). Selection is NOT auto-cleared on success — clearing it immediately batches with `setDownloadStatus("done")` causing the bar to vanish before "Saved to" is visible (React 18 automatic batching bug found during Playwright testing).
- `backend/core/tools/Image/image_downloader.py` (NEW) — Canonical async download implementation using `httpx`, sanitised filenames, collision avoidance. Resolves `save_dir` from `settings.image_download_path` if empty.
- `backend/core/tools/schemas/image_schema.py` (NEW) — `PexelsPhoto`, `ImageSearchRequest/Response`, `ImageDownloadRequest/Response` extracted here (separation of concerns).
- `backend/apps/api/v1/tools.py` — Thin route handler; delegates to `image_downloader.py`. Schema imports from `core/tools/schemas/`.
- `backend/apps/api/v1/schemas.py` (NEW) — API-level request/response models for query-refine, news.

---

**Bug 3 — Research: LLM per-article scoring, always-on tools, min 2 iterations, LLM background knowledge**

- `backend/core/orchestrators/research/evidence_scorer.py` (NEW) — Single batched LLM call scores up to 25 evidence items at once using `evidence_scoring.txt` prompt. Parses JSON float array, clamps to [0,1], re-sorts all evidence by `relevance_score` descending. Non-fatal on failure.
- `backend/core/orchestrators/research/normalizer.py` — Removed naive word-overlap `_compute_relevance()`; all items get neutral `relevance_score=0.5` as placeholder for the scorer. `credibility_score` still reflects source type (news_api=0.8, crawl=0.7, ddgs=0.6, web=0.4).
- `backend/core/orchestrators/research/llm_knowledge.py` (NEW) — Runs once (skips on `loop_count > 0`). Asks LLM for background knowledge, creates 1 synthetic `Evidence` item with `source_type="llm_knowledge"`, `relevance_score=0.5`. Prompt in `core/prompts/templates/llm_knowledge.txt`.
- `backend/core/orchestration/policies/routing.py` — Always runs all 3 tools (`news_api`, `ddgs_news`, `ddgs_text`) regardless of freshness. Freshness is a signal for the synthesiser, not a tool gate.
- `backend/core/graphs/research_graph.py` — Pipeline order: `intake → route → llm_knowledge → execute_tools → normalize → score_evidence → synthesize → evaluate`. Min 2 iterations: `should_continue_after_evaluation` returns `"refine"` when `loop_count == 0`.
- `backend/core/orchestrators/research/evaluator.py` — Coverage denominator 8→15, diversity denominator 4→8 (harder to saturate with 3 always-on tools). Weights rebalanced to `llm_score × 0.50 + source_score × 0.50`.
- `backend/configs/settings.py` — `research_quality_min_confidence` raised 0.60→0.72; `image_download_path` added.

---

**Bug 4 — CTA slides: enforce exactly 2**

- `backend/core/orchestrators/content/slide_generator.py` — `_enforce_cta_constraint()` post-processor: if LLM outputs >2 CTAs, keeps the middle-range CTA and the final CTA, discards the rest.
- `backend/core/prompts/templates/slide_generation.txt` — Rule 3 strengthened: "Outputting more than 2 CTA slides will invalidate the entire response."

---

**Bug 5 — Datetime: remove hardcoded banner, create metadata helper**

- `backend/core/tools/metadata_helper.py` (NEW) — `get_llm_metadata_block()` returns a `=== CONTEXT METADATA ===` block with UTC date, time, day-of-week, quarter. Called at request time (not import time).
- `backend/core/prompts/system_prompts.py` — Removed `_date_banner()` and its `from datetime import date` import. `get_system_prompt()` now prepends `get_llm_metadata_block()` instead.
- Dead MCP servers deleted: `datetime_server.py` (replaced by metadata_helper) and `image_downloader_server.py` (replaced by image_downloader.py service) — both were dead code with no callers in the DAG pipeline.

---

**Architectural refactors (Session 19 review):**

- `backend/apps/api/v1/tools.py` — All inline schema classes and business logic removed. Handlers are now thin: validate → delegate → respond (≤5 lines each).
- `backend/core/prompts/templates/llm_knowledge.txt` (NEW) — Moved inline `_PROMPT` string out of `llm_knowledge.py`.
- `backend/core/prompts/templates/evidence_scoring.txt` (NEW) — Batch scoring prompt with 6-point anchor scale.
- `backend/configs/settings.py` — `research_allowed_tools` remains as a tool-executor gate; `llm_knowledge` is a graph node (not a tool), so it doesn't belong there.

---

**Playwright test suite (`backend/tests/test_frontend.py`) — 19/19 passing:**

- Added `pytest`, `pytest-timeout`, `pytest-asyncio` to `pyproject.toml` dependencies.
- `page_with_mock` fixture: intercepts `**/tools/query-refine` and returns instantly — avoids ~10s LLM call per test and HAI proxy rate-limiting mid-suite. One real E2E test (`test_full_e2e_with_real_refine`) exercises the actual LLM path.
- Uses `document.body.textContent` (not `innerText`) for news result detection — the "Intel: N Articles" `<h3>` has CSS `text-transform: uppercase`, so `innerText` returns "INTEL:" but `textContent` returns the DOM string "Intel:" correctly.
- 3 bug fixes discovered during testing: (1) download auto-clear batching (see Bug 2 above), (2) news source tab labelled "DDG" not "DuckDuckGo", (3) pipeline page "Topic" selector ambiguous — use exact "Target Topic".

**Status:** ✅ Complete — 19 Playwright tests passing, all 8 backend API endpoints verified via curl.

---

## 2026-05-22 - Session 17: Frontend Modular Redesign (Redux + Framer Motion + Premium UI)

**Decision:** Refactored the monolithic frontend into a modular, premium-grade SPA using Redux Toolkit for persistent state management and Framer Motion for high-fidelity animations.

**Why:**

- Monolithic page structure was unmaintainable and caused state loss on navigation.
- Needed a "premium" feel to match the sophisticated multi-agent backend.
- Global state was required to track pipeline progress, chat history, and research data across the application.

**Key Implementation:**

1. **Redux Toolkit Architecture**:
   - `pipelineSlice`: Tracks active production runs, research results, and stage statuses.
   - `chatSlice`: Manages persistent AI assistant conversations.
   - `historySlice`: Persists completed runs to `localStorage` for cross-session recovery.
2. **Modular Component System**:
   - Broke down `pipeline/page.tsx` into independent, reactive components: `PipelineProgress`, `AngleSelector` (HITL Modal), `InstagramPreview`, `ResearchSummary`, and `PipelineConfig`.
   - Created `PremiumCard` and `Modal` UI primitives with glassmorphism and motion presets.
3. **High-Fidelity UI overhaul**:
   - Integrated **Framer Motion** for stage transitions and interactive states.
   - Modernized all application pages (**Pipeline**, **Research**, **Images**, **News**, **Chat**) with a unified "Studio AI" aesthetic.
   - Updated `Sidebar` with active-state layout animations.
4. **State Persistence**:
   - Redux state ensures that production progress is not lost when switching between research, chat, and pipeline views.

**Impact:** Dramatically improved UX, eliminated data loss during navigation, and established a scalable frontend architecture for future agentic features.

**Status:** ✅ Complete

---

## 2026-05-15 - Session 16: LLM Research Evaluator + Refinement Loop Hardening

**Decision:** Three layered improvements to the research quality pipeline — independent LLM judge, weight rebalance, and proper evidence accumulation across refinement iterations.

---

**1. Independent LLM content judge (`evaluator.py`, `contracts.py`, `content_evaluation.txt`)**

- New `LLMEvaluationOutput` Pydantic model: `factual_grounding`, `topic_relevance`, `specificity`, `coverage_breadth`, `overall_score`, `reasoning` (all 0–1 floats).
- `_run_llm_judge()` calls a separate LLM structured output with the raw evidence snippets — crucially, it reads evidence directly rather than trusting the synthesizer's self-report, catching cases where the LLM hallucinated beyond its sources.
- Prompt `content_evaluation.txt` instructs the judge to score only based on traceable evidence, penalise vague generalities, and write a 2-3 sentence reasoning citing specific claims.
- `EvaluationResult` extended with `llm_content_score`, `source_score`, `combined_confidence` fields.

---

**2. Weight rebalance and threshold raise (`evaluator.py`, `settings.py`)**

- New formula: `combined = llm_score × 0.35 + source_score × 0.65` (sources weighted higher — more objective than self-graded LLM).
- Pass threshold raised: `research_quality_min_confidence = 0.60` (was 0.50).
- If `combined_confidence < 0.60` and budget allows → `should_refine=True` → research loop retries.
- Graceful fallback: if LLM judge call fails, defaults to neutral 0.5 so the pipeline never hard-crashes on evaluator errors.

---

**3. Evidence accumulation + per-iteration file persistence (`normalizer.py`, `research_graph.py`, `orchestrator.py`, `workflow_state.py`)**

- `normalizer.py` now pre-seeds `seen_urls` from `state.get("evidence", [])` and starts the result list from existing evidence — each refinement iteration **adds** new sources instead of replacing them.
- `ResearchGraphState` gets a new `iteration_history: list[dict]` field.
- `refine_node` now records completed iteration (synthesis dump, evaluation dump, evidence count, timestamp) into `iteration_history`, then calls `save_iteration_snapshot()` to flush `evidence.json` + `research_result.json` to disk before looping back.
- `save_iteration_snapshot()` — new helper in orchestrator.py; writes mid-loop snapshots without touching `synthesis.md`.
- `save_research_output()` — extended with `iteration_history` param, writes `iterations[]` array, `total_iterations`, `best_iteration` into `research_result.json`.
- `_pick_best_iteration()` — helper that selects the synthesis + evaluation with highest `combined_confidence` across all iterations (including the final one); used both for `synthesis.md` and `ResearchResponse.synthesis`.
- `ResearchOrchestrator.run()` now returns the best synthesis (not just the last) so downstream angle/content nodes always get the highest-quality research regardless of how many loops ran.

**New `research_result.json` structure:**

```json
{
  "total_iterations": 2,
  "best_iteration": 2,
  "synthesis": { ...best synthesis... },
  "evaluation": { ...best evaluation... },
  "iterations": [
    { "iteration": 1, "synthesis": {...}, "evaluation": {"combined_confidence": 0.45}, "evidence_count": 15, "timestamp": "..." },
    { "iteration": 2, "synthesis": {...}, "evaluation": {"combined_confidence": 0.72}, "evidence_count": 30, "timestamp": "..." }
  ]
}
```

---

**E2E tests run:**

- `"Agentic AI agents in enterprise software"` — combined_confidence=0.9545 (LLM=0.87×0.35 + sources=1.0×0.65), passed in 1 iteration, full pipeline ✅
- `"How SAP is betting on AI agents to transform enterprise ERP in 2026"` — combined_confidence=0.902 (LLM=0.72×0.35 + sources=1.0×0.65), research summary cited Sapphire 2026 correctly, 3 angles × 12 slides each ✅

---

## 2026-05-15 - Session 15: Image Intelligence, No-Skeleton Layout, Graph Validator & Date Awareness

**Decision:** Four improvements to output quality based on live review of carousel output.

---

**1. Smarter per-slide image source selection (`image_fetcher.py`)**

- Removed entity-substring heuristic (`_is_entity_query`) from `_resolve_preferred_source()`.
- New logic: in `auto` mode, if the LLM's `image_query_ddgs` differs from `image_query`, prefer DDGS (the LLM already signalled this slide needs a real web image). If identical, prefer Pexels.
- Signature change: `_resolve_preferred_source(generic_query, specific_query, image_source)` — `entities` arg dropped entirely.
- Result: entity/news slides get DDGS (real faces, protest photos, news screenshots); abstract concept slides get Pexels (high quality stock). Works per-slide, not per-topic.

---

**2. Dual image queries in slide generation (`slide_generation.txt`, `contracts.py`)**

- `Slide` schema extended: added `image_query_ddgs` (entity-specific journalist query) alongside existing `image_query` (generic stock query).
- Prompt Rule 8 updated: all non-cta/non-engage slides must provide BOTH fields. `image_query` = 3-5 abstract words for Pexels; `image_query_ddgs` = specific person/place/date/event for DDGS web search ("what would a photo editor type to find a news photo for this exact slide?").
- `fetch_images_node` routes each slide independently: uses `image_query_ddgs` when source is DDGS, `image_query` when source is Pexels.

---

**3. No-skeleton text-only layout for colour slides (`carousel_generator.py`, content templates)**

- `carousel_generator.py` now computes `has_image = bool(image_path) and asset["source"] != "colour"` and passes it to every template render call.
- `aurora/content.html.j2` and `lumina/content.html.j2`: when `not has_image`, a dedicated CSS block activates — `.slide-grid` goes full-width column layout with padding `44px 60px`, `.text-panel` fills all space, fonts bump up (title 48px, body 23px, bullet-text 20px). No `.image-panel` rendered at all.
- Eliminated the deco-circles "skeleton" placeholder entirely — slides with no valid image now look like intentional text-focus slides, not broken placeholders.

---

**4. Graph validator (`graph_validator.py`, `slide_generator.py`)**

- New file: `core/orchestrators/content/graph_validator.py` — `validate_and_fix_slides(slides)` iterates stat slides and nulls out `chart_type`/`chart_data` when the chart is invalid.
- Validation checks: chart_data exists + is dict, labels/values present, lengths match, ≥2 data points, values are numeric, not all-identical (flat), year-as-absolute-value pattern (bar/column/donut with all values 1800–2100), radar `datasets` structure matches labels length.
- Stat template already guards on `{% if slide.chart_data %}` — nulling it produces a clean stat-value-only slide with no chart, no crash.
- Called in `slide_generator.py` immediately after `result.slides` is returned by the LLM, before any truncation or state update.

---

**5. Date awareness in all LLM calls (`system_prompts.py`, `query_preprocessor.py`)**

- `_date_banner()` function added to `system_prompts.py` — returns today's date in both human (`15 May 2026`) and ISO (`2026-05-15`) formats with instructions: "treat anything before today as historical, anything after today as future/planned."
- `get_system_prompt()` now prepends `_date_banner()` to every system prompt at call time (not import time) — covers all four agents: RESEARCH, ANGLE, CONTENT, VISUAL.
- `query_preprocessor.py` + `query_preprocessing.txt`: `{current_date}` injected into the preprocessor template, with explicit freshness calibration ("breaking = last 48h from today").
- Validated in E2E test: research summary for "Agentic AI 2025" correctly said "by early 2026", "end of 2025" — no more temporal confusion.

---

**E2E tests run:**

- `"Dirty politics of DMK in Tamil Nadu — Karunanidhi → Stalin → Udhayanidhi"` — 3 angles, 12 slides each, DDGS images (Udhayanidhi, Stalin, protest photos), no skeleton slides ✅
- `"Rise of Agentic AI in 2025 — autonomous agents replacing knowledge workers"` — research `status=success` in 1 loop (confidence 0.62), date-aware key points, correct arc ✅

---

## 2026-05-14 - Session 14: Carousel Layout Fixes + Arc & CTA Improvements

**Decision:** Fixed three visual/structural issues in the carousel output identified from live pipeline review.

**What was done:**

**Layout fixes:**

- Split the shared `{% else %}` CSS block for layouts 1 & 2 into separate `{% elif layout_variant == 1 %}` and `{% else %}` blocks in both `aurora/content.html.j2` and `lumina/content.html.j2`, giving independent padding control per layout
- **Layout 1 (text top, image bottom):** Changed `text-panel` from `flex: 0 0 55%; justify-content: center` → `flex: 0 0 auto; justify-content: flex-start` (eliminates the blank gap below short text content). Changed `image-card` from `aspect-ratio: 16/7` → `flex: 1` so the image fills all remaining height — no dead space
- **Layout 2 (image top, text bottom):** Added `padding: 28px 36px 8px` to `image-panel` — image was flush to the slide top edge (0px gap); now has a proper 28px visual inset. Text panel uses `padding: 20px 56px 28px` anchored via `justify-content: flex-start`
- Both themes (aurora + lumina) updated identically

**Arc ordering & CTA distribution:**

- `reorder.py` updated to new arc: `hook → content[:1] → stats[:2] → engage → early_ctas → stats[2:] → body_contents → quotes → final_cta`
- Ensures one content slide lands after the hook before any stats (gives context before data)
- `ctas[:-1]` placed after engage (mid-carousel ~position 6), `ctas[-1:]` always closes
- `slide_generation.txt` updated with explicit 2-CTA rule, updated slot distribution, and "NO EXCEPTIONS — output is invalid with 1 CTA" enforcement

**Bug fixes:**

- Fixed Jinja2 funnel chart access: `fdata.values` resolved to `dict.values()` method (getattr wins over getitem); changed to `fdata['values']` and `fdata['labels']` throughout `aurora/stat.html.j2` and `lumina/stat.html.j2`
- Fixed double-dash attribution in quote slides: strip leading `—`/`–`/`-` from `slide.body` before prepending `— ` in both quote templates

---

## 2026-05-14 - Session 13: Content Orchestrator — Full Pipeline Build (A-Z)

**Decision:** Built the complete content generation pipeline from slide data to final PNG carousels.

**What was done:**

**Orchestrators built (`core/orchestrators/content/`):**

- `slide_generator.py` — LLM-driven slide generation from angle + research; outputs structured `Slide` objects (hook/content/stat/quote/engage/cta types with chart data)
- `reorder.py` — Enforces carousel arc ordering (hook → stats → engage → content → quote → cta)
- `image_fetcher.py` — Parallel image fetching from Pexels API + Bing fallback per slide; downloads and caches to `images/` dir
- `carousel_generator.py` — Jinja2 HTML rendering per slide type + Playwright headless Chromium screenshotting at 2× DPI then downscaled to 1080×1080 PNG
- `caption_generator.py` — LLM-generated Instagram/LinkedIn caption per angle
- `finalizer.py` — Assembles output manifest JSON per angle
- `render_server.py` — Ephemeral aiohttp static server for serving local assets (fonts, Chart.js, images) to Playwright during screenshot

**Templates built (`core/templates/carousel/`):**

- Two themes: `aurora` (dark, high-contrast) and `lumina` (light, clean)
- Theme selected via `_TEMPLATE_MAP` keyed on `emotional_hook`: aurora for Anger/Fear/Urgency/Controversy/Surprise; lumina for Hope/Inspiration/Curiosity
- Slide types per theme: `_base.html.j2`, `hook.html.j2`, `content.html.j2`, `stat.html.j2`, `quote.html.j2`, `engage.html.j2`, `cta.html.j2`
- `content.html.j2`: 3 layout variants (0=left-text/right-portrait-image, 1=text-top/image-bottom, 2=image-top/text-bottom) cycled via `content_idx % 3`
- `stat.html.j2`: 6 chart types via Chart.js (bar, column, donut, line, radar, funnel) all rendered client-side; funnel uses pure CSS/HTML
- Assets: Plus Jakarta Sans (Regular/SemiBold/Bold) + Syne Bold fonts as woff2; Chart.js bundled locally (no CDN dependency)

**Key technical decisions:**

- Playwright screenshots at `device_scale_factor=2` (2160px) then Pillow LANCZOS downscale to 1080px — crisp text at final resolution
- `document.fonts.ready` await + 300ms buffer before screenshot (Chart.js canvas flush)
- `layout_variant` counter only increments for `content` slides; other types always get `layout_variant=0` (unused by their templates)
- `slide_generation.txt` prompt template enforces strict type rules: EXACTLY 2 CTAs, exactly 1 engage, max 3 stats, min 4 content slides, all chart labels ≤25 chars

---

## 2026-05-01 - Session 11–12: Angle Orchestrator + Pipeline API

**Decision:** Built the angle generation pipeline and wired the full CLI pipeline end-to-end.

**What was done:**

**Angle orchestrator (`core/orchestrators/angle/`):**

- `generator.py` — LLM generates 3–5 candidate angles from research summary; each angle has `statement`, `emotional_hook`, `supporting_evidence`, `target_emotion`
- `evaluator.py` — Scores each angle on specificity, emotional resonance, uniqueness, and research grounding (0–10 each)
- `auto_selector.py` — In `auto` mode, picks top 3 angles by score; in `manual` mode, prints angles and waits for CLI input
- `finalizer.py` — Assembles final angle list, saves `angles.json` to run output dir
- `human_approval.py` — Async human-in-the-loop pause for manual mode

**Graph wiring (`core/graphs/angle_graph.py`):**

- LangGraph `StateGraph`: generate → evaluate → select (auto/manual branch) → finalize

**Pipeline API (`apps/api/v1/pipeline.py`):**

- `POST /api/v1/pipeline/run` — Accepts topic + mode, runs full research → angle → content pipeline, returns run_id
- `GET /api/v1/pipeline/status/{run_id}` — Status polling endpoint
- Wired into `main.py` FastAPI app alongside existing research/angle routers

**CLI (`apps/cli/run_workflow.py`):**

- Refactored to sequential stage runner: research → angle → content
- `--mode {quick,standard,deep}` controls research depth
- `--angle-mode {auto,manual}` controls angle selection
- Structured stage logging with `pipeline_stage_started` / `pipeline_stage_completed` events

---

## ~~V2 Planned Improvements (Research Orchestrator)~~ — Completed in Session 16

~~These are known design limitations in V1 that are intentionally deferred:~~

1. ~~**Evidence accumulation across refinement loops**~~ ✅ Done — normalizer now accumulates across loops; `iteration_history` tracks each pass; per-iteration snapshots written to disk.
2. ~~**LLM-driven confidence scoring**~~ ✅ Done — independent LLM judge reads raw evidence and scores factual_grounding/topic_relevance/specificity/coverage_breadth; combined with source score (35/65 weighting).

---

## 2026-05-01 - Sessions 7–10: Research Orchestrator — Build, Wire & Multi-Round Bug Fix

**Decision:** Built and stabilised the full research orchestrator pipeline end-to-end.

**What was done:**

**Build phase (Sessions 7–8):**

- Implemented the full LangGraph `ResearchGraph` with 9 nodes: intake → route → execute_tools → normalize → synthesize → evaluate → refine / finalize / finalize_partial
- Built the `DeterministicResearchRoutingPolicy` that selects tools based on freshness, explicit URLs, and claim-verification needs
- Built the executor node that runs DDGS text/news, NewsAPI + GoogleNewsAPI (merged), and Crawl4AI with budget enforcement
- Built the normalizer that maps all tool outputs into a unified `Evidence` schema with deduplication
- Built the evaluator that quality-gates on source count and synthesis confidence, driving the refine/finalize branch
- Added `ResearchOrchestrator` to compile and invoke the graph with MemorySaver checkpointing
- Wired `research_node` as the LangGraph entry point for the broader `ContentWorkflowState`
- Rewrote `run_workflow.py` as a `ContentPipelineOrchestrator` manager — structured to connect all future orchestrators (angle, image, content, post design) in sequence via `ContentWorkflowState`; uses logger throughout, no print statements
- Added FastAPI `main.py` and `apps/api/v1/research.py` router with `/api/v1/research/run` and `/health` endpoints

**Bug fix rounds (Sessions 9–10) — critical fixes:**

- **structlog wiring** — `infra/logging.py` was returning a standard `logging.Logger` but the entire codebase used the structlog keyword-arg API; rewired to configure and return `structlog.BoundLogger` (would have crashed on every log call)
- **DDGS async** — all three DDGS calls were blocking the event loop; wrapped in `asyncio.to_thread(lambda: list(...))`
- **Timezone-naive datetimes** — fixed `datetime.now()` / `datetime.utcnow` calls across `news_api.py`, `crawl4ai_scraper_schema.py`, and `contracts.py`
- **`source_name` fallback** — added `_domain_from_url()` helper so `NewsArticle.source_name` (required field) always has a value
- **`published_at` fallback** — `NewsAPI._parse_article()` defaulted `published_at=None` which Pydantic rejects; fixed to `datetime.now(timezone.utc)`
- **Settings integration** — wired `newsapi_api_key`, `research_*` settings throughout; removed ad-hoc `os.getenv`/`load_dotenv` calls
- **Routing operator precedence** — hybrid rationale list concatenation silently dropped base rationale due to missing parentheses
- **Output directory path** — `Path(__file__).parents[4]` pointed to project root instead of `backend/`; fixed to `parents[3]`
- **`print()` in ClaudeLLM** — replaced with `logger.info()`
- **8 missing `__init__.py` files** — created for all tool, infra, and app packages
- **Typos in log event names** — `"resarch_node_start"` and `"retrived_at"` corrected

**Status:** ✅ Research orchestrator complete and stable — ready for integration testing

---

## 2026-04-10 - Session 6: DDGS Search Tool - Bug Fixes

**Decision:** Fixed schema and test issues in DDGS search tool implementation.

**Why:**

- Schema had duplicate `timelimit` field causing validation errors
- `VideoResult` had syntax error (used `def` instead of `class`)
- Test was using invalid backend ("bing" for text search)
- Google backend fails due to anti-scraping measures (DDGS library limitation)

**Key Fixes:**

1. Removed duplicate `timelimit` field from `DDGSSearchInput` schema
2. Fixed `VideoResult` class declaration syntax
3. Updated test to use valid backends: duckduckgo, google, brave
4. Documented Google backend limitation (not a bug, expected behavior)

**Test Results:**

- ✅ Text search: 10 results (auto backend)
- ✅ News search: 5 results
- ✅ Image search: 5 results
- ✅ DuckDuckGo backend: working
- ✅ Brave backend: working
- ⚠️ Google backend: "No results found" (anti-scraping, use `auto` instead)

**Key Decision:** Leave Google backend as-is - it's a DDGS library limitation with Google's anti-scraping measures. Users should use `auto` backend (default) which works perfectly by trying multiple engines.

**Status:** ✅ Complete (DDGS search tool fully functional)

---

## 2026-04-06 - Session 5: Crawl4AI Web Scraper Implementation

**Decision:** Implemented Crawl4AI scraper as the first general web scraping tool to complement Google News API.

**Why:**

- Need ability to scrape full content from arbitrary URLs (not just news)
- Crawl4AI provides LLM-optimized markdown output
- Free, no API keys, handles JavaScript rendering
- First step toward multi-source research capability

**Implementation:**

```
backend/core/tools/
├── Crawl4ai/
│   └── crawl4ai_scraper.py         # Main scraper tool
└── schemas/
    └── crawl4ai_scraper_schema.py  # Pydantic models
```

**Key Technical Challenges Solved:**

1. **Schema Mismatch with Crawl4AI Output**

   - Problem: Crawl4AI returns nested dicts, not simple lists
     - `links: {'internal': [...], 'external': [...]}`
     - `media: {'images': [...], 'videos': [...], 'audios': [...]}`
     - `markdown: {'raw_markdown', 'fit_markdown', ...}`
   - Solution: Created structured models (`LinkInfo`, `ImageInfo`) and helper methods
     - `_extract_links()` - Parses nested link structure into separate internal/external lists
     - `_extract_images()` - Extracts image data with metadata
     - `_extract_markdown()` - Selects best markdown format (fit_markdown > raw_markdown)
2. **Result Container Handling**

   - Problem: Crawl4AI returns `CrawlResultContainer` (iterable), not plain list
   - Solution: Check if result is iterable, extract first item

   ```python
   if hasattr(result, '__iter__') and not isinstance(result, str):
       page_result = list(result)[0]
   ```
3. **Output Optimization**

   - Limited links (50 per type) and images (30) to prevent overwhelming output
   - Optional HTML inclusion (off by default to reduce size)
   - Structured metadata extraction from Crawl4AI response

**Code Structure Pattern:**

```python
class Crawl4AIScraper(BaseTool):
    def __init__(self, verbose: bool = False)
    def _error_output(message: str) → Output
    def _extract_links(links_dict) → (internal, external)  # Helper
    def _extract_images(media_dict) → List[ImageInfo]      # Helper
    def _extract_markdown(markdown_dict) → str             # Helper
    async def execute(...) → Crawl4AIScraperOutput        # Main
```

**Libraries Used:**

- `crawl4ai` (v0.8.6) - Web scraping with JS rendering
- `pydantic` - Input/output validation

**Performance:**

- Simple page (example.com): ~2.4s
- Complex page (wikipedia.org): ~1.6s, 20K chars markdown, 70 links

**Status:** ✅ Complete (Crawl4AI working, tested with multiple URLs)

**Next:** SearXNG search tool to find URLs, then combine both in research orchestrator

**Docs Created:**

- `Docs/WEB_SEARCH_TOOLS_IMPLEMENTATION.md` - Full implementation guide
- `Docs/QUICK_REFERENCE_CHEATSHEET.md` - Quick reference patterns
- `Docs/ARCHITECTURE_VISUAL_GUIDE.md` - Visual architecture diagrams

---

## 2026-04-05 - Session 4: Google News API + Full Article Extraction

**Decision:** Implemented Google News RSS tool with full article content extraction via sequential processing.

**Why:**

- Free unlimited alternative to NewsAPI (no rate limits)
- Need full article content, not just summaries
- Google News redirect URLs required special handling

**Implementation:**

```
backend/core/tools/News/
└── news_api.py
    ├── GoogleNewsAPI class         # google-news-api library integration
    ├── fetch_article_content()     # trafilatura for content extraction
    └── Sequential processing       # Reliable, no connection pool issues
```

**Key Technical Decisions:**

1. **Sequential Processing (not parallel)**

   - Problem: trafilatura's urllib3 pool exhaustion with concurrent requests
   - Solution: Process articles one-by-one (20-30s for 10 articles)
   - Rationale: Reliability > Speed for research tools
2. **Google News URL Decoding**

   - Problem: Google wraps article URLs in redirects
   - Solution: Use `client.decode_url()` from google-news-api library
   - Benefit: Handles complex redirect chains automatically
3. **Full Content Extraction Pipeline**

   ```python
   Google News URL
     → Decode to real article URL (client.decode_url)
     → Fetch full content (trafilatura)
     → Fallback to summary if fetch fails
   ```
4. **Clean HTML Summaries**

   - Regex-based HTML tag removal (simple, fast)
   - No beautifulsoup overhead for summaries

**Libraries Used:**

- `google-news-api` - RSS feed parsing + URL decoding
- `trafilatura` - Article content extraction (modern, maintained)
- `beautifulsoup4` - Installed but not needed (URL decoding handled by library)

**Architecture Pattern:**

```python
# Sequential processing with progress tracking
for idx, article in enumerate(articles):
    logger.info(f"[{idx}/{total}] Processing: {title}...")
    real_url = await client.decode_url(google_news_url)
    content = await fetch_article_content(real_url)
```

**Benefits:**

- ✅ Free unlimited news access
- ✅ Full article content (not just summaries)
- ✅ Clean descriptions (HTML stripped)
- ✅ No connection pool warnings
- ✅ Predictable, reliable behavior

**Status:** ✅ Complete (Google News API working with full content)

**Docs:** `Docs/GOOGLE_NEWS_API_IMPLEMENTATION.md`

---

## 2026-04-04 - Session 3: NewsAPI Tool Implementation (Phase 1)

**Decision:** Implemented first research tool (NewsAPI) with async architecture, Pydantic validation.

**Why:**

- Avoid full dependency on Tavily (paid service)
- Need multiple data sources for research orchestrator
- Test individual tools before building orchestrator layer

**Implementation:**

```
backend/core/tools/
├── base.py                    # BaseTool abstract class
├── News/
│   ├── news_api.py           # Async NewsAPI implementation
│   └── schema.py             # Pydantic input/output models
└── schemas/
    └── news_api_schema.py    # NewsAPISearchInput/Output, NewsArticle
```

**Key Patterns:**

- ✅ Async execution with `asyncio.to_thread()` for blocking I/O
- ✅ Pydantic validation for input/output
- ✅ Structured error handling (never crashes, returns success/error)
- ✅ Individual parameters (not dict) for better IDE support
- ✅ Convenience functions for common use cases

**Architecture Decisions:**

- Reddit will use **LLM-powered dynamic subreddit generation** (not hardcoded)
- Custom web scraping tools as Tavily alternatives
- **Research Orchestrator Agent** to manage tool selection, retries, quality checks

**Next:** Reddit tool with dynamic topic mapping, then custom web scrapers, then orchestrator

**Status:** ✅ Complete (NewsAPI working, tested)

**Docs:** `Docs/NEWS_API_IMPLEMENTATION_GUIDE.md`

---

## 2026-04-03 - Session 2: Hybrid Research Architecture (Tools + LLM)

**Decision:** Use real data sources (APIs/scraping) + LLM synthesis instead of LLM-only research.

**Why:**

- LLM-only research = hallucinations, outdated info, no sources
- Production needs: real data, verifiable URLs, recent information
- User insight: "Research should use web search, scraper, news APIs"

**Architecture:**

```
Research Node = Tools (gather data) + LLM (synthesize insights)

Tools (parallel):
├── Tavily Search → Web results (5 sources)
├── Reddit Scraper → Community discussions (5 posts + comments)
└── NewsAPI → Recent articles (10 articles)
  ↓
LLM Synthesis → Extract insights, contradictions, patterns
  ↓
Output: Structured research with real sources
```

**Tools Selected:**

- **Tavily API** (web search, $1/1000, designed for AI)
- **PRAW** (Reddit API, free, unlimited)
- **NewsAPI** (news, 100/day free)

**Key Pattern:**

```python
# Gather real data
web, reddit, news = await asyncio.gather(
    search_web(topic),
    search_reddit(topic),
    search_news(topic)
)

# LLM synthesizes
research = await llm.generate_structured(
    prompt=f"Analyze: {web} {reddit} {news}",
    output_schema=ResearchOutput
)
```

**Benefits:**

- ✅ No hallucinations (real data)
- ✅ Verifiable sources (URLs included)
- ✅ Recent information (not training cutoff)
- ✅ Multiple perspectives (web + community + news)

**Cost:** Free tier sufficient for development (~30 content pieces/day)

**Status:** ✅ Complete (guide written)

**Docs:** `Docs/RESEARCH_TOOLS_GUIDE.md`

---

## 2026-04-03 - Session 2: REVISED Architecture with Prompt Management

**Decision:** Redesigned agent system based on initial plan + centralized prompt management.

**Why:**

- Initial guide missed prompt management (hard to iterate on voice/style)
- Needed alignment with original plan (strong POV content system)
- Prompts in code = hard to version/test/collaborate

**New Architecture:**

```
core/
├── prompts/           # ⭐ NEW - Centralized prompt management
│   ├── system_prompts.py    # Defines voice/style per agent
│   ├── prompt_loader.py     # Load from files or code
│   └── templates/*.txt      # Editable prompt templates
├── nodes/             # LangGraph nodes (use prompts)
├── graphs/            # Workflow orchestration
└── schemas/           # State management
```

**Key Pattern:**

```python
# Separate voice (system) from task (user)
system_prompt = get_system_prompt("angle")  # Defines style
user_prompt = format_prompt(template, topic=x, research=y)  # Task
result = llm.generate(user_prompt, system_prompt=system_prompt)
```

**Benefits:**

- ✅ Easy prompt iteration (change file, not code)
- ✅ Version control prompts (track what works)
- ✅ A/B testing (swap prompts, measure quality)
- ✅ Non-coders can edit .txt files

**Critical Insight from Plan:**

- Angle Agent = CRITICAL node (quality decided here)
- System prompts encode "strong, opinionated" voice
- Workflow: Research → Angle → Approval → Content → Visual

**Status:** ✅ Complete (revised guide written)

**Docs:** `Docs/REVISED_IMPLEMENTATION_GUIDE.md`

---

## 2026-04-03 - Session 2: LangGraph Architecture Decision

**Decision:** Use LangGraph primitives instead of custom BaseAgent class.

**Why:**

- LangGraph already provides state management and orchestration
- Simple node functions > complex class hierarchies
- FastMCP provides tool abstractions
- Don't reinvent what frameworks already do well

**Architecture:**

```
nodes/ → Simple async functions (not classes)
graphs/ → StateGraph definitions (LangGraph)
schemas/ → TypedDict for state, Pydantic for data
tools/ → FastMCP tools (optional)
```

**Key Pattern:**

```python
# Node = simple function
async def research_node(state: WorkflowState) -> dict:
    return {"research_data": result}

# Graph = wire nodes together
graph.add_node("research", research_node)
```

**Impact:**

- Less code to maintain (no BaseAgent boilerplate)
- Better error handling (framework built-in)
- Easier testing (pure functions)
- Built-in features (checkpointing, visualization)

**Status:** ✅ Complete (guide written)

**Docs:** `Docs/IMPLEMENTATION_GUIDE.md`

---

## 2026-04-03 - Session 2: Multi-Provider LLM Support

**Decision:** Made LLM infrastructure provider-agnostic (Claude, OpenAI, Gemini).

**Why:**

- Original `langchain_adapter.py` was Claude-only
- Need flexibility to switch providers without code changes
- Future-proof for testing different models

**Implementation:**

- Updated `Settings` to support multiple providers (API keys for all three)
- Refactored `langchain_adapter.py` with provider factory functions
- Created `.env.example` documenting all providers
- Added `infra/llm/README.md` with usage guide

**Key Pattern:**

```python
# Auto-selects provider from LLM_PROVIDER env var
llm = get_langchain_llm()

# Or override dynamically
llm = create_langchain_llm(provider="openai", model="gpt-4")
```

**Impact:**

- Switch providers by changing `.env` (no code changes)
- Both custom client and LangChain adapter support all providers
- Easy to add new providers (Azure OpenAI, Ollama, etc.)

**Status:** ✅ Complete

---

## 2026-04-03 - Session 2: Singleton Pattern + LangChain Integration

**Decision:** Implemented singleton pattern for LLM clients and added LangChain adapter.

**Why:**

- Creating new HTTP client on every call wastes resources
- Need LangChain for LangGraph workflows
- Keep custom client for simple, fast calls

**Implementation:**

- `LLMFactory.get_client()` → Singleton with async lock (thread-safe)
- `get_langchain_llm()` → LangChain client cached with `@lru_cache()`
- Updated CLI to use singleton pattern
- Removed `setup_hai_env()` calls (now automatic from settings)

**When to Use:**

- Custom client: Simple calls, structured output, cost tracking
- LangChain: Multi-agent workflows, RAG, tool-calling, LangGraph

**Status:** ✅ Complete

---

## 2026-04-03 - Session 2: Changelog Format Refactored

**Decision:** Simplified changelog to stack-based summaries only.

**Why:**

- Previous format too verbose (170+ lines)
- New sessions need quick context, not full analysis
- Detailed docs moved to `Docs/decisions/` for reference

**Changes:**

- Changelogs now: decision + why + impact (3-5 lines each)
- Detailed analysis lives in separate markdown files
- Stack format: newest entries at top

**Impact:** Faster context restoration for future AI sessions.

---

## 2026-04-01 - Session 1: Initial Architecture Review

**Decision:** Established modular architecture with LLM abstraction layer.

**Structure:**

- `infra/llm/` - Provider-agnostic LLM interface (BaseLLM)
- `core/` - Business logic (agents, workflows)
- `apps/` - Entry points (CLI, API)

**Key Implementation:**

- `BaseLLM` abstract class → `ClaudeLLM` implementation
- HAI Proxy integration for Claude API
- Structured logging system (`infra/logging.py`)

**Issues Identified:**

- ⚠️ Hardcoded API key in `env_setup.py` (security risk)
- ⚠️ No singleton LLM client (performance)
- ⚠️ No centralized config management

**Next Session:** Fix config management + implement singleton pattern.

---

## Template for Future Entries

```markdown
## YYYY-MM-DD - Session N: [Brief Title]

**Decision:** [What was decided/changed]

**Why:** [Core reasoning - 1-2 sentences]

**Impact:** [How this affects the system]

**Status:** [✅ Complete | 🚧 In Progress | ⚠️ Blocked]
```

---

## Detailed Documentation

For in-depth analysis, see:

- `backend/infra/llm/README.md` - LLM usage guide and provider setup

---

## 2026-05-24 - Session 23: LLM-Only Research Mode + E2E Playwright Tests

**Decision:** Added a toggle-gated LLM-only research mode that bypasses all web tools — the LLM drafts research from its training knowledge and the user refines it iteratively before triggering angle + content generation. Built a full Playwright E2E suite (20 tests) to cover the feature. Also fixed two carry-over bugs (JWT expiry, run history limit).

---

**Bug Fix 1 — JWT expiry in `llm_knowledge_node`**

- `backend/core/orchestrators/research/llm_knowledge.py` — Removed `get_langchain_llm()` (LangChain client cached with `@lru_cache()`, bakes JWT at first call — after expiry the cached client fails silently). Switched to `LLMFactory.get_client()` which re-instantiates cleanly on server restart. Same fix pattern used by the content pipeline.

---

**Bug Fix 2 — Recent runs capped at 3/5 items**

- `frontend/app/pipeline/page.tsx` — Removed `.slice(0, 3)` / `.slice(0, 5)` from both RunCard render sites. Added `max-h-120 overflow-y-auto pr-0.5` scrollable container so all historical runs are accessible.

---

**Feature — LLM-only research mode**

**Motivation:** Web research sometimes deviates the narrative (e.g. wanted a carousel exposing a politician's past controversies → web tools returned his generic official bio instead). LLM-only mode lets the user force a specific angle from the start and iteratively sharpen the research brief before generating content.

**Data flow:**

```
Toggle ON → "Draft Research" → POST /research/llm-draft → ResearchResponse (saved to disk)
  ↓ Stage 1 shows synthesis + key_points + evidence chips
  ↓ [User types feedback] → "Refine with LLM" → POST /research/llm-refine → updated ResearchResponse
  ↓ [Repeat any number of times — run_id stays constant]
  ↓ "Satisfied → Generate Angles" → normal angle + content waterfall (unchanged)
```

**Backend — 2 new endpoints + orchestrator:**

- `backend/core/prompts/templates/llm_research_draft.txt` (NEW) — Generates 8–12 evidence items with `source_type: "llm_knowledge"` in a single JSON blob. Uses `{{n}}` (double-escaped) so `load_prompt`'s `str.format()` doesn't choke on URL sequence numbers.
- `backend/core/prompts/templates/llm_research_refine.txt` (NEW) — Refines existing synthesis + evidence based on user feedback. Same double-escape pattern.
- `backend/core/orchestrators/research/llm_drafter.py` (NEW) — `draft_research()` + `refine_research()`. Both use `LLMFactory.get_client()`. `refine_research` keeps the same `run_id` from the current result (overwrites saved files). Both save via `RunOutputManager` to `outputs/{run_id}/research/` (same schema as web research).
- `backend/apps/api/v1/research.py` — Added `LLMDraftRequest`, `LLMRefineRequest` Pydantic models and `POST /research/llm-draft`, `POST /research/llm-refine` endpoints.

**Frontend — Redux state, API layer, toggle + refine panel:**

- `frontend/store/slices/pipelineSlice.ts` — Added `llmResearchMode: boolean` to `PipelineState` interface, `initialState` (`false`), and `setLlmResearchMode` reducer + export.
  - **Bug fix:** `resetPipeline` previously reset `llmResearchMode` to `false` (from `initialState`), so after clicking "Draft Research" the LLM mode flag was gone before the result arrived — `LlmRefinePanel` and "Generate Angles" button never rendered. Fixed by preserving `llmResearchMode` through reset: `{ ...initialState, topic: state.topic, llmResearchMode: state.llmResearchMode }`.
- `frontend/lib/api.ts` — Added `llmDraftResearch()` and `llmRefineResearch()` methods.
- `frontend/components/pipeline/PipelineConfig.tsx` — Toggle (`role="switch"` + `aria-label="LLM-only mode"` + `aria-checked`), hint text, hidden Research Depth / Advanced settings in LLM mode. `handleRun` branches: LLM mode → `api.llmDraftResearch()` → dispatch result → stop (no waterfall). Added `handleGenerateAngles()` which runs the same angle+content waterfall from the saved `researchResult`. "Satisfied → Generate Angles" outlined violet button appears only when `llmResearchMode && stages.research.status === "done" && stages.angle.status === "idle"`.
- `frontend/app/pipeline/page.tsx` — Added `LlmRefinePanel` component (feedback textarea + "Refine with LLM" button, clears textarea on success). Rendered in Stage 1 card body when `llmResearchMode && stages.research.status === "done" && researchResult`.

---

**Toggle UI fix**

The pill toggle thumb was overflowing the track in ON state and looked off-centre in OFF state. Root cause: `absolute` positioned thumb with no explicit `left` + no `overflow-hidden` on the track.

Rewrote to the standard Headless UI / Tailwind UI pattern:

- Track: `inline-flex h-6 w-11 border-2 border-transparent` (24×44px; 2px padding all sides makes inner = 20×40px)
- Thumb: `inline-block h-5 w-5` (20×20px; flows naturally from left edge)
- OFF: `translate-x-0` / ON: `translate-x-5` (0 or 20px — exactly fills the 40px inner width)

---

**E2E Playwright suite — 20/20 passing**

- `frontend/playwright.config.ts` (NEW) — Chromium only, `baseURL: http://localhost:3000`, headless, workers: 1.
- `frontend/e2e/llm-research-mode.spec.ts` (NEW) — 20 tests across 5 describe blocks. All backend calls intercepted via `page.route()` — no live LLM calls needed.
  - Toggle UI (6 tests): visibility, default OFF, label switching, Research Depth hidden in LLM mode, hint text.
  - Draft Flow (4 tests): synthesis appears after draft, request body contains topic, Generate Angles button appears, not shown in normal mode.
  - Refine Panel (7 tests): panel visible after draft, button disabled when empty, enables after typing, refine call + synthesis update, request body validation, textarea clears on success, multiple refines keep same `run_id`.
  - Generate Angles Flow (2 tests): angle API called, correct `run_id` forwarded.
  - Normal pipeline (1 test): `/research/run` used when LLM mode OFF.
- Selector fixes: `goToPipeline` uses `getByRole("heading", { name: "Pipeline", level: 1 })` (avoids strict-mode violation on multiple "Pipeline" text nodes). Two tests that matched 4 `/REFINED/i` elements use `.first()`.

**Status:** ✅ Complete — 2 bugs fixed, full LLM-only research mode (backend + frontend), toggle UI corrected, 20/20 Playwright tests passing.

---

_Last updated: 2026-06-27
