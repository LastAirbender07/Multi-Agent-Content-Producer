"use client";

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function LlmChip({ checked, onChange }: Props) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label="LLM-only mode"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
        checked
          ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
          : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      <div className={`relative w-7 h-4 rounded-full border transition-colors ${checked ? "bg-violet-600 border-violet-500" : "bg-zinc-800 border-zinc-700"}`}>
        <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-3" : "translate-x-0"}`} />
      </div>
      <span className={checked ? "text-violet-300 font-semibold" : "text-zinc-400"}>
        {checked ? "LLM only" : "Web"}
      </span>
    </button>
  );
}
