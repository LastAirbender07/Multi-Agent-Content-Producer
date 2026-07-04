/**
 * Slide template constants for the editor UI.
 *
 * SLIDE_TYPES is derived from REGISTRY keys — adding a new builder to
 * REGISTRY automatically makes it appear in the editor's template picker.
 * To control the label/emoji/colour shown in the UI, add an entry to
 * TEMPLATE_METADATA below. If you don't, sensible defaults are generated.
 */

import { REGISTRY } from "@/utils/canvasTemplates/index";

// ── Per-template UI metadata ─────────────────────────────────────────────────
// Only aurora-* keys need entries here — lumina variants are filtered out
// since they share the same visual type as their aurora counterpart.
// Keys not listed here receive auto-generated defaults and still appear.

interface TemplateMeta {
  type:    string;   // the slide type sent to the backend (e.g. "hook")
  label:   string;   // display name in the tile
  desc:    string;   // one-line description in the tile
  color:   string;   // accent colour (used for the tile's top stripe)
  emoji:   string;   // icon shown in the tile
  starter: { title: string; body: string; stat_value?: string; stat_label?: string; bullets?: string[] };
}

const TEMPLATE_METADATA: Record<string, TemplateMeta> = {
  "aurora-hook": {
    type: "hook", label: "Hook", desc: "Opening slide",
    color: "#7C6EFA", emoji: "🎯",
    starter: { title: "Your Headline Here", body: "" },
  },
  "aurora-content-0": {
    type: "content", label: "Img Right", desc: "Text ← Image",
    color: "#2DD4BF", emoji: "📝",
    starter: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  },
  "aurora-content-3": {
    type: "content", label: "Img Left", desc: "Image → Text",
    color: "#2DD4BF", emoji: "🔄",
    starter: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  },
  "aurora-content-1": {
    type: "content", label: "Img Bottom", desc: "Text ↑ Image",
    color: "#2DD4BF", emoji: "📐",
    starter: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  },
  "aurora-content-2": {
    type: "content", label: "Img Top", desc: "Image ↑ Text",
    color: "#2DD4BF", emoji: "🖼",
    starter: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  },
  "aurora-content-text": {
    type: "content", label: "Text Only", desc: "No image",
    color: "#2DD4BF", emoji: "📄",
    starter: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  },
  "aurora-stat": {
    type: "stat", label: "Stat", desc: "Big number",
    color: "#F59E0B", emoji: "📊",
    starter: { title: "This number changes everything", body: "Here's the context behind why this stat matters.", stat_value: "42%", stat_label: "Key metric label" },
  },
  "aurora-quote": {
    type: "quote", label: "Quote", desc: "Pull quote",
    color: "#EC4899", emoji: "💬",
    starter: { title: "The most powerful thing I learned was this.", body: "— Source, Year" },
  },
  "aurora-cta": {
    type: "cta", label: "CTA", desc: "Call to action",
    color: "#10B981", emoji: "🚀",
    starter: { title: "Follow for weekly research breakdowns", body: "We turn dense research into 2-minute reads." },
  },
  "aurora-engage": {
    type: "engage", label: "Engage", desc: "Engagement",
    color: "#6366F1", emoji: "✨",
    starter: { title: "Did this surprise you? Follow for more.", body: "We publish research-backed insights every week." },
  },
};

// ── Auto-generate metadata for any REGISTRY key not explicitly listed ─────────

