import { PayloadAction } from "@reduxjs/toolkit";
import type { PipelineState, StageStatus } from "../pipelineSlice";
import type { PipelineRun } from "../historySlice";

export const stageReducers = {
  setStageStatus: (state: PipelineState, action: PayloadAction<{ stage: keyof PipelineState["stages"]; status: StageStatus }>) => {
    state.stages[action.payload.stage].status = action.payload.status;
  },
  resetPipeline: (state: PipelineState) => {
    // PRESERVED: user config (topic, mode, freshness, angleMode, imageSource, all
    //   budget knobs, llmResearchMode, discoveryArticle, discoverUrl, attachedEvidence,
    //   preprocessedQueries). These survive a re-run so the user can tweak and re-submit.
    // CLEARED: run results (researchResult, angleResult, contentResult), stage statuses,
    //   errors, runId. These are tied to a specific run and must be reset for each new run.
    state.researchResult = null;
    state.angleResult = null;
    state.contentResult = null;
    state.errors = [];
    state.runId = null;
    state.stages = {
      research: { status: "idle", result: null },
      angle: { status: "idle", result: null },
      content: { status: "idle", result: null },
    };
  },
  loadRun: (state: PipelineState, action: PayloadAction<PipelineRun>) => {
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
};
