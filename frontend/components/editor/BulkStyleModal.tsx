"use client";
import { useState } from "react";
import { X, Loader2, Check, Layers } from "lucide-react";
import { api } from "@/lib/api";

interface BulkStyleModalProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;     // current slide (excluded from selection by default)
  totalSlides: number;
  slideOverrides: Record<string, string>;
  canvasTemplate?: string;
  onClose: () => void;
  onApplied: (count: number) => void;
}

export function BulkStyleModal({
  runId, angleIndex, slideNumber, totalSlides,
  slideOverrides, canvasTemplate,
  onClose, onApplied,
}: BulkStyleModalProps) {
  const allSlides = Array.from({ length: totalSlides }, (_, i) => i + 1);
  const otherSlides = allSlides.filter(n => n !== slideNumber);

  const [selected, setSelected] = useState<Set<number>>(new Set(otherSlides));
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  function toggleSlide(n: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(allSlides.filter(n => n !== slideNumber))); }
  function clearAll()  { setSelected(new Set()); }

  async function handleApply() {
    if (selected.size === 0) return;
    setApplying(true);
    try {
      await api.bulkStyleSlides(runId, angleIndex, [...selected], slideOverrides, canvasTemplate);
      setDone(true);
      setTimeout(() => { onApplied(selected.size); onClose(); }, 1200);
    } catch {
      setApplying(false);
    }
  }

  const overrideEntries = Object.entries(slideOverrides);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-[420px] shadow-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              <Layers size={15} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Apply Style to Slides</h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">From Slide {slideNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Current style preview */}
        {overrideEntries.length > 0 && (
          <div className="bg-zinc-800/40 rounded-2xl px-4 py-3 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600 mb-2">Styles to apply</p>
            {overrideEntries.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-mono">{k}</span>
                <span className="text-violet-300 font-mono">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Slide selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
              Apply to slides ({selected.size} selected)
            </p>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors">All</button>
              <span className="text-zinc-700">·</span>
              <button onClick={clearAll} className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">None</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {allSlides.map(n => {
              const isCurrent = n === slideNumber;
              const isChecked = selected.has(n);
              return (
                <button
                  key={n}
                  disabled={isCurrent}
                  onClick={() => !isCurrent && toggleSlide(n)}
                  className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-violet-600/20 border border-violet-500/40 text-violet-300 cursor-default"
                      : isChecked
                      ? "bg-violet-600 text-white border border-violet-500"
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-300"
                  }`}
                  title={isCurrent ? "Current slide (source)" : `Slide ${n}`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={selected.size === 0 || applying || done}
          className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black transition-all flex items-center justify-center gap-2"
        >
          {done
            ? <><Check size={15} /> Applied!</>
            : applying
            ? <><Loader2 size={15} className="animate-spin" /> Applying to {selected.size} slides…</>
            : <>Apply to {selected.size} slide{selected.size !== 1 ? "s" : ""}</>
          }
        </button>
      </div>
    </div>
  );
}
