"use client";
import { useAppSelector } from "@/store/hooks";
import { FlaskConical, Target, Zap, Info } from "lucide-react";
import { PremiumCard } from "../ui/PremiumCard";

export function ResearchSummary() {
  const { researchResult } = useAppSelector((state) => state.pipeline);

  if (!researchResult) return null;

  const confidence = researchResult.evaluation 
    ? Math.round(researchResult.evaluation.combined_confidence * 100) 
    : 0;

  return (
    <PremiumCard className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
            <FlaskConical size={20} />
          </div>
          <h3 className="text-lg font-bold text-zinc-100">Research Insights</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Confidence</div>
            <div className={`text-xl font-black ${
              confidence > 70 ? "text-emerald-500" : confidence > 40 ? "text-amber-500" : "text-red-500"
            }`}>
              {confidence}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Target size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Sources</span>
          </div>
          <p className="text-2xl font-black text-zinc-100">{researchResult.evidence.length}</p>
        </div>
        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Zap size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
          </div>
          <p className="text-xs font-bold text-violet-400 capitalize truncate">
            {researchResult.status.replace("_", " ")}
          </p>
        </div>
        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-500 mb-1">
            <Info size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Iteration</span>
          </div>
          <p className="text-2xl font-black text-zinc-100">#{researchResult.best_iteration || 1}</p>
        </div>
      </div>

      {researchResult.synthesis && (
        <div className="space-y-4">
          <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-6">
            <p className="text-sm text-zinc-300 leading-relaxed italic">
              "{researchResult.synthesis.summary}"
            </p>
          </div>
          
          {researchResult.synthesis.key_points && researchResult.synthesis.key_points.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-1">Key Findings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {researchResult.synthesis.key_points.slice(0, 4).map((point, i) => (
                  <div key={i} className="flex gap-3 p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                    <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-xs text-zinc-400 leading-snug">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PremiumCard>
  );
}
