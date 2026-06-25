import { PayloadAction } from "@reduxjs/toolkit";
import type { ResearchResponse, AngleResponse, ContentResponse } from "@/lib/api";
import type { PipelineState } from "../pipelineSlice";

export const resultReducers = {
  setRunId: (state: PipelineState, action: PayloadAction<string>) => {
    state.runId = action.payload;
  },
  setResearchResult: (state: PipelineState, action: PayloadAction<ResearchResponse>) => {
    state.researchResult = action.payload;
    state.runId = action.payload.run_id;
  },
  setAngleResult: (state: PipelineState, action: PayloadAction<AngleResponse>) => {
    state.angleResult = action.payload;
  },
  setContentResult: (state: PipelineState, action: PayloadAction<ContentResponse>) => {
    state.contentResult = action.payload;
  },
  setErrors: (state: PipelineState, action: PayloadAction<string[]>) => {
    state.errors = action.payload;
  },
};
