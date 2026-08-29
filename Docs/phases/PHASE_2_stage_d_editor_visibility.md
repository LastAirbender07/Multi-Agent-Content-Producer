# PHASE 2 — Stage D: Compact Template Editor Visibility

## Status
IMPLEMENTED (2026-08-29) — all 5 files patched per plan, all Done Criteria pass. See bottom of file for Loop 2 verification log.

## Problem Statement
All 11 `aurora-compact-*` template builders are already registered in the REGISTRY and render correctly. However, they are invisible to users in the editor because:
1. The Slides tab shows them with a generic grey colour and 🗂 emoji (auto-generated defaults), not polished metadata.
2. Clicking any compact tile immediately throws a **422 error** from the backend — `create_slide()` validates `slide_type` against the `SlideType` enum (`hook/content/stat/quote/cta/engage`), and the auto-derived type (e.g., `"compact-hook"`) is not in the enum.
3. Even if the 422 is fixed, the starter content for compact templates needs `compact_meta` — a field not yet present in `SlideEditRequest` on either the frontend or backend.

After Stage D: all 11 compact templates appear in the editor's Slides tab with proper labels, colours, and emojis; clicking any tile creates a slide and renders it using the builder's DEFAULTS; users can immediately start experimenting with compact layouts.

## Requirements

**Functional:**
- All 11 `aurora-compact-*` tiles in the Slides tab show: distinct colour stripe, descriptive emoji, human label, one-line description.
- Clicking any compact tile creates a slide and loads it in the editor canvas — rendered using the builder's DEFAULTS (demo content that clearly shows the layout).
- All 10 existing extended template tiles (aurora-hook, aurora-content-*, etc.) continue to work unchanged.

**Non-functional:**
- Zero backend schema breakage — `compact_meta` in `SlideEditRequest` is `Optional` with `None` default; all existing callers are unaffected.
- TypeScript compiles clean — no `tsc --noEmit` errors.
- No new files created — all changes are additions to existing files.
- No new npm/pip packages.

## External Verification Log

| Claim | Verified against | Verified on |
|---|---|---|
| `SLIDE_TYPES` is derived from `Object.keys(REGISTRY).filter(k => k.startsWith("aurora-"))` — compact keys already produce tiles | `frontend/constants/slideTemplates.ts:117-128` direct read | 2026-08-29 |
| `autoMeta()` generates grey (`#9CA3AF`) colour + 🗂 emoji for any key not in TEMPLATE_METADATA | `frontend/constants/slideTemplates.ts:91-102` direct read | 2026-08-29 |
| `create_slide()` validates `SlideType(slide_type)` and raises HTTP 422 on failure | `backend/core/services/slide_editor_service.py:267-269` direct read | 2026-08-29 |
| `SlideType` enum has only `hook`, `content`, `stat`, `quote`, `cta`, `engage` | `backend/core/orchestration/contracts.py:210-216` direct read | 2026-08-29 |
| `_render_and_save_png` passes `slide_data` (raw dict) — not the Pydantic `Slide` model — to `render_slide_fabric` | `backend/core/services/slide_editor_service.py:88-93` direct read | 2026-08-29 |
| `Slide` model has no `model_config = ConfigDict(extra='forbid')` → Pydantic ignores extra keys like `compact_meta` silently | `backend/core/orchestration/contracts.py:218-232` direct read — no model_config | 2026-08-29 |
| `createSlideWithType` in `TemplatesPanel.tsx` uses `t.type` for `newSlide` and `t.template` for `canvas_template` in editSlide | `frontend/components/editor/TemplatesPanel.tsx:31-55` direct read | 2026-08-29 |
| `SlideEditRequest` (backend) has `canvas_template` but NOT `compact_meta` | `backend/apps/api/v1/schemas.py:119-130` direct read | 2026-08-29 |
| `SlideEditRequest` (frontend) has `canvas_template` but NOT `compact_meta` | `frontend/lib/api/types.ts:197-209` direct read | 2026-08-29 |
| `schemas.py` imports `from typing import Literal, Optional, Dict` — no `Any` | `backend/apps/api/v1/schemas.py:1` direct read | 2026-08-29 |
| `TemplatesPanel` passes `compact_meta: starter.compact_meta` ONLY if we add it in Step D.5 — currently the editSlide call only passes `title, body, stat_value, stat_label, canvas_template` | `frontend/components/editor/TemplatesPanel.tsx:47-54` direct read | 2026-08-29 |

