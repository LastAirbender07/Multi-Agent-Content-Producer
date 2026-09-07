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
  starter: {
    title: string;
    body: string;
    stat_value?: string;
    stat_label?: string;
    bullets?: string[];
    compact_meta?: Record<string, unknown>;
  };
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

  // ── Phase 2 Compact family ──────────────────────────────────────────────────
  "aurora-compact-hook": {
    type: "hook", label: "Compact Hook", desc: "Bold cover slide",
    color: "#2DD4BF", emoji: "🎯",
    starter: { title: "Your Big Idea", body: "", compact_meta: {} },
  },
  "aurora-compact-fact": {
    type: "stat", label: "Fact Card", desc: "Single stat reveal",
    color: "#E8B045", emoji: "⚡",
    starter: { title: "", body: "", compact_meta: {} },
  },
  "aurora-compact-fact-compare": {
    type: "stat", label: "Fact Compare", desc: "Side-by-side stats",
    color: "#E8B045", emoji: "⚖️",
    starter: { title: "", body: "", compact_meta: {} },
  },
  "aurora-compact-step": {
    type: "content", label: "Step (Legacy)", desc: "Single tutorial step",
    color: "#3B7EDC", emoji: "📋",
    starter: { title: "", body: "", compact_meta: {} },
  },
  "aurora-compact-step-index": {
    type: "content", label: "Step Index", desc: "Steps overview list",
    color: "#3B7EDC", emoji: "🗺️",
    // image_url → backend resolves to /assets/images/step-bg-terrain.jpg (landscape bg)
    starter: { title: "", body: "", compact_meta: { image_url: "/assets/images/step-bg-terrain.jpg" } },
  },
  "aurora-compact-step-detail": {
    type: "content", label: "Step Detail", desc: "Deep-dive step card",
    color: "#3B7EDC", emoji: "🔍",
    starter: { title: "", body: "", compact_meta: { image_url: "/assets/images/step-bg-terrain.jpg" } },
  },
  "aurora-compact-stat-hero": {
    type: "stat", label: "Stat Hero", desc: "Photo background + stat",
    color: "#F08A3D", emoji: "📸",
    starter: { title: "", body: "", compact_meta: { image_url: "/assets/images/step-bg-terrain.jpg" } },
  },
  "aurora-compact-list-item": {
    type: "content", label: "List", desc: "Ranked list (SahilBloom)",
    color: "#EC4899", emoji: "📝",
    starter: { title: "", body: "", compact_meta: {} },
  },
  "aurora-compact-quote": {
    type: "quote", label: "Compact Quote", desc: "Editorial pull-quote",
    color: "#C47A3C", emoji: "💬",
    // portrait_url → shows a B&W portrait on the right side
    starter: { title: "", body: "", compact_meta: { image_url: "/assets/images/portrait-contrast.jpg" } },
  },

  // ── Phase 2.5 compact-clean gap-fills ─────────────────────────────────────
  "aurora-compact-clean-quote": {
    type: "quote", label: "Compact Quote+", desc: "Cream pull-quote with serif",
    color: "#E8CBA3", emoji: "💬",
    starter: { title: "The secret of getting ahead is getting started.", body: "— Mark Twain", compact_meta: {
      brand_wordmark: "@yourbrand",
    }},
  },
  // ── Phase 2.5 editorial family ────────────────────────────────────────────
  "aurora-editorial-cta": {
    type: "cta", label: "Editorial CTA", desc: "Journal-page closing CTA",
    color: "#1B1B1B", emoji: "✒️",
    starter: { title: "Follow along.\nMore every week.", body: "Follow @yourbrand", compact_meta: {
      handle: "@yourbrand",
      series_title: "Your Series.",
    }},
  },
  "aurora-editorial-hook": {
    type: "hook", label: "Editorial Hook", desc: "Book-page opening slide",
    color: "#1B1B1B", emoji: "📖",
    starter: { title: "The one idea that changed how I think about everything.", body: "A deep-dive into the framework behind it.", compact_meta: {
      handle: "@yourbrand",
      series_title: "Your Series.",
      chapter: "01",
    }},
  },
  "aurora-compact-clean-engage": {
    type: "engage", label: "Compact Engage", desc: "Save/share action prompt",
    color: "#E8CBA3", emoji: "🔖",
    starter: { title: "Save this.", body: "If this helped you, send it to someone who needs it.", compact_meta: {
      pill_text: "SAVE + SHARE",
      brand_wordmark: "@yourbrand",
    }},
  },
  "aurora-compact-clean-cta": {
    type: "cta", label: "Compact CTA", desc: "Clean cream follow CTA",
    color: "#E8CBA3", emoji: "✨",
    starter: { title: "Follow for more", body: "@yourbrand  ·  Every Sunday", compact_meta: {
      pill_text: "FOLLOW FOR MORE",
      brand_wordmark: "@yourbrand",
    }},
  },

  // ── Phase 2.5 nextwork-dark family ───────────────────────────────────────────
  "aurora-nextwork-dark-cta": {
    type: "cta", label: "Dark CTA", desc: "Near-black follow CTA",
    color: "#0D0D0D", emoji: "🌑",
    starter: { title: "Follow for more.", body: "@yourbrand  ·  Every Sunday", compact_meta: {
      pill_text: "FOLLOW FOR MORE",
      brand_wordmark: "@yourbrand",
    }},
  },
  "aurora-nextwork-dark-engage": {
    type: "engage", label: "Dark Engage", desc: "Near-black save/share slide",
    color: "#0D0D0D", emoji: "🌑",
    starter: { title: "Save this.", body: "If this helped you, send it to someone who needs it.", compact_meta: {
      pill_text: "SAVE THIS",
      brand_wordmark: "@yourbrand",
    }},
  },

  // ── Phase 3.5 Aurora Lite family — dark aurora, Instagram-readable ───────────
  "aurora-lite-content": {
    type: "content", label: "Lite Content", desc: "Dark aurora — one idea, big type",
    color: "#7C6EFA", emoji: "💡",
    starter: { title: "One bold statement that changes how you think", body: "The essential context in one sentence." },
  },
  "aurora-lite-quote": {
    type: "quote", label: "Lite Quote", desc: "Dark pull quote, no bullets",
    color: "#2DD4BF", emoji: "💬",
    starter: { title: "The most powerful thing I learned was this.", body: "— Source, Year" },
  },
  // aurora-lite-hook/stat/cta/engage reuse existing aurora templates — no separate metadata needed

  // ── Phase 5 Cover-Hero family ──────────────────────────────────────────────
  "aurora-carousel-cover-hero-phone": {
    type: "hook", label: "Cover: Phone", desc: "Tilted phone mockup cover",
    color: "#7C6EFA", emoji: "📱",
    starter: { title: "", body: "", compact_meta: {} },
  },
  "aurora-carousel-cover-hero-images": {
    type: "hook", label: "Cover: Images", desc: "Image collage cover",
    color: "#7C6EFA", emoji: "🖼️",
    starter: { title: "", body: "", compact_meta: {} },
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

// ── COMPONENTS: draggable component tiles (not registry-driven) ───────────────

export interface ComponentTile {
  id:      string;
  label:   string;
  desc:    string;
  color:   string;
  section: "aurora" | "compact" | "cover";
}

export const COMPONENTS: ComponentTile[] = [
  // ── Aurora Extended primitives ─────────────────────────────────────────────
  { id: "brand-bar",        label: "Brand Bar",         desc: "Logo + progress bar",         color: "#7C6EFA", section: "aurora" },
  { id: "dark-card",        label: "Glass Card",         desc: "Frosted dark card",           color: "#2DD4BF", section: "aurora" },
  { id: "stat-block",       label: "Stat Block",         desc: "Big number + label",          color: "#F59E0B", section: "aurora" },
  { id: "quote-block",      label: "Quote Block",        desc: "Insight dot + text",          color: "#EC4899", section: "aurora" },
  { id: "bullet-list",      label: "Bullet List",        desc: "3 numbered bullets",          color: "#10B981", section: "aurora" },
  { id: "accent-line",      label: "Accent Line",        desc: "Gradient divider bar",        color: "#6366F1", section: "aurora" },
  { id: "eyebrow-pill",     label: "Eyebrow Pill",       desc: "Frosted label (on gradient)", color: "#2DD4BF", section: "aurora" },
  { id: "glow-blob",        label: "Glow Blob",          desc: "Radial gradient atmosphere",  color: "#7C6EFA", section: "aurora" },
  { id: "deco-ring",        label: "Deco Ring",          desc: "Decorative circle outline",   color: "#A0A0A0", section: "aurora" },
  { id: "btn-gradient",     label: "Btn: Gradient",      desc: "Filled aurora gradient",      color: "#7C6EFA", section: "aurora" },
  { id: "btn-ghost",        label: "Btn: Ghost",         desc: "White border, white text",    color: "#A0A0A0", section: "aurora" },
  { id: "btn-frosted-glow", label: "Btn: Frosted Glow",  desc: "Glass + glow shadow",         color: "#2DD4BF", section: "aurora" },
  { id: "btn-solid-white",  label: "Btn: Solid White",   desc: "White pill, gradient text",   color: "#FFFFFF", section: "aurora" },
  { id: "btn-dark-pill",    label: "Btn: Dark Pill",     desc: "Dark center, white border",   color: "#444444", section: "aurora" },
  { id: "btn-dark-gradient",label: "Btn: Dark+Gradient", desc: "Dark fill, gradient text",    color: "#6366F1", section: "aurora" },

  // ── Compact Family primitives ─────────────────────────────────────────────
  { id: "compact-brand-pill",        label: "Brand Pill",          desc: "Dark pill + wordmark",            color: "#1A1A1A", section: "compact" },
  { id: "compact-outlined-pill",     label: "Category Pill",       desc: "Peach ALL-CAPS label pill",       color: "#E8CBA3", section: "compact" },
  { id: "compact-mixed-weight-text", label: "Mixed Weight Text",   desc: "Regular + Black inline mix",      color: "#6B6B6B", section: "compact" },
  { id: "compact-dot-progress",      label: "Dot Progress",        desc: "Slide progress indicator",        color: "#C9C4BD", section: "compact" },
  { id: "compact-number-badge",      label: "Number Badge",        desc: "Outlined circle step number",     color: "#1A1A1A", section: "compact" },
  { id: "compact-editorial-header",  label: "Editorial Header",    desc: "@handle + series title bar",      color: "#3D3D3D", section: "compact" },

  // ── Cover Hero primitives ─────────────────────────────────────────────────
  { id: "cover-phone-mockup",        label: "Tilted Phone",        desc: "iPhone mockup tilted 8°",         color: "#888888", section: "cover" },
  { id: "cover-image-pair",          label: "Image Pair",          desc: "Two photos tilted + overlapping", color: "#888888", section: "cover" },
  { id: "cover-overlay-cards",       label: "Overlay Cards",       desc: "Floating stat cards",             color: "#7C6EFA", section: "cover" },
  { id: "cover-straddling-title",    label: "Straddling Title",    desc: "White card + chip on top edge",   color: "#FFFFFF", section: "cover" },
  { id: "cover-metallic-gradient",   label: "Metallic Gradient",   desc: "Peach-to-warm-brown radial bg",   color: "#C8956C", section: "cover" },
  { id: "cover-display-headline",    label: "Display Headline",    desc: "Inter Black 140pt hero text",     color: "#1A1A1A", section: "cover" },
  { id: "cover-body-text",           label: "Cover Body Text",     desc: "Supporting copy block",           color: "#6B6B6B", section: "cover" },
  { id: "cover-italic-cta",          label: "Italic CTA Line",     desc: "Italic serif CTA / swipe text",  color: "#888888", section: "cover" },
  { id: "cover-polaroid-frame",      label: "Polaroid Frame",      desc: "Photo print — drag image inside", color: "#F5F0E8", section: "cover" },
];

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
