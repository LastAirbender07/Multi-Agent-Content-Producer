"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { usePipelineSSE } from "@/hooks/usePipelineSSE";
import {
  Brain,
  CheckCircle,
  ChevronDown,
  Clock,
  Search,
  Wifi,
  WifiOff,
  BookOpen,
  TrendingUp,
  Quote,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ResearchSummary } from "@/components/pipeline/ResearchSummary";
import { LlmRefinePanel } from "@/components/pipeline/LlmRefinePanel";
import { TokenChip } from "@/components/pipeline/TokenChip";

// ── LLM claim-type metadata ──────────────────────────────────────────────────

const CLAIM_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  HISTORICAL_FACT:  { label: "Historical Fact",  icon: BookOpen,      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  PUBLISHED_WORK:   { label: "Published Work",   icon: BookOpen,      color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  DIRECT_QUOTE:     { label: "Direct Quote",     icon: Quote,         color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  RECENT_STATISTIC: { label: "Recent Statistic", icon: TrendingUp,    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  CAUSAL_INFERENCE: { label: "Causal Inference", icon: AlertTriangle, color: "text-zinc-400",    bg: "bg-zinc-800/60 border-zinc-700/40" },
};

function extractClaimType(sourceName: string | undefined): string {
  if (!sourceName?.startsWith("llm:")) return "HISTORICAL_FACT";
  return sourceName.split(":")[1]?.toUpperCase() ?? "HISTORICAL_FACT";
}

function extractTimePeriod(sourceName: string | undefined): string | null {
  if (!sourceName?.startsWith("llm:")) return null;
  return sourceName.split(":")[2] ?? null;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface ResearchStageCardProps {
  active: boolean;
  open?: boolean;
  onToggle?: () => void;
  onDone?: () => void;
}

export function ResearchStageCard({ active, open, onToggle, onDone }: ResearchStageCardProps) {
  const { stages, researchResult, llmResearchMode, runId, topic } = useAppSelector(
    (s) => s.pipeline
  );
  const { pct, message, events, connected, done, elapsedMs } = usePipelineSSE(
    runId,
    "research",
    active
  );

  const researchStatus = stages.research.status;
  const isDone = done || researchStatus === "done";

  const [showLlmKnowledge, setShowLlmKnowledge] = useState(false);

  const llmItems =
    researchResult?.evidence?.filter((e) => e.source_type === "llm_knowledge") ?? [];

  const grouped = llmItems.reduce<Record<string, typeof llmItems>>((acc, item) => {
    const type = extractClaimType(item.source_name);
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const TYPE_ORDER = [
    "HISTORICAL_FACT",
    "PUBLISHED_WORK",
    "DIRECT_QUOTE",
    "RECENT_STATISTIC",
    "CAUSAL_INFERENCE",
  ];
  const groupedEntries = TYPE_ORDER.filter((t) => grouped[t]?.length).map(
    (t) => [t, grouped[t]] as [string, typeof llmItems]
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

  const bodyVisible = open === undefined ? true : open;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-violet-500/20 bg-[#0d0d18] shadow-xl shadow-violet-950/40">
      {/* ambient hover glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px at 50% 0%, rgba(139,92,246,.07), transparent 70%)",
        }}
      />

      {/* active pulse ring */}
      {active && connected && (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl animate-pulse"
          style={{ boxShadow: "inset 0 0 0 1px rgba(139,92,246,.15)" }}
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 border border-violet-500/30">
            <Search className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Deep Research</p>
            <p className="text-xs text-white/40">Phase 1 of 3</p>
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
            <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border text-violet-300 border-violet-500/30 bg-violet-500/10">
              <CheckCircle className="h-3 w-3" /> Done
            </span>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {bodyVisible && (
          <motion.div
            key="research-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-5">

              {/* ── Running: SSE progress bar + activity log ─────────────── */}
              {researchStatus === "running" && (
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
                            "linear-gradient(90deg, #7c3aed 0%, #6366f1 50%, #22d3ee 100%)",
                          boxShadow:
                            pct > 0 ? "0 0 12px rgba(139,92,246,.6)" : "none",
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
                              i === 0 ? "bg-violet-500/5" : ""
                            }`}
                          >
                            <span className="shrink-0 w-7 text-right text-[10px] font-mono tabular-nums text-violet-500/70">
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

              {/* ── Results: LLM knowledge accordion ────────────────────── */}
              {llmItems.length > 0 && (
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLlmKnowledge((v) => !v);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors"
                  >
                    <Brain size={14} className="text-violet-400 shrink-0" />
                    <span className="flex-1 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                      LLM Background Knowledge
                    </span>
                    <span className="text-[10px] text-zinc-600 font-semibold mr-1">
                      {llmItems.length} claim{llmItems.length !== 1 ? "s" : ""}
                    </span>
                    <motion.div
                      animate={{ rotate: showLlmKnowledge ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
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
                        <div className="border-t border-zinc-800/40 divide-y divide-zinc-800/40">
                          {groupedEntries.map(([type, items]) => {
                            const meta =
                              CLAIM_TYPE_META[type] ?? CLAIM_TYPE_META.HISTORICAL_FACT;
                            const Icon = meta.icon;
                            return (
                              <div key={type} className="px-4 py-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.color}`}
                                  >
                                    <Icon size={9} />
                                    {meta.label}
                                    <span className="opacity-60">×{items.length}</span>
                                  </span>
                                </div>
                                <div className="space-y-1.5 pl-1">
                                  {items.map((item, i) => {
                                    const period = extractTimePeriod(item.source_name);
                                    return (
                                      <div key={i} className="flex items-start gap-2">
                                        <span className="w-1 h-1 rounded-full bg-zinc-700 mt-2 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[11px] text-zinc-300 leading-relaxed">
                                            {item.evidence}
                                          </p>
                                          {period && (
                                            <span className="inline-flex items-center gap-1 text-[9px] text-zinc-600 mt-0.5">
                                              <Clock size={8} />
                                              {period}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Results: research summary + refine + token ───────────── */}
              {researchResult && <ResearchSummary />}
              {llmResearchMode && researchStatus === "done" && researchResult && (
                <LlmRefinePanel topic={topic} researchResult={researchResult} />
              )}
              {researchStatus === "done" && (
                <div className="pt-2">
                  <TokenChip runId={runId} stage="research" />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
