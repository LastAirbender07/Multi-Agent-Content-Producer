import * as fabric from "fabric";
import { createBrandBar, createGlowBg, createPillButton, makeText, makeTitleText } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

export async function buildAuroraCta(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // Dark background
  objects.push(new fabric.Rect({
    left:0, top:0, width:CS, height:CS, fill:"#090909",
    selectable:false, evented:false,
    originX:"left" as const, originY:"top" as const,
  }));

  // Massive radial glows — cover ~70% of slide, bleed off canvas edges for drama
  objects.push(...createGlowBg([
    // Purple glow — bottom-left, huge, dominates that corner
    { rx:700, ry:680, left:-350, top:CS-600,  color:t.primary,   opacity:0.70 },
    // Teal glow — top-right, huge, dominates that corner
    { rx:640, ry:620, left:CS-420, top:-300, color:t.secondary, opacity:0.60 },
    // Subtle center ambient that connects both
    { rx:320, ry:320, left:CS/2-160, top:CS/2-160, color:t.primary, opacity:0.12 },
  ]));

  // Inner content — vertically centered
  const CONTENT_H = CS - t.brandBarH;
  const titleLines = Math.max(1, Math.ceil((slide.title?.length ?? 20) / 28));
  const titleH     = titleLines * 64 * 1.1 + 36;
  const bodyH      = slide.body ? Math.max(1, Math.ceil(slide.body.length / 42)) * 26 * 1.5 + 36 : 0;
  const BTN_W      = 340;
  const BTN_H      = 66;
  const btnH       = BTN_H + 40;
  const totalH     = titleH + bodyH + btnH;
  let   curY       = Math.max(60, (CONTENT_H - totalH) / 2);

  // Headline
  objects.push(makeTitleText(slide.title || "Follow for more →", {
    t, role:"cta_headline",
    fontFamily:`${t.fontTitle}, sans-serif`,
    fontSize:64, lineHeight:1.1, textAlign:"center",
    width:CS-140, left:70, top:curY,
  }));
  curY += titleH;

  // Sub-text
  if (slide.body) {
    objects.push(makeText(slide.body, {
      role:"cta_sub", fontSize:26, fill:t.muted, lineHeight:1.5,
      textAlign:"center", width:CS-240, left:120, top:curY,
      originX:"left" as const, originY:"top" as const,
    }));
    curY += bodyH;
  }

  // Gradient pill button — using the reusable component
  const btn = createPillButton(t, {
    label:"Follow for more  →",
    style:"gradient",
    width:BTN_W, height:BTN_H, fontSize:20,
    left:(CS-BTN_W)/2, top:curY,
    role:"cta_button",
  });
  objects.push(btn);

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
