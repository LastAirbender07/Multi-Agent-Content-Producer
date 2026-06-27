/**
 * PublishReadinessTable — completeness checklist for the last 10 runs.
 */
"use client";
import { CheckSquare } from "lucide-react";
import { Card, CardHeader } from "./Card";
import type { RunReadiness } from "@/lib/api/analytics";

export function PublishReadinessTable({ runs }: { runs: RunReadiness[] }) {
  if (runs.length === 0) return null;

  return (
    <Card>
      <CardHeader
        icon={CheckSquare}
        iconColor="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400"
        label="Publish Readiness (Last 10 Runs)"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-600 text-[10px] uppercase tracking-widest">
              <th className="text-left pb-2 font-semibold">Run</th>
              <th className="text-left pb-2 font-semibold w-48">Topic</th>
              <th className="text-center pb-2 font-semibold">Slides</th>
              <th className="text-center pb-2 font-semibold">Images</th>
              <th className="text-center pb-2 font-semibold">Captions</th>
              <th className="text-center pb-2 font-semibold">Blog</th>
            </tr>
          </thead>
          <tbody>
            {runs.slice().reverse().map(r => (
              <tr key={r.run_id} className="border-t border-zinc-800/50">
                <td className="py-1.5 text-zinc-600 font-mono">{r.run_id}</td>
                <td className="py-1.5 text-zinc-400 truncate max-w-[12rem]">{r.topic}</td>
                {[r.has_slides, r.has_images, r.has_captions, r.has_blog].map((v, i) => (
                  <td key={i} className="text-center py-1.5">
                    <span className={v ? "text-emerald-400" : "text-zinc-700"}>{v ? "✓" : "✗"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
