"use client";
import { useState, useRef } from "react";
import { ChevronRight, Image as ImageIcon, FileText, Folder, Loader2, Plus, X, Check, GripVertical, Trash2, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RunSummary, RunManifest } from "@/lib/api";
import { api } from "@/lib/api";
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
  onStarRun?: (runId: string, currentStarred: boolean) => void;
}

interface SlideListProps {
  runId: string;
  angleIndex: number;
  slideCount: number;
  isActiveSlide: (runId: string, angle: number, slide: number) => boolean;
  onSelectSlide: (runId: string, angle: number, slide: number) => void;
  onReordered: () => void;
}

function DraggableSlideList({
  runId, angleIndex, slideCount,
  isActiveSlide, onSelectSlide, onReordered,
}: SlideListProps) {
  // Local slide order (1-based numbers)
  const [order, setOrder] = useState<number[]>(() => Array.from({ length: slideCount }, (_, i) => i + 1));
  const [dragging, setDragging]     = useState<number | null>(null);  // value being dragged
  const [dropTarget, setDropTarget] = useState<number | null>(null);  // index to drop before
  const [deleting, setDeleting]     = useState<number | null>(null);  // slide number confirming delete
  const [busy, setBusy]             = useState(false);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent, slideNum: number) => {
    setDragging(slideNum);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(idx);
  };

  const handleDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (dragging === null || busy) return;

    const from = order.indexOf(dragging);
    if (from === targetIdx || from === targetIdx - 1) {
      setDragging(null); setDropTarget(null); return;
    }

    const newOrder = [...order];
    newOrder.splice(from, 1);
    const insertAt = from < targetIdx ? targetIdx - 1 : targetIdx;
    newOrder.splice(insertAt, 0, dragging);

    setOrder(newOrder);
    setDragging(null);
    setDropTarget(null);

    setBusy(true);
    try {
      await api.reorderSlides(runId, angleIndex, newOrder);
      onReordered();
    } catch {
      setOrder(order); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  const handleDragEnd = () => { setDragging(null); setDropTarget(null); };

  const handleDelete = async (slideNum: number) => {
    setBusy(true);
    try {
      await api.deleteSlide(runId, angleIndex, slideNum);
      setOrder(prev => {
        const next = prev.filter(n => n !== slideNum);
        // Renumber: backend renumbers 1..N, so we rebuild sequentially
        return next.map((_, i) => i + 1);
      });
      setDeleting(null);
      onReordered();
    } catch {
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={dragNode} className={busy ? "opacity-50 pointer-events-none" : ""}>
      {order.map((slideNum, idx) => {
        const active = isActiveSlide(runId, angleIndex, slideNum);
        const isDropTarget = dropTarget === idx;
        return (
          <div key={slideNum}>
            {/* Drop indicator line above this item */}
            {isDropTarget && (
              <div className="mx-3 h-0.5 rounded-full bg-violet-500 my-0.5" />
            )}

            <div
              draggable
              onDragStart={e => handleDragStart(e, slideNum)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`group flex items-center gap-1 px-2 py-1 transition-all hover:bg-zinc-800/30 ${
                dragging === slideNum ? "opacity-40" : ""
              } ${active ? "border-l-2 border-violet-500 bg-violet-500/5" : "border-l-2 border-transparent"}`}
            >
              {/* Drag handle */}
              <GripVertical
                size={10}
                className="text-zinc-700 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />

              {/* Slide button */}
              <button
                onClick={() => !busy && onSelectSlide(runId, angleIndex, slideNum)}
                className={`flex-1 flex items-center gap-1.5 text-left ${active ? "text-violet-300" : "text-zinc-500"}`}
              >
                <ImageIcon size={9} className="shrink-0" />
                <span className="text-[10px] font-medium">Slide {slideNum}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
              </button>

              {/* Delete / confirm */}
              {deleting === slideNum ? (
                <div className="flex items-center gap-1 ml-1 shrink-0">
                  <button
                    onClick={() => handleDelete(slideNum)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600/80 text-white hover:bg-red-500 transition-all"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleting(null)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleting(slideNum)}
                  className="ml-1 shrink-0 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Drop target at end of list */}
      {dropTarget === order.length && (
        <div className="mx-3 h-0.5 rounded-full bg-violet-500 my-0.5" />
      )}
      <div
        className="h-2"
        onDragOver={e => handleDragOver(e, order.length)}
        onDrop={e => handleDrop(e, order.length)}
      />
    </div>
  );
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
  onStarRun,
}: RunRowProps) {
  const runExpanded = expandedRuns.has(run.run_id);
  const manifest = manifests[run.run_id];
  const isSelected = run.run_id != null;

  return (
    <div>
      {/* Run row */}
      <div className={`group flex items-center hover:bg-zinc-800/40 transition-colors ${isSelected ? "bg-zinc-800/20" : ""}`}>
        <button
          onClick={() => toggleRun(run.run_id)}
          className="flex-1 flex items-center gap-2 px-3 py-2 text-left min-w-0"
        >
          <ChevronRight size={11} className={`shrink-0 text-zinc-600 transition-transform duration-150 ${runExpanded ? "rotate-90" : ""}`} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-zinc-300 truncate">{run.topic}</p>
            <p className="text-[10px] text-zinc-600">{formatAge(run.created_at)}</p>
          </div>
        </button>
        {onStarRun && (
          <button
            onClick={e => { e.stopPropagation(); onStarRun(run.run_id, !!run.starred); }}
            className={`shrink-0 px-2 py-2 transition-all ${run.starred ? "text-amber-400" : "text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-amber-400"}`}
            title={run.starred ? "Unstar" : "Star this run"}
          >
            <Star size={11} className={run.starred ? "fill-amber-400" : ""} />
          </button>
        )}
      </div>

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

                    {/* Slides — draggable when angle expanded */}
                    <AnimatePresence initial={false}>
                      {angleExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="overflow-hidden pl-4"
                        >
                          <DraggableSlideList
                            runId={run.run_id}
                            angleIndex={angle.index}
                            slideCount={angle.slide_count}
                            isActiveSlide={isActiveSlide}
                            onSelectSlide={onSelectSlide}
                            onReordered={() => toggleAngle(run.run_id, angle.index)}
                          />

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
