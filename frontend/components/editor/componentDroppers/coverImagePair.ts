/**
 * coverImagePair.ts
 * Dropper for the tilted two-image pair (makeTiltedImagePair).
 * ASYNC — the primitive loads images via FabricImage.fromURL.
 * When no src is provided the primitive renders placeholder coloured rects.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverImagePair(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeTiltedImagePair } = await import("@/utils/canvasTemplates/shared/cover");

  const group = await makeTiltedImagePair({
    images: [
      { src: "", tilt: -6, width: 340, height: 460, cornerRadius: 20 },
      { src: "", tilt:  5, width: 300, height: 400, cornerRadius: 20 },
    ],
    x: Math.max(0, dropX - 270),
    y: Math.max(0, dropY - 230),
  });

  group.set({ selectable: true, evented: true });
  canvas.add(group);
  canvas.setActiveObject(group);
}
