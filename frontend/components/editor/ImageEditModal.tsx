"use client";
import { useState, useCallback } from "react";
import { Search, Upload, Link, X, Check, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { PexelsPhoto, DDGSImage } from "@/lib/api";

type Tab = "search" | "upload" | "url";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  runId: string;
  angleIndex: number;
  slideNumber: number;
  onSwapped: () => void;
}

export function ImageEditModal({ isOpen, onClose, runId, angleIndex, slideNumber, onSwapped }: Props) {
  const [tab, setTab] = useState<Tab>("search");

  // Search tab state
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"pexels" | "ddgs">("pexels");
  const [results, setResults] = useState<(PexelsPhoto | DDGSImage)[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [stagedIndex, setStagedIndex] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  // Upload tab state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // URL tab state
  const [urlInput, setUrlInput] = useState("");
  const [urlPreviewOk, setUrlPreviewOk] = useState<boolean | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchLoading(true);
    setResults([]);
    setStagedIndex(null);
    try {
      const res = await api.searchImages({ query, source, max_results: 12 });
      setResults(source === "pexels" ? res.pexels_photos ?? [] : res.ddgs_images ?? []);
    } catch {}
    finally { setSearchLoading(false); }
  }

  async function handleApplySearch() {
    if (stagedIndex === null) return;
    setApplying(true);
    try {
      await api.swapSlideImage(runId, angleIndex, slideNumber, query, source);
      onSwapped();
      onClose();
    } catch {}
    finally { setApplying(false); }
  }

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted[0]) return;
    setUploadLoading(true);
    setUploadError(null);
    try {
      await api.uploadSlideImage(runId, angleIndex, slideNumber, accepted[0]);
      onSwapped();
      onClose();
    } catch (e: any) {
      setUploadError(e.message ?? "Upload failed");
    } finally {
      setUploadLoading(false);
    }
  }, [runId, angleIndex, slideNumber, onSwapped, onClose]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  async function handleUrlApply() {
    if (!urlInput.trim() || urlPreviewOk === false) return;
    setUrlLoading(true);
    setUrlError(null);
    try {
      await api.swapSlideImageUrl(runId, angleIndex, slideNumber, urlInput.trim());
      onSwapped();
      onClose();
    } catch (e: any) {
      setUrlError(e.message ?? "Failed to use URL");
    } finally {
      setUrlLoading(false);
    }
  }

  const getSrc = (img: PexelsPhoto | DDGSImage) =>
    "src" in img ? (img.src?.large2x || img.src?.large || "") : (img as any).image;

  const TabBtn = ({ id, icon: Icon, label }: { id: Tab; icon: any; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        tab === id
          ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
      }`}
    >
      <Icon size={11} />{label}
    </button>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative z-10 w-[600px] max-h-[80vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon size={15} className="text-violet-400" />
            <p className="text-sm font-bold text-zinc-200">Change Image</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-zinc-800/40 shrink-0">
          <TabBtn id="search" icon={Search} label="Search" />
          <TabBtn id="upload" icon={Upload} label="Upload" />
          <TabBtn id="url" icon={Link} label="URL" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">

          {/* ── SEARCH TAB ── */}
          {tab === "search" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex gap-0.5 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800 shrink-0">
                  {(["pexels", "ddgs"] as const).map(s => (
                    <button key={s} onClick={() => setSource(s)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${source === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                      {s === "pexels" ? "Pexels" : "Web"}
                    </button>
                  ))}
                </div>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Search for an image…"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !query.trim()}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 disabled:opacity-40 transition-all shrink-0"
                >
                  {searchLoading ? <Loader2 size={13} className="animate-spin" /> : "Search"}
                </button>
              </div>

              {results.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {results.map((img, i) => {
                    const src = getSrc(img);
                    const staged = stagedIndex === i;
                    return (
                      <button
                        key={i}
                        onClick={() => setStagedIndex(staged ? null : i)}
                        className={`relative rounded-xl overflow-hidden aspect-square bg-zinc-900 border-2 transition-all group ${
                          staged ? "border-violet-500 shadow-lg shadow-violet-500/20" : "border-transparent hover:border-zinc-600"
                        }`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        {staged && (
                          <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                              <Check size={13} className="text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {results.length === 0 && !searchLoading && query && (
                <p className="text-center text-zinc-600 text-sm py-8">No results. Try a different query.</p>
              )}
            </div>
          )}

          {/* ── UPLOAD TAB ── */}
          {tab === "upload" && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive ? "border-violet-500 bg-violet-500/5" : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <input {...getInputProps()} />
                {uploadLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-violet-400 animate-spin" />
                    <p className="text-sm text-zinc-400">Uploading…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={32} className="text-zinc-600" />
                    <div>
                      <p className="text-sm font-semibold text-zinc-300">
                        {isDragActive ? "Drop image here" : "Drag an image here"}
                      </p>
                      <p className="text-xs text-zinc-600 mt-1">or click to browse · JPG, PNG, WEBP · max 10MB</p>
                    </div>
                  </div>
                )}
              </div>
              {uploadError && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle size={13} /> {uploadError}
                </div>
              )}
            </div>
          )}

          {/* ── URL TAB ── */}
          {tab === "url" && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">
                  Paste a direct image URL
                </label>
                <input
                  value={urlInput}
                  onChange={e => { setUrlInput(e.target.value); setUrlPreviewOk(null); setUrlError(null); }}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              {urlInput.trim() && (
                <div className="rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-square max-h-48">
                  <img
                    src={urlInput.trim()}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onLoad={() => setUrlPreviewOk(true)}
                    onError={() => setUrlPreviewOk(false)}
                  />
                </div>
              )}

              {urlPreviewOk === false && (
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertCircle size={13} /> Can't load image from this URL
                </div>
              )}
              {urlError && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle size={13} /> {urlError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — apply button */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-3 border-t border-zinc-800/50 bg-zinc-950/80">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-all">
            Cancel
          </button>

          {tab === "search" && (
            <button
              onClick={handleApplySearch}
              disabled={stagedIndex === null || applying}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all"
            >
              {applying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Apply Image
            </button>
          )}

          {tab === "url" && (
            <button
              onClick={handleUrlApply}
              disabled={!urlInput.trim() || urlPreviewOk === false || urlLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all"
            >
              {urlLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Use This Image
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
