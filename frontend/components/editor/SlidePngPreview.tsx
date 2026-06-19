"use client";
import { useState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface SlidePngPreviewProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;
  onEnterEditMode: () => void;
}

export function SlidePngPreview({ runId, angleIndex, slideNumber, onEnterEditMode }: SlidePngPreviewProps) {
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCanvas, setHasCanvas] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPngUrl(null);

    async function load() {
      try {
        // Check if a canvas edit already exists
        const { canvas_json } = await api.getCanvas(runId, angleIndex, slideNumber);
        if (canvas_json) {
          // A saved canvas edit exists — go straight to edit mode
          setHasCanvas(true);
          onEnterEditMode();
          return;
        }
      } catch {}

      // Find the PNG from the manifest
      try {
        const manifest = await api.getRunManifest(runId);
        const angle = manifest.angles.find(a => a.index === angleIndex);
        if (angle?.png_paths) {
          const png = angle.png_paths.find(p => p.includes(`slide_${String(slideNumber).padStart(2, "0")}`));
          if (png) {
            // Convert backend path to URL
            const url = `http://localhost:8000${png.startsWith("/") ? png : "/" + png}`;
            setPngUrl(url);
          }
        }
      } catch {}

      setLoading(false);
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, angleIndex, slideNumber]);

  if (hasCanvas) return null; // handled by parent

  return (
    <div className="flex-1 bg-zinc-950 flex items-center justify-center relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={28} className="text-violet-400 animate-spin" />
        </div>
      )}

      {!loading && pngUrl && (
        <div className="relative group">
          {/* The actual rendered slide PNG */}
          <img
            src={pngUrl}
            alt={`Slide ${slideNumber}`}
            className="max-h-[calc(100vh-120px)] max-w-full object-contain"
            style={{
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.7)",
              borderRadius: 2,
            }}
            onError={() => setPngUrl(null)}
          />

          {/* Edit overlay — appears on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={onEnterEditMode}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-xl transition-all transform scale-95 group-hover:scale-100"
            >
              <Pencil size={15} />
              Edit this slide
            </button>
          </div>
        </div>
      )}

      {!loading && !pngUrl && (
        /* No PNG found — show canvas editor directly */
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-zinc-500 text-sm">No preview available for this slide.</p>
          <button
            onClick={onEnterEditMode}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all"
          >
            <Pencil size={15} />
            Open in canvas editor
          </button>
        </div>
      )}

      {/* Always-visible Edit button at bottom */}
      {!loading && pngUrl && (
        <button
          onClick={onEnterEditMode}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-800/90 hover:bg-violet-600 border border-zinc-700 hover:border-violet-500 text-zinc-300 hover:text-white font-semibold text-xs transition-all backdrop-blur-sm"
        >
          <Pencil size={12} />
          Edit in canvas
        </button>
      )}
    </div>
  );
}
