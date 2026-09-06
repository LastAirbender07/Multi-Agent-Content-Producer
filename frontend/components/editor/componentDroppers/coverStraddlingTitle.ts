/**
 * coverStraddlingTitle.ts
 * Dropper for the white card with straddling chip title.
 * Sync primitive — returns fabric.Group.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverStraddlingTitle(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeWhiteCardWithStraddlingTitle } = await import("@/utils/canvasTemplates/shared/cover");

  const group = makeWhiteCardWithStraddlingTitle({
    cardX:     Math.max(0, dropX - 240),
    cardY:     Math.max(28, dropY),   // min 28 to ensure chip doesn't clip off top
    cardWidth:  480,
    cardHeight: 320,
    chipText:   "VIRAL REEL",
  });

  group.set({ selectable: true, evented: true });
  canvas.add(group);
  canvas.setActiveObject(group);
}
