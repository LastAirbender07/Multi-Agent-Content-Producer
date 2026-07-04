// Pure Fabric group builder for progress bar charts.
// No Chart.js dependency — purely Fabric objects.

import * as fabric from "fabric";
import type { ChartData } from "@/types/chart";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { makeGroup } from "./helpers";

export function createProgressGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const W       = opts.width ?? 780;
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
