/**
 * coverDisplayHeadline.ts
 * Dropper for the Inter Black 140pt display headline (makeDisplayHeadline).
 * Sync primitive — returns fabric.Textbox.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverDisplayHeadline(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeDisplayHeadline } = await import("@/utils/canvasTemplates/shared/cover");

  const tb = makeDisplayHeadline({
    text: "Your Big Headline Here",
    x:     Math.max(0, dropX - 200),
    y:     Math.max(0, dropY - 70),
    width: 900,
    fontSize: 140,
  });

  tb.set({ selectable: true, evented: true });
  canvas.add(tb);
  canvas.setActiveObject(tb);
}
