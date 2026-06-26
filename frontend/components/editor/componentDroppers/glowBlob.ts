import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropGlowBlob(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createGlowBg } = await import("@/utils/canvasTemplates/shared");
  const [blob] = createGlowBg([
    { rx: 240, ry: 240, left: dropX - 240, top: dropY - 240, color: t.primary, opacity: 0.45 },
  ]);
  (blob as fabric.FabricObject & { selectable: boolean; evented: boolean }).selectable = true;
  (blob as fabric.FabricObject & { selectable: boolean; evented: boolean }).evented = true;
  canvas.add(blob);
  canvas.setActiveObject(blob);
}
