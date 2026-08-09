# Pipeline Progress — Real-Time Updates via Server-Sent Events

> **Status:** Planning — ready for implementation  
> **Created:** 2026-08-09  
> **Area:** Full-stack — FastAPI backend + Next.js frontend  
> **Effort estimate:** 3–4 days  

---

## The Problem in Plain English

When a user starts the pipeline, three stages run:
1. **Research** (~90–120 seconds) — web search, news, extraction, LLM synthesis
2. **Angle generation** (~20–30 seconds) — one LLM call, usually fast
3. **Carousel generation** (~60–180 seconds per angle selected, scales with count)

Currently the UI shows a progress bar and a single text line for each stage. In practice:
- The research bar jumps around and cannot be trusted
- The carousel bar sits frozen at 0% for several minutes then snaps to a higher value
- Neither bar reflects what is actually happening inside the backend
- The user has no idea if the system is working or silently broken

The root cause is not a missing feature — it is a **fundamental mismatch between the architecture and the problem**. The current design asks the frontend to poll a snapshot endpoint and then *guess* how much has happened using simulated arithmetic. That is the wrong model for long-running async work.

---

## How the Code Works Today

### Backend Data Flow

```
POST /api/v1/pipeline/start
  → creates SQLite row (status = PENDING)
  → schedules BackgroundTask: _run_research()

_run_research()
  → ResearchOrchestrator.run()
    → repo.update_run_status("RESEARCH_RUNNING", current_phase="initializing")
    → LangGraph: research_graph.ainvoke(...)
      → web_search_node()          → repo.update(..., current_phase="web_search")
      → news_search_node()         → repo.update(..., current_phase="news_search")
      → content_extraction_node()  → repo.update(..., current_phase="content_extraction")
      → synthesis_node()           → repo.update(..., current_phase="synthesis")
    → repo.update_run_status("RESEARCH_COMPLETE")
```

The `current_phase` field changes 5 times during research. Each change is a DB write. The frontend can only observe this by polling `GET /api/v1/pipeline/{id}/status`.

```
POST /api/v1/content/{run_id}/carousels
  → schedules BackgroundTask: _run_carousels()

_run_carousels()
  → CarouselOrchestrator.run()
    → repo.update("GENERATING_CAROUSELS", total_angles=N, completed_angles=0)
    → for each angle_index:
        → repo.update(current_phase="Generating carousel for angle X", completed_angles=i)
        → content_graph.ainvoke(...)
          → slide_generation_node()    ← NO status update here
          → carousel_rendering_node()  ← NO status update here
          → caption_generation_node()  ← NO status update here
        → repo.update(completed_angles=i+1)
    → repo.update("CONTENT_COMPLETE")
```

Inside each carousel's content graph (~60–90 seconds), there are **zero** status updates. The frontend sees angle 0 start and then silence until angle 0 finishes.

### Frontend Polling Logic

**`useResearchProgress`** (polls every 2 seconds):

```typescript
// When running: simulate +3% per poll, capped at 90%
setState(prev => ({
  ...prev,
  progress: Math.min(prev.progress + 3, 90),
  currentPhase: status.current_phase || "web_search",
}));
pollRef.current = setTimeout(pollStatus, 2000);
```

The progress is **pure arithmetic**. After ~27 polls (54 seconds) it saturates at 90% and stays there regardless of actual backend state. When research takes 120 seconds, the bar has been at 90% for 66 seconds.

If the component **re-mounts** (React StrictMode double-invoke, or the user navigates away and back), `progress` resets to 10 and the increment restarts — this is the regression to 15% from 70% the user observes. The backend never reported progress going backwards. The frontend manufactured both the forward climb and the backwards reset.

**`useContentProgress`** (polls every 3 seconds):

```typescript
const angleProgress = (status.completed_angles / status.total_angles) * 100;
newProgress = Math.max(newProgress, Math.min(angleProgress, 95));
```

This is slightly better — when angle 1 of 3 finishes, the bar jumps to 33%. But:
- The bar is frozen at 0% from the start of an angle until it completely finishes (~60–90 seconds)
- `current_phase` during this time is a raw string like `"Generating carousel for angle 1"` — not a useful message
- There is no indication of whether the LLM is thinking, the renderer is running, or it crashed silently

### The Progress Regression Explained

```
t=0   : component mounts, progress = 10%
t=54s : progress = 90% (maxed), actual backend at synthesis node
t=90s : research completes, progress snaps to 100% ✓

--- user navigates briefly and returns ---

t=92s : component RE-MOUNTS, progress RESETS to 10%  ← user sees regression
t=120s: research completes, snaps to 100%
```

The backend never reported progress going backwards. The frontend manufactured both the forward climb and the backwards reset.

