"use client";
import { useState, useEffect } from "react";
import { Settings, Building2, Sliders, Key, Save, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import type { SettingsResponse } from "@/lib/api";

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ icon: Icon, iconColor, title, children }: {
  icon: React.ElementType; iconColor: string; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon size={17} />
        </div>
        <h2 className="text-sm font-black text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-zinc-700">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
    />
  );
}

function Chips({ options, value, onChange, recommended }: {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (v: string | number) => void;
  recommended?: string | number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            value === opt.value
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
          }`}
        >
          {opt.label}
          {recommended === opt.value && value !== opt.value && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>
      ))}
    </div>
  );
}

function MaskedKeyField({ label, configured, onSave }: {
  label: string; configured: boolean; onSave: (v: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    await onSave(value.trim());
    setSaving(false); setSaved(true); setEditing(false); setValue("");
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{label}</label>
      {!editing ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-zinc-500 font-mono">
            {configured ? "sk-••••••••••••••••••••••" : <span className="text-zinc-700 italic">not configured</span>}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-all"
          >
            {configured ? "Replace" : "Add"}
          </button>
          {saved && <span className="text-emerald-400 text-xs"><Check size={12} className="inline" /> Saved</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type={show ? "text" : "password"}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") { setEditing(false); setValue(""); } }}
              placeholder="Paste API key…"
              autoFocus
              className="w-full bg-zinc-800/60 border border-violet-500/60 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none pr-10"
            />
            <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button onClick={handleSave} disabled={!value.trim() || saving}
            className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold transition-all">
            {saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setValue(""); }} className="text-zinc-600 hover:text-zinc-400">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local editable state
  const [brandName, setBrandName] = useState("");
  const [igUrl, setIgUrl] = useState("");
  const [igHandle, setIgHandle] = useState("");
  const [mediumUrl, setMediumUrl] = useState("");
  const [maxSlides, setMaxSlides] = useState<number>(10);
  const [researchMode, setResearchMode] = useState("standard");
  const [researchFreshness, setResearchFreshness] = useState("recent");

  useEffect(() => {
    api.getSettings()
      .then(d => {
        setData(d);
        setBrandName(d.brand.brand_name);
        setIgUrl(d.brand.instagram_url);
        setIgHandle(d.brand.instagram_handle);
        setMediumUrl(d.brand.medium_url);
        setMaxSlides(d.content_defaults.max_slides);
        setResearchMode(d.content_defaults.research_mode);
        setResearchFreshness(d.content_defaults.research_freshness);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        brand_name: brandName,
        instagram_url: igUrl,
        instagram_handle: igHandle,
        medium_url: mediumUrl,
        content_max_slides: maxSlides,
        research_default_mode: researchMode,
        research_default_freshness: researchFreshness,
      });
      setData(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function saveApiKey(field: string, value: string) {
    const updated = await api.updateSettings({ [field]: value });
    setData(updated);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-black">
      <Loader2 size={24} className="text-violet-400 animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 overflow-auto bg-black custom-scrollbar">
      <div className="max-w-3xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Settings</h1>
            <p className="text-zinc-500 text-sm font-medium mt-1">Brand config, content defaults, API keys</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Brand Identity */}
        <Section icon={Building2} iconColor="bg-violet-600/10 border border-violet-500/20 text-violet-400" title="Brand Identity">
          <Field label="Brand Name" hint="Shown in the brand bar on every slide">
            <TextInput value={brandName} onChange={setBrandName} placeholder="e.g. TheOpinionBoard" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instagram Handle">
              <TextInput value={igHandle} onChange={setIgHandle} placeholder="@YourHandle" />
            </Field>
            <Field label="Instagram URL">
              <TextInput value={igUrl} onChange={setIgUrl} placeholder="https://instagram.com/..." />
            </Field>
          </div>
          <Field label="Medium URL">
            <TextInput value={mediumUrl} onChange={setMediumUrl} placeholder="https://medium.com/@..." />
          </Field>
        </Section>

        {/* Content Defaults */}
        <Section icon={Sliders} iconColor="bg-amber-600/10 border border-amber-500/20 text-amber-400" title="Content Defaults">
          <Field label="Default Slide Count" hint="10 = single Instagram post · 12 = needs splitting">
            <Chips
              options={[
                { label: "5", value: 5 }, { label: "7", value: 7 },
                { label: "10", value: 10 }, { label: "12", value: 12 },
              ]}
              value={maxSlides}
              onChange={v => setMaxSlides(v as number)}
              recommended={10}
            />
          </Field>
          <Field label="Research Depth">
            <Chips
              options={[
                { label: "Quick", value: "quick" },
                { label: "Standard", value: "standard" },
                { label: "Deep", value: "deep" },
              ]}
              value={researchMode}
              onChange={v => setResearchMode(v as string)}
              recommended="standard"
            />
          </Field>
          <Field label="Content Freshness">
            <Chips
              options={[
                { label: "Breaking", value: "breaking" },
                { label: "Recent", value: "recent" },
                { label: "Evergreen", value: "evergreen" },
              ]}
              value={researchFreshness}
              onChange={v => setResearchFreshness(v as string)}
              recommended="recent"
            />
          </Field>
        </Section>

        {/* API Keys */}
        <Section icon={Key} iconColor="bg-emerald-600/10 border border-emerald-500/20 text-emerald-400" title="API Keys">
          <p className="text-xs text-zinc-600">Keys are stored in <code className="text-zinc-500">settings_overrides.json</code> on the server. They are never returned unmasked.</p>
          <MaskedKeyField
            label="Pexels API Key"
            configured={data?.api_keys_configured.pexels ?? false}
            onSave={v => saveApiKey("pexels_api_key", v)}
          />
          <MaskedKeyField
            label="NewsAPI Key"
            configured={data?.api_keys_configured.newsapi ?? false}
            onSave={v => saveApiKey("newsapi_api_key", v)}
          />
        </Section>

      </div>
    </div>
  );
}
