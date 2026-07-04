import * as fabric from "fabric";
import { createBrandBar, createGradientBg, createEyebrowPill, createPillButton, makeText, makeTitleText, estimatePillWidth } from "./shared";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";

const CS = 1080;

const EYEBROW_TEXT = "Follow for more insights";
const PILL_TEXT    = "Hit Follow — it's worth it";

export async function buildAuroraEngage(
  slide: SlideData,
  _imageUrl: string | null,
  t: CanvasTokens,
  meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  const CONTENT_H = CS - t.brandBarH;

  // 1. Gradient background
  objects.push(createGradientBg(t, CONTENT_H));

  // 2. Decorative rings — large, dramatic, peek from corners
  const makeRing = (size: number, left: number, top: number, opacity = 1) => {
    const el = new fabric.Circle({
      radius: size / 2, left, top,
      fill: "transparent", stroke: "rgba(255,255,255,0.14)", strokeWidth: 1.5,
      opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    (el as fabric.Circle & { data?: unknown }).data = { role: "deco_ring" };
    return el;
  };
  objects.push(makeRing(720, CS - 280, -320));
  objects.push(makeRing(480, -200, CONTENT_H - 260));
  objects.push(makeRing(240, CS - 200, CONTENT_H - 240, 0.55));

  // 3. Two-pass layout — create text objects, measure, then position
  const EYEBROW_H = 36 + 28;  // pill height + gap below
  const PILL_H    = 66 + 24;  // button height + gap below

  const titleObj = makeTitleText(slide.title || "Worth following?", {
    t, role: "engage_title",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 46, lineHeight: 1.18, textAlign: "center", fill: "#ffffff",
    width: CS - 160, left: 80, top: 0,
  });

  const bodyObj = slide.body
    ? makeText(slide.body, {
        role: "engage_body", fontSize: 26, fill: "rgba(255,255,255,0.88)",
        lineHeight: 1.5, textAlign: "center", width: CS - 240, left: 120, top: 0,
        originX: "left" as const, originY: "top" as const,
      })
    : null;

  const titleH = titleObj.calcTextHeight() + 28;
  const bodyH  = bodyObj ? bodyObj.calcTextHeight() + 28 : 0;
  const totalH = EYEBROW_H + titleH + bodyH + PILL_H;
  let curY     = Math.max(56, (CONTENT_H - totalH) / 2);

  // Eyebrow pill — centered
  objects.push(createEyebrowPill(EYEBROW_TEXT, t, CS / 2, curY));
  curY += EYEBROW_H;

  titleObj.set({ top: curY });
  objects.push(titleObj);
  curY += titleH;

  if (bodyObj) {
    bodyObj.set({ top: curY });
    objects.push(bodyObj);
    curY += bodyH;
  }

  const PILL_W = estimatePillWidth(PILL_TEXT, 18);
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
