import { post, BASE } from "./client";
import type { ContentRequestBody, ContentResponse, RunSummary, RunManifest } from "./types";

export const content = {
  runContent: (body: ContentRequestBody) =>
    post<ContentResponse>("/content/run", body),

  getBlogPostMd: (runId: string) =>
    fetch(`${BASE}/content/${runId}/blog-post`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); }),

  getBlogPostHtml: (runId: string) =>
    fetch(`${BASE}/content/${runId}/blog-post.html`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); }),

  updateBlogPost: (runId: string, markdown: string) =>
    fetch(`${BASE}/content/${runId}/blog-post`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown }),
    }).then(r => r.json()),

  createBlankRun: (topic: string): Promise<{ run_id: string; topic: string }> =>
    post("/content/new-blank-run", { topic }),

  getRunsList: (opts?: { search?: string; starred?: boolean }): Promise<{ runs: RunSummary[] }> => {
    const params = new URLSearchParams();
    if (opts?.search)            params.set("search", opts.search);
    if (opts?.starred !== undefined) params.set("starred", String(opts.starred));
    const qs = params.toString();
    return fetch(`${BASE}/content/runs${qs ? `?${qs}` : ""}`).then(r => r.json());
  },

  updateRunMetadata: (runId: string, patch: { tags?: string[]; starred?: boolean }): Promise<Record<string, unknown>> =>
    fetch(`${BASE}/content/${runId}/metadata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),

  getRunManifest: (runId: string): Promise<RunManifest> =>
    fetch(`${BASE}/content/${runId}/manifest`).then(r => r.json()),

  downloadCarouselZip: (runId: string, angle: number): Promise<Blob> =>
    fetch(`${BASE}/content/${runId}/carousel-download?angle=${angle}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.blob(); }),

  getTokenUsage: (runId: string): Promise<{
    total_input: number; total_output: number;
    total_cost_usd: number; total_cost_inr: number;
    by_stage: Record<string, { input_tokens: number; output_tokens: number; cost_usd: number; cost_inr: number; calls: number }>;
  }> =>
    fetch(`${BASE}/content/${runId}/token-usage`).then(r => r.json()),

  getRenderStatus: (runId: string): Promise<{ run_id: string; status?: string; current?: number; total?: number; pct?: number; label?: string }> =>
    fetch(`${BASE}/content/${runId}/render-status`).then(r => r.json()),

  getCaption: (runId: string, angleIndex: number): Promise<{
    caption: string; hashtags: string[];
    char_count: number; char_limit: number;
    hashtag_count: number; hashtag_limit: number;
    angle_statement: string;
  }> =>
    fetch(`${BASE}/content/${runId}/caption/${angleIndex}`).then(r => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
    }),

  updateCaption: (runId: string, angleIndex: number, caption: string, hashtags: string[]): Promise<{ saved: boolean; char_count: number; hashtag_count: number }> =>
    fetch(`${BASE}/content/${runId}/caption/${angleIndex}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption, hashtags }),
    }).then(r => r.json()),

  publishToBlogger: (body: {
    title: string;
    html_content: string;
    labels?: string[];
    is_draft?: boolean;
  }): Promise<{ post_id: string; url: string; title: string; status: string; published: string }> =>
    fetch(`${BASE}/publishing/blogger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async r => {
      if (!r.ok) {
        const err = await r.json().catch(() => ({ detail: r.statusText }));
        throw new Error(err.detail ?? r.statusText);
      }
      return r.json();
    }),

  getBloggerStatus: (): Promise<{
    configured: boolean;
    token_valid?: boolean;
    message?: string;
    blog?: { blog_id: string; name: string; url: string; posts: number };
  }> =>
    fetch(`${BASE}/publishing/blogger/status`).then(r => r.json()),
};
