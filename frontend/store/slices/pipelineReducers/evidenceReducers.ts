import { PayloadAction } from "@reduxjs/toolkit";
import type { AttachedEvidence } from "@/lib/api";
import type { PipelineState } from "../pipelineSlice";

export const evidenceReducers = {
  addAttachedEvidence: (state: PipelineState, action: PayloadAction<AttachedEvidence>) => {
    state.attachedEvidence.push(action.payload);
  },
  removeAttachedEvidence: (state: PipelineState, action: PayloadAction<string>) => {
    state.attachedEvidence = state.attachedEvidence.filter(e => e.id !== action.payload);
  },
  clearAttachedEvidence: (state: PipelineState) => { state.attachedEvidence = []; },
};
