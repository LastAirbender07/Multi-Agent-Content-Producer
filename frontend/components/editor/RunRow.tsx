"use client";
import { ChevronRight, Image as ImageIcon, FileText, Folder, Loader2, Plus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RunSummary, RunManifest } from "@/lib/api";
import { formatAge } from "@/utils/timeUtils";

const SLIDE_TYPES = ["hook", "content", "stat", "quote", "cta", "engage"] as const;

export interface RunRowProps {
  run: RunSummary;
  manifests: Record<string, RunManifest>;
  expandedRuns: Set<string>;
  expandedAngles: Set<string>;
  toggleRun: (runId: string) => Promise<void>;
  toggleAngle: (runId: string, angleIdx: number) => void;
  isActiveSlide: (runId: string, angle: number, slide: number) => boolean;
  isActiveBlog: (runId: string) => boolean;
  selectedView: "slide" | "blog" | null;
  selectedRunId: string | null;
  selectedAngle: number | null;
  selectedSlide: number | null;
  onSelectSlide: (runId: string, angle: number, slide: number) => void;
  onSelectBlog: (runId: string) => void;
  addSlideTarget: string | null;
  setAddSlideTarget: (target: string | null) => void;
  addSlideType: string;
  setAddSlideType: (type: string) => void;
  addSlideLoading: boolean;
  onAddSlide: (runId: string, angleIndex: number) => void;
}

export function RunRow({
  run,
  manifests,
  expandedRuns,
  expandedAngles,
  toggleRun,
  toggleAngle,
  isActiveSlide,
  isActiveBlog,
  onSelectSlide,
  onSelectBlog,
  addSlideTarget,
  setAddSlideTarget,
  addSlideType,
  setAddSlideType,
  addSlideLoading,
  onAddSlide,
}: RunRowProps) {
  const runExpanded = expandedRuns.has(run.run_id);
  const manifest = manifests[run.run_id];
  const isSelected = run.run_id != null;

  return (
    <div>
      {/* Run row */}
      <button
        onClick={() => toggleRun(run.run_id)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-zinc-800/40 ${isSelected ? "bg-zinc-800/20" : ""}`}
      >
        <ChevronRight size={11} className={`shrink-0 text-zinc-600 transition-transform duration-150 ${runExpanded ? "rotate-90" : ""}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-zinc-300 truncate">{run.topic}</p>
          <p className="text-[10px] text-zinc-600">{formatAge(run.created_at)}</p>
        </div>
      </button>

      {/* Angles + slides */}
      <AnimatePresence initial={false}>
        {runExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-4">
              {!manifest && (
                <div className="flex items-center gap-2 px-3 py-2 text-zinc-700">
                  <Loader2 size={10} className="animate-spin" />
                  <span className="text-[10px]">Loading…</span>
                </div>
              )}

              {manifest?.angles.map(angle => {
                const angleKey = `${run.run_id}:${angle.index}`;
                const angleExpanded = expandedAngles.has(angleKey);
                return (
                  <div key={angle.index}>
                    {/* Angle row */}
                    <button
                      onClick={() => toggleAngle(run.run_id, angle.index)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-800/30 transition-colors"
                    >
                      <ChevronRight size={10} className={`shrink-0 text-zinc-700 transition-transform duration-150 ${angleExpanded ? "rotate-90" : ""}`} />
                      <Folder size={10} className="text-zinc-600 shrink-0" />
                      <span className="text-[10px] text-zinc-500 font-medium">Angle {angle.index + 1}</span>
                      <span className="text-[9px] text-zinc-700 ml-auto">{angle.slide_count}</span>
                    </button>

                    {/* Slides — only when angle expanded */}
                    <AnimatePresence initial={false}>
                      {angleExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="overflow-hidden pl-4"
                        >
                          {Array.from({ length: angle.slide_count }).map((_, idx) => {
                            const slideNum = idx + 1;
                            const active = isActiveSlide(run.run_id, angle.index, slideNum);
                            return (
                              <button
                                key={slideNum}
                                onClick={() => onSelectSlide(run.run_id, angle.index, slideNum)}
                                className={`w-full flex items-center gap-2 px-3 py-1 text-left transition-all hover:bg-zinc-800/30 ${
                                  active ? "border-l-2 border-violet-500 bg-violet-500/5 text-violet-300" : "border-l-2 border-transparent text-zinc-500"
                                }`}
                              >
                                <ImageIcon size={9} className="shrink-0" />
                                <span className="text-[10px] font-medium">Slide {slideNum}</span>
                                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                              </button>
                            );
                          })}

                          {/* Add slide button + type picker */}
                          {addSlideTarget === `${run.run_id}:${angle.index}` ? (
                            <div className="px-3 py-2 space-y-2">
                              <div className="flex flex-wrap gap-1">
                                {SLIDE_TYPES.map(t => (
                                  <button key={t} onClick={() => setAddSlideType(t)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize transition-all ${addSlideType === t ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => onAddSlide(run.run_id, angle.index)}
                                  disabled={addSlideLoading}
                                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-[10px] font-bold transition-all"
                                >
                                  {addSlideLoading ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                                  Add
                                </button>
                                <button onClick={() => setAddSlideTarget(null)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                                  <X size={11} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddSlideTarget(`${run.run_id}:${angle.index}`); setAddSlideType("content"); }}
                              className="w-full flex items-center gap-1.5 px-3 py-1 text-left text-zinc-700 hover:text-zinc-500 transition-all"
                            >
                              <Plus size={10} />
                              <span className="text-[10px]">Add slide</span>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {manifest?.has_blog && (
                <button
                  onClick={() => onSelectBlog(run.run_id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-all hover:bg-zinc-800/30 ${
                    isActiveBlog(run.run_id)
                      ? "border-l-2 border-violet-500 bg-violet-500/5 text-violet-300"
                      : "border-l-2 border-transparent text-zinc-500"
                  }`}
                >
                  <FileText size={10} className="shrink-0" />
                  <span className="text-[10px] font-medium">blog_post.md</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
