import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { isDarkTheme } from "@/utils/canvasTokens";
import { setData } from "./types";

const CANVAS_SIZE   = 1080;
const LOGO_SIZE     = 36;
const LOGO_LEFT     = 48;
const BRAND_FONT_SZ = 16;

export async function createBrandBar(
  t: CanvasTokens,
  logoUrl: string,
  brandName: string,
  slideNum: number,
  totalSlides: number,
): Promise<fabric.FabricObject[]> {
  const barTop      = CANVAS_SIZE - t.brandBarH;
  const textLeft    = logoUrl ? LOGO_LEFT + LOGO_SIZE + 12 : LOGO_LEFT;
  const textTop     = barTop + Math.round((t.brandBarH - BRAND_FONT_SZ) / 2) + 2;
  const borderColor = isDarkTheme(t) ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const progressW   = Math.round((slideNum / Math.max(totalSlides, 1)) * CANVAS_SIZE);

  const objects: fabric.FabricObject[] = [
    // Bar background
    setData(new fabric.Rect({
      left: 0, top: barTop, width: CANVAS_SIZE, height: t.brandBarH,
      fill: t.surface, opacity: 0.94,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_bar_bg" }),

    // Top separator line
    setData(new fabric.Rect({
      left: 0, top: barTop, width: CANVAS_SIZE, height: 1,
      fill: borderColor,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_bar_border" }),

    // Progress bar — width and gradient x2 both use progressW (computed once)
    setData(new fabric.Rect({
      left: 0, top: barTop - 2, width: progressW, height: 3,
      fill: new fabric.Gradient({
        type: "linear",
        coords: { x1: 0, y1: 0, x2: progressW, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "progress_bar" }),

    // Brand name
    setData(new fabric.Text(brandName.toUpperCase(), {
      left: textLeft, top: textTop,
      fontSize: BRAND_FONT_SZ, fontWeight: "600", fill: t.muted,
      fontFamily: t.fontBody, charSpacing: 100,
      originX: "left" as const, originY: "top" as const,
      selectable: false, evented: false,
    }), { role: "brand_name" }),
  ];

  // Logo with circular clip
  if (logoUrl) {
    try {
      const logoTop     = barTop + Math.round((t.brandBarH - LOGO_SIZE) / 2);
      const logoCenterX = LOGO_LEFT + LOGO_SIZE / 2;
      const logoCenterY = logoTop   + LOGO_SIZE / 2;

      const logo  = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
      const nat   = { w: logo.width ?? LOGO_SIZE, h: logo.height ?? LOGO_SIZE };
      const scale = Math.max(LOGO_SIZE / nat.w, LOGO_SIZE / nat.h);
      logo.set({
        left:   LOGO_LEFT + (LOGO_SIZE - nat.w * scale) / 2,
        top:    logoTop   + (LOGO_SIZE - nat.h * scale) / 2,
        scaleX: scale, scaleY: scale,
        originX: "left" as const, originY: "top" as const,
        selectable: false, evented: false,
      });
      logo.clipPath = new fabric.Circle({
        radius: LOGO_SIZE / 2,
        left: logoCenterX, top: logoCenterY,
        originX: "center" as const, originY: "center" as const,
        absolutePositioned: true,
      });
      setData(logo, { role: "brand_logo" });
      objects.push(logo);
    } catch (e) {
      console.warn("[brand] Logo load failed (non-fatal):", logoUrl, e instanceof Error ? e.message : e);
    }
  }

  return objects;
}
