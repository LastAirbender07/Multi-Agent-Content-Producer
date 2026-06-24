"use client";
import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  FlaskConical,
  Target,
  Image as ImageIcon,
  Zap,
  History,
  Brain,
  ChevronDown,
  PencilRuler,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addRun } from "@/store/slices/historySlice";
import { loadRun, setResearchResult, setAngleResult } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";

import { PipelineConfig } from "@/components/pipeline/PipelineConfig";
import { AngleSelector } from "@/components/pipeline/AngleSelector";
import { ResearchSummary } from "@/components/pipeline/ResearchSummary";
import { StageCard, useStageTimer } from "@/components/pipeline/StageCard";
import { RunCard } from "@/components/pipeline/RunCard";
import { LlmRefinePanel } from "@/components/pipeline/LlmRefinePanel";
import { AngleSection } from "@/components/pipeline/AngleSection";
import { CarouselViewer } from "@/components/pipeline/CarouselViewer";
import { BlogExportBar } from "@/components/pipeline/BlogExportBar";

export default function PipelinePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { stages, researchResult, angleResult, contentResult, errors, angleMode, runId, topic, llmResearchMode, maxAnglesSelect } =
    useAppSelector((state) => state.pipeline);
  const { runs } = useAppSelector((state) => state.history);

  const [openSections, setOpenSections] = useState<Set<"research" | "angle" | "content">>(new Set());
  const [showAngleModal, setShowAngleModal] = useState(false);
  const [showLlmKnowledge, setShowLlmKnowledge] = useState(false);
  const [researchProgress, setResearchProgress] = useState<{ pct: number; label: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const researchElapsed = useStageTimer(stages.research.status);
  const angleElapsed = useStageTimer(stages.angle.status);
  const contentElapsed = useStageTimer(stages.content.status);

  useEffect(() => { setMounted(true); }, []);

  function toggle(s: "research" | "angle" | "content") {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  // Auto-expand on stage completion — single effect covers all 3 stages
  const STAGE_KEYS = ["research", "angle", "content"] as const;
  useEffect(() => {
    STAGE_KEYS.forEach(key => {
      if (stages[key].status === "done")
        startTransition(() => setOpenSections(p => new Set(p).add(key)));
    });
  }, [stages.research.status, stages.angle.status, stages.content.status]);

  // Collapse all when pipeline resets
  useEffect(() => {
    if (
      stages.research.status === "idle" &&
      stages.angle.status === "idle" &&
      stages.content.status === "idle"
    ) {
      startTransition(() => {
        setOpenSections(new Set());
        setShowAngleModal(false);
      });
    }
  }, [stages.research.status, stages.angle.status, stages.content.status]);

  // Auto-show angle selector in manual mode once angle stage is done
  useEffect(() => {
    if (
      angleMode === "manual" &&
      stages.angle.status === "done" &&
      stages.content.status === "idle" &&
      !contentResult
    ) {
      startTransition(() => setShowAngleModal(true));
    }
  }, [stages.angle.status, stages.content.status, angleMode, contentResult]);

  // Poll research progress every 2s while research is running
  useEffect(() => {
    if (stages.research.status !== "running" || !runId) return;
    setResearchProgress(null);
    const interval = setInterval(async () => {
      try {
        const prog = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/v1/research/status/${runId}`).then(r => r.json());
        if (prog.pct !== undefined) {
          setResearchProgress({ pct: prog.pct, label: prog.label ?? "Running…" });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [stages.research.status, runId]);

  useEffect(() => {
    if (stages.research.status !== "running") setResearchProgress(null);
  }, [stages.research.status]);

  // Save to history when pipeline fully completes
  useEffect(() => {
    if (stages.content.status === "done" && runId && researchResult) {
      dispatch(addRun({ runId, topic, timestamp: new Date().toISOString(), researchResult, angleResult, contentResult }));
    }
  }, [stages.content.status]);

  async function handleRegenerateAngles() {
    if (!researchResult?.synthesis || regenerating) return;
    setRegenerating(true);
    try {
      const result = await api.regenerateAngles({
        topic,
        synthesis: researchResult.synthesis,
        run_id: runId ?? undefined,
        mode: angleMode,
        max_angles_to_select: maxAnglesSelect,
        exclude_statements: angleResult?.angles.map((a) => a.statement) ?? [],
      });
      dispatch(setAngleResult(result));
    } catch (e: any) {
      console.error("Angle regeneration failed:", e.message);
    } finally {
      setRegenerating(false);
    }
  }

  const isAnyRunning = Object.values(stages).some((s) => s.status === "running");
  const hasAnyResult = researchResult || angleResult || contentResult;
  const canReopenAngles =
    angleMode === "manual" &&
    stages.angle.status === "done" &&
    stages.content.status === "idle";

  const RecentRuns = () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <History size={13} className="text-zinc-600" />
        <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Recent Runs</h4>
      </div>
      <div className="grid gap-2 max-h-120 overflow-y-auto pr-0.5">
        {runs.map((run) => (
          <RunCard
            key={run.runId}
            run={run}
            onLoad={() => {
              dispatch(loadRun(run));
              startTransition(() =>
                setOpenSections(
                  new Set(
                    (["research", "angle", "content"] as const).filter((s) =>
                      s === "research" ? !!run.researchResult :
                      s === "angle" ? !!run.angleResult :
                      !!run.contentResult
                    )
                  )
                )
              );
            }}
          />
        ))}
      </div>
    </div>
  );

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

          {/* Idle state */}
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
                {errors.map((e, i) => (
                  <p key={i} className="text-xs font-medium">{e}</p>
                ))}
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
                {/* Stage 1: Research */}
                <StageCard
                  number={1}
                  icon={<FlaskConical size={14} />}
                  title="Research Results"
                  status={stages.research.status}
                  open={openSections.has("research")}
                  onToggle={() => toggle("research")}
                  elapsed={researchElapsed}
                >
                  <div className="pt-4 space-y-4">
                    {stages.research.status === "running" && (
                      <div className="py-6 space-y-3">
                        <div className="flex items-center gap-3 justify-center">
                          <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin shrink-0" />
                          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            {researchProgress?.label ?? "Researching…"}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${researchProgress?.pct ?? 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {researchResult && (() => {
                      const llmItem = researchResult.evidence?.find((e) => e.source_type === "llm_knowledge");
                      return llmItem ? (
                        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                          <button
                            onClick={() => setShowLlmKnowledge((v) => !v)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors"
                          >
                            <Brain size={14} className="text-violet-400 shrink-0" />
                            <span className="flex-1 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                              LLM Background Knowledge
                            </span>
                            <motion.div animate={{ rotate: showLlmKnowledge ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown size={13} className="text-zinc-600" />
                            </motion.div>
                          </button>
                          <AnimatePresence initial={false}>
                            {showLlmKnowledge && (
                              <motion.div
                                key="llm-body"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 pt-1 border-t border-zinc-800/40">
                                  <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                                    {llmItem.evidence}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : null;
                    })()}

                    {researchResult && <ResearchSummary />}
                    {llmResearchMode && stages.research.status === "done" && researchResult && (
                      <LlmRefinePanel topic={topic} researchResult={researchResult} />
                    )}
                  </div>
                </StageCard>

                {/* Stage 2: Angles */}
                <StageCard
                  number={2}
                  icon={<Target size={14} />}
                  title="Angle Selection"
                  status={stages.angle.status}
                  open={openSections.has("angle")}
                  onToggle={() => toggle("angle")}
                  elapsed={angleElapsed}
                >
                  <div className="pt-4 space-y-4">
                    {stages.angle.status === "running" && (
                      <div className="flex items-center gap-3 py-8 justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Generating angles…
                        </span>
                      </div>
                    )}
                    {angleResult && (
                      <AngleSection
                        angleResult={angleResult}
                        canReopenAngles={canReopenAngles}
                        canRegenerate={stages.angle.status === "done" && stages.content.status === "idle"}
                        regenerating={regenerating}
                        onOpenSelector={() => setShowAngleModal(true)}
                        onRegenerate={handleRegenerateAngles}
                      />
                    )}
                  </div>
                </StageCard>

                {/* Stage 3: Carousels */}
                <StageCard
                  number={3}
                  icon={<ImageIcon size={14} />}
                  title="Generated Carousels"
                  status={stages.content.status}
                  open={openSections.has("content")}
                  onToggle={() => toggle("content")}
                  elapsed={contentElapsed}
                >
                  <div className="pt-4">
                    {stages.content.status === "running" && (
                      <div className="flex items-center gap-3 py-8 justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          Generating carousels…
                        </span>
                      </div>
                    )}
                    {contentResult && (
                      <CarouselViewer contentResult={contentResult} angleResult={angleResult} />
                    )}
                    {contentResult && stages.content.status === "done" && runId && (
                      <div className="space-y-2">
                        <BlogExportBar runId={runId} topic={topic} />
                        <button
                          onClick={() => router.push(`/editor?run=${runId}&view=slide&angle=0&slide=1`)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-500/40 bg-violet-500/5 text-violet-400 text-sm font-bold hover:bg-violet-500/10 transition-all"
                        >
                          <PencilRuler size={14} />
                          Open in Editor
                        </button>
                      </div>
                    )}
                  </div>
                </StageCard>

                {/* Recent runs inside result view */}
                {mounted && runs.length > 0 && <RecentRuns />}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent runs — idle state */}
          {!hasAnyResult && !isAnyRunning && mounted && runs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <RecentRuns />
            </motion.div>
          )}
        </div>

        {/* Angle Selector Modal */}
        <AngleSelector open={showAngleModal} onClose={() => setShowAngleModal(false)} />
      </main>
    </div>
  );
}
