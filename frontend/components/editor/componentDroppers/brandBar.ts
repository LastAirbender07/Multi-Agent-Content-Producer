import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

export async function dropBrandBar(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  apiBase: string,
  // dropX/dropY accepted for API consistency but brand-bar always snaps to canvas bottom
  _dropX?: number,
  _dropY?: number,
): Promise<void> {
  const { createBrandBar } = await import("@/utils/canvasTemplates/shared");
  const objs = await createBrandBar(t, `${apiBase}/assets/brand/logo.png`, "THEOPINIONBOARD", 1, 11);
  // Each child is pre-positioned by createBrandBar at canvas bottom — set them selectable
  // so they are interactive when the group is ungrouped
  objs.forEach(obj => obj.set({ selectable: true, evented: true }));
  const group = new fabric.Group(objs, {
    originX: "left" as const,
    originY: "top" as const,
    selectable: true,
    evented: true,
    interactive: true,
  });
  (group as fabric.Group & { data?: unknown }).data = { role: "dropped_brand_bar" };
  canvas.add(group); canvas.setActiveObject(group);
}
