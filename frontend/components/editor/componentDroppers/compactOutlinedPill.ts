/**
 * compactOutlinedPill.ts
 * Dropper for the compact-family peach outlined category pill.
 * Uses COMPACT_TOKENS directly — the passed CanvasTokens (aurora/lumina) is intentionally ignored.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCompactOutlinedPill(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeOutlinedPill } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");

  const pill = makeOutlinedPill({
    text: "CATEGORY",
    x: Math.max(0, dropX - 70),
    y: Math.max(0, dropY - 26),
    tokens: COMPACT_TOKENS,
    height: 52,
    padding: 28,
    fontSize: 22,
    letterSpacing: 180,
  });

  pill.set({ selectable: true, evented: true });
  canvas.add(pill);
  canvas.setActiveObject(pill);
}
