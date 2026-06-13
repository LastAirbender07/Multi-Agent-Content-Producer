"use client";
import { CheckCircle, MousePointerClick, Loader2, RefreshCw } from "lucide-react";
import type { AngleResponse } from "@/lib/api";

const HOOK_COLORS: Record<string, string> = {
  curiosity:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  anger:        "bg-red-500/10 text-red-400 border-red-500/20",
  fear:         "bg-red-500/10 text-red-400 border-red-500/20",
  hope:         "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fomo:         "bg-amber-500/10 text-amber-400 border-amber-500/20",
  inspiration:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

function hookColor(hook: string) {
  const k = hook.toLowerCase();
  const found = Object.keys(HOOK_COLORS).find((key) => k.includes(key));
  return HOOK_COLORS[found ?? "curiosity"];
}

interface AngleSectionProps {
  angleResult: AngleResponse;
  canReopenAngles: boolean;
  canRegenerate: boolean;
  regenerating: boolean;
  onOpenSelector: () => void;
  onRegenerate: () => void;
}

export function AngleSection({
  angleResult,
  canReopenAngles,
  canRegenerate,
  regenerating,
  onOpenSelector,
  onRegenerate,
}: AngleSectionProps) {
  return (
    <>
      <div className="grid gap-3">
        {angleResult.angles.map((angle, i) => {
          const isSelected = angleResult.selected_angles.some(
            (s) => s.statement === angle.statement
          );
          return (
            <div
              key={i}
              className={`p-4 rounded-2xl border transition-colors ${
                isSelected
                  ? "border-violet-500/40 bg-violet-500/5"
                  : "border-zinc-800/50 bg-zinc-900/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? "bg-violet-500 text-white" : "bg-zinc-800 text-zinc-600"
                  }`}
                >
                  {isSelected && <CheckCircle size={12} />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-semibold text-zinc-200 leading-snug">
                    {angle.statement}
                  </p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${hookColor(
                      angle.emotional_hook
                    )}`}
                  >
                    {angle.emotional_hook}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest shrink-0 pt-1">
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canReopenAngles && (
        <button
          onClick={onOpenSelector}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-violet-500/40 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 text-xs font-bold transition-all"
        >
          <MousePointerClick size={14} />
          Open Angle Selector
        </button>
      )}

      {canRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-zinc-700/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all"
        >
          {regenerating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          {regenerating ? "Regenerating…" : "Regenerate Angles"}
        </button>
      )}
    </>
  );
}
