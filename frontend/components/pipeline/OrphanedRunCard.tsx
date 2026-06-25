"use client";
import { AlertCircle } from "lucide-react";
import { useRecoverRun } from "@/hooks/useRecoverRun";

interface OrphanedRun {
  run_id: string;
  topic: string;
  has_content: boolean;
}

interface OrphanedRunCardProps {
  run: OrphanedRun;
}

export function OrphanedRunCard({ run }: OrphanedRunCardProps) {
  const { recoverRun, recoveringId } = useRecoverRun();
  const isRecovering = recoveringId === run.run_id;

  const statusLabel = run.has_content
    ? "Research + content on disk"
    : "Research complete — not loaded";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all">
      <AlertCircle size={14} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-zinc-300 truncate">{run.topic}</p>
        <p className="text-[10px] text-amber-600 mt-0.5">{statusLabel}</p>
      </div>
      <button
        onClick={() => recoverRun(run.run_id, run.topic)}
        disabled={isRecovering}
        className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all disabled:opacity-50"
      >
        {isRecovering ? "Loading…" : "Recover →"}
      </button>
    </div>
  );
}
