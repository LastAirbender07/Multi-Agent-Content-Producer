import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createGlowBg } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
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
    // Lumina: richer diagonal gradient + stronger corner glows
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CS, height: CS,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: CS, y2: CS },
        colorStops: [
          { offset: 0,   color: "#E0E7FF" },  // indigo-100 — top-left
          { offset: 0.5, color: "#F4F7FF" },  // near-white center
          { offset: 1,   color: "#CCFBF1" },  // teal-100 — bottom-right
        ],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
    // Corner accent glows
    objects.push(...createGlowBg([
      { rx: 620, ry: 620, left: -400, top: -400, color: t.primary,   opacity: 0.22 },
      { rx: 580, ry: 580, left:  900, top:  640, color: t.secondary, opacity: 0.26 },
    ]));
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
