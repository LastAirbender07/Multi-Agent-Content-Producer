// @ts-nocheck
"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/store/store";
import { setPipelineStage, setPipelineAnglesData } from "@/store/slices/pipelineSlice";
import { usePipelineOrchestration } from "@/hooks/usePipelineOrchestration";
import { PipelineHeader } from "./PipelineHeader";
import { ResearchStageCard } from "./ResearchStageCard";
import { AngleSelectionCard } from "./AngleSelectionCard";
import { CarouselGenerationCard } from "./CarouselGenerationCard";

export function PipelineOrchestrator() {
  const dispatch = useDispatch<AppDispatch>();
  const pipelineState = useSelector((state: RootState) => state.pipeline);
  const { selectAngle } = usePipelineOrchestration();

  // Called by ResearchStageCard when SSE phase === "complete"
  const handleResearchDone = useCallback(async () => {
    const { runId } = pipelineState;
    if (!runId) return;

    // Fetch angles from backend
    try {
      const res = await fetch(`/api/v1/content/${runId}/angles`);
      if (res.ok) {
        const data = await res.json();
        const angles = Array.isArray(data) ? data : data.angles ?? [];
        dispatch(setPipelineAnglesData(angles));
      }
    } catch {
      // If angles fetch fails, still advance stage
    }
    dispatch(setPipelineStage("angles"));
  }, [pipelineState, dispatch]);

  // Called by CarouselGenerationCard when SSE phase === "complete"
  const handleContentDone = useCallback(() => {
    dispatch(setPipelineStage("complete"));
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <PipelineHeader />
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Production Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Multi-agent research → angles → carousel generation pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              System Online
            </span>
          </div>
        </div>

        <ResearchStageCard
          active={pipelineState.stage === "research"}
          onDone={handleResearchDone}
        />
        <AngleSelectionCard
          active={pipelineState.stage === "angles"}
          onSelect={selectAngle}
        />
        <CarouselGenerationCard
          active={pipelineState.stage === "content"}
          onDone={handleContentDone}
        />
      </main>
    </div>
  );
}