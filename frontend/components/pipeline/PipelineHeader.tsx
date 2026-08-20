// @ts-nocheck
"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { usePipelineOrchestration } from "@/hooks/usePipelineOrchestration";
import { ArrowRight, X } from "lucide-react";

export function PipelineHeader() {
  const pipelineState = useSelector((state: RootState) => state.pipeline);
  const { startPipeline, cancelPipeline } = usePipelineOrchestration();

  const isRunning = ["research", "angles", "content"].includes(pipelineState.stage);

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#080810]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-4xl px-6 py-3 flex items-center gap-4">
        {/* topic */}
        <div className="flex-1 min-w-0">
          <input
            key={pipelineState.runId ?? "empty"}
            defaultValue={pipelineState.topic ?? ""}
            readOnly={isRunning}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isRunning) {
                startPipeline((e.target as HTMLInputElement).value);
              }
            }}
            className="w-full bg-transparent text-sm text-white placeholder-white/25 outline-none"
            placeholder="Enter a topic to research and generate content…"
          />
        </div>

        {/* slide count selector */}
        {!isRunning && (
          <div className="flex items-center gap-1 shrink-0">
            {[5, 7, 10, 12].map((n) => (
              <button
                key={n}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  pipelineState.slideCount === n
                    ? "bg-violet-500 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {n}
              </button>
            ))}
            <span className="text-xs text-white/25 ml-1">slides</span>
          </div>
        )}

        {/* action button */}
        {isRunning ? (
          <button
            onClick={cancelPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        ) : (
          <button
            onClick={() => {
              const input = document.querySelector("header input") as HTMLInputElement;
              if (input?.value) startPipeline(input.value);
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-colors"
          >
            Run <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}