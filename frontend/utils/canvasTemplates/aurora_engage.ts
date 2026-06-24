import * as fabric from "fabric";
import { createBrandBar, createGradientBg, createEyebrowPill, createPillButton, makeText, makeTitleText } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

export async function buildAuroraEngage(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  const CONTENT_H = CS - t.brandBarH;

  // 1. Gradient background
  objects.push(createGradientBg(t, CONTENT_H, 135));

  // 2. Decorative rings — large, dramatic, peek from corners
  const makeRing = (size: number, left: number, top: number, opacity = 1) => {
    const el = new fabric.Circle({
      radius:size/2, left, top,
      fill:"transparent", stroke:"rgba(255,255,255,0.14)", strokeWidth:1.5,
      opacity, selectable:false, evented:false,
      originX:"left" as const, originY:"top" as const,
    });
    (el as fabric.Circle & { data?: unknown }).data = { role:"deco_ring" };
    return el;
  };
  objects.push(makeRing(720, CS-280, -320));
  objects.push(makeRing(480, -200, CONTENT_H-260));
  objects.push(makeRing(240, CS-200, CONTENT_H-240, 0.55));

  // 3. Content — vertically centered
  const EYEBROW_TEXT  = "Follow for more insights";
  const eyebrowH      = 36 + 28;
  const titleLines    = Math.max(1, Math.ceil((slide.title?.length ?? 30) / 28));
  const titleH        = titleLines * 46 * 1.18 + 28;
  const bodyLines     = slide.body ? Math.max(1, Math.ceil(slide.body.length / 44)) : 0;
  const bodyH         = bodyLines * 22 * 1.5 + 28;
  const PILL_TEXT     = "Hit Follow — it's worth it";
  const pillH         = 66 + 24;
  const totalH        = eyebrowH + titleH + bodyH + pillH;
  let   curY          = Math.max(56, (CONTENT_H - totalH) / 2);

  // Eyebrow pill — centered, using reusable component
  objects.push(createEyebrowPill(EYEBROW_TEXT, t, CS/2, curY));
  curY += eyebrowH;

  // Title
  objects.push(makeTitleText(slide.title || "Worth following?", {
    t, role:"engage_title",
    fontFamily:`${t.fontTitle}, sans-serif`,
    fontSize:46, lineHeight:1.18, textAlign:"center", fill:"#ffffff",
    width:CS-160, left:80, top:curY,
  }));
  curY += titleH;

  // Body
  if (slide.body) {
    objects.push(makeText(slide.body, {
      role:"engage_body", fontSize:22, fill:"rgba(255,255,255,0.82)",
      lineHeight:1.5, textAlign:"center", width:CS-240, left:120, top:curY,
      originX:"left" as const, originY:"top" as const,
    }));
    curY += bodyH;
  }

  // Bottom CTA pill — B2 Ghost style: transparent + white border + white text
  // Top eyebrow pill — B3 Frosted Glow (handled by createEyebrowPill in shared.ts)
  const PILL_W = Math.round(PILL_TEXT.length * (20 * 0.52) + 80);
  const btn = createPillButton(t, {
    label: PILL_TEXT,
    style: "ghost",
    width: PILL_W, height: 58, fontSize: 18,
    left: (CS - PILL_W) / 2, top: curY,
    role: "engage_pill",
  });
  objects.push(btn);

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
