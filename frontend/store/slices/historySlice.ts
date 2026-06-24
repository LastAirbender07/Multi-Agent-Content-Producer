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

interface HistoryState {
  runs: PipelineRun[];
}

// Helper to load from localStorage
const loadFromLocalStorage = (): HistoryState => {
  if (typeof window === "undefined") return { runs: [] };
  const saved = localStorage.getItem("pipeline_history");
  return saved ? JSON.parse(saved) : { runs: [] };
};

const initialState: HistoryState = loadFromLocalStorage();

export const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    addRun: (state, action: PayloadAction<PipelineRun>) => {
      // Remove if exists (to move to top)
      state.runs = state.runs.filter(r => r.runId !== action.payload.runId);
      state.runs.unshift(action.payload);
      // Limit to 20 runs
      if (state.runs.length > 20) state.runs.pop();
      
      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("pipeline_history", JSON.stringify(state));
      }
    },
    clearHistory: (state) => {
      state.runs = [];
      if (typeof window !== "undefined") {
        localStorage.removeItem("pipeline_history");
      }
    },
  },
});

export const { addRun, clearHistory } = historySlice.actions;
export default historySlice.reducer;
