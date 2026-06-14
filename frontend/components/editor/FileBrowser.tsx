"use client";
import { useState, useEffect } from "react";
import { ChevronRight, Image as ImageIcon, FileText, Folder, History, Loader2, ChevronDown, PanelLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { api, RunSummary, RunManifest } from "@/lib/api";

interface FileBrowserProps {
  selectedRunId: string | null;
  selectedAngle: number | null;
  selectedSlide: number | null;
  selectedView: "slide" | "blog" | null;
  onSelectSlide: (runId: string, angle: number, slide: number) => void;
  onSelectBlog: (runId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function FileBrowser({
  selectedRunId, selectedAngle, selectedSlide, selectedView,
  onSelectSlide, onSelectBlog,
  collapsed, onToggleCollapse,
}: FileBrowserProps) {
  const recentRuns = useAppSelector(s => s.history.runs);
  const [mounted, setMounted] = useState(false);
  const [allRuns, setAllRuns] = useState<RunSummary[]>([]);

  // Only render Redux state after hydration to avoid server/client mismatch
  useEffect(() => { setMounted(true); }, []);
  const [allRunsLoading, setAllRunsLoading] = useState(false);
  const [allRunsExpanded, setAllRunsExpanded] = useState(false);
  // Per-run expand state
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  // Per-run per-angle expand state: "runId:angleIdx"
  const [expandedAngles, setExpandedAngles] = useState<Set<string>>(new Set());
  const [manifests, setManifests] = useState<Record<string, RunManifest>>({});

  async function loadAllRuns() {
    if (allRuns.length > 0) return;
    setAllRunsLoading(true);
    try {
      const data = await api.getRunsList();
      setAllRuns(data.runs);
    } catch {}
    finally { setAllRunsLoading(false); }
  }

  function toggleAllRuns() {
    const next = !allRunsExpanded;
    setAllRunsExpanded(next);
    if (next) loadAllRuns();
  }

  async function toggleRun(runId: string) {
    const next = new Set(expandedRuns);
    if (next.has(runId)) {
      next.delete(runId);
    } else {
      next.add(runId);
      if (!manifests[runId]) {
        try {
          const m = await api.getRunManifest(runId);
          setManifests(prev => ({ ...prev, [runId]: m }));
        } catch {}
      }
    }
    setExpandedRuns(next);
  }

  function toggleAngle(runId: string, angleIdx: number) {
    const key = `${runId}:${angleIdx}`;
    const next = new Set(expandedAngles);
    if (next.has(key)) next.delete(key); else next.add(key);
    setExpandedAngles(next);
  }

  function isActiveSlide(runId: string, angle: number, slide: number) {
    return selectedRunId === runId && selectedView === "slide" && selectedAngle === angle && selectedSlide === slide;
  }
  function isActiveBlog(runId: string) {
    return selectedRunId === runId && selectedView === "blog";
  }

  const RunRow = ({ run }: { run: RunSummary }) => {
    const runExpanded = expandedRuns.has(run.run_id);
    const manifest = manifests[run.run_id];
    const isSelected = selectedRunId === run.run_id;

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
  };

  // Collapsed state — just a thin icon strip
  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col items-center bg-zinc-950 border-r border-zinc-800/50 py-3 gap-3">
        <button onClick={onToggleCollapse} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Expand files">
          <PanelLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/50 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Files</p>
        <button onClick={onToggleCollapse} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Collapse">
          <PanelLeft size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Recent runs — only after hydration (Redux state is client-only) */}
        {mounted && recentRuns.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-3 py-2">
              <History size={9} className="text-zinc-700" />
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Recent</p>
            </div>
            {recentRuns.slice(0, 5).map(run => (
              <RunRow key={run.runId} run={{
                run_id: run.runId, topic: run.topic,
                created_at: new Date(run.timestamp).getTime() / 1000,
                has_content: !!run.contentResult, has_blog: false,
              }} />
            ))}
          </div>
        )}

        {/* All runs — collapsed by default */}
        <button onClick={toggleAllRuns} className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/20 transition-colors">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
            All Runs {allRuns.length > 0 ? `(${allRuns.length})` : ""}
          </p>
          {allRunsLoading
            ? <Loader2 size={10} className="text-zinc-600 animate-spin" />
            : <ChevronDown size={10} className={`text-zinc-600 transition-transform ${allRunsExpanded ? "rotate-180" : ""}`} />
          }
        </button>

        <AnimatePresence initial={false}>
          {allRunsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {allRunsLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-zinc-700">
                  <Loader2 size={10} className="animate-spin" />
                  <span className="text-[10px]">Loading…</span>
                </div>
              )}
              {allRuns.filter(r => r.has_content || r.has_blog).map(run => (
                <RunRow key={run.run_id} run={run} />
              ))}
              {!allRunsLoading && allRuns.length === 0 && (
                <p className="px-3 py-4 text-[10px] text-zinc-700 text-center">No runs found</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatAge(unixTs: number): string {
  const secs = Date.now() / 1000 - unixTs;
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}
