// @ts-nocheck
"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { ChevronDown, ChevronUp, Zap } from "lucide-react";

interface AngleSelectionCardProps {
  active: boolean;
  onSelect: (index: number) => void;
}

export function AngleSelectionCard({ active, onSelect }: AngleSelectionCardProps) {
  const angles = useSelector((state: RootState) => state.pipeline.angles);
  const selectedAngles = useSelector((state: RootState) => state.pipeline.selectedAngles);
  const [expanded, setExpanded] = useState(false);

  const isWaiting = !active && angles.length === 0;
  const isReady = angles.length > 0;

  return (
    <div className={`rounded-2xl border bg-[#0d0d18] transition-all ${
      isReady ? "border-violet-500/30" : "border-white/10"
    }`}>
      <div
        className="flex items-center justify-between p-5 cursor-pointer"
        onClick={() => isReady && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold
            ${isReady ? "bg-violet-500/20 border border-violet-500/40 text-violet-300" : "bg-white/5 border border-white/10 text-white/30"}`}>
            2
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="text-base">🎯</span> Angle Selection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            isReady
              ? "text-violet-300 border-violet-500/40 bg-violet-500/10"
              : "text-white/30 border-white/10 bg-transparent"
          }`}>
            {isWaiting ? "WAITING" : isReady ? `${angles.length} READY` : "LOADING"}
          </span>
          {isReady && (
            expanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />
          )}
        </div>
      </div>

      {expanded && isReady && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
          {angles.map((angle, i) => (
            <div
              key={i}
              onClick={() => onSelect(i)}
              className={`rounded-xl p-4 cursor-pointer border transition-all ${
                selectedAngles.includes(i)
                  ? "border-violet-500/50 bg-violet-500/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white/90 leading-relaxed">{angle.statement}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedAngles.includes(i) && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-300 bg-violet-500/15 px-1.5 py-0.5 rounded-full">
                      <Zap className="h-2.5 w-2.5" /> Selected
                    </span>
                  )}
                </div>
              </div>
              {angle.emotional_hook && (
                <span className="mt-2 inline-block text-[10px] uppercase tracking-wider text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                  {angle.emotional_hook}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}