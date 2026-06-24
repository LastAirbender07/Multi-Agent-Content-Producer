"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2, ChevronDown, PanelLeft, Plus, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { api, RunSummary, RunManifest } from "@/lib/api";
import { useExpandedSet } from "@/hooks/useExpandedSet";
import { RunRow } from "./RunRow";

export interface FileBrowserProps {
  selectedRunId: string | null;
  selectedAngle: number | null;
  selectedSlide: number | null;
  selectedView: "slide" | "blog" | null;
  onSelectSlide: (runId: string, angle: number, slide: number) => void;
  onSelectBlog: (runId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hideHeader?: boolean;
}

export function FileBrowser({
  selectedRunId, selectedAngle, selectedSlide, selectedView,
  onSelectSlide, onSelectBlog,
  collapsed, onToggleCollapse,
  hideHeader = false,
}: FileBrowserProps) {
  const router = useRouter();
  const recentRuns = useAppSelector(s => s.history.runs);
  const [mounted, setMounted] = useState(false);
  const [allRuns, setAllRuns] = useState<RunSummary[]>([]);

  // Only render Redux state after hydration to avoid server/client mismatch
  useEffect(() => { setMounted(true); }, []);
  const [allRunsLoading, setAllRunsLoading] = useState(false);
  const [allRunsExpanded, setAllRunsExpanded] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const { expanded: expandedAngles, toggle: toggleAngleKey } = useExpandedSet<string>();
  const [manifests, setManifests] = useState<Record<string, RunManifest>>({});

  // New Post state
  const [newPostInput, setNewPostInput] = useState("");
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPostLoading, setNewPostLoading] = useState(false);

  // Add Slide state: "runId:angleIdx" → type picker open
  const [addSlideTarget, setAddSlideTarget] = useState<string | null>(null);
  const [addSlideType, setAddSlideType] = useState<string>("content");
  const [addSlideLoading, setAddSlideLoading] = useState(false);

  async function handleCreateBlankRun() {
    if (!newPostInput.trim()) return;
    setNewPostLoading(true);
    try {
      const { run_id } = await api.createBlankRun(newPostInput.trim());
      setNewPostOpen(false);
      setNewPostInput("");
      // Navigate to editor and force add-slide open via URL param
      router.push(`/editor?run=${run_id}&view=slide&angle=0&addslide=1`);
    } catch {}
    finally { setNewPostLoading(false); }
  }

  async function handleAddSlide(runId: string, angleIndex: number) {
    setAddSlideLoading(true);
    try {
      // Create the blank slide
      const { slide } = await api.newSlide(runId, angleIndex, addSlideType, "aurora");
      const newSlideNum = slide.slide_number as number;
      // Trigger first render by calling editSlide with basic title
      await api.editSlide(runId, angleIndex, newSlideNum, { title: "New Slide", body: "" });
      // Reload the manifest so the new slide appears
      const m = await api.getRunManifest(runId);
      setManifests(prev => ({ ...prev, [runId]: m }));
      setAddSlideTarget(null);
      // Navigate to the new slide
      onSelectSlide(runId, angleIndex, newSlideNum);
    } catch {}
    finally { setAddSlideLoading(false); }
  }

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
    toggleAngleKey(`${runId}:${angleIdx}`);
  }

  function isActiveSlide(runId: string, angle: number, slide: number) {
    return selectedRunId === runId && selectedView === "slide" && selectedAngle === angle && selectedSlide === slide;
  }
  function isActiveBlog(runId: string) {
    return selectedRunId === runId && selectedView === "blog";
  }

  const sharedRunRowProps = {
    manifests,
    expandedRuns,
    expandedAngles: expandedAngles,
    toggleRun,
    toggleAngle,
    isActiveSlide,
    isActiveBlog,
    selectedView,
    selectedRunId,
    selectedAngle,
    selectedSlide,
    onSelectSlide,
    onSelectBlog,
    addSlideTarget,
    setAddSlideTarget,
    addSlideType,
    setAddSlideType,
    addSlideLoading,
    onAddSlide: handleAddSlide,
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
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Header — hidden when rendered inside EditorLeftPanel (which provides its own tab bar) */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/50 shrink-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Files</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setNewPostOpen(o => !o)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black text-zinc-600 hover:text-violet-400 hover:bg-zinc-800/40 transition-all"
              title="New blank post"
            >
              <Plus size={11} /> New
            </button>
            <button onClick={onToggleCollapse} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Collapse">
              <PanelLeft size={14} />
            </button>
          </div>
        </div>
      )}

      {/* New Post input */}
      <AnimatePresence>
        {newPostOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-b border-zinc-800/40 bg-zinc-900/30"
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <input
                value={newPostInput}
                onChange={e => setNewPostInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCreateBlankRun(); if (e.key === "Escape") { setNewPostOpen(false); setNewPostInput(""); } }}
                placeholder="Post title…"
                autoFocus
                className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
              <button onClick={handleCreateBlankRun} disabled={!newPostInput.trim() || newPostLoading}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all shrink-0">
                {newPostLoading ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
              </button>
              <button onClick={() => { setNewPostOpen(false); setNewPostInput(""); }} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                <X size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              }} {...sharedRunRowProps} />
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
                <RunRow key={run.run_id} run={run} {...sharedRunRowProps} />
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
