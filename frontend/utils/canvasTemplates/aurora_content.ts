import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { loadPanelImage } from "./contentLayouts/panelImage";
import { buildLayoutTextOnly } from "./contentLayouts/textOnly";
import { buildLayoutImgRight } from "./contentLayouts/imgRight";
import { buildLayoutTextTop } from "./contentLayouts/textTop";
import { buildLayoutImgTop } from "./contentLayouts/imgTop";
import { buildLayoutImgLeft } from "./contentLayouts/imgLeft";

export { loadPanelImage };

const CS = 1080;

export async function buildAuroraContent(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
  layout: 0 | 1 | 2 | 3 | -1,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const has_image = imageUrl !== null && layout !== -1;

  // Background — near-black with blurred image texture
  if (imageUrl) {
    const bg = await createBgImage(imageUrl, "blur-darken");
    if (bg) objects.push(bg);
  } else {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS, fill: "#090909",
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }
  objects.push(createOverlay("content", t));

  if (layout === -1 || !has_image) {
    await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
  } else if (layout === 0) {
    await buildLayoutImgRight(slide, imageUrl, t, meta, objects);
  } else if (layout === 1) {
    await buildLayoutTextTop(slide, imageUrl, t, meta, objects);
  } else if (layout === 2) {
    await buildLayoutImgTop(slide, imageUrl, t, meta, objects);
  } else if (layout === 3) {
    await buildLayoutImgLeft(slide, imageUrl, t, meta, objects);
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
