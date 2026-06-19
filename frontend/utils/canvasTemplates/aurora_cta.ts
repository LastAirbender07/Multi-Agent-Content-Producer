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

  // Dark background
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS, fill: "#090909",
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  // Large radial glows — much bigger to fill more of the slide
  const makeGlow = (rx: number, ry: number, left: number, top: number, color: string, opacity: number) => {
    const el = new fabric.Ellipse({
      rx, ry, left, top,
      fill: new fabric.Gradient({
        type: "radial",
        coords: { x1: rx, y1: ry, r1: 0, x2: rx, y2: ry, r2: Math.max(rx, ry) },
        colorStops: [{ offset: 0, color }, { offset: 0.5, color: color + "60" }, { offset: 1, color: "transparent" }],
      }),
      opacity, selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    (el as fabric.Ellipse & { data?: unknown }).data = { role: "bg_glow" };
    return el;
  };

  // Bottom-left purple glow — large, covers ~40% of slide
  objects.push(makeGlow(520, 480, -200, CS - 480, t.primary, 0.55));
  // Top-right teal glow — large
  objects.push(makeGlow(480, 420, CS - 360, -180, t.secondary, 0.45));
  // Subtle center ambient
  objects.push(makeGlow(360, 360, CS / 2 - 180, CS / 2 - 180, t.primary, 0.12));

  // Inner content — centered in content area
  const CONTENT_H = CS - t.brandBarH;
  const titleLines = Math.max(1, Math.ceil((slide.title?.length ?? 20) / 28));
  const titleH     = titleLines * 64 * 1.1 + 36;
  const bodyH      = slide.body ? Math.max(1, Math.ceil(slide.body.length / 42)) * 26 * 1.5 + 36 : 0;
  const btnH       = 68 + 40;
  const totalH     = titleH + bodyH + btnH;
  let curY = Math.max(60, (CONTENT_H - totalH) / 2);

  // CTA headline
  objects.push(makeTitleText(slide.title || "Follow for more →", {
    t, role: "cta_headline",
    fontFamily: `${t.fontTitle}, sans-serif`,
    fontSize: 64, lineHeight: 1.1, textAlign: "center",
    width: CS - 140, left: 70, top: curY,
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

  // Modern pill button — gradient fill, rounded, clean
  const BTN_W = 340, BTN_H = 68;
  const btnLeft = (CS - BTN_W) / 2;

  const btnBg = new fabric.Rect({
    left: 0, top: 0, width: BTN_W, height: BTN_H, rx: BTN_H / 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: BTN_W, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  const btnText = new fabric.Text("Follow for more  →", {
    left: BTN_W / 2, top: BTN_H / 2,
    fontSize: 20, fontWeight: "700", fill: "#fff",
    fontFamily: t.fontBody, charSpacing: 20,
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
