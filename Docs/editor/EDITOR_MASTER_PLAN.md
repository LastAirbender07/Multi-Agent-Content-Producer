# Canvas Editor & Chart System — Master Implementation Plan

> Written: 2026-06-18 (merged from CANVAS_TEMPLATE_SYSTEM_PLAN.md + CHART_EDITOR_PLAN.md)  
> Status: Approved for implementation  
> Supersedes: Both previous documents

---

## 0. Problem Statement

```
Today:
  Pipeline  → slides.json → Jinja2 → Playwright PNG → read-only preview
  Editor    → slides.json → generic Fabric textboxes → looks nothing like the PNG

Target:
  Pipeline  → slides.json → Jinja2 → Playwright PNG  (unchanged, export only)
  Editor    → slides.json → Fabric canvas templates  (pixel-faithful + fully editable)
  User      → any slide   → insert/edit own charts   (full data editor, 13 chart types)
```

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CANVAS EDITOR                                    │
│                                                                       │
│  ┌──────────────┐  ┌──────────────────────────────┐  ┌───────────┐ │
│  │ Left Panel   │  │ FabricCanvas (1080×1080)      │  │ Right     │ │
│  │              │  │                               │  │ Panel     │ │
│  │ • Files      │  │  [bg_image]                   │  │           │ │
│  │ • Images     │  │  [bg_overlay]                 │  │ Text:     │ │
│  │ • Templates  │  │  [glass_card]                 │  │  font/sz  │ │
│  │   ├ Slides   │  │  [hook_headline]  ←selected   │  │  color    │ │
│  │   ├ Charts   │  │  [hook_sub]                   │  │           │ │
│  │   └ My saved │  │  [brand_bar]                  │  │ Image:    │ │
│  │              │  │                               │  │  opacity  │ │
│  │              │  │  ContextToolbar ↑ (floating)  │  │  filters  │ │
│  │              │  │                               │  │           │ │
│  └──────────────┘  └──────────────────────────────┘  │ Chart:    │ │
│                                                        │  type     │ │
│  CanvasToolbar: breadcrumb · undo · redo · Save ·     │  data tbl │ │
│                Export PNG · zoom                       │  preview  │ │
└─────────────────────────────────────────────────────────────────────┘
```

**Three concerns, cleanly separated:**

| Layer | What | Files |
|---|---|---|
| **Data** | Token system, chart types, slide schema | `canvasTokens.ts`, `types/chart.ts` |
| **Render** | Templates, charts, shared components | `canvasTemplates/*` |
| **UI** | Panels, toolbar, editor interactions | `components/editor/*` |

---

## 2. Shared Foundations (Build First)

### 2.1 Design Tokens — `frontend/utils/canvasTokens.ts`

```typescript
export interface CanvasTokens {
  bg: string;       surface: string;
  primary: string;  secondary: string;  accent: string;
  text: string;     muted: string;
  fontTitle: string; fontBody: string;
  brandBarH: number; progressH: number;
  canvasSize: number;
}

export const AURORA: CanvasTokens = {
  bg: "#090909",      surface: "#131313",
  primary: "#7C6EFA", secondary: "#2DD4BF", accent: "#F59E0B",
  text: "#FAFAFA",    muted: "#71717A",
  fontTitle: "Syne",  fontBody: "Plus Jakarta Sans",
  brandBarH: 72, progressH: 2, canvasSize: 1080,
};

export const LUMINA: CanvasTokens = {
  bg: "#F8F8F6",      surface: "#FFFFFF",
  primary: "#7C6EFA", secondary: "#2DD4BF", accent: "#F59E0B",
  text: "#0A0A0A",    muted: "#71717A",
  fontTitle: "Syne",  fontBody: "Plus Jakarta Sans",
  brandBarH: 72, progressH: 2, canvasSize: 1080,
};

export const CHART_COLORS = {
  aurora: ["#7C6EFA","#2DD4BF","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#10B981","#F97316"],
  lumina: ["#7C6EFA","#0D9488","#D97706","#DC2626","#7C3AED","#0284C7","#059669","#EA580C"],
};

export const CHART_PALETTE = {
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

export function getTokens(templateId: string): CanvasTokens {
  return templateId.startsWith("lumina") ? LUMINA : AURORA;
}

export function applyOverrides(t: CanvasTokens, o: Record<string, string> = {}): CanvasTokens {
  const r = { ...t };
  if (o.accent_color) r.primary   = o.accent_color;
  if (o.title_color)  r.text      = o.title_color;
  return r;
}
```

### 2.2 Chart Types — `frontend/types/chart.ts`

```typescript
// ALL chart types — used by AI pipeline AND user-created charts
export type ChartType =
  // Tier 1: AI-generated (already in Jinja2 templates)
  | "bar" | "column" | "line" | "donut" | "radar" | "funnel"
  // Tier 2: User-created (new — Chart.js)
  | "area" | "stacked-bar" | "stacked-column" | "comparison" | "scatter" | "bubble"
  // Tier 3: User-created (Fabric Group, no Chart.js)
  | "progress" | "number-stat";

export interface ChartSeries   { label: string; values: number[]; color?: string; }
export interface ScatterPoint  { x: number; y: number; label?: string; }
export interface BubblePoint   { x: number; y: number; r: number; label?: string; }

export interface ChartData {
  // Universal (single-series charts)
  labels:  string[];
  values:  number[];
  // Multi-series: stacked-bar, stacked-column, comparison, radar
  series?: ChartSeries[];
  // Scatter / Bubble
  points?: ScatterPoint[] | BubblePoint[];
  // number-stat
  statValue?:   string;   // e.g. "₹1.1 Lakh Cr"
  statLabel?:   string;   // e.g. "EdTech market size"
  statContext?: string;   // e.g. "Source: KPMG 2024"
  // progress
  progressItems?: Array<{ label: string; value: number; max?: number }>;
  // Styling overrides (optional)
  colors?:     string[];  // per-bar/series color overrides
  showLegend?: boolean;
  showGrid?:   boolean;
  unit?:       string;    // "%" | "$" | "K"
  title?:      string;    // chart title above the chart
}

// Stored on every Fabric chart object's .data property
export interface ChartObjectData {
  role:       "chart";
  chartType:  ChartType;
  chartData:  ChartData;
  theme:      "aurora" | "lumina";
  width:      number;
  height:     number;
}
```

### 2.3 Font Loader — `frontend/utils/canvasFonts.ts`

```typescript
const BASE  = "http://localhost:8000";
const FONTS = [
  { family: "Syne",              weight: "700", path: "/assets/fonts/Syne-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "700", path: "/assets/fonts/PlusJakartaSans-Bold.woff2" },
  { family: "Plus Jakarta Sans", weight: "600", path: "/assets/fonts/PlusJakartaSans-SemiBold.woff2" },
  { family: "Plus Jakarta Sans", weight: "400", path: "/assets/fonts/PlusJakartaSans-Regular.woff2" },
];
let _loaded = false;

export async function loadCanvasFonts(): Promise<void> {
  if (_loaded) return;
  await Promise.all(FONTS.map(async ({ family, weight, path }) => {
    const face = new FontFace(family, `url(${BASE}${path})`, { weight });
    document.fonts.add(await face.load());
  }));
  _loaded = true;
}
```

### 2.4 CSV Parser — `frontend/utils/parseChartCsv.ts`

```typescript
import type { ChartData, ScatterPoint, BubblePoint } from "@/types/chart";

export function parseChartCsv(csv: string): Partial<ChartData> {
  const rows = csv.trim().split("\n").map(l => l.split(",").map(c => c.trim()));
  if (rows.length < 2) return {};
  const [header, ...data] = rows;

  // x,y or x,y,r → scatter/bubble
  if (header.length === 2 && !isNaN(Number(data[0]?.[0]))) {
    return { points: data.map(r => ({ x: Number(r[0]), y: Number(r[1]) } as ScatterPoint)) };
  }
  if (header.length === 3 && !isNaN(Number(data[0]?.[0]))) {
    return { points: data.map(r => ({ x: Number(r[0]), y: Number(r[1]), r: Number(r[2]) } as BubblePoint)) };
  }
  // Label,Value → single series
  if (header.length === 2) {
    return { labels: data.map(r => r[0]), values: data.map(r => Number(r[1])) };
  }
  // Label,S1,S2,... → multi-series
  return {
    labels: data.map(r => r[0]),
    values: data.map(r => Number(r[1])),
    series: header.slice(1).map((name, si) => ({
      label: name,
      values: data.map(r => Number(r[si + 1])),
    })),
  };
}
```

---

## 3. Chart Rendering — `frontend/utils/canvasTemplates/chartRenderer.ts`

**Single file. Used by both AI-generated templates AND user-created charts.**

```typescript
import { Chart, registerables } from "chart.js";
import * as fabric from "fabric";
import { CHART_PALETTE } from "@/utils/canvasTokens";
import type { ChartType, ChartData, ChartObjectData } from "@/types/chart";
import type { CanvasTokens } from "@/utils/canvasTokens";

Chart.register(...registerables);

// ── Chart.js types (Tier 1 + 2) ────────────────────────────────────────────

export async function renderChartToDataURL(
  chartType: ChartType,
  chartData: ChartData,
  theme: "aurora" | "lumina" = "aurora",
  width = 952,
  height = 440,
): Promise<string> {
  if (["funnel", "progress", "number-stat"].includes(chartType)) {
    throw new Error(`${chartType} is a Fabric Group, not a Chart.js chart. Use createChartGroup() instead.`);
  }

  const palette = CHART_PALETTE[theme];
  const canvas  = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  canvas.style.cssText = `position:fixed;left:-9999px;top:-9999px;background:${palette.BG}`;
  document.body.appendChild(canvas);

  const instance = new Chart(canvas, buildConfig(chartType, chartData, palette));
  await new Promise<void>(r => requestAnimationFrame(() => r()));

  const dataUrl = canvas.toDataURL("image/png");
  instance.destroy();
  document.body.removeChild(canvas);
  return dataUrl;
}

export async function createChartFabricImage(
  chartType: ChartType,
  chartData: ChartData,
  theme: "aurora" | "lumina",
  opts: { left: number; top: number; width?: number; height?: number },
): Promise<fabric.FabricImage> {
  const w = opts.width  ?? defaultSize(chartType).w;
  const h = opts.height ?? defaultSize(chartType).h;
  const dataUrl = await renderChartToDataURL(chartType, chartData, theme, w, h);
  const img = await fabric.FabricImage.fromURL(dataUrl);
  img.set({
    left: opts.left, top: opts.top, width: w, height: h,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType, chartData, theme, width: w, height: h } satisfies ChartObjectData,
  });
  return img;
}

// ── Fabric Groups (Tier 3) ──────────────────────────────────────────────────

export function createFunnelGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const { labels, values } = chartData;
  const W      = opts.width ?? 860;
  const maxVal = Math.max(...values);
  const ROW_H  = 44;
  const GAP    = 18;
  const LABEL_W = 190;
  const BAR_AREA = W - LABEL_W - 14;
  const items: fabric.FabricObject[] = [];

  labels.forEach((label, i) => {
    const y      = i * (ROW_H + GAP);
    const barW   = Math.max(60, BAR_AREA * (values[i] / maxVal));
    const barX   = LABEL_W + 14;

    // Label (right-aligned text)
    items.push(new fabric.Textbox(label, {
      left: 0, top: y + 12, width: LABEL_W, textAlign: "right",
      fontSize: 16, fontWeight: "600", fill: tokens.muted,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
    // Gradient bar
    const bar = new fabric.Rect({
      left: barX, top: y, width: barW, height: ROW_H, rx: 5,
      fill: new fabric.Gradient({ type: "linear",
        coords: { x1: 0, y1: 0, x2: barW, y2: 0 },
        colorStops: [{ offset: 0, color: tokens.primary }, { offset: 1, color: tokens.secondary }],
      }),
      originX: "left" as const, originY: "top" as const,
    });
    items.push(bar);
    // Value text inside bar
    items.push(new fabric.Text(String(values[i]), {
      left: barX + barW - 8, top: y + 14, fontSize: 15, fontWeight: "700",
      fill: "#fff", originX: "right" as const, originY: "top" as const,
    }));
  });

  return new fabric.Group(items, {
    left: opts.left, top: opts.top,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType: "funnel", chartData, theme: "aurora",
            width: W, height: labels.length * (ROW_H + GAP) } satisfies ChartObjectData,
  });
}

export function createProgressGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const items = (chartData.progressItems ?? []).map(({ label, value, max = 100 }, i) => {
    const W     = opts.width ?? 780;
    const y     = i * 60;
    const pct   = Math.min(1, value / max);
    const fillW = Math.max(8, (W - 120) * pct);

    return [
      new fabric.Textbox(label, {
        left: 0, top: y + 2, width: 200, fontSize: 16, fill: tokens.text,
        fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
      }),
      // Track
      new fabric.Rect({
        left: 210, top: y + 10, width: W - 280, height: 12, rx: 6,
        fill: tokens.muted + "40", originX: "left" as const, originY: "top" as const,
      }),
      // Fill
      new fabric.Rect({
        left: 210, top: y + 10, width: fillW, height: 12, rx: 6,
        fill: new fabric.Gradient({ type: "linear",
          coords: { x1: 0, y1: 0, x2: fillW, y2: 0 },
          colorStops: [{ offset: 0, color: tokens.primary }, { offset: 1, color: tokens.secondary }],
        }),
        originX: "left" as const, originY: "top" as const,
      }),
      // Value
      new fabric.Text(`${Math.round(pct * 100)}%`, {
        left: W - 60, top: y + 4, fontSize: 15, fontWeight: "700",
        fill: tokens.text, originX: "left" as const, originY: "top" as const,
      }),
    ];
  }).flat();

  const height = (chartData.progressItems?.length ?? 0) * 60;
  return new fabric.Group(items, {
    left: opts.left, top: opts.top,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType: "progress", chartData, theme: "aurora",
            width: opts.width ?? 780, height } satisfies ChartObjectData,
  });
}

export function createBigNumberGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const W = opts.width ?? 952;
  const items: fabric.FabricObject[] = [
    new fabric.Textbox(chartData.statValue ?? "—", {
      left: 0, top: 0, width: W, textAlign: "center",
      fontSize: 120, fontWeight: "700", fontFamily: tokens.fontTitle,
      fill: tokens.primary, lineHeight: 1,
      originX: "left" as const, originY: "top" as const,
    }),
  ];
  if (chartData.statLabel) {
    items.push(new fabric.Textbox(chartData.statLabel, {
      left: 0, top: 132, width: W, textAlign: "center",
      fontSize: 28, fontWeight: "700", fill: tokens.text,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
  }
  if (chartData.statContext) {
    items.push(new fabric.Textbox(chartData.statContext, {
      left: 0, top: 174, width: W, textAlign: "center",
      fontSize: 16, fill: tokens.muted,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
  }
  return new fabric.Group(items, {
    left: opts.left, top: opts.top,
    originX: "left" as const, originY: "top" as const,
    data: { role: "chart", chartType: "number-stat", chartData, theme: "aurora",
            width: W, height: 220 } satisfies ChartObjectData,
  });
}

// ── Dispatcher (used by templates + user insert) ────────────────────────────

export async function createChartObject(
  chartType: ChartType,
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number; height?: number },
  theme: "aurora" | "lumina" = "aurora",
): Promise<fabric.FabricObject> {
  switch (chartType) {
    case "funnel":      return createFunnelGroup(chartData, tokens, opts);
    case "progress":    return createProgressGroup(chartData, tokens, opts);
    case "number-stat": return createBigNumberGroup(chartData, tokens, opts);
    default:            return createChartFabricImage(chartType, chartData, theme, opts);
  }
}

// ── Default sizes ───────────────────────────────────────────────────────────

export function defaultSize(type: ChartType): { w: number; h: number } {
  const MAP: Partial<Record<ChartType, { w: number; h: number }>> = {
    "donut":          { w: 480, h: 420 },
    "radar":          { w: 480, h: 480 },
    "funnel":         { w: 860, h: 320 },
    "number-stat":    { w: 952, h: 280 },
    "progress":       { w: 780, h: 0 },  // height computed dynamically
  };
  return MAP[type] ?? { w: 952, h: 420 };
}

// ── Internal Chart.js config builder ───────────────────────────────────────

function buildConfig(type: ChartType, data: ChartData, palette: typeof CHART_PALETTE.aurora) {
  const { labels, values, series, points, colors, showLegend, showGrid, unit } = data;
  const base = { animation: false as const, responsive: false };
  const bg   = (colors ?? palette.COLORS).slice(0, Math.max(labels?.length ?? 1, values?.length ?? 1));

  const xScale = { grid: { display: showGrid ?? false, color: palette.GRID }, ticks: { color: palette.TICK } };
  const yScale = { grid: { display: showGrid ?? true,  color: palette.GRID }, ticks: { color: palette.TICK } };

  switch (type) {
    case "bar":
      return { type: "bar" as const, data: { labels, datasets: [{ data: values, backgroundColor: bg, borderRadius: 6 }] },
        options: { ...base, indexAxis: "y" as const, plugins: { legend: { display: false } }, scales: { y: { ...xScale, grid: { display: false } }, x: yScale } } };

    case "column":
      return { type: "bar" as const, data: { labels, datasets: [{ data: values, backgroundColor: bg, borderRadius: 7, borderSkipped: false }] },
        options: { ...base, indexAxis: "x" as const, plugins: { legend: { display: false } }, scales: { x: { ...xScale, grid: { display: false } }, y: yScale } } };

    case "line":
      return { type: "line" as const, data: { labels, datasets: [{ data: values, borderColor: palette.COLORS[0], backgroundColor: "transparent",
          pointBackgroundColor: palette.COLORS[0], pointRadius: 7, tension: 0.35, borderWidth: 3, fill: false }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "area":
      return { type: "line" as const, data: { labels, datasets: [{ data: values, borderColor: palette.COLORS[0],
          backgroundColor: `${palette.COLORS[0]}33`, pointRadius: 5, tension: 0.35, borderWidth: 3, fill: true }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "donut":
      return { type: "doughnut" as const, data: { labels, datasets: [{ data: values, backgroundColor: palette.COLORS.slice(0, values.length), borderWidth: 0 }] },
        options: { ...base, cutout: "58%",
          plugins: { legend: { display: showLegend ?? true, position: "right" as const,
            labels: { color: palette.LABEL, font: { size: 17 }, padding: 20, boxWidth: 18 } } } } };

    case "radar": {
      const rds = series?.length
        ? series.map((s, i) => ({ label: s.label, data: s.values, backgroundColor: `${palette.COLORS[i]}30`, borderColor: palette.COLORS[i], borderWidth: 2.5 }))
        : [{ data: values, backgroundColor: `${palette.COLORS[0]}30`, borderColor: palette.COLORS[0], borderWidth: 2.5 }];
      return { type: "radar" as const, data: { labels, datasets: rds },
        options: { ...base, plugins: { legend: { display: showLegend ?? (series?.length ?? 0) > 1, labels: { color: palette.LABEL } } },
          scales: { r: { grid: { color: palette.GRID }, angleLines: { color: palette.GRID }, pointLabels: { color: palette.LABEL, font: { size: 15 } }, ticks: { display: false } } } } };
    }

    case "stacked-bar": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s" }));
      return { type: "bar" as const, data: { labels, datasets: ds },
        options: { ...base, indexAxis: "y" as const, plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
          scales: { y: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } }, x: { stacked: true, ...yScale } } } };
    }

    case "stacked-column": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s" }));
      return { type: "bar" as const, data: { labels, datasets: ds },
        options: { ...base, indexAxis: "x" as const, plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
          scales: { x: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } }, y: { stacked: true, ...yScale } } } };
    }

    case "comparison": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 6, borderSkipped: false }));
      return { type: "bar" as const, data: { labels, datasets: ds },
        options: { ...base, plugins: { legend: { display: true, labels: { color: palette.LABEL } } }, scales: { x: { ...xScale, grid: { display: false } }, y: yScale } } };
    }

    case "scatter":
      return { type: "scatter" as const, data: { datasets: [{ data: (points ?? []) as { x: number; y: number }[], backgroundColor: palette.COLORS[0], pointRadius: 8 }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "bubble":
      return { type: "bubble" as const, data: { datasets: [{ data: (points ?? []) as { x: number; y: number; r: number }[], backgroundColor: palette.COLORS.map(c => `${c}99`) }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    default:
      throw new Error(`Unhandled Chart.js type: ${type}`);
  }
}
```

---

## 4. Backdrop Filter Solution — `frontend/utils/canvasTemplates/shared.ts` (excerpt)

```typescript
let _ctxFilter: boolean | null = null;

export function supportsCtxFilter(): boolean {
  if (_ctxFilter !== null) return _ctxFilter;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.filter = "blur(1px)";
  _ctxFilter = ctx.filter !== "none" && ctx.filter !== "";
  return _ctxFilter;
}

/**
 * Returns a FabricImage of the background image blurred to the card region.
 * Used for the glassmorphism card effect on hook/quote slides.
 * Falls back to a high-opacity dark rect on Safari (where ctx.filter is unsupported).
 */
