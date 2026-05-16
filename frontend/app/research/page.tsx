"use client";
import { useState } from "react";
import {
  Search,
  Loader2,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  BarChart2,
  Target,
  Zap,
  ShieldCheck,
  Globe
} from "lucide-react";
import { api, ProcessedQuery, ResearchResponse, ResearchRequestBody } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumCard } from "@/components/ui/PremiumCard";

const MODES = ["quick", "standard", "deep"] as const;
const FRESHNESS = ["breaking", "recent", "evergreen"] as const;
const TOOL_OPTIONS = ["news_api", "ddgs_text", "ddgs_news", "crawl4ai"];

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
        <span>{label}</span>
        <span className={pct >= 70 ? "text-emerald-500" : "text-zinc-300"}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}
    >
      {text}
    </span>
  );
}

const SOURCE_COLORS: Record<string, string> = {
  news: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  web_search: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  crawl: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"quick" | "standard" | "deep">("standard");
  const [freshness, setFreshness] = useState<"breaking" | "recent" | "evergreen">("recent");
  const [toolMode, setToolMode] = useState<"auto" | "manual">("auto");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [maxTools, setMaxTools] = useState(6);
  const [maxSources, setMaxSources] = useState(15);
  const [maxLoops, setMaxLoops] = useState(2);
  const [claimVerify, setClaimVerify] = useState(false);

  const [refining, setRefining] = useState(false);
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState<ProcessedQuery | null>(null);
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null);

  async function handleRun() {
    if (!topic.trim()) return;
    setError(null);
    setResult(null);
    setProcessed(null);

    setRefining(true);
    let pq: ProcessedQuery | null = null;
    try {
      pq = await api.refineQuery(topic);
      setProcessed(pq);
    } catch {
      // non-fatal
    } finally {
      setRefining(false);
    }

    setRunning(true);
    try {
      const body: ResearchRequestBody = {
        topic: pq?.cleaned_topic || topic,
        mode,
        freshness,
        needs_claim_verification: claimVerify,
        tool_selection_mode: toolMode,
        selected_tools: toolMode === "manual" ? selectedTools : [],
        preprocessed_queries: pq?.search_queries || [],
        budget: {
          max_tool_calls: maxTools,
          max_sources: maxSources,
          max_refinement_loops: maxLoops,
        },
      };
      const res = await api.runResearch(body);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Research failed");
    } finally {
      setRunning(false);
    }
  }

  const isLoading = refining || running;

  return (
    <div className="flex h-full min-h-screen bg-black">
      {/* Left panel — config */}
      <aside className="w-80 shrink-0 border-r border-zinc-900/50 flex flex-col p-8 gap-8 bg-zinc-950/50 backdrop-blur-md">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-600/20">
            <BookOpen size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Deep Research</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">Multi-agent knowledge extraction.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Topic</label>
            <textarea
              rows={3}
              placeholder="What do you want to learn about?…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Depth</label>
              <select 
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
              >
                {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Freshness</label>
              <select 
                value={freshness}
                onChange={(e) => setFreshness(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-violet-500"
              >
                {FRESHNESS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-900">
             <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                claimVerify ? "bg-violet-600 border-violet-600" : "bg-zinc-900 border-zinc-800 group-hover:border-zinc-700"
              }`}>
                {claimVerify && <CheckCircle size={12} className="text-white" />}
                <input
                  type="checkbox"
                  className="hidden"
                  checked={claimVerify}
                  onChange={(e) => setClaimVerify(e.target.checked)}
                />
              </div>
              <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200">Claim Verification</span>
            </label>
          </div>

          <button
            onClick={handleRun}
            disabled={isLoading || !topic.trim()}
            className="w-full group relative overflow-hidden py-4 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black transition-all shadow-xl shadow-violet-500/20 active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} className="group-hover:scale-110 transition-transform" />
              )}
              {refining ? "REFINING…" : running ? "SEARCHING…" : "START RESEARCH"}
            </div>
          </button>
        </div>
      </aside>

      {/* Right panel — results */}
      <main className="flex-1 overflow-auto p-12 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-12">
          <AnimatePresence mode="wait">
            {!isLoading && !result && !error && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-32 text-center"
              >
                <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-2xl">
                  <Globe size={40} className="text-zinc-700" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter mb-4">Awaiting Topic</h2>
                <p className="text-zinc-500 text-sm font-medium max-w-sm leading-relaxed">
                  Our agents are ready to scan the web and synthesize deep insights for you.
                </p>
              </motion.div>
            )}

            {isLoading && (
              <motion.div key="loading" className="space-y-8">
                <div className="flex items-center gap-4 animate-pulse">
                   <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Loader2 size={24} className="text-violet-500 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Agent Execution</h2>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{refining ? "Refining Context..." : "Scanning Sources..."}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 rounded-3xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
                  ))}
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                {/* Status Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <PremiumCard className="p-8 lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
                          <BarChart2 size={20} />
                        </div>
                        <h3 className="text-lg font-black text-white tracking-tight">Quality Assessment</h3>
                      </div>
                      <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                        {result.status}
                      </div>
                    </div>

                    {result.evaluation && (
                      <div className="grid grid-cols-2 gap-8">
                        <ConfidenceBar value={result.evaluation.combined_confidence} label="Overall Confidence" />
                        <ConfidenceBar value={result.evaluation.llm_content_score} label="Content Richness" />
                        <ConfidenceBar value={result.evaluation.source_score} label="Source Reliability" />
                        <ConfidenceBar value={result.evaluation.coverage_score} label="Topic Coverage" />
                      </div>
                    )}
                  </PremiumCard>

                  <PremiumCard className="p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Discovery Metrics</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-zinc-400">Total Sources</span>
                          <span className="text-lg font-black text-white">{result.evidence.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-zinc-400">Tools Used</span>
                          <div className="flex gap-1">
                            {result.route_plan?.selected_tools.slice(0, 2).map(t => (
                              <div key={t} className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300">
                                {t[0].toUpperCase()}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-zinc-800/50 mt-6">
                       <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Iteration Hash</p>
                       <p className="text-[10px] font-mono text-zinc-600 mt-1 truncate">{result.run_id}</p>
                    </div>
                  </PremiumCard>
                </div>

                {/* Synthesis Output */}
                {result.synthesis && (
                  <PremiumCard className="p-10 space-y-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
                        <Sparkles size={20} />
                      </div>
                      <h3 className="text-xl font-black text-white tracking-tight">Executive Synthesis</h3>
                    </div>
                    
                    <p className="text-lg text-zinc-200 leading-relaxed font-medium italic">
                      "{result.synthesis.summary}"
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Key Findings</h4>
                        <ul className="space-y-4">
                          {result.synthesis.key_points.map((kp, i) => (
                            <li key={i} className="flex gap-4">
                              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                                {i + 1}
                              </span>
                              <p className="text-sm text-zinc-300 leading-relaxed">{kp}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Market Implications</h4>
                        <ul className="space-y-4">
                          {result.synthesis.implications.map((imp, i) => (
                            <li key={i} className="flex gap-4">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                              <p className="text-sm text-zinc-400 leading-relaxed font-medium">{imp}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </PremiumCard>
                )}

                {/* Evidence List */}
                <div className="space-y-6">
                   <div className="flex items-center gap-3 px-1">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Source Intelligence ({result.evidence.length})</h3>
                    <div className="flex-1 h-px bg-zinc-900" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {result.evidence.map((ev, i) => {
                      const isExpanded = expandedEvidence === i;
                      return (
                        <motion.div
                          key={i}
                          initial={false}
                          className={`rounded-[2rem] border transition-all duration-300 ${
                            isExpanded ? "bg-zinc-900/50 border-zinc-700" : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
                          }`}
                        >
                          <button
                            onClick={() => setExpandedEvidence(isExpanded ? null : i)}
                            className="w-full flex items-center justify-between p-6 text-left"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <Badge
                                text={ev.source_type}
                                color={SOURCE_COLORS[ev.source_type] || "bg-zinc-800 text-zinc-500 border-zinc-700"}
                              />
                              <span className="text-sm font-bold text-zinc-200 truncate">{ev.title}</span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 ml-4">
                              <div className="text-right">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Relevance</p>
                                <p className="text-xs font-black text-white">{Math.round(ev.relevance_score * 100)}%</p>
                              </div>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                isExpanded ? "bg-violet-600 text-white" : "bg-zinc-900 text-zinc-500"
                              }`}>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </div>
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-8 pb-8 pt-2 space-y-6">
                                  <div className="p-6 bg-black/40 rounded-2xl border border-zinc-800/50">
                                    <p className="text-sm text-zinc-400 leading-relaxed italic">
                                      {ev.evidence}
                                    </p>
                                  </div>
                                  {ev.url && (
                                    <a
                                      href={ev.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-violet-400 hover:text-violet-300 transition-colors"
                                    >
                                      <ExternalLink size={12} />
                                      Visit Source: {ev.source_name || "Direct Link"}
                                    </a>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
