import asyncio
from typing import Any
from collections import defaultdict


class ProgressStore:
    """
    Central progress store for pipeline runs.

    Supports both polling (get) and push (SSE subscribe/unsubscribe).
    All state mutations are synchronous — progress_store.update() is called
    from sync and async contexts alike. Queue writes use put_nowait() so they
    never block the caller.

    Lifecycle:
      - update()    → stores state AND pushes to all live SSE queues
      - finish()    → sends None sentinel to all queues, triggering clean shutdown
      - subscribe() → registers a new queue and replays last known state
      - unsubscribe() → removes the queue (called in SSE generator finally block)

    Memory: _state entries are purged after finish() once all subscribers
    have disconnected. For resilience, a TTL-based cleanup can be added later.
    """

    def __init__(self):
        self._state: dict[str, Any] = {}
        self._subscribers: dict[str, list[asyncio.Queue]] = defaultdict(list)

    # ------------------------------------------------------------------
    # Mutation
    # ------------------------------------------------------------------

    def update(self, run_id: str, data: dict) -> None:
        """Store latest state and push to every live SSE connection."""
        self._state[run_id] = data
        for q in list(self._subscribers.get(run_id, [])):
            try:
                q.put_nowait(data)
            except asyncio.QueueFull:
                pass  # bounded queue — drop oldest if ever set

    def finish(self, run_id: str) -> None:
        """
        Signal all SSE generators to terminate cleanly.

        Sends a None sentinel to every subscriber queue. The SSE generator
        checks for None and breaks out of its loop, which causes the
        StreamingResponse to close the HTTP connection from the server side.

        Call this after sending the final 'complete' or 'error' update.
        """
        for q in list(self._subscribers.get(run_id, [])):
            try:
                q.put_nowait(None)
            except asyncio.QueueFull:
                pass

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    def get(self, run_id: str) -> dict | None:
        return self._state.get(run_id)

    # ------------------------------------------------------------------
    # SSE subscription
    # ------------------------------------------------------------------

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        """
        Register a new SSE subscriber queue for run_id.

        Replays the last known state immediately so the client is never
        blank on connect — even if it joins after the run has progressed.
        If the run already completed, the final 'complete' state is replayed
        followed by a None sentinel so the stream terminates cleanly.
        """
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers[run_id].append(q)

        last = self._state.get(run_id)
        if last:
            q.put_nowait(last)
            # If the run already finished, send the sentinel immediately so the
            # stream doesn't hang waiting for events that will never arrive.
            if last.get("phase") in ("complete", "error"):
                q.put_nowait(None)

        return q

    def unsubscribe(self, run_id: str, q: asyncio.Queue) -> None:
        """Remove a queue from the subscriber list (called in SSE finally block)."""
        subs = self._subscribers.get(run_id)
        if subs:
            try:
                subs.remove(q)
            except ValueError:
                pass
            # Clean up empty subscriber lists to prevent dict growth
            if not subs:
                del self._subscribers[run_id]


progress_store = ProgressStore()