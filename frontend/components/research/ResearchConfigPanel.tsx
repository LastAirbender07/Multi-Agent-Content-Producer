"use client";
import { Loader2, Search, BookOpen, CheckCircle } from "lucide-react";

const MODES = ["quick", "standard", "deep"] as const;
const FRESHNESS = ["breaking", "recent", "evergreen"] as const;

interface Props {
  topic: string;
  mode: "quick" | "standard" | "deep";
  freshness: "breaking" | "recent" | "evergreen";
  claimVerify: boolean;
  isLoading: boolean;
  refining: boolean;
  running: boolean;
  onTopicChange: (v: string) => void;
  onModeChange: (v: "quick" | "standard" | "deep") => void;
  onFreshnessChange: (v: "breaking" | "recent" | "evergreen") => void;
  onClaimVerifyChange: (v: boolean) => void;
  onRun: () => void;
}

export function ResearchConfigPanel({
  topic, mode, freshness, claimVerify,
  isLoading, refining, running,
  onTopicChange, onModeChange, onFreshnessChange, onClaimVerifyChange, onRun,
}: Props) {
  return (
    <aside className="w-80 shrink-0 border-r border-zinc-900/50 flex flex-col p-8 gap-8 bg-zinc-950/50 backdrop-blur-md">
      <div>
        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-600/20">
          <BookOpen size={24} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tighter">Deep Research</h1>
        <p className="text-xs text-zinc-500 font-medium mt-1">Multi-agent knowledge extraction.</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Topic</label>
          <textarea
            rows={3}
            placeholder="What do you want to learn about?…"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-inner"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Depth</label>
            <select
              value={mode}
              onChange={(e) => onModeChange(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
            >
              {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Freshness</label>
            <select
              value={freshness}
              onChange={(e) => onFreshnessChange(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
            >
              {FRESHNESS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-zinc-900">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
              claimVerify ? "bg-violet-600 border-violet-600" : "bg-zinc-900 border-zinc-800 group-hover:border-zinc-700"
            }`}>
              {claimVerify && <CheckCircle size={12} className="text-white" />}
              <input type="checkbox" className="hidden" checked={claimVerify} onChange={(e) => onClaimVerifyChange(e.target.checked)} />
            </div>
            <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">Claim Verification</span>
          </label>
        </div>

        <button
          onClick={onRun}
          disabled={isLoading || !topic.trim()}
          className="w-full group relative overflow-hidden py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center gap-2">
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} className="group-hover:scale-110 transition-transform" />
            )}
            {refining ? "REFINING…" : running ? "SEARCHING…" : "START RESEARCH"}
          </div>
        </button>
      </div>
    </aside>
  );
}
