import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createLuminaBg } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { buildLayoutTextOnly } from "./contentLayouts/textOnly";
import { buildLayoutImgRight } from "./contentLayouts/imgRight";
import { buildLayoutTextTop } from "./contentLayouts/textTop";
import { buildLayoutImgTop } from "./contentLayouts/imgTop";
import { buildLayoutImgLeft } from "./contentLayouts/imgLeft";

const CS = 1080;

export async function buildAuroraContent(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
  layout: 0 | 1 | 2 | 3 | -1,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const has_image = imageUrl !== null;

  // Background
  if (imageUrl && isDarkTheme(t)) {
    const bg = await createBgImage(imageUrl, "blur-darken");
    if (bg) objects.push(bg);
    objects.push(createOverlay("content", t));
  } else if (isDarkTheme(t)) {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS, fill: t.bg,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
    objects.push(createOverlay("content", t));
  } else {
    // Lumina: diagonal gradient + corner glows via shared factory
    objects.push(...createLuminaBg(t, CS));
  }

  switch (layout) {
    case -1:
      await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 0:
      if (has_image) await buildLayoutImgRight(slide, imageUrl, t, meta, objects);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 1:
      if (has_image) await buildLayoutTextTop(slide, imageUrl, t, meta, objects);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 2:
      if (has_image) await buildLayoutImgTop(slide, imageUrl, t, meta, objects);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 3:
      if (has_image) await buildLayoutImgLeft(slide, imageUrl, t, meta, objects);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
