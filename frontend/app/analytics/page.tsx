"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Layers, DollarSign, Zap, Activity, Cpu } from "lucide-react";
import { api } from "@/lib/api";
import type { AnalyticsSummary } from "@/lib/api";
import { KpiCard } from "@/components/analytics/KpiCard";
import { ContributionCalendar } from "@/components/analytics/ContributionCalendar";

const STAGE_LABELS: Record<string, string> = {
  research: "Research synthesis",
  angles:   "Angle generation",
  carousel: "Carousel content",
  caption:  "Captions",
  blog:     "Blog post",
};

const STAGE_COLORS: Record<string, string> = {
  research: "#7c3aed", angles: "#2dd4bf", carousel: "#f59e0b", caption: "#60a5fa", blog: "#f472b6",
};

export default function AnalyticsPage() {
  const [data, setData]   = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const todayStr    = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    api.getSummary()
      .then(setData)
      .catch(err => console.error("Analytics failed:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-black">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loading analytics…</span>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-full min-h-screen bg-black gap-4">
      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <BarChart2 size={20} className="text-zinc-700" />
      </div>
      <p className="text-zinc-600 text-sm font-medium">Analytics unavailable — backend may be offline</p>
    </div>
  );

  const {
    kpis = { total_runs: 0, total_slides: 0, total_cost_usd: 0, total_cost_inr: 0, avg_cost_usd: 0, avg_cost_inr: 0, untracked_runs: 0 },
    token_by_stage = {},
    token_series   = [],
    topic_distribution = [],
    activity       = [],
    model_breakdown = [],
    runs_with_token_data = 0,
  } = data;

  const activityMap   = Object.fromEntries(activity.map(a => [a.date, a.count]));
  const yearsWithData = [...new Set(activity.map(a => Number(a.date.slice(0, 4))))];
  if (!yearsWithData.includes(currentYear)) yearsWithData.push(currentYear);
  const allYears = yearsWithData.sort((a, b) => a - b);

  const totalCostUsd  = Object.values(token_by_stage).reduce((s, v) => s + v.cost_usd, 0);
  const stages        = Object.entries(token_by_stage).sort((a, b) => b[1].cost_usd - a[1].cost_usd);
  const runsWithTokens = token_series.filter(r => r.total_tokens > 0);
  const maxTokens      = Math.max(...runsWithTokens.map(r => r.total_tokens), 1);

  return (
    <div className="flex-1 overflow-auto bg-black custom-scrollbar">
      <div className="max-w-6xl mx-auto p-8 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Analytics</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">
              {kpis.total_runs} runs · {runs_with_token_data} with cost data
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
            <Activity size={13} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">All time</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={BarChart2}   label="Total Runs"      value={kpis.total_runs.toString()}          color="bg-violet-600/10 border-violet-500/20 text-violet-400" />
          <KpiCard icon={Layers}      label="Slides Created"  value={kpis.total_slides.toLocaleString()}  color="bg-blue-600/10 border-blue-500/20 text-blue-400" />
          <KpiCard icon={DollarSign}  label="Total Spent"     value={`₹${kpis.total_cost_inr.toFixed(2)}`}  sub={`$${kpis.total_cost_usd.toFixed(3)} USD${kpis.untracked_runs > 0 ? ` · ${kpis.untracked_runs} runs estimated` : ""}`}  color="bg-emerald-600/10 border-emerald-500/20 text-emerald-400" />
          <KpiCard icon={TrendingUp}  label="Avg Cost / Run"  value={`₹${kpis.avg_cost_inr.toFixed(2)}`}   sub={`$${kpis.avg_cost_usd.toFixed(4)} USD`}   color="bg-amber-600/10 border-amber-500/20 text-amber-400" />
        </div>

        {/* Token usage per run */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                <BarChart2 size={15} className="text-violet-400" />
              </div>
              <h2 className="text-sm font-black text-white tracking-tight">Token Usage per Run</h2>
            </div>
            <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">
              {runsWithTokens.length} runs with data
            </span>
          </div>
          {runsWithTokens.length === 0 ? (
            <p className="text-xs text-zinc-600 font-medium py-8 text-center">
              No token data yet — cost tracking begins from your next run
            </p>
          ) : (
            <div className="space-y-1.5">
              {runsWithTokens.slice(-20).map((run, i) => (
                <div key={i} className="flex items-center gap-3">
                  <p className="text-[10px] text-zinc-500 font-medium truncate w-40 shrink-0">{run.topic || run.run_id}</p>
                  <div className="flex-1 bg-zinc-800/60 rounded-full h-4 overflow-hidden">
                    <div className="h-full rounded-full bg-linear-to-r from-violet-600 to-violet-400 transition-all"
                      style={{ width: `${(run.total_tokens / maxTokens) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono tabular-nums w-20 text-right shrink-0">
                    {run.total_tokens.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-600 w-16 text-right shrink-0">₹{run.cost_inr.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stage cost + Topic distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stages.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Zap size={15} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-black text-white tracking-tight">Cost by Stage</h2>
              </div>
              <div className="space-y-3">
                {stages.map(([stage, stats]) => {
                  const pct = totalCostUsd > 0 ? (stats.cost_usd / totalCostUsd) * 100 : 0;
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-400">{STAGE_LABELS[stage] ?? stage}</span>
                        <span className="text-xs font-mono text-zinc-500">₹{stats.cost_inr.toFixed(2)} · {Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] ?? "#71717a" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {topic_distribution.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                  <Layers size={15} className="text-blue-400" />
                </div>
                <h2 className="text-sm font-black text-white tracking-tight">Topics by Category</h2>
              </div>
              <div className="space-y-2.5">
                {topic_distribution.map(({ category, count }) => {
                  const pct = (count / kpis.total_runs) * 100;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-zinc-400 w-40 truncate shrink-0">{category}</span>
                      <div className="flex-1 bg-zinc-800/60 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full bg-linear-to-r from-blue-600 to-blue-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-600 font-semibold w-8 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Activity calendar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
              <Activity size={15} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-black text-white tracking-tight">Activity</h2>
          </div>
          <ContributionCalendar
            activityMap={activityMap}
            allYears={allYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            todayStr={todayStr}
          />
        </motion.div>

        {/* Model breakdown */}
        {model_breakdown.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-zinc-700/30 border border-zinc-600/30 flex items-center justify-center">
                <Cpu size={15} className="text-zinc-400" />
              </div>
              <h2 className="text-sm font-black text-white tracking-tight">Model Usage</h2>
            </div>
            <div className="space-y-3">
              {model_breakdown.map(({ model, cost_usd, cost_inr, calls }) => {
                const pct = totalCostUsd > 0 ? (cost_usd / totalCostUsd) * 100 : 0;
                return (
                  <div key={model} className="flex items-center gap-4">
                    <span className="text-[11px] font-mono font-bold text-zinc-400 w-48 truncate shrink-0">{model}</span>
                    <div className="flex-1 bg-zinc-800/60 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full bg-zinc-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-semibold w-24 text-right shrink-0">
                      ₹{cost_inr.toFixed(2)} · {Math.round(pct)}%
                    </span>
                    <span className="text-[10px] text-zinc-700 w-16 text-right shrink-0">{calls} calls</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
