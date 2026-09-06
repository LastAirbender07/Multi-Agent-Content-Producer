/**
 * compactEditorialHeader.ts
 * Dropper for the SahilBloom-style editorial header bar.
 *
 * CRITICAL: makeEditorialHeaderBar returns a TUPLE [Textbox, Textbox, Rect],
 * NOT a Group. Each element must be added to the canvas individually.
 *
 * Uses COMPACT_TOKENS directly — the passed CanvasTokens (aurora/lumina) is intentionally ignored.
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropCompactEditorialHeader(
  canvas: fabric.Canvas,
  _t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { makeEditorialHeaderBar } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");

  const topY = Math.max(0, dropY);
  const [handle, series, rule] = makeEditorialHeaderBar({
    handle: "@yourbrand",
    seriesTitle: "Your Series Title.",
    canvasWidth: 1080,
    tokens: COMPACT_TOKENS,
    y: topY,
    ruleY: topY + 36,
  });

  // Add all three elements individually — do NOT wrap in a Group
  handle.set({ selectable: true, evented: true });
  series.set({ selectable: true, evented: true });
  rule.set({ selectable: true, evented: true });

  canvas.add(handle);
  canvas.add(series);
  canvas.add(rule);
  // Set handle as active so user immediately sees something selected
  canvas.setActiveObject(handle);
}
