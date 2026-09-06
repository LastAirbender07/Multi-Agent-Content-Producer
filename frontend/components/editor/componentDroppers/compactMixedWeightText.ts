/**
 * compactMixedWeightText.ts
 * Dropper for the compact-family mixed-weight text block.
 * Uses COMPACT_TOKENS directly — the passed CanvasTokens (aurora/lumina) is intentionally ignored.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCompactMixedWeightText(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeMixedWeightText } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");

  const tb = makeMixedWeightText({
    runs: [{ text: "Your Big Idea Here", weight: 900 }],
    x: Math.max(0, dropX - 200),
    y: Math.max(0, dropY - 40),
    size: 80,
    maxWidth: 900,
    tokens: COMPACT_TOKENS,
    lineHeight: 1.05,
  });

  tb.set({ selectable: true, evented: true });
  (tb as fabric.Textbox & { data?: unknown }).data = { role: "compact_mixed_weight_text" };
  canvas.add(tb);
  canvas.setActiveObject(tb);
}
