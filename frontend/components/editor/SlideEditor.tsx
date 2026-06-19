"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import useUndoable from "use-undoable";
import {
  Save, Loader2, Type, BarChart2, Image as ImageIcon, Sparkles,
  Plus, X, Palette, Check, Send, Bot, User, Undo2, Redo2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidePreviewFrame } from "./SlidePreviewFrame";
import { ChartPreview } from "./ChartPreview";
import { ImageEditModal } from "./ImageEditModal";
import { api, SlideData, SlideEditRequest } from "@/lib/api";

const SLIDE_TYPES = ["hook", "content", "stat", "quote", "cta", "engage"] as const;
const CHART_TYPES = ["bar", "column", "donut", "line", "radar", "funnel"] as const;
const FONT_SIZES = { xs: "28px", sm: "36px", md: "44px", lg: "52px", xl: "64px" };
const ACCENT_PRESETS = ["#7C6EFA", "#2DD4BF", "#F59E0B", "#EF4444", "#10B981", "#F97316", "#EC4899", "#3B82F6"];
const TEXT_COLORS = ["#FAFAFA", "#D4D4D8", "#A1A1AA", "#FDE68A", "#BAE6FD", "#FFFFFF"];

type EditorTab = "content" | "style" | "chart" | "image";
type SaveStatus = "idle" | "saving" | "saved";
interface ChatMsg { role: "user" | "assistant"; content: string; }

// Snapshot captures all slide state that participates in undo/redo
interface SlideSnapshot {
  title: string; body: string; bullets: string[];
  statValue: string; statLabel: string;
  chartType: string; chartLabels: string[]; chartValues: number[];
  titleSize: string; titleColor: string; accentColor: string;
  selectedType: string; selectedTheme: string;
}

interface Props { runId: string; angleIndex: number; slideNumber: number; }