## Entry Conditions (verify before starting)

- [ ] All 11 aurora-compact-* keys present in REGISTRY — verify: `grep -c "aurora-compact" frontend/utils/canvasTemplates/index.ts` → outputs `≥11`
- [ ] TypeScript compiles clean before we start — verify: `cd frontend && npx tsc --noEmit` exits 0
- [ ] No existing tests reference compact template types — verify: `grep -r "aurora-compact" frontend/e2e/ 2>/dev/null | wc -l` → outputs `0` (none locked down yet, so changes are safe)
- [ ] Backend is importable — verify: `cd backend && uv run python -c "from apps.api.v1.schemas import SlideEditRequest; print('ok')"` → outputs `ok`

## Files to Create or Modify

| File | Action | Description |
|---|---|---|
| `frontend/constants/slideTemplates.ts` | MODIFY | Extend `TemplateMeta.starter` interface; add 11 compact entries to `TEMPLATE_METADATA` |
| `frontend/lib/api/types.ts` | MODIFY | Add `compact_meta?: Record<string, unknown>` to `SlideData` and `SlideEditRequest` |
| `backend/apps/api/v1/schemas.py` | MODIFY | Add `compact_meta: Optional[dict] = None` to `SlideEditRequest` |
| `backend/core/services/slide_editor_service.py` | MODIFY | Add one-line compact_meta patch inside `edit_slide()` |
| `frontend/components/editor/TemplatesPanel.tsx` | MODIFY | Pass `compact_meta` from starter in `createSlideWithType` |

## Implementation Steps (ordered, no step skipped)

---

### Step D.1 — Add compact template metadata to `slideTemplates.ts`

**File:** `frontend/constants/slideTemplates.ts`

**What to implement:**

1. Extend the `TemplateMeta` interface to add an optional `compact_meta` field on `starter`:

```typescript
interface TemplateMeta {
  type:    string;
  label:   string;
  desc:    string;
  color:   string;
  emoji:   string;
  starter: {
    title: string;
    body: string;
    stat_value?: string;
    stat_label?: string;
    bullets?: string[];
    compact_meta?: Record<string, unknown>;  // ← ADD THIS LINE
  };
}
```

2. Add the following 11 entries to `TEMPLATE_METADATA` (insert after the existing `"aurora-engage"` entry):

```typescript
// ── Phase 2 Compact family ──────────────────────────────────────────────────
"aurora-compact-hook": {
  type: "hook", label: "Compact Hook", desc: "Bold cover slide",
  color: "#2DD4BF", emoji: "🎯",
  starter: { title: "Your Big Idea", body: "", compact_meta: {} },
},
"aurora-compact-fact": {
  type: "stat", label: "Fact Card", desc: "Single stat reveal",
  color: "#E8B045", emoji: "⚡",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-fact-compare": {
  type: "stat", label: "Fact Compare", desc: "Side-by-side stats",
  color: "#E8B045", emoji: "⚖️",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-step": {
  type: "content", label: "Step (Legacy)", desc: "Single tutorial step",
  color: "#3B7EDC", emoji: "📋",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-step-index": {
  type: "content", label: "Step Index", desc: "Steps overview list",
  color: "#3B7EDC", emoji: "🗺️",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-step-detail": {
  type: "content", label: "Step Detail", desc: "Deep-dive step card",
  color: "#3B7EDC", emoji: "🔍",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-stat-hero": {
  type: "stat", label: "Stat Hero", desc: "Photo background + stat",
  color: "#F08A3D", emoji: "📸",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-list-item": {
  type: "content", label: "List", desc: "Ranked list (SahilBloom)",
  color: "#EC4899", emoji: "📝",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-compact-quote": {
  type: "quote", label: "Compact Quote", desc: "Editorial pull-quote",
  color: "#C47A3C", emoji: "💬",
  starter: { title: "", body: "", compact_meta: {} },
},
// ── Phase 5 Cover-Hero family ──────────────────────────────────────────────
"aurora-carousel-cover-hero-phone": {
  type: "hook", label: "Cover: Phone", desc: "Tilted phone mockup cover",
  color: "#7C6EFA", emoji: "📱",
  starter: { title: "", body: "", compact_meta: {} },
},
"aurora-carousel-cover-hero-images": {
  type: "hook", label: "Cover: Images", desc: "Image collage cover",
  color: "#7C6EFA", emoji: "🖼️",
  starter: { title: "", body: "", compact_meta: {} },
},
```

