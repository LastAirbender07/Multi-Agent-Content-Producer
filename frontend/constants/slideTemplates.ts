// ── Slide type tiles (full 10-entry version — used by TemplatesPanel) ─────────

export const SLIDE_TYPES = [
  { type: "hook",    label: "Hook",       desc: "Opening slide",   color: "#7C6EFA", emoji: "🎯", template: "aurora-hook" },
  { type: "content", label: "Img Right",  desc: "Text ← Image",    color: "#2DD4BF", emoji: "📝", template: "aurora-content-0" },
  { type: "content", label: "Img Left",   desc: "Image ← Text",    color: "#2DD4BF", emoji: "🔄", template: "aurora-content-3" },
  { type: "content", label: "Img Bottom", desc: "Text ↑ Image",    color: "#2DD4BF", emoji: "📐", template: "aurora-content-1" },
  { type: "content", label: "Img Top",    desc: "Image ↑ Text",    color: "#2DD4BF", emoji: "🖼", template: "aurora-content-2" },
  { type: "content", label: "Text Only",  desc: "No image",        color: "#2DD4BF", emoji: "📄", template: "aurora-content-text" },
  { type: "stat",    label: "Stat",       desc: "Big number",      color: "#F59E0B", emoji: "📊", template: "aurora-stat" },
  { type: "quote",   label: "Quote",      desc: "Pull quote",      color: "#EC4899", emoji: "💬", template: "aurora-quote" },
  { type: "cta",     label: "CTA",        desc: "Call to action",  color: "#10B981", emoji: "🚀", template: "aurora-cta" },
  { type: "engage",  label: "Engage",     desc: "Engagement",      color: "#6366F1", emoji: "✨", template: "aurora-engage" },
] as { type: string; label: string; desc: string; color: string; emoji: string; template: string }[];

// ── Starter content seeded into newly created slides ────────────────────────

export const STARTER_CONTENT: Record<string, { title: string; body: string; stat_value?: string; stat_label?: string }> = {
  hook:    { title: "Your Headline Here", body: "" },
  content: { title: "Your Key Insight", body: "Add 30–55 words of specific insight here. Make it dense, concrete, and actionable for your reader." },
  stat:    { title: "This number changes everything", body: "Here's the context behind why this stat matters.", stat_value: "42%", stat_label: "Key metric label" },
  quote:   { title: "The most powerful thing I learned was this.", body: "— Source, Year" },
  cta:     { title: "Follow for weekly research breakdowns", body: "We turn dense research into 2-minute reads." },
  engage:  { title: "Did this surprise you? Follow for more.", body: "We publish research-backed insights every week." },
};

// ── Draggable component tiles (13 entries — used by TemplatesPanel) ──────────

export const COMPONENTS = [
  // ── Structure ────────────────────────────────────────────────────────────────
  { id: "brand-bar",    label: "Brand Bar",        desc: "Logo + progress bar",        color: "#7C6EFA" },
  { id: "dark-card",    label: "Glass Card",        desc: "Frosted dark card",          color: "#2DD4BF" },
  { id: "stat-block",   label: "Stat Block",        desc: "Big number + label",         color: "#F59E0B" },
  { id: "quote-block",  label: "Quote Block",       desc: "Insight dot + text",         color: "#EC4899" },
  { id: "bullet-list",  label: "Bullet List",       desc: "3 numbered bullets",         color: "#10B981" },
  { id: "accent-line",  label: "Accent Line",       desc: "Gradient divider bar",       color: "#6366F1" },
  { id: "eyebrow-pill", label: "Eyebrow Pill",      desc: "Frosted label (on gradient)",color: "#2DD4BF" },
  // ── Decorative ───────────────────────────────────────────────────────────────
  { id: "glow-blob",    label: "Glow Blob",         desc: "Radial gradient atmosphere", color: "#7C6EFA" },
  { id: "deco-ring",    label: "Deco Ring",         desc: "Decorative circle outline",  color: "#A0A0A0" },
  // ── Buttons — all 6 styles ───────────────────────────────────────────────────
  { id: "btn-gradient",     label: "Btn: Gradient",    desc: "Filled aurora gradient",     color: "#7C6EFA" },
  { id: "btn-ghost",        label: "Btn: Ghost",        desc: "White border, white text",   color: "#A0A0A0" },
  { id: "btn-frosted-glow", label: "Btn: Frosted Glow", desc: "Glass + glow shadow",        color: "#2DD4BF" },
  { id: "btn-solid-white",  label: "Btn: Solid White",  desc: "White pill, gradient text",  color: "#FFFFFF" },
  { id: "btn-dark-pill",    label: "Btn: Dark Pill",    desc: "Dark center, white border",  color: "#444444" },
  { id: "btn-dark-gradient",label: "Btn: Dark+Gradient", desc: "Dark fill, gradient text",  color: "#6366F1" },
] as const;

// ── Quick-start strip (simplified 6-entry version — used by EditorLeftPanel) ─

export const SLIDE_TEMPLATES = [
  { type: "hook",    label: "Hook",    desc: "Bold opening",     color: "#7C6EFA" },
  { type: "content", label: "Content", desc: "Text + image",     color: "#2DD4BF" },
  { type: "stat",    label: "Stat",    desc: "Big number",       color: "#F59E0B" },
  { type: "quote",   label: "Quote",   desc: "Pull quote",       color: "#EC4899" },
  { type: "cta",     label: "CTA",     desc: "Call to action",   color: "#10B981" },
  { type: "engage",  label: "Engage",  desc: "Engagement slide", color: "#6366F1" },
] as const;
