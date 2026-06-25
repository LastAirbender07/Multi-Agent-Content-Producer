"use client";
import { Target } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { StageCard, useStageTimer } from "@/components/pipeline/StageCard";
import { AngleSection } from "@/components/pipeline/AngleSection";
import { useAngleRegeneration } from "@/hooks/useAngleRegeneration";
import { usePipelineOrchestration } from "@/hooks/usePipelineOrchestration";
import { TokenChip } from "@/components/pipeline/TokenChip";

interface AngleStageCardProps {
  open: boolean;
  onToggle: () => void;
  onOpenSelector: () => void;
}

export function AngleStageCard({ open, onToggle, onOpenSelector }: AngleStageCardProps) {
  const { stages, researchResult, angleResult, angleMode, runId } = useAppSelector((s) => s.pipeline);
  const elapsed = useStageTimer(stages.angle.status);
  const { handleRegenerateAngles, regenerating } = useAngleRegeneration();
  const { handleGenerateAngles, isRunning } = usePipelineOrchestration();

  const canReopenAngles =
    angleMode === "manual" &&
    stages.angle.status === "done" &&
    stages.content.status === "idle";

  return (
    <StageCard
      number={2}
      icon={<Target size={14} />}
      title="Angle Selection"
      status={stages.angle.status}
      open={open}
      onToggle={onToggle}
      elapsed={elapsed}
    >
      <div className="pt-4 space-y-4">
        {stages.angle.status === "running" && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Generating angles…</span>
          </div>
        )}
        {stages.angle.status === "idle" && stages.research.status === "done" && researchResult && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-[11px] text-zinc-500 text-center">Research recovered — ready to continue</p>
            <button
              onClick={handleGenerateAngles}
              disabled={isRunning}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white border border-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue → Generate Angles &amp; Carousel
            </button>
          </div>
        )}
        {angleResult && (
          <AngleSection
            angleResult={angleResult}
            canReopenAngles={canReopenAngles}
            canRegenerate={stages.angle.status === "done" && stages.content.status === "idle"}
            regenerating={regenerating}
            onOpenSelector={onOpenSelector}
            onRegenerate={handleRegenerateAngles}
          />
        )}
        {stages.angle.status === "done" && (
          <div className="pt-2">
            <TokenChip runId={runId} stage="angles" />
          </div>
        )}
      </div>
    </StageCard>
  );
}
