"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LayoutTemplate, BarChart2, Puzzle, Bookmark } from "lucide-react";
import { api } from "@/lib/api";
import { ChartEditorPanel } from "@/components/editor/ChartEditorPanel";
import type { ChartType, ChartData } from "@/types/chart";

interface TemplatesPanelProps {
  runId: string | null;
  angleIndex: number | null;
  onSlideCreated?: (runId: string, angleIndex: number, slideNumber: number) => void;
  onInsertChart?: (type: ChartType, data: ChartData) => Promise<void>;
}

// ── Slide type tiles ─────────────────────────────────────────────────────────

const SLIDE_TYPES = [
  { type: "hook",    label: "Hook",    desc: "Opening slide",      color: "#7C6EFA", emoji: "🎯" },
  { type: "content", label: "Content", desc: "Text + image",       color: "#2DD4BF", emoji: "📝" },
  { type: "stat",    label: "Stat",    desc: "Big number",         color: "#F59E0B", emoji: "📊" },
  { type: "quote",   label: "Quote",   desc: "Pull quote",         color: "#EC4899", emoji: "💬" },
  { type: "cta",     label: "CTA",     desc: "Call to action",     color: "#10B981", emoji: "🚀" },
  { type: "engage",  label: "Engage",  desc: "Engagement slide",   color: "#6366F1", emoji: "✨" },
] as const;

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

export function TemplatesPanel({ runId, angleIndex, onSlideCreated, onInsertChart }: TemplatesPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("slides");
  const [creating, setCreating] = useState<string | null>(null);
  const [chartEditorOpen, setChartEditorOpen] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("column");

  async function createSlideWithType(slideType: string) {
    setCreating(slideType);
    try {
      // Create a blank run if no run is selected
      let targetRunId = runId;
      let targetAngle = angleIndex ?? 0;
      if (!targetRunId) {
        const { run_id } = await api.createBlankRun(`New ${slideType} post`);
        targetRunId = run_id;
        targetAngle = 0;
      }
      const { slide } = await api.newSlide(targetRunId, targetAngle, slideType, "aurora");
      const slideNum = (slide as { slide_number?: number }).slide_number ?? 1;
      if (onSlideCreated) {
        onSlideCreated(targetRunId, targetAngle, slideNum);
      } else {
        router.push(`/editor?run=${targetRunId}&view=slide&angle=${targetAngle}&slide=${slideNum}`);
      }
    } catch {}
    setCreating(null);
  }

  function openChartEditor(type: ChartType) {
    setSelectedChartType(type);
    setChartEditorOpen(true);
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
              {SLIDE_TYPES.map(t => (
                <button
                  key={t.type}
                  onClick={() => createSlideWithType(t.type)}
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
            <p className="text-[10px] text-zinc-700 max-w-[160px] leading-relaxed">
              Use "Save as template" in the toolbar to save the current slide.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
