/**
 * coverMetallicGradient.ts
 * Dropper for the full-canvas warm-brown radial gradient background (makeMetallicGradient).
 * This is a background element — it is sent to the back after being added.
 * Sync primitive — returns fabric.Rect.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverMetallicGradient(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  _dropX: number,
  _dropY: number,
): Promise<void> {
  const { makeMetallicGradient } = await import("@/utils/canvasTemplates/shared/cover");

  const rect = makeMetallicGradient(1080, 1080);

  // Allow selection so user can remove / reorder it, but send to back
  rect.set({ selectable: true, evented: true });
  canvas.add(rect);
  canvas.sendObjectToBack(rect);
  canvas.setActiveObject(rect);
}