export async function createBlurredRegion(
  imageUrl: string,
  region:   { left: number; top: number; width: number; height: number },
  blur = 16,
): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = 1080; off.height = 1080;
      const ctx = off.getContext("2d")!;
      if (supportsCtxFilter()) {
        ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(img, 0, 0, 1080, 1080);
        ctx.filter = "none";
      } else {
        ctx.drawImage(img, 0, 0, 1080, 1080); // no blur (Safari)
      }
      const crop = document.createElement("canvas");
      crop.width = region.width; crop.height = region.height;
      crop.getContext("2d")!.drawImage(off, region.left, region.top, region.width, region.height, 0, 0, region.width, region.height);
      fabric.FabricImage.fromURL(crop.toDataURL())
        .then(fi => { fi.set({ left: region.left, top: region.top, originX: "left" as const, originY: "top" as const, selectable: false, evented: false }); resolve(fi); })
        .catch(reject);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}
```

**Why not stackblur-canvas:** Extra dependency, slower CPU-bound blur vs GPU-accelerated `ctx.filter`, Safari fallback (solid rect) is visually identical at Instagram display sizes. Discarded.

---

## 5. Slide Schema Addition

### `backend/core/orchestration/contracts.py`

```python
class Slide(BaseModel):
    # ... all existing fields unchanged ...
    # NEW — optional, backward-compatible
    canvas_template: Optional[str] = Field(
        default=None,
        description="Fabric template ID e.g. 'aurora-hook', 'aurora-content-0'"
    )
    model_config = ConfigDict(populate_by_name=True)
