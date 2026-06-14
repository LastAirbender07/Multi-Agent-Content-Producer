"use client";
import { Search, RefreshCw, X, ExternalLink, ArrowRight, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { AttachedSourcesPanel } from "./AttachedSourcesPanel";
import type { DiscoverArticle } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  technology:    "bg-violet-500/15 text-violet-400 border-violet-500/30",
  business:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  politics:      "bg-amber-500/15 text-amber-400 border-amber-500/30",
  sports:        "bg-green-500/15 text-green-400 border-green-500/30",
  science:       "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  entertainment: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  startups:      "bg-orange-500/15 text-orange-400 border-orange-500/30",
  world:         "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};
const categoryColor = (cat: string) =>
  CATEGORY_COLORS[cat.toLowerCase()] ?? CATEGORY_COLORS["world"];

interface DiscoverDrawerProps {
  open: boolean;
  articles: DiscoverArticle[];
  loading: boolean;
  filter: string;
  onClose: () => void;
  onRefresh: () => void;
  onFilterChange: (cat: string) => void;
  onUseArticle: (article: DiscoverArticle) => void;
}

export function DiscoverDrawer({
  open, articles, loading, filter,
  onClose, onRefresh, onFilterChange, onUseArticle,
}: DiscoverDrawerProps) {
  const allCategories = ["all", ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = filter === "all" ? articles : articles.filter((a) => a.category === filter);
  const attachedCount = useAppSelector((s) => s.pipeline.attachedEvidence.length);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 h-full w-[480px] z-50 flex flex-col bg-zinc-950 border-l border-zinc-800/60 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <Search size={14} className="text-violet-400" />
                <span className="text-sm font-bold text-zinc-100">Discover Topics</span>
                {articles.length > 0 && (
                  <span className="text-[10px] text-zinc-600 font-medium tabular-nums">
                    {articles.length} articles
                  </span>
                )}
                {attachedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-400 text-[10px] font-black">
                    <Paperclip size={9} />
                    {attachedCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Category filter chips */}
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-zinc-800/30 overflow-x-auto shrink-0 scrollbar-none">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onFilterChange(cat)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold capitalize border transition-all ${
                    filter === cat
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Article list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
              {loading && (
                <div className="flex flex-col gap-3 pt-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-zinc-900/50 border border-zinc-800/40 animate-pulse p-4">
                      <div className="h-3 w-20 bg-zinc-800 rounded-full mb-3" />
                      <div className="h-4 w-full bg-zinc-800 rounded-full mb-1.5" />
                      <div className="h-4 w-3/4 bg-zinc-800 rounded-full mb-3" />
                      <div className="h-3 w-full bg-zinc-800 rounded-full mb-1" />
                      <div className="h-3 w-5/6 bg-zinc-800 rounded-full" />
                    </div>
                  ))}
                </div>
              )}

              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <p className="text-zinc-500 text-sm font-medium">No articles found</p>
                  <button
                    onClick={onRefresh}
                    className="mt-3 text-[11px] text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    Try refreshing
                  </button>
                </div>
              )}

              {!loading && filtered.map((article, i) => (
                <motion.div
                  key={article.url}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  className="rounded-2xl border border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/50 transition-all"
                >
                  <div className="p-4 space-y-2.5">
                    {/* Meta row */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${categoryColor(article.category)}`}>
                        {article.category}
                      </span>
                      <span className="text-[10px] text-zinc-600">{article.age_label}</span>
                    </div>

                    {/* Full title */}
                    <p className="text-sm font-semibold text-zinc-100 leading-snug">
                      {article.title}
                    </p>

                    {/* Full snippet — no truncation */}
                    {article.snippet && (
                      <p className="text-[12px] text-zinc-400 leading-relaxed">
                        {article.snippet}
                      </p>
                    )}

                    {/* Footer: source + actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-600 font-medium">
                        {article.source_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* Read in new tab — doesn't select the article */}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-700/50 text-zinc-500 hover:text-zinc-200 hover:border-zinc-600 text-[11px] font-medium transition-all"
                        >
                          <ExternalLink size={10} />
                          Read
                        </a>
                        {/* Use this topic */}
                        <button
                          onClick={() => onUseArticle(article)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600/90 hover:bg-violet-500 text-white text-[11px] font-semibold transition-all shadow-sm shadow-violet-500/20"
                        >
                          Use
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Attached sources panel — pinned at bottom */}
            <div className="shrink-0">
              <AttachedSourcesPanel />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
