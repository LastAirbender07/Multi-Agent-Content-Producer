"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Upload, ChevronDown, ChevronRight, X, Trash2, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ImageLibraryItem, type PexelsPhoto, type DDGSImage } from "@/lib/api";

const SEARCH_CACHE_KEY = "imgSearchCache";

interface ImagesPanelProps {
  runId: string;
  onImageApply: (url: string) => void;
}

interface SearchCache {
  query: string;
  source: "pexels" | "ddgs";
  results: (PexelsPhoto | DDGSImage)[];
}

export function ImagesPanel({ runId, onImageApply }: ImagesPanelProps) {
  const [openSection, setOpenSection] = useState<"search" | "run" | "uploads">("run");

  // Search state
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"pexels" | "ddgs">("pexels");
  const [searchResults, setSearchResults] = useState<(PexelsPhoto | DDGSImage)[]>([]);
  const [searching, setSearching] = useState(false);

  // Library state
  const [library, setLibrary] = useState<{ run_images: Record<string, ImageLibraryItem[]>; user_uploads: ImageLibraryItem[] } | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [expandedAngles, setExpandedAngles] = useState<Set<string>>(new Set());

  // Delete state: path → "confirming" | "deleting"
  const [deleteState, setDeleteState] = useState<Record<string, "confirming" | "deleting">>({});
  const [ghostPaths, setGhostPaths] = useState<Set<string>>(new Set());

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ item: ImageLibraryItem; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load library
  useEffect(() => {
    if (!runId) return;
    setLibraryLoading(true);
    api.getImageLibrary(runId)
      .then(lib => {
        setLibrary(lib);
        // Auto-expand first angle
        const keys = Object.keys(lib.run_images);
        if (keys.length > 0) setExpandedAngles(new Set([keys[0]]));
      })
      .catch(() => {})
      .finally(() => setLibraryLoading(false));
  }, [runId]);

  // Restore search cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(SEARCH_CACHE_KEY);
      if (cached) {
        const c: SearchCache = JSON.parse(cached);
        setQuery(c.query);
        setSource(c.source);
        setSearchResults(c.results);
      }
    } catch {}
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    if (contextMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await api.searchImages({ query, source, max_results: 12 });
      const results = source === "pexels" ? (res.pexels_photos ?? []) : (res.ddgs_images ?? []);
      setSearchResults(results);
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify({ query, source, results }));
    } catch {}
    finally { setSearching(false); }
  }

  function getSearchSrc(img: PexelsPhoto | DDGSImage): string {
    if ("src" in img) return img.src?.large2x || img.src?.large || "";
    return (img as DDGSImage).image || "";
  }

  function handleRightClick(e: React.MouseEvent, item: ImageLibraryItem) {
    e.preventDefault();
    setContextMenu({ item, x: e.clientX, y: e.clientY });
  }

  function startDelete(item: ImageLibraryItem) {
    setContextMenu(null);
    setDeleteState(s => ({ ...s, [item.path]: "confirming" }));
  }

  async function confirmDelete(item: ImageLibraryItem) {
    setDeleteState(s => ({ ...s, [item.path]: "deleting" }));
    try {
      await api.deleteImage(item.path);
      // Ghost then remove
      setGhostPaths(p => new Set(p).add(item.path));
      setTimeout(() => {
        setLibrary(prev => {
          if (!prev) return prev;
          const newRunImages = Object.fromEntries(
            Object.entries(prev.run_images).map(([k, items]) => [k, items.filter(i => i.path !== item.path)])
          );
          return {
            run_images: newRunImages,
            user_uploads: prev.user_uploads.filter(i => i.path !== item.path),
          };
        });
        setGhostPaths(p => { const n = new Set(p); n.delete(item.path); return n; });
        setDeleteState(s => { const n = { ...s }; delete n[item.path]; return n; });
      }, 1500);
    } catch {
      setDeleteState(s => { const n = { ...s }; delete n[item.path]; return n; });
    }
  }

  function cancelDelete(path: string) {
    setDeleteState(s => { const n = { ...s }; delete n[path]; return n; });
  }

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted[0]) return;
    setUploading(true);
    setUploadError(null);
    try {
      const item = await api.uploadToLibrary(accepted[0]);
      setLibrary(prev => prev
        ? { ...prev, user_uploads: [item, ...prev.user_uploads] }
        : { run_images: {}, user_uploads: [item] }
      );
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  function ImageThumb({ item }: { item: ImageLibraryItem }) {
    const isGhost = ghostPaths.has(item.path);
    const dState = deleteState[item.path];
    return (
      <div
        className={`relative group rounded-lg overflow-hidden bg-zinc-900 aspect-square transition-all duration-300 ${isGhost ? "opacity-30" : ""}`}
        draggable
        onDragStart={e => e.dataTransfer.setData("imageUrl", `http://localhost:8000${item.url}`)}
        onContextMenu={e => handleRightClick(e, item)}
      >
        <img
          src={`http://localhost:8000${item.url}`}
          alt={item.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Hover overlay */}
        {!dState && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <button
              onClick={() => onImageApply(`http://localhost:8000${item.url}`)}
              className="px-2 py-1 rounded bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-500 transition-all"
            >
              Apply
            </button>
            <button
              onClick={() => startDelete(item)}
              className="p-1 rounded bg-red-600/80 text-white hover:bg-red-500 transition-all"
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
        {/* Delete confirm chip */}
        {dState === "confirming" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 p-1">
            <p className="text-[9px] text-white text-center font-semibold">Delete?</p>
            <div className="flex gap-1">
              <button onClick={() => confirmDelete(item)} className="px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">Yes</button>
              <button onClick={() => cancelDelete(item.path)} className="px-2 py-0.5 rounded bg-zinc-700 text-white text-[9px]">No</button>
            </div>
          </div>
        )}
        {dState === "deleting" && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <Loader2 size={14} className="text-zinc-400 animate-spin" />
          </div>
        )}
        {isGhost && (
          <div className="absolute inset-0 flex items-center justify-center">
            <X size={16} className="text-red-400" />
          </div>
        )}
      </div>
    );
  }

  const SectionHeader = ({ id, label, count }: { id: typeof openSection; label: string; count?: number }) => (
    <button
      onClick={() => setOpenSection(s => s === id ? "search" : id)}
      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/30 transition-colors"
    >
      {openSection === id
        ? <ChevronDown size={11} className="text-zinc-500 shrink-0" />
        : <ChevronRight size={11} className="text-zinc-600 shrink-0" />
      }
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      {count !== undefined && (
        <span className="ml-auto text-[9px] text-zinc-600">{count}</span>
      )}
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden text-zinc-300">
      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800/50">
        <SectionHeader id="search" label="Search" />
        <AnimatePresence initial={false}>
          {openSection === "search" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-2">
                {/* Source toggle */}
                <div className="flex gap-0.5 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  {(["pexels", "ddgs"] as const).map(s => (
                    <button key={s} onClick={() => setSource(s)}
                      className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${source === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                      {s === "pexels" ? "Pexels" : "Web"}
                    </button>
                  ))}
                </div>
                {/* Query input */}
                <div className="flex gap-1.5">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Search images…"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching || !query.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 transition-all"
                  >
                    {searching ? <Loader2 size={11} className="animate-spin text-zinc-400" /> : <Search size={11} className="text-zinc-400" />}
                  </button>
                </div>
                {/* Results grid */}
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {searchResults.map((img, i) => {
                      const src = getSearchSrc(img);
                      return (
                        <button
                          key={i}
                          draggable
                          onDragStart={e => e.dataTransfer.setData("imageUrl", src)}
                          onClick={() => onImageApply(src)}
                          className="rounded-lg overflow-hidden aspect-square bg-zinc-900 hover:ring-2 hover:ring-violet-500 transition-all"
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Run Images ─────────────────────────────────────────── */}
      <div className="border-b border-zinc-800/50">
        <SectionHeader
          id="run"
          label="Run Images"
          count={library ? Object.values(library.run_images).flat().length : undefined}
        />
        <AnimatePresence initial={false}>
          {openSection === "run" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="overflow-y-auto max-h-80 custom-scrollbar">
                {libraryLoading && (
                  <div className="flex items-center gap-2 px-3 py-3 text-zinc-600">
                    <Loader2 size={11} className="animate-spin" />
                    <span className="text-[10px]">Loading…</span>
                  </div>
                )}
                {!libraryLoading && library && Object.entries(library.run_images).map(([angleKey, items]) => {
                  const expanded = expandedAngles.has(angleKey);
                  const angleNum = parseInt(angleKey.replace("angle_", "")) + 1;
                  return (
                    <div key={angleKey}>
                      <button
                        onClick={() => {
                          const next = new Set(expandedAngles);
                          expanded ? next.delete(angleKey) : next.add(angleKey);
                          setExpandedAngles(next);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800/20 transition-colors"
                      >
                        <ChevronRight size={10} className={`text-zinc-600 transition-transform ${expanded ? "rotate-90" : ""}`} />
                        <span className="text-[10px] text-zinc-500 font-semibold">Angle {angleNum}</span>
                        <span className="ml-auto text-[9px] text-zinc-700">{items.length}</span>
                      </button>
                      {expanded && (
                        <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
                          {items.map(item => <ImageThumb key={item.path} item={item} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!libraryLoading && library && Object.keys(library.run_images).length === 0 && (
                  <p className="px-3 py-4 text-[10px] text-zinc-700 text-center">No images downloaded yet for this run.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── My Uploads ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <SectionHeader
          id="uploads"
          label="My Uploads"
          count={library?.user_uploads.length}
        />
        <AnimatePresence initial={false}>
          {openSection === "uploads" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden flex-1 flex flex-col"
            >
              <div className="px-3 pb-2 space-y-2">
                <div
                  {...getRootProps()}
                  className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${isDragActive ? "border-violet-500 bg-violet-500/5" : "border-zinc-700 hover:border-zinc-500"}`}
                >
                  <input {...getInputProps()} />
                  {uploading
                    ? <Loader2 size={18} className="mx-auto text-violet-400 animate-spin" />
                    : <Upload size={18} className="mx-auto text-zinc-600 mb-1" />
                  }
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {isDragActive ? "Drop here" : "Drag or click to upload"}
                  </p>
                  <p className="text-[9px] text-zinc-700">JPG, PNG, WEBP · max 10MB</p>
                </div>
                {uploadError && (
                  <div className="flex items-center gap-1.5 text-red-400 text-[10px]">
                    <AlertCircle size={11} />{uploadError}
                  </div>
                )}
                {library && library.user_uploads.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {library.user_uploads.map(item => <ImageThumb key={item.path} item={item} />)}
                  </div>
                )}
                {library && library.user_uploads.length === 0 && (
                  <p className="text-[10px] text-zinc-700 text-center py-2">No uploads yet.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => { onImageApply(`http://localhost:8000${contextMenu.item.url}`); setContextMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ImageIcon size={11} /> Apply to slide
          </button>
          <button
            onClick={() => startDelete(contextMenu.item)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <Trash2 size={11} /> Delete from disk
          </button>
        </div>
      )}
    </div>
  );
}
