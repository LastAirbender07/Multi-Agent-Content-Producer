"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import useUndoable from "use-undoable";
import {
  Save, Loader2, Type, BarChart2, Image as ImageIcon, Sparkles,
  Palette, Undo2, Redo2,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { SlidePreviewFrame } from "./SlidePreviewFrame";
import { ImageEditModal } from "./ImageEditModal";
import { api, SlideData, SlideEditRequest } from "@/lib/api";
import { AiPanel } from "./panels/AiPanel";
import { ContentTab } from "./panels/ContentTab";
import { StyleTab, FONT_SIZES } from "./panels/StyleTab";
import { ChartTab } from "./panels/ChartTab";
import { ImageTab } from "./panels/ImageTab";
import type { EditorTab, SlideSnapshot } from "@/types/slideEditor";
import { useSlideAI } from "@/hooks/useSlideAI";

type SaveStatus = "idle" | "saving" | "saved";

interface Props { runId: string; angleIndex: number; slideNumber: number; }

export function SlideEditor({ runId, angleIndex, slideNumber }: Props) {
  const [slide, setSlide] = useState<SlideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Style save flag (needs explicit Save click due to slow Playwright screenshot)
  const [styleDirty, setStyleDirty] = useState(false);
  const [styleSaving, setStyleSaving] = useState(false);

  // ── use-undoable snapshot ───────────────────────────────────────────────────
  const buildEmpty = (): SlideSnapshot => ({
    title: "", body: "", bullets: [], statValue: "", statLabel: "",
    chartType: "bar", chartLabels: [], chartValues: [],
    titleSize: "md", titleColor: "#FAFAFA", accentColor: "#7C6EFA",
    selectedType: "content", selectedTheme: "aurora",
  });

  const [snap, setSnap, { undo, redo, canUndo, canRedo, resetInitialState }] =
    useUndoable<SlideSnapshot>(buildEmpty());

  // AI hook
  const { aiOpen, setAiOpen, aiMessages, aiInput, setAiInput, aiLoading, sendAiMessage } = useSlideAI({
    runId, angleIndex, slideNumber, snap,
    setSnap: (updater) => setSnap(updater),
  });

  // After slide loads, reset the undo baseline
  useEffect(() => { loadSlide(); }, [runId, angleIndex, slideNumber]);

  async function loadSlide() {
    setLoading(true);
    try {
      const data = await api.getSlides(runId, angleIndex);
      const s = data.slides.find(s => s.slide_number === slideNumber);
      if (s) {
        setSlide(s);
        const loaded: SlideSnapshot = {
          title: s.title,
          body: s.body,
          bullets: s.bullets ?? [],
          statValue: s.stat_value ?? "",
          statLabel: s.stat_label ?? "",
          chartType: s.chart_type ?? "bar",
          chartLabels: s.chart_data?.labels ?? [],
          chartValues: s.chart_data?.values ?? [],
          titleSize: Object.entries(FONT_SIZES).find(([, v]) => v === s.slide_overrides?.title_font_size)?.[0] ?? "md",
          titleColor: s.slide_overrides?.title_color ?? "#FAFAFA",
          accentColor: s.slide_overrides?.accent_color ?? "#7C6EFA",
          selectedType: s.type,
          selectedTheme: (s as any)._theme ?? "aurora",
        };
        resetInitialState(loaded);
        setSnap(loaded);
      }
    } catch {}
    finally { setLoading(false); }
  }

  // ── Auto-save text changes (debounced 300ms) ────────────────────────────────
  useEffect(() => {
    if (!slide) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.editSlide(runId, angleIndex, slideNumber, buildRequest(snap));
        setPreviewKey(k => k + 1);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch { setSaveStatus("idle"); }
    }, 300);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [snap]);

  function buildRequest(s: SlideSnapshot): SlideEditRequest {
    return {
      title: s.title, body: s.body, bullets: s.bullets,
      stat_value: s.statValue || undefined,
      stat_label: s.statLabel || undefined,
      chart_data: s.chartLabels.length ? { labels: s.chartLabels, values: s.chartValues } : undefined,
      chart_type: s.chartType || undefined,
      slide_overrides: {
        title_font_size: FONT_SIZES[s.titleSize as keyof typeof FONT_SIZES],
        title_color: s.titleColor,
        accent_color: s.accentColor,
      },
      template_type: s.selectedType,
      theme: s.selectedTheme,
    };
  }

  // ── Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z ──────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === "Z" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  // ── Element click from iframe (postMessage) ─────────────────────────────────
  function handleElementClick(field: "title" | "body" | "bullet" | "image") {
    if (field === "image") { setImageModalOpen(true); return; }
    setActiveTab("content");
    setTimeout(() => {
      const el = document.getElementById(`slide-field-${field}`);
      if (!el) return;
      el.focus();
      el.classList.add("ring-2", "ring-yellow-400/60");
      setTimeout(() => el.classList.remove("ring-2", "ring-yellow-400/60"), 1200);
    }, 50);
  }

  // ── Explicit Save for Style/Chart (triggers Playwright screenshot) ──────────
  async function handleStyleSave() {
    setStyleSaving(true);
    try {
      await api.editSlide(runId, angleIndex, slideNumber, buildRequest(snap));
      setPreviewKey(k => k + 1);
      setStyleDirty(false);
    } catch {}
    finally { setStyleSaving(false); }
  }

  const setField = useCallback(<K extends keyof SlideSnapshot>(
    key: K, val: SlideSnapshot[K], markDirty = false
  ) => {
    setSnap(prev => ({ ...prev, [key]: val }));
    if (markDirty) setStyleDirty(true);
  }, [setSnap]);

  const TabBtn = ({ id, icon: Icon, label }: { id: EditorTab; icon: any; label: string }) => (
    <button onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        activeTab === id
          ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
      }`}>
      <Icon size={11} />{label}
    </button>
  );

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={24} className="text-violet-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Preview ── */}
      <div className="flex flex-col flex-1 min-w-0 items-center justify-center px-6 py-5 bg-zinc-950 gap-4">
        {/* Status + undo/redo */}
        <div className="w-full max-w-135 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
              <Undo2 size={13} />
            </button>
            <button onClick={redo} disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
              <Redo2 size={13} />
            </button>
          </div>
          <span className={`text-[10px] font-medium transition-all ${
            saveStatus === "saving" ? "text-violet-400" : saveStatus === "saved" ? "text-emerald-400" : "text-transparent"
          }`}>
            {saveStatus === "saving" ? "⟳ Saving…" : "● Saved"}
          </span>
        </div>

        {/* Preview iframe */}
        <div className="w-full flex-1 flex items-center justify-center min-h-0">
          <div className="relative" style={{ width: "min(100%, calc(100vh - 240px))", aspectRatio: "1 / 1" }}>
            <SlidePreviewFrame
              runId={runId} angleIndex={angleIndex} slideNumber={slideNumber}
              previewKey={previewKey}
              onElementClick={handleElementClick}
            />
          </div>
        </div>

        {/* AI toggle */}
        <div className="w-full max-w-135 flex justify-end shrink-0">
          <button onClick={() => setAiOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              aiOpen ? "bg-violet-600/15 border-violet-500/40 text-violet-300" : "border-zinc-700/60 text-zinc-500 hover:text-zinc-300"
            }`}>
            <Sparkles size={12} /> AI Rewrite
          </button>
        </div>
      </div>

      {/* ── Edit controls ── */}
      <div className="w-[300px] shrink-0 flex flex-col border-l border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-zinc-800/50 shrink-0 overflow-x-auto scrollbar-none">
          <TabBtn id="content" icon={Type} label="Content" />
          <TabBtn id="style" icon={Palette} label="Style" />
          {(slide?.type === "stat" || snap.statValue) && <TabBtn id="chart" icon={BarChart2} label="Chart" />}
          <TabBtn id="image" icon={ImageIcon} label="Image" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-4">
          {activeTab === "content" && (
            <ContentTab snap={snap} slide={slide} setField={setField} Field={Field} />
          )}
          {activeTab === "style" && (
            <StyleTab
              snap={snap} setField={setField}
              styleDirty={styleDirty} styleSaving={styleSaving}
              onStyleSave={handleStyleSave} Field={Field}
            />
          )}
          {activeTab === "chart" && (
            <ChartTab
              snap={snap} setField={setField}
              styleDirty={styleDirty} styleSaving={styleSaving}
              onStyleSave={handleStyleSave} Field={Field}
            />
          )}
          {activeTab === "image" && (
            <ImageTab onOpenImageModal={() => setImageModalOpen(true)} />
          )}
        </div>
      </div>

      {/* ── AI panel ── */}
      <AnimatePresence>
        <AiPanel
          aiOpen={aiOpen}
          onClose={() => setAiOpen(false)}
          aiMessages={aiMessages}
          aiInput={aiInput}
          onInputChange={setAiInput}
          aiLoading={aiLoading}
          onSend={sendAiMessage}
        />
      </AnimatePresence>

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        runId={runId}
        angleIndex={angleIndex}
        slideNumber={slideNumber}
        onSwapped={() => setPreviewKey(k => k + 1)}
      />
    </div>
  );
}