### Architecture Diagram (Current)

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend                                                           │
│                                                                     │
│  useResearchProgress                                                │
│    ├── setTimeout(poll, 2000)  ──────────────────────────────────┼──→ GET /status → DB snapshot
│    ├── setTimeout(poll, 2000)  ──────────────────────────────────┼──→ GET /status → DB snapshot
│    └── ...30–60 HTTP round-trips during research...              │
│                                                                     │
│  useContentProgress                                                 │
│    ├── setTimeout(poll, 3000)  ──────────────────────────────────┼──→ GET /status → DB snapshot
│    └── ...20–60 HTTP round-trips during carousel gen...          │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Backend                                                            │
│                                                                     │
│  GET /status  →  SELECT * FROM runs WHERE run_id = ?               │
│               →  returns snapshot (5 fields)                        │
│                                                                     │
│  BackgroundTask: [web_search] → [news] → [extraction] → [synth]   │
│  (no connection to any frontend, no way to push events)            │
└────────────────────────────────────────────────────────────────────┘
```

The backend and frontend are decoupled by a DB snapshot. The frontend polls and guesses. The backend has no mechanism to push updates.

---

## Why Polling Is Wrong Here

| Property | Polling (current) | SSE (proposed) |
|----------|-------------------|----------------|
| Latency | 2–3 second worst case | <100ms |
| Connection overhead | New HTTP conn every poll | 1 persistent connection |
| Backend coupling | DB snapshot only | Direct event emission |
| Progress accuracy | Simulated arithmetic | Real-time, event-driven |
| Rich messages | Only `current_phase` string from DB | Arbitrary JSON payload per event |
| Sub-step visibility | Impossible without deep DB writes | Native — emit whenever |
| Progress can go backwards | Yes (on component remount) | No — events only go forward |
| Server load | 30–60 DB reads per operation | 1 connection, 0 DB reads for delivery |

The argument for polling is simplicity. But our operations are 90–180 seconds long. The simplicity of polling has already been exhausted — the team is already maintaining two custom progress-simulation hooks with timers and capped increments. SSE is simpler than the current code once the pattern is established.

---

## Proposed Architecture: Server-Sent Events

### What SSE Is

SSE is a standard HTTP mechanism where the server keeps a connection open and pushes newline-delimited text events to the client. The browser's native `EventSource` API handles reconnection automatically.

```
Client → GET /api/v1/pipeline/{run_id}/events
       ← HTTP 200, Content-Type: text/event-stream
       ← id: 1
       ← data: {"type":"phase","phase":"web_search","message":"Searching the web..."}\n\n
       ← id: 2
       ← data: {"type":"phase","phase":"news_search","message":"Checking latest news..."}\n\n
       ← id: 3
       ← data: {"type":"progress","value":45,"message":"Extracted 6/12 sources..."}\n\n
       ← id: 4
       ← data: {"type":"complete","stage":"research"}\n\n
       ← [server closes connection]
```

One connection. Zero polling. Real data.

### Event Schema

```typescript
// All events share this discriminated union shape
type PipelineEvent =
  | PhaseEvent
  | ProgressEvent
  | LogEvent
  | AngleEvent
  | CarouselEvent
  | CompleteEvent
  | ErrorEvent
  | InitEvent;

interface PhaseEvent {
  type: "phase";
  phase: string;        // "web_search" | "news_search" | "extraction" | "synthesis" | ...
  message: string;      // Human-readable: "Searching the web for sources..."
  timestamp: string;
}

interface ProgressEvent {
  type: "progress";
  value: number;        // 0–100, always increasing, always real
  message: string;      // "Found 8 sources. Extracting content..."
  timestamp: string;
}

interface LogEvent {
  type: "log";
  level: "info" | "warn";
  message: string;      // "Found article: 'AI and Enterprise' (techcrunch.com)"
  timestamp: string;
}

interface AngleEvent {
  type: "angle_complete";
  angle_index: number;
  total_angles: number;
  message: string;      // "Angle 1/3 done — 'The Contrarian Case'"
  timestamp: string;
}

interface CarouselEvent {
  type: "carousel_phase";
  angle_index: number;
  total_angles: number;
  phase: string;        // "slides" | "rendering" | "captions"
  phase_index: number;  // 0 | 1 | 2  (used for progress math)
  message: string;      // "Rendering 12 slides for angle 1..."
  timestamp: string;
}

interface CompleteEvent {
  type: "complete";
  stage: string;        // "research" | "angles" | "carousels"
  timestamp: string;
}

interface ErrorEvent {
  type: "error";
  message: string;
  timestamp: string;
}

interface InitEvent {
  type: "init";
  status: string;       // current DB status — for reconnect fast-path
  current_phase: string | null;
  recent_events: PipelineEvent[];  // last N buffered events, for UI restore
}
```

### Backend Architecture

#### 1. Event Bus (In-Memory)

A simple async queue per `run_id`. The event bus is a module-level singleton — no Redis required for a single-process server.

All background tasks and graph nodes are `async def` functions running in FastAPI's event loop. They call `await event_bus.emit()` directly. No thread-bridge needed.

```python
# backend/infra/events/event_bus.py

