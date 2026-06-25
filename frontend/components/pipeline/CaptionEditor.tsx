"use client";
import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Loader2, RefreshCw, Hash, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";

const IG_CAPTION_MAX = 2200;
const IG_HASHTAG_MAX = 30;
const HOOK_CHARS = 125;

interface CaptionEditorProps {
  open: boolean;
  onClose: () => void;
  runId: string;
  angleIndex: number;
  angleStatement?: string;
}

export function CaptionEditor({ open, onClose, runId, angleIndex, angleStatement }: CaptionEditorProps) {
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copying, setCopying] = useState<"caption" | "hashtags" | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load on open
  useEffect(() => {
    if (!open || !runId) return;
    setLoading(true);
    setLoadError(null);
    api.getCaption(runId, angleIndex)
      .then(data => {
        setCaption(data.caption);
        setHashtags(data.hashtags);
      })
      .catch(() => setLoadError("Could not load caption — backend may be offline"))
      .finally(() => setLoading(false));
  }, [open, runId, angleIndex]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.updateCaption(runId, angleIndex, caption, hashtags);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [runId, angleIndex, caption, hashtags]);

  const copyText = useCallback(async (type: "caption" | "hashtags") => {
    const text = type === "caption"
      ? caption
      : hashtags.map(h => `#${h}`).join(" ");
    await navigator.clipboard.writeText(text);
    setCopying(type);
    setTimeout(() => setCopying(null), 1500);
  }, [caption, hashtags]);

  const addTag = useCallback(() => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (!tag || hashtags.includes(tag)) return;
    setHashtags(prev => [...prev, tag]);
    setTagInput("");
  }, [tagInput, hashtags]);

  const removeTag = useCallback((tag: string) => {
    setHashtags(prev => prev.filter(h => h !== tag));
  }, []);

  // Metrics
  const charCount = caption.length;
  const charOver = charCount > IG_CAPTION_MAX;
  const hashOver = hashtags.length > IG_HASHTAG_MAX;
  const hookPreview = caption.slice(0, HOOK_CHARS);
  const hookCut = caption.length > HOOK_CHARS;

  function charBarColor() {
    if (charCount > IG_CAPTION_MAX) return "bg-red-500";
    if (charCount > 1800) return "bg-amber-500";
    return "bg-emerald-500";
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
              <div>
                <p className="text-sm font-black text-white tracking-tight">Edit Caption</p>
                {angleStatement && (
                  <p className="text-[10px] text-zinc-600 mt-0.5 font-medium line-clamp-1 max-w-md">{angleStatement}</p>
                )}
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                <X size={13} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={20} className="text-violet-500 animate-spin" />
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
                <p className="text-xs font-bold text-red-400 text-center">{loadError}</p>
                <button onClick={onClose} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Dismiss</button>
              </div>
            ) : (
              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

                {/* Caption textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <Type size={11} />
                      Caption
                    </label>
                    <button
                      onClick={() => copyText("caption")}
                      className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 hover:text-violet-400 transition-colors"
                    >
                      {copying === "caption" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copying === "caption" ? "Copied!" : "Copy"}
                    </button>
                  </div>

                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={8}
                    className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all leading-relaxed"
                  />

                  {/* Char counter bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className={charOver ? "text-red-400" : "text-zinc-600"}>
                        {charCount.toLocaleString()} / {IG_CAPTION_MAX.toLocaleString()} chars
                        {charOver && " — over limit!"}
                      </span>
                      <span className="text-zinc-700">First {HOOK_CHARS} chars shown before "more"</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${charBarColor()}`}
                        style={{ width: `${Math.min(100, (charCount / IG_CAPTION_MAX) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Hook preview */}
                  {hookCut && (
                    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Hook preview (visible before "more")</p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{hookPreview}<span className="text-zinc-700">…</span></p>
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <Hash size={11} />
                      Hashtags
                      <span className={`ml-1 ${hashOver ? "text-red-400" : "text-zinc-700"}`}>
                        {hashtags.length} / {IG_HASHTAG_MAX}
                      </span>
                    </label>
                    <button
                      onClick={() => copyText("hashtags")}
                      className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 hover:text-violet-400 transition-colors"
                    >
                      {copying === "hashtags" ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copying === "hashtags" ? "Copied!" : "Copy all"}
                    </button>
                  </div>

                  {/* Tag chips */}
                  <div className="flex flex-wrap gap-1.5 min-h-10 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                    {hashtags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700/50 text-[11px] font-bold text-zinc-300 group"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-0.5"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    {hashtags.length === 0 && (
                      <span className="text-[11px] text-zinc-700 self-center">No hashtags yet</span>
                    )}
                  </div>

                  {/* Add tag input */}
                  {hashtags.length < IG_HASHTAG_MAX && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        placeholder="Add hashtag… (Enter to add)"
                        className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 transition-all"
                      />
                      <button
                        onClick={addTag}
                        disabled={!tagInput.trim()}
                        className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  )}
                  {hashOver && (
                    <p className="text-[10px] font-bold text-red-400">
                      Over {IG_HASHTAG_MAX} hashtags — excess may cause shadowban
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  {saveError && (
                    <p className="text-[11px] font-bold text-red-400 text-center">{saveError}</p>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-black transition-all"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
                    {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
                  </button>
                </div>

              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
