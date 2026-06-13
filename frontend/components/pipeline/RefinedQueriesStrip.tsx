"use client";
import { useState } from "react";
import { Loader2, ArrowRight, Plus, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPreprocessedQueries, setDiscoveryArticle } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";

export function RefinedQueriesStrip() {
  const dispatch = useAppDispatch();
  const { topic, preprocessedQueries, discoveryArticle } = useAppSelector((s) => s.pipeline);
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [refining, setRefining] = useState(false);

  async function handleRefine() {
    if (refining) return;
    setRefining(true);
    try {
      const prompt = feedback.trim() ? `${topic}. Additional guidance: ${feedback}` : topic;
      const pq = await api.refineQuery(prompt);
      dispatch(setPreprocessedQueries(pq.search_queries));
      setFeedback("");
    } catch {}
    finally { setRefining(false); }
  }

  if (preprocessedQueries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-t border-zinc-800/50"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-800/20 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={11} className="text-violet-400" />
          <span className="text-[11px] font-medium text-zinc-400">
            {preprocessedQueries.length} search queries
            {discoveryArticle && (
              <span className="text-zinc-600"> · from "{discoveryArticle.title.slice(0, 36)}…"</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">{expanded ? "▴ collapse" : "▾ edit"}</span>
          <button
            onClick={(e) => { e.stopPropagation(); dispatch(setPreprocessedQueries([])); dispatch(setDiscoveryArticle(null)); }}
            className="text-zinc-700 hover:text-red-400 transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-3 space-y-1.5">
            {preprocessedQueries.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-zinc-700 text-[10px]">·</span>
                <input
                  value={q}
                  onChange={(e) => { const u = [...preprocessedQueries]; u[i] = e.target.value; dispatch(setPreprocessedQueries(u)); }}
                  className="flex-1 bg-zinc-800/40 border border-zinc-700/40 rounded-lg px-2.5 py-1 text-[11px] text-zinc-200 focus:outline-none focus:border-violet-500/40"
                />
                <button onClick={() => dispatch(setPreprocessedQueries(preprocessedQueries.filter((_, j) => j !== i)))} className="text-zinc-700 hover:text-red-400 shrink-0">
                  <X size={10} />
                </button>
              </div>
            ))}
            <button onClick={() => dispatch(setPreprocessedQueries([...preprocessedQueries, ""]))} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400">
              <Plus size={10} /> Add
            </button>
            <div className="flex gap-2 pt-1">
              <input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRefine(); }}
                placeholder="Guidance to refine…"
                className="flex-1 bg-zinc-800/40 border border-zinc-700/40 rounded-lg px-2.5 py-1 text-[11px] text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-violet-500/40"
              />
              <button onClick={handleRefine} disabled={refining} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600/80 hover:bg-violet-600 disabled:opacity-50 text-white text-[11px] font-medium shrink-0">
                {refining ? <Loader2 size={9} className="animate-spin" /> : <ArrowRight size={9} />}
                Refine
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
