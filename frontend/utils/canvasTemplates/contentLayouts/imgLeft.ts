import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type * as fabric from "fabric";
import { buildSideBySideLayout } from "./sideBySide";

// layout === 3: image left (43%), text right (57%) — mirror of layout-0
export async function buildLayoutImgLeft(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  _meta: unknown,
  objects: fabric.FabricObject[],
): Promise<void> {
  return buildSideBySideLayout("imageLeft", slide, imageUrl, t, objects);
}
