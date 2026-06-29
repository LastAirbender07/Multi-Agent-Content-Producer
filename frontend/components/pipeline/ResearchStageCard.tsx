"use client";
import { useState } from "react";
import { FlaskConical, Brain, ChevronDown, BookOpen, Clock, TrendingUp, Quote, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { StageCard, useStageTimer } from "@/components/pipeline/StageCard";
import { ResearchSummary } from "@/components/pipeline/ResearchSummary";
import { LlmRefinePanel } from "@/components/pipeline/LlmRefinePanel";
import { useResearchProgress } from "@/hooks/useResearchProgress";
import { TokenChip } from "@/components/pipeline/TokenChip";

interface ResearchStageCardProps {
  open: boolean;
  onToggle: () => void;
}

// Map claim type (encoded in source_name "llm:TYPE:period") to display config
const CLAIM_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  HISTORICAL_FACT:  { label: "Historical Fact",   icon: BookOpen,      color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  PUBLISHED_WORK:   { label: "Published Work",    icon: BookOpen,      color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  DIRECT_QUOTE:     { label: "Direct Quote",      icon: Quote,         color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  RECENT_STATISTIC: { label: "Recent Statistic",  icon: TrendingUp,    color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  CAUSAL_INFERENCE: { label: "Causal Inference",  icon: AlertTriangle, color: "text-zinc-400",    bg: "bg-zinc-800/60 border-zinc-700/40" },
};

function extractClaimType(sourceName: string | undefined): string {
  if (!sourceName?.startsWith("llm:")) return "HISTORICAL_FACT";
  const parts = sourceName.split(":");
  return parts[1]?.toUpperCase() ?? "HISTORICAL_FACT";
}

function extractTimePeriod(sourceName: string | undefined): string | null {
  if (!sourceName?.startsWith("llm:")) return null;
  const parts = sourceName.split(":");
  return parts[2] ?? null;
}

export function ResearchStageCard({ open, onToggle }: ResearchStageCardProps) {
  const { stages, researchResult, topic, llmResearchMode, runId } = useAppSelector((s) => s.pipeline);
  const elapsed = useStageTimer(stages.research.status);
  const researchProgress = useResearchProgress();
  const [showLlmKnowledge, setShowLlmKnowledge] = useState(false);

  // Collect ALL llm_knowledge items (was previously find() → only the first one)
  const llmItems = researchResult?.evidence?.filter((e) => e.source_type === "llm_knowledge") ?? [];

  // Group by claim type for a structured view
  const grouped = llmItems.reduce<Record<string, typeof llmItems>>((acc, item) => {
    const type = extractClaimType(item.source_name);
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  // Ordered display: high-confidence first, low-confidence last
  const TYPE_ORDER = ["HISTORICAL_FACT", "PUBLISHED_WORK", "DIRECT_QUOTE", "RECENT_STATISTIC", "CAUSAL_INFERENCE"];
  const groupedEntries = TYPE_ORDER
    .filter((t) => grouped[t]?.length)
    .map((t) => [t, grouped[t]] as [string, typeof llmItems]);

  return (
    <StageCard
      number={1}
      icon={<FlaskConical size={14} />}
      title="Research Results"
      status={stages.research.status}
      open={open}
      onToggle={onToggle}
      elapsed={elapsed}
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

        {/* LLM Background Knowledge — consolidated structured view */}
        {llmItems.length > 0 && (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
            <button
              onClick={() => setShowLlmKnowledge((v) => !v)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/20 transition-colors"
            >
              <Brain size={14} className="text-violet-400 shrink-0" />
              <span className="flex-1 text-left text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                LLM Background Knowledge
              </span>
              <span className="text-[10px] text-zinc-600 font-semibold mr-1">
                {llmItems.length} claim{llmItems.length !== 1 ? "s" : ""}
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
                  <div className="border-t border-zinc-800/40 divide-y divide-zinc-800/40">
                    {groupedEntries.map(([type, items]) => {
                      const meta = CLAIM_TYPE_META[type] ?? CLAIM_TYPE_META.HISTORICAL_FACT;
                      const Icon = meta.icon;
                      return (
                        <div key={type} className="px-4 py-3 space-y-2">
                          {/* Group header */}
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.bg} ${meta.color}`}>
                              <Icon size={9} />
                              {meta.label}
                              <span className="opacity-60">×{items.length}</span>
                            </span>
                          </div>
                          {/* Claims in this group */}
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

        {researchResult && <ResearchSummary />}
        {llmResearchMode && stages.research.status === "done" && researchResult && (
          <LlmRefinePanel topic={topic} researchResult={researchResult} />
        )}
        {stages.research.status === "done" && (
          <div className="pt-2">
            <TokenChip runId={runId} stage="research" />
          </div>
        )}
      </div>
    </StageCard>
  );
}
