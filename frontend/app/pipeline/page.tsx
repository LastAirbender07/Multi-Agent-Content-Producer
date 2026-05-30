"use client";
import { useState, useEffect, startTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Target,
  Image as ImageIcon,
  Zap,
  Clock,
  History,
  MousePointerClick,
  Sparkles,
  Brain,
  Loader2,
  RefreshCw,
  FileText,
  Globe,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addRun } from "@/store/slices/historySlice";
import { StageStatus, loadRun, setResearchResult, setAngleResult } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";

import { PipelineConfig } from "@/components/pipeline/PipelineConfig";
import { AngleSelector } from "@/components/pipeline/AngleSelector";
import { InstagramPost } from "@/components/pipeline/InstagramPreview";
import { ResearchSummary } from "@/components/pipeline/ResearchSummary";

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StageStatus }) {
  if (status === "idle")
    return <span className="w-2 h-2 rounded-full bg-zinc-700 inline-block" />;
  if (status === "running")
    return <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse inline-block" />;
  if (status === "done")
    return <CheckCircle size={14} className="text-emerald-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

function statusLabel(s: StageStatus) {
  return s === "idle" ? "Waiting" : s === "running" ? "Running…" : s === "done" ? "Done" : "Error";
}

// ─── Angle hook colours ────────────────────────────────────────────────────────

const HOOK_COLORS: Record<string, string> = {
  curiosity: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  anger: "bg-red-500/10 text-red-400 border-red-500/20",
  fear: "bg-red-500/10 text-red-400 border-red-500/20",
  hope: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  fomo: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  inspiration: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

function hookColor(hook: string) {
  const k = hook.toLowerCase();
  const found = Object.keys(HOOK_COLORS).find((key) => k.includes(key));
  return HOOK_COLORS[found ?? "curiosity"];
}

// ─── Stage card ────────────────────────────────────────────────────────────────

function useStageTimer(status: StageStatus): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "running") {
      startRef.current = Date.now() - (elapsed ?? 0) * 1000;
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (status === "idle") {
        setElapsed(null);
        startRef.current = null;
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status]);

  return elapsed;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function StageCard({
  number,
  icon,
  title,
  status,
  open,
  onToggle,
  elapsed,
  children,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  status: StageStatus;
  open: boolean;
  onToggle: () => void;
  elapsed?: number | null;
  children?: React.ReactNode;
}) {
  const borderColor =
    status === "done"
      ? "border-emerald-500/20"
      : status === "running"
      ? "border-violet-500/30"
      : status === "error"
      ? "border-red-500/20"
      : "border-zinc-800/50";

  return (
    <div className={`rounded-3xl border ${borderColor} bg-zinc-900/40 overflow-hidden transition-colors duration-500`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 hover:bg-zinc-800/20 transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black border ${
            status === "done"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : status === "running"
              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
              : "bg-zinc-800 text-zinc-500 border-zinc-700"
          }`}
        >
          {number}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-zinc-500">{icon}</span>
          <h3 className="text-sm font-bold text-zinc-200 truncate">{title}</h3>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {elapsed != null && (
            <span className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-lg ${
              status === "running"
                ? "bg-violet-500/10 text-violet-400"
                : status === "done"
                ? "bg-zinc-800 text-zinc-400"
                : "bg-zinc-800 text-red-400"
            }`}>
              {formatElapsed(elapsed)}
            </span>
          )}
          <span
            className={`text-[10px] font-black uppercase tracking-widest ${
              status === "done"
                ? "text-emerald-500"
                : status === "running"
                ? "text-violet-400"
                : status === "error"
                ? "text-red-400"
                : "text-zinc-600"
            }`}
          >
            {statusLabel(status)}
          </span>
          <StatusBadge status={status} />
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={16} className="text-zinc-600" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && children && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-2 border-t border-zinc-800/40">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

// ─── Run card ──────────────────────────────────────────────────────────────────

const TOPIC_PREVIEW = 90;

function RunCard({
  run,
  onLoad,
}: {
  run: { runId: string; topic: string; timestamp: string };
  onLoad: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = run.topic.length > TOPIC_PREVIEW;
  const visibleTopic =
    expanded || !needsTruncation ? run.topic : run.topic.slice(0, TOPIC_PREVIEW);

  return (
    <button
      onClick={onLoad}
      className="flex items-start justify-between px-4 py-3 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl hover:border-violet-500/30 hover:bg-zinc-900/70 transition-colors text-left group w-full"
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors wrap-break-word">
          {visibleTopic}
          {needsTruncation && !expanded && (
            <span
              className="text-zinc-500 font-semibold cursor-pointer hover:text-violet-400 ml-0.5"
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            >
              {" …more"}
            </span>
          )}
          {needsTruncation && expanded && (
            <span
              className="text-zinc-500 font-semibold cursor-pointer hover:text-violet-400 ml-1"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            >
              {" less"}
            </span>
          )}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock size={9} className="text-zinc-600" />
          <p className="text-[10px] text-zinc-600">
            {new Date(run.timestamp).toLocaleDateString()}
          </p>
        </div>
      </div>
      <Sparkles size={12} className="text-zinc-700 group-hover:text-violet-400 shrink-0 mt-0.5 transition-colors" />
    </button>
  );
}

// ─── LLM Refine Panel ──────────────────────────────────────────────────────────

function LlmRefinePanel({
  topic,
  researchResult,
}: {
  topic: string;
  researchResult: any;
}) {
  const dispatch = useAppDispatch();
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  async function handleRefine() {
    if (!feedback.trim() || refining) return;
    setRefining(true);
    try {
      const updated = await api.llmRefineResearch({
        topic,
        current_result: researchResult,
        feedback,
      });
      dispatch(setResearchResult(updated));
      setFeedback("");
    } catch (e: any) {
      console.error("LLM refine failed:", e.message);
    } finally {
      setRefining(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
        Refine Research
      </p>
      <textarea
        rows={3}
        placeholder="e.g. Focus on land acquisition controversies in 2019, ignore generic political career overview"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm
                   text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none
                   focus:ring-1 focus:ring-violet-500/40 focus:border-violet-600 transition-all"
      />
      <button
        onClick={handleRefine}
        disabled={refining || !feedback.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700
                   disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium
                   text-zinc-300 transition-all"
      >
        {refining ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        {refining ? "Refining…" : "Refine with LLM"}
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { stages, researchResult, angleResult, contentResult, errors, angleMode, runId, topic, llmResearchMode } =
    useAppSelector((state) => state.pipeline);
  const { runs } = useAppSelector((state) => state.history);

  const [openSections, setOpenSections] = useState<Set<"research" | "angle" | "content">>(
    new Set()
  );
  const [showAngleModal, setShowAngleModal] = useState(false);
  const [showLlmKnowledge, setShowLlmKnowledge] = useState(false);
  const [activeCarousel, setActiveCarousel] = useState(0);
  const [researchProgress, setResearchProgress] = useState<{ pct: number; label: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const researchElapsed = useStageTimer(stages.research.status);
  const angleElapsed = useStageTimer(stages.angle.status);
  const contentElapsed = useStageTimer(stages.content.status);

  useEffect(() => { setMounted(true); }, []);

  const handleCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    setActiveCarousel(Math.round(el.scrollLeft / el.offsetWidth));
  }, []);

  function scrollCarousel(dir: "prev" | "next") {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "next" ? el.offsetWidth : -el.offsetWidth, behavior: "smooth" });
  }

  function toggle(s: "research" | "angle" | "content") {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  // Auto-expand on stage completion
  useEffect(() => {
    if (stages.research.status === "done")
      startTransition(() => setOpenSections((p) => new Set(p).add("research")));
  }, [stages.research.status]);

  useEffect(() => {
    if (stages.angle.status === "done")
      startTransition(() => setOpenSections((p) => new Set(p).add("angle")));
  }, [stages.angle.status]);

  useEffect(() => {
    if (stages.content.status === "done")
      startTransition(() => setOpenSections((p) => new Set(p).add("content")));
  }, [stages.content.status]);

  // Collapse all when pipeline resets (all idle)
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

  // Auto-show angle selector in manual mode once angle stage is done (first time only)
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
        const prog = await fetch(`http://localhost:8000/api/v1/research/status/${runId}`).then(r => r.json());
        if (prog.pct !== undefined) {
          setResearchProgress({ pct: prog.pct, label: prog.label ?? "Running…" });
        }
      } catch {}
    }, 2000);
    return () => clearInterval(interval);
  }, [stages.research.status, runId]);

  // Clear progress when research finishes
  useEffect(() => {
    if (stages.research.status !== "running") setResearchProgress(null);
  }, [stages.research.status]);

  // Save to history when pipeline fully completes
  useEffect(() => {
    if (stages.content.status === "done" && runId && researchResult) {
      dispatch(
        addRun({
          runId,
          topic,
          timestamp: new Date().toISOString(),
          researchResult,
          angleResult,
          contentResult,
        })
      );
    }
  }, [stages.content.status]);

  const isAnyRunning = Object.values(stages).some((s) => s.status === "running");

  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerateAngles() {
    if (!researchResult?.synthesis || regenerating) return;
    setRegenerating(true);
    try {
      const result = await api.regenerateAngles({
        topic,
        synthesis: researchResult.synthesis,
        run_id: runId ?? undefined,
        mode: angleMode,
        max_angles_to_select: 3,
        exclude_statements: angleResult?.angles.map((a) => a.statement) ?? [],
      });
      dispatch(setAngleResult(result));
    } catch (e: any) {
      console.error("Angle regeneration failed:", e.message);
    } finally {
      setRegenerating(false);
    }
  }


  const hasAnyResult = researchResult || angleResult || contentResult;
  const canReopenAngles =
    angleMode === "manual" &&
    stages.angle.status === "done" &&
    stages.content.status === "idle";

  return (
    <div className="flex h-full min-h-screen bg-black">
      <PipelineConfig />

      <main className="flex-1 overflow-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-10 space-y-6">
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
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                System Online
              </span>
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
                Enter a topic on the left and hit "Produce Content" to start the multi-agent pipeline.
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
                {/* ── Stage 1: Research ───────────────────────────── */}
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
                      const llmItem = researchResult.evidence?.find(
                        (e) => e.source_type === "llm_knowledge"
                      );
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

                {/* ── Stage 2: Angles ─────────────────────────────── */}
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
                      <>
                        <div className="grid gap-3">
                          {angleResult.angles.map((angle, i) => {
                            const isSelected = angleResult.selected_angles.some(
                              (s) => s.statement === angle.statement
                            );
                            return (
                              <div
                                key={i}
                                className={`p-4 rounded-2xl border transition-colors ${
                                  isSelected
                                    ? "border-violet-500/40 bg-violet-500/5"
                                    : "border-zinc-800/50 bg-zinc-900/30"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                                      isSelected ? "bg-violet-500 text-white" : "bg-zinc-800 text-zinc-600"
                                    }`}
                                  >
                                    {isSelected && <CheckCircle size={12} />}
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <p className="text-sm font-semibold text-zinc-200 leading-snug">
                                      {angle.statement}
                                    </p>
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${hookColor(
                                        angle.emotional_hook
                                      )}`}
                                    >
                                      {angle.emotional_hook}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest shrink-0 pt-1">
                                      Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {canReopenAngles && (
                          <button
                            onClick={() => setShowAngleModal(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-violet-500/40 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 text-xs font-bold transition-all"
                          >
                            <MousePointerClick size={14} />
                            Open Angle Selector
                          </button>
                        )}

                        {stages.angle.status === "done" && stages.content.status === "idle" && (
                          <button
                            onClick={handleRegenerateAngles}
                            disabled={regenerating}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-zinc-700/60 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-all"
                          >
                            {regenerating ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                            {regenerating ? "Regenerating…" : "Regenerate Angles"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </StageCard>

                {/* ── Stage 3: Carousels ──────────────────────────── */}
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

                    {contentResult && contentResult.carousel_paths.length > 0 && (() => {
                      const total = contentResult.carousel_paths.length;
                      return (
                        <div className="space-y-4">
                          {/* Scroll track */}
                          <div
                            ref={carouselRef}
                            onScroll={handleCarouselScroll}
                            className="overflow-x-auto snap-x snap-mandatory scroll-smooth flex pb-2"
                          >
                            {contentResult.carousel_paths.map((slides, angleIdx) => {
                              const angle = angleResult?.selected_angles[angleIdx];
                              const caption =
                                contentResult.captions?.[angleIdx] || angle?.statement || "";
                              const hashtags =
                                contentResult.hashtags_per_angle?.[angleIdx] || [];
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
                                onClick={() => scrollCarousel("prev")}
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
                                onClick={() => scrollCarousel("next")}
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
                    })()}

                    {contentResult && contentResult.carousel_paths.length === 0 && (
                      <div className="py-8 text-center">
                        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                          No carousels generated
                        </p>
                      </div>
                    )}

                    {/* ── Blog post export ───────────────────────── */}
                    {contentResult && stages.content.status === "done" && runId && (
                      <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/40 mt-2">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-1">
                          Blog Post
                        </span>
                        <button
                          onClick={() => router.push(`/blog-preview?run_id=${runId}&topic=${encodeURIComponent(topic)}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/40 bg-violet-500/5 text-violet-400 text-[11px] font-semibold hover:bg-violet-500/10 hover:border-violet-400 transition-all"
                        >
                          <Eye size={12} /> Preview
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const md = await api.getBlogPostMd(runId);
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
                              a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.md`;
                              a.click();
                            } catch {}
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 text-zinc-400 text-[11px] font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-all"
                        >
                          <FileText size={12} /> Markdown
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const html = await api.getBlogPostHtml(runId);
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
                              a.download = `${topic.slice(0, 50).replace(/\s+/g, "_")}_blog.html`;
                              a.click();
                            } catch {}
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700/60 text-zinc-400 text-[11px] font-semibold hover:border-violet-500/50 hover:text-violet-400 transition-all"
                        >
                          <Globe size={12} /> HTML
                        </button>
                      </div>
                    )}
                  </div>
                </StageCard>

                {/* ── Recent runs ─────────────────────────────────── */}
                {mounted && runs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 px-1">
                      <History size={13} className="text-zinc-600" />
                      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                        Recent Runs
                      </h4>
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
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent runs — always visible when history exists */}
          {!hasAnyResult && !isAnyRunning && mounted && runs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 px-1">
                <History size={13} className="text-zinc-600" />
                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">
                  Recent Runs
                </h4>
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
            </motion.div>
          )}
        </div>

        {/* Angle Selector Modal */}
        <AngleSelector
          open={showAngleModal}
          onClose={() => setShowAngleModal(false)}
        />
      </main>
    </div>
  );
}
