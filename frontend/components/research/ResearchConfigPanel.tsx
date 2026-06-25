"use client";
import { Loader2, Search, BookOpen, CheckCircle, Zap, Clock, Archive, Gauge, Layers, Microscope } from "lucide-react";

const MODES = [
  { value: "quick"    as const, label: "Quick",    Icon: Zap,        hint: "Fast" },
  { value: "standard" as const, label: "Standard", Icon: Layers,     hint: "Balanced" },
  { value: "deep"     as const, label: "Deep",     Icon: Microscope, hint: "Thorough" },
];

const FRESHNESS = [
  { value: "breaking"  as const, label: "Breaking", Icon: Gauge,   hint: "24h" },
  { value: "recent"    as const, label: "Recent",   Icon: Clock,   hint: "1 week" },
  { value: "evergreen" as const, label: "All time", Icon: Archive, hint: "Any" },
];

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
        {/* Topic */}
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

        {/* Depth segmented control */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Depth</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900/60 rounded-xl border border-zinc-800/50">
            {MODES.map(({ value, label, Icon, hint }) => (
              <button
                key={value}
                onClick={() => onModeChange(value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-bold transition-all ${
                  mode === value
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Freshness segmented control */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Freshness</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-900/60 rounded-xl border border-zinc-800/50">
            {FRESHNESS.map(({ value, label, Icon, hint }) => (
              <button
                key={value}
                onClick={() => onFreshnessChange(value)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-bold transition-all ${
                  freshness === value
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon size={13} />
                <span>{label}</span>
                <span className={`text-[8px] font-semibold ${freshness === value ? "text-violet-200" : "text-zinc-700"}`}>
                  {hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Claim verification toggle row */}
        <div className="pt-2 border-t border-zinc-900">
          <button
            onClick={() => onClaimVerifyChange(!claimVerify)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              claimVerify
                ? "bg-violet-600/10 border-violet-500/30 text-violet-300"
                : "bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle size={14} className={claimVerify ? "text-violet-400" : "text-zinc-700"} />
              <span className="text-xs font-bold">Claim Verification</span>
            </div>
            <div className={`w-8 h-4 rounded-full transition-all relative ${claimVerify ? "bg-violet-600" : "bg-zinc-800"}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${claimVerify ? "left-4" : "left-0.5"}`} />
            </div>
          </button>
        </div>

        {/* Run */}
        <button
          onClick={onRun}
          disabled={isLoading || !topic.trim()}
          className="w-full group relative overflow-hidden py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98]"
        >
          <div className="flex items-center justify-center gap-2">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} className="group-hover:scale-110 transition-transform" />}
            {refining ? "REFINING…" : running ? "SEARCHING…" : "START RESEARCH"}
          </div>
        </button>
      </div>
    </aside>
  );
}
