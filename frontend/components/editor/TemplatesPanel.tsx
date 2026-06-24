"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LayoutTemplate, BarChart2, Puzzle, Bookmark } from "lucide-react";
import { api } from "@/lib/api";
import { useBlankRunCreation } from "@/hooks/useBlankRunCreation";
import { ChartEditorPanel } from "@/components/editor/ChartEditorPanel";
import type { ChartType, ChartData } from "@/types/chart";

interface TemplatesPanelProps {
  runId: string | null;
  angleIndex: number | null;
  onSlideCreated?: (runId: string, angleIndex: number, slideNumber: number) => void;
  onInsertChart?: (type: ChartType, data: ChartData) => Promise<void>;
  onChartEditorOpen?: () => void;
}

// ── Slide type tiles ─────────────────────────────────────────────────────────

const SLIDE_TYPES = [
  { type: "hook",    label: "Hook",       desc: "Opening slide",   color: "#7C6EFA", emoji: "🎯", template: "aurora-hook" },
  { type: "content", label: "Img Right",  desc: "Text ← Image",    color: "#2DD4BF", emoji: "📝", template: "aurora-content-0" },
  { type: "content", label: "Img Bottom", desc: "Text ↑ Image",    color: "#2DD4BF", emoji: "📐", template: "aurora-content-1" },
  { type: "content", label: "Img Top",    desc: "Image ↑ Text",    color: "#2DD4BF", emoji: "🖼", template: "aurora-content-2" },
  { type: "content", label: "Text Only",  desc: "No image",        color: "#2DD4BF", emoji: "📄", template: "aurora-content-text" },
  { type: "stat",    label: "Stat",       desc: "Big number",      color: "#F59E0B", emoji: "📊", template: "aurora-stat" },
  { type: "quote",   label: "Quote",      desc: "Pull quote",      color: "#EC4899", emoji: "💬", template: "aurora-quote" },
  { type: "cta",     label: "CTA",        desc: "Call to action",  color: "#10B981", emoji: "🚀", template: "aurora-cta" },
  { type: "engage",  label: "Engage",     desc: "Engagement",      color: "#6366F1", emoji: "✨", template: "aurora-engage" },
] as { type: string; label: string; desc: string; color: string; emoji: string; template: string }[];

// Meaningful placeholder content per slide type
const STARTER_CONTENT: Record<string, { title: string; body: string; stat_value?: string; stat_label?: string }> = {
  hook:    { title: "Your Headline Here", body: "" },
  content: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  stat:    { title: "This number changes everything", body: "Here's the context behind why this stat matters.", stat_value: "42%", stat_label: "Key metric label" },
  quote:   { title: "The most powerful thing I learned was this.", body: "— Source, Year" },
  cta:     { title: "Follow for weekly research breakdowns", body: "We turn dense research into 2-minute reads." },
  engage:  { title: "Did this surprise you? Follow for more.", body: "We publish research-backed insights every week." },
};

// ── Component tiles ──────────────────────────────────────────────────────────

const COMPONENTS = [
  { id: "brand-bar",    label: "Brand Bar",    desc: "Logo + progress",  color: "#7C6EFA" },
  { id: "dark-card",    label: "Dark Card",    desc: "Glass card",       color: "#2DD4BF" },
  { id: "stat-block",   label: "Stat Block",   desc: "Big number",       color: "#F59E0B" },
  { id: "quote-block",  label: "Quote Block",  desc: "Quote + attr",     color: "#EC4899" },
  { id: "bullet-list",  label: "Bullets",      desc: "Numbered list",    color: "#10B981" },
  { id: "accent-line",  label: "Accent Line",  desc: "Gradient bar",     color: "#6366F1" },
  { id: "cta-button",   label: "CTA Button",   desc: "Pill button",      color: "#7C6EFA" },
  { id: "eyebrow-pill", label: "Eyebrow",      desc: "Label pill",       color: "#2DD4BF" },
] as const;

type TabId = "slides" | "charts" | "components" | "saved";

