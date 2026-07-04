// Pure Fabric group builder for big-number / stat display.
// No Chart.js dependency — purely Fabric objects.

import * as fabric from "fabric";
import type { ChartData } from "@/types/chart";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { makeGroup } from "./helpers";

export function createBigNumberGroup(
  chartData: ChartData,
  tokens: CanvasTokens,
  opts: { left: number; top: number; width?: number },
): fabric.Group {
  const W     = opts.width ?? 952;
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

  return makeGroup(
    items,
    { left: opts.left, top: opts.top, originX: "left" as const, originY: "top" as const },
    { role: "chart", chartType: "number-stat", chartData, theme: "aurora", width: W, height: 220 },
  );
}
