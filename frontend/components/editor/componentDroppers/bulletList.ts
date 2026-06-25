import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropBulletList(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createBulletItem } = await import("@/utils/canvasTemplates/shared");
  const texts = [
    "Key insight number one",
    "Key insight number two",
    "Key insight number three",
  ];
  for (let i = 0; i < texts.length; i++) {
    const bullet = createBulletItem(texts[i], i, t, 22);
    bullet.set({
      left: Math.max(0, dropX - 400),
      top:  Math.max(0, dropY - 80 + i * 54),
      selectable: true, evented: true,
    });
    canvas.add(bullet);
  }
}
