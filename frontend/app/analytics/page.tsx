"use client";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart2, TrendingUp, Layers, DollarSign, Activity, Cpu,
  ShieldCheck, Target, FileText, Image as ImageIcon, RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AnalyticsSummary } from "@/lib/api";
import { KpiCard } from "@/components/analytics/KpiCard";
import { ContributionCalendar } from "@/components/analytics/ContributionCalendar";
import { Card } from "@/components/analytics/Card";
import { ResearchQualitySection } from "@/components/analytics/ResearchQualitySection";
import { StageSections } from "@/components/analytics/StageSections";
import { TopicSections } from "@/components/analytics/TopicSections";
import { ContentStrategySection } from "@/components/analytics/ContentStrategySection";
import { PublishReadinessTable } from "@/components/analytics/PublishReadinessTable";

export default function AnalyticsPage() {
  const [data, setData]         = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const todayStr    = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const fetchData = useCallback(async (invalidate = false) => {
    try {
      if (invalidate) {
        // Tell the backend to drop its cache before fetching fresh data
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"}/api/v1/analytics/invalidate-cache`, {
          method: "POST",
        }).catch(() => {}); // non-fatal if endpoint absent
      }
      const result = await api.getSummary();
      setData(result);
    } catch (err) {
      console.error("Analytics failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  }, [fetchData]);

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
    computed_at,
    kpis = { total_runs: 0, total_slides: 0, total_cost_usd: 0, total_cost_inr: 0, avg_cost_usd: 0, avg_cost_inr: 0, untracked_runs: 0 },
    token_by_stage       = {},
    token_series         = [],
    topic_distribution   = [],
    activity             = [],
    model_breakdown      = [],
    runs_with_token_data = 0,
    stage_latency        = {},
    research_quality     = { avg_confidence: null, quality_gate_rate: null, quality_gate_passed: 0, runs_with_quality_data: 0, distribution: [], run_status_counts: {}, avg_evidence_count: 0, avg_key_points: 0, avg_gaps_found: 0, avg_iterations: 0 },
    hook_distribution         = [],
    slide_type_distribution   = [],
    image_source_distribution = [],
    category_confidence       = [],
    run_readiness             = [],
    blog_count                = 0,
  } = data;

  const activityMap   = Object.fromEntries(activity.map(a => [a.date, a.count]));
  const yearsWithData = [...new Set(activity.map(a => Number(a.date.slice(0, 4))))];
  if (!yearsWithData.includes(currentYear)) yearsWithData.push(currentYear);
  const allYears = yearsWithData.sort((a, b) => a - b);

  const totalCostUsd   = Object.values(token_by_stage).reduce((s, v) => s + v.cost_usd, 0);
  const runsWithTokens = token_series.filter(r => r.total_tokens > 0);
  const maxTokens      = Math.max(...runsWithTokens.map(r => r.total_tokens), 1);

  // Derived KPIs for the second row
  const imgSrcPct = (() => {
    const pexels = image_source_distribution.find(s => s.source === "pexels")?.count ?? 0;
    const total  = image_source_distribution.reduce((s, i) => s + i.count, 0);
    return total > 0 ? Math.round((pexels / total) * 100) : 0;
  })();

  return (
    <div className="flex-1 overflow-auto bg-black custom-scrollbar">
      <div className="max-w-6xl mx-auto p-8 space-y-10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Analytics</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">
              {kpis.total_runs} runs · {runs_with_token_data} with cost data
              {computed_at && (
                <span className="ml-2 text-zinc-700">
                  · Updated {new Date(computed_at).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-800 text-zinc-400 hover:text-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Force-refresh analytics (bypasses cache)"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-violet-400" : ""} />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {refreshing ? "Refreshing…" : "Refresh"}
              </span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
              <Activity size={13} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">All time</span>
            </div>
          </div>
        </div>

        {/* ── Row 1: Cost & Volume KPIs ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 mb-3">Cost &amp; Volume</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={DollarSign} label="Total Spent"
              value={`₹${kpis.total_cost_inr.toFixed(2)}`}
              sub={`$${kpis.total_cost_usd.toFixed(3)} USD${kpis.untracked_runs > 0 ? ` · ${kpis.untracked_runs} estimated` : ""}`}
              color="bg-emerald-600/10 border-emerald-500/20 text-emerald-400" />
            <KpiCard icon={TrendingUp} label="Avg Cost / Run"
              value={`₹${kpis.avg_cost_inr.toFixed(2)}`}
              sub={`$${kpis.avg_cost_usd.toFixed(4)} USD`}
              color="bg-amber-600/10 border-amber-500/20 text-amber-400" />
            <KpiCard icon={BarChart2}  label="Total Runs"
              value={kpis.total_runs.toString()}
              sub={`${runs_with_token_data} with cost data`}
              color="bg-violet-600/10 border-violet-500/20 text-violet-400" />
            <KpiCard icon={Layers}     label="Slides Created"
              value={kpis.total_slides.toLocaleString()}
              sub={`avg ${kpis.total_runs > 0 ? Math.round(kpis.total_slides / kpis.total_runs) : 0} per run`}
              color="bg-blue-600/10 border-blue-500/20 text-blue-400" />
          </div>
        </div>

        {/* ── Row 2: Quality & Content KPIs ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600 mb-3">Quality &amp; Content</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={ShieldCheck} label="Research Efficiency"
              value={research_quality.quality_gate_rate != null
                ? `${(research_quality.quality_gate_rate * 100).toFixed(0)}%`
                : "—"}
              sub={research_quality.quality_gate_rate != null
                ? `${research_quality.quality_gate_passed} of ${research_quality.runs_with_quality_data} passed iteration 1`
                : "No quality data yet"}
              color="bg-sky-600/10 border-sky-500/20 text-sky-400" />
            <KpiCard icon={Target} label="Avg Research Confidence"
              value={research_quality.avg_confidence != null
                ? `${(research_quality.avg_confidence * 100).toFixed(0)}%`
                : "—"}
              sub={`avg ${research_quality.avg_evidence_count} sources · ${research_quality.avg_gaps_found} gaps`}
              color="bg-violet-600/10 border-violet-500/20 text-violet-400" />
            <KpiCard icon={FileText} label="Blog Posts Written"
              value={blog_count.toString()}
              sub={`across all ${kpis.total_runs} runs`}
              color="bg-pink-600/10 border-pink-500/20 text-pink-400" />
            <KpiCard icon={ImageIcon} label="Pexels Image Rate"
              value={`${imgSrcPct}%`}
              sub={`of ${image_source_distribution.reduce((s, i) => s + i.count, 0)} images sourced`}
              color="bg-teal-600/10 border-teal-500/20 text-teal-400" />
          </div>
        </div>

        {/* Run status strip */}
        {Object.keys(research_quality.run_status_counts).length > 0 && (
          <div className="flex gap-5 text-xs -mt-4">
            <span className="text-emerald-400 font-semibold">✓ {research_quality.run_status_counts.success ?? 0} succeeded</span>
            <span className="text-amber-400 font-semibold">~ {research_quality.run_status_counts.partial_success ?? 0} partial</span>
            <span className="text-red-400 font-semibold">✗ {research_quality.run_status_counts.failed ?? 0} failed</span>
          </div>
        )}

        {/* ── Research Quality deep-dive ── */}
        <ResearchQualitySection rq={research_quality} />

        {/* ── Cost — token usage per run ── */}
        <Card>
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
        </Card>

        {/* ── Cost by Stage + Stage latency ── */}
        <StageSections byStage={token_by_stage} stageLatency={stage_latency} />

        {/* ── Topics + Quality by topic ── */}
        <TopicSections
          topicDistribution={topic_distribution}
          categoryConfidence={category_confidence}
          totalRuns={kpis.total_runs}
        />

        {/* ── Content strategy: hooks + slide types + image sources ── */}
        <ContentStrategySection
          hooks={hook_distribution}
          slideTypes={slide_type_distribution}
          imageSources={image_source_distribution}
        />

        {/* ── Activity calendar ── */}
        <Card>
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
        </Card>

        {/* ── Publish readiness ── */}
        <PublishReadinessTable runs={run_readiness} />

        {/* ── Model breakdown ── */}
        {model_breakdown.length > 0 && (
          <Card>
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
          </Card>
        )}

      </div>
    </div>
  );
}
