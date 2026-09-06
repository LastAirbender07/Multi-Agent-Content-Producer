/**
 * coverPolaroidFrame.ts
 * Dropper for the Polaroid-style photo-print frame (makePolaroidFrame).
 * ASYNC — may load an initial image via FabricImage.fromURL.
 * Drops a white-bordered polaroid frame with a grey photo placeholder;
 * the photo slot can be filled by dragging an image from the Images panel
 * onto the selected component, or via the "Replace Photo" button in ContextToolbar.
 */
import type { CanvasTokens } from "@/utils/canvasTokens";
import type * as fabricNs from "fabric";

export async function dropCoverPolaroidFrame(
  canvas: fabricNs.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makePolaroidFrame } = await import("@/utils/canvasTemplates/shared/cover");

  const frameW = 380;
  const frameH = 460;

  const group = await makePolaroidFrame({
    x:     Math.max(0, dropX - frameW / 2),
    y:     Math.max(0, dropY - frameH / 2),
    frameW,
    frameH,
    padX:       24,
    padTop:     24,
    padBottom:  100,
    cornerRadius: 4,
    tilt:       -2,
    caption:    "— caption —",
  });

  group.set({ selectable: true, evented: true });
  canvas.add(group);
  canvas.setActiveObject(group);
}
