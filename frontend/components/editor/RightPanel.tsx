"use client";
import { filters as fabricFilters } from "fabric";
import type { SelectedObjectInfo } from "@/components/editor/FabricCanvas";
import { ChartEditorPanel } from "@/components/editor/ChartEditorPanel";
import type { ChartType, ChartData, ChartObjectData } from "@/types/chart";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

interface RightPanelProps {
  selectedObject: SelectedObjectInfo | null;
  canvas: FabricCanvas;
  onChanged: () => void;
  onChartApply?: (type: ChartType, data: ChartData) => Promise<void>;
}

export function RightPanel({ selectedObject, canvas, onChanged, onChartApply }: RightPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: any = canvas?.getActiveObject() ?? null;

  // ── Chart object selected ───────────────────────────────────────────────
  const objData = obj?.data as ChartObjectData | undefined;
  if (objData?.role === "chart" && onChartApply) {
    return (
      <div className="w-72 shrink-0 bg-zinc-950 border-l border-zinc-800/50 overflow-hidden flex flex-col">
        <ChartEditorPanel
          compact
          initialType={objData.chartType}
          initialData={objData.chartData}
          theme={objData.theme ?? "aurora"}
          onApply={onChartApply}
        />
      </div>
    );
  }

  function mutate(updates: Record<string, unknown>) {
    if (!obj || !canvas) return;
    obj.set(updates);
    canvas.renderAll();
    onChanged();
  }

  function getFilterValue(type: string, prop: string): number {
    if (!obj?.filters) return 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f = (obj.filters as any[]).find((x: any) => x.type === type);
    return f ? Math.round((f[prop] ?? 0) * 100) : 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function hasFilter(type: string): boolean {
    return (obj?.filters ?? []).some((f: { type: string }) => f.type === type);
  }

  function setFilter(type: string, FilterClass: new (opts: Record<string, number>) => object, prop: string, rawVal: number) {
    if (!obj || !canvas) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = obj.filters ?? [];
    const idx = filters.findIndex((f: { type: string }) => f.type === type);
    const newFilter = new FilterClass({ [prop]: rawVal / 100 });
    if (idx >= 0) filters[idx] = newFilter; else filters.push(newFilter);
    obj.filters = filters;
    obj.applyFilters();
    canvas.renderAll();
    onChanged();
  }

  function toggleFilter(type: string, FilterClass: new () => object) {
    if (!obj || !canvas) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any[] = obj.filters ?? [];
    if (hasFilter(type)) {
      obj.filters = filters.filter((f: { type: string }) => f.type !== type);
    } else {
      obj.filters = [...filters, new FilterClass()];
    }
    obj.applyFilters();
    canvas.renderAll();
    onChanged();
  }

  function setAsBackground() {
    if (!obj || !canvas) return;
    const scaleX = 1080 / (obj.width ?? 1080);
    const scaleY = 1080 / (obj.height ?? 1080);
    const scale = Math.max(scaleX, scaleY);
    obj.set({ left: 0, top: 0, scaleX: scale, scaleY: scale });
    canvas.sendObjectToBack(obj);
    canvas.renderAll();
    onChanged();
  }

  return (
    <div className="w-56 shrink-0 bg-zinc-950 border-l border-zinc-800/50 overflow-y-auto custom-scrollbar flex flex-col">
      {selectedObject?.type === "textbox" && obj ? (
        <div className="p-3 space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Text</p>

          <Row label="Font family">
            <select value={(obj.fontFamily ?? "Plus Jakarta Sans").split(",")[0].trim()}
              onChange={e => mutate({ fontFamily: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50">
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Syne">Syne</option>
              <option value="Georgia">Georgia</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
            </select>
          </Row>

          <Row label="Font size">
            <div className="flex items-center gap-1.5">
              <input type="number" min={6} max={300} step={1} value={obj.fontSize ?? 16}
                onChange={e => mutate({ fontSize: Number(e.target.value) })}
                className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500/50" />
              <div className="flex flex-wrap gap-0.5">
                {[16, 24, 32, 48, 64].map(sz => (
                  <button key={sz} onClick={() => mutate({ fontSize: sz })}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${obj.fontSize === sz ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </Row>

          <Row label="Weight">
            <div className="flex gap-1">
              {(["normal", "bold"] as const).map(w => (
                <button key={w} onClick={() => mutate({ fontWeight: w })}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${obj.fontWeight === w ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
                  {w}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Style">
            <div className="flex gap-1">
              {(["normal", "italic"] as const).map(s => (
                <button key={s} onClick={() => mutate({ fontStyle: s })}
                  className={`flex-1 py-1 rounded-lg text-xs capitalize transition-all ${obj.fontStyle === s ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Color">
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-700">
                <div className="absolute inset-0" style={{ background: obj.fill ?? "#ffffff" }} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={obj.fill ?? "#ffffff"}
                  onChange={e => mutate({ fill: e.target.value })} />
              </div>
              <input type="text" value={obj.fill ?? "#ffffff"}
                onChange={e => mutate({ fill: e.target.value })}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          </Row>

          <Row label={`Line height (${(obj.lineHeight ?? 1.2).toFixed(1)})`}>
            <input type="range" min={0.8} max={3} step={0.1} value={obj.lineHeight ?? 1.2}
              onChange={e => mutate({ lineHeight: Number(e.target.value) })}
              className="w-full accent-violet-500" />
          </Row>

          <Row label={`Letter spacing (${obj.charSpacing ?? 0})`}>
            <input type="range" min={-100} max={800} step={10} value={obj.charSpacing ?? 0}
              onChange={e => mutate({ charSpacing: Number(e.target.value) })}
              className="w-full accent-violet-500" />
          </Row>

          <Row label="Alignment">
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map(a => (
                <button key={a} onClick={() => mutate({ textAlign: a })}
                  className={`flex-1 py-1 rounded-lg text-xs capitalize transition-all ${obj.textAlign === a ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </Row>

          <Row label={`Opacity (${Math.round((obj.opacity ?? 1) * 100)}%)`}>
            <input type="range" min={0} max={100} step={1} value={Math.round((obj.opacity ?? 1) * 100)}
              onChange={e => mutate({ opacity: Number(e.target.value) / 100 })}
              className="w-full accent-violet-500" />
          </Row>
        </div>

      ) : selectedObject?.type === "image" && obj ? (
        <div className="p-3 space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Image</p>

          <Row label={`Opacity (${Math.round((obj.opacity ?? 1) * 100)}%)`}>
            <input type="range" min={0} max={100} step={1} value={Math.round((obj.opacity ?? 1) * 100)}
              onChange={e => mutate({ opacity: Number(e.target.value) / 100 })}
              className="w-full accent-violet-500" />
          </Row>

          <Row label={`Brightness (${getFilterValue("Brightness", "brightness")})`}>
            <input type="range" min={-100} max={100} step={1}
              value={getFilterValue("Brightness", "brightness")}
              onChange={e => setFilter("Brightness", fabricFilters.Brightness as new (opts: Record<string, number>) => object, "brightness", Number(e.target.value))}
              className="w-full accent-violet-500" />
          </Row>

          <Row label={`Contrast (${getFilterValue("Contrast", "contrast")})`}>
            <input type="range" min={-100} max={100} step={1}
              value={getFilterValue("Contrast", "contrast")}
              onChange={e => setFilter("Contrast", fabricFilters.Contrast as new (opts: Record<string, number>) => object, "contrast", Number(e.target.value))}
              className="w-full accent-violet-500" />
          </Row>

          <Row label="">
            <button onClick={() => toggleFilter("Grayscale", fabricFilters.Grayscale as new () => object)}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${hasFilter("Grayscale") ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
              {hasFilter("Grayscale") ? "Remove Grayscale" : "Grayscale"}
            </button>
          </Row>

          <Row label="">
            <button onClick={setAsBackground}
              className="w-full py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-all">
              Set as Background
            </button>
          </Row>

          <Row label="">
            <button onClick={() => { if (!obj || !canvas) return; obj.filters = []; obj.applyFilters(); canvas.renderAll(); onChanged(); }}
              className="w-full py-1.5 rounded-lg text-xs text-zinc-600 hover:text-zinc-400 transition-all">
              Clear all filters
            </button>
          </Row>
        </div>

      ) : (
        <div className="p-3 space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Canvas</p>
          <Row label="Background">
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-700">
                <div className="absolute inset-0" style={{ background: (canvas?.backgroundColor as string) ?? "#111111" }} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={(canvas?.backgroundColor as string) ?? "#111111"}
                  onChange={e => { canvas?.set("backgroundColor", e.target.value); canvas?.renderAll(); onChanged(); }} />
              </div>
              <input type="text" value={(canvas?.backgroundColor as string) ?? "#111111"}
                onChange={e => { canvas?.set("backgroundColor", e.target.value); canvas?.renderAll(); onChanged(); }}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-violet-500/50" />
            </div>
          </Row>
          <div className="flex-1 flex flex-col items-center justify-center pt-8 text-center">
            <p className="text-[10px] text-zinc-700">Select an object to edit its properties.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-[10px] text-zinc-500">{label}</p>}
      {children}
    </div>
  );
}
