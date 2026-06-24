"use client";
import { filters as fabricFilters } from "fabric";
import { Row } from "./Row";
import { getFilterValue, hasFilter, setFilter, toggleFilter } from "@/utils/fabricFilters";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

interface Props {
  obj: AnyObj;
  canvas: AnyObj;
  onChanged: () => void;
}

export function ImagePropertyPanel({ obj, canvas, onChanged }: Props) {
  function mutate(updates: Record<string, unknown>) {
    if (!obj || !canvas) return;
    obj.set(updates);
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
    <div className="p-3 space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Image</p>

      <Row label={`Opacity (${Math.round((obj.opacity ?? 1) * 100)}%)`}>
        <input type="range" min={0} max={100} step={1} value={Math.round((obj.opacity ?? 1) * 100)}
          onChange={e => mutate({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-violet-500" />
      </Row>

      <Row label={`Brightness (${getFilterValue(obj, "Brightness", "brightness")})`}>
        <input type="range" min={-100} max={100} step={1}
          value={getFilterValue(obj, "Brightness", "brightness")}
          onChange={e => setFilter(canvas, obj, "Brightness", fabricFilters.Brightness as new (opts: Record<string, number>) => object, "brightness", Number(e.target.value), onChanged)}
          className="w-full accent-violet-500" />
      </Row>

      <Row label={`Contrast (${getFilterValue(obj, "Contrast", "contrast")})`}>
        <input type="range" min={-100} max={100} step={1}
          value={getFilterValue(obj, "Contrast", "contrast")}
          onChange={e => setFilter(canvas, obj, "Contrast", fabricFilters.Contrast as new (opts: Record<string, number>) => object, "contrast", Number(e.target.value), onChanged)}
          className="w-full accent-violet-500" />
      </Row>

      <Row label="">
        <button onClick={() => toggleFilter(canvas, obj, "Grayscale", fabricFilters.Grayscale as new () => object, onChanged)}
          className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${hasFilter(obj, "Grayscale") ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-500 hover:text-zinc-200"}`}>
          {hasFilter(obj, "Grayscale") ? "Remove Grayscale" : "Grayscale"}
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
  );
}
