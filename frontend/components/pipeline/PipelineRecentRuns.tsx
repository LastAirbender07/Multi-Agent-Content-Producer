"use client";
import { startTransition } from "react";
import { History } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { loadRun } from "@/store/slices/pipelineSlice";
import { RunCard } from "@/components/pipeline/RunCard";

interface HistoryRun {
  runId: string;
  topic: string;
  timestamp: string;
  researchResult: any;
  angleResult: any;
  contentResult: any;
}

interface PipelineRecentRunsProps {
  runs: HistoryRun[];
  onLoad: (run: HistoryRun) => void;
}

export function PipelineRecentRuns({ runs, onLoad }: PipelineRecentRunsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <History size={13} className="text-zinc-600" />
        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Recent Runs</h4>
      </div>
      <div className="grid gap-2 max-h-120 overflow-y-auto pr-0.5">
        {runs.map((run) => (
          <RunCard
            key={run.runId}
            run={run}
            onLoad={() => onLoad(run)}
          />
        ))}
      </div>
    </div>
  );
}
