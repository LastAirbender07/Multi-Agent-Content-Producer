"use client";
import { useState, useEffect } from "react";
import {
  Save, Loader2, Type, BarChart2, Image as ImageIcon, Sparkles,
  Plus, X, Palette, Check, Send, Bot, User, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidePreviewFrame } from "./SlidePreviewFrame";
import { ChartPreview } from "./ChartPreview";
import { api, SlideData, SlideEditRequest } from "@/lib/api";
import type { PexelsPhoto, DDGSImage } from "@/lib/api";

const SLIDE_TYPES = ["hook", "content", "stat", "quote", "cta", "engage"] as const;
const CHART_TYPES = ["bar", "column", "donut", "line", "radar", "funnel"] as const;
const FONT_SIZES = { "xs": "28px", "sm": "36px", "md": "44px", "lg": "52px", "xl": "64px" };
const ACCENT_PRESETS = ["#7C6EFA", "#2DD4BF", "#F59E0B", "#EF4444", "#10B981", "#F97316", "#EC4899", "#3B82F6"];
const TEXT_COLORS = ["#FAFAFA", "#D4D4D8", "#A1A1AA", "#FDE68A", "#BAE6FD", "#FFFFFF"];

type EditorTab = "content" | "style" | "chart" | "image";

interface ChatMsg { role: "user" | "assistant"; content: string; }

interface SlideEditorProps {
  runId: string;
  angleIndex: number;
  slideNumber: number;
}

