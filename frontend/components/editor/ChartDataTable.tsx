"use client";
import { useState, useRef, useCallback } from "react";
import { Plus, Trash2, Clipboard } from "lucide-react";
import { parseChartCsv } from "@/utils/parseChartCsv";
import type { ChartData, ChartSeries } from "@/types/chart";

interface ChartDataTableProps {
  data: ChartData;
  onChange: (data: ChartData) => void;
  multiSeries?: boolean;  // show multiple series columns
}

export function ChartDataTable({ data, onChange, multiSeries = false }: ChartDataTableProps) {
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);

  // Rows = [{label, values[]}]
  const labels  = data.labels ?? [];
  const values  = data.values ?? [];
  const series  = data.series ?? [];
  const numSeries = multiSeries ? Math.max(1, series.length) : 1;

  function updateRow(i: number, label: string, vals: number[]) {
    const newLabels = [...labels]; newLabels[i] = label;
    const newValues = [...values]; newValues[i] = vals[0] ?? 0;
    const newSeries = series.map((s, si) => ({
      ...s, values: s.values.map((v, vi) => vi === i ? (vals[si] ?? v) : v),
    }));
    onChange({ ...data, labels: newLabels, values: newValues, series: newSeries });
  }

  function addRow() {
    const newLabels = [...labels, `Label ${labels.length + 1}`];
    const newValues = [...values, 0];
    const newSeries = series.map(s => ({ ...s, values: [...s.values, 0] }));
    onChange({ ...data, labels: newLabels, values: newValues, series: newSeries });
  }

  function removeRow(i: number) {
    onChange({
      ...data,
      labels: labels.filter((_, j) => j !== i),
      values: values.filter((_, j) => j !== i),
      series: series.map(s => ({ ...s, values: s.values.filter((_, j) => j !== i) })),
    });
  }

  function addSeries() {
    const newSeries: ChartSeries = { label: `Series ${series.length + 1}`, values: labels.map(() => 0) };
    onChange({ ...data, series: [...series, newSeries] });
  }

  function removeSeries(si: number) {
    const newSeries = series.filter((_, i) => i !== si);
    onChange({ ...data, series: newSeries });
  }

  function updateSeriesLabel(si: number, label: string) {
    onChange({ ...data, series: series.map((s, i) => i === si ? { ...s, label } : s) });
  }

  function updateSeriesValue(si: number, rowI: number, val: number) {
    const newSeries = series.map((s, i) =>
      i === si ? { ...s, values: s.values.map((v, vi) => vi === rowI ? val : v) } : s
    );
    const newValues = si === 0 ? newSeries[0].values.map(v => v) : values;
    onChange({ ...data, series: newSeries, values: newValues });
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const cells = tableRef.current?.querySelectorAll<HTMLInputElement>("input[data-cell]");
    if (!cells) return;
    const currentIdx = Array.from(cells).findIndex(c => c === e.currentTarget);
    if (e.key === "Enter") {
      e.preventDefault();
      // If last row, add new row
      const totalRows = labels.length;
      if (row === totalRows - 1 && col === 0) addRow();
      // Focus next row same column
      const nextInput = cells[currentIdx + (1 + numSeries)];
      nextInput?.focus();
    }
    if (e.key === "Tab") {
      // Natural tab — handled by browser
    }
    if ((e.key === "Delete" || e.key === "Backspace") && (e.target as HTMLInputElement).value === "" && col === 0 && labels.length > 1) {
      e.preventDefault();
      removeRow(row);
    }
  }, [labels, numSeries, addRow, removeRow]);

  function applyCSV() {
    const parsed = parseChartCsv(csvText);
    if (parsed.labels || parsed.points) {
      onChange({ ...data, ...parsed });
    }
    setCsvOpen(false);
    setCsvText("");
  }

  return (
    <div className="space-y-2">
      {/* Series headers (multi-series only) */}
      {multiSeries && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-1 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2 py-1">
              <input
                value={s.label}
                onChange={e => updateSeriesLabel(si, e.target.value)}
                className="bg-transparent text-[11px] text-zinc-200 w-20 focus:outline-none"
              />
              <button onClick={() => removeSeries(si)} className="text-zinc-600 hover:text-red-400 transition-colors">
                <Trash2 size={9} />
              </button>
            </div>
          ))}
          <button onClick={addSeries} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-zinc-600 hover:text-violet-400 hover:bg-zinc-800/40 transition-all border border-dashed border-zinc-700 hover:border-violet-500">
            <Plus size={10} /> Series
          </button>
        </div>
      )}

      {/* Data grid */}
      <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
        <table ref={tableRef} className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
              <th className="text-left px-2 py-1.5 font-semibold text-zinc-600 w-2/5">Label</th>
              {multiSeries
                ? series.map((s, si) => (
                    <th key={si} className="text-left px-2 py-1.5 font-semibold text-zinc-600">{s.label}</th>
                  ))
                : <th className="text-left px-2 py-1.5 font-semibold text-zinc-600">Value</th>
              }
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={i} className="border-b border-zinc-800/40 last:border-0 hover:bg-zinc-800/20 transition-colors group">
                <td className="px-2 py-1">
                  <input
                    data-cell="true"
                    value={label}
                    onChange={e => updateRow(i, e.target.value, [values[i], ...series.map(s => s.values[i])])}
                    onKeyDown={e => handleKeyDown(e, i, 0)}
                    className="w-full bg-transparent text-zinc-200 focus:outline-none focus:text-white placeholder-zinc-700"
                    placeholder={`Label ${i + 1}`}
                  />
                </td>
                {multiSeries
                  ? series.map((s, si) => (
                      <td key={si} className="px-2 py-1">
                        <input
                          data-cell="true"
                          type="number"
                          value={s.values[i] ?? 0}
                          onChange={e => updateSeriesValue(si, i, Number(e.target.value))}
                          onKeyDown={e => handleKeyDown(e, i, si + 1)}
                          className="w-full bg-transparent text-zinc-200 focus:outline-none focus:text-white text-right"
                        />
                      </td>
                    ))
                  : (
                    <td className="px-2 py-1">
                      <input
                        data-cell="true"
                        type="number"
                        value={values[i] ?? 0}
                        onChange={e => updateRow(i, label, [Number(e.target.value)])}
                        onKeyDown={e => handleKeyDown(e, i, 1)}
                        className="w-full bg-transparent text-zinc-200 focus:outline-none focus:text-white text-right"
                      />
                    </td>
                  )
                }
                <td className="px-1 py-1">
                  <button onClick={() => removeRow(i)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                    <Trash2 size={11} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2">
        <button onClick={addRow} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 transition-all border border-zinc-800 hover:border-zinc-600">
          <Plus size={11} /> Add row
        </button>
        <button onClick={() => setCsvOpen(o => !o)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-violet-400 hover:bg-violet-600/10 transition-all border border-zinc-800 hover:border-violet-500/40">
          <Clipboard size={11} /> Paste CSV
        </button>
      </div>

      {/* CSV paste area */}
      {csvOpen && (
        <div className="space-y-2">
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            placeholder={"Label,Value\nQ1,120\nQ2,200\n\nor multi-series:\nLabel,S1,S2\nQ1,120,80"}
            rows={5}
            className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button onClick={applyCSV} disabled={!csvText.trim()} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-[11px] font-bold transition-all">
              Apply
            </button>
            <button onClick={() => setCsvOpen(false)} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[11px] transition-all">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
