"use client";
import { useState, useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";

export function useContentProgress() {
  const status = useAppSelector((s) => s.pipeline.stages.content.status);
  const runId  = useAppSelector((s) => s.pipeline.runId);
  const [progress, setProgress] = useState<{ pct: number; label: string; current: number; total: number } | null>(null);

  useEffect(() => {
    if (status !== "running" || !runId) {
      setProgress(null);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const data = await api.getRenderStatus(runId);
        if (data.pct !== undefined && data.current !== undefined && data.total !== undefined) {
          setProgress({ pct: data.pct, label: data.label ?? "Generating…", current: data.current, total: data.total });
        }
      } catch {}
    }, 1500);

    return () => clearInterval(interval);
  }, [status, runId]);

  return progress;
}
