import { createSlice } from "@reduxjs/toolkit";
import { ResearchResponse, AngleResponse, ContentResponse, AttachedEvidence } from "@/lib/api";
import { configReducers } from "./pipelineReducers/configReducers";
import { budgetReducers } from "./pipelineReducers/budgetReducers";
import { discoveryReducers } from "./pipelineReducers/discoveryReducers";
import { evidenceReducers } from "./pipelineReducers/evidenceReducers";
import { stageReducers } from "./pipelineReducers/stageReducers";
import { resultReducers } from "./pipelineReducers/resultReducers";

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

export interface PipelineState {
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
    ...configReducers,
    ...budgetReducers,
    ...discoveryReducers,
    ...evidenceReducers,
    ...stageReducers,
    ...resultReducers,
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
