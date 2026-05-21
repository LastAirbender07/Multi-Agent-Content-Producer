"use client";
import { useState } from "react";
import {
  Newspaper,
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowUpRight,
  User,
  Globe
} from "lucide-react";
import { api, ProcessedQuery, NewsSearchResponse, NewsArticle } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumCard } from "@/components/ui/PremiumCard";

const SOURCES = ["google", "newsapi", "ddgs"] as const;
const TIME_FILTERS = [
  { label: "1D", value: "1d" },
  { label: "3D", value: "3d" },
  { label: "1W", value: "7d" },
  { label: "1M", value: "1m" },
];

function formatDate(iso?: string) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function NewsCard({ article, index }: { article: NewsArticle; index: number }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <PremiumCard className="p-0 overflow-hidden group">
        <div className="flex flex-col md:flex-row h-full">
          {article.url_to_image && (
            <div className="md:w-64 h-48 md:h-auto overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-zinc-900/50">
              <img
                src={article.url_to_image}
                alt={article.title || ""}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 p-8 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {article.source_name && (
                    <span className="px-3 py-1 bg-zinc-950 border border-zinc-900 rounded-full text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                      {article.source_name}
                    </span>
                  )}
                  {article.published_at && (
                    <div className="flex items-center gap-1.5 text-zinc-600">
                      <Clock size={10} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{formatDate(article.published_at)}</span>
                    </div>
                  )}
                </div>
                {article.url && (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-600 hover:text-violet-400 hover:border-violet-400/20 transition-all"
                  >
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>

              <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-violet-400 transition-colors">
                {article.title}
              </h3>

              {article.description && (
                <p className="text-sm text-zinc-400 leading-relaxed font-medium">
                  {expanded ? article.description : article.description.slice(0, 180) + (article.description.length > 180 ? "..." : "")}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-900/50">
              <div className="flex items-center gap-4">
                 {article.author && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-600">
                      <User size={12} />
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate max-w-[120px]">
                      {article.author}
                    </span>
                  </div>
                )}
              </div>
              
              {article.content && article.content.length > 180 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] font-black text-violet-500 uppercase tracking-widest hover:text-violet-400 transition-colors"
                >
                  {expanded ? "[ Collapse ]" : "[ Read Brief ]"}
                </button>
              )}
            </div>
          </div>
        </div>
      </PremiumCard>
    </motion.div>
  );
}

export default function NewsPage() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"google" | "newsapi" | "ddgs">("google");
  const maxResults = 10;
  const [when, setWhen] = useState("7d");
  const [refining, setRefining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NewsSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setError(null);
    setResult(null);

    setRefining(true);
    let pq: ProcessedQuery | null = null;
    try {
      pq = await api.refineQuery(query);
    } catch {
      /* non-fatal */
    } finally {
      setRefining(false);
    }

    setLoading(true);
    try {
      const res = await api.searchNews({
        query: pq?.cleaned_topic || query,
        source,
        max_results: maxResults,
        when,
      });
      if (!res.success && res.error) {
        setError(res.error);
      } else {
        setResult(res);
      }
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const isLoading = refining || loading;

  return (
    <div className="min-h-screen bg-black p-12 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-600/20">
              <Newspaper size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Signal Monitor</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Cross-referencing global news via multi-agent search.</p>
          </motion.div>

          <div className="flex flex-wrap gap-4">
            <div className="p-1 bg-zinc-950 rounded-2xl border border-zinc-900 flex">
              {SOURCES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    source === s
                      ? "bg-zinc-800 text-white shadow-lg shadow-black/50"
                      : "text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {s === "google" ? "Google" : s === "newsapi" ? "NewsAPI" : "DDG"}
                </button>
              ))}
            </div>
            <div className="p-1 bg-zinc-950 rounded-2xl border border-zinc-900 flex">
              {TIME_FILTERS.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setWhen(tf.value)}
                  className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                    when === tf.value
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                      : "text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-linear-to-r from-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex gap-4 p-2 bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800 rounded-[2.5rem] shadow-2xl">
            <div className="flex-1 flex items-center px-6">
              <Search size={20} className="text-zinc-600 group-focus-within:text-violet-500 transition-colors" />
              <input
                type="text"
                placeholder="Search global events and signals…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent px-4 py-4 text-sm font-medium text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="px-10 py-4 rounded-4xl bg-violet-600 hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 active:scale-95 shrink-0"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Fetch Signals"}
            </button>
          </div>
        </div>

        {/* Status & Results */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-red-500/5 border border-red-500/20 rounded-4xl flex items-center gap-4 text-red-500">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}

          {refining && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-2">
              <Sparkles size={16} className="text-violet-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">AI Agent: Refining search vectors for signal-to-noise optimization...</span>
            </motion.div>
          )}

          {loading && (
            <motion.div key="loading" className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-[2.5rem] bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))}
            </motion.div>
          )}

          {result && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Intel: {result.total_results} Articles</h3>
                <div className="flex-1 h-px bg-zinc-900" />
              </div>

              <div className="grid grid-cols-1 gap-8">
                {result.articles.map((article, i) => (
                  <NewsCard key={i} index={i} article={article} />
                ))}
              </div>
              
              {result.articles.length === 0 && (
                <div className="text-center py-24">
                   <p className="text-zinc-600 font-black uppercase tracking-widest">No Signals Detected</p>
                </div>
              )}
            </motion.div>
          )}

          {!isLoading && !result && !error && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-950 border border-zinc-900 flex items-center justify-center mb-8 shadow-2xl">
                <Globe size={40} className="text-zinc-800" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Signal Awaiting</h2>
              <p className="text-zinc-500 text-sm font-medium max-w-sm leading-relaxed">
                Connect to global news APIs to monitor trends, competitors, and market shifts.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