```

### `backend/core/orchestrators/content/carousel_generator.py`

```python
def _canvas_template_id(slide_type: str, theme: str, layout_variant: int, has_image: bool) -> str:
    if slide_type == "content":
        return f"{theme}-content-text" if not has_image else f"{theme}-content-{layout_variant}"
    return f"{theme}-{slide_type}"

# In render_slides_node, after computing layout_variant + has_image:
slide_dict["canvas_template"] = _canvas_template_id(
    slide.type.value, template_name, layout_variant, has_image
)
```

**That's the only backend change.** 5 lines total.

---

## 6. Slide Template System — `frontend/utils/canvasTemplates/`

### 6.1 Shared component factories — `shared.ts`

Every factory uses `originX: "left", originY: "top"` — **this is non-negotiable.** Fabric v7 defaults to center origin; every object must override this explicitly.

| Function | Returns | Used by |
|---|---|---|
| `createBrandBar(t, logo, name, num, total)` | `fabric.FabricObject[]` | All 9 templates |
| `createBgImage(url, fit, t)` | `fabric.FabricImage` | hook, content, quote |
| `createOverlay(variant, t)` | `fabric.Rect` (gradient) | hook, content, quote |
| `createAccentLine(t, w?)` | `fabric.Rect` | content, stat, quote |
| `createBulletItem(text, idx, t, sz)` | `fabric.Group` | content |
| `createInsightItem(text, t)` | `fabric.Group` | quote |
| `createGlassCard(region, url, blur, t)` | `fabric.FabricObject[]` | hook, quote |
| `createGradientBg(t, angle?)` | `fabric.Rect` | cta, engage |
| `createBlurredRegion(url, region, blur)` | `fabric.FabricImage` | (internal, via createGlassCard) |
| `supportsCtxFilter()` | `boolean` | (internal) |

### 6.2 Template registry — `index.ts`

```typescript
export interface SlideMeta {
  slideNum: number; totalSlides: number;
  logoUrl: string;  brandName: string;
}