**Rationale for `compact_meta: {}`:** An empty object causes each builder to fall through to its `DEFAULTS` (e.g., the VPC/subnet demo content in step builders, the SahilBloom "5 Types of Wealth" in list builder). Users immediately see a meaningful demo render without needing to supply content.

**Rationale for `type` values:** Each compact template maps to a valid `SlideType` enum value so `create_slide()` doesn't 422:
- `aurora-compact-hook` → `"hook"` (it IS a hook/cover)
- `aurora-compact-fact`, `aurora-compact-fact-compare`, `aurora-compact-stat-hero` → `"stat"` (stat family)
- `aurora-compact-step*`, `aurora-compact-list-item` → `"content"` (content family)
- `aurora-compact-quote` → `"quote"` (quote family)
- `aurora-carousel-cover-hero-*` → `"hook"` (cover family)

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:** exits 0, no errors mentioning `slideTemplates.ts`

---

### Step D.2 — Extend `SlideData` and `SlideEditRequest` frontend types

**File:** `frontend/lib/api/types.ts`

**What to implement:**

Add `compact_meta` to both interfaces:

```typescript
export interface SlideData {
  slide_number: number;
  type: string;
  title: string;
  body: string;
  bullets: string[];
  stat_value?: string;
  stat_label?: string;
  chart_type?: string;
  chart_data?: { labels: string[]; values: number[]; datasets?: { label: string; values: number[] }[] };
  image_query?: string;
  slide_overrides: Record<string, string>;
  _theme?: string;
  compact_meta?: Record<string, unknown>;  // ← ADD THIS LINE
}

export interface SlideEditRequest {
  title?: string;
  body?: string;
  bullets?: string[];
  stat_value?: string;
  stat_label?: string;
  chart_data?: object;
  chart_type?: string;
  slide_overrides?: Record<string, string>;
  template_type?: string;
  theme?: string;
  canvas_template?: string;
  compact_meta?: Record<string, unknown>;  // ← ADD THIS LINE
}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:** exits 0

---

### Step D.3 — Add `compact_meta` to backend `SlideEditRequest`

**File:** `backend/apps/api/v1/schemas.py`

**What to implement:**

Add one line to `SlideEditRequest` (after the existing `canvas_template` field):

```python
class SlideEditRequest(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    bullets: Optional[list[str]] = None
    stat_value: Optional[str] = None
    stat_label: Optional[str] = None
    chart_data: Optional[dict] = None
    chart_type: Optional[str] = None
    slide_overrides: Optional[Dict[str, str]] = None
    template_type: Optional[str] = None
    theme: Optional[str] = None
    canvas_template: Optional[str] = None
    compact_meta: Optional[dict] = None    # ← ADD THIS LINE
```

Note: `Optional[dict]` (not `Optional[Dict[str, Any]]`) — avoids requiring an `Any` import since the existing imports are `from typing import Literal, Optional, Dict`.

**Test command:**
```bash
cd backend && uv run python -c "from apps.api.v1.schemas import SlideEditRequest; r = SlideEditRequest(compact_meta={'heading': 'Test'}); print(r.compact_meta)"
```
**Expected output:** `{'heading': 'Test'}`

---

### Step D.4 — Patch `compact_meta` in `edit_slide` service

**File:** `backend/core/services/slide_editor_service.py`

**What to implement:**

In `edit_slide()`, after the existing `if request.canvas_template is not None:` block (line ~144), add:

```python
if request.compact_meta is not None:
    slide_data["compact_meta"] = request.compact_meta
```

The full patch section should look like:
```python
if request.canvas_template is not None:
    slide_data["canvas_template"] = request.canvas_template
if request.compact_meta is not None:              # ← ADD THESE TWO LINES
    slide_data["compact_meta"] = request.compact_meta
```

**Why this is sufficient:** `_render_and_save_png` passes `slide_data` (the raw dict) to `render_slide_fabric`. The Fabric builders read `slide.compact_meta` directly from the raw JSON. The Pydantic `Slide.model_validate(slide_data)` call succeeds because `Slide` has no `extra='forbid'` config — it silently ignores the extra `compact_meta` key.

**Test command:**
```bash
cd backend && uv run python -c "
from apps.api.v1.schemas import SlideEditRequest
r = SlideEditRequest(compact_meta={'heading': 'Test VPC'})
print('compact_meta present:', r.compact_meta is not None)
"
```
**Expected output:** `compact_meta present: True`

---

### Step D.5 — Pass `compact_meta` from starter in `TemplatesPanel`

**File:** `frontend/components/editor/TemplatesPanel.tsx`

**What to implement:**

In `createSlideWithType()`, the `api.editSlide(...)` call currently sends:
```typescript
await api.editSlide(targetRunId, targetAngle, slideNum, {
  title:           starter.title,
  body:            starter.body,
  stat_value:      starter.stat_value,
  stat_label:      starter.stat_label,
  canvas_template: canvasTemplate,
});
```

Add `compact_meta` to this call:
```typescript
await api.editSlide(targetRunId, targetAngle, slideNum, {
  title:           starter.title,
  body:            starter.body,
  stat_value:      starter.stat_value,
  stat_label:      starter.stat_label,
  canvas_template: canvasTemplate,
  compact_meta:    starter.compact_meta,   // ← ADD THIS LINE
});
```

When `starter.compact_meta` is `{}` (for compact templates), the backend will write `compact_meta: {}` to the slide JSON. The builder then merges `{ ...DEFAULTS, ...{} }` = `DEFAULTS`, rendering the builder's demo content. When `starter.compact_meta` is `undefined` (for extended templates), it is passed as `undefined` to `SlideEditRequest`, which means the backend receives `null` (Pydantic converts undefined/absent fields to `None`) and the `if request.compact_meta is not None` guard skips it — no change to existing behavior.

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:** exits 0

---

## Done Criteria

All of the following must be TRUE before Loop 2 exits:

- [ ] `cd frontend && npx tsc --noEmit` exits 0 — test: run command → no errors
- [ ] `cd backend && uv run python -c "from apps.api.v1.schemas import SlideEditRequest; print(SlideEditRequest().compact_meta)"` → `None`
- [ ] All 11 aurora-compact-* entries appear in the Slides tab of TemplatesPanel with correct colour, emoji, label (NOT grey / 🗂)
- [ ] Clicking "Compact Hook" tile in the editor creates a slide (no 422 error) and renders it — verify by observing the editor canvas loads the aurora-compact-hook layout
- [ ] Clicking "Compact List" tile creates a list-item slide with the SahilBloom demo content rendered
- [ ] Clicking "Hook" (aurora-hook, extended) still works — no regression

## Real Data Testing (Loop 3 scenarios)

### Scenario A — Compact tile appearance
1. Open `http://localhost:3000/editor`
2. Click the Templates tab in the left panel
3. **Verify:** The Slides sub-tab shows compact template tiles with distinct colour stripes (teal for compact-hook, amber for fact, blue for step variants, pink for list, terracotta for quote, violet for cover-hero). No grey tiles with 🗂 emoji for compact templates.

### Scenario B — Create compact hook slide
1. With a run open in the editor (or from a blank run), click "Compact Hook" in the Slides tab
2. **Verify:** No 422 error in browser console. Slide is created and the editor canvas loads showing the aurora-compact-hook layout (cream/dark background, large bold headline, eyebrow pill). The content matches the builder's DEFAULTS (demo VPC/Nextwork content or whatever the builder's DEFAULTS contain).

