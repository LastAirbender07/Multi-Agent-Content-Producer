import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropEyebrowPill(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createEyebrowPill } = await import("@/utils/canvasTemplates/shared");
  const pill = createEyebrowPill(
    "FOLLOW FOR MORE",
    t,
    Math.max(80, dropX),    // left arg = center X
    Math.max(0, dropY - 17),
  );
  canvas.add(pill); canvas.setActiveObject(pill);
}
