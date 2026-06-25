"use client";
import { useState, useEffect } from "react";
import { History, RefreshCw } from "lucide-react";
import { RunCard } from "@/components/pipeline/RunCard";
import { OrphanedRunCard } from "@/components/pipeline/OrphanedRunCard";
import { api } from "@/lib/api";

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
  const [serverRuns, setServerRuns] = useState<{ run_id: string; topic: string; created_at: number; has_content: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRunsList()
      .then(data => setServerRuns(data.runs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const reduxRunIds = new Set(runs.map(r => r.runId));
  const orphanedRuns = serverRuns.filter(r => !reduxRunIds.has(r.run_id));
  const hasAny = runs.length > 0 || orphanedRuns.length > 0;

  if (!hasAny && !loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History size={13} className="text-zinc-600" />
          <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Recent Runs</h4>
        </div>
        {loading && <RefreshCw size={11} className="text-zinc-700 animate-spin" />}
      </div>

      <div className="grid gap-2 max-h-120 overflow-y-auto pr-0.5">
        {runs.map(run => (
          <RunCard key={run.runId} run={run} onLoad={() => onLoad(run)} />
        ))}
        {orphanedRuns.map(run => (
          <OrphanedRunCard key={run.run_id} run={run} />
        ))}
      </div>
    </div>
  );
}
