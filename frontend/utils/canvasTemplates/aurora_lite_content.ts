/**
 * aurora_lite_content.ts — Aurora Lite family / content slides with images
 *
 * Same layout engine as aurora-extended (imgRight/imgLeft/imgTop/textTop/textOnly)
 * but with larger font sizes suited for short (≤15 word) lite slides.
 *
 * Aurora-extended uses: title 38-44pt, body 19-22pt (designed for 130w dense slides)
 * Aurora-lite uses:     title 52-60pt, body 26-30pt (designed for ≤15w lite slides)
 *
 * The bigger type fills the canvas proportionally when body word count is low —
 * matching the user-visible request for "bigger, more modern" text on content slides.
 *
 * Density rules (≤15w body, no bullets) are enforced by slide_validator.py upstream.
 */
import * as fabric from "fabric";
import { createBrandBar, createBgImage, createOverlay, createLuminaBg } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { buildLayoutTextOnly } from "./contentLayouts/textOnly";
import { buildLayoutImgRight } from "./contentLayouts/imgRight";
import { buildLayoutTextTop }   from "./contentLayouts/textTop";
import { buildLayoutImgTop }    from "./contentLayouts/imgTop";
import { buildLayoutImgLeft }   from "./contentLayouts/imgLeft";

const CS = 1080;

// Aurora-lite font sizes — bigger than aurora-extended, fill the canvas for short copy
const LITE_OPTS_SIDE = { titleFontSize: 56, bodyFontSize: 28 };   // imgRight / imgLeft
const LITE_OPTS_TOP  = { titleFontSize: 52, bodyFontSize: 26 };   // textTop / imgTop
// textOnly uses aurora_lite_text_only.ts (96pt headline) — not this file

export async function buildAuroraLiteContent(
  slide: SlideData,
  imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
  layout: 0 | 1 | 2 | 3 | -1,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const has_image = imageUrl !== null;

  // Background — same as aurora-extended
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
    objects.push(...createLuminaBg(t, CS));
  }

  // Layout variants — same as aurora-extended but with bigger fonts via opts
  switch (layout) {
    case -1:
      await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 0:
      if (has_image) await buildLayoutImgRight(slide, imageUrl, t, meta, objects, LITE_OPTS_SIDE);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 1:
      if (has_image) await buildLayoutTextTop(slide, imageUrl, t, meta, objects, LITE_OPTS_TOP);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 2:
      if (has_image) await buildLayoutImgTop(slide, imageUrl, t, meta, objects, LITE_OPTS_TOP);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
    case 3:
      if (has_image) await buildLayoutImgLeft(slide, imageUrl, t, meta, objects, LITE_OPTS_SIDE);
      else           await buildLayoutTextOnly(slide, imageUrl, t, meta, objects);
      break;
  }

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
