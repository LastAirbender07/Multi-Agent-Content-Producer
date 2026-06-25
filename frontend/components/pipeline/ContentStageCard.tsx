"use client";
import { Image as ImageIcon, PencilRuler } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { StageCard, useStageTimer } from "@/components/pipeline/StageCard";
import { CarouselViewer } from "@/components/pipeline/CarouselViewer";
import { BlogExportBar } from "@/components/pipeline/BlogExportBar";
import { TokenChip } from "@/components/pipeline/TokenChip";

interface ContentStageCardProps {
  open: boolean;
  onToggle: () => void;
}

export function ContentStageCard({ open, onToggle }: ContentStageCardProps) {
  const router = useRouter();
  const { stages, contentResult, angleResult, runId, topic } = useAppSelector((s) => s.pipeline);
  const elapsed = useStageTimer(stages.content.status);

  return (
    <StageCard
      number={3}
      icon={<ImageIcon size={14} />}
      title="Generated Carousels"
      status={stages.content.status}
      open={open}
      onToggle={onToggle}
      elapsed={elapsed}
    >
      <div className="pt-4">
        {stages.content.status === "running" && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Generating carousels…</span>
          </div>
        )}
        {contentResult && (
          <CarouselViewer contentResult={contentResult} angleResult={angleResult} />
        )}
        {contentResult && stages.content.status === "done" && runId && (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <TokenChip runId={runId} stage="carousel" />
              <TokenChip runId={runId} stage="caption" />
              <TokenChip runId={runId} showTotal />
            </div>
            <BlogExportBar runId={runId} topic={topic} />
            <button
              onClick={() => router.push(`/editor?run=${runId}&view=slide&angle=0&slide=1`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/5 text-violet-400 text-sm font-bold hover:bg-violet-500/10 transition-all"
            >
              <PencilRuler size={14} />
              Open in Editor
            </button>
          </div>
        )}
      </div>
    </StageCard>
  );
}
