"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { usePipelineSSE } from "@/hooks/usePipelineSSE";
import {
  CheckCircle,
  ChevronDown,
  ImagePlay,
  PencilRuler,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CarouselViewer } from "@/components/pipeline/CarouselViewer";
import { BlogExportBar } from "@/components/pipeline/BlogExportBar";
import { TokenChip } from "@/components/pipeline/TokenChip";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

interface ContentStageCardProps {
  runId: string | null;
  active: boolean;
  stageStatus?: "idle" | "running" | "done" | "error";
  open?: boolean;
  onToggle?: () => void;
  angleCount?: number;
  onComplete?: () => void;
}

export function ContentStageCard({
  runId,
  active,
  stageStatus,
  open,
  onToggle,
  angleCount,
  onComplete,
}: ContentStageCardProps) {
  const router = useRouter();
  const { stages, contentResult, angleResult, topic } = useAppSelector((s) => s.pipeline);
  const { pct, message, events, connected, done, elapsedMs } = usePipelineSSE(
    runId,
    "content",
    active
  );

  const contentStatus = stages.content.status;
  const isDone = done || stageStatus === "done" || contentStatus === "done";

  const calledComplete = useRef(false);
  useEffect(() => {
    if (done && !calledComplete.current) {
      calledComplete.current = true;
      onComplete?.();
    }
  }, [done, onComplete]);

  const bodyVisible = open === undefined ? true : open;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0d0d14] shadow-xl shadow-cyan-950/40">
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px at 50% 0%, rgba(6,182,212,.08), transparent 70%)",
        }}
      />

      {/* active pulse ring */}
      {active && !isDone && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: "inset 0 0 0 1px rgba(6,182,212,.12)" }}
        />
      )}

      {/* header */}
      <div
        className={`flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 ${
          onToggle ? "cursor-pointer select-none" : ""
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30">
            <ImagePlay className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Generate Carousels</p>
            <p className="text-xs text-white/40">
              Phase 3 of 3
              {angleCount !== undefined && angleCount > 0 && (
                <span className="ml-1.5 text-cyan-400/70">
                  · {angleCount} angle{angleCount !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onToggle && (
            <motion.div
              animate={{ rotate: bodyVisible ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4 text-white/30" />
            </motion.div>
          )}
          {active && elapsedMs > 0 && (
            <span className="text-xs tabular-nums text-white/40 font-mono">
              {formatElapsed(elapsedMs)}
            </span>
          )}
          {active && !isDone && (
            <span
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                connected
                  ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : "text-amber-400 border-amber-500/30 bg-amber-500/10"
              }`}
            >
              {connected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {connected ? "Live" : "Connecting…"}
            </span>
          )}
          {isDone && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
              <CheckCircle className="h-3 w-3" /> Done
            </span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {bodyVisible && (
          <motion.div
            key="content-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-5">

              {/* ── Running: SSE progress bar + activity log ─────────────── */}
              {contentStatus === "running" && (
                <>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm text-white/70 leading-snug">
                        {message || "Initialising…"}
                      </p>
                      <span className="ml-3 shrink-0 text-sm font-semibold tabular-nums text-white/60">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, #0891b2 0%, #06b6d4 50%, #67e8f9 100%)",
                          boxShadow:
                            pct > 0 ? "0 0 12px rgba(6,182,212,.6)" : "none",
                        }}
                      />
                    </div>
                  </div>

                  {events.length > 0 && (
                    <div className="rounded-xl bg-white/3 border border-white/6 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                          Activity
                        </span>
                        <span className="text-[10px] text-white/20">
                          {events.length} events
                        </span>
                      </div>
                      <div className="divide-y divide-white/4 max-h-36 overflow-y-auto overscroll-contain">
                        {events.slice(0, 12).map((ev, i) => (
                          <div
                            key={i}
                            className={`flex items-baseline gap-2.5 px-3 py-1.5 ${
                              i === 0 ? "bg-cyan-500/5" : ""
                            }`}
                          >
                            <span className="shrink-0 w-7 text-right text-[10px] font-mono tabular-nums text-cyan-500/70">
                              {ev.pct}%
                            </span>
                            <span
                              className={`text-xs leading-relaxed truncate ${
                                i === 0 ? "text-white/80" : "text-white/35"
                              }`}
                            >
                              {ev.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Results: carousel viewer ─────────────────────────────── */}
              {contentResult && (
                <CarouselViewer
                  contentResult={contentResult}
                  angleResult={angleResult}
                />
              )}

              {/* ── Results: tokens + blog export + editor button ────────── */}
              {contentResult && contentStatus === "done" && runId && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TokenChip runId={runId} stage="carousel" />
                    <TokenChip runId={runId} stage="caption" />
                    <TokenChip runId={runId} showTotal />
                  </div>
                  <BlogExportBar
                    runId={runId}
                    topic={topic}
                    blogPostTitle={contentResult.blog_post_title || undefined}
                  />
                  <button
                    onClick={() =>
                      router.push(
                        `/editor?run=${runId}&view=slide&angle=0&slide=1`
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/5 text-violet-400 text-sm font-bold hover:bg-violet-500/10 transition-all"
                  >
                    <PencilRuler size={14} />
                    Open in Editor
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