import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from collections import deque

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class EventBus:
    """
    In-memory async event bus. One queue per SSE subscriber per run.

    Thread safety: this is designed for single-process asyncio usage only.
    All callers must be in the same event loop (FastAPI background tasks
    and graph nodes both satisfy this requirement).

    Cleanup: queues are cleaned up when the SSE generator's `finally` block
    runs (client disconnect or stream end). A run that has no active subscriber
    still has its recent_events buffer, which is capped at `max_buffer` entries.
    """

    def __init__(self, max_buffer: int = 50):
        # One list of subscriber queues per run
        self._queues: dict[str, list[asyncio.Queue]] = {}
        # Recent event buffer per run — for reconnect restore
        self._buffers: dict[str, deque[dict]] = {}
        self._max_buffer = max_buffer

    def subscribe(self, run_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=500)
        self._queues.setdefault(run_id, []).append(q)
        return q

    def unsubscribe(self, run_id: str, q: asyncio.Queue):
        if run_id in self._queues:
            self._queues[run_id] = [x for x in self._queues[run_id] if x is not q]
            if not self._queues[run_id]:
                del self._queues[run_id]

    def get_recent_events(self, run_id: str) -> list[dict]:
        return list(self._buffers.get(run_id, []))

    async def emit(self, run_id: str, event: dict):
        """
        Emit an event to all active subscribers of this run.
        Also buffers the event for late-joining / reconnecting clients.

        Queue maxsize is 500 — in practice with 1–2 clients and events arriving
        at <1/second, the queue never fills. `await q.put()` blocks the emitter
        coroutine rather than dropping events, which is correct behaviour for
        our low-throughput use case.
        """
        if "timestamp" not in event:
            event = {**event, "timestamp": _now()}

        # Buffer for reconnect
        buf = self._buffers.setdefault(run_id, deque(maxlen=self._max_buffer))
        buf.append(event)

        for q in self._queues.get(run_id, []):
            await q.put(event)  # blocks if full; fine given low event rate

    def cleanup_run(self, run_id: str):
        """
        Free buffer memory after a run reaches a terminal state.

        Call this from the orchestrator after emitting the `complete` or `error`
        event — the buffer is no longer needed once the run finishes. Any active
        SSE subscriber will have already consumed all events and closed; any new
        subscriber connecting to a completed run gets the fast-path `complete`
        response from the DB-backed `init` event instead.

        Example:
            await event_bus.emit(run_id, {"type": "complete", "stage": "research"})
            event_bus.cleanup_run(run_id)  # free memory
        """
        self._buffers.pop(run_id, None)
        self._queues.pop(run_id, None)


# Module-level singleton
event_bus = EventBus()
```

#### 2. SSE Endpoint

The client opens one SSE connection per run. Both the research hook and the carousel hook connect to the same endpoint — each opens its own `EventSource` connection, both receiving the full event stream. This is fine: the browser allows up to 6 concurrent connections per host and the event stream is lightweight text. The frontend hook filters events by stage.

```python
# backend/apps/api/routes.py (addition)

from fastapi import Request
from fastapi.responses import StreamingResponse
from backend.infra.events.event_bus import event_bus
import asyncio
import json

@router.get("/pipeline/{run_id}/events")
async def pipeline_events(run_id: str, request: Request):
    """
    SSE stream for real-time pipeline progress.

    The client opens this connection immediately after starting a pipeline
    stage. On reconnect (page refresh, network blip), the EventSource sends
    Last-Event-ID; the server replays recent buffered events so the UI restores
    its state without a full re-poll.
    """
    repo = RunRepository()
    run = repo.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        q = event_bus.subscribe(run_id)
        event_id = 0
        try:
            # --- init event: current state + buffered history ---
            recent = event_bus.get_recent_events(run_id)
            init_payload = {
                "type": "init",
                "status": run["status"],
                "current_phase": run.get("current_phase"),
                "recent_events": recent[-10:],  # last 10 for UI restore
            }
            event_id += 1
            yield f"id: {event_id}\ndata: {json.dumps(init_payload)}\n\n"

            # If already complete, close immediately
            terminal = {"RESEARCH_COMPLETE", "ANGLES_COMPLETE", "CONTENT_COMPLETE", "COMPLETE", "FAILED"}
            if run["status"] in terminal:
                stage_map = {
                    "RESEARCH_COMPLETE": "research",
                    "ANGLES_COMPLETE": "angles",
                    "CONTENT_COMPLETE": "carousels",
                    "COMPLETE": "carousels",
                }
                stage = stage_map.get(run["status"])
                if stage:
                    event_id += 1
                    yield f"id: {event_id}\ndata: {json.dumps({'type': 'complete', 'stage': stage})}\n\n"
                return

            # --- live event loop ---
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30.0)
                    event_id += 1
                    yield f"id: {event_id}\ndata: {json.dumps(event)}\n\n"

                    if event.get("type") in ("complete", "error"):
                        break
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"  # prevents proxy timeout
        finally:
            event_bus.unsubscribe(run_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable Nginx buffering
            "Connection": "keep-alive",
        },
    )
```

#### 3. Emit from Orchestrators and Nodes

**ResearchOrchestrator:**

```python
# backend/core/orchestrators/research_orchestrator.py

from backend.infra.events.event_bus import event_bus

class ResearchOrchestrator:
    async def run(self, run_id: str, request: PipelineStartRequest):
        graph = build_research_graph(self.settings)
        self.repo.update_run_status(run_id, "RESEARCH_RUNNING", current_phase="initializing")

        await event_bus.emit(run_id, {
            "type": "phase", "phase": "initializing",
            "message": "Starting research pipeline...",
        })

        result = await graph.ainvoke({
            "run_id": run_id,
            "topic": request.topic,
            "settings": self.settings,
        })

        synthesis = result.get("synthesis")
        if not synthesis:
            raise ValueError("Research graph did not produce a synthesis")

        self.output_manager.save_synthesis(run_id, synthesis)
        self.repo.update_run_status(run_id, "RESEARCH_COMPLETE")

        await event_bus.emit(run_id, {
            "type": "complete", "stage": "research",
        })
        return synthesis
```

**Research nodes** — `run_id` is already in `ResearchState`, no extra field needed:

```python
# backend/core/nodes/research_nodes.py

from backend.infra.events.event_bus import event_bus

async def web_search_node(state: ResearchState) -> ResearchState:
    run_id = state["run_id"]
    repo = RunRepository()
    repo.update_run_status(run_id, "RESEARCH_RUNNING", current_phase="web_search")

    await event_bus.emit(run_id, {
        "type": "phase", "phase": "web_search",
        "message": "Searching the web for recent articles and sources...",
    })

    results = await _do_web_search(state)

    await event_bus.emit(run_id, {
        "type": "log", "level": "info",
        "message": f"Found {len(results)} web sources.",
    })

    return {**state, "web_results": results}


