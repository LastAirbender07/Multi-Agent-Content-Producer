import { post } from "./client";
import type { ProcessedQuery, ParseDocResponse, ResearchRequestBody, ResearchResponse } from "./types";
import { BASE, fetchWithTimeout } from "./client";

export const research = {
  refineQuery: (topic: string) =>
    post<ProcessedQuery>("/tools/query-refine", { topic }),

  parseDoc: (file: File): Promise<ParseDocResponse> => {
    const form = new FormData();
    form.append("file", file);
    return fetchWithTimeout(`${BASE}/tools/parse-doc`, { method: "POST", body: form })
      .then(async r => {
        if (!r.ok) { const t = await r.text(); throw new Error(`${r.status}: ${t}`); }
        return r.json() as Promise<ParseDocResponse>;
      });
  },

  runResearch: (body: ResearchRequestBody) =>
    post<ResearchResponse>("/research/run", body),

  getResearchStatus: (runId: string): Promise<{ pct?: number; label?: string; status?: string }> =>
    fetchWithTimeout(`${BASE}/research/status/${runId}`).then(r => r.json()),

  llmDraftResearch: (body: { topic: string; context?: string; run_id?: string }) =>
    post<ResearchResponse>("/research/llm-draft", body),

  llmRefineResearch: (body: { topic: string; current_result: ResearchResponse; feedback: string }) =>
    post<ResearchResponse>("/research/llm-refine", body),
};
