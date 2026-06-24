import { Chart, registerables } from "chart.js";
import * as fabric from "fabric";
import { CHART_PALETTE } from "@/utils/canvasTokens";
import type { ChartType, ChartData, ChartObjectData } from "@/types/chart";
import type { CanvasTokens, ChartPalette } from "@/utils/canvasTokens";

Chart.register(...registerables);

// Single type alias for Fabric fill — replaces 6× `as unknown as string` casts throughout.
// Fabric v7 accepts Gradient/Pattern as fill but its TS types are overly narrow.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricFill = string | fabric.Gradient<any, any> | fabric.Pattern;

// ── Default canvas sizes per chart type ────────────────────────────────────

export function defaultSize(type: ChartType): { w: number; h: number } {
  const MAP: Partial<Record<ChartType, { w: number; h: number }>> = {
    donut:        { w: 480, h: 420 },
    radar:        { w: 480, h: 480 },
    funnel:       { w: 860, h: 320 },
    "number-stat":{ w: 952, h: 280 },
    progress:     { w: 780, h: 0 },  // height computed dynamically from progressItems
  };
  return MAP[type] ?? { w: 952, h: 500 };  // taller default for better readability
}

// ── Chart.js types (Tier 1 + 2) ─────────────────────────────────────────────

export async function renderChartToDataURL(
  chartType: ChartType,
  chartData: ChartData,
  theme: "aurora" | "lumina" = "aurora",
  width?: number,
  height?: number,
): Promise<string> {
  if (["funnel", "progress", "number-stat"].includes(chartType)) {
    throw new Error(
      `"${chartType}" is a Fabric Group — use createChartObject() which handles dispatch.`
    );
  }
  const { w, h } = defaultSize(chartType);
  const W = width  ?? w;
  const H = height ?? h;
  const palette = CHART_PALETTE[theme];

  // Append off-screen so Chart.js can measure font metrics
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  // Fix 1-B: no background in cssText — canvas toDataURL is transparent by default.
  // Lumina background applied via plugin below if needed.
  canvas.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
  document.body.appendChild(canvas);

  const config = buildConfig(chartType, chartData, palette) as ConstructorParameters<typeof Chart>[1];

  // Fix 1-B: lumina needs white bg so donut/radar legend text is readable on dark Fabric canvas
  if (theme === "lumina") {
    const bgPlugin = {
      id: "chartBg",
      beforeDraw(chart: { ctx: CanvasRenderingContext2D; width: number; height: number }) {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (config as any).plugins = [...((config as any).plugins ?? []), bgPlugin];
  }

  const instance = new Chart(canvas, config);
  // animation:false → synchronous render; one rAF ensures the canvas is flushed
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
  const { w, h } = defaultSize(chartType);
  const W = opts.width  ?? w;
  const H = opts.height ?? h;
  const dataUrl = await renderChartToDataURL(chartType, chartData, theme, W, H);
  const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
  img.set({ left: opts.left, top: opts.top, width: W, height: H, originX: "left" as const, originY: "top" as const });
  return makeFabricImage(img, { role: "chart", chartType, chartData, theme, width: W, height: H });
}

// Type alias to work around Fabric v7 not typing the `data` property
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricWithData = fabric.Group & { data?: any };

function makeGroup(items: fabric.FabricObject[], opts: Partial<fabric.GroupProps>, data: ChartObjectData): fabric.Group {
  const g = new fabric.Group(items, opts) as FabricWithData;
  g.data = data;
  return g as fabric.Group;
}

function makeFabricImage(img: fabric.FabricImage, data: ChartObjectData): fabric.FabricImage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (img as any).data = data;
  return img;
}

export function createFunnelGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number; height?: number },
): fabric.Group {
  const { labels = [], values = [] } = chartData;
  const W       = opts.width ?? 860;
  const n       = Math.max(1, labels.length);
  const maxVal  = Math.max(...values, 1);

  // Scale rows to fill the allocated height if provided
  const TOTAL_H  = opts.height ?? 320;
  const GAP      = Math.max(12, Math.round(TOTAL_H * 0.04));
  const ROW_H    = Math.max(36, Math.round((TOTAL_H - GAP * (n - 1)) / n));

  const LABEL_W = 190;
  const BAR_W   = W - LABEL_W - 14;
  const items: fabric.FabricObject[] = [];

  labels.forEach((label, i) => {
    const y    = i * (ROW_H + GAP);
    const barW = Math.max(60, BAR_W * (values[i] / maxVal));
    const barX = LABEL_W + 14;

    items.push(new fabric.Textbox(label, {
      left: 0, top: y + Math.round((ROW_H - 20) / 2), width: LABEL_W, textAlign: "right",
      fontSize: 15, fontWeight: "600", fill: tokens.muted,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Rect({
      left: barX, top: y, width: barW, height: ROW_H, rx: 6,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: barW, y2: 0 },
        colorStops: [{ offset: 0, color: tokens.primary }, { offset: 1, color: tokens.secondary }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(String(values[i]), {
      left: barX + barW - 10, top: y + Math.round((ROW_H - 18) / 2),
      fontSize: 15, fontWeight: "700",
      fill: "#fff", originX: "right" as const, originY: "top" as const,
    }));
  });

  const height = n * (ROW_H + GAP) - GAP;
  return makeGroup(items, { left: opts.left, top: opts.top, originX: "left" as const, originY: "top" as const },
    { role: "chart", chartType: "funnel", chartData, theme: "aurora", width: W, height });
}

export function createProgressGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const W   = opts.width ?? 780;
  const TRACK_W = W - 280;
  const items = (chartData.progressItems ?? []).flatMap(({ label, value, max = 100 }, i) => {
    const y     = i * 60;
    const pct   = Math.min(1, Math.max(0, value / max));
    const fillW = Math.max(8, TRACK_W * pct);
    return [
      new fabric.Textbox(label, {
        left: 0, top: y + 2, width: 200, fontSize: 16, fill: tokens.text,
        fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
      }),
      new fabric.Rect({
        left: 210, top: y + 10, width: TRACK_W, height: 12, rx: 6,
        fill: tokens.muted + "40", originX: "left" as const, originY: "top" as const,
      }),
      new fabric.Rect({
        left: 210, top: y + 10, width: fillW, height: 12, rx: 6,
        fill: new fabric.Gradient({
          type: "linear", coords: { x1: 0, y1: 0, x2: fillW, y2: 0 },
          colorStops: [{ offset: 0, color: tokens.primary }, { offset: 1, color: tokens.secondary }],
        }),
        originX: "left" as const, originY: "top" as const,
      }),
      new fabric.Text(`${Math.round(pct * 100)}%`, {
        left: W - 60, top: y + 4, fontSize: 15, fontWeight: "700",
        fill: tokens.text, originX: "left" as const, originY: "top" as const,
      }),
    ];
  });

  const height = (chartData.progressItems?.length ?? 0) * 60;
  return makeGroup(
    items.length ? items : [new fabric.Rect({ width: 1, height: 1, fill: "transparent" })],
    { left: opts.left, top: opts.top, originX: "left" as const, originY: "top" as const },
    { role: "chart", chartType: "progress", chartData, theme: "aurora", width: W, height },
  );
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
      left: 0, top: 176, width: W, textAlign: "center",
      fontSize: 16, fill: tokens.muted,
      fontFamily: tokens.fontBody, originX: "left" as const, originY: "top" as const,
    }));
  }
  return makeGroup(items, { left: opts.left, top: opts.top, originX: "left" as const, originY: "top" as const },
    { role: "chart", chartType: "number-stat", chartData, theme: "aurora", width: W, height: 220 });
}

