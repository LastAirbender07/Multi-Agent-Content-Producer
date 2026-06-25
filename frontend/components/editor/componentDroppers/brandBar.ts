import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropBrandBar(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  apiBase: string,
): Promise<void> {
  const { createBrandBar } = await import("@/utils/canvasTemplates/shared");
  const objs = await createBrandBar(t, `${apiBase}/assets/brand/logo.png`, "THEOPINIONBOARD", 1, 11);
  objs.forEach(obj => obj.set({ selectable: true, evented: true }));
  const group = new fabric.Group(objs, { originX: "left" as const, originY: "top" as const });
  (group as fabric.Group & { data?: unknown }).data = { role: "dropped_brand_bar" };
  canvas.add(group); canvas.setActiveObject(group);
}
