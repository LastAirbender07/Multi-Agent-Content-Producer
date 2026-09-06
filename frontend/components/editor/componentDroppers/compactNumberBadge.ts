/**
 * compactNumberBadge.ts
 * Dropper for the compact-family outlined circle step number badge.
 * Uses COMPACT_TOKENS directly — the passed CanvasTokens (aurora/lumina) is intentionally ignored.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCompactNumberBadge(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeNumberBadge } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");

  const badge = makeNumberBadge({
    number: 1,
    cx: dropX,
    cy: dropY,
    tokens: COMPACT_TOKENS,
  });

  badge.set({ selectable: true, evented: true });
  canvas.add(badge);
  canvas.setActiveObject(badge);
}
