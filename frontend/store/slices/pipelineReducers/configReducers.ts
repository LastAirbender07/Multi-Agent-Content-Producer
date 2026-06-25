import { PayloadAction } from "@reduxjs/toolkit";
import type { PipelineState } from "../pipelineSlice";

export const configReducers = {
  setTopic: (state: PipelineState, action: PayloadAction<string>) => {
    // Clear discovery state when topic is manually changed to something different
    if (action.payload !== state.topic) {
      state.preprocessedQueries = [];
      state.discoveryArticle = null;
    }
    state.topic = action.payload;
  },
  setMode: (state: PipelineState, action: PayloadAction<PipelineState["mode"]>) => {
    state.mode = action.payload;
  },
  setFreshness: (state: PipelineState, action: PayloadAction<PipelineState["freshness"]>) => {
    state.freshness = action.payload;
  },
  setAngleMode: (state: PipelineState, action: PayloadAction<PipelineState["angleMode"]>) => {
    state.angleMode = action.payload;
  },
  setImageSource: (state: PipelineState, action: PayloadAction<PipelineState["imageSource"]>) => {
    state.imageSource = action.payload;
  },
  setLlmResearchMode: (state: PipelineState, action: PayloadAction<boolean>) => {
    state.llmResearchMode = action.payload;
  },
};
