"use client";
import { useState, useEffect, startTransition } from "react";
import { AlertCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addRun } from "@/store/slices/historySlice";
import { loadRun } from "@/store/slices/pipelineSlice";
import { useExpandedSet } from "@/hooks/useExpandedSet";

import { PipelineConfig } from "@/components/pipeline/PipelineConfig";
import { AngleSelector } from "@/components/pipeline/AngleSelector";
import { ResearchStageCard } from "@/components/pipeline/ResearchStageCard";
import { AngleStageCard } from "@/components/pipeline/AngleStageCard";
import { ContentStageCard } from "@/components/pipeline/ContentStageCard";
import { PipelineRecentRuns } from "@/components/pipeline/PipelineRecentRuns";

export default function PipelinePage() {
  const dispatch = useAppDispatch();
  const { stages, researchResult, angleResult, contentResult, errors, angleMode, runId, topic, mode, freshness } =
    useAppSelector((state) => state.pipeline);
  const { runs } = useAppSelector((state) => state.history);

  const { expanded: openSections, toggle, add: addSection, clear: clearSections, setExpanded: setOpenSections } = useExpandedSet<"research" | "angle" | "content">();
  const [showAngleModal, setShowAngleModal] = useState(false);
  // Lazy init: false on SSR (no window), true on client — avoids useEffect+setState for hydration guard
  const [mounted] = useState(() => typeof window !== "undefined");

  const researchStatus = stages.research.status;
  const angleStatus = stages.angle.status;
  const contentStatus = stages.content.status;

  // Auto-expand each stage when it completes
  useEffect(() => {
    if (researchStatus === "done") startTransition(() => addSection("research"));
    if (angleStatus === "done") startTransition(() => addSection("angle"));
    if (contentStatus === "done") startTransition(() => addSection("content"));
  }, [researchStatus, angleStatus, contentStatus, addSection]);

  // Collapse all when pipeline resets
  useEffect(() => {
    if (researchStatus === "idle" && angleStatus === "idle" && contentStatus === "idle") {
      startTransition(() => { clearSections(); setShowAngleModal(false); });
    }
  }, [researchStatus, angleStatus, contentStatus, clearSections]);

  // Auto-show angle selector in manual mode once angles are ready
  useEffect(() => {
    if (angleMode === "manual" && angleStatus === "done" && contentStatus === "idle" && !contentResult) {
      startTransition(() => setShowAngleModal(true));
    }
  }, [angleStatus, contentStatus, angleMode, contentResult]);

  // Save to history when pipeline fully completes.
  // Intentionally keyed only on contentStatus — all other values are stable at this point.
  useEffect(() => {
    if (contentStatus === "done" && runId && researchResult) {
      dispatch(addRun({ runId, topic, timestamp: new Date().toISOString(), researchResult, angleResult, contentResult, config: { mode, freshness, angleMode } }));
    }
  }, [contentStatus]); // intentionally omitting result deps — fires once on transition to done

  function handleLoadRun(run: typeof runs[0]) {
    dispatch(loadRun(run));
    startTransition(() =>
      setOpenSections(new Set(
        (["research", "angle", "content"] as const).filter((s) =>
          s === "research" ? !!run.researchResult : s === "angle" ? !!run.angleResult : !!run.contentResult
        )
      ))
    );
  }

  const isAnyRunning = Object.values(stages).some((s) => s.status === "running");
  const hasAnyResult = researchResult || angleResult || contentResult;

  return (
    <div className="flex flex-col h-full min-h-screen bg-black">
      <PipelineConfig />

      <main className="flex-1 overflow-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter">Production Dashboard</h2>
              <p className="text-zinc-500 text-xs font-medium mt-1">
                Multi-agent research → angles → carousel generation pipeline.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Online</span>
            </div>
          </div>

          {/* Idle placeholder */}
          {!hasAnyResult && !isAnyRunning && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-28 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                <Zap size={36} className="text-zinc-700" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight mb-2">Ready for Production</h3>
              <p className="text-zinc-500 text-sm max-w-xs leading-relaxed">
                Enter a topic above and hit "Produce Content" to start the multi-agent pipeline.
              </p>
            </motion.div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                {errors.map((e, i) => <p key={i} className="text-xs font-medium">{e}</p>)}
              </div>
            </motion.div>
          )}

          {/* Stage Cards */}
          <AnimatePresence>
            {(hasAnyResult || isAnyRunning) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <ResearchStageCard open={openSections.has("research")} onToggle={() => toggle("research")} />
                <AngleStageCard open={openSections.has("angle")} onToggle={() => toggle("angle")} onOpenSelector={() => setShowAngleModal(true)} />
                <ContentStageCard open={openSections.has("content")} onToggle={() => toggle("content")} />

                {mounted && runs.length > 0 && <PipelineRecentRuns runs={runs} onLoad={handleLoadRun} />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent runs — idle state */}
          {!hasAnyResult && !isAnyRunning && mounted && runs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <PipelineRecentRuns runs={runs} onLoad={handleLoadRun} />
            </motion.div>
          )}
        </div>

        <AngleSelector open={showAngleModal} onClose={() => setShowAngleModal(false)} />
      </main>
    </div>
  );
}
