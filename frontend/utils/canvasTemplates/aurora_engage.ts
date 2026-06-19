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

  // 1. Gradient background (primary → secondary)
  objects.push(createGradientBg(t, CS - t.brandBarH, 135));

  // 2. Decorative rings
  const makeRing = (size: number, left: number, top: number, opacity = 1) => {
    const el = new fabric.Circle({
      radius: size / 2, left, top,
      fill: "transparent", stroke: "rgba(255,255,255,0.14)", strokeWidth: 1,
      opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    (el as fabric.Circle & { data?: unknown }).data = { role: "deco_ring" };
    return el;
  };
  objects.push(makeRing(560, -180, -200));
  objects.push(makeRing(360, -100, CS - t.brandBarH - 360 + 140));
  objects.push(makeRing(200, CS - 260, CS - t.brandBarH - 280, 0.6));

  // 3. Inner content — centered vertically
  const CONTENT_H = CS - t.brandBarH;
  const eyebrowH  = 40 + 28;
  const titleLines = Math.ceil((slide.title?.length ?? 20) / 30);
  const titleH    = titleLines * 46 * 1.18 + 28;
  const bodyH     = slide.body ? Math.ceil(slide.body.length / 42) * (22 * 1.6) + 28 : 0;
  const pillH     = 52 + 28;
  const totalH    = eyebrowH + titleH + bodyH + pillH;
  let curY = Math.max(60, (CONTENT_H - totalH) / 2);

  // Eyebrow pill
  const EYEBROW_TEXT = "Follow for more insights";
  const eyebrowW = EYEBROW_TEXT.length * 9 + 40;
  const eyebrowLeft = (CS - eyebrowW) / 2;
  const eyebrowBg = new fabric.Rect({
    left: 0, top: 0, width: eyebrowW, height: 36, rx: 999,
    fill: "rgba(255,255,255,0.12)", stroke: "rgba(255,255,255,0.20)", strokeWidth: 1,
    originX: "left" as const, originY: "top" as const,
  });
  const eyebrowText = new fabric.Text(EYEBROW_TEXT, {
    left: eyebrowW / 2, top: 18, fontSize: 14, fontWeight: "700",
    fill: "rgba(255,255,255,0.70)", fontFamily: t.fontBody, charSpacing: 140,
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
      lineHeight: 1.6, textAlign: "center", width: CS - 240, left: 120, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += bodyH;
  }

  // Bottom pill CTA
  const PILL_TEXT = "Hit Follow — it's worth it";
  const pillW    = PILL_TEXT.length * 10 + 72;
  const pillLeft = (CS - pillW) / 2;
  const pillBg = new fabric.Rect({
    left: 0, top: 0, width: pillW, height: 52, rx: 999,
    fill: "rgba(255,255,255,0.20)", stroke: "rgba(255,255,255,0.30)", strokeWidth: 1,
    originX: "left" as const, originY: "top" as const,
  });
  const pillText = new fabric.Text(PILL_TEXT, {
    left: pillW / 2, top: 26, fontSize: 18, fontWeight: "600",
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
