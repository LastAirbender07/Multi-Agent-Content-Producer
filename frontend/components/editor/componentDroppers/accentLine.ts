import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropAccentLine(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createAccentLine } = await import("@/utils/canvasTemplates/shared");
  const line = createAccentLine(t, 44, Math.max(0, dropX - 22), Math.max(0, dropY - 2));
  canvas.add(line); canvas.setActiveObject(line);
}
