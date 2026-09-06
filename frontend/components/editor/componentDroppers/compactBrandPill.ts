/**
 * compactBrandPill.ts
 * Dropper for the compact-family dark brand pill (@handle / wordmark).
 * Uses COMPACT_TOKENS directly — the passed CanvasTokens (aurora/lumina) is intentionally ignored.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCompactBrandPill(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeBrandPill } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");

  const pill = makeBrandPill({
    wordmark: "@yourbrand",
    x: Math.max(0, dropX - 60),
    y: Math.max(0, dropY - 22),
    tokens: COMPACT_TOKENS,
  });

  pill.set({ selectable: true, evented: true });
  canvas.add(pill);
  canvas.setActiveObject(pill);
}
