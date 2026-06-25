"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Upload, ChevronRight, Trash2, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ASSET_BASE } from "@/lib/api/client";
import { api, type ImageLibraryItem, type PexelsPhoto, type DDGSImage } from "@/lib/api";
import { ImageThumb } from "./panels/ImageThumb";
import { SectionHeader } from "./panels/SectionHeader";
import { useImageLibrary } from "@/hooks/useImageLibrary";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useImageContextMenu } from "@/hooks/useImageContextMenu";

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

  // Library hook
  const { library, libraryLoading, expandedAngles, setExpandedAngles, setLibrary } = useImageLibrary(runId);

  // Delete state: path → "confirming" | "deleting" | "deleted"
  // "deleted" acts as the ghost (fading-out) phase, replacing the old ghostPaths Set.
  const [deleteState, setDeleteState] = useState<Record<string, "confirming" | "deleting" | "deleted">>({});

  // Context menu hook
  const { contextMenu, setContextMenu, contextMenuRef, handleRightClick } = useImageContextMenu();

  // Upload hook
  const { getRootProps, getInputProps, isDragActive, uploading, uploadError } = useImageUpload(
    (item: ImageLibraryItem) => {
      setLibrary(prev => prev
        ? { ...prev, user_uploads: [item, ...prev.user_uploads] }
        : { run_images: {}, user_uploads: [item] }
      );
    }
  );

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

  function startDelete(item: ImageLibraryItem) {
    setContextMenu(null);
    setDeleteState(s => ({ ...s, [item.path]: "confirming" }));
  }

  async function confirmDelete(item: ImageLibraryItem) {
    setDeleteState(s => ({ ...s, [item.path]: "deleting" }));
    try {
      await api.deleteImage(item.path);
      // Mark as "deleted" — ImageThumb renders this as ghost (fading out)
      setDeleteState(s => ({ ...s, [item.path]: "deleted" }));
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
        setDeleteState(s => { const n = { ...s }; delete n[item.path]; return n; });
      }, 1500);
    } catch {
      setDeleteState(s => { const n = { ...s }; delete n[item.path]; return n; });
    }
  }

  function cancelDelete(path: string) {
    setDeleteState(s => { const n = { ...s }; delete n[path]; return n; });
  }

  const thumbProps = {
    deleteState,
    onImageApply,
    onStartDelete: startDelete,
    onConfirmDelete: confirmDelete,
    onCancelDelete: cancelDelete,
    onRightClick: handleRightClick,
  };

  const sectionHeaderProps = {
    openSection,
    onToggle: (id: typeof openSection) => setOpenSection(s => s === id ? "search" : id),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-zinc-300">
      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="border-b border-zinc-800/50">
        <SectionHeader id="search" label="Search" {...sectionHeaderProps} />
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
          {...sectionHeaderProps}
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
                          {items.map(item => <ImageThumb key={item.path} item={item} {...thumbProps} />)}
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
          {...sectionHeaderProps}
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
                    {library.user_uploads.map(item => <ImageThumb key={item.path} item={item} {...thumbProps} />)}
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
            onClick={() => { onImageApply(`${ASSET_BASE}${contextMenu.item.url}`); setContextMenu(null); }}
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
