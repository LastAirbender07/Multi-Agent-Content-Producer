import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type * as fabric from "fabric";
import { buildSideBySideLayout } from "./sideBySide";

// layout === 0: text left (57%), image right (43%)
export async function buildLayoutImgRight(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  return buildSideBySideLayout("imageRight", slide, imageUrl!, t, objects);
}
