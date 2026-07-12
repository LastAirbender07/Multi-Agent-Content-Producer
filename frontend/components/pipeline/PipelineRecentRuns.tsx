"use client";
import { useState, useEffect } from "react";
import { History, RefreshCw, FolderOpen, Download } from "lucide-react";
import { RunCard } from "@/components/pipeline/RunCard";
import { OrphanedRunCard } from "@/components/pipeline/OrphanedRunCard";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useRecoverRun } from "@/hooks/useRecoverRun";
import type { RunSummary } from "@/lib/api";
import type { PipelineRun, SlimRun } from "@/store/slices/historySlice";

interface PipelineRecentRunsProps {
  runs: PipelineRun[];
  onLoad: (run: PipelineRun) => void;
}

export function PipelineRecentRuns({ runs, onLoad }: PipelineRecentRunsProps) {
  const [serverRuns, setServerRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading]       = useState(true);
  const slimRuns                    = useAppSelector(s => s.history.slimRuns);
  const { recoverRun, recoveringId } = useRecoverRun();

  useEffect(() => {
    api.getRunsList()
      .then(data => setServerRuns(data.runs ?? []))
      .catch(err => { console.warn("Could not fetch server runs:", err); })
      .finally(() => setLoading(false));
  }, []);

  const fullRunIds    = new Set(runs.map(r => r.runId));
  const slimRunIds    = new Set(slimRuns.map(r => r.runId));
  const orphanedRuns  = serverRuns.filter(r => !fullRunIds.has(r.run_id) && !slimRunIds.has(r.run_id));
  const hasAny        = runs.length > 0 || slimRuns.length > 0 || orphanedRuns.length > 0;

  // Folder picker — user selects a run_id directory; we read the name as the UUID
  async function handleFolderPick() {
    try {
      // showDirectoryPicker is available in modern Chrome/Edge
      const dir = await (window as any).showDirectoryPicker({ mode: "read" });
      const runId = dir.name;
      // Basic UUID format check
      if (!/^[0-9a-f-]{36}$/.test(runId)) {
        alert(`"${runId}" doesn't look like a run folder (expected a UUID).`);
        return;
      }
      // Use the folder name as topic placeholder — recoverRun reads the real topic from disk
      await recoverRun(runId, runId.slice(0, 8) + "…");
    } catch (e: any) {
      if (e?.name !== "AbortError") console.warn("Folder pick failed:", e);
    }
  }

  if (!hasAny && !loading) return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History size={13} className="text-zinc-600" />
          <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Recent Runs</h4>
        </div>
      </div>
      <button
        onClick={handleFolderPick}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-zinc-700 text-zinc-600 text-[11px] hover:border-violet-500/50 hover:text-violet-400 transition-all"
      >
        <FolderOpen size={13} /> Load run from folder
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History size={13} className="text-zinc-600" />
          <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Recent Runs</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFolderPick}
            title="Load run from folder"
            className="text-zinc-700 hover:text-violet-400 transition-colors"
          >
            <FolderOpen size={12} />
          </button>
          {loading && <RefreshCw size={11} className="text-zinc-700 animate-spin" />}
        </div>
      </div>

      <div className="grid gap-2 max-h-120 overflow-y-auto pr-0.5">
        {/* Fully loaded runs */}
        {runs.map(run => (
          <RunCard key={run.runId} run={run} onLoad={() => onLoad(run)} />
        ))}

        {/* Slim runs — lazy loaded on demand */}
        {slimRuns.map(slim => (
          <SlimRunCard
            key={slim.runId}
            slim={slim}
            isLoading={recoveringId === slim.runId}
            onLoad={() => recoverRun(slim.runId, slim.topic)}
          />
        ))}

        {/* Server runs not in history — orphaned */}
        {orphanedRuns.map(run => (
          <OrphanedRunCard key={run.run_id} run={run} />
        ))}
      </div>
    </div>
  );
}


// ── Slim run card — shown for runs beyond the FULL_RUN_LIMIT ─────────────────

function SlimRunCard({ slim, isLoading, onLoad }: {
  slim: SlimRun;
  isLoading: boolean;
  onLoad: () => void;
}) {
  const date = new Date(slim.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/50">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-zinc-400 truncate">{slim.topic}</p>
        <p className="text-[10px] text-zinc-700">{date} · {slim.angleCount} angles · {slim.slideCount} slides{slim.hasBlog ? " · blog" : ""}</p>
      </div>
      <button
        onClick={onLoad}
        disabled={isLoading}
        title="Load full run"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 border border-zinc-800 hover:border-violet-500/30 disabled:opacity-40 transition-all"
      >
        {isLoading
          ? <RefreshCw size={10} className="animate-spin" />
          : <Download size={10} />
        }
        Load
      </button>
    </div>
  );
}