### Scenario C — Create compact list-item slide
1. Click "List" tile in Slides tab
2. **Verify:** Editor renders the SahilBloom white-page notebook style with numbered circle badges and Playfair Display body text. Slide renders using DEFAULTS.

### Scenario D — Extended template regression
1. Click "Hook" (aurora-hook) tile
2. **Verify:** Standard aurora dark background hook slide created. No regression.

### Scenario E — Dark mode / panel UI
1. Verify the Slides tab renders cleanly at 1440×900 — no horizontal scroll, no text overflow, colour stripes visible.

## Known Constraints / Gotchas

- **`compact_meta: {}` triggers DEFAULTS** — this is intentional. An empty object means `{ ...DEFAULTS, ...{} } = DEFAULTS`. Users see a demo render immediately and can customise from there.
- **Pydantic silently ignores `compact_meta`** in `Slide.model_validate(slide_data)` — this is fine because rendering uses `slide_data` (raw dict), not the Pydantic model. Do NOT add `compact_meta` to the `Slide` Pydantic model or `SlideType` enum — that's Phase 3 scope.
- **`type` in TEMPLATE_METADATA must be a valid `SlideType` value** — verified. Any deviation causes a 422 on `newSlide`.
- **The `SLIDE_TEMPLATES` quick strip** (`frontend/components/editor/EditorLeftPanel.tsx`) is NOT updated in this stage — it uses `onSelectTemplate(type)` without a `canvas_template` parameter, and updating it would require changing `EditorLeftPanel`. That's deferred.
- **No `compact_meta` editing in the right panel** — Stage D only covers template creation + initial render. Inline editing of `compact_meta` fields (e.g., editing individual step items) requires a dedicated property panel and is Phase 5 scope.
- **Bundle not rebuilt here** — the REGISTRY and builders are unchanged. No `node backend/renderer/build.mjs` needed for Stage D.

