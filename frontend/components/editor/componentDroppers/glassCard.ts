import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

const CANVAS_SIZE = 1080;

export async function dropGlassCard(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createGlassCard } = await import("@/utils/canvasTemplates/shared");
  const W = 400, H = 280;
  const left = Math.max(0, Math.min(dropX - W / 2, CANVAS_SIZE - W));
  const top  = Math.max(0, Math.min(dropY - H / 2, CANVAS_SIZE - H));
  const objs = await createGlassCard({ left, top, width: W, height: H }, null, 16, t, 24);
  objs.forEach(obj => obj.set({ selectable: true, evented: true }));
  const group = new fabric.Group(objs, { left, top, originX: "left" as const, originY: "top" as const });
  (group as fabric.Group & { data?: unknown }).data = { role: "dropped_glass_card" };
  canvas.add(group); canvas.setActiveObject(group);
}
