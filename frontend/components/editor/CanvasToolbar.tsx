"use client";
import { RotateCcw, RotateCw, Save, Download, ZoomIn, ZoomOut, Layers } from "lucide-react";

interface CanvasToolbarProps {
  topic: string;
  angleIndex: number;
  slideNumber: number;
  totalSlides?: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  saveStatus: "idle" | "saving" | "saved";
  onExportPng: () => void;
  exportStatus: "idle" | "exporting" | "exported";
  zoom: number;
  onZoom: (factor: number) => void;
  // Batch style — optional, only shown when overrides are present
  slideOverrides?: Record<string, string>;
  canvasTemplate?: string;
  onBulkStyle?: () => void;
}

export function CanvasToolbar({
  topic, angleIndex, slideNumber, totalSlides,
  canUndo, canRedo, onUndo, onRedo,
  onSave, saveStatus,
  onExportPng, exportStatus,
  zoom, onZoom,
  slideOverrides, onBulkStyle,
}: CanvasToolbarProps) {
  const shortTopic = topic.length > 36 ? topic.slice(0, 34) + "…" : topic;
  const hasOverrides = slideOverrides && Object.keys(slideOverrides).length > 0;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-950 border-b border-zinc-800/50 shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 min-w-0 flex-1">
        <span className="truncate">{shortTopic || "Untitled"}</span>
        <span className="text-zinc-700">›</span>
        <span className="text-zinc-600 shrink-0">Angle {angleIndex + 1}</span>
        <span className="text-zinc-700">›</span>
        <span className="text-zinc-600 shrink-0">Slide {slideNumber}</span>
      </div>

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <RotateCcw size={13} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <RotateCw size={13} />
        </button>
      </div>

      <div className="w-px h-4 bg-zinc-800" />

      {/* Save */}
      <button onClick={onSave} disabled={saveStatus === "saving"}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          saveStatus === "saved"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
        }`}>
        <Save size={11} />
        {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save"}
      </button>

      {/* Export PNG */}
      <button onClick={onExportPng} disabled={exportStatus === "exporting"}
        title="Re-render slide PNG (Playwright)"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          exportStatus === "exported"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 disabled:opacity-40"
        }`}>
        <Download size={11} />
        {exportStatus === "exporting" ? "Exporting…" : exportStatus === "exported" ? "Exported ✓" : "Export PNG"}
      </button>

      {/* Apply style to other slides — only shown when this slide has overrides */}
      {hasOverrides && onBulkStyle && (totalSlides ?? 0) > 1 && (
        <button onClick={onBulkStyle}
          title="Apply this slide's style to other slides"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-600/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all">
          <Layers size={11} />
          Style →
        </button>
      )}

      <div className="w-px h-4 bg-zinc-800" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5">
        <button onClick={() => onZoom(Math.max(0.25, zoom - 0.25))} className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
          <ZoomOut size={12} />
        </button>
        <span className="text-[10px] text-zinc-500 w-8 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoom(Math.min(2, zoom + 0.25))} className="p-1.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
          <ZoomIn size={12} />
        </button>
        <button onClick={() => onZoom(-1)}
          className="px-2 py-1 rounded-lg text-[10px] text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all ml-0.5">
          Fit
        </button>
      </div>
    </div>
  );
}
