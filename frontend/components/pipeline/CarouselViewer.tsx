"use client";
import { useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { InstagramPost } from "@/components/pipeline/InstagramPreview";
import type { ContentResponse, AngleResponse } from "@/lib/api";

interface CarouselViewerProps {
  contentResult: ContentResponse;
  angleResult: AngleResponse | null;
}

export function CarouselViewer({ contentResult, angleResult }: CarouselViewerProps) {
  const [activeCarousel, setActiveCarousel] = useState(0);
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
    </div>
  );
}