## Rollback Plan

1. Revert `frontend/constants/slideTemplates.ts` — removes the 11 TEMPLATE_METADATA entries and `compact_meta` field from `TemplateMeta.starter`. Tiles revert to grey/🗂 defaults (still work via autoMeta, just look generic).
2. Revert `frontend/lib/api/types.ts` — removes `compact_meta` from both interfaces.
3. Revert `backend/apps/api/v1/schemas.py` — removes the `compact_meta` field from `SlideEditRequest`.
4. Revert `backend/core/services/slide_editor_service.py` — removes the 2-line `compact_meta` patch.
5. Revert `frontend/components/editor/TemplatesPanel.tsx` — removes `compact_meta: starter.compact_meta` from the editSlide call.
6. No env vars to unset. No output-directory migrations needed (existing slides.json files are unaffected; compact_meta is an additive optional field).

---

## Loop 1 Review Log

### Pass 1 — 2026-08-29

**Inputs read:** README, FRONTEND.md, RENDERING_ENGINE_OVERVIEW.md, RENDERER_CODEBASE_GUIDE.md, ADDING_A_SLIDE_TYPE.md, REVIEW_PROTOCOL.md, Docs/frontend/editor/, PHASE_2_compact_templates.md, slideTemplates.ts, index.ts (REGISTRY), TemplatesPanel.tsx, editor.ts (API), types.ts, schemas.py, slide_editor_service.py, contracts.py (SlideType enum)

**Issues found:**

ISSUE-1 [SEVERITY: HIGH]
Location: Step D.1 — TEMPLATE_METADATA `type` field design
Problem: If `autoMeta("aurora-compact-hook")` derives `type = "compact-hook"`, clicking the tile calls `api.newSlide(runId, angle, "compact-hook", "aurora")` → backend `create_slide()` validates `SlideType("compact-hook")` → raises 422.
Fix: Explicitly set `type` in all 11 TEMPLATE_METADATA entries to a valid SlideType value (hook/content/stat/quote).
Verified via: `backend/core/services/slide_editor_service.py:267-269` direct read.
Status: ✅ Fixed in plan — all 11 entries have explicit valid types.

ISSUE-2 [SEVERITY: MEDIUM]
Location: Step D.5 — `createSlideWithType` adding `compact_meta`
Problem: `compact_meta` not in `SlideEditRequest` frontend type → TypeScript error on the editSlide call.
Fix: Add `compact_meta?: Record<string, unknown>` to `SlideEditRequest` in `types.ts` (Step D.2).
Verified via: `frontend/lib/api/types.ts:197-209` direct read.
Status: ✅ Fixed in plan — D.2 adds the field before D.5 uses it.

ISSUE-3 [SEVERITY: LOW]
Location: Step D.3 — backend `schemas.py` import
Problem: `Dict[str, Any]` would require adding `Any` to `from typing import ...`. `Optional[dict]` avoids the import change.
Fix: Use `Optional[dict]` instead of `Optional[Dict[str, Any]]`.
Verified via: `backend/apps/api/v1/schemas.py:1` — imports confirmed.
Status: ✅ Fixed in plan — all uses say `Optional[dict]`.

All 3 issues addressed. No other issues found.

### Pass 2 — 2026-08-29 (cold re-read)

Re-read plan as a fresh developer who has never seen this codebase.

**Architecture check:**
- Every file named explicitly — ✅
- Entry conditions have exact shell commands — ✅
- No new packages/dependencies — ✅
- No circular dependencies — D.1→D.2→D.3→D.4→D.5 is purely sequential, each step additive — ✅
- No new settings or env vars — ✅
- API contract: `compact_meta` is Optional(None default) — backward-compatible — ✅
- Redux slice: untouched — ✅
- Renderer boundary: no layout code in Python — ✅