export function TemplatesPanel({ runId, angleIndex, onSlideCreated, onInsertChart, onChartEditorOpen }: TemplatesPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("slides");
  const [creating, setCreating] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [chartEditorOpen, setChartEditorOpen] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("column");

  const { createRun } = useBlankRunCreation();

  async function createSlideWithType(slideType: string, canvasTemplate?: string) {
    setCreating(slideType);
    try {
      let targetRunId = runId;
      let targetAngle = angleIndex ?? 0;
      if (!targetRunId) {
        const newRunId = await createRun(`New ${slideType} post`);
        if (!newRunId) throw new Error("Failed to create run");
        targetRunId = newRunId;
        targetAngle = 0;
      }
      const { slide } = await api.newSlide(targetRunId, targetAngle, slideType, "aurora");
      const slideNum = (slide as { slide_number?: number }).slide_number ?? 1;

      // Seed with meaningful placeholder content + canvas_template
      const starter = STARTER_CONTENT[slideType] ?? { title: "New Slide", body: "" };
      await api.editSlide(targetRunId, targetAngle, slideNum, {
        title:           starter.title,
        body:            starter.body,
        stat_value:      starter.stat_value,
        stat_label:      starter.stat_label,
        canvas_template: canvasTemplate,
      });

      if (onSlideCreated) {
        onSlideCreated(targetRunId, targetAngle, slideNum);
      } else {
        router.push(`/editor?run=${targetRunId}&view=slide&angle=${targetAngle}&slide=${slideNum}`);
      }
    } catch (e) {
      console.error("createSlideWithType failed:", e);
      setCreateError("Slide creation failed. Please try again.");
    }
    setCreating(null);
  }

  function openChartEditor(type: ChartType) {
    setSelectedChartType(type);
    setChartEditorOpen(true);
    onChartEditorOpen?.();  // deselect canvas object to avoid duplicate chart picker
  }

  async function handleChartApply(type: ChartType, data: ChartData) {
    if (onInsertChart) await onInsertChart(type, data);
    setChartEditorOpen(false);
  }

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "slides",     label: "Slides",      icon: <LayoutTemplate size={11} /> },
    { id: "charts",     label: "Charts",      icon: <BarChart2 size={11} /> },
    { id: "components", label: "Components",  icon: <Puzzle size={11} /> },
    { id: "saved",      label: "Saved",       icon: <Bookmark size={11} /> },
  ];

  // If chart editor is open, show it full-panel
  if (chartEditorOpen) {
    return (
      <div className="flex flex-col h-full">
        <ChartEditorPanel
          initialType={selectedChartType}
          theme="aurora"
          onApply={handleChartApply}
          onCancel={() => setChartEditorOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Error banner */}
      {createError && (
        <div className="mx-2 mt-2 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-xs text-red-400 flex items-center justify-between shrink-0">
          <span>{createError}</span>
          <button onClick={() => setCreateError(null)} className="ml-2 text-red-500 hover:text-red-300 font-bold">✕</button>
        </div>
      )}
      {/* Sub-tabs */}
      <div className="flex items-center border-b border-zinc-800/50 shrink-0 px-2 pt-1.5 pb-0 gap-0.5 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-[10px] font-bold whitespace-nowrap transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-violet-500 text-violet-300 bg-zinc-900/50"
                : "border-transparent text-zinc-600 hover:text-zinc-400"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">

        {/* ── Slide types ─────────────────────────────────────────────── */}
        {activeTab === "slides" && (
          <div className="space-y-3">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Click a type to add a new slide to the current post.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SLIDE_TYPES.map((t, idx) => (
                <button
                  key={t.template ?? `${t.type}-${idx}`}
                  onClick={() => createSlideWithType(t.type, t.template)}
                  disabled={creating === t.type}
                  className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition-all group"
                >
                  <div className="w-full h-1 rounded-full" style={{ background: t.color, opacity: 0.8 }} />
                  <div className="flex items-center gap-2">
                    <span className="text-base">{t.emoji}</span>
                    {creating === t.type
                      ? <Loader2 size={11} className="animate-spin text-zinc-500" />
                      : null
                    }
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">{t.label}</p>
                    <p className="text-[10px] text-zinc-600">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chart types ─────────────────────────────────────────────── */}
        {activeTab === "charts" && (
          <div className="space-y-3">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Insert a chart with your own data onto the canvas.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { type: "bar" as const,            label: "Bar",         emoji: "≡", color: "#7C6EFA" },
                { type: "column" as const,          label: "Column",      emoji: "∥", color: "#2DD4BF" },
                { type: "line" as const,            label: "Line",        emoji: "╱", color: "#F59E0B" },
                { type: "area" as const,            label: "Area",        emoji: "◿", color: "#EC4899" },
                { type: "donut" as const,           label: "Donut",       emoji: "◎", color: "#10B981" },
                { type: "radar" as const,           label: "Radar",       emoji: "✦", color: "#6366F1" },
                { type: "funnel" as const,          label: "Funnel",      emoji: "▽", color: "#7C6EFA" },
                { type: "stacked-bar" as const,     label: "Stacked",     emoji: "⬛", color: "#2DD4BF" },
                { type: "comparison" as const,      label: "Compare",     emoji: "⚖", color: "#F59E0B" },
                { type: "scatter" as const,         label: "Scatter",     emoji: "⋅⋅", color: "#EC4899" },
                { type: "progress" as const,        label: "Progress",    emoji: "▊", color: "#10B981" },
                { type: "number-stat" as const,     label: "Big Number",  emoji: "42", color: "#6366F1" },
              ]).map(t => (
                <button
                  key={t.type}
                  onClick={() => openChartEditor(t.type)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition-all group"
                >
                  <span className="text-base w-6 text-center" style={{ color: t.color }}>{t.emoji}</span>
                  <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-200 transition-colors">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Draggable components ─────────────────────────────────────── */}
        {activeTab === "components" && (
          <div className="space-y-3">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Drag a component onto the canvas to add it to any slide.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {COMPONENTS.map(c => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={e => e.dataTransfer.setData("componentId", c.id)}
                  className="flex flex-col gap-1 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 cursor-grab active:cursor-grabbing transition-all"
                >
                  <div className="w-full h-0.5 rounded-full" style={{ background: c.color, opacity: 0.7 }} />
                  <p className="text-[11px] font-semibold text-zinc-400">{c.label}</p>
                  <p className="text-[10px] text-zinc-700">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Saved templates ──────────────────────────────────────────── */}
        {activeTab === "saved" && (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Bookmark size={28} className="text-zinc-700" />
            <p className="text-[11px] text-zinc-600">No saved templates yet.</p>
            <p className="text-[10px] text-zinc-700 max-w-40 leading-relaxed">
              Use "Save as template" in the toolbar to save the current slide.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
