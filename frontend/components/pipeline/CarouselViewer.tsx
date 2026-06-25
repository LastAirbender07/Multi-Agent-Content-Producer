"use client";
import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2, GitCompare, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { InstagramPost } from "@/components/pipeline/InstagramPreview";
import { CarouselCompare } from "@/components/pipeline/CarouselCompare";
import { CaptionEditor } from "@/components/pipeline/CaptionEditor";
import type { ContentResponse, AngleResponse } from "@/lib/api";
import { api } from "@/lib/api";

interface CarouselViewerProps {
  contentResult: ContentResponse;
  angleResult: AngleResponse | null;
}

export function CarouselViewer({ contentResult, angleResult }: CarouselViewerProps) {
  const [activeCarousel, setActiveCarousel] = useState(0);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setActiveCarousel(Math.round(el.scrollLeft / el.offsetWidth));
  }, []);

  function scroll(dir: "prev" | "next") {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "next" ? el.offsetWidth : -el.offsetWidth, behavior: "smooth" });
  }

  async function handleDownload(runId: string, angleIdx: number) {
    setDownloading(angleIdx);
    try {
      const blob = await api.downloadCarouselZip(runId, angleIdx);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carousel_${runId.slice(0, 8)}_angle_${angleIdx}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloading(null);
    }
  }

  const total = contentResult.carousel_paths.length;
  if (total === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">No carousels generated</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Scroll track */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="overflow-x-auto snap-x snap-mandatory scroll-smooth flex pb-2"
      >
        {contentResult.carousel_paths.map((slides, angleIdx) => {
          const angle = angleResult?.selected_angles[angleIdx];
          const caption = contentResult.captions?.[angleIdx] || angle?.statement || "";
          const hashtags = contentResult.hashtags_per_angle?.[angleIdx] || [];
          return (
            <motion.div
              key={angleIdx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: angleIdx * 0.1 }}
              className="snap-start shrink-0 w-full flex justify-center"
            >
              <InstagramPost
                slides={slides}
                caption={caption}
                hashtags={hashtags}
                angleStatement={angle?.statement || ""}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Navigation bar */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => scroll("prev")}
            disabled={activeCarousel === 0}
            className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-violet-500/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  carouselRef.current?.scrollTo({
                    left: i * (carouselRef.current?.offsetWidth ?? 0),
                    behavior: "smooth",
                  });
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === activeCarousel
                    ? "w-5 h-2 bg-violet-500"
                    : "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => scroll("next")}
            disabled={activeCarousel === total - 1}
            className="w-7 h-7 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-violet-500/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={14} />
          </button>

          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">
            {activeCarousel + 1} / {total}
          </span>
        </div>
      )}

      {/* Download + Compare row */}
      <div className={`grid gap-2 ${total > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {contentResult.carousel_paths.map((_, angleIdx) => {
          const runId = contentResult.run_id;
          const isDownloading = downloading === angleIdx;
          return (
            <div key={angleIdx} className="flex gap-2">
              <button
                onClick={() => handleDownload(runId, angleIdx)}
                disabled={isDownloading || !runId}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-zinc-700/50 bg-zinc-900/60 text-zinc-400 text-xs font-bold hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {total > 1 ? `Download Angle ${angleIdx + 1}` : "Download ZIP"}
              </button>
              {runId && (
                <button
                  onClick={() => setEditingCaption(angleIdx)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700/50 bg-zinc-900/60 text-zinc-500 text-xs font-bold hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5 transition-all"
                  title="Edit caption & hashtags"
                >
                  <Pencil size={12} />
                  Caption
                </button>
              )}
            </div>
          );
        })}
        {total > 1 && (
          <button
            onClick={() => setShowCompare(true)}
            className="col-span-2 flex items-center justify-center gap-2 py-2 rounded-xl border border-zinc-700/50 bg-zinc-900/60 text-zinc-500 text-xs font-bold hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/5 transition-all"
          >
            <GitCompare size={13} />
            Compare A/B
          </button>
        )}
      </div>

      <CarouselCompare
        open={showCompare}
        onClose={() => setShowCompare(false)}
        contentResult={contentResult}
        angleResult={angleResult}
      />

      {editingCaption !== null && contentResult.run_id && (
        <CaptionEditor
          open
          onClose={() => setEditingCaption(null)}
          runId={contentResult.run_id}
          angleIndex={editingCaption}
          angleStatement={angleResult?.selected_angles[editingCaption]?.statement}
        />
      )}
    </div>
  );
}
