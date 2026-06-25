"use client";
import { useState } from "react";
import { FlaskConical, Brain, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { StageCard, useStageTimer } from "@/components/pipeline/StageCard";
import { ResearchSummary } from "@/components/pipeline/ResearchSummary";
import { LlmRefinePanel } from "@/components/pipeline/LlmRefinePanel";
import { useResearchProgress } from "@/hooks/useResearchProgress";

interface ResearchStageCardProps {
  open: boolean;
  onToggle: () => void;
}

export function ResearchStageCard({ open, onToggle }: ResearchStageCardProps) {
  const { stages, researchResult, topic, llmResearchMode } = useAppSelector((s) => s.pipeline);
  const elapsed = useStageTimer(stages.research.status);
  const researchProgress = useResearchProgress();
  const [showLlmKnowledge, setShowLlmKnowledge] = useState(false);

  const llmItem = researchResult?.evidence?.find((e) => e.source_type === "llm_knowledge");

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

        {llmItem && (
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
                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{llmItem.evidence}</p>
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
      </div>
    </StageCard>
  );
}
