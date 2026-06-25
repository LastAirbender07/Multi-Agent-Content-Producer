import { PayloadAction } from "@reduxjs/toolkit";
import type { PipelineState } from "../pipelineSlice";

export const budgetReducers = {
  setMaxTools: (state: PipelineState, action: PayloadAction<number>) => { state.maxTools = action.payload; },
  setMaxSources: (state: PipelineState, action: PayloadAction<number>) => { state.maxSources = action.payload; },
  setMaxLoops: (state: PipelineState, action: PayloadAction<number>) => { state.maxLoops = action.payload; },
  setMaxSlides: (state: PipelineState, action: PayloadAction<number>) => { state.maxSlides = action.payload; },
  setMinSlides: (state: PipelineState, action: PayloadAction<number>) => { state.minSlides = action.payload; },
  setMaxCrawlUrls: (state: PipelineState, action: PayloadAction<number>) => { state.maxCrawlUrls = action.payload; },
  setMaxAnglesSelect: (state: PipelineState, action: PayloadAction<number>) => { state.maxAnglesSelect = action.payload; },
  setNeedsClaimVerification: (state: PipelineState, action: PayloadAction<boolean>) => { state.needsClaimVerification = action.payload; },
};
