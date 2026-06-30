import { post, postMultipart, fetchWithTimeout, BASE } from "./client";
import type { SlideData, SlideEditRequest, SlideEditResponse } from "./types";

export const editor = {
  getSlides: (runId: string, angleIndex: number): Promise<{ slides: SlideData[] }> =>
    fetch(`${BASE}/content/${runId}/slides/${angleIndex}`).then(r => r.json()),

  editSlide: (runId: string, angleIndex: number, slideNumber: number, body: SlideEditRequest): Promise<SlideEditResponse> =>
    post(`/content/${runId}/slides/${angleIndex}/${slideNumber}/edit`, body),

  aiRewriteSlide: (runId: string, angleIndex: number, slideNumber: number, feedback: string) =>
    post<{ slide: SlideData; message: string }>(`/content/${runId}/slides/${angleIndex}/${slideNumber}/ai-rewrite`, { feedback }),

  swapSlideImage: (runId: string, angleIndex: number, slideNumber: number, query: string, source: string): Promise<{ png_url: string }> =>
    post(`/content/${runId}/slides/${angleIndex}/${slideNumber}/swap-image`, { query, source }),

  swapSlideImageUrl: (runId: string, angleIndex: number, slideNumber: number, url: string): Promise<{ png_url: string }> =>
    post(`/content/${runId}/slides/${angleIndex}/${slideNumber}/swap-image-url`, { url }),

  newSlide: (runId: string, angleIndex: number, type: string, theme: string) =>
    post<{ slide: SlideData }>(`/content/${runId}/slides/${angleIndex}/new`, { type, theme }),

  uploadSlideImage: (runId: string, angleIndex: number, slideNumber: number, file: File): Promise<{ png_url: string }> =>
    postMultipart(`/content/${runId}/slides/${angleIndex}/${slideNumber}/upload-image`, file),

  saveCanvas: (runId: string, ai: number, sn: number, fabricJson: object): Promise<{ saved: boolean }> =>
    fetchWithTimeout(`${BASE}/content/${runId}/slides/${ai}/${sn}/canvas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fabric_json: fabricJson }),
    }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); }),

  getCanvas: (runId: string, ai: number, sn: number): Promise<{ canvas_json: object | null; slide: SlideData | null }> =>
    fetch(`${BASE}/content/${runId}/slides/${ai}/${sn}/canvas`).then(r => r.json()),

  reorderSlides: (runId: string, angleIndex: number, slideNumbers: number[]): Promise<{ reordered: boolean; slide_count: number }> =>
    fetch(`${BASE}/content/${runId}/slides/${angleIndex}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slide_numbers: slideNumbers }),
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),

  deleteSlide: (runId: string, angleIndex: number, slideNumber: number): Promise<{ deleted: boolean; remaining: number }> =>
    fetch(`${BASE}/content/${runId}/slides/${angleIndex}/${slideNumber}`, { method: "DELETE" })
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),

  bulkStyleSlides: (
    runId: string,
    angleIndex: number,
    slideNumbers: number[],
    slideOverrides: Record<string, string>,
    canvasTemplate?: string,
  ): Promise<{ updated: number; skipped: number }> =>
    fetch(`${BASE}/content/${runId}/slides/${angleIndex}/bulk-style`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slide_numbers: slideNumbers, slide_overrides: slideOverrides, canvas_template: canvasTemplate }),
    }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
};
