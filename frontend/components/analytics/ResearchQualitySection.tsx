/**
 * ResearchQualitySection — confidence distribution + depth stats.
 */
"use client";
import { ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "./Card";
import type { ResearchQuality } from "@/lib/api/analytics";

export function ResearchQualitySection({ rq }: { rq: ResearchQuality }) {
  if (rq.runs_with_quality_data === 0) return null;

  const stats = [
    { value: rq.avg_confidence != null ? `${(rq.avg_confidence * 100).toFixed(0)}%` : "—", label: "Avg Confidence",       color: "text-sky-400" },
    { value: rq.quality_gate_rate != null ? `${(rq.quality_gate_rate * 100).toFixed(0)}%` : "—", label: "Quality Gate Passed", color: "text-emerald-400" },
    { value: String(rq.avg_evidence_count), label: "Avg Sources / Run",   color: "text-violet-400" },
    { value: String(rq.avg_gaps_found),     label: "Avg Gaps Found",      color: "text-amber-400" },
  ];

  return (
    <Card>
      <CardHeader icon={ShieldCheck} iconColor="bg-sky-600/10 border border-sky-500/20 text-sky-400" label="Research Quality" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(({ value, label, color }) => (
          <div key={label} className="text-center">
            <div className={`text-2xl font-black ${color}`}>{value}</div>
            <div className="text-[10px] text-zinc-600 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Confidence distribution bar list */}
      <div className="space-y-1 max-h-52 overflow-y-auto custom-scrollbar pr-1">
        {rq.distribution.slice(0, 20).map(r => (
          <div key={r.run_id} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-zinc-600 font-mono shrink-0">{r.run_id}</span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${r.passed ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${r.confidence * 100}%` }}
              />
            </div>
            <span className={`w-9 text-right shrink-0 font-semibold ${r.passed ? "text-emerald-400" : "text-amber-400"}`}>
              {(r.confidence * 100).toFixed(0)}%
            </span>
            <span className="text-zinc-600 truncate flex-1 min-w-0">{r.topic}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
