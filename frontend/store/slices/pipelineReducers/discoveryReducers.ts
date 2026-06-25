import { PayloadAction } from "@reduxjs/toolkit";
import type { PipelineState } from "../pipelineSlice";

interface DiscoveryArticle {
  title: string;
  snippet: string;
  url: string;
  category: string;
}

export const discoveryReducers = {
  setDiscoverUrl: (state: PipelineState, action: PayloadAction<string | null>) => { state.discoverUrl = action.payload; },
  setDiscoveryArticle: (state: PipelineState, action: PayloadAction<DiscoveryArticle | null>) => {
    state.discoveryArticle = action.payload;
  },
  setPreprocessedQueries: (state: PipelineState, action: PayloadAction<string[]>) => {
    state.preprocessedQueries = action.payload;
  },
};