async def news_search_node(state: ResearchState) -> ResearchState:
    run_id = state["run_id"]
    repo.update_run_status(run_id, "RESEARCH_RUNNING", current_phase="news_search")

    await event_bus.emit(run_id, {
        "type": "phase", "phase": "news_search",
        "message": "Checking latest news and recent developments...",
    })

    results = await _do_news_search(state)

    await event_bus.emit(run_id, {
        "type": "log", "level": "info",
        "message": f"Found {len(results)} news articles.",
    })

    return {**state, "news_results": results}


async def content_extraction_node(state: ResearchState) -> ResearchState:
    run_id = state["run_id"]
    repo.update_run_status(run_id, "RESEARCH_RUNNING", current_phase="content_extraction")

    all_sources = state.get("web_results", []) + state.get("news_results", [])
    total = len(all_sources)

    await event_bus.emit(run_id, {
        "type": "phase", "phase": "content_extraction",
        "message": f"Reading and extracting content from {total} sources...",
    })

    extracted = []
    # Emit at ~25%, 50%, 75% of extraction regardless of exact count
    milestones = {max(1, int(total * f)) for f in (0.25, 0.50, 0.75)}
    for i, source in enumerate(all_sources):
        content = await _extract_source(source)
        extracted.append(content)
        if (i + 1) in milestones:
            pct = int(20 + (i / max(total, 1)) * 40)  # maps extraction to 20–60% overall
            await event_bus.emit(run_id, {
                "type": "progress",
                "value": pct,
                "message": f"Extracted {i + 1}/{total} sources...",
            })

    return {**state, "extracted_content": extracted}


async def synthesis_node(state: ResearchState) -> ResearchState:
    run_id = state["run_id"]
    repo.update_run_status(run_id, "RESEARCH_RUNNING", current_phase="synthesis")

    await event_bus.emit(run_id, {
        "type": "phase", "phase": "synthesis",
        "message": "Synthesizing findings with AI — typically the longest step (~30–60s)...",
    })

    synthesis = await _run_llm_synthesis(state)

    await event_bus.emit(run_id, {
        "type": "progress", "value": 95,
        "message": "Synthesis complete. Saving results...",
    })

    return {**state, "synthesis": synthesis}
```

**AngleOrchestrator** — angles are fast (~20s) but the user still waits, so give them two events:

```python
# backend/core/orchestrators/angle_orchestrator.py

from backend.infra.events.event_bus import event_bus

class AngleOrchestrator:
    async def run(self, run_id: str, request: AngleGenerationRequest):
        graph = build_angle_graph(self.settings)
        self.repo.update_run_status(run_id, "GENERATING_ANGLES")

        await event_bus.emit(run_id, {
            "type": "phase", "phase": "generating_angles",
            "message": "Generating content angles from research synthesis...",
        })

        result = await graph.ainvoke({
            "run_id": run_id,
            "settings": self.settings,
            "request": request,
        })

        angles = result.get("angles")
        if not angles:
            raise ValueError("Angle graph did not produce angles")

        self.output_manager.save_angles(run_id, angles)
        self.repo.update_run_status(run_id, "ANGLES_COMPLETE")

        await event_bus.emit(run_id, {
            "type": "log", "level": "info",
            "message": f"Generated {len(angles)} content angles.",
        })
        await event_bus.emit(run_id, {"type": "complete", "stage": "angles"})
        return angles
```

**CarouselOrchestrator** — `run_id` is already in `ContentState` via the `ainvoke` args:

```python
# backend/core/orchestrators/carousel_orchestrator.py

from backend.infra.events.event_bus import event_bus

class CarouselOrchestrator:
    async def run(self, run_id: str, request: CarouselGenerationRequest):
        graph = build_content_graph(self.settings)
        total = len(request.angle_indices)

        self.repo.update_run_status(
            run_id, "GENERATING_CAROUSELS", total_angles=total, completed_angles=0
        )

        await event_bus.emit(run_id, {
            "type": "phase", "phase": "carousel_start",
            "message": f"Starting carousel generation for {total} angle(s)...",
        })

        for i, angle_index in enumerate(request.angle_indices):
            await event_bus.emit(run_id, {
                "type": "carousel_phase",
                "angle_index": i, "total_angles": total,
                "phase": "slides", "phase_index": 0,
                "message": f"[{i+1}/{total}] Generating slide content via LLM...",
            })

            self.repo.update_run_status(
                run_id, "GENERATING_CAROUSELS",
                current_phase=f"angle_{i}_slides",
                completed_angles=i,
                total_angles=total,
            )

            angles_data = self.output_manager.load_angles(run_id)
            angle = angles_data["angles"][angle_index]

            # run_id is passed in state so nodes can emit directly
            result = await graph.ainvoke({
                "run_id": run_id,
                "angle": angle,
                "angle_index": i,
                "total_angles": total,
                "settings": self.settings,
                "request": request,
            })

            self.repo.update_run_status(
                run_id, "GENERATING_CAROUSELS",
                completed_angles=i + 1, total_angles=total,
            )

            await event_bus.emit(run_id, {
                "type": "angle_complete",
                "angle_index": i, "total_angles": total,
                "message": f"Angle {i+1}/{total} complete.",
            })

        self.repo.update_run_status(run_id, "CONTENT_COMPLETE")
        await event_bus.emit(run_id, {"type": "complete", "stage": "carousels"})
        event_bus.cleanup_run(run_id)  # free in-memory buffer; run is terminal
