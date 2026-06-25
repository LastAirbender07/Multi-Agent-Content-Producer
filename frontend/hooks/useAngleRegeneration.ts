"use client";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAngleResult } from "@/store/slices/pipelineSlice";
import { api } from "@/lib/api";

export function useAngleRegeneration() {
  const dispatch = useAppDispatch();
  const { researchResult, angleResult, angleMode, maxAnglesSelect, runId, topic } =
    useAppSelector((s) => s.pipeline);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerateAngles() {
    if (!researchResult?.synthesis || regenerating) return;
    setRegenerating(true);
    try {
      const result = await api.regenerateAngles({
        topic,
        synthesis: researchResult.synthesis,
        run_id: runId ?? undefined,
        mode: angleMode,
        max_angles_to_select: maxAnglesSelect,
        exclude_statements: angleResult?.angles.map((a) => a.statement) ?? [],
      });
      dispatch(setAngleResult(result));
    } catch (e: any) {
      console.error("Angle regeneration failed:", e.message);
    } finally {
      setRegenerating(false);
    }
  }

  return { handleRegenerateAngles, regenerating };
}
