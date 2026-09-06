/**
 * compactDotProgress.ts
 * Dropper for the compact-family dot progress indicator.
 * Uses COMPACT_TOKENS directly — the passed CanvasTokens (aurora/lumina) is intentionally ignored.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCompactDotProgress(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeDotProgressIndicator } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");

  const dots = makeDotProgressIndicator({
    count: 5,
    active: 2,
    x: Math.max(0, dropX - 42),
    y: Math.max(0, dropY - 10),
    tokens: COMPACT_TOKENS,
  });

  dots.set({ selectable: true, evented: true });
  canvas.add(dots);
  canvas.setActiveObject(dots);
}