```

**Content nodes** — `run_id` is now in `ContentState`, no extra field needed:

```python
# backend/core/nodes/content_nodes.py

from backend.infra.events.event_bus import event_bus

async def slide_generation_node(state: ContentState) -> ContentState:
    run_id = state["run_id"]
    angle_index = state.get("angle_index", 0)
    total = state.get("total_angles", 1)

    await event_bus.emit(run_id, {
        "type": "carousel_phase",
        "angle_index": angle_index, "total_angles": total,
        "phase": "slides", "phase_index": 0,
        "message": f"[{angle_index+1}/{total}] LLM generating slide structure...",
    })

    slides = await _generate_slides(state)

    await event_bus.emit(run_id, {
        "type": "log", "level": "info",
        "message": f"Generated {len(slides)} slides.",
    })

    return {**state, "slides": slides}


async def carousel_rendering_node(state: ContentState) -> ContentState:
    run_id = state["run_id"]
    angle_index = state.get("angle_index", 0)
    total = state.get("total_angles", 1)

    await event_bus.emit(run_id, {
        "type": "carousel_phase",
        "angle_index": angle_index, "total_angles": total,
        "phase": "rendering", "phase_index": 1,
        "message": f"[{angle_index+1}/{total}] Rendering {len(state.get('slides', []))} slides via Playwright...",
    })

    images = await _render_carousel(state)

    await event_bus.emit(run_id, {
        "type": "log", "level": "info",
        "message": f"Rendered {len(images)} PNG images.",
    })

    return {**state, "images": images}


async def caption_generation_node(state: ContentState) -> ContentState:
    run_id = state["run_id"]
    angle_index = state.get("angle_index", 0)
    total = state.get("total_angles", 1)

    await event_bus.emit(run_id, {
        "type": "carousel_phase",
        "angle_index": angle_index, "total_angles": total,
        "phase": "captions", "phase_index": 2,
        "message": f"[{angle_index+1}/{total}] Generating caption and hashtags...",
    })

    captions = await _generate_captions(state)
    return {**state, "captions": captions}
```

### Frontend Architecture

#### 1. Single SSE Hook

Delete `useResearchProgress.ts` and `useContentProgress.ts`. Replace with one `usePipelineSSE` hook.

Note: the pipeline page uses three `usePipelineSSE` calls (one per stage). Each opens its own `EventSource` connection to the same endpoint. All three receive the full event stream; each ignores events for other stages. Three persistent connections to one host is well within the browser limit of 6. More importantly, **each connection auto-closes** as soon as its stage's `complete` event fires — so in practice only 1 connection is active at any given time (the currently-running stage's hook). The other two are either waiting (not yet started) or closed (already finished).

```typescript
// frontend/hooks/usePipelineSSE.ts

import { useState, useEffect, useRef, useCallback } from "react";

export interface PipelineEvent {
  type: string;
  phase?: string;
  message?: string;
  value?: number;
  level?: "info" | "warn";
  angle_index?: number;
  total_angles?: number;
  phase_index?: number;
  stage?: string;
  status?: string;
  recent_events?: PipelineEvent[];
  timestamp?: string;
}

export interface SSEState {
  status: "idle" | "connecting" | "connected" | "complete" | "error";
  currentPhase: string;
  phaseMessage: string;
  progress: number;          // 0–100, always real (never simulated)
  log: PipelineEvent[];      // last N events for the activity log
  completedAngles: number;
  totalAngles: number;
  error: string | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_LOG = 20;

function carouselProgress(angleIndex: number, phaseIndex: number, total: number): number {
  // Each angle has 3 phases (0=slides, 1=rendering, 2=captions)
  // Total steps = total * 3
  // At angle i, phase j: completed = i*3 + j
  const completed = angleIndex * 3 + phaseIndex;
  return Math.round((completed / (total * 3)) * 100);
}

export function usePipelineSSE(
  runId: string | null,
  stage: "research" | "angles" | "carousels",
  onComplete: () => void
) {
  const [state, setState] = useState<SSEState>({
    status: "idle",
    currentPhase: "",
    phaseMessage: "",
    progress: 0,
    log: [],
    completedAngles: 0,
    totalAngles: 0,
    error: null,
  });

  // Stable ref so onComplete identity changes don't re-open EventSource
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!runId) return;

    setState(prev => ({ ...prev, status: "connecting" }));
    const es = new EventSource(`${BASE_URL}/api/v1/pipeline/${runId}/events`);

    es.onopen = () => {
      setState(prev => ({ ...prev, status: "connected" }));
    };