// Lumina = Aurora with LUMINA tokens — zero code duplication
const lw = (fn: TemplateBuilder): TemplateBuilder =>
  (s, i, _t, m) => fn(s, i, LUMINA, m);

export const REGISTRY: Record<string, TemplateBuilder> = {
  "aurora-hook":          buildAuroraHook,
  "aurora-content-0":     (s,i,t,m) => buildAuroraContent(s,i,t,m,0),
  "aurora-content-1":     (s,i,t,m) => buildAuroraContent(s,i,t,m,1),
  "aurora-content-2":     (s,i,t,m) => buildAuroraContent(s,i,t,m,2),
  "aurora-content-text":  (s,i,t,m) => buildAuroraContent(s,i,t,m,-1),
  "aurora-stat":          buildAuroraStat,
  "aurora-quote":         buildAuroraQuote,
  "aurora-cta":           buildAuroraCta,
  "aurora-engage":        buildAuroraEngage,
  "lumina-hook":          lw(buildAuroraHook),
  "lumina-content-0":     (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,0),
  "lumina-content-1":     (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,1),
  "lumina-content-2":     (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,2),
  "lumina-content-text":  (s,i,_,m) => buildAuroraContent(s,i,LUMINA,m,-1),
  "lumina-stat":          lw(buildAuroraStat),
  "lumina-quote":         lw(buildAuroraQuote),
  "lumina-cta":           lw(buildAuroraCta),
  "lumina-engage":        lw(buildAuroraEngage),
};

