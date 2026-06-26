import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropDecoRing(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const radius = 120;
  const el = new fabric.Circle({
    radius,
    left: dropX - radius,
    top: dropY - radius,
    fill: "transparent",
    stroke: "rgba(255,255,255,0.18)",
    strokeWidth: 2,
    opacity: 1,
    selectable: true,
    evented: true,
    originX: "left" as const,
    originY: "top" as const,
  });
  (el as fabric.Circle & { data?: unknown }).data = { role: "deco_ring" };
  canvas.add(el);
  canvas.setActiveObject(el);
}
