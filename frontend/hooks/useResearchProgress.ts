"use client";
import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";

export function useResearchProgress() {
  const status = useAppSelector((s) => s.pipeline.stages.research.status);
  const runId = useAppSelector((s) => s.pipeline.runId);
  const [progress, setProgress] = useState<{ pct: number; label: string } | null>(null);

  useEffect(() => {
    if (status !== "running" || !runId) {
      setProgress(null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const prog = await api.getResearchStatus(runId);
        if (prog.pct !== undefined) {
          setProgress({ pct: prog.pct, label: prog.label ?? "Running…" });
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [status, runId]);

  return progress;
}
