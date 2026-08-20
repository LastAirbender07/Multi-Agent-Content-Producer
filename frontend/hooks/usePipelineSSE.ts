"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { ASSET_BASE } from "@/lib/api";

export interface SSEProgressEvent {
  phase: string;
  pct: number;
  message: string;
  detail?: string;
  ts?: number; // client-side timestamp added on arrival
}

export interface SSEState {
  phase: string;
  pct: number;
  message: string;
  detail?: string;
  connected: boolean;
  done: boolean;
  error: string | null;
  events: SSEProgressEvent[];
  elapsedMs: number;
  startedAt: number | null;
}

const INITIAL: SSEState = {
  phase: "idle",
  pct: 0,
  message: "",
  detail: undefined,
  connected: false,
  done: false,
  error: null,
  events: [],
  elapsedMs: 0,
  startedAt: null,
};

export function usePipelineSSE(
  runId: string | null,
  type: "research" | "content",
  active: boolean
): SSEState {
  const [state, setState] = useState<SSEState>(INITIAL);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  // Track the last runId that actually started an SSE session so we can reset
  // when a genuinely new run begins (different run_id).
  const lastConnectedRunId = useRef<string | null>(null);

  // tick the elapsed timer every second
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    startedAtRef.current = Date.now();
    setState((s) => ({ ...s, startedAt: startedAtRef.current }));
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      setState((s) => ({ ...s, elapsedMs: elapsed }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // ── Gate: only connect when active and runId are both present ────────────
    if (!active || !runId) {
      // DO NOT reset state when active becomes false — preserve the last SSE
      // progress so the card continues to show phase steps, activity log, and
      // the "Done" badge after content finishes.
      //
      // State is only reset (below) when a new runId is detected, which means
      // a genuinely new pipeline run has started.
      return;
    }

    // ── Reset state when a new run starts (different runId) ──────────────────
    if (runId !== lastConnectedRunId.current && lastConnectedRunId.current !== null) {
      setState(INITIAL);
    }
    lastConnectedRunId.current = runId;

    // Use the backend directly (same origin as api/client.ts BASE).
    // Relative URLs would hit the Next.js server which has no /api/v1 proxy.
    const url = `${ASSET_BASE}/api/v1/${type}/${runId}/events`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      startTimer();
      setState((s) => ({ ...s, connected: true, error: null }));
    };

    es.onmessage = (e: MessageEvent) => {
      try {
        const raw: SSEProgressEvent = JSON.parse(e.data);
        const event = { ...raw, ts: Date.now() };

        const isDone = event.phase === "complete" || event.phase === "error";

        setState((prev) => ({
          ...prev,
          phase: event.phase ?? prev.phase,
          // Clamp pct to never go backwards — prevents visual regression during
          // research synthesis/refine loops where backend emits lower pct values.
          pct: Math.max(prev.pct, event.pct ?? prev.pct),
          message: event.message ?? prev.message,
          detail: event.detail,
          done: isDone,
          connected: !isDone ? prev.connected : false,
          events: [event, ...prev.events].slice(0, 100),
        }));

        // Close the EventSource proactively when run finishes.
        // The server also sends a None sentinel that closes the HTTP stream,
        // but closing from the client side ensures we don't auto-reconnect.
        if (isDone) {
          stopTimer();
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setState((s) => ({ ...s, connected: false, error: "Stream disconnected" }));
      stopTimer();
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
      stopTimer();
    };
  }, [runId, type, active, startTimer, stopTimer]);

  return state;
}