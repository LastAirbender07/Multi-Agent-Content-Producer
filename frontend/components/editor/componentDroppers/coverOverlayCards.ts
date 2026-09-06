/**
 * coverOverlayCards.ts
 * Dropper for frosted-glass floating stat cards (makeOverlayCards).
 * Sync primitive — returns Group[].
 * Drops two example cards near the cursor; each is individually selectable.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCoverOverlayCards(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeOverlayCards } = await import("@/utils/canvasTemplates/shared/cover");

  const cards = makeOverlayCards([
    { value: "42%",  label: "engagement rate", x: Math.max(0, dropX - 110), y: Math.max(0, dropY - 44) },
    { value: "2.3M", label: "weekly reach",     x: Math.max(0, dropX + 120), y: Math.max(0, dropY + 20) },
  ]);

  cards.forEach(card => {
    card.set({ selectable: true, evented: true });
    canvas.add(card);
  });

  if (cards.length > 0) {
    canvas.setActiveObject(cards[cards.length - 1]);
  }
}
