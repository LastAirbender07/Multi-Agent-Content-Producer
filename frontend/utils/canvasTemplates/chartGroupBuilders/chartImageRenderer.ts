// Renders a Chart.js chart to a PNG data URL, then wraps it in a FabricImage.
// This is the only file in chartGroupBuilders that depends on Chart.js and the DOM.

import { Chart } from "chart.js";
import * as fabric from "fabric";
import { CHART_PALETTE } from "@/utils/canvasTokens";
import type { ChartType, ChartData } from "@/types/chart";
import type { ChartPalette } from "@/utils/canvasTokens";
import { defaultSize } from "../chartRenderer";
import { makeFabricImage } from "./helpers";
import { barConfig, columnConfig }                               from "../chartConfigs/barConfig";
import { lineConfig, areaConfig }                                from "../chartConfigs/lineConfig";
import { donutConfig }                                           from "../chartConfigs/donutConfig";
import { radarConfig }                                           from "../chartConfigs/radarConfig";
import { stackedBarConfig, stackedColumnConfig, comparisonConfig } from "../chartConfigs/stackedConfig";
import { scatterConfig, bubbleConfig }                           from "../chartConfigs/scatterConfig";

function buildConfig(type: ChartType, data: ChartData, palette: ChartPalette) {
  const base   = { animation: false as const, responsive: false };
  const xScale = { grid: { display: data.showGrid ?? false, color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } };
  const yScale = { grid: { display: data.showGrid ?? true,  color: palette.GRID }, ticks: { color: palette.TICK, font: { size: 15 } } };

  switch (type) {
    case "bar":              return barConfig(data, palette, base);
    case "column":           return columnConfig(data, palette, base);
    case "line":             return lineConfig(data, palette, base, xScale, yScale);
    case "area":             return areaConfig(data, palette, base, xScale, yScale);
    case "donut":            return donutConfig(data, palette, base);
    case "radar":            return radarConfig(data, palette, base);
    case "stacked-bar":      return stackedBarConfig(data, palette, base, yScale);
    case "stacked-column":   return stackedColumnConfig(data, palette, base, yScale);
    case "comparison":       return comparisonConfig(data, palette, base, xScale, yScale);
    case "scatter":          return scatterConfig(data, palette, base, xScale, yScale);
    case "bubble":           return bubbleConfig(data, palette, base, xScale, yScale);
    default:                 throw new Error(`Unknown chart type: ${type}`);
  }
}

export async function renderChartToDataURL(
  chartType: ChartType,
  chartData: ChartData,
  theme: "aurora" | "lumina" = "aurora",
  width?: number,
  height?: number,
): Promise<string> {
  const { w, h } = defaultSize(chartType);
  const W = width  ?? w;
  const H = height ?? h;
  const palette = CHART_PALETTE[theme];
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  canvas.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
  document.body.appendChild(canvas);

  const config = buildConfig(chartType, chartData, palette) as ConstructorParameters<typeof Chart>[1];

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
