"use client";
import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, GitCompare, Link, Link2Off } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ASSET_BASE } from "@/lib/api/client";
import type { ContentResponse, AngleResponse } from "@/lib/api";

interface CarouselCompareProps {
  open: boolean;
  onClose: () => void;
  contentResult: ContentResponse;
  angleResult: AngleResponse | null;
}

function slideUrl(path: string): string {
  const m = path.indexOf("/outputs/runs/");
  if (m !== -1) return `${ASSET_BASE}${path.slice(m)}`;
  return `${ASSET_BASE}/${path.replace(/^\//, "")}`;
}

export function CarouselCompare({ open, onClose, contentResult, angleResult }: CarouselCompareProps) {
  const [leftAngle,  setLeftAngle]  = useState(0);
  const [rightAngle, setRightAngle] = useState(1);
  const [leftIdx,    setLeftIdx]    = useState(0);
  const [rightIdx,   setRightIdx]   = useState(0);
  // When synced, navigating one side moves both
  const [synced, setSynced] = useState(true);

  const totalAngles = contentResult.carousel_paths.length;
  const leftSlides  = contentResult.carousel_paths[leftAngle]  ?? [];
  const rightSlides = contentResult.carousel_paths[rightAngle] ?? [];
  const leftTotal   = leftSlides.length;
  const rightTotal  = rightSlides.length;

  const safeLeft  = Math.min(leftIdx,  Math.max(0, leftTotal  - 1));
  const safeRight = Math.min(rightIdx, Math.max(0, rightTotal - 1));

  // Clamp if angle changes to one with fewer slides
  useEffect(() => { setLeftIdx(i  => Math.min(i, Math.max(0, leftTotal  - 1))); }, [leftAngle,  leftTotal]);
  useEffect(() => { setRightIdx(i => Math.min(i, Math.max(0, rightTotal - 1))); }, [rightAngle, rightTotal]);

  const move = useCallback((dir: -1 | 1) => {
    if (synced) {
      setLeftIdx(i  => Math.max(0, Math.min(leftTotal  - 1, i + dir)));
      setRightIdx(i => Math.max(0, Math.min(rightTotal - 1, i + dir)));
    }
  }, [synced, leftTotal, rightTotal]);

  // Keyboard nav when synced
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  move(-1);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "Escape")     onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, move, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950"
        >
          {/* ── Top bar ── */}
          <div className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-zinc-800/50 bg-zinc-950/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-600/15 border border-violet-500/25 flex items-center justify-center">
                <GitCompare size={13} className="text-violet-400" />
              </div>
              <div>
                <p className="text-[12px] font-black text-white tracking-tight">A/B Compare</p>
                <p className="text-[9px] text-zinc-600 font-semibold uppercase tracking-widest">
                  {totalAngles} angles
                </p>
              </div>
            </div>

            {/* Sync toggle + synced nav */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSynced(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                  synced
                    ? "bg-violet-600/15 border-violet-500/30 text-violet-300"
                    : "bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
                }`}
              >
                {synced ? <Link size={11} /> : <Link2Off size={11} />}
                {synced ? "Synced" : "Independent"}
              </button>

              {synced && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => move(-1)}
                    disabled={safeLeft === 0 && safeRight === 0}
                    className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-1 items-center">
                    {Array.from({ length: Math.max(leftTotal, rightTotal) }).map((_, i) => {
                      const active = i === safeLeft;
                      const inBothRange = i < leftTotal && i < rightTotal;
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setLeftIdx(Math.min(i, leftTotal - 1));
                            setRightIdx(Math.min(i, rightTotal - 1));
                          }}
                          className={`rounded-full transition-all duration-300 ${
                            active
                              ? "w-5 h-2 bg-violet-500"
                              : inBothRange
                              ? "w-2 h-2 bg-zinc-700 hover:bg-zinc-500"
                              : "w-2 h-2 bg-zinc-800 opacity-50"
                          }`}
                          title={!inBothRange ? "Only one angle has this slide" : undefined}
                        />
                      );
                    })}
                  </div>
                  <button
                    onClick={() => move(1)}
                    disabled={safeLeft >= leftTotal - 1 && safeRight >= rightTotal - 1}
                    className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 disabled:opacity-20 transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Split view ── */}
          <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-zinc-800/40 min-h-0">
            <SlideColumn
              label="A"
              accent="violet"
              angleIdx={leftAngle}
              totalAngles={totalAngles}
              otherAngleIdx={rightAngle}
              slides={leftSlides}
              slideIdx={safeLeft}
              onSlideChange={setLeftIdx}
              onAngleChange={(i) => { setLeftAngle(i); setLeftIdx(0); }}
              angleStatement={angleResult?.selected_angles[leftAngle]?.statement ?? ""}
              caption={contentResult.captions?.[leftAngle] ?? ""}
              hashtags={contentResult.hashtags_per_angle?.[leftAngle] ?? []}
              synced={synced}
              totalOther={rightTotal}
            />
            <SlideColumn
              label="B"
              accent="cyan"
              angleIdx={rightAngle}
              totalAngles={totalAngles}
              otherAngleIdx={leftAngle}
              slides={rightSlides}
              slideIdx={safeRight}
              onSlideChange={setRightIdx}
              onAngleChange={(i) => { setRightAngle(i); setRightIdx(0); }}
              angleStatement={angleResult?.selected_angles[rightAngle]?.statement ?? ""}
              caption={contentResult.captions?.[rightAngle] ?? ""}
              hashtags={contentResult.hashtags_per_angle?.[rightAngle] ?? []}
              synced={synced}
              totalOther={leftTotal}
            />
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 flex items-center justify-center gap-6 py-2 border-t border-zinc-800/30 bg-zinc-950/60">
            <span className="text-[9px] text-zinc-700 font-semibold uppercase tracking-widest">
              {synced ? "← → to navigate both · click Synced to scroll independently" : "Use ← → arrows on each column · click Independent to sync"}
              {" · Esc to close"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Per-column component ──────────────────────────────────────────────────────

interface SlideColumnProps {
  label: "A" | "B";
  accent: "violet" | "cyan";
  angleIdx: number;
  totalAngles: number;
  otherAngleIdx: number;
  slides: string[];
  slideIdx: number;
  onSlideChange: (i: number) => void;
  onAngleChange: (i: number) => void;
  angleStatement: string;
  caption: string;
  hashtags: string[];
  synced: boolean;
  totalOther: number;
}

function SlideColumn({
  label, accent, angleIdx, totalAngles, otherAngleIdx,
  slides, slideIdx, onSlideChange, onAngleChange,
  angleStatement, caption, hashtags, synced, totalOther,
}: SlideColumnProps) {
  const total = slides.length;
  const safe  = Math.min(slideIdx, Math.max(0, total - 1));
  const slide = slides[safe];

  // Mismatch indicator: this column is beyond the other's range
  const beyondOther = safe >= totalOther;

  const accentStyles = {
    badge:    accent === "violet" ? "bg-violet-600/20 border-violet-500/35 text-violet-300" : "bg-cyan-600/15 border-cyan-500/30 text-cyan-300",
    chip:     accent === "violet" ? "bg-violet-600/20 border-violet-500/35 text-violet-300" : "bg-cyan-600/15 border-cyan-500/30 text-cyan-300",
    dot:      accent === "violet" ? "bg-violet-500" : "bg-cyan-500",
    hashtag:  accent === "violet" ? "text-violet-500/60" : "text-cyan-500/55",
    mismatch: accent === "violet" ? "border-amber-500/30 bg-amber-500/5"  : "border-amber-500/30 bg-amber-500/5",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Column header */}
      <div className="shrink-0 px-6 py-3 border-b border-zinc-800/40 bg-white/[0.015]">
        <div className="flex items-center gap-2.5 mb-2">
          <span className={`w-[22px] h-[22px] rounded-[7px] border flex items-center justify-center text-[10px] font-black shrink-0 ${accentStyles.badge}`}>
            {label}
          </span>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-wrap">
            {Array.from({ length: totalAngles }).map((_, i) => (
              <button
                key={i}
                onClick={() => onAngleChange(i)}
                disabled={i === otherAngleIdx}
                className={`shrink-0 px-2.5 py-[3px] rounded-[7px] border text-[10px] font-bold transition-all disabled:opacity-25 disabled:cursor-not-allowed ${
                  i === angleIdx ? accentStyles.chip : "bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                }`}
              >
                Angle {i + 1}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[10px] text-zinc-600 font-semibold shrink-0 tabular-nums">
            {total} slides
          </span>
        </div>
        <p className="text-[10.5px] text-zinc-400 leading-snug font-medium line-clamp-2">
          {angleStatement || `Angle ${angleIdx + 1}`}
        </p>
      </div>

      {/* Slide area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 px-5 py-4 overflow-hidden relative min-h-0">
        <AnimatePresence mode="wait">
          {slide ? (
            <motion.div
              key={`${angleIdx}-${safe}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="relative w-full h-full flex items-center justify-center min-h-0"
            >
              <img
                src={slideUrl(slide)}
                alt={`${label} slide ${safe + 1}`}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
              {/* Counter badge */}
              <div className={`absolute top-3 right-3 px-2.5 py-[3px] rounded-full text-[9px] font-bold backdrop-blur-sm tabular-nums ${
                beyondOther
                  ? "bg-amber-500/80 text-black"
                  : "bg-black/70 text-white"
              }`}>
                {safe + 1} / {total}
                {beyondOther && " ✦"}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <span className="text-2xl">—</span>
              </div>
              <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">No slide</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mismatch notice */}
      {beyondOther && (
        <div className={`shrink-0 flex items-center gap-2 px-5 py-2 border-t ${accentStyles.mismatch}`}>
          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">
            ✦ Slide {safe + 1} has no counterpart — this angle has {total - totalOther} extra slide{total - totalOther > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Per-column nav — visible in independent mode */}
      {!synced && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-2 border-t border-zinc-800/40 bg-zinc-900/30">
          <button
            onClick={() => onSlideChange(Math.max(0, safe - 1))}
            disabled={safe === 0}
            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={13} />
          </button>
          <div className="flex gap-1 items-center">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => onSlideChange(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === safe ? `w-4 h-[6px] ${accentStyles.dot}` : "w-[6px] h-[6px] bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => onSlideChange(Math.min(total - 1, safe + 1))}
            disabled={safe === total - 1}
            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-700 disabled:opacity-20 transition-all"
          >
            <ChevronRight size={13} />
          </button>
          <span className="text-[10px] text-zinc-600 font-bold tabular-nums ml-1">{safe + 1} / {total}</span>
        </div>
      )}

      {/* Caption strip */}
      <div className="shrink-0 border-t border-zinc-800/40 bg-white/[0.015] px-6 py-3 max-h-[88px] overflow-hidden">
        <p className="text-[10.5px] text-zinc-500 leading-relaxed line-clamp-3">
          {caption || <span className="text-zinc-700 italic">No caption</span>}
        </p>
        {hashtags.length > 0 && (
          <p className={`mt-1.5 text-[9.5px] font-bold line-clamp-1 ${accentStyles.hashtag}`}>
            {hashtags.slice(0, 6).map(h => `#${h}`).join(" ")}
            {hashtags.length > 6 && ` +${hashtags.length - 6}`}
          </p>
        )}
      </div>
    </div>
  );
}