function inferTemplate(slide: SlideData & { canvas_template?: string }): string {
  const theme = (slide._theme ?? "aurora").toLowerCase();
  if (slide.type === "content") return `${theme}-content-0`;
  return `${theme}-${slide.type}`;
}

export async function buildSlideCanvas(
  slide: SlideData & { canvas_template?: string },
  imageUrl: string | null,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  await loadCanvasFonts();
  const id      = slide.canvas_template ?? inferTemplate(slide);
  const builder = REGISTRY[id] ?? REGISTRY["aurora-hook"];
  const tokens  = applyOverrides(getTokens(id), slide.slide_overrides ?? {});
  return builder(slide, imageUrl, tokens, meta);
}
```

### 6.3 Template specifications (all 9 Aurora types)

**Key principle for every template:** All objects use `originX: "left", originY: "top"`.

---

**`aurora-hook`** — Full-bleed image + glassmorphism card
```
1. bg_image       FabricImage, 1080×1080, cover-fit
2. bg_overlay     Rect gradient: #090909/88% → #090909/65% → primary/25%, 135deg
3. glass_blur     createBlurredRegion(card_region, 16) [or fallback rect if !ctx.filter]
4. glass_overlay  Rect 880×h, rgba(19,19,19,0.65), rx:24
5. card_border    Rect 880×h, stroke rgba(255,255,255,0.08), fill:none, rx:24
6. hook_label     Text "THREAD", 14px primary, charSpacing 200, uppercase
7. hook_headline  Textbox, Syne 72px Bold, white, lineHeight 1.05
8. hook_sub       Textbox (if body), 24px, muted, lineHeight 1.5
9. swipe_hint     Text "Swipe →", 14px muted, x=920, y=930
10. brand_bar[]   createBrandBar()

