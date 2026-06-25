"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TokenChipProps {
  runId: string | null;
  stage?: "research" | "angles" | "carousel" | "caption" | "blog";
  showTotal?: boolean;
}

interface StageData {
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_inr: number;
  calls: number;
}

function Chip({ tokens, costInr, costUsd }: { tokens: number; costInr: number; costUsd: number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800/50 text-[10px] text-zinc-500 font-medium">
      <span>🪙</span>
      <span>{tokens.toLocaleString()} tokens</span>
      <span className="text-zinc-700">·</span>
      <span className="text-zinc-400">₹{costInr.toFixed(2)} / ${costUsd.toFixed(3)}</span>
    </div>
  );
}

export function TokenChip({ runId, stage, showTotal = false }: TokenChipProps) {
  const [stageData, setStageData] = useState<StageData | null>(null);
  const [totalData, setTotalData] = useState<{ cost_usd: number; cost_inr: number; input: number; output: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!runId) return;
    setLoaded(false);
    api.getTokenUsage(runId)
      .then(res => {
        if (showTotal) {
          setTotalData({ cost_usd: res.total_cost_usd, cost_inr: res.total_cost_inr, input: res.total_input, output: res.total_output });
        } else if (stage) {
          setStageData(res.by_stage?.[stage] ?? null);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true)); // silently hide on error — chip is informational only
  }, [runId, stage, showTotal]);

  if (!runId || !loaded) return null;

  if (showTotal && totalData) {
    return <Chip tokens={totalData.input + totalData.output} costInr={totalData.cost_inr} costUsd={totalData.cost_usd} />;
  }
  if (!showTotal && stageData) {
    return <Chip tokens={stageData.input_tokens + stageData.output_tokens} costInr={stageData.cost_inr} costUsd={stageData.cost_usd} />;
  }

  return null;
}
