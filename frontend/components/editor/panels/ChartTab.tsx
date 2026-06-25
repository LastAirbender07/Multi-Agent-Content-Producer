"use client";
import { Save, Loader2, Plus, X } from "lucide-react";
import { ChartPreview } from "../ChartPreview";
import type { SlideSnapshot } from "@/types/slideEditor";

const CHART_TYPES = ["bar", "column", "donut", "line", "radar", "funnel"] as const;

interface ChartTabProps {
  snap: SlideSnapshot;
  setField: <K extends keyof SlideSnapshot>(key: K, val: SlideSnapshot[K], markDirty?: boolean) => void;
  styleDirty: boolean;
  styleSaving: boolean;
  onStyleSave: () => void;
  Field: ({ label, children }: { label: string; children: React.ReactNode }) => React.ReactElement;
}

export function ChartTab({ snap, setField, styleDirty, styleSaving, onStyleSave, Field }: ChartTabProps) {
  return (
    <>
      <Field label="Chart Type">
        <div className="flex gap-1 flex-wrap">
          {CHART_TYPES.map(t => (
            <button key={t} onClick={() => setField("chartType", t, true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${snap.chartType === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Data">
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          {snap.chartLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={label} onChange={e => { const n = [...snap.chartLabels]; n[i] = e.target.value; setField("chartLabels", n); }} placeholder="Label"
                className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
              <input type="number" value={snap.chartValues[i] ?? ""} onChange={e => { const n = [...snap.chartValues]; n[i] = Number(e.target.value); setField("chartValues", n); }} placeholder="Val"
                className="w-16 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
              <button onClick={() => { setField("chartLabels", snap.chartLabels.filter((_, j) => j !== i)); setField("chartValues", snap.chartValues.filter((_, j) => j !== i)); }} className="text-zinc-700 hover:text-red-400 shrink-0"><X size={12} /></button>
            </div>
          ))}
          <button onClick={() => { setField("chartLabels", [...snap.chartLabels, ""]); setField("chartValues", [...snap.chartValues, 0]); }} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"><Plus size={10} /> Add row</button>
        </div>
      </Field>
      {snap.chartLabels.length > 0 && (
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/50">
          <ChartPreview chartType={snap.chartType} labels={snap.chartLabels} values={snap.chartValues} />
        </div>
      )}
      {styleDirty && (
        <button onClick={onStyleSave} disabled={styleSaving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all">
          {styleSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {styleSaving ? "Saving…" : "Save Chart Changes"}
        </button>
      )}
    </>
  );
}
