import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { setData } from "./types";

const CS = 1080;

// ── Brand bar ─────────────────────────────────────────────────────────────────
// Logo: circular, with absolutePositioned:true on clipPath so Fabric clips correctly

export async function createBrandBar(
  t: CanvasTokens,
  logoUrl: string,
  brandName: string,
  slideNum: number,
  totalSlides: number,
): Promise<fabric.FabricObject[]> {
  const barTop    = CS - t.brandBarH;
  const progressW = Math.round((slideNum / Math.max(totalSlides, 1)) * CS);
  const LOGO_SIZE = 36;
  const LOGO_LEFT = 48;
  const TEXT_LEFT = logoUrl ? LOGO_LEFT + LOGO_SIZE + 12 : 48;
  const TEXT_TOP  = barTop + Math.round((t.brandBarH - 18) / 2) + 2;

  const objects: fabric.FabricObject[] = [
    // Background
    setData(new fabric.Rect({
      left: 0, top: barTop, width: CS, height: t.brandBarH,
      fill: "rgba(9,9,9,0.88)", selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_bar_bg" }),

    // Top border line
    setData(new fabric.Rect({
      left: 0, top: barTop, width: CS, height: 1,
      fill: "rgba(255,255,255,0.07)", selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_bar_border" }),

    // Progress bar (gradient strip above brand bar)
    setData(new fabric.Rect({
      left: 0, top: barTop - 2, width: progressW, height: 3,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: progressW, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "progress_bar" }),

    // Brand name
    setData(new fabric.Text(brandName.toUpperCase(), {
      left: TEXT_LEFT, top: TEXT_TOP,
      fontSize: 16, fontWeight: "600", fill: t.muted,
      fontFamily: t.fontBody, charSpacing: 100,
      originX: "left" as const, originY: "top" as const,
      selectable: false, evented: false,
    }), { role: "brand_name" }),
  ];

  // Logo with absolutePositioned circular clip (Fabric v7 requirement)
  if (logoUrl) {
    try {
      const logoTop = barTop + Math.round((t.brandBarH - LOGO_SIZE) / 2);
      const logo = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
      const nat  = { w: logo.width ?? LOGO_SIZE, h: logo.height ?? LOGO_SIZE };
      const scale = Math.max(LOGO_SIZE / nat.w, LOGO_SIZE / nat.h);
      const ox = (LOGO_SIZE - nat.w * scale) / 2;
      const oy = (LOGO_SIZE - nat.h * scale) / 2;
      logo.set({
        left: LOGO_LEFT + ox, top: logoTop + oy,
        scaleX: scale, scaleY: scale,
        originX: "left" as const, originY: "top" as const,
        selectable: false, evented: false,
      });
      // absolutePositioned = clip in canvas space (not local image space)
      const clip = new fabric.Circle({
        radius: LOGO_SIZE / 2,
        left:   LOGO_LEFT + LOGO_SIZE / 2,
        top:    logoTop   + LOGO_SIZE / 2,
        originX: "center" as const, originY: "center" as const,
        absolutePositioned: true,
      });
      logo.clipPath = clip;
      setData(logo, { role: "brand_logo" });
      objects.push(logo);
    } catch { /* logo load failure is non-fatal — bar still renders */ }
  }

  return objects;
}