Card: left=100, w=880, top = 540 - cardHeight×0.55
Padding inside card: 56px top/bottom, 64px left/right
```

---

**`aurora-content-{0/1/2/text}`** — Text + image, 4 layout variants
```
All variants share:
  bg_texture   createBgImage(url, "blur-darken") [blur+brightness(0.15), scale 1.15×]
  bg_dim       Rect, gradient #090909/93% → #090909/78%
  accent_line  createAccentLine()
  slide_title  Textbox, 44px Bold white
  slide_body   Textbox, 22px muted, lineHeight 1.6
  bullet_N     createBulletItem() × n
  brand_bar[]

Layout 0 (left text / right image):  text x=40 w=576 | image x=664 w=368
Layout 1 (top text / bottom image):  text x=56 y=36 w=968 | image below text
Layout 2 (top image / bottom text):  image x=36 y=28 | text below image
Text-only:                            text x=60 w=960, title 48px, body 23px
```

---

**`aurora-stat`** — Corrected hierarchy
```
stat.html.j2 field mapping:
  stat_value → 116px Syne gradient (primary→secondary)
  stat_label → 24px Bold white [BESIDE stat_value]
  slide.title → 16px muted [BELOW stat_label]
  slide.body  → 20px, left-border accent
  chart_data  → createChartObject() [below divider]

Objects:
  bg_rect    Rect 1080×1080, surface #131313
  accent_line 60×3, x=64 y=52
  stat_value  Textbox Syne 116px, gradient fill, left=64 top=68
  stat_label  Textbox 24px Bold white, left=stat_value_right+28 top=78
  stat_title  Textbox 16px muted, same x as stat_label, below
  stat_divider Rect 60×3 gradient, below stat block
  stat_body   Textbox 20px, left-border accent bar
  chart_obj   createChartObject(chart_type, chart_data, ...) [funnel|image]
  brand_bar[]
```

---

**`aurora-quote`** — Corrected: slide.title = quote, slide.body = attribution
```
bg_texture   createBgImage(url, "blur-darken")
bg_dim       Rect gradient #090909/78% → #090909/62%, 160deg
quote_mark   Text '"', Syne 100px, primary opacity 0.55, lineHeight 0.65
quote_text   Textbox (slide.title), 40px SemiBold Italic white, lineHeight 1.42
quote_attr   Text "— " + body (strip leading dash), 20px muted
[if bullets:]
  divider      Rect 100%×1, rgba(255,255,255,0.10)
  insights_lbl Text "KEY INSIGHTS", 13px secondary uppercase
  insight_N    createInsightItem() × n
brand_bar[]

Inner block: left=72, w=936, centered vertically
```

---

**`aurora-cta`** — Dark bg + radial glows
```
glow_1        Ellipse 540×430, primary/0.35, left=-220 top=540
glow_2        Ellipse 430×430, secondary/0.25, left=760 top=-130
bg_rect       Rect 1080×1080, #090909
cta_headline  Textbox (slide.title), Syne 64px Bold white, centered
cta_sub       Textbox (slide.body), 26px muted, centered, lineHeight 1.5
cta_button    Group [Rect gradient rx:100 + Text "Follow for more →" 22px white]
brand_bar[]
Inner: left=80, right=80, centered vertically, gap=40px
```

---

**`aurora-engage`** — Gradient bg + rings + eyebrow (NOT the same as CTA)
```
engage_bg     Rect 1080×1008, gradient primary→secondary 135deg
ring_1        Circle 560, stroke rgba(255,255,255,0.14), left=-180 top=-200
ring_2        Circle 360, stroke rgba(255,255,255,0.14), left=-100 bottom
ring_3        Circle 200, stroke rgba(255,255,255,0.14) opacity:0.6
eyebrow_pill  Group [Rect rgba(255,255,255,0.12) rx:999 + Text "Follow for more insights"]
engage_title  Textbox (slide.title), Syne 46px Bold white, centered
engage_body   Textbox (slide.body), 22px rgba(255,255,255,0.82), centered
engage_pill   Group [Rect rgba(255,255,255,0.20) border rx:999 + Text "Hit Follow — it's worth it"]
brand_bar[]
Inner: left=80, right=80, centered, gap=28px
```

**Lumina variants** = Same builders, LUMINA token set. Zero duplicated code. Single `lw()` wrapper.

---

## 7. UI Components

### 7.1 `ChartEditorPanel.tsx`

Used in TWO contexts:
- **Slide-over** (full height, right side) — when inserting new chart from Templates panel
- **Compact** (inside RightPanel) — when selecting existing chart on canvas

```typescript
interface ChartEditorPanelProps {
  initialType?: ChartType;
  initialData?: ChartData;
  theme:        "aurora" | "lumina";
  onApply:      (type: ChartType, data: ChartData) => Promise<void>;
  onCancel?:    () => void;
  compact?:     boolean;   // hides live preview when compact=true (canvas IS the preview)
}
```

**Layout (full mode):**
```
ChartTypePicker           — visual grid of 13 chart types
ChartDataTable            — editable grid (label + N series columns)
  [+ Add row]  [Paste CSV]  [+ Add series]
