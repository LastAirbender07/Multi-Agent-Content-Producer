import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ResearchResponse, AngleResponse, ContentResponse, Angle } from "@/lib/api";
import { PipelineRun } from "./historySlice";

export type StageStatus = "idle" | "running" | "done" | "error";

interface StageState {
  status: StageStatus;
  result: any;
}

interface PipelineState {
  topic: string;
  mode: "quick" | "standard" | "deep";
  freshness: "breaking" | "recent" | "evergreen";
  angleMode: "auto" | "manual";
  imageSource: "auto" | "pexels" | "ddgs";
  llmResearchMode: boolean;
  
  stages: {
    research: StageState;
    angle: StageState;
    content: StageState;
  };
  
  researchResult: ResearchResponse | null;
  angleResult: AngleResponse | null;
  contentResult: ContentResponse | null;
  
  errors: string[];
  runId: string | null;
}

const initialState: PipelineState = {
  topic: "",
  mode: "standard",
  freshness: "recent",
  angleMode: "manual",
  imageSource: "auto",
  llmResearchMode: false,
  
  stages: {
    research: { status: "idle", result: null },
    angle: { status: "idle", result: null },
    content: { status: "idle", result: null },
  },
  
  researchResult: null,
  angleResult: null,
  contentResult: null,
  
  errors: [],
  runId: null,
};

export const pipelineSlice = createSlice({
  name: "pipeline",
  initialState,
  reducers: {
    setTopic: (state, action: PayloadAction<string>) => {
      state.topic = action.payload;
    },
    setMode: (state, action: PayloadAction<PipelineState["mode"]>) => {
      state.mode = action.payload;
    },
    setFreshness: (state, action: PayloadAction<PipelineState["freshness"]>) => {
      state.freshness = action.payload;
    },
    setAngleMode: (state, action: PayloadAction<PipelineState["angleMode"]>) => {
      state.angleMode = action.payload;
    },
    setImageSource: (state, action: PayloadAction<PipelineState["imageSource"]>) => {
      state.imageSource = action.payload;
    },
    setLlmResearchMode: (state, action: PayloadAction<boolean>) => {
      state.llmResearchMode = action.payload;
    },
    setStageStatus: (state, action: PayloadAction<{ stage: keyof PipelineState["stages"]; status: StageStatus }>) => {
      state.stages[action.payload.stage].status = action.payload.status;
    },
    setRunId: (state, action: PayloadAction<string>) => {
      state.runId = action.payload;
    },
    setResearchResult: (state, action: PayloadAction<ResearchResponse>) => {
      state.researchResult = action.payload;
      state.runId = action.payload.run_id;
    },
    setAngleResult: (state, action: PayloadAction<AngleResponse>) => {
      state.angleResult = action.payload;
    },
    setContentResult: (state, action: PayloadAction<ContentResponse>) => {
      state.contentResult = action.payload;
    },
    setErrors: (state, action: PayloadAction<string[]>) => {
      state.errors = action.payload;
    },
    resetPipeline: (state) => {
      return { ...initialState, topic: state.topic, llmResearchMode: state.llmResearchMode };
    },
    loadRun: (state, action: PayloadAction<PipelineRun>) => {
      const run = action.payload;
      state.topic = run.topic;
      state.runId = run.runId;
      state.researchResult = run.researchResult ?? null;
      state.angleResult = run.angleResult ?? null;
      state.contentResult = run.contentResult ?? null;
      state.stages.research.status = run.researchResult ? "done" : "idle";
      state.stages.angle.status = run.angleResult ? "done" : "idle";
      state.stages.content.status = run.contentResult ? "done" : "idle";
      state.errors = [];
    },
  },
});

export const {
  setTopic,
  setMode,
  setFreshness,
  setAngleMode,
  setImageSource,
  setLlmResearchMode,
  setRunId,
  setStageStatus,
  setResearchResult,
  setAngleResult,
  setContentResult,
  setErrors,
  resetPipeline,
  loadRun,
} = pipelineSlice.actions;

export default pipelineSlice.reducer;