    es.onmessage = (ev) => {
      const data: PipelineEvent = JSON.parse(ev.data);

      setState(prev => {
        const newLog = [data, ...prev.log].slice(0, MAX_LOG);

        switch (data.type) {
          case "init": {
            // Restore from recent events buffer on reconnect.
            // Walk backwards to find the most recent phase event (not a log/progress event)
            // so we restore currentPhase correctly — a log event has no `phase` field.
            const recent = data.recent_events ?? [];
            const lastPhaseEvent = [...recent].reverse().find(e => e.type === "phase" || e.type === "carousel_phase");
            const lastProgressEvent = [...recent].reverse().find(e => e.type === "progress");
            return {
              ...prev,
              status: "connected",
              currentPhase: lastPhaseEvent?.phase ?? prev.currentPhase,
              phaseMessage: lastPhaseEvent?.message ?? lastProgressEvent?.message ?? prev.phaseMessage,
              progress: Math.max(prev.progress, lastProgressEvent?.value ?? 0),
              log: [...recent, ...prev.log].slice(0, MAX_LOG),
            };
          }

          case "phase":
            return {
              ...prev,
              currentPhase: data.phase ?? prev.currentPhase,
              phaseMessage: data.message ?? prev.phaseMessage,
              log: newLog,
            };

          case "progress":
            return {
              ...prev,
              // Never go backwards — real server values only
              progress: Math.max(prev.progress, data.value ?? prev.progress),
              phaseMessage: data.message ?? prev.phaseMessage,
              log: newLog,
            };

          case "log":
            return { ...prev, log: newLog };

          case "angle_complete": {
            const done = (data.angle_index ?? 0) + 1;
            const total = data.total_angles ?? prev.totalAngles;
            return {
              ...prev,
              completedAngles: done,
              totalAngles: total,
              // Progress after angle completes = (done / total) * 100
              progress: Math.round((done / total) * 100),
              phaseMessage: data.message ?? prev.phaseMessage,
              log: newLog,
            };
          }

          case "carousel_phase": {
            const total = data.total_angles ?? prev.totalAngles || 1;
            const pct = carouselProgress(
              data.angle_index ?? 0,
              data.phase_index ?? 0,
              total
            );
            return {
              ...prev,
              totalAngles: total,
              currentPhase: `angle_${data.angle_index}_${data.phase}`,
              phaseMessage: data.message ?? prev.phaseMessage,
              progress: Math.max(prev.progress, pct),
              log: newLog,
            };
          }

          case "complete":
            if (data.stage === stage) {
              setTimeout(() => onCompleteRef.current(), 300);
              return { ...prev, status: "complete", progress: 100, log: newLog };
            }
            return { ...prev, log: newLog };

          case "error":
            return {
              ...prev,
              status: "error",
              error: data.message ?? "Unknown error",
              log: newLog,
            };

          default:
            return { ...prev, log: newLog };
        }
      });
    };

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setState(prev => ({
          ...prev,
          status: "error",
          error: "Lost connection to server. The run may still be processing.",
        }));
      }
      // If readyState !== CLOSED, EventSource is retrying automatically — do nothing
    };

    return () => {
      es.close();
    };
  }, [runId, stage]); // stage is stable; onComplete is captured via ref

  return state;
}
```

#### 2. Replace the Two Polling Hooks

```typescript
// frontend/app/pipeline/page.tsx (updated diff)

// Before:
const researchProgress = useResearchProgress(runId, isResearchRunning, handleResearchComplete);
const contentProgress = useContentProgress(runId, isContentRunning, handleCarouselsComplete);

// After — no isRunning flag needed, connection opens when runId exists:
const researchSSE = usePipelineSSE(pipelineState.runId, "research", handleResearchComplete);
const contentSSE = usePipelineSSE(pipelineState.runId, "carousels", handleCarouselsComplete);

// Also: the ad-hoc angle polling in handleGenerateAngles() can be replaced:
const anglesSSE = usePipelineSSE(pipelineState.runId, "angles", handleAnglesComplete);
// (onComplete fires when the angles "complete" event arrives for stage="angles")
```

The `isRunning` boolean flags that currently gate polling can be removed. The SSE connection opens as soon as `runId` is set; it closes automatically when the `complete` or `error` event arrives.

#### 3. Progress Display Component

The current `PipelineStepCard` shows one text line and a thin bar. Enhance the running state with the activity log:

```
┌──────────────────────────────────────────────────────────────────┐
│  ◉  Stage 1: Research                               [1m 24s]    │
│  ──────────────────────────────────────────────────────────────  │
│  ████████████████████████░░░░░░░░░░░  62%                        │
│                                                                    │
│  🔵 Synthesizing findings with AI — typically the longest         │
│     step (~30–60s)...                                             │
│                                                                    │
│  Activity                                                          │
│  ✓  Found 8 web sources.                                          │
│  ✓  Found 4 news articles.                                        │
│  ✓  Extracted 12/12 sources.                                      │
│  ⟳  Running LLM synthesis...                                     │
└──────────────────────────────────────────────────────────────────┘
```

```tsx
// frontend/components/pipeline/ProgressDisplay.tsx

import type { PipelineEvent } from "@/hooks/usePipelineSSE";

interface ProgressDisplayProps {
  progress: number;
  phaseMessage: string;
  log: PipelineEvent[];
}