Options row               — Unit | Legend toggle | Grid toggle | Title input
Live Preview              — <ChartPreview> debounced 200ms (hidden in compact mode)
[Apply to Slide]  [Cancel]
```

**Live preview uses the existing `ChartPreview.tsx` (react-chartjs-2)** — not the offscreen renderer. Only `onApply` triggers the full offscreen render.

### 7.2 `ChartTypePicker.tsx`

Grid of tiles, each with inline SVG icon + label:

```typescript
// Each tile has a 48×32px SVG representing the chart shape
// Active: violet border + bg-violet-600/10
// Categories: "basic" (bar/column/line/area/donut), "comparative" (stacked/comparison/radar),
//             "special" (scatter/bubble/funnel), "data" (progress/number-stat)
```

### 7.3 `ChartDataTable.tsx`

Spreadsheet-like component:
- Column 0: Label (text input)
- Columns 1..N: Series values (number input)
- Row controls: Enter = new row, Tab = next cell, Delete on empty = remove row
- Header: editable series names + color picker per series
- Footer: `[+ Add row]` `[Paste CSV]` `[+ Add series]` (for multi-series types)

### 7.4 `RightPanel.tsx` — Updated routing

```typescript
if (selectedObject?.data?.role === "chart") {
  return <ChartEditorPanel compact initialType={...} initialData={...} onApply={handleChartApply} />;
}
if (selectedObject?.type === "textbox") { return <TextPanel ... />; }
if (selectedObject?.type === "image")   { return <ImagePanel ... />; }
return <CanvasPanel canvas={canvas} />;
```

`handleChartApply` in the editor page:
```typescript
async function handleChartApply(type: ChartType, data: ChartData) {
  const obj = canvasApiRef.current?.getCanvas()?.getActiveObject();
  if (!obj || !canvasInstance) return;
  commit("edit chart");
  const tokens = getTokens(selectedTemplate ?? "aurora-hook");
  const newObj = await createChartObject(type, data, tokens, {
    left: obj.left ?? 64, top: obj.top ?? 300,
    width: (obj as fabric.FabricObject & { width?: number }).width,
    height: (obj as fabric.FabricObject & { height?: number }).height,
  });
  canvasInstance.remove(obj);
  canvasInstance.add(newObj);
  canvasInstance.setActiveObject(newObj);
  canvasInstance.renderAll();
  handleCanvasChanged();
}
```

### 7.5 `TemplatesPanel.tsx` — 3rd left panel tab

Three sections:

**Slide Templates** — 9 tiles (one per slide type), click to create new slide with that template
**Charts** — 13 chart tiles, click opens `ChartEditorPanel` slide-over
**Components** — draggable Fabric Groups:
  Brand Bar · Thread Label · Dark Card · Stat Block · Quote Block · Bullet List · Insight List · Accent Line · CTA Button · Eyebrow Pill · Radial Glow · Deco Rings

**My Templates** — user-saved full-slide templates
  `POST/GET/DELETE /api/v1/content/assets/templates`

---

## 8. Complete File Structure

```
frontend/
├── types/
│   └── chart.ts                     ← ChartType, ChartData, ChartObjectData
│
├── utils/
│   ├── canvasTokens.ts              ← AURORA, LUMINA, CHART_PALETTE, getTokens, applyOverrides
│   ├── canvasFonts.ts               ← loadCanvasFonts() singleton
│   ├── parseChartCsv.ts             ← CSV → ChartData
│   └── canvasTemplates/
│       ├── index.ts                 ← REGISTRY, buildSlideCanvas, inferTemplate, SlideMeta
│       ├── shared.ts                ← createBrandBar, createBgImage, createOverlay,
│       │                                createAccentLine, createBulletItem, createInsightItem,
│       │                                createGlassCard, createBlurredRegion, supportsCtxFilter,
│       │                                createGradientBg
│       ├── chartRenderer.ts         ← renderChartToDataURL, createChartFabricImage,
│       │                                createFunnelGroup, createProgressGroup,
│       │                                createBigNumberGroup, createChartObject, defaultSize
│       ├── aurora_hook.ts
│       ├── aurora_content.ts        ← variants 0/1/2/-1 (layout param)
│       ├── aurora_stat.ts           ← imports createChartObject
│       ├── aurora_quote.ts
│       ├── aurora_cta.ts
│       └── aurora_engage.ts
│
└── components/editor/
    ├── FabricCanvas.tsx             ← loadInitial() calls buildSlideCanvas()
    ├── CanvasToolbar.tsx
    ├── ContextToolbar.tsx
    ├── RightPanel.tsx               ← routes to TextPanel / ImagePanel / ChartEditorPanel / CanvasPanel
    ├── TextPanel.tsx                ← text property controls (split from RightPanel)
    ├── ImagePanel.tsx               ← image property controls (split from RightPanel)
    ├── CanvasPanel.tsx              ← canvas bg color (split from RightPanel)
    ├── ChartEditorPanel.tsx         ← full + compact mode
    ├── ChartTypePicker.tsx          ← visual grid of 13 types
    ├── ChartDataTable.tsx           ← editable data grid
    ├── TemplatesPanel.tsx           ← slides / charts / components / my-saved
    ├── ImagesPanel.tsx              ← asset library (already built)
    ├── EditorLeftPanel.tsx          ← Files | Images | Templates tabs
    └── SlidePngPreview.tsx          ← PNG preview mode (already built)
