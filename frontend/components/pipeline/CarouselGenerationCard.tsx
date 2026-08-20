"use client";

import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { usePipelineSSE } from "@/hooks/usePipelineSSE";

interface CarouselGenerationCardProps {
  active: boolean;
  onDone?: () => void;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

const PHASE_STEPS = [
  { id: "generating_angles",   label: "Writing angles"  },
  { id: "generating_carousel", label: "Building slides" },
  { id: "rendering",           label: "Rendering PNGs"  },
  { id: "blog_post",           label: "Writing blog"    },
];

const PHASE_ORDER = ["generating_angles", "generating_carousel", "rendering", "blog_post", "complete"];

export function CarouselGenerationCard({ active, onDone }: CarouselGenerationCardProps) {
  const runId = useSelector((state: RootState) => state.pipeline.runId);
  const { pct, phase, message, events, connected, done, elapsedMs } = usePipelineSSE(
    runId,
    "content",
    active
  );

  const calledDone = useRef(false);
  useEffect(() => {
    if (done && !calledDone.current) {
      calledDone.current = true;
      onDone?.();
    }
  }, [done, onDone]);

  useEffect(() => {
    if (active) calledDone.current = false;
  }, [active, runId]);

  const curIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-6">
      {/* header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
            <span className="text-lg">🖼️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Generate Carousels</p>
            <p className="text-xs text-white/40">Phase 3 of 3</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active && elapsedMs > 0 && (
            <span className="text-xs tabular-nums font-mono text-white/30">
              {formatElapsed(elapsedMs)}
            </span>
          )}
          {active && (
            <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              connected
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-amber-400 border-amber-500/30 bg-amber-500/10"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {connected ? "Live" : "…"}
            </span>
          )}
          {done && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
              ✓ Done
            </span>
          )}
        </div>
      </div>

      {/* progress bar */}
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-white/60">
          {message || (active ? "Initialising…" : "Waiting for angles")}
        </span>
        <span className="text-white/40 tabular-nums">{pct}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mb-5">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #0891b2, #06b6d4, #67e8f9)",
            boxShadow: pct > 0 ? "0 0 10px rgba(6,182,212,.5)" : "none",
          }}
        />
      </div>

      {/* phase steps */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-0">
        {PHASE_STEPS.map((step) => {
          const idx = PHASE_ORDER.indexOf(step.id);
          const isDone = idx < curIdx || phase === "complete";
          const isActive = idx === curIdx && phase !== "complete";
          return (
            <div key={step.id} className="flex items-center gap-2">
              <span className={`text-xs w-3 text-center ${isDone ? "text-cyan-400" : isActive ? "text-white" : "text-white/20"}`}>
                {isDone ? "✓" : isActive ? "⟳" : "○"}
              </span>
              <span className={`text-xs font-medium ${isDone ? "text-cyan-400" : isActive ? "text-white/80" : "text-white/25"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* activity log */}
      {events.length > 0 && (
        <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25">Activity</span>
            <span className="text-[10px] text-white/20">{events.length}</span>
          </div>
          <div className="divide-y divide-white/[0.03] max-h-28 overflow-y-auto overscroll-contain">
            {events.slice(0, 8).map((ev, i) => (
              <div key={i} className={`flex items-baseline gap-2.5 px-3 py-1.5 ${i === 0 ? "bg-cyan-500/5" : ""}`}>
                <span className="shrink-0 w-6 text-right text-[10px] font-mono tabular-nums text-cyan-500/60">
                  {ev.pct}%
                </span>
                <span className={`text-xs truncate leading-relaxed ${i === 0 ? "text-white/70" : "text-white/30"}`}>
                  {ev.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}