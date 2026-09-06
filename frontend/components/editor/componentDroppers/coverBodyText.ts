/**
 * coverBodyText.ts
 * Dropper for the cover body copy block (makeBodyText).
 * Sync primitive — returns fabric.Textbox.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverBodyText(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeBodyText } = await import("@/utils/canvasTemplates/shared/cover");

  const tb = makeBodyText({
    text: "Supporting body copy goes here. Keep it concise and direct.",
    x:     Math.max(0, dropX - 150),
    y:     Math.max(0, dropY - 20),
    width: 700,
  });

  tb.set({ selectable: true, evented: true });
  canvas.add(tb);
  canvas.setActiveObject(tb);
}
