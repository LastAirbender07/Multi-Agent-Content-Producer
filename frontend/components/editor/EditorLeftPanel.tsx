"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Image as ImageIcon, LayoutTemplate, Plus, X, Check, Loader2, PanelLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FileBrowser } from "@/components/editor/FileBrowser";
import { ImagesPanel } from "@/components/editor/ImagesPanel";
import { TemplatesPanel } from "@/components/editor/TemplatesPanel";
import { api } from "@/lib/api";
import { useBlankRunCreation } from "@/hooks/useBlankRunCreation";
import type { FileBrowserProps } from "@/components/editor/FileBrowser";
import type { ChartType, ChartData } from "@/types/chart";
import { SLIDE_TEMPLATES } from "@/constants/slideTemplates";

interface EditorLeftPanelProps extends FileBrowserProps {
  runId: string | null;
  onImageApply: (url: string) => void;
  onInsertChart?: (type: ChartType, data: ChartData) => Promise<void>;
  onChartEditorOpen?: () => void;
}

export function EditorLeftPanel({
  runId, onImageApply, onInsertChart, onChartEditorOpen,
  selectedRunId, selectedAngle, selectedSlide, selectedView,
  onSelectSlide, onSelectBlog,
  collapsed, onToggleCollapse,
}: EditorLeftPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"files" | "images" | "templates">("files");

  // New post state (Issue 7 — restored from FileBrowser header)
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [newPostInput, setNewPostInput] = useState("");

  const { createRun, loading: newPostLoading } = useBlankRunCreation();

  async function handleCreateBlankRun() {
    const title = newPostInput.trim() || `New post ${new Date().toLocaleDateString()}`;
    const run_id = await createRun(title);
    if (run_id) {
      setNewPostOpen(false);
      setNewPostInput("");
      router.push(`/editor?run=${run_id}&view=slide&angle=0`);
    }
  }

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col items-center bg-zinc-950 border-r border-zinc-800/50 py-3 gap-3">
        <button onClick={onToggleCollapse} className="text-zinc-600 hover:text-zinc-300 transition-colors" title="Expand">
          <PanelLeft size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/50 overflow-hidden">
      {/* Tab bar + New Post + Collapse */}
      <div className="flex items-center border-b border-zinc-800/50 shrink-0 px-2 pt-1.5 pb-0 gap-0.5">
        <button
          onClick={() => setActiveTab("files")}
          title="Files"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[10px] font-bold transition-all border-b-2 -mb-px ${
            activeTab === "files"
              ? "border-violet-500 text-violet-300 bg-zinc-900/50"
              : "border-transparent text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <Folder size={11} />
          Files
        </button>
        <button
          onClick={() => setActiveTab("images")}
          title="Images"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[10px] font-bold transition-all border-b-2 -mb-px ${
            activeTab === "images"
              ? "border-violet-500 text-violet-300 bg-zinc-900/50"
              : "border-transparent text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <ImageIcon size={11} />
          Images
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          title="Templates"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-lg text-[10px] font-bold transition-all border-b-2 -mb-px ${
            activeTab === "templates"
              ? "border-violet-500 text-violet-300 bg-zinc-900/50"
              : "border-transparent text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <LayoutTemplate size={11} />
          Templates
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* + New post */}
        <button
          onClick={() => setNewPostOpen(o => !o)}
          title="New blank post"
          className="flex items-center gap-1 px-2 py-1 mb-px rounded-lg text-[10px] font-black text-zinc-600 hover:text-violet-400 hover:bg-zinc-800/40 transition-all"
        >
          <Plus size={11} /> New
        </button>

        {/* Collapse */}
        <button onClick={onToggleCollapse} className="text-zinc-600 hover:text-zinc-300 transition-colors mb-px p-1" title="Collapse">
          <PanelLeft size={13} />
        </button>
      </div>

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
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreateBlankRun();
                  if (e.key === "Escape") { setNewPostOpen(false); setNewPostInput(""); }
                }}
                placeholder="Post title…"
                autoFocus
                className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
              <button onClick={handleCreateBlankRun} disabled={newPostLoading}
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

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "files" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden">
              <FileBrowser
                selectedRunId={selectedRunId}
                selectedAngle={selectedAngle}
                selectedSlide={selectedSlide}
                selectedView={selectedView}
                onSelectSlide={onSelectSlide}
                onSelectBlog={onSelectBlog}
                collapsed={false}
                onToggleCollapse={onToggleCollapse}
                hideHeader
              />
            </div>
            <TemplateStrip onSelectTemplate={async (type) => {
              const run_id = await createRun(`New ${type} post`);
              if (run_id) {
                const { slide } = await api.newSlide(run_id, 0, type, "aurora");
                router.push(`/editor?run=${run_id}&view=slide&angle=0&slide=${slide.slide_number}`);
              }
            }} />
          </div>
        )}
        {activeTab === "images" && (
          runId
            ? <ImagesPanel runId={runId} onImageApply={onImageApply} />
            : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <ImageIcon size={28} className="text-zinc-700 mb-3" />
                <p className="text-[11px] text-zinc-600">Select a run to browse its images.</p>
              </div>
            )
        )}
        {activeTab === "templates" && (
          <TemplatesPanel
            runId={runId}
            angleIndex={selectedAngle}
            onSlideCreated={(rid, ai, sn) => {
              onSelectSlide(rid, ai, sn);
            }}
            onInsertChart={onInsertChart}
            onChartEditorOpen={onChartEditorOpen}
          />
        )}
      </div>
    </div>
  );
}

// ── Template strip (bottom of Files tab) ─────────────────────────────────────

function TemplateStrip({ onSelectTemplate }: { onSelectTemplate: (type: string) => void }) {
  return (
    <div className="border-t border-zinc-800/50 shrink-0 px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600 mb-2">
        Quick start
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {SLIDE_TEMPLATES.map(t => (
          <button
            key={t.type}
            onClick={() => onSelectTemplate(t.type)}
            className="flex flex-col items-start gap-0.5 px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all group"
          >
            <div className="w-full h-1 rounded-full mb-1" style={{ background: t.color, opacity: 0.7 }} />
            <span className="text-[10px] font-bold text-zinc-300 group-hover:text-white transition-colors">{t.label}</span>
            <span className="text-[9px] text-zinc-600 leading-none">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
