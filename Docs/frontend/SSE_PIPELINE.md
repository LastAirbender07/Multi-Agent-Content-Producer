# SSE Pipeline Progress — As-Built Reference

> **Status:** ✅ Implemented & verified  
> **Branch:** `add-sse`  
> **Date completed:** 2026-08-13

---

## What Was Built

Real-time pipeline progress via Server-Sent Events. Each long-running stage (Research, Content) streams granular backend events to the UI as they happen. No polling, no simulated arithmetic, no static tick marks.

---

## Architecture

```
User starts pipeline
        │
        ▼
usePipelineOrchestration.handleRun()
  │  dispatches Redux: stage.status = "running"
  │  POSTs /api/v1/research/run  ──────────────────────────────────────────┐
  │                                                                         ▼
  │                                                               ResearchOrchestrator
  │  CONCURRENTLY: ResearchStageCard mounts with active=true               │
  │    → usePipelineSSE opens EventSource                                  │
  │      GET /api/v1/research/{runId}/events                               │ each node calls
  │      ← data: {"phase":"planning","pct":18,"message":"..."}            │ progress_store.update()
  │                                                                         │
  ◀── POST returns full result ────────────────────────────────────────────┘
  │  dispatches: setResearchResult(), stage = "done"
  │
  ▼  (same pattern for content)
POST /api/v1/content/run  ────────────────────────────────────────────────┐
  │                                                                         ▼
  │  ContentStageCard opens EventSource                           ContentOrchestrator
  │  GET /api/v1/content/{runId}/events                                    │ per-angle + per-slide
  │  ← data: {"phase":"rendering","pct":33,"message":"..."}               │ progress_store.update()
  │                                                                         │
  ◀── POST returns full result ────────────────────────────────────────────┘
```

**Key design constraint:** Pipeline advancement is driven by the POST responses, not SSE events. SSE is purely for progress display — a broken SSE stream can never stall the pipeline.

---

## Event Schema

```json
{ "phase": "executing_tools", "pct": 55, "message": "Searching news & web…" }
{ "phase": "complete",        "pct": 100, "message": "Research complete" }
{ "phase": "error",           "pct": 0,   "message": "Error: <details>" }
```

---

## Research Events (16 events per typical run)

| Node | phase | pct | message |
|------|-------|-----|---------|
| intake | `intake` | 8 | Starting… |
| route | `planning` | 18 | Planning queries… |
| llm_knowledge | `planning` | 25 | Loading background knowledge… |
| execute_tools | `executing_tools` | 55 | Searching news & web… |
| normalize | `executing_tools` | 65 | Processing sources… |
| score_evidence | `executing_tools` | 72 | Scoring evidence… |
| synthesize | `synthesizing` | 85 | Synthesising findings… |
| evaluate | `synthesizing` | 92 | Evaluating quality… |
| refine (loop) | `synthesizing` | 88→90→... | Refining… (pct intentionally goes backwards here — frontend uses Math.max) |
| finalize | `synthesizing` | 98 | Saving results… |
| (graph end) | `complete` | 100 | Research complete |

**Note on refine loop:** The research graph can iterate `synthesize → evaluate → refine → synthesize` multiple times. Raw SSE pct resets to 55% on each loop iteration. The frontend `usePipelineSSE` applies `Math.max(prev.pct, incoming)` so the progress bar never moves backwards for the user.

---

## Content Events (multi-angle aware)

### Orchestrator-level
```
starting@5%                        "Starting content generation…"
generating_carousel@{angle_pct}%   "Generating angle N of M…"   (one per angle)
complete@100%                      "Carousels ready"
```

### Carousel generator (per-slide, within each angle's pct range)
```
rendering@{slide_pct}%   "Rendering slide N of M…"           (single angle)
rendering@{slide_pct}%   "Angle A/B — slide N of M…"         (multi-angle)
```

### Pct math for multiple angles

```python
# orchestrator — "generating_carousel" event per angle
angle_start_pct = round(idx / total_angles * 80) + 5

# carousel_generator — per-slide within each angle's reserved range
angle_start = round(angle_index / total_angles * 80) + 10
angle_end   = round((angle_index + 1) / total_angles * 80) + 5
slide_pct   = angle_start + round((i + 1) / len(slides_raw) * (angle_end - angle_start))
```

**Example — 3 angles, 5 slides each (all monotonic globally):**
```
starting@5%
generating_carousel@5%    "Generating angle 1 of 3…"
rendering@14%             "Angle 1/3 — slide 1 of 5…"
rendering@32%             "Angle 1/3 — slide 5 of 5…"
generating_carousel@32%   "Generating angle 2 of 3…"
rendering@41%             "Angle 2/3 — slide 1 of 5…"
rendering@58%             "Angle 2/3 — slide 5 of 5…"
generating_carousel@58%   "Generating angle 3 of 3…"
rendering@67%             "Angle 3/3 — slide 1 of 5…"
rendering@85%             "Angle 3/3 — slide 5 of 5…"
[blog post generation — silent ~30–90s]
complete@100%             "Carousels ready"
```

