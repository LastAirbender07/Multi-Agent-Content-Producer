import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropStatBlock(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createBigNumberGroup } = await import("@/utils/canvasTemplates/chartRenderer");
  const group = createBigNumberGroup(
    { statValue: "42%", statLabel: "Key Metric", statContext: "Source: 2024", labels: [], values: [] },
    t,
    { left: Math.max(0, dropX - 476), top: Math.max(0, dropY - 150) },
  );
  canvas.add(group); canvas.setActiveObject(group);
}
