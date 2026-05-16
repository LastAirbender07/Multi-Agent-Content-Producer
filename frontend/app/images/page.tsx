"use client";
import { useState } from "react";
import {
  ImageIcon,
  Search,
  Loader2,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Camera,
  Image as ImageIconSimple,
  Grid
} from "lucide-react";
import {
  api,
  ProcessedQuery,
  ImageSearchResponse,
  PexelsPhoto,
  DDGSImage,
} from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { PremiumCard } from "@/components/ui/PremiumCard";

export default function ImagesPage() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"pexels" | "ddgs">("pexels");
  const [maxResults, setMaxResults] = useState(15);
  const [refining, setRefining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState<ProcessedQuery | null>(null);
  const [result, setResult] = useState<ImageSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setError(null);
    setResult(null);
    setProcessed(null);

    setRefining(true);
    let pq: ProcessedQuery | null = null;
    try {
      pq = await api.refineQuery(query);
      setProcessed(pq);
    } catch {
      /* non-fatal */
    } finally {
      setRefining(false);
    }

    setLoading(true);
    try {
      const res = await api.searchImages({
        query: pq?.cleaned_topic || query,
        source,
        max_results: maxResults,
      });
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const isLoading = refining || loading;
  const pexelsPhotos: PexelsPhoto[] = result?.pexels_photos ?? [];
  const ddgsImages: DDGSImage[] = result?.ddgs_images ?? [];

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
                    source === s
                      ? "bg-zinc-800 text-white shadow-lg shadow-black/50"
                      : "text-zinc-600 hover:text-zinc-300"
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

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
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
              disabled={isLoading || !query.trim()}
              className="px-10 py-4 rounded-[2rem] bg-violet-600 hover:bg-violet-500 disabled:opacity-20 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-600/20 active:scale-95 shrink-0"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Fetch Assets"}
            </button>
          </div>
        </div>

        {/* Status & Results */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4 text-red-500"
            >
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </motion.div>
          )}

          {refining && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-2">
              <Sparkles size={16} className="text-violet-500 animate-pulse" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">AI Agent: Refining concept for high-relevance matches...</span>
            </motion.div>
          )}

          {processed && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 px-2">
              <div className="px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] font-black text-violet-400 uppercase tracking-widest">
                Refined: {processed.cleaned_topic}
              </div>
              {processed.entities.map(e => (
                <div key={e} className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  {e}
                </div>
              ))}
            </motion.div>
          )}

          {!isLoading && !result && !error && (
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
            <motion.div key="loading" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-[2rem] bg-zinc-900/50 border border-zinc-800 animate-pulse" />
              ))}
            </motion.div>
          )}

          {result && (
            <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex items-center gap-3 px-1">
                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Discovery: {result.total_results} Matches</h3>
                <div className="flex-1 h-px bg-zinc-900" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {source === "pexels" ? (
                  pexelsPhotos.map((photo) => (
                    <motion.div
                      key={photo.id}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="group relative aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 border border-zinc-800/50 shadow-lg"
                    >
                      <img
                        src={photo.src.medium}
                        alt={photo.photographer}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end gap-2 backdrop-blur-[2px]">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{photo.photographer}</p>
                        <a
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[9px] font-black text-violet-400 uppercase tracking-widest hover:text-white transition-colors"
                        >
                          <Camera size={10} />
                          Pexels Assets
                        </a>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  ddgsImages.map((img, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="group relative aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 border border-zinc-800/50 shadow-lg"
                    >
                      <img
                        src={img.image}
                        alt={img.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end gap-2 backdrop-blur-[2px]">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{img.title}</p>
                        <a
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[9px] font-black text-violet-400 uppercase tracking-widest hover:text-white transition-colors"
                        >
                          <ExternalLink size={10} />
                          Web Source
                        </a>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
