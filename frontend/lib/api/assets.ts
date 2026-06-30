import { post, postMultipart, fetchWithTimeout, BASE } from "./client";
import type { ImageSearchBody, ImageSearchResponse, ImageDownloadBody, ImageDownloadResponse, ImageLibraryResponse, ImageLibraryItem } from "./types";

export const assets = {
  searchImages: (body: ImageSearchBody) =>
    post<ImageSearchResponse>("/tools/images", body),

  fetchImageTags: (query: string) =>
    post<{ tags: string[] }>("/tools/images/tags", { query }),

  downloadImages: (body: ImageDownloadBody) =>
    post<ImageDownloadResponse>("/tools/images/download", body),

  getImageLibrary: (runId: string): Promise<ImageLibraryResponse> =>
    fetchWithTimeout(`${BASE}/content/assets/library?run_id=${encodeURIComponent(runId)}`).then(r => r.json()),

  uploadToLibrary: (file: File): Promise<ImageLibraryItem> =>
    postMultipart(`/content/assets/upload`, file),

  deleteImage: async (path: string): Promise<{ deleted: boolean }> => {
    const r = await fetchWithTimeout(`${BASE}/content/assets/image`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};