export function SlideEditor({ runId, angleIndex, slideNumber }: SlideEditorProps) {
  const [slide, setSlide] = useState<SlideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");

  // Content state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bullets, setBullets] = useState<string[]>([]);
  const [statValue, setStatValue] = useState("");
  const [statLabel, setStatLabel] = useState("");

  // Style state
  const [titleSize, setTitleSize] = useState("md");
  const [titleColor, setTitleColor] = useState("#FAFAFA");
  const [accentColor, setAccentColor] = useState("#7C6EFA");
  const [selectedType, setSelectedType] = useState("content");
  const [selectedTheme, setSelectedTheme] = useState("aurora");

  // Chart state
  const [chartType, setChartType] = useState("bar");
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartValues, setChartValues] = useState<number[]>([]);

  // Image state
  const [imageQuery, setImageQuery] = useState("");
  const [imageSource, setImageSource] = useState<"pexels" | "ddgs">("pexels");
  const [searchResults, setSearchResults] = useState<(PexelsPhoto | DDGSImage)[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);

  // AI panel state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadSlide(); }, [runId, angleIndex, slideNumber]);

  async function loadSlide() {
    setLoading(true);
    try {
      const data = await api.getSlides(runId, angleIndex);
      const s = data.slides.find(s => s.slide_number === slideNumber);
      if (s) {
        setSlide(s);
        setTitle(s.title);
        setBody(s.body);
        setBullets(s.bullets ?? []);
        setStatValue(s.stat_value ?? "");
        setStatLabel(s.stat_label ?? "");
        setSelectedType(s.type);
        setSelectedTheme(s._theme ?? "aurora");
        const ov = s.slide_overrides ?? {};
        if (ov.title_font_size) setTitleSize(Object.entries(FONT_SIZES).find(([, v]) => v === ov.title_font_size)?.[0] ?? "md");
        if (ov.title_color) setTitleColor(ov.title_color);
        if (ov.accent_color) setAccentColor(ov.accent_color);
        if (s.chart_type) setChartType(s.chart_type);
        if (s.chart_data) { setChartLabels(s.chart_data.labels ?? []); setChartValues(s.chart_data.values ?? []); }
      }
    } catch {}
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!slide || saving) return;
    setSaving(true);
    try {
      const req: SlideEditRequest = {
        title, body, bullets,
        stat_value: statValue || undefined,
        stat_label: statLabel || undefined,
        chart_data: chartLabels.length ? { labels: chartLabels, values: chartValues } : undefined,
        chart_type: chartType || undefined,
        slide_overrides: {
          title_font_size: FONT_SIZES[titleSize as keyof typeof FONT_SIZES],
          title_color: titleColor,
          accent_color: accentColor,
        },
        template_type: selectedType,
        theme: selectedTheme,
      };
      await api.editSlide(runId, angleIndex, slideNumber, req);
      setPreviewKey(k => k + 1);
    } catch (e: any) { console.error("Save failed:", e.message); }
    finally { setSaving(false); }
  }

  async function handleImageSearch() {
    if (!imageQuery.trim()) return;
    setSearchLoading(true); setSearchResults([]);
    try {
      const res = await api.searchImages({ query: imageQuery, source: imageSource, max_results: 12 });
      setSearchResults(imageSource === "pexels" ? res.pexels_photos ?? [] : res.ddgs_images ?? []);
    } catch {}
    finally { setSearchLoading(false); }
  }

  async function handleSwapImage() {
    setSwapping(true);
    try {
      const q = imageQuery || slide?.image_query || slide?.title || "abstract";
      await api.swapSlideImage(runId, angleIndex, slideNumber, q, imageSource);
      setPreviewKey(k => k + 1);
    } catch (e: any) { console.error("Swap failed:", e.message); }
    finally { setSwapping(false); }
  }

  async function sendAiMessage() {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiMessages(prev => [...prev, { role: "user", content: text }]);
    setAiInput("");
    setAiLoading(true);
    try {
      const result = await api.aiRewriteSlide(runId, angleIndex, slideNumber, text);
      const s = result.slide;
      setTitle(s.title); setBody(s.body); setBullets(s.bullets ?? []);
      setStatValue(s.stat_value ?? ""); setStatLabel(s.stat_label ?? "");
      await api.editSlide(runId, angleIndex, slideNumber, { title: s.title, body: s.body, bullets: s.bullets, stat_value: s.stat_value, stat_label: s.stat_label });
      setPreviewKey(k => k + 1);
      setAiMessages(prev => [...prev, { role: "assistant", content: `Rewrote slide:\n**${s.title}**\n${s.body}` }]);
    } catch (e: any) {
      setAiMessages(prev => [...prev, { role: "assistant", content: `Error: ${(e as any).message}` }]);
    } finally { setAiLoading(false); }
  }

  const TabBtn = ({ id, icon: Icon, label }: { id: EditorTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        activeTab === id
          ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
      }`}
    >
      <Icon size={11} />{label}
    </button>
  );

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Loader2 size={24} className="text-violet-500 animate-spin" />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Centre: slide preview ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 min-w-0 px-6 py-5 bg-zinc-950 gap-4">
        {/* Preview fills available space maintaining 1:1 ratio */}
        <div className="w-full flex-1 flex items-center justify-center min-h-0">
          <div className="relative" style={{ width: "min(100%, calc(100vh - 200px))", aspectRatio: "1 / 1" }}>
            <SlidePreviewFrame
              runId={runId}
              angleIndex={angleIndex}
              slideNumber={slideNumber}
              previewKey={previewKey}
            />
          </div>
        </div>

        {/* Save bar */}
        <div className="w-full max-w-135 flex items-center gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save & Update PNG"}
          </button>
          {/* AI toggle */}
          <button
            onClick={() => setAiOpen(o => !o)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
              aiOpen ? "bg-violet-600/15 border-violet-500/40 text-violet-300" : "border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
            }`}
          >
            <Sparkles size={13} />
            AI
          </button>
        </div>
      </div>

      {/* ── Right: edit controls ──────────────────────────────────────────── */}
      <div className="w-[320px] shrink-0 flex flex-col border-l border-zinc-800/50 bg-zinc-900/30 overflow-hidden">

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-zinc-800/50 shrink-0 overflow-x-auto scrollbar-none">
          <TabBtn id="content" icon={Type} label="Content" />
          <TabBtn id="style" icon={Palette} label="Style" />
          {(slide?.type === "stat" || statValue) && <TabBtn id="chart" icon={BarChart2} label="Chart" />}
          <TabBtn id="image" icon={ImageIcon} label="Image" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-4">

          {/* ── CONTENT TAB ── */}
          {activeTab === "content" && (
            <>
              <Field label="Title">
                <textarea rows={2} value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Body">
                <textarea rows={3} value={body} onChange={e => setBody(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Bullets">
                <div className="space-y-1.5">
                  {bullets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-zinc-600 text-[10px] shrink-0">·</span>
                      <input value={b} onChange={e => { const n = [...bullets]; n[i] = e.target.value; setBullets(n); }}
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
                      <button onClick={() => setBullets(bullets.filter((_, j) => j !== i))} className="text-zinc-700 hover:text-red-400 shrink-0"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => setBullets([...bullets, ""])} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"><Plus size={10} /> Add bullet</button>
                </div>
              </Field>
              {(slide?.type === "stat" || statValue) && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Stat Value"><input value={statValue} onChange={e => setStatValue(e.target.value)} placeholder="47%" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500/50" /></Field>
                  <Field label="Stat Label"><input value={statLabel} onChange={e => setStatLabel(e.target.value)} placeholder="of users" className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500/50" /></Field>
                </div>
              )}
            </>
          )}

          {/* ── STYLE TAB ── */}
          {activeTab === "style" && (
            <>
              <Field label="Font Size">
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(FONT_SIZES).map(([key]) => (
                    <button key={key} onClick={() => setTitleSize(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${titleSize === key ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Title Color">
                <div className="flex gap-2 flex-wrap">
                  {TEXT_COLORS.map(c => (
                    <button key={c} onClick={() => setTitleColor(c)} style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${titleColor === c ? "border-violet-500 scale-110" : "border-zinc-700"}`} />
                  ))}
                  <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border border-zinc-700 bg-transparent" />
                </div>
              </Field>
              <Field label="Accent Color">
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_PRESETS.map(c => (
                    <button key={c} onClick={() => setAccentColor(c)} style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${accentColor === c ? "border-white scale-110" : "border-transparent"}`} />
                  ))}
                  <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-7 h-7 rounded-lg cursor-pointer border border-zinc-700 bg-transparent" />
                </div>
              </Field>
              <Field label="Slide Type">
                <div className="flex gap-1 flex-wrap">
                  {SLIDE_TYPES.map(t => (
                    <button key={t} onClick={() => setSelectedType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${selectedType === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Theme">
                <div className="flex gap-2">
                  {["aurora", "lumina"].map(t => (
                    <button key={t} onClick={() => setSelectedTheme(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${selectedTheme === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {t === "aurora" ? "🌑 Aurora" : "☀️ Lumina"}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── CHART TAB ── */}
          {activeTab === "chart" && (
            <>
              <Field label="Chart Type">
                <div className="flex gap-1 flex-wrap">
                  {CHART_TYPES.map(t => (
                    <button key={t} onClick={() => setChartType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${chartType === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Data">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {chartLabels.map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={label} onChange={e => { const n = [...chartLabels]; n[i] = e.target.value; setChartLabels(n); }} placeholder="Label"
                        className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
                      <input type="number" value={chartValues[i] ?? ""} onChange={e => { const n = [...chartValues]; n[i] = Number(e.target.value); setChartValues(n); }} placeholder="Val"
                        className="w-16 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40" />
                      <button onClick={() => { setChartLabels(chartLabels.filter((_, j) => j !== i)); setChartValues(chartValues.filter((_, j) => j !== i)); }} className="text-zinc-700 hover:text-red-400 shrink-0"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => { setChartLabels([...chartLabels, ""]); setChartValues([...chartValues, 0]); }} className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400"><Plus size={10} /> Add row</button>
                </div>
              </Field>
              {chartLabels.length > 0 && (
                <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800/50">
                  <ChartPreview chartType={chartType} labels={chartLabels} values={chartValues} />
                </div>
              )}
            </>
          )}

          {/* ── IMAGE TAB ── */}
          {activeTab === "image" && (
            <>
              <div className="flex gap-2">
                <div className="flex gap-0.5 p-0.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
                  {(["pexels", "ddgs"] as const).map(s => (
                    <button key={s} onClick={() => setImageSource(s)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${imageSource === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                      {s === "pexels" ? "Pexels" : "Web"}
                    </button>
                  ))}
                </div>
                <input value={imageQuery} onChange={e => setImageQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleImageSearch()}
                  placeholder="Search images…"
                  className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/50 min-w-0" />
                <button onClick={handleImageSearch} disabled={searchLoading}
                  className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-xs font-semibold text-zinc-200 disabled:opacity-50 shrink-0 transition-all">
                  {searchLoading ? <Loader2 size={12} className="animate-spin" /> : "Go"}
                </button>
              </div>
              {swapping && <div className="flex items-center gap-2 text-violet-400 text-xs"><Loader2 size={12} className="animate-spin" /> Swapping…</div>}
              <div className="grid grid-cols-3 gap-1.5">
                {searchResults.map((img, i) => {
                  const src = "src" in img ? (img.src?.large2x || img.src?.large || "") : (img as any).image;
                  return (
                    <button key={i} onClick={handleSwapImage} disabled={swapping}
                      className="relative rounded-lg overflow-hidden aspect-square bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 transition-all group disabled:opacity-50">
                      <img src={src} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Check size={16} className="text-white" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── AI panel — collapsible right drawer ──────────────────────────── */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="shrink-0 flex flex-col border-l border-zinc-800/50 bg-zinc-950 overflow-hidden"
          >
            {/* AI Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-violet-400" />
                <p className="text-xs font-bold text-zinc-300">AI Rewrite</p>
              </div>
              <button onClick={() => setAiOpen(false)} className="text-zinc-600 hover:text-zinc-400"><X size={13} /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
              {aiMessages.length === 0 && (
                <div className="text-center py-6 text-zinc-700">
                  <Bot size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-[10px] leading-relaxed">Tell me how to rewrite this slide. I'll update the content automatically.</p>
                </div>
              )}
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
              {aiLoading && (
                <div className="flex gap-2">
                  <div className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0"><Bot size={10} className="text-violet-400" /></div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
