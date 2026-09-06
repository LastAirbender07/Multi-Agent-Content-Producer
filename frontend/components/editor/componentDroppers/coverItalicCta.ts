/**
 * coverItalicCta.ts
 * Dropper for the Playfair Bold Italic CTA line (makeItalicCtaLine).
 * Sync primitive — returns fabric.Textbox.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverItalicCta(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeItalicCtaLine } = await import("@/utils/canvasTemplates/shared/cover");

  const tb = makeItalicCtaLine({
    text: `Comment "TEMPLATE" for the Canva link`,
    x:        Math.max(0, dropX - 200),
    y:        Math.max(0, dropY - 20),
    maxWidth: 700,
  });

  tb.set({ selectable: true, evented: true });
  canvas.add(tb);
  canvas.setActiveObject(tb);
}
