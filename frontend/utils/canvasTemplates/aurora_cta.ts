import * as fabric from "fabric";
import { createBrandBar, makeText, makeTitleText } from "./shared";
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

  // 1. Radial glow circles (decorative, behind bg rect)
  const makeGlow = (w: number, h: number, left: number, top: number, color: string, opacity: number) => {
    const el = new fabric.Ellipse({
      rx: w / 2, ry: h / 2, left, top,
      fill: new fabric.Gradient({
        type: "radial", coords: { x1: w / 2, y1: h / 2, r1: 0, x2: w / 2, y2: h / 2, r2: Math.max(w, h) / 2 },
        colorStops: [{ offset: 0, color }, { offset: 1, color: "transparent" }],
      }),
      opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    (el as fabric.Ellipse & { data?: unknown }).data = { role: "bg_glow" };
    return el;
  };

  // Background
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: t.bg,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));
  objects.push(makeGlow(540, 430, -220, 540, t.primary,   0.35));
  objects.push(makeGlow(430, 430,  760, -130, t.secondary, 0.25));

  // Inner content — centered in content area
  const CONTENT_H = CS - t.brandBarH;
  const titleLines = Math.ceil((slide.title?.length ?? 20) / 28);
  const titleH     = titleLines * 64 * 1.1 + 40;
  const bodyH      = slide.body ? Math.ceil(slide.body.length / 40) * (26 * 1.5) + 40 : 0;
  const btnH       = 76 + 40;
  const totalH     = titleH + bodyH + btnH;
  let curY = Math.max(60, (CONTENT_H - totalH) / 2);

  // CTA headline
  objects.push(makeTitleText(slide.title || "Follow for more →", {
    t, role: "cta_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 64, lineHeight: 1.1, textAlign: "center",
    width: CS - 160, left: 80, top: curY,
  }));
  curY += titleH;

  // Sub-text
  if (slide.body) {
    objects.push(makeText(slide.body, {
      role: "cta_sub", fontSize: 26, fill: t.muted, lineHeight: 1.5,
      textAlign: "center", width: CS - 240, left: 120, top: curY,
      originX: "left" as const, originY: "top" as const,
    }));
    curY += bodyH;
  }

  // CTA button (pill shape Group)
  const BTN_W  = 360, BTN_H = 76;
  const btnLeft = (CS - BTN_W) / 2;
  const btnBg = new fabric.Rect({
    left: 0, top: 0, width: BTN_W, height: BTN_H, rx: 100,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: BTN_W, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  const btnText = new fabric.Text("Follow for more →", {
    left: BTN_W / 2, top: BTN_H / 2,
    fontSize: 22, fontWeight: "700", fill: "#fff",
    fontFamily: t.fontBody, charSpacing: 30,
    originX: "center" as const, originY: "center" as const,
  });
  const btnGroup = new fabric.Group([btnBg, btnText], {
    left: btnLeft, top: curY,
    originX: "left" as const, originY: "top" as const,
  });
  (btnGroup as fabric.Group & { data?: unknown }).data = { role: "cta_button" };
  objects.push(btnGroup);

  objects.push(...await createBrandBar(t, meta.logoUrl, meta.brandName, meta.slideNum, meta.totalSlides));
  return objects;
}