```

**No `lumina_*.ts` files.** Lumina uses Aurora builders with LUMINA tokens. One line each in the registry.

---

## 9. Build Order (Strict Dependency Sequence)

Dependencies flow downward. **Never build a phase before its dependencies are done.**

```
Phase 0 — Foundation (no deps, pure TypeScript)
  ├── types/chart.ts
  ├── utils/canvasTokens.ts
  ├── utils/canvasFonts.ts
  └── utils/parseChartCsv.ts

Phase 1 — Chart rendering engine (deps: Phase 0)
  └── utils/canvasTemplates/chartRenderer.ts
      Verify: all 13 chart types render to correct PNGs
      Test:   renderChartToDataURL("bar", {...}) → non-empty dataUrl
              createFunnelGroup / createProgressGroup / createBigNumberGroup → Fabric Groups

Phase 2 — Shared Fabric components (deps: Phase 0)
  └── utils/canvasTemplates/shared.ts
      Verify: createBrandBar renders brand bar correctly
              createBgImage("blur-darken") produces blurred FabricImage
              createGlassCard produces blur layer + overlay + border

Phase 3 — Aurora slide templates (deps: Phase 1 + 2)
  ├── aurora_hook.ts       → screenshot vs slide_01.png ≥90% match
  ├── aurora_content.ts    → 4 variants, each screenshot vs reference PNG
  ├── aurora_stat.ts       → stat hierarchy + chart image
  ├── aurora_quote.ts      → quote + attribution + insights
  ├── aurora_cta.ts        → dark bg + radial glows + pill button
  └── aurora_engage.ts     → gradient bg + rings + eyebrow pill

Phase 4 — Template registry (deps: Phase 3)
  └── utils/canvasTemplates/index.ts
      Verify: buildSlideCanvas() works for all 18 template IDs

Phase 5 — Backend schema (1-day, independent)
  ├── contracts.py: +canvas_template field
  └── carousel_generator.py: +_canvas_template_id() + 5-line addition

Phase 6 — FabricCanvas.loadInitial() wiring (deps: Phase 4 + 5)
  └── components/editor/FabricCanvas.tsx — replace loadInitial() body
      Verify: open any generated slide → matches reference PNG

Phase 7 — Chart UI components (deps: Phase 1)
  ├── components/editor/ChartTypePicker.tsx
  ├── components/editor/ChartDataTable.tsx
  └── components/editor/ChartEditorPanel.tsx
      Verify: all 13 types selectable, data table Tab/Enter/Delete navigation
              CSV paste: single-series, multi-series, scatter all parse correctly
              Live preview updates within 200ms of data change

Phase 8 — RightPanel split + chart wiring (deps: Phase 7)
  ├── components/editor/TextPanel.tsx    (extracted from RightPanel)
  ├── components/editor/ImagePanel.tsx   (extracted from RightPanel)
  ├── components/editor/CanvasPanel.tsx  (extracted from RightPanel)
  └── components/editor/RightPanel.tsx   (now a router only)
      Verify: select text → TextPanel; select image → ImagePanel;
              select chart → ChartEditorPanel compact;
              deselect → CanvasPanel

Phase 9 — Templates panel (deps: Phase 6 + 7)
  └── components/editor/TemplatesPanel.tsx
      Verify: slide tiles create slides; chart tiles open editor;
              components drag onto canvas; user-saved templates save/load

Phase 10 — EditorLeftPanel 3rd tab (deps: Phase 9)
  └── components/editor/EditorLeftPanel.tsx — add Templates tab
      Verify: 3 tabs; Files/Images/Templates all work

Phase 11 — Backend user templates endpoints
  ├── POST /api/v1/content/assets/templates
  ├── GET  /api/v1/content/assets/templates
  └── DELETE /api/v1/content/assets/templates/:id
```

---

## 10. Quality Bar

| Element | Requirement | Fallback |
|---|---|---|
| Fonts | Syne Bold + Plus Jakarta Sans exact weights | None — fonts must load |
| `originX/Y` | Always `"left"/"top"` on every Fabric object | None — WILL break layout |
| Colors | Exact hex from token system | None — must match |
| Backdrop blur | Offscreen canvas `ctx.filter` | Higher-opacity rect (Safari) |
| Brand bar | Always present, always correct | None |
| Progress bar | Proportional width, gradient fill | None |
| Charts (AI) | Chart.js colors matching Jinja2 template | Chart types must match |
| Charts (user) | All 13 types render, correct palette | None |
| Funnel | Fabric Group matching CSS funnel layout | None |
| Template match | ≥90% visual fidelity vs reference PNG | Minor position offsets OK |
| Gradient text | White text (CSS gradient-clip not in Fabric) | Acceptable |

---

## 11. What Does NOT Change

- `slides.json` format (except +`canvas_template`)
- Jinja2 HTML templates
- Playwright PNG generation
- All 61 E2E tests
- Blog post generation
- Research / angle / content orchestration pipeline
- `image_assets.json` format
- All existing backend endpoints
