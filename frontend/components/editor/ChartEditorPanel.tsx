"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { X, Loader2, BarChart2 } from "lucide-react";
import { ChartTypePicker } from "./ChartTypePicker";
import { ChartDataTable } from "./ChartDataTable";
import { ChartPreview } from "./ChartPreview";
import type { ChartType, ChartData } from "@/types/chart";

const MULTI_SERIES_TYPES: ChartType[] = ["stacked-bar", "stacked-column", "comparison", "radar"];
const NO_PREVIEW_TYPES: ChartType[] = ["funnel", "progress", "number-stat"];

const DEFAULT_DATA: Record<ChartType, ChartData> = {
  "bar":            { labels: ["Option A","Option B","Option C","Option D"], values: [120,200,150,80] },
  "column":         { labels: ["Q1","Q2","Q3","Q4"], values: [120,200,150,180] },
  "line":           { labels: ["Jan","Feb","Mar","Apr","May"], values: [40,80,60,100,90] },
  "area":           { labels: ["Jan","Feb","Mar","Apr","May"], values: [40,80,60,100,90] },
  "donut":          { labels: ["A","B","C","D"], values: [35,25,25,15] },
  "radar":          { labels: ["Speed","Power","Range","Economy","Safety"], values: [80,60,70,90,75],
                      series: [{ label: "Product A", values: [80,60,70,90,75] }, { label: "Product B", values: [60,80,50,70,85] }] },
  "funnel":         { labels: ["Awareness","Interest","Consideration","Intent","Purchase"], values: [1000,750,500,300,150] },
  "stacked-bar":    { labels: ["Q1","Q2","Q3"], values: [120,200,150],
                      series: [{ label: "Revenue", values: [120,200,150] }, { label: "Cost", values: [80,120,90] }] },
  "stacked-column": { labels: ["Q1","Q2","Q3"], values: [120,200,150],
                      series: [{ label: "Revenue", values: [120,200,150] }, { label: "Cost", values: [80,120,90] }] },
  "comparison":     { labels: ["Feature 1","Feature 2","Feature 3"], values: [80,60,90],
                      series: [{ label: "Ours", values: [80,60,90] }, { label: "Competitor", values: [60,80,70] }] },
  "scatter":        { labels: [], values: [], points: [{x:10,y:20},{x:25,y:40},{x:35,y:30},{x:50,y:60},{x:65,y:45}] },
  "bubble":         { labels: [], values: [], points: [{x:10,y:20,r:8},{x:25,y:40,r:15},{x:50,y:30,r:10}] },
  "progress":       { labels: [], values: [], progressItems: [{ label: "Goal 1", value: 75 }, { label: "Goal 2", value: 45 }, { label: "Goal 3", value: 90 }] },
  "number-stat":    { labels: [], values: [], statValue: "42%", statLabel: "Conversion Rate", statContext: "Q4 2025" },
};

interface ChartEditorPanelProps {
  initialType?: ChartType;
  initialData?: ChartData;
  theme?:       "aurora" | "lumina";
  onApply:      (type: ChartType, data: ChartData) => Promise<void>;
  onCancel?:    () => void;
  compact?:     boolean;  // compact=true hides live preview (used inside RightPanel)
}

