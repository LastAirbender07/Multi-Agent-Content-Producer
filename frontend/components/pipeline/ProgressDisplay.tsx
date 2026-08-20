// @ts-nocheck
"use client";
import React, { useEffect, useState } from "react";
import type { SSEProgressEvent } from "@/hooks/usePipelineSSE";

interface ProgressDisplayProps {
  pct: number;
  label: string;
  phase: string;
  current?: number;
  total?: number;
  log: SSEProgressEvent[];
  /** Show a small elapsed-time counter (ms since component mounted) */
  showTimer?: boolean;
}

const PHASE_ICONS: Record<string, string> = {
  starting: "◎",
  intake: "◎",
  executing_tools: "⟳",
  synthesizing: "✦",
  complete: "✓",
  generating_slides: "⟳",
  rendering: "⟳",
  default: "·",
};

function phaseIcon(phase: string): string {
  return PHASE_ICONS[phase] ?? PHASE_ICONS.default;
}

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    setSeconds(0);
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return seconds;
}

function formatTime(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function ProgressDisplay({
  pct,
  label,
  phase,
  current,
  total,
  log,
  showTimer = true,
}: ProgressDisplayProps) {
  const elapsed = useElapsedSeconds(pct > 0 && pct < 100);
  const isActive = pct > 0 && pct < 100;

  // Only show log entries that have a meaningful label
  const visibleLog = log.filter(e => e.label && e.label.trim()).slice(0, 6);

  return (
    <div className="mt-3 space-y-3">
      {/* ── progress bar row ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 min-h-5">
          <p className="text-xs text-blue-300/90 truncate leading-tight flex-1">
            {label || "Working…"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {showTimer && isActive && (
              <span className="text-[10px] text-zinc-500 tabular-nums">{formatTime(elapsed)}</span>
            )}
            {total && total > 0 && current !== undefined && (
              <span className="text-[10px] text-zinc-400 tabular-nums">{current}/{total}</span>
            )}
            <span className="text-xs text-zinc-400 tabular-nums font-medium">{pct}%</span>
          </div>
        </div>

        {/* Bar */}
        <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          {/* Subtle shimmer on the filled portion while active */}
          <div
            className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
          {isActive && (
            <div
              className="absolute inset-y-0 rounded-full animate-pulse opacity-40"
              style={{
                left: `${Math.max(0, pct - 12)}%`,
                width: "12%",
                background: "linear-gradient(90deg, transparent, #93c5fd, transparent)",
              }}
            />
          )}
        </div>
      </div>

      {/* ── activity log ── */}
      {visibleLog.length > 0 && (
        <div className="space-y-1.5 border-t border-zinc-800/60 pt-2.5">
          <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Activity</p>
          <div className="space-y-1">
            {visibleLog.map((event, i) => (
              <div key={i} className="flex items-start gap-2">
                <span
                  className={`text-[10px] mt-0.5 shrink-0 w-3 text-center font-mono ${
                    i === 0 && isActive ? "text-blue-400 animate-pulse" : "text-zinc-600"
                  }`}
                >
                  {i === 0 && isActive ? "⟳" : "✓"}
                </span>
                <span className={`text-[11px] leading-relaxed ${i === 0 ? "text-zinc-300" : "text-zinc-500"}`}>
                  {event.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}