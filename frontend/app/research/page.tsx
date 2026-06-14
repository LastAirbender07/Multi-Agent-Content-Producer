"use client";
import { useState } from "react";
import { Loader2, Sparkles, BarChart2, Globe } from "lucide-react";
import { api, ProcessedQuery, ResearchRequestBody } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { ResearchConfigPanel } from "@/components/research/ResearchConfigPanel";
import { ConfidenceBar } from "@/components/research/ConfidenceBar";
import { EvidenceCard } from "@/components/research/EvidenceCard";

export default function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"quick" | "standard" | "deep">("standard");
  const [freshness, setFreshness] = useState<"breaking" | "recent" | "evergreen">("recent");
  const [claimVerify, setClaimVerify] = useState(false);
  const [maxTools] = useState(6);
  const [maxSources] = useState(15);
  const [maxLoops] = useState(2);

  const [refining, setRefining] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null);

  async function handleRun() {
    if (!topic.trim()) return;
    setError(null);
    setResult(null);

    setRefining(true);
    let pq: ProcessedQuery | null = null;
    try {
      pq = await api.refineQuery(topic);
    } catch {}
    finally { setRefining(false); }

    setRunning(true);
    try {
      const body: ResearchRequestBody = {
        topic: pq?.cleaned_topic || topic,
        mode,
        freshness,
        needs_claim_verification: claimVerify,
        preprocessed_queries: pq?.search_queries || [],
        budget: { max_tool_calls: maxTools, max_sources: maxSources, max_refinement_loops: maxLoops },
      };
      setResult(await api.runResearch(body));
    } catch (e: any) {
      setError(e.message || "Research failed");
    } finally {
      setRunning(false);
    }
  }

  const isLoading = refining || running;

  return (
    <div className="flex h-full min-h-screen bg-black">
      <ResearchConfigPanel
        topic={topic} mode={mode} freshness={freshness} claimVerify={claimVerify}
        isLoading={isLoading} refining={refining} running={running}
        onTopicChange={setTopic} onModeChange={setMode}
        onFreshnessChange={setFreshness} onClaimVerifyChange={setClaimVerify}
        onRun={handleRun}
      />

      <main className="flex-1 overflow-auto p-12 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-12">
          <AnimatePresence mode="wait">
            {!isLoading && !result && !error && (
              <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-32 text-center">
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
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                      {refining ? "Refining Context..." : "Scanning Sources..."}
                    </p>
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
                {/* Quality assessment + metrics */}
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
                            {result.route_plan?.selected_tools.slice(0, 2).map((t: string) => (
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

                {/* Synthesis */}
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
                          {result.synthesis.key_points.map((kp: string, i: number) => (
                            <li key={i} className="flex gap-4">
                              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">{i + 1}</span>
                              <p className="text-sm text-zinc-300 leading-relaxed">{kp}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Market Implications</h4>
                        <ul className="space-y-4">
                          {result.synthesis.implications.map((imp: string, i: number) => (
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

                {/* Evidence */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 px-1">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
                      Source Intelligence ({result.evidence.length})
                    </h3>
                    <div className="flex-1 h-px bg-zinc-900" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {result.evidence.map((ev: any, i: number) => (
                      <EvidenceCard
                        key={i}
                        evidence={ev}
                        index={i}
                        isExpanded={expandedEvidence === i}
                        onToggle={() => setExpandedEvidence(expandedEvidence === i ? null : i)}
                      />
                    ))}
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
