"use client";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { setResearchResult } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";
import type { ResearchResponse } from "@/lib/api";

interface LlmRefinePanelProps {
  topic: string;
  researchResult: ResearchResponse;
}

export function LlmRefinePanel({ topic, researchResult }: LlmRefinePanelProps) {
  const dispatch = useAppDispatch();
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  async function handleRefine() {
    if (!feedback.trim() || refining) return;
    setRefining(true);
    try {
      const updated = await api.llmRefineResearch({ topic, current_result: researchResult, feedback });
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
      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Refine Research</p>
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
        {refining ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        {refining ? "Refining…" : "Refine with LLM"}
      </button>
    </div>
  );
}