// ── Single dispatcher — used by templates + user insert ─────────────────────

export async function createChartObject(
  chartType: ChartType,
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number; height?: number },
  theme: "aurora" | "lumina" = "aurora",
): Promise<fabric.FabricObject> {
  switch (chartType) {
    case "funnel":        return createFunnelGroup(chartData, tokens, opts);
    case "progress":      return createProgressGroup(chartData, tokens, opts);
    case "number-stat":   return createBigNumberGroup(chartData, tokens, opts);
    default:             return createChartFabricImage(chartType, chartData, theme, opts);
  }
}

// ── Internal Chart.js config builder ────────────────────────────────────────

function buildConfig(type: ChartType, data: ChartData, palette: ChartPalette) {
  const { labels = [], values = [], series, points, colors, showLegend, showGrid } = data;
  const base = { animation: false as const, responsive: false };
  const bg   = (colors ?? palette.COLORS).slice(0, Math.max(labels.length, values.length, 1));

  const xScale = { grid: { display: showGrid ?? false, color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } };
  const yScale = { grid: { display: showGrid ?? true,  color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } };

  switch (type) {
    // Fix 1-A: explicit per-bar colors + borderSkipped + transparent border
    case "bar":
      return {
        type: "bar" as const,
        data: { labels, datasets: [{
          data: values,
          backgroundColor: values.map((_, i) => palette.COLORS[i % palette.COLORS.length]),
          borderRadius: 6,
          borderSkipped: false,
          borderColor: "transparent",
          borderWidth: 0,
        }] },
        options: { ...base, indexAxis: "y" as const,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { display: false }, ticks: { color: palette.TICK, font: { size: 17 } } },
            x: { grid: { color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } },
          } },
      };

    case "column":
      return {
        type: "bar" as const,
        data: { labels, datasets: [{
          data: values,
          backgroundColor: values.map((_, i) => palette.COLORS[i % palette.COLORS.length]),
          borderRadius: 8,
          borderSkipped: false,
          borderColor: "transparent",
          borderWidth: 0,
        }] },
        options: { ...base, indexAxis: "x" as const,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { color: palette.TICK, font: { size: 15 } } },
            y: { grid: { color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } },
          } },
      };

    case "line":
      // Line chart with gradient area fill below the line (matches Jinja2 reference)
      return { type: "line", data: { labels, datasets: [{ data: values,
          borderColor: palette.COLORS[0],
          backgroundColor: `${palette.COLORS[0]}44`,  // semi-transparent fill under line
          pointBackgroundColor: palette.COLORS[0],
          pointBorderColor: "rgba(0,0,0,0.3)",
          pointRadius: 6, pointBorderWidth: 2,
          tension: 0.4, borderWidth: 3, fill: true }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "area":
      return { type: "line", data: { labels, datasets: [{ data: values, borderColor: palette.COLORS[0],
          backgroundColor: `${palette.COLORS[0]}33`, pointRadius: 5, tension: 0.35, borderWidth: 3, fill: true }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "donut":
      return { type: "doughnut", data: { labels, datasets: [{ data: values, backgroundColor: palette.COLORS.slice(0, values.length), borderWidth: 0, hoverOffset: 4 }] },
        options: { ...base, cutout: "58%",
          plugins: { legend: { display: showLegend ?? true, position: "right",
            labels: { color: palette.LABEL, font: { size: 17 }, padding: 20, boxWidth: 18 } } } } };

    case "radar": {
      const rds = series?.length
        ? series.map((s, i) => ({ label: s.label, data: s.values, backgroundColor: `${palette.COLORS[i]}30`, borderColor: palette.COLORS[i], borderWidth: 2.5 }))
        : [{ data: values, backgroundColor: `${palette.COLORS[0]}30`, borderColor: palette.COLORS[0], borderWidth: 2.5, label: "" }];
      return { type: "radar", data: { labels, datasets: rds },
        options: { ...base,
          plugins: { legend: { display: showLegend ?? (series?.length ?? 0) > 1, labels: { color: palette.LABEL } } },
          scales: { r: { grid: { color: palette.GRID }, angleLines: { color: palette.GRID }, pointLabels: { color: palette.LABEL, font: { size: 15 } }, ticks: { display: false } } } } };
    }

    case "stacked-bar": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s", borderColor: "transparent", borderWidth: 0 }));
      return { type: "bar", data: { labels, datasets: ds },
        options: { ...base, indexAxis: "y", plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
          scales: { y: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } }, x: { stacked: true, ...yScale } } } };
    }

    case "stacked-column": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 4, stack: "s", borderColor: "transparent", borderWidth: 0 }));
      return { type: "bar", data: { labels, datasets: ds },
        options: { ...base, indexAxis: "x", plugins: { legend: { display: true, labels: { color: palette.LABEL } } },
          scales: { x: { stacked: true, grid: { display: false }, ticks: { color: palette.TICK } }, y: { stacked: true, ...yScale } } } };
    }

    case "comparison": {
      const ds = (series ?? []).map((s, i) => ({ label: s.label, data: s.values, backgroundColor: s.color ?? palette.COLORS[i], borderRadius: 6, borderSkipped: false, borderColor: "transparent", borderWidth: 0 }));
      return { type: "bar", data: { labels, datasets: ds },
        options: { ...base, plugins: { legend: { display: true, labels: { color: palette.LABEL } } }, scales: { x: { ...xScale, grid: { display: false } }, y: yScale } } };
    }

    case "scatter":
      return { type: "scatter", data: { datasets: [{ data: (points ?? []) as { x: number; y: number }[], backgroundColor: palette.COLORS[0], pointRadius: 8 }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    case "bubble":
      return { type: "bubble", data: { datasets: [{ data: (points ?? []) as { x: number; y: number; r: number }[], backgroundColor: palette.COLORS.map((c: string) => `${c}99`) }] },
        options: { ...base, plugins: { legend: { display: false } }, scales: { x: xScale, y: yScale } } };

    default:
      throw new Error(`Unknown chart type: ${type}`);
  }
}