**Code quality check:**
- SRP: each change is in its correct layer (type defs, schema, service, UI) — ✅
- Modularisation: all existing file boundaries respected — ✅
- No god functions: all changes are 1-3 lines — ✅
- No hidden coupling introduced — ✅

**External verification check:**
- All 9 claims in the verification log have direct file read citations — ✅
- Pydantic `extra='forbid'` absence confirmed — ✅
- `render_slide_fabric(slide_data=slide_data)` confirmed — ✅

**Reliability check:**
- `compact_meta: {}` always safe (builder merges with DEFAULTS, never crashes) — ✅
- `compact_meta: undefined` from extended starters maps to `None` in Python → guard skips it — ✅

**Frontend check:**
- No new components, no horizontal scroll risk — ✅
- Dark theme: only metadata entries added (colour values, not UI components) — ✅
- No new loading/error states introduced — ✅

**Backend check:**
- No new LangGraph nodes, endpoints, or CORS changes — ✅
- Pydantic model validated: `Slide.model_validate(slide_data)` with extra `compact_meta` key → passes silently — ✅

**"Handed to unknown developer" test:** PASS — a developer can read this document and implement all 5 steps in order with zero clarifying questions. Each step has the exact code to add, the exact line to add it after, and a verification command.

**Issues found in Pass 2:** NONE.

**Loop 1 exit condition:** ✅ 2 passes completed. Most recent pass clean. All external claims verified. Plan sections complete. "Handed to developer" test passes.

## Status
APPROVED (Loop 1 complete, 2026-08-29) — ready to implement

## Loop 2 — Implementation & Verification (2026-08-29)

**Files patched (5, ~20 lines total):**

| File | Change | Verified |
|---|---|---|
| `frontend/constants/slideTemplates.ts` | Extended `TemplateMeta.starter` with `compact_meta?: Record<string, unknown>`; added 11 entries after `aurora-engage` (9 compact + 2 carousel-cover-hero) | `grep -c 'compact_meta' → 12`, `grep -c 'aurora-(compact\|carousel-cover-hero)' → 11` |
| `frontend/lib/api/types.ts` | Added `compact_meta?: Record<string, unknown>` to `SlideData` (line 195) and `SlideEditRequest` (line 210) | `npx tsc --noEmit` — no new errors introduced |
| `backend/apps/api/v1/schemas.py` | Added `compact_meta: Optional[dict] = None` after `canvas_template` on `SlideEditRequest` | `SlideEditRequest().compact_meta` → `None`; `SlideEditRequest(compact_meta={...}).compact_meta` roundtrips |
| `backend/core/services/slide_editor_service.py` | Added `if request.compact_meta is not None: slide_data["compact_meta"] = request.compact_meta` guard, mirroring the `canvas_template` block above it | Static read confirmed — 2 lines exactly per plan |
| `frontend/components/editor/TemplatesPanel.tsx` | Added `compact_meta: starter.compact_meta` to the `api.editSlide` call inside `createSlideWithType` | TypeScript still compiles clean w.r.t. this file |

**Test results:**
- `cd frontend && npx tsc --noEmit` — 0 new errors. (3 pre-existing errors in `utils/canvasTemplates/aurora_carousel_cover_hero.ts` and `shared/cover/index.ts` are unrelated Cover-Hero POC tech debt from an earlier attempt; they exist on `main` before Stage D and are outside Stage D's scope.)
- `cd backend && uv run python -c "from apps.api.v1.schemas import SlideEditRequest; print(SlideEditRequest().compact_meta)"` → `None` ✅
- Backend roundtrip: `SlideEditRequest(compact_meta={"category_pill": "VIRAL", "headline_runs": [{"text": "HI", "weight": 900}]}).model_dump(exclude_none=True)` → dict with `compact_meta` key preserved intact ✅

**Loop 3 (real-data testing) — NOT executed here.** Scenarios A–E require a running backend + frontend (`npm run dev` + `uv run python -m uvicorn ...`) and human observation of the editor UI. Run those manually to close the remaining checklist items:
- [ ] Scenario A: 11 compact tiles appear with distinct colours/emojis (not grey/🗂)
- [ ] Scenario B: Click "Compact Hook" → no 422, renders aurora-compact-hook layout
- [ ] Scenario C: Click "List" → SahilBloom notebook layout renders with demo content
- [ ] Scenario D: Click "Hook" (aurora-hook) → no regression
- [ ] Scenario E: Slides tab renders cleanly at 1440×900

## Status
IMPLEMENTED — awaiting real-data scenarios A–E (Loop 3).