function inferType(key: string): string {
  // "aurora-checklist" → "checklist", "aurora-content-0" → "content"
  const withoutTheme = key.replace(/^(aurora|lumina)-/, "");
  return withoutTheme.replace(/-\d+$/, "").replace(/-text$/, "");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function autoMeta(key: string): TemplateMeta {
  const type  = inferType(key);
  const label = capitalize(type);
  return {
    type,
    label,
    desc:    `${label} slide`,
    color:   "#9CA3AF",   // neutral gray for unregistered types
    emoji:   "🗂",
    starter: { title: `New ${label} slide`, body: "" },
  };
}

// ── SLIDE_TYPES: full tile grid — derived from REGISTRY keys ─────────────────
// Includes every aurora-* key. New builders appear automatically.
// Lumina variants are excluded — they share the same type as aurora equivalents.

export type SlideTypeTile = {
  type:     string;
  label:    string;
  desc:     string;
  color:    string;
  emoji:    string;
  template: string;
};

export const SLIDE_TYPES: SlideTypeTile[] = Object.keys(REGISTRY)
  .filter(key => key.startsWith("aurora-"))
  .map(key => {
    const meta = TEMPLATE_METADATA[key] ?? autoMeta(key);
    return {
      type:     meta.type,
      label:    meta.label,
      desc:     meta.desc,
      color:    meta.color,
      emoji:    meta.emoji,
      template: key,
    };
  });

// ── STARTER_CONTENT: seeded into newly created slides ────────────────────────
// Derived from the same metadata map — starter content follows the template.

export const STARTER_CONTENT: Record<string, TemplateMeta["starter"]> = Object.fromEntries(
  Object.keys(REGISTRY)
    .filter(key => key.startsWith("aurora-"))
    .map(key => {
      const meta = TEMPLATE_METADATA[key] ?? autoMeta(key);
      // Key by template ID so caller can look up per variant (e.g. "aurora-content-0")
      // AND by slide type (e.g. "content") as fallback
      return [key, meta.starter];
    })
    .concat(
      // Also expose by slide type for backward compat (TemplatesPanel uses slideType as fallback key)
      Object.values(TEMPLATE_METADATA).map(m => [m.type, m.starter])
    )
);

// ── COMPONENTS: draggable component tiles (unchanged — not registry-driven) ──

export const COMPONENTS = [
  { id: "brand-bar",        label: "Brand Bar",         desc: "Logo + progress bar",         color: "#7C6EFA" },
  { id: "dark-card",        label: "Glass Card",         desc: "Frosted dark card",           color: "#2DD4BF" },
  { id: "stat-block",       label: "Stat Block",         desc: "Big number + label",          color: "#F59E0B" },
  { id: "quote-block",      label: "Quote Block",        desc: "Insight dot + text",          color: "#EC4899" },
  { id: "bullet-list",      label: "Bullet List",        desc: "3 numbered bullets",          color: "#10B981" },
  { id: "accent-line",      label: "Accent Line",        desc: "Gradient divider bar",        color: "#6366F1" },
  { id: "eyebrow-pill",     label: "Eyebrow Pill",       desc: "Frosted label (on gradient)", color: "#2DD4BF" },
  { id: "glow-blob",        label: "Glow Blob",          desc: "Radial gradient atmosphere",  color: "#7C6EFA" },
  { id: "deco-ring",        label: "Deco Ring",          desc: "Decorative circle outline",   color: "#A0A0A0" },
  { id: "btn-gradient",     label: "Btn: Gradient",      desc: "Filled aurora gradient",      color: "#7C6EFA" },
  { id: "btn-ghost",        label: "Btn: Ghost",         desc: "White border, white text",    color: "#A0A0A0" },
  { id: "btn-frosted-glow", label: "Btn: Frosted Glow",  desc: "Glass + glow shadow",         color: "#2DD4BF" },
  { id: "btn-solid-white",  label: "Btn: Solid White",   desc: "White pill, gradient text",   color: "#FFFFFF" },
  { id: "btn-dark-pill",    label: "Btn: Dark Pill",     desc: "Dark center, white border",   color: "#444444" },
  { id: "btn-dark-gradient",label: "Btn: Dark+Gradient", desc: "Dark fill, gradient text",    color: "#6366F1" },
] as const;

// ── SLIDE_TEMPLATES: curated quick-strip (EditorLeftPanel) ───────────────────
// This is intentionally a short hand-picked list for fast access — not auto-derived.
// It shows one representative tile per slide category, not every layout variant.

export const SLIDE_TEMPLATES = [
  { type: "hook",    label: "Hook",    desc: "Bold opening",     color: "#7C6EFA" },
  { type: "content", label: "Content", desc: "Text + image",     color: "#2DD4BF" },
  { type: "stat",    label: "Stat",    desc: "Big number",       color: "#F59E0B" },
  { type: "quote",   label: "Quote",   desc: "Pull quote",       color: "#EC4899" },
  { type: "cta",     label: "CTA",     desc: "Call to action",   color: "#10B981" },
  { type: "engage",  label: "Engage",  desc: "Engagement slide", color: "#6366F1" },
] as const;