export function ChartEditorPanel({
  initialType = "column",
  initialData,
  theme = "aurora",
  onApply,
  onCancel,
  compact = false,
}: ChartEditorPanelProps) {
  const [chartType, setChartType] = useState<ChartType>(initialType);
  const [chartData, setChartData] = useState<ChartData>(
    initialData ?? DEFAULT_DATA[initialType]
  );
  const [applying, setApplying] = useState(false);
  const [unit, setUnit]           = useState(initialData?.unit ?? "");
  const [showLegend, setShowLegend] = useState(initialData?.showLegend ?? true);
  const [showGrid, setShowGrid]   = useState(initialData?.showGrid ?? true);
  const [title, setTitle]         = useState(initialData?.title ?? "");

  // Debounced preview update
  const debounceRef = useRef<number | null>(null);
  const [previewData, setPreviewData] = useState<ChartData>(chartData);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setPreviewData({ ...chartData, unit: unit || undefined, showLegend, showGrid, title: title || undefined });
    }, 250);
    return () => { if (debounceRef.current !== null) window.clearTimeout(debounceRef.current); };
  }, [chartData, unit, showLegend, showGrid, title]);

  const handleTypeChange = useCallback((type: ChartType) => {
    setChartType(type);
    if (!chartData.labels?.length && !chartData.points?.length && !chartData.progressItems?.length) {
      setChartData(DEFAULT_DATA[type]);
    } else if (type !== chartType) {
      setChartData({ ...DEFAULT_DATA[type], labels: chartData.labels, values: chartData.values });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, chartData]);

  async function handleApply() {
    setApplying(true);
    try {
      await onApply(chartType, { ...chartData, unit: unit || undefined, showLegend, showGrid, title: title || undefined });
    } finally {
      setApplying(false);
    }
  }

  const isMultiSeries = MULTI_SERIES_TYPES.includes(chartType);
  const canPreview    = !NO_PREVIEW_TYPES.includes(chartType);

  // Special inputs for number-stat and progress
  const isNumberStat = chartType === "number-stat";
  const isProgress   = chartType === "progress";

  return (
    <div className={`flex flex-col bg-zinc-950 ${compact ? "h-full" : "h-full"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart2 size={14} className="text-violet-400" />
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
            {compact ? "Edit Chart" : "Chart Editor"}
          </p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-4">

          {/* Chart type picker */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600 mb-2">Type</p>
            <ChartTypePicker value={chartType} onChange={handleTypeChange} />
          </div>

          {/* Data input — varies by chart type */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600 mb-2">Data</p>

            {isNumberStat && (
              <div className="space-y-2">
                {[
                  { field: "statValue",   label: "Value",   placeholder: "₹1.1 Lakh Cr" },
                  { field: "statLabel",   label: "Label",   placeholder: "Market size" },
                  { field: "statContext", label: "Context", placeholder: "Source: KPMG 2024" },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <p className="text-[10px] text-zinc-500 mb-1">{label}</p>
                    <input
                      value={(chartData as unknown as Record<string, string>)[field] ?? ""}
                      onChange={e => setChartData(d => ({ ...d, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                ))}
              </div>
            )}

            {isProgress && (
              <div className="space-y-2">
                {(chartData.progressItems ?? []).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={item.label}
                      onChange={e => setChartData(d => ({ ...d, progressItems: d.progressItems?.map((pi, ii) => ii === i ? { ...pi, label: e.target.value } : pi) }))}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50"
                      placeholder="Label"
                    />
                    <input
                      type="number" min={0} max={100}
                      value={item.value}
                      onChange={e => setChartData(d => ({ ...d, progressItems: d.progressItems?.map((pi, ii) => ii === i ? { ...pi, value: Number(e.target.value) } : pi) }))}
                      className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50 text-right"
                    />
                  </div>
                ))}
                <button onClick={() => setChartData(d => ({ ...d, progressItems: [...(d.progressItems ?? []), { label: `Goal ${(d.progressItems?.length ?? 0) + 1}`, value: 50 }] }))}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-600 transition-all">
                  + Add item
                </button>
              </div>
            )}

            {!isNumberStat && !isProgress && (
              <ChartDataTable data={chartData} onChange={setChartData} multiSeries={isMultiSeries} />
            )}
          </div>

          {/* Options row */}
          {!isNumberStat && !isProgress && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Options</p>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                  <input type="checkbox" checked={showLegend} onChange={e => setShowLegend(e.target.checked)}
                    className="accent-violet-500 w-3 h-3" />
                  Legend
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
                  <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)}
                    className="accent-violet-500 w-3 h-3" />
                  Grid
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-zinc-500">Unit:</span>
                  <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="% $ K"
                    className="w-12 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none" />
                </div>
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Chart title (optional)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50" />
            </div>
          )}

          {/* Live preview (hidden in compact mode) */}
          {!compact && canPreview && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">Preview</p>
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 overflow-hidden">
                <ChartPreview
                  chartType={chartType}
                  labels={previewData.labels ?? []}
                  values={previewData.values ?? []}
                  height={160}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-zinc-800/60">
        <button
          onClick={handleApply}
          disabled={applying}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold transition-all"
        >
          {applying ? <Loader2 size={12} className="animate-spin" /> : null}
          {applying ? "Rendering…" : compact ? "Apply Changes" : "Apply to Slide"}
        </button>
        {onCancel && !compact && (
          <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs transition-all">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
