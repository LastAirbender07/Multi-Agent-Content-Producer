import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropQuoteBlock(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createInsightItem } = await import("@/utils/canvasTemplates/shared");
  const insight = createInsightItem(
    "Add your quote or insight here.",
    t,
    Math.max(0, dropX - 400),
    Math.max(0, dropY - 20),
    800,
  );
  canvas.add(insight); canvas.setActiveObject(insight);
}
