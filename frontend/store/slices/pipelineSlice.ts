import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ResearchResponse, AngleResponse, ContentResponse, Angle, AttachedEvidence } from "@/lib/api";
import { PipelineRun } from "./historySlice";

export type StageStatus = "idle" | "running" | "done" | "error";

interface StageState {
  status: StageStatus;
  result: any;
}

interface DiscoveryArticle {
  title: string;
  snippet: string;
  url: string;
  category: string;
}

interface PipelineState {
  topic: string;
  mode: "quick" | "standard" | "deep";
  freshness: "breaking" | "recent" | "evergreen";
  angleMode: "auto" | "manual";
  imageSource: "auto" | "pexels" | "ddgs";
  llmResearchMode: boolean;
  preprocessedQueries: string[];
  discoveryArticle: DiscoveryArticle | null;
  discoverUrl: string | null;
  attachedEvidence: AttachedEvidence[];

  // Budget controls
  maxTools: number;
  maxSources: number;
  maxLoops: number;
  maxSlides: number;
  minSlides: number;
  maxCrawlUrls: number;

  // Content controls
  maxAnglesSelect: number;
  needsClaimVerification: boolean;

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
  preprocessedQueries: [],
  discoveryArticle: null,
  discoverUrl: null,
  attachedEvidence: [],

  maxTools: 6,
  maxSources: 15,
  maxLoops: 2,
  maxSlides: 12,
  minSlides: 4,
  maxCrawlUrls: 3,
  maxAnglesSelect: 3,
  needsClaimVerification: false,

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
      // Clear discovery state when topic is manually changed to something different
      if (action.payload !== state.topic) {
        state.preprocessedQueries = [];
        state.discoveryArticle = null;
      }
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
    setMaxTools: (state, action: PayloadAction<number>) => { state.maxTools = action.payload; },
    setMaxSources: (state, action: PayloadAction<number>) => { state.maxSources = action.payload; },
    setMaxLoops: (state, action: PayloadAction<number>) => { state.maxLoops = action.payload; },
    setMaxSlides: (state, action: PayloadAction<number>) => { state.maxSlides = action.payload; },
    setMinSlides: (state, action: PayloadAction<number>) => { state.minSlides = action.payload; },
    setMaxCrawlUrls: (state, action: PayloadAction<number>) => { state.maxCrawlUrls = action.payload; },
    setMaxAnglesSelect: (state, action: PayloadAction<number>) => { state.maxAnglesSelect = action.payload; },
    setNeedsClaimVerification: (state, action: PayloadAction<boolean>) => { state.needsClaimVerification = action.payload; },
    setDiscoverUrl: (state, action: PayloadAction<string | null>) => { state.discoverUrl = action.payload; },
    addAttachedEvidence: (state, action: PayloadAction<AttachedEvidence>) => {
      state.attachedEvidence.push(action.payload);
    },
    removeAttachedEvidence: (state, action: PayloadAction<string>) => {
      state.attachedEvidence = state.attachedEvidence.filter(e => e.id !== action.payload);
    },
    clearAttachedEvidence: (state) => { state.attachedEvidence = []; },
    setLlmResearchMode: (state, action: PayloadAction<boolean>) => {
      state.llmResearchMode = action.payload;
    },
    setPreprocessedQueries: (state, action: PayloadAction<string[]>) => {
      state.preprocessedQueries = action.payload;
    },
    setDiscoveryArticle: (state, action: PayloadAction<DiscoveryArticle | null>) => {
      state.discoveryArticle = action.payload;
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
      // PRESERVED: user config (topic, mode, freshness, angleMode, imageSource, all
      //   budget knobs, llmResearchMode, discoveryArticle, discoverUrl, attachedEvidence,
      //   preprocessedQueries). These survive a re-run so the user can tweak and re-submit.
      // CLEARED: run results (researchResult, angleResult, contentResult), stage statuses,
      //   errors, runId. These are tied to a specific run and must be reset for each new run.
      return {
        ...initialState,
        topic: state.topic,
        llmResearchMode: state.llmResearchMode,
        preprocessedQueries: state.preprocessedQueries,
        discoveryArticle: state.discoveryArticle,
        // preserve all budget/config settings
        mode: state.mode,
        freshness: state.freshness,
        angleMode: state.angleMode,
        imageSource: state.imageSource,
        maxTools: state.maxTools,
        maxSources: state.maxSources,
        maxLoops: state.maxLoops,
        maxSlides: state.maxSlides,
        minSlides: state.minSlides,
        maxCrawlUrls: state.maxCrawlUrls,
        maxAnglesSelect: state.maxAnglesSelect,
        needsClaimVerification: state.needsClaimVerification,
        discoverUrl: state.discoverUrl,
        attachedEvidence: state.attachedEvidence,
      };
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
      // Restore config fields if they were saved with the run
      if (run.config) {
        if (run.config.mode) state.mode = run.config.mode as PipelineState["mode"];
        if (run.config.freshness) state.freshness = run.config.freshness as PipelineState["freshness"];
        if (run.config.angleMode) state.angleMode = run.config.angleMode as PipelineState["angleMode"];
      }
    },
  },
});

export const {
  setTopic,
  setMode,
  setFreshness,
  setAngleMode,
  setImageSource,
  setMaxTools,
  setMaxSources,
  setMaxLoops,
  setMaxSlides,
  setMinSlides,
  setMaxCrawlUrls,
  setMaxAnglesSelect,
  setNeedsClaimVerification,
  setDiscoverUrl,
  addAttachedEvidence,
  removeAttachedEvidence,
  clearAttachedEvidence,
  setLlmResearchMode,
  setPreprocessedQueries,
  setDiscoveryArticle,
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
