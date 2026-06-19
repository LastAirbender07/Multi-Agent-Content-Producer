import * as fabric from "fabric";
import { createBrandBar, createGradientBg, makeText, makeTitleText } from "./shared";
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

  // 1. Gradient background (primary top-right → secondary bottom-left = CSS 135deg)
  objects.push(createGradientBg(t, CONTENT_H, 135));

  // 2. Decorative rings — larger, more dramatic, peeking from corners
  const makeRing = (size: number, left: number, top: number, opacity = 1) => {
    const el = new fabric.Circle({
      radius: size / 2, left, top,
      fill: "transparent",
      stroke: "rgba(255,255,255,0.14)", strokeWidth: 1.5,
      opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    (el as fabric.Circle & { data?: unknown }).data = { role: "deco_ring" };
    return el;
  };
  // Large ring top-right — partially off canvas for drama
  objects.push(makeRing(720, CS - 280, -320));
  // Medium ring bottom-left
  objects.push(makeRing(480, -200, CONTENT_H - 260));
  // Small accent ring
  objects.push(makeRing(240, CS - 200, CONTENT_H - 240, 0.55));

  // 3. Inner content — vertically centered
  const eyebrowH  = 36 + 24;
  const titleLines = Math.max(1, Math.ceil((slide.title?.length ?? 30) / 28));
  const titleH    = titleLines * 46 * 1.18 + 24;
  const bodyLines = slide.body ? Math.max(1, Math.ceil(slide.body.length / 44)) : 0;
  const bodyH     = bodyLines * 22 * 1.5 + 28;
  const pillH     = 60 + 24;
  const totalH    = eyebrowH + titleH + bodyH + pillH;
  let curY = Math.max(56, (CONTENT_H - totalH) / 2);

  // Eyebrow pill
  const EYEBROW_TEXT = "Follow for more insights";
  const eyebrowW = EYEBROW_TEXT.length * 8.5 + 48;
  const eyebrowLeft = (CS - eyebrowW) / 2;
  const eyebrowBg = new fabric.Rect({
    left: 0, top: 0, width: eyebrowW, height: 36, rx: 999,
    fill: "rgba(255,255,255,0.14)", stroke: "rgba(255,255,255,0.22)", strokeWidth: 1,
    originX: "left" as const, originY: "top" as const,
  });
  const eyebrowText = new fabric.Text(EYEBROW_TEXT, {
    left: eyebrowW / 2, top: 18,
    fontSize: 13, fontWeight: "700",
    fill: "rgba(255,255,255,0.80)", fontFamily: t.fontBody, charSpacing: 80,
    originX: "center" as const, originY: "center" as const,
  });
  const eyebrowGroup = new fabric.Group([eyebrowBg, eyebrowText], {
    left: eyebrowLeft, top: curY,
    originX: "left" as const, originY: "top" as const,
  });
  (eyebrowGroup as fabric.Group & { data?: unknown }).data = { role: "eyebrow_pill" };
  objects.push(eyebrowGroup);
  curY += eyebrowH;

  // Title
  objects.push(makeTitleText(slide.title || "Worth following?", {
    t, role: "engage_title",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 46, lineHeight: 1.18, textAlign: "center", fill: "#ffffff",
    width: CS - 160, left: 80, top: curY,
  }));
  curY += titleH;

  // Body
  if (slide.body) {
    objects.push(makeText(slide.body, {
      role: "engage_body", fontSize: 22, fill: "rgba(255,255,255,0.82)",
      lineHeight: 1.5, textAlign: "center", width: CS - 240, left: 120, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += bodyH;
  }

  // Modern pill CTA button
  const PILL_TEXT = "Hit Follow — it's worth it";
  const pillW    = Math.round(PILL_TEXT.length * 9.5 + 72);
  const pillH_px = 60;
  const pillLeft = (CS - pillW) / 2;
  const pillBg = new fabric.Rect({
    left: 0, top: 0, width: pillW, height: pillH_px, rx: pillH_px / 2,
    fill: "rgba(255,255,255,0.20)",
    stroke: "rgba(255,255,255,0.32)", strokeWidth: 1.5,
    originX: "left" as const, originY: "top" as const,
  });
  const pillText = new fabric.Text(PILL_TEXT, {
    left: pillW / 2, top: pillH_px / 2,
    fontSize: 18, fontWeight: "700",
    fill: "#fff", fontFamily: t.fontBody, charSpacing: 20,
    originX: "center" as const, originY: "center" as const,
  });
  const pillGroup = new fabric.Group([pillBg, pillText], {
    left: pillLeft, top: curY,
    originX: "left" as const, originY: "top" as const,
  });
  (pillGroup as fabric.Group & { data?: unknown }).data = { role: "engage_pill" };
  objects.push(pillGroup);

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
