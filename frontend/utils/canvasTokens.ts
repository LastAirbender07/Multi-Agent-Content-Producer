export interface CanvasTokens {
  bg: string;        surface: string;
  primary: string;   secondary: string;  accent: string;
  text: string;      muted: string;
  fontTitle: string; fontBody: string;
  brandBarH: number; progressH: number;
  canvasSize: number;
}

export const AURORA: CanvasTokens = {
  bg: "#090909",      surface: "#131313",
  primary: "#7C6EFA", secondary: "#2DD4BF", accent: "#F59E0B",
  text: "#FAFAFA",    muted: "rgba(250,250,250,0.78)",  // matches Jinja2 CSS: body 0.76, bullets 0.80
  fontTitle: "Syne",  fontBody: "Plus Jakarta Sans",
  brandBarH: 72,      progressH: 2,  canvasSize: 1080,
};

export const LUMINA: CanvasTokens = {
  bg: "#FAFAF8",      surface: "#FFFFFF",
  primary: "#1E40AF", secondary: "#0D9488", accent: "#D97706",
  text: "#111827",    muted: "#6B7280",
  fontTitle: "Syne",  fontBody: "Plus Jakarta Sans",
  brandBarH: 72,      progressH: 2,  canvasSize: 1080,
};

// Chart palettes — match Jinja2 template colors exactly
export const CHART_COLORS = {
  aurora: ["#7C6EFA","#2DD4BF","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#10B981","#F97316"],
  lumina: ["#1E40AF","#0D9488","#D97706","#DC2626","#7C3AED","#0284C7","#059669","#EA580C"],
};

export interface ChartPalette {
  COLORS: string[];
  TICK:   string;
  GRID:   string;
  LABEL:  string;
  BG:     string;
}

export const CHART_PALETTE: Record<"aurora" | "lumina", ChartPalette> = {
  aurora: {
    COLORS: CHART_COLORS.aurora,
    TICK:   "rgba(250,250,250,0.65)",
    GRID:   "rgba(255,255,255,0.08)",
    LABEL:  "rgba(250,250,250,0.80)",
    BG:     "#131313",
  },
  lumina: {
    COLORS: CHART_COLORS.lumina,
    TICK:   "rgba(10,10,10,0.55)",
    GRID:   "rgba(0,0,0,0.08)",
    LABEL:  "rgba(10,10,10,0.70)",
    BG:     "#FFFFFF",
  },
};

export function isDarkTheme(t: CanvasTokens): boolean {
  return t.bg.startsWith("#0") || t.bg.startsWith("#1");
}

export function getTokens(templateId: string): CanvasTokens {
  return templateId.startsWith("lumina") ? LUMINA : AURORA;
}

export function applyOverrides(t: CanvasTokens, o: Record<string, string> = {}): CanvasTokens {
  const r = { ...t };
  if (o.accent_color) r.primary = o.accent_color;
  if (o.title_color)  r.text    = o.title_color;
  return r;
}
