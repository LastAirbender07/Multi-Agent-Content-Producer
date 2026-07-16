"use client";
import { useState, useRef, useEffect } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useRecoverRun } from "@/hooks/useRecoverRun";

interface OrphanedRun {
  run_id:      string;
  topic:       string;
  has_content: boolean;
}

interface OrphanedRunCardProps {
  run: OrphanedRun;
}

export function OrphanedRunCard({ run }: OrphanedRunCardProps) {
  const { recoverRun, recoveringId } = useRecoverRun();
  const isRecovering = recoveringId === run.run_id;
  const [expanded, setExpanded]   = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // After render, check if line-clamp is actually truncating anything
  useEffect(() => {
    const el = textRef.current;
    if (el) setIsClamped(el.scrollHeight > el.clientHeight + 2);
  }, [run.topic]);

  const statusLabel = run.has_content
    ? "Research + content on disk"
    : "Research complete — not loaded";

  return (
    <div className="p-3 rounded-xl bg-zinc-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all">
      <div className="flex items-start gap-2">
        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p
            ref={textRef}
            className={`text-[11px] font-bold text-zinc-300 break-words ${expanded ? "" : "line-clamp-2"}`}
          >
            {run.topic}
          </p>
          {(isClamped || expanded) && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[9px] font-semibold text-zinc-600 hover:text-zinc-400 mt-0.5 flex items-center gap-0.5 transition-colors"
            >
              {expanded ? <><ChevronUp size={9} /> less</> : <><ChevronDown size={9} /> more</>}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pl-5">
        <p className="text-[10px] text-amber-600">{statusLabel}</p>
        <button
          onClick={() => recoverRun(run.run_id, run.topic)}
          disabled={isRecovering}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all disabled:opacity-50"
        >
          {isRecovering ? <><Loader2 size={9} className="animate-spin" /> Loading…</> : "Recover →"}
        </button>
      </div>
    </div>
  );
}
