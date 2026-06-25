import { useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { loadRun } from "@/store/slices/pipelineSlice";
import { addRun } from "@/store/slices/historySlice";
import { ASSET_BASE } from "@/lib/api/client";
import type { AngleResponse, ContentResponse } from "@/lib/api/types";

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? (await res.json() as T) : null;
  } catch {
    return null;
  }
}

export function useRecoverRun() {
  const dispatch = useAppDispatch();
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  async function recoverRun(runId: string, topic: string): Promise<void> {
    setRecoveringId(runId);
    try {
      const base = `${ASSET_BASE}/outputs/runs/${runId}`;

      // Stage 1: research
      const researchResult = await fetchJson<any>(`${base}/research/research_result.json`);

      // Stage 2: angles — merge generated.json + selection.json into AngleResponse shape
      let angleResult: AngleResponse | null = null;
      const generated = await fetchJson<any>(`${base}/angles/generated.json`);
      if (generated) {
        const selection = await fetchJson<any>(`${base}/angles/selection.json`);
        angleResult = {
          run_id: runId,
          status: "success",
          angles: generated.angles ?? [],
          selected_angles: selection?.selected_angles ?? generated.angles ?? [],
          selection_reasoning: selection?.selection_reasoning ?? "Recovered from disk",
          errors: [],
          output_path: `outputs/runs/${runId}/angles`,
        };
      }

      // Stage 3: content — scan angle_N/carousel.json files and rebuild ContentResponse
      let contentResult: ContentResponse | null = null;
      if (angleResult) {
        const numAngles = angleResult.selected_angles.length || 1;
        const carousels: any[] = [];
        for (let i = 0; i < numAngles; i++) {
          const c = await fetchJson<any>(`${base}/content/angle_${i}/carousel.json`);
          if (c) carousels.push({ index: i, data: c });
          else break; // stop at first missing carousel
        }
        if (carousels.length > 0) {
          contentResult = {
            run_id: runId,
            status: "success",
            angles_processed: carousels.map(c => c.index),
            output_paths: carousels.map(c => `outputs/runs/${runId}/content/angle_${c.index}`),
            carousel_paths: carousels.map(c => c.data.slide_png_paths ?? []),
            captions: carousels.map(c => c.data.caption ?? ""),
            hashtags_per_angle: carousels.map(c => c.data.hashtags ?? []),
            errors: [],
            blog_post_path: "",
            blog_post_html_path: "",
          };
        }
      }

      const run = {
        runId,
        topic,
        timestamp: new Date().toISOString(),
        researchResult,
        angleResult,
        contentResult,
      };

      dispatch(loadRun(run));
      dispatch(addRun(run));  // adds to history so it moves out of the orphan list
    } finally {
      setRecoveringId(null);
    }
  }

  return { recoverRun, recoveringId };
}
