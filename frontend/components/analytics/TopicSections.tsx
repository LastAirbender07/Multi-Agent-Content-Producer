/**
 * TopicSections — Topics by Category + Quality by Topic (category × confidence heatmap).
 */
"use client";
import { Layers, ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "./Card";

export function TopicSections({
  topicDistribution,
  categoryConfidence,
  totalRuns,
}: {
  topicDistribution: { category: string; count: number }[];
  categoryConfidence: { category: string; avg_confidence: number; run_count: number }[];
  totalRuns: number;
}) {
  if (topicDistribution.length === 0 && categoryConfidence.length < 2) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {topicDistribution.length > 0 && (
        <Card>
          <CardHeader icon={Layers} iconColor="bg-blue-600/10 border border-blue-500/20 text-blue-400" label="Topics by Category" />
          <div className="space-y-2.5">
            {topicDistribution.map(({ category, count }) => {
              const pct = totalRuns > 0 ? (count / totalRuns) * 100 : 0;
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-zinc-400 w-40 truncate shrink-0">{category}</span>
                  <div className="flex-1 bg-zinc-800/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-600 to-blue-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-semibold w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {categoryConfidence.length >= 2 && (
        <Card>
          <CardHeader icon={ShieldCheck} iconColor="bg-sky-600/10 border border-sky-500/20 text-sky-400" label="Quality by Topic" />
          <div className="space-y-2">
            {categoryConfidence.map(({ category, avg_confidence, run_count }) => {
              const pct   = avg_confidence * 100;
              const color = pct >= 75 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
              const text  = pct >= 75 ? "text-emerald-400" : pct >= 60 ? "text-amber-400" : "text-red-400";
              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-zinc-400 w-36 truncate shrink-0">{category}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-[10px] font-mono font-semibold w-9 text-right shrink-0 ${text}`}>
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-zinc-700 w-8 text-right shrink-0">{run_count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
