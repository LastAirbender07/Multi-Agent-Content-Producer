"use client";
import { Save, Loader2 } from "lucide-react";
import type { SlideSnapshot } from "@/types/slideEditor";

const SLIDE_TYPES = ["hook", "content", "stat", "quote", "cta", "engage"] as const;
const FONT_SIZES = { xs: "28px", sm: "36px", md: "44px", lg: "52px", xl: "64px" };
const ACCENT_PRESETS = ["#7C6EFA", "#2DD4BF", "#F59E0B", "#EF4444", "#10B981", "#F97316", "#EC4899", "#3B82F6"];
const TEXT_COLORS = ["#FAFAFA", "#D4D4D8", "#A1A1AA", "#FDE68A", "#BAE6FD", "#FFFFFF"];

interface StyleTabProps {
  snap: SlideSnapshot;
  setField: <K extends keyof SlideSnapshot>(key: K, val: SlideSnapshot[K], markDirty?: boolean) => void;
  styleDirty: boolean;
  styleSaving: boolean;
  onStyleSave: () => void;
  Field: ({ label, children }: { label: string; children: React.ReactNode }) => React.ReactElement;
}

export function StyleTab({ snap, setField, styleDirty, styleSaving, onStyleSave, Field }: StyleTabProps) {
  return (
    <>
      <Field label="Font Size">
        <div className="flex gap-1 flex-wrap">
          {Object.keys(FONT_SIZES).map(k => (
            <button key={k} onClick={() => setField("titleSize", k, true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${snap.titleSize === k ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Title Color">
        <div className="flex gap-2 flex-wrap">
          {TEXT_COLORS.map(c => (
            <button key={c} onClick={() => setField("titleColor", c, true)} style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${snap.titleColor === c ? "border-violet-500 scale-110" : "border-zinc-700"}`} />
          ))}
          <input type="color" value={snap.titleColor} onChange={e => setField("titleColor", e.target.value, true)} className="w-7 h-7 rounded-lg cursor-pointer border border-zinc-700 bg-transparent" />
        </div>
      </Field>
      <Field label="Accent Color">
        <div className="flex gap-2 flex-wrap">
          {ACCENT_PRESETS.map(c => (
            <button key={c} onClick={() => setField("accentColor", c, true)} style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${snap.accentColor === c ? "border-white scale-110" : "border-transparent"}`} />
          ))}
          <input type="color" value={snap.accentColor} onChange={e => setField("accentColor", e.target.value, true)} className="w-7 h-7 rounded-lg cursor-pointer border border-zinc-700 bg-transparent" />
        </div>
      </Field>
      <Field label="Slide Type">
        <div className="flex gap-1 flex-wrap">
          {SLIDE_TYPES.map(t => (
            <button key={t} onClick={() => setField("selectedType", t, true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${snap.selectedType === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Theme">
        <div className="flex gap-2">
          {["aurora", "lumina"].map(t => (
            <button key={t} onClick={() => setField("selectedTheme", t, true)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${snap.selectedTheme === t ? "bg-violet-600 text-white" : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200"}`}>
              {t === "aurora" ? "🌑 Aurora" : "☀️ Lumina"}
            </button>
          ))}
        </div>
      </Field>
      {styleDirty && (
        <button onClick={onStyleSave} disabled={styleSaving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all">
          {styleSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {styleSaving ? "Saving…" : "Save Style Changes"}
        </button>
      )}
    </>
  );
}

export { FONT_SIZES };