export function SlideEditor({ runId, angleIndex, slideNumber }: Props) {
  const [slide, setSlide] = useState<SlideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI panel state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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

  // ── AI rewrite ────────────────────────────────────────────────────────────
  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", content: text }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const result = await api.aiRewriteSlide(runId, angleIndex, slideNumber, text);
      const s = result.slide;
      setSnap({ ...snap, title: s.title, body: s.body, bullets: s.bullets ?? [] });
      setAiMessages(prev => [...prev, { role: "assistant", content: `Rewrote: **${s.title}**` }]);
    } catch (e: any) {
      setAiMessages(prev => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally { setAiLoading(false); }
  }

  const setField = useCallback(<K extends keyof SlideSnapshot>(key: K, val: SlideSnapshot[K]) => {
    setSnap(prev => ({ ...prev, [key]: val }));
  }, [setSnap]);

  const setStyleField = useCallback(<K extends keyof SlideSnapshot>(key: K, val: SlideSnapshot[K]) => {
    setSnap(prev => ({ ...prev, [key]: val }));
    setStyleDirty(true);
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
          {/* ── CONTENT ── */}
          {activeTab === "content" && (
            <>
              <Field label="Title">
                <textarea id="slide-field-title" rows={2} value={snap.title}
                  onChange={e => setField("title", e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-violet-500/50 transition-all" />
              </Field>
              <Field label="Body">
                <textarea id="slide-field-body" rows={3} value={snap.body}
                  onChange={e => setField("body", e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-violet-500/50 transition-all" />
              </Field>
              <Field label="Bullets">
                <div id="slide-field-bullet" className="space-y-1.5">
                  {snap.bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-zinc-600 text-[10px] shrink-0">·</span>
                      <input value={b} onChange={e => { const n = [...snap.bullets]; n[i] = e.target.value; setField("bullets", n); }}
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
                      <button onClick={() => setField("bullets", snap.bullets.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-red-400 shrink-0"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => setField("bullets", [...snap.bullets, ""])} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"><Plus size={10} /> Add bullet</button>
                </div>
              </Field>
              {(slide?.type === "stat" || snap.statValue) && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Stat Value"><input value={snap.statValue} onChange={e => setField("statValue", e.target.value)} placeholder="47%" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500/50" /></Field>
                  <Field label="Stat Label"><input value={snap.statLabel} onChange={e => setField("statLabel", e.target.value)} placeholder="of users" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500/50" /></Field>
                </div>
              )}
            </>
          )}

          {/* ── STYLE ── */}
          {activeTab === "style" && (
            <>
              <Field label="Font Size">
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(FONT_SIZES).map(k => (
                    <button key={k} onClick={() => setStyleField("titleSize", k)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${snap.titleSize === k ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {k.toUpperCase()}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Title Color">
                <div className="flex gap-2 flex-wrap">
                  {TEXT_COLORS.map(c => (
                    <button key={c} onClick={() => setStyleField("titleColor", c)} style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${snap.titleColor === c ? "border-violet-500 scale-110" : "border-zinc-700"}`} />
                  ))}
                  <input type="color" value={snap.titleColor} onChange={e => setStyleField("titleColor", e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border border-zinc-700 bg-transparent" />
                </div>
              </Field>
              <Field label="Accent Color">
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_PRESETS.map(c => (
                    <button key={c} onClick={() => setStyleField("accentColor", c)} style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${snap.accentColor === c ? "border-white scale-110" : "border-transparent"}`} />
                  ))}
                  <input type="color" value={snap.accentColor} onChange={e => setStyleField("accentColor", e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border border-zinc-700 bg-transparent" />
                </div>
              </Field>
              <Field label="Slide Type">
                <div className="flex gap-1 flex-wrap">
                  {SLIDE_TYPES.map(t => (
                    <button key={t} onClick={() => setStyleField("selectedType", t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${snap.selectedType === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Theme">
                <div className="flex gap-2">
                  {["aurora", "lumina"].map(t => (
                    <button key={t} onClick={() => setStyleField("selectedTheme", t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${snap.selectedTheme === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {t === "aurora" ? "🌑 Aurora" : "☀️ Lumina"}
                    </button>
                  ))}
                </div>
              </Field>
              {styleDirty && (
                <button onClick={handleStyleSave} disabled={styleSaving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all">
                  {styleSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {styleSaving ? "Saving…" : "Save Style Changes"}
                </button>
              )}
            </>
          )}

          {/* ── CHART ── */}
          {activeTab === "chart" && (
            <>
              <Field label="Chart Type">
                <div className="flex gap-1 flex-wrap">
                  {CHART_TYPES.map(t => (
                    <button key={t} onClick={() => setStyleField("chartType", t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${snap.chartType === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Data">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {snap.chartLabels.map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={label} onChange={e => { const n = [...snap.chartLabels]; n[i] = e.target.value; setField("chartLabels", n); }} placeholder="Label"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
                      <input type="number" value={snap.chartValues[i] ?? ""} onChange={e => { const n = [...snap.chartValues]; n[i] = Number(e.target.value); setField("chartValues", n); }} placeholder="Val"
                        className="w-16 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
                      <button onClick={() => { setField("chartLabels", snap.chartLabels.filter((_, j) => j !== i)); setField("chartValues", snap.chartValues.filter((_, j) => j !== i)); }} className="text-zinc-700 hover:text-red-400 shrink-0"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => { setField("chartLabels", [...snap.chartLabels, ""]); setField("chartValues", [...snap.chartValues, 0]); }} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"><Plus size={10} /> Add row</button>
                </div>
              </Field>
              {snap.chartLabels.length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/50">
                  <ChartPreview chartType={snap.chartType} labels={snap.chartLabels} values={snap.chartValues} />
                </div>
              )}
              {styleDirty && (
                <button onClick={handleStyleSave} disabled={styleSaving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all">
                  {styleSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {styleSaving ? "Saving…" : "Save Chart Changes"}
                </button>
              )}
            </>
          )}

          {/* ── IMAGE ── */}
          {activeTab === "image" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <ImageIcon size={28} className="text-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-300 mb-1">Change slide image</p>
                <p className="text-xs text-zinc-600">Search Pexels, upload a file, or paste a URL</p>
              </div>
              <button onClick={() => setImageModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all">
                <ImageIcon size={14} /> Open Image Picker
              </button>
              <p className="text-[10px] text-zinc-700">Tip: you can also click on the image in the slide preview</p>
            </div>
          )}
        </div>
      </div>

      {/* ── AI panel ── */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 270, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 flex flex-col border-l border-zinc-800/50 bg-zinc-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-2"><Sparkles size={13} className="text-violet-400" /><p className="text-xs font-bold text-zinc-300">AI Rewrite</p></div>
              <button onClick={() => setAiOpen(false)} className="text-zinc-600 hover:text-zinc-400"><X size={13} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
              {aiMessages.length === 0 && <div className="text-center py-6 text-zinc-700"><Bot size={24} className="mx-auto mb-2 opacity-40" /><p className="text-[10px]">Tell me how to rewrite this slide.</p></div>}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-violet-600" : "bg-zinc-800 border border-zinc-700"}`}>
                    {msg.role === "user" ? <User size={10} className="text-white" /> : <Bot size={10} className="text-violet-400" />}
                  </div>
                  <div className={`rounded-xl px-2.5 py-2 text-[11px] leading-relaxed max-w-[85%] ${msg.role === "user" ? "bg-violet-600 text-white rounded-tr-none" : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {aiLoading && <div className="flex gap-2"><div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"><Bot size={10} className="text-violet-400" /></div><div className="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">{[0,1,2].map(i=><span key={i} className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}</div></div>}
            </div>
            <div className="px-3 pb-3 pt-2 border-t border-zinc-800/50 shrink-0">
              <div className="flex gap-2">
                <textarea rows={2} value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                  placeholder="Make this punchier…"
                  className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-2.5 py-2 text-[11px] text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/40" />
                <button onClick={sendAiMessage} disabled={!aiInput.trim() || aiLoading}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white self-end transition-all">
                  {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
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
