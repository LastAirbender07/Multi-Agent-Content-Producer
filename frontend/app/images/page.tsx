"use client";
import { ImageIcon, Search, Loader2, AlertCircle, Grid, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useImageSearch } from "@/hooks/useImageSearch";
import { PexelsCard, DDGSCard } from "@/components/images/ImageCard";
import { ImageTagChips } from "@/components/images/ImageTagChips";
import { SelectionActionBar } from "@/components/images/SelectionActionBar";

export default function ImagesPage() {
  const {
    query, setQuery, source, setSource, maxResults, setMaxResults,
    loading, imageTags, result, error,
    selected, downloadStatus, downloadSaveDir, downloadError,
    handleSearch, toggleSelect, selectAll, clearSelection, handleDownload,
  } = useImageSearch();

  const pexelsPhotos = result?.pexels_photos ?? [];
  const ddgsImages = result?.ddgs_images ?? [];
  const totalImages = source === "pexels" ? pexelsPhotos.length : ddgsImages.length;
  const inSelectMode = selected.size > 0;

  return (
    <div className="min-h-screen bg-black p-12 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mb-4 shadow-xl shadow-violet-600/20">
              <ImageIcon size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Visual Intelligence</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Sourcing premium assets via AI refinement.</p>
          </motion.div>

          <div className="flex flex-wrap gap-4">
            <div className="p-1 bg-zinc-950 rounded-2xl border border-zinc-900 flex">
              {(["pexels", "ddgs"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    source === s ? "bg-zinc-800 text-white shadow-lg shadow-black/50" : "text-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {s === "pexels" ? "Pexels" : "DuckDuckGo"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 rounded-2xl px-4">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Limit</span>
              <input
                type="number"
                min={1}
                max={50}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-8 bg-transparent text-sm font-black text-white text-center focus:outline-none"
              />
            </div>
          </div>
        </header>

        {/* Search bar */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-linear-to-r from-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative flex gap-4 p-2 bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800 rounded-[2.5rem] shadow-2xl">
            <div className="flex-1 flex items-center px-6">
              <Search size={20} className="text-zinc-600 group-focus-within:text-violet-500 transition-colors" />
              <input
                type="text"
                placeholder="Describe the visual concept you're looking for…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent px-4 py-4 text-sm font-medium text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-10 py-4 rounded-4xl bg-violet-600 hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 active:scale-95 shrink-0"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Fetch Assets"}
            </button>
          </div>
        </div>

        {/* Tag chips */}
        <ImageTagChips tags={imageTags} source={source} />

        {/* Results */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-red-500/5 border border-red-500/20 rounded-4xl flex items-center gap-4 text-red-500">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}

          {!loading && !result && !error && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-950 border border-zinc-900 flex items-center justify-center mb-8 shadow-2xl">
                <Grid size={40} className="text-zinc-800" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-4">No Assets Selected</h2>
              <p className="text-zinc-500 text-sm font-medium max-w-sm leading-relaxed">
                Describe a concept to find high-quality, royalty-free images for your production.
              </p>
            </motion.div>
          )}

          {loading && (
            <motion.div key="loading" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ gridAutoRows: "200px" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-3xl bg-zinc-900/50 border border-zinc-800 animate-pulse"
                  style={{ gridRowEnd: i % 5 === 0 ? "span 2" : "span 1" }} />
              ))}
            </motion.div>
          )}

          {result && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">
                  Discovery: {result.total_results} Matches
                </h3>
                <div className="flex-1 h-px bg-zinc-900" />
                {totalImages > 0 && (
                  <button
                    onClick={inSelectMode ? clearSelection : selectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest transition-all"
                  >
                    <CheckSquare size={12} />
                    {inSelectMode ? "Clear" : "Select All"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ gridAutoRows: "200px" }}>
                {source === "pexels"
                  ? pexelsPhotos.map((photo, i) => (
                      <PexelsCard key={photo.id} photo={photo} index={i}
                        isSelected={selected.has(i)} inSelectMode={inSelectMode} onToggle={toggleSelect} />
                    ))
                  : ddgsImages.map((img, i) => (
                      <DDGSCard key={i} img={img} index={i}
                        isSelected={selected.has(i)} inSelectMode={inSelectMode} onToggle={toggleSelect} />
                    ))
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SelectionActionBar
        selectedCount={selected.size}
        downloadStatus={downloadStatus}
        downloadSaveDir={downloadSaveDir}
        downloadError={downloadError}
        onDownload={handleDownload}
        onClear={clearSelection}
      />
    </div>
  );
}