**`complete` fires only after ALL angles and blog post generation finish.**

---

## Backend: ProgressStore

`backend/core/services/progress_store.py` — push-based queue singleton.

- `progress_store.update(key, event)` — stores latest state + puts to all subscriber queues immediately (zero CPU when idle)
- `progress_store.finish(key)` — sends `None` sentinel → SSE generators break cleanly
- `await progress_store.subscribe(key)` — returns a queue; late-joining clients get last known state replayed immediately; if run already completed, replays final event + sentinel so stream closes in <1ms
- Namespaced keys prevent research/content collision: `f"research:{run_id}"` / `f"content:{run_id}"`

---

## Frontend: usePipelineSSE

`frontend/hooks/usePipelineSSE.ts`

- **Absolute URL**: `${ASSET_BASE}/api/v1/${type}/${runId}/events` (ASSET_BASE = `http://localhost:8000` — hits FastAPI directly, not the Next.js dev proxy which would 404)
- **Monotonic pct**: `Math.max(prev.pct, incoming.pct)` — progress bar never goes backwards regardless of backend loop behavior
- **State preservation**: only resets when a genuinely new `runId` appears (not when `active` flips) — Done badge stays visible after completion
- **Activity log**: last 50 events stored; UI shows most recent at top with older events fading

---

## Files Changed

| File | Change |
|------|--------|
| `backend/core/services/progress_store.py` | New push-based queue with late-join replay |
| `backend/core/graphs/research_graph.py` | All nodes call `_emit()` with phase/pct/message |
| `backend/apps/api/v1/research.py` | Push-based SSE at `GET /research/{run_id}/events` |
| `backend/apps/api/v1/content.py` | Push-based SSE at `GET /content/{run_id}/events` |
| `backend/core/orchestrators/content/orchestrator.py` | Emits starting/per-angle/complete events |
| `backend/core/orchestrators/content/carousel_generator.py` | Per-slide rendering events with multi-angle context in message |
| `backend/core/schemas/workflow_state.py` | Added `angle_index`, `total_angles` to ContentGraphState |
| `frontend/hooks/usePipelineSSE.ts` | Absolute URL, monotonic pct, state preservation |
| `frontend/components/pipeline/ResearchStageCard.tsx` | SSE progress bar + activity log while running; full research summary + LLM knowledge accordion when done |
| `frontend/components/pipeline/ContentStageCard.tsx` | SSE progress bar + activity log while running; CarouselViewer + TokenChips + BlogExportBar + Editor button when done |

---

## E2E Tests

`frontend/e2e/sse-ui.spec.ts` — 9 tests total, all passing.

### Group A — Mocked (no backend required, ~23s)

| Test | What it verifies |
|------|-----------------|
| A1 | Idle: page loads, no broken static steps |
| A2 | Research running: SSE messages appear in activity log, no static tick marks |
| A3 | Research done: summary, LLM knowledge accordion, Done badge all visible |
| A4 | Content running: SSE messages appear, progress bar visible |
| A5 | Full pipeline: CarouselViewer, editor button, Done badge all visible |
| A6 | Full visual: all stage cards, status badges, screenshots at 1440×900 |

### Group B — Real backend (~7–10 min)

| Test | What it verifies |
|------|-----------------|
| B1 | Research SSE concurrent: 16 events received including intake → planning → executing_tools → synthesizing → complete |
| B2 | Late-join replay: connecting after completion gets immediate `complete` event |
| B3 | Content SSE: starting → generating_carousel → rendering slide 1–N → complete (16 events) |

```bash
# Run mocked only (CI-safe):
cd frontend && pnpm exec playwright test e2e/sse-ui.spec.ts --grep-invert "@backend"

# Run all (requires both servers running):
cd frontend && pnpm exec playwright test e2e/sse-ui.spec.ts --timeout=600000
```

---

## Failure Modes

| Failure | How handled |
|---------|-------------|
| Frontend connects after run finishes | `subscribe()` replays last state + sentinel immediately |
| SSE stream drops mid-run | `EventSource` auto-reconnects; server replays last state on re-subscribe |
| Backend pct goes backwards (research refine loop) | `Math.max(prev.pct, incoming)` in frontend hook |
| `active` flips false briefly | State only resets on new `runId`, not on `active` change |
| Component remounts during run | Redux `stageStatus` prop in ContentStageCard acts as fallback |
| Multiple angles — looks like progress resets | Message includes "Angle A/B —" prefix; pct is globally monotonic |
