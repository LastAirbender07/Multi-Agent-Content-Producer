"use client";
import { useState } from "react";
import { Zap, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTopic, setMode, setFreshness, setAngleMode, setLlmResearchMode, setDiscoveryArticle, setDiscoverUrl } from "@/store/slices/pipelineSlice";
import { api, DiscoverArticle } from "@/lib/api";

import { OptionChip } from "./OptionChip";
import { LlmChip } from "./LlmChip";
import { AdvancedSettings } from "./AdvancedSettings";
import { RefinedQueriesStrip } from "./RefinedQueriesStrip";
import { DiscoverDrawer } from "./DiscoverDrawer";
import { usePipelineOrchestration } from "@/hooks/usePipelineOrchestration";

// ─── Static option lists ──────────────────────────────────────────────────────

const DEPTH_OPTIONS = [
  { value: "quick" as const, label: "Quick", description: "Fast, light research" },
  { value: "standard" as const, label: "Standard", description: "Balanced depth & speed" },
  { value: "deep" as const, label: "Deep", description: "Thorough, more sources" },
];
const FRESHNESS_OPTIONS = [
  { value: "breaking" as const, label: "Breaking", description: "Last 24h" },
  { value: "recent" as const, label: "Recent", description: "Last week" },
  { value: "evergreen" as const, label: "Evergreen", description: "All time" },
];
const ANGLE_OPTIONS = [
  { value: "auto" as const, label: "Auto angles", description: "AI picks best angles" },
  { value: "manual" as const, label: "Manual angles", description: "You choose from options" },
];

// ─── PipelineConfig ───────────────────────────────────────────────────────────

export function PipelineConfig() {
  const dispatch = useAppDispatch();
  const { topic, mode, freshness, angleMode, llmResearchMode } = useAppSelector((s) => s.pipeline);

  const { isRunning, handleRun, handleGenerateAngles, stages } = usePipelineOrchestration();

  const [showSettings, setShowSettings] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const [refineHint, setRefineHint] = useState<"clean" | "crawl_failed" | null>(null);

  // Discover drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [discoverArticles, setDiscoverArticles] = useState<DiscoverArticle[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverFilter, setDiscoverFilter] = useState("all");

  async function loadDiscover(bust = false) {
    setDiscoverLoading(true);
    try {
      const res = await api.discoverTopics(bust);
      setDiscoverArticles(res.articles);
    } catch {}
    finally { setDiscoverLoading(false); }
  }

  function openDrawer() {
    setDrawerOpen(true);
    if (discoverArticles.length === 0) loadDiscover();
  }

  async function useArticleAsTopic(article: DiscoverArticle) {
    setDrawerOpen(false);
    setRefineHint(null);
    dispatch(setTopic(article.title));
    dispatch(setDiscoveryArticle({ title: article.title, snippet: article.snippet, url: article.url, category: article.category }));
    dispatch(setDiscoverUrl(article.url));

    setTopicLoading(true);
    try {
      const result = await api.topicFromUrl({ url: article.url, title: article.title, snippet: article.snippet });
      dispatch(setTopic(result.topic));
      dispatch(setFreshness(result.freshness as any));
      setRefineHint(result.crawl_failed ? "crawl_failed" : "clean");
    } catch {
      setRefineHint("crawl_failed");
    } finally {
      setTopicLoading(false);
    }
  }

  return (
    <>
      <div className="shrink-0 px-5 pt-4 pb-0 bg-zinc-950 border-b border-zinc-800/40">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40">

          {/* Topic input */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <div className="relative flex-1 min-w-0">
              <textarea
                rows={2}
                placeholder="Enter topic for content production… e.g. 'Why SAP is betting on AI agents in 2026'"
                value={topic}
                onChange={(e) => { if (!topicLoading) { dispatch(setTopic(e.target.value)); setRefineHint(null); } }}
                readOnly={topicLoading}
                className={`w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none leading-relaxed transition-all ${
                  topicLoading ? "opacity-50 cursor-not-allowed select-none" : ""
                }`}
              />
              <AnimatePresence>
                {topicLoading && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute bottom-0 right-0 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/90 border border-violet-500/30 rounded-lg text-[11px] text-violet-400 font-medium backdrop-blur-sm"
                  >
                    <Loader2 size={10} className="animate-spin" />
                    Drafting topic…
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={openDrawer}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 text-zinc-500 hover:text-zinc-200 text-xs font-medium transition-all mt-0.5"
            >
              <Search size={12} />
              Discover
            </button>
          </div>

          {/* Refine hint */}
          <AnimatePresence>
            {refineHint && !topicLoading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={`flex items-center gap-2 px-4 py-2 border-t text-[11px] ${
                  refineHint === "crawl_failed" ? "border-amber-500/20 bg-amber-500/5" : "border-violet-500/15 bg-violet-500/5"
                }`}>
                  <span className={refineHint === "crawl_failed" ? "text-amber-500" : "text-violet-400"}>
                    {refineHint === "crawl_failed" ? "⚠" : "✦"}
                  </span>
                  <span className={`font-medium ${refineHint === "crawl_failed" ? "text-amber-400" : "text-violet-300"}`}>
                    {refineHint === "crawl_failed"
                      ? "Topic drafted from headline only — article couldn't be read"
                      : "Topic drafted from article content"}
                  </span>
                  <div className="flex-1" />
                  <button onClick={() => setRefineHint(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <X size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chip toolbar */}
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-zinc-800/50">
            <LlmChip checked={llmResearchMode} onChange={(v) => dispatch(setLlmResearchMode(v))} />

            {!llmResearchMode && (
              <>
                <div className="w-px h-4 bg-zinc-800 mx-0.5" />
                <OptionChip label="Depth" options={DEPTH_OPTIONS} value={mode} onChange={(v) => dispatch(setMode(v))} />
                <OptionChip label="Freshness" options={FRESHNESS_OPTIONS} value={freshness} onChange={(v) => dispatch(setFreshness(v))} />
              </>
            )}

            <div className="w-px h-4 bg-zinc-800 mx-0.5" />
            <OptionChip label="Angles" options={ANGLE_OPTIONS} value={angleMode} onChange={(v) => dispatch(setAngleMode(v))} />

            <div className="flex-1" />

            {!llmResearchMode && (
              <button
                title="Advanced settings"
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  showSettings
                    ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
                    : "bg-transparent border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <SlidersHorizontal size={12} />
                Config
              </button>
            )}

            {llmResearchMode && stages.research.status === "done" && stages.angle.status === "idle" && (
              <button
                onClick={handleGenerateAngles}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-400 text-xs font-medium hover:bg-violet-500/10 disabled:opacity-40 transition-all"
              >
                Generate Angles →
              </button>
            )}

            <button
              onClick={() => handleRun(topicLoading)}
              disabled={isRunning || !topic.trim() || topicLoading}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-[0.97]"
            >
              {isRunning || topicLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Zap size={13} className="fill-white" />
              )}
              {isRunning ? "Running…" : topicLoading ? "Drafting…" : llmResearchMode ? "Draft Research" : "Produce Content"}
            </button>
          </div>

          {/* Advanced settings panel */}
          <AdvancedSettings open={showSettings} onClose={() => setShowSettings(false)} />

          {/* Refined queries strip */}
          <RefinedQueriesStrip />
        </div>

        <div className="h-4" />
      </div>

      <DiscoverDrawer
        open={drawerOpen}
        articles={discoverArticles}
        loading={discoverLoading}
        filter={discoverFilter}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => loadDiscover(true)}
        onFilterChange={setDiscoverFilter}
        onUseArticle={useArticleAsTopic}
      />
    </>
  );
}
