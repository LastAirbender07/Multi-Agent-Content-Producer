import * as fabric from "fabric";
import { createBrandBar, createGlowBg, createLuminaBg, createPillButton, makeText, makeTitleText } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS             = 1080;
const CTA_BTN_LABEL  = "Follow for more →";
const CTA_BTN_W      = 340;
const CTA_BTN_H      = 66;

export async function buildAuroraCta(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];
  const dark = isDarkTheme(t);

  // Solid base — Aurora: dark bg canvas, Lumina: white canvas (createLuminaBg draws over it)
  objects.push(new fabric.Rect({
    left:0, top:0, width:CS, height:CS, fill:t.bg,
    selectable:false, evented:false,
    originX:"left" as const, originY:"top" as const,
  }));

  if (dark) {
    // CSS uses ~864px effective radius; our gradient is steeper so rx=ry=900 compensates.
    // Centers at CSS-equivalent positions (864,216) and (216,864). left = centerX - rx, top = centerY - ry.
    objects.push(...createGlowBg([
      { rx:900, ry:900, left:-36,  top:-684, color:t.secondary, opacity:0.28 },  // teal   center=(864,216)
      { rx:900, ry:900, left:-684, top:-36,  color:t.primary,   opacity:0.40 },  // purple center=(216,864)
    ]));
  } else {
    // Lumina: use shared light-theme background (diagonal gradient + corner glows)
    objects.push(...createLuminaBg(t, CS));
  }

  // Inner content — vertically centered, two-pass using Fabric text measurement
  const CONTENT_H = CS - t.brandBarH;
  const titleObj  = makeTitleText(slide.title || "Follow for more →", {
    t, role:"cta_headline", fontFamily:`${t.fontTitle}, sans-serif`,
    fontSize:64, lineHeight:1.1, textAlign:"center", width:CS-140, left:70, top:0,
  });
  const bodyObj = slide.body
    ? makeText(slide.body, { role:"cta_sub", fontSize:26, fill:t.muted, lineHeight:1.5, textAlign:"center", width:CS-240, left:120, top:0, originX:"left" as const, originY:"top" as const })
    : null;

  const titleH = titleObj.calcTextHeight() + 48;
  const bodyH  = bodyObj ? bodyObj.calcTextHeight() + 52 : 0;
  const totalH = titleH + bodyH + CTA_BTN_H + 40;
  let   curY   = Math.max(80, (CONTENT_H - totalH) / 2);

  titleObj.set({ left: 70, top: curY });
  objects.push(titleObj);
  curY += titleH;

  if (bodyObj) {
    bodyObj.set({ left: 120, top: curY });
    objects.push(bodyObj);
    curY += bodyH;
  }

  const btn = createPillButton(t, {
    label: CTA_BTN_LABEL,
    style: "gradient",
    width: CTA_BTN_W, height: CTA_BTN_H, fontSize: 20,
    left: (CS - CTA_BTN_W) / 2, top: curY,
    role: "cta_button",
  });
  objects.push(btn);

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
