import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ResearchResponse, AngleResponse, ContentResponse } from "@/lib/api";

export interface PipelineRun {
  runId: string;
  topic: string;
  timestamp: string;
  researchResult: ResearchResponse | null;
  angleResult: AngleResponse | null;
  contentResult: ContentResponse | null;
  config?: {
    mode: string;
    freshness: string;
    angleMode: string;
  };
}

// Lightweight version stored in localStorage — no large response bodies
export interface SlimRun {
  runId:      string;
  topic:      string;
  timestamp:  string;
  status:     string;
  angleCount: number;
  slideCount: number;
  hasBlog:    boolean;
  config?:    { mode: string; freshness: string; angleMode: string };
}

interface HistoryState {
  // Full runs (last FULL_RUN_LIMIT kept in memory with complete response objects)
  runs: PipelineRun[];
  // Slim metadata for older runs — displayed as lazy-load cards
  slimRuns: SlimRun[];
}

const FULL_RUN_LIMIT  = 5;   // keep last N runs fully in memory
const SLIM_RUN_LIMIT  = 100; // keep up to N slim entries in localStorage

function toSlim(run: PipelineRun): SlimRun {
  return {
    runId:      run.runId,
    topic:      run.topic,
    timestamp:  run.timestamp,
    status:     run.contentResult?.status ?? run.angleResult?.status ?? "partial",
    angleCount: run.angleResult?.selected_angles?.length ?? 0,
    slideCount: (run.contentResult?.carousel_paths ?? []).flat().length,
    hasBlog:    !!(run.contentResult?.blog_post_path),
    config:     run.config,
  };
}

function saveToLocalStorage(runs: PipelineRun[], slimRuns: SlimRun[]): void {
  if (typeof window === "undefined") return;
  try {
    // Store only slim metadata — never the full response objects
    const allSlim: SlimRun[] = [
      ...runs.map(toSlim),
      ...slimRuns.filter(s => !runs.some(r => r.runId === s.runId)),
    ].slice(0, SLIM_RUN_LIMIT);
    localStorage.setItem("pipeline_history", JSON.stringify(allSlim));
  } catch (e) {
    console.warn("pipeline_history: localStorage write failed.", e);
  }
}

function loadFromLocalStorage(): HistoryState {
  if (typeof window === "undefined") return { runs: [], slimRuns: [] };
  try {
    const saved = localStorage.getItem("pipeline_history");
    if (!saved) return { runs: [], slimRuns: [] };
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return { runs: [], slimRuns: [] };

    // Migration: older format stored full PipelineRun objects (with researchResult etc.)
    // Detect by checking if first item has researchResult key — if so, slim it down.
    const needsMigration = parsed.length > 0 && "researchResult" in parsed[0];
    if (needsMigration) {
      const slimmed: SlimRun[] = parsed.map((r: any) => ({
        runId:      r.runId ?? r.run_id ?? "",
        topic:      r.topic ?? "",
        timestamp:  r.timestamp ?? new Date().toISOString(),
        status:     r.contentResult?.status ?? "partial",
        angleCount: r.angleResult?.selected_angles?.length ?? 0,
        slideCount: (r.contentResult?.carousel_paths ?? []).flat().length,
        hasBlog:    !!(r.contentResult?.blog_post_path),
        config:     r.config,
      })).filter((r: SlimRun) => r.runId);
      // Overwrite with slim version immediately
      try { localStorage.setItem("pipeline_history", JSON.stringify(slimmed)); } catch { localStorage.removeItem("pipeline_history"); }
      return { runs: [], slimRuns: slimmed };
    }

    return { runs: [], slimRuns: parsed as SlimRun[] };
  } catch {
    return { runs: [], slimRuns: [] };
  }
}

const initialState: HistoryState = loadFromLocalStorage();

export const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    // Called after a successful pipeline run — full object, kept in memory
    addRun: (state, action: PayloadAction<PipelineRun>) => {
      state.runs = state.runs.filter(r => r.runId !== action.payload.runId);
      state.runs.unshift(action.payload);
      // Keep only FULL_RUN_LIMIT full runs in memory; rest demote to slim
      if (state.runs.length > FULL_RUN_LIMIT) {
        const demoted = state.runs.splice(FULL_RUN_LIMIT);
        demoted.forEach(r => {
          if (!state.slimRuns.some(s => s.runId === r.runId)) {
            state.slimRuns.unshift(toSlim(r));
          }
        });
        if (state.slimRuns.length > SLIM_RUN_LIMIT) {
          state.slimRuns.splice(SLIM_RUN_LIMIT);
        }
      }
      // Remove from slimRuns if it was there
      state.slimRuns = state.slimRuns.filter(s => !state.runs.some(r => r.runId === s.runId));
      saveToLocalStorage(state.runs, state.slimRuns);
    },

    // Called when a slim run is hydrated on demand (user clicks Load)
    hydrateRun: (state, action: PayloadAction<PipelineRun>) => {
      // Move to full runs, demote oldest full run if needed
      state.runs = state.runs.filter(r => r.runId !== action.payload.runId);
      state.runs.unshift(action.payload);
      if (state.runs.length > FULL_RUN_LIMIT) {
        const demoted = state.runs.splice(FULL_RUN_LIMIT);
        demoted.forEach(r => {
          if (!state.slimRuns.some(s => s.runId === r.runId)) {
            state.slimRuns.unshift(toSlim(r));
          }
        });
      }
      // Remove from slimRuns now that it's fully loaded
      state.slimRuns = state.slimRuns.filter(s => s.runId !== action.payload.runId);
      saveToLocalStorage(state.runs, state.slimRuns);
    },

    // Called when recovering an orphaned server run — same as hydrateRun
    addSlimRun: (state, action: PayloadAction<SlimRun>) => {
      if (!state.slimRuns.some(s => s.runId === action.payload.runId) &&
          !state.runs.some(r => r.runId === action.payload.runId)) {
        state.slimRuns.unshift(action.payload);
        if (state.slimRuns.length > SLIM_RUN_LIMIT) state.slimRuns.splice(SLIM_RUN_LIMIT);
        saveToLocalStorage(state.runs, state.slimRuns);
      }
    },

    clearHistory: (state) => {
      state.runs = [];
      state.slimRuns = [];
      if (typeof window !== "undefined") {
        localStorage.removeItem("pipeline_history");
      }
    },
  },
});

export const { addRun, hydrateRun, addSlimRun, clearHistory } = historySlice.actions;
export default historySlice.reducer;
