// Pure Fabric group builder for funnel charts (horizontal bars proportional to value).
// No Chart.js dependency — purely Fabric objects.

import * as fabric from "fabric";
import type { ChartData } from "@/types/chart";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { makeGroup } from "./helpers";

export function createFunnelGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number; height?: number },
): fabric.Group {
  const { labels = [], values = [] } = chartData;
  const W       = opts.width ?? 860;
  const n       = Math.max(1, labels.length);
  const maxVal  = Math.max(...values, 1);
  const TOTAL_H = opts.height ?? 320;
  const GAP     = Math.max(12, Math.round(TOTAL_H * 0.04));
  const ROW_H   = Math.max(36, Math.round((TOTAL_H - GAP * (n - 1)) / n));
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
      fontSize: 15, fontWeight: "700", fill: "#fff",
      originX: "right" as const, originY: "top" as const,
    }));
  });

  const height = n * (ROW_H + GAP) - GAP;
  return makeGroup(
    items,
    { left: opts.left, top: opts.top, originX: "left" as const, originY: "top" as const },
    { role: "chart", chartType: "funnel", chartData, theme: "aurora", width: W, height },
  );
}
