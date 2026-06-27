/**
 * StageSections — Cost by Stage + Stage Performance (latency) side by side.
 */
"use client";
import { Zap, Clock } from "lucide-react";
import { Card, CardHeader } from "./Card";

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

interface StageStats { cost_usd: number; cost_inr: number; calls: number }
interface StageLatency { avg_s: number; min_s: number; max_s: number; samples: number }

export function StageSections({
  byStage,
  stageLatency,
}: {
  byStage: Record<string, StageStats>;
  stageLatency: Record<string, StageLatency>;
}) {
  const stages       = Object.entries(byStage).sort((a, b) => b[1].cost_usd - a[1].cost_usd);
  const totalCostUsd = stages.reduce((s, [, v]) => s + v.cost_usd, 0);
  const hasLatency   = Object.keys(stageLatency).length > 0;

  if (stages.length === 0 && !hasLatency) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {stages.length > 0 && (
        <Card>
          <CardHeader icon={Zap} iconColor="bg-amber-600/10 border border-amber-500/20 text-amber-400" label="Cost by Stage" />
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
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] ?? "#71717a" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {hasLatency && (
        <Card>
          <CardHeader icon={Clock} iconColor="bg-zinc-700/30 border border-zinc-600/30 text-zinc-400" label="Stage Performance" />
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-600 text-[10px] uppercase tracking-widest">
                <th className="text-left pb-2 font-semibold">Stage</th>
                <th className="text-right pb-2 font-semibold">Avg</th>
                <th className="text-right pb-2 font-semibold">Min</th>
                <th className="text-right pb-2 font-semibold">Max</th>
                <th className="text-right pb-2 font-semibold">n</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stageLatency)
                .sort((a, b) => b[1].avg_s - a[1].avg_s)
                .map(([stage, lat]) => (
                  <tr key={stage} className="border-t border-zinc-800/50">
                    <td className="py-1.5 text-zinc-300 font-medium">{STAGE_LABELS[stage] ?? stage}</td>
                    <td className="text-right text-zinc-400 font-mono">{lat.avg_s}s</td>
                    <td className="text-right text-zinc-700 font-mono">{lat.min_s}s</td>
                    <td className="text-right text-zinc-700 font-mono">{lat.max_s}s</td>
                    <td className="text-right text-zinc-700">{lat.samples}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
