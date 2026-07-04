/**
 * chartRenderer.ts — Main entry point for all chart rendering.
 *
 * Responsibilities:
 *  - `defaultSize(type)`   — canonical size map per chart type
 *  - `createChartObject()` — dispatcher: routes to Fabric group builders
 *                            (funnel/progress/big-number) or Chart.js image renderer
 *
 * Implementation details live in sub-folders:
 *   chartGroupBuilders/   — funnelGroup, progressGroup, bigNumberGroup, chartImageRenderer
 *   chartConfigs/         — one file per Chart.js chart type (bar, line, donut, etc.)
 */

import * as fabric from "fabric";
import type { ChartType, ChartData } from "@/types/chart";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { createFunnelGroup }        from "./chartGroupBuilders/funnelGroup";
import { createProgressGroup }      from "./chartGroupBuilders/progressGroup";
import { createBigNumberGroup }     from "./chartGroupBuilders/bigNumberGroup";
import { createChartFabricImage, renderChartToDataURL } from "./chartGroupBuilders/chartImageRenderer";

// Re-export for consumers that import directly from chartRenderer
export { createFunnelGroup, createProgressGroup, createBigNumberGroup };
export { createChartFabricImage, renderChartToDataURL };

// ── Default canvas sizes per chart type ────────────────────────────────────────

export function defaultSize(type: ChartType): { w: number; h: number } {
  const MAP: Partial<Record<ChartType, { w: number; h: number }>> = {
    donut:          { w: 480, h: 420 },
    radar:          { w: 480, h: 480 },
    funnel:         { w: 860, h: 320 },
    "number-stat":  { w: 952, h: 280 },
    progress:       { w: 780, h: 0 },  // height computed dynamically from progressItems
  };
  return MAP[type] ?? { w: 952, h: 500 };
}

// ── Main dispatcher ────────────────────────────────────────────────────────────

export async function createChartObject(
  chartType: ChartType,
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number; height?: number },
  theme: "aurora" | "lumina" = "aurora",
): Promise<fabric.FabricObject> {
  switch (chartType) {
    case "funnel":       return createFunnelGroup(chartData, tokens, opts);
    case "progress":     return createProgressGroup(chartData, tokens, opts);
    case "number-stat":  return createBigNumberGroup(chartData, tokens, opts);
    default:             return createChartFabricImage(chartType, chartData, theme, opts);
  }
}
