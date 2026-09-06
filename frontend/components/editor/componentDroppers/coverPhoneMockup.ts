/**
 * coverPhoneMockup.ts
 * Dropper for the tilted phone mockup (makeTiltedPhoneMockup).
 * ASYNC — the primitive loads a screen image via FabricImage.fromURL.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverPhoneMockup(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeTiltedPhoneMockup } = await import("@/utils/canvasTemplates/shared/cover");

  const group = await makeTiltedPhoneMockup({
    x: Math.max(0, dropX - 180),
    y: Math.max(0, dropY - 390),
    width: 360,
    height: 780,
    tilt: -8,
  });

  group.set({ selectable: true, evented: true });
  canvas.add(group);
  canvas.setActiveObject(group);
}