export function ProgressDisplay({ progress, phaseMessage, log }: ProgressDisplayProps) {
  const visibleLog = log.filter(e => e.type === "log" || e.type === "phase").slice(0, 6);

  return (
    <div className="mt-4 space-y-3">
      {/* Progress bar — real values from SSE, never simulated */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-blue-300 truncate pr-2">{phaseMessage}</span>
          <span className="text-white/40 shrink-0">{progress}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Activity log */}
      {visibleLog.length > 0 && (
        <div className="pt-1">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-1.5">Activity</p>
          <div className="space-y-1">
            {visibleLog.map((event, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-white/30 shrink-0 mt-0.5">
                  {i === 0 ? "⟳" : "✓"}
                </span>
                <span className="text-white/50 leading-relaxed">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Architecture Diagram (Proposed)

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend                                                           │
│                                                                     │
│  usePipelineSSE(runId, "research", onDone)                          │
│    └── EventSource("/pipeline/{id}/events") ──────────────────────┼─→ 1 persistent connection
│                                                                     │
│  usePipelineSSE(runId, "carousels", onDone)                         │
│    └── EventSource("/pipeline/{id}/events") ──────────────────────┼─→ 1 persistent connection
│                                                                     │
│  ProgressDisplay — renders real events, zero simulation            │
└────────────────────────────────────────────────────────────────────┘
         ↑↑ events pushed instantly, <100ms latency ↑↑

┌────────────────────────────────────────────────────────────────────┐
│  Backend                                                            │
│                                                                     │
│  GET /pipeline/{id}/events → EventBus.subscribe(run_id)            │
│    (asyncio generator keeps HTTP response open)                     │
│                                                                     │
│  BackgroundTask: ResearchOrchestrator                               │
│    → emit("phase: initializing")                                    │
│    → web_search_node   → emit("phase: web_search")                 │
│                         emit("log: Found 8 sources")               │
│    → news_search_node  → emit("phase: news_search")                │
│                         emit("log: Found 4 articles")              │
│    → extraction_node   → emit("phase: content_extraction")         │
│                         emit("progress: 35%")  ← milestone         │
│                         emit("progress: 52%")  ← milestone         │
│    → synthesis_node    → emit("phase: synthesis")                  │
│                         emit("progress: 95%")                      │
│    → emit("complete: research")                                     │
│                                                                     │
│  BackgroundTask: CarouselOrchestrator                               │
│    → emit("carousel_phase: angle=0, phase=slides")                 │
│    → slide_generation_node  → emit("carousel_phase: rendering")    │
│    → rendering_node         → emit("carousel_phase: captions")     │
│    → caption_node           → emit("angle_complete: 1/3")          │
│    → [repeat for angles 2, 3]                                       │
│    → emit("complete: carousels")                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Progress Values: Real, Not Simulated

### Research Phase Progress Map

| Event | `progress.value` | What's happening |
|-------|-----------------|-----------------|
| initializing | 2% | Just started |
| web_search phase | 5% | First real work begins |
| web_search log ("Found N sources") | 20% | ~15–20s in |
| news_search phase | 22% | |
| news_search log | 30% | |
| content_extraction phase | 32% | |
| Extraction milestone: 25% of sources | ~38% | |
| Extraction milestone: 50% of sources | ~48% | |
| Extraction milestone: 75% of sources | ~58% | |
| synthesis phase | 68% | |
| synthesis "complete" (after LLM) | 95% | Saving to disk |
| `complete: research` | 100% | Done |

### Carousel Phase Progress Math

Each angle has 3 sub-phases (slides=0, rendering=1, captions=2). With N total angles, the overall progress for angle `i` starting phase `j` is:

```
progress = floor( (i * 3 + j) / (N * 3) * 100 )
```

**Example — 3 angles (N=3), total steps = 9:**

| Angle | Phase | Formula | Progress |
|-------|-------|---------|---------|
| 0 | slides (j=0) | (0*3+0)/(3*3) | 0% |
| 0 | rendering (j=1) | (0*3+1)/9 | 11% |
| 0 | captions (j=2) | (0*3+2)/9 | 22% |
| angle_complete (0) | — | 1/3 | 33% |
| 1 | slides (j=0) | (1*3+0)/9 | 33% |
| 1 | rendering (j=1) | (1*3+1)/9 | 44% |
| 1 | captions (j=2) | (1*3+2)/9 | 56% |
| angle_complete (1) | — | 2/3 | 67% |
| 2 | slides (j=0) | (2*3+0)/9 | 67% |
| 2 | rendering (j=1) | (2*3+1)/9 | 78% |
| 2 | captions (j=2) | (2*3+2)/9 | 89% |
| angle_complete (2) | — | 3/3 | 100% |

Nine visible progress movements instead of three coarse jumps.

---

## Handling Edge Cases

### Browser Refresh / Navigation

`EventSource` includes `Last-Event-ID` in the reconnect request. Our SSE endpoint sends incrementing `id:` fields. On reconnect, the `init` event includes the last 10 buffered events from `event_bus.get_recent_events()`, which the frontend replays into its log. The `progress.value` from the most recent progress event restores the bar position accurately.

### Multiple Browser Tabs

The event bus stores a `list[asyncio.Queue]` per `run_id`. Two tabs open two queues on the same run. Both receive all events independently. This is correct behaviour with no extra code.

### Run Already Complete

If `EventSource` connects to a run that is already in `RESEARCH_COMPLETE` / `CONTENT_COMPLETE` / `COMPLETE`, the `init` event carries the terminal status. The `event_generator` detects this and immediately emits a `complete` event then closes the stream. The frontend transitions to the complete state in <1 second without waiting.

### FastAPI Process Restart

If the backend restarts mid-operation, the background task is lost and the in-memory event bus is cleared. The frontend's `EventSource` will reconnect (built-in retry). On reconnect, it receives the DB-backed `init` event with the last known status. This is a known limitation of in-process background tasks — the same issue exists today with polling. Fixing it properly requires a persistent task queue (ARQ, Celery) which is out of scope here.

### Nginx / Proxy Buffering

SSE requires responses to flow through without buffering. `X-Accel-Buffering: no` handles Nginx. If deploying behind another proxy, similar headers may be needed. The 30-second keep-alive comment prevents proxy timeout disconnects.

---

## What Gets Deleted

| File / Code | Action |
|-------------|--------|
| `frontend/hooks/useResearchProgress.ts` | **Delete** — replaced by `usePipelineSSE` |
| `frontend/hooks/useContentProgress.ts` | **Delete** — replaced by `usePipelineSSE` |
| `Math.min(prev.progress + 3, 90)` in progress hooks | **Delete** — the simulated increment |
| `Math.min(state.progress + 2, 90)` in progress hooks | **Delete** — the simulated increment |
| Frontend `setTimeout` polling loops | **Delete** from `pipeline/page.tsx` and both hooks |
| `GET /api/v1/content/{run_id}/carousel-progress` endpoint | **Delete** — superseded by SSE |

> **Do NOT delete** `GET /api/v1/pipeline/{run_id}/status`. It is still needed for:
> - `useRecoverRun` hook (resuming runs after page navigation)
> - Initial run status check when loading an existing run
> - Non-SSE clients and automated tooling

---

## What Gets Added

### New files

| File | Purpose |
|------|---------|
| `backend/infra/events/__init__.py` | Package init |
| `backend/infra/events/event_bus.py` | In-memory async event bus with reconnect buffer |
| `frontend/hooks/usePipelineSSE.ts` | Replaces both progress hooks |
| `frontend/components/pipeline/ProgressDisplay.tsx` | Rich progress bar + activity log |

### Modified files

| File | Change |
|------|--------|
| `backend/apps/api/routes.py` | Add `GET /pipeline/{id}/events` SSE endpoint |
| `backend/core/orchestrators/research_orchestrator.py` | Add `event_bus.emit()` at start and complete |
| `backend/core/orchestrators/angle_orchestrator.py` | Add `event_bus.emit()` at start and complete |
| `backend/core/orchestrators/carousel_orchestrator.py` | Add `event_bus.emit()` per-angle and at complete |
| `backend/core/nodes/research_nodes.py` | Add `event_bus.emit()` in each of 4 nodes |
| `backend/core/nodes/content_nodes.py` | Add `event_bus.emit()` in each of 3 nodes |
| `backend/core/schemas/contracts.py` | Add `run_id`, `angle_index`, `total_angles` to `ContentState` if not present |
| `frontend/app/pipeline/page.tsx` | Replace hook usage, remove polling flags, use `ProgressDisplay` |
| `frontend/components/pipeline/PipelineStepCard.tsx` | Use `ProgressDisplay` in running state |

---

## Implementation Plan

### Phase 1 — Backend plumbing (1 day)

1. Create `backend/infra/events/event_bus.py`
2. Add `GET /pipeline/{run_id}/events` SSE endpoint to `routes.py`
3. Add `event_bus.emit()` calls to `ResearchOrchestrator` (start + complete)
4. Smoke test: `curl -N http://localhost:8000/api/v1/pipeline/{id}/events` while research runs — confirm events stream in terminal

### Phase 2 — Research nodes (half day)

5. Add emit calls to all 4 research nodes with phase names, counts, milestone progress
6. Confirm research phase shows 8+ events in the curl stream
7. Test: open the pipeline page, start research, verify progress bar moves in real steps and never simulates

### Phase 3 — Angles + Carousel orchestrator and nodes (half day)

8. Add emit calls to `AngleOrchestrator`
9. Add emit calls to `CarouselOrchestrator` — per-angle start + complete
10. Add emit calls to `slide_generation_node`, `carousel_rendering_node`, `caption_generation_node`
11. **Verify `ContentState` schema includes `run_id`, `angle_index`, `total_angles`** — LangGraph passes these via the `ainvoke` dict but they must be declared in the Pydantic model to avoid validation errors. If they are missing, add them as `Optional[int] = None` fields to `ContentState` in `contracts.py`. Note: `run_id` may already be present (it's in `ResearchState`); verify before adding.

### Phase 4 — Frontend (1 day)

12. Write `frontend/hooks/usePipelineSSE.ts`
13. Write `frontend/components/pipeline/ProgressDisplay.tsx`
14. Update `frontend/app/pipeline/page.tsx` — replace polling hooks, remove `isRunning` flags
15. Delete `useResearchProgress.ts` and `useContentProgress.ts`
16. Test: full pipeline run with 2–3 angles, verify bar moves through all intermediate steps

### Phase 5 — Polish (half day)

17. Add elapsed time counter in `PipelineStepCard` header
18. Test reconnect: start research, navigate away, navigate back — verify progress restores from buffer
19. Confirm "already complete" fast-path works when opening a finished run
20. Delete `GET /api/v1/content/{run_id}/carousel-progress` endpoint
21. **(Future enhancement)** Read `Last-Event-ID` request header in the SSE endpoint and replay buffered events starting after that ID, instead of the flat 10-event `init` dump. This gives precise gap-free replay after transient network blips. Not required for v1 — the `init` restore is sufficient.

---

## Why Not WebSockets?

WebSocket is bidirectional and more complex to manage. For this use case (server → client only), SSE is the correct tool:

| | SSE | WebSocket |
|--|-----|-----------|
| Direction | Server → client | Bidirectional |
| Auto-reconnect | **Built into `EventSource`** | Must implement manually |
| HTTP/2 support | ✅ Multiplexed natively | Separate TCP connection |
| Setup complexity | 1 `StreamingResponse` | Needs `websockets` lib + handshake |
| Appropriate here? | ✅ Yes | Overkill |

---

## Summary

| | Before (polling) | After (SSE) |
|--|--------|-------|
| Progress accuracy | Simulated arithmetic | Real values from pipeline events |
| Progress can go backwards | Yes (on component remount) | No |
| Research visibility | 5 phase strings from DB | 12+ rich events with counts and % |
| Carousel sub-step visibility | Zero (silent for 60–90s) | 9 movements for 3 angles |
| Text messages | Only `current_phase` raw string | Rich contextual messages per node |
| HTTP connections per operation | 30–60 round-trips (polling) | 2 persistent connections |
| Frontend progress code | ~120 lines, two hooks, timers | ~80 lines, one hook, no timers |
| User trust in the loader | Low | High |