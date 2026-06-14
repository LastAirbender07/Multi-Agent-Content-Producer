import { useState } from "react";
import { api, ImageSearchResponse } from "@/lib/api";

type DownloadStatus = "idle" | "saving" | "done" | "error";

export function useImageSearch() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"pexels" | "ddgs">("pexels");
  const [maxResults, setMaxResults] = useState(15);
  const [loading, setLoading] = useState(false);
  const [imageTags, setImageTags] = useState<string[]>([]);
  const [result, setResult] = useState<ImageSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
  const [downloadSaveDir, setDownloadSaveDir] = useState<string>("");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setError(null);
    setResult(null);
    setImageTags([]);
    setSelected(new Set());
    setDownloadStatus("idle");
    setDownloadError(null);

    api.fetchImageTags(query).then((r) => setImageTags(r.tags)).catch(() => {});

    setLoading(true);
    try {
      const searchBody =
        source === "ddgs"
          ? { query, source: "ddgs" as const, max_results: maxResults, queries: [query, `${query} photo`, `${query} ${new Date().getFullYear()}`] }
          : { query, source: "pexels" as const, max_results: maxResults };
      const res = await api.searchImages(searchBody);
      if (!res.success && res.error) setError(res.error);
      else setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
    setDownloadStatus("idle");
    setDownloadError(null);
  }

  function selectAll() {
    const count = source === "pexels" ? (result?.pexels_photos ?? []).length : (result?.ddgs_images ?? []).length;
    setSelected(new Set(Array.from({ length: count }, (_, i) => i)));
    setDownloadStatus("idle");
  }

  function clearSelection() {
    setSelected(new Set());
    setDownloadStatus("idle");
    setDownloadError(null);
  }

  async function handleDownload() {
    if (!result || selected.size === 0) return;
    setDownloadStatus("saving");
    setDownloadError(null);
    const urls: string[] = [];
    const pexelsPhotos = result.pexels_photos ?? [];
    const ddgsImages = result.ddgs_images ?? [];
    selected.forEach((i) => {
      if (source === "pexels") {
        const photo = pexelsPhotos[i];
        if (photo) urls.push(photo.src.large2x || photo.src.large || photo.src.medium || photo.url);
      } else {
        const img = ddgsImages[i];
        if (img) urls.push(img.image);
      }
    });
    try {
      const res = await api.downloadImages({ urls });
      if (res.errors.length > 0 && res.saved_paths.length === 0) {
        setDownloadError(res.errors[0]?.error ?? "Download failed");
        setDownloadStatus("error");
      } else {
        setDownloadSaveDir(res.save_dir);
        setDownloadStatus("done");
      }
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : "Download failed");
      setDownloadStatus("error");
    }
  }

  return {
    query, setQuery, source, setSource, maxResults, setMaxResults,
    loading, imageTags, result, error,
    selected, downloadStatus, downloadSaveDir, downloadError,
    handleSearch, toggleSelect, selectAll, clearSelection, handleDownload,
  };
}
