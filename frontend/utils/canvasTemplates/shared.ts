/**
 * Shared Fabric component factory functions.
 * Used by all slide templates. Every object uses originX:"left", originY:"top" —
 * this is mandatory (Fabric v7 defaults to center origin which breaks all positioning).
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

const CS = 1080; // canvas size

// ── Type helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricAny = fabric.FabricObject & { data?: any };

function setData(obj: fabric.FabricObject, data: Record<string, unknown>): fabric.FabricObject {
  (obj as FabricAny).data = data;
  return obj;
}

// ── ctx.filter support detection (for backdrop blur) ─────────────────────────

let _ctxFilterSupported: boolean | null = null;

export function supportsCtxFilter(): boolean {
  if (_ctxFilterSupported !== null) return _ctxFilterSupported;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.filter = "blur(1px)";
  _ctxFilterSupported = ctx.filter !== "none" && ctx.filter !== "";
  return _ctxFilterSupported;
}

// ── Brand bar ─────────────────────────────────────────────────────────────────

export async function createBrandBar(
  t: CanvasTokens,
  logoUrl: string,
  brandName: string,
  slideNum: number,
  totalSlides: number,
): Promise<fabric.FabricObject[]> {
  const barTop = CS - t.brandBarH;
  const progressW = Math.round((slideNum / Math.max(totalSlides, 1)) * CS);

  const objects: fabric.FabricObject[] = [
    // Background rect
    setData(new fabric.Rect({
      left: 0, top: barTop, width: CS, height: t.brandBarH,
      fill: "rgba(9,9,9,0.85)", selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_bar_bg" }),

    // Top border
    setData(new fabric.Rect({
      left: 0, top: barTop, width: CS, height: 1,
      fill: "rgba(255,255,255,0.06)", selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_bar_border" }),

    // Progress bar
    setData(new fabric.Rect({
      left: 0, top: barTop - 2, width: progressW, height: t.progressH,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: progressW, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }), { role: "progress_bar" }),

    // Brand name text
    setData(new fabric.Text(brandName.toUpperCase(), {
      left: logoUrl ? 96 : 48,
      top: barTop + 26,
      fontSize: 18, fontWeight: "600",
      fill: t.muted, fontFamily: t.fontBody,
      charSpacing: 80,
      originX: "left" as const, originY: "top" as const,
    }), { role: "brand_name" }),
  ];

  // Logo image (if provided)
  if (logoUrl) {
    try {
      const logo = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
      logo.set({
        left: 48, top: barTop + 18, width: 36, height: 36,
        originX: "left" as const, originY: "top" as const,
        selectable: false, evented: false,
      });
      // Circular clip
      const clip = new fabric.Circle({ radius: 18, originX: "center" as const, originY: "center" as const });
      logo.clipPath = clip;
      setData(logo, { role: "brand_logo" });
      objects.splice(3, 0, logo); // insert before brand name
    } catch {
      // Logo load failure is non-fatal
    }
  }

  return objects;
}

// ── Background image ─────────────────────────────────────────────────────────

export async function createBgImage(
  imageUrl: string,
  fit: "cover" | "blur-darken",
): Promise<fabric.FabricImage | null> {
  try {
    if (fit === "blur-darken") {
      // Render the image to an offscreen canvas with blur + brightness filter
      const dataUrl = await blurDarkenImage(imageUrl);
      const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
      // Scale 1.15× to avoid edge artifacts from blur
      const scale = (CS * 1.15) / Math.max(img.width ?? CS, img.height ?? CS) * (CS / (img.height ?? CS));
      img.set({
        left: -(CS * 0.075), top: -(CS * 0.075),
        scaleX: (CS * 1.15) / (img.width ?? CS),
        scaleY: (CS * 1.15) / (img.height ?? CS),
        originX: "left" as const, originY: "top" as const,
        selectable: false, evented: false,
      });
      void scale;
      setData(img, { role: "bg_texture" });
      return img;
    }

    // Cover fit: scale to fill canvas
    return await loadCoverImage(imageUrl, "bg_image");
  } catch {
    return null;
  }
}

export async function loadCoverImage(
  imageUrl: string,
  role: string,
  selectable = true,
): Promise<fabric.FabricImage | null> {
  try {
    const el = new Image();
    el.crossOrigin = "anonymous";
    const naturalSize = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      el.onload = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
      el.onerror = reject;
      el.src = imageUrl;
    });

    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
    const bgScale = Math.max(CS / naturalSize.w, CS / naturalSize.h);
    const offsetX = (CS - naturalSize.w * bgScale) / 2;
    const offsetY = (CS - naturalSize.h * bgScale) / 2;
    img.set({
      left: offsetX, top: offsetY, scaleX: bgScale, scaleY: bgScale,
      originX: "left" as const, originY: "top" as const, selectable, evented: selectable,
    });
    setData(img, { role });
    return img;
  } catch {
    return null;
  }
}

async function blurDarkenImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = CS; off.height = CS;
      const ctx = off.getContext("2d")!;
      if (supportsCtxFilter()) {
        ctx.filter = "blur(32px) brightness(0.15)";
      } else {
        ctx.filter = "none";
        // Fallback: just darken with a low-opacity overlay after drawing
      }
      ctx.drawImage(img, 0, 0, CS, CS);
      if (!supportsCtxFilter()) {
        ctx.filter = "none";
        ctx.fillStyle = "rgba(9,9,9,0.85)";
        ctx.fillRect(0, 0, CS, CS);
      }
      resolve(off.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

// ── Overlay gradient rect ─────────────────────────────────────────────────────

export function createOverlay(
  variant: "hook" | "content" | "quote",
  t: CanvasTokens,
): fabric.Rect {
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
  };
  const primRGB = hex2rgb(t.primary);

  const colorStops = {
    hook: [
      { offset: 0,   color: "rgba(9,9,9,0.88)" },
      { offset: 0.5, color: "rgba(9,9,9,0.65)" },
      { offset: 1,   color: `rgba(${primRGB},0.25)` },
    ],
    content: [
      { offset: 0, color: "rgba(9,9,9,0.93)" },
      { offset: 1, color: "rgba(9,9,9,0.78)" },
    ],
    quote: [
      { offset: 0, color: "rgba(9,9,9,0.78)" },
      { offset: 1, color: "rgba(9,9,9,0.62)" },
    ],
  }[variant];

  const rect = new fabric.Rect({
    left: 0, top: 0, width: CS, height: CS,
    fill: new fabric.Gradient({
      type: "linear",
      coords: { x1: 0, y1: 0, x2: CS * 0.707, y2: CS * 0.707 },
      colorStops,
    }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "bg_overlay" });
  return rect;
}

// ── Gradient background (for CTA / Engage) ───────────────────────────────────

export function createGradientBg(t: CanvasTokens, height = CS - t.brandBarH, angle = 135): fabric.Rect {
  const rad = (angle * Math.PI) / 180;
  const x2 = Math.cos(rad) * height;
  const y2 = Math.sin(rad) * height;
  const rect = new fabric.Rect({
    left: 0, top: 0, width: CS, height,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2, y2 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "engage_bg" });
  return rect;
}

// ── Accent line ───────────────────────────────────────────────────────────────

export function createAccentLine(t: CanvasTokens, width = 44, left = 0, top = 0): fabric.Rect {
  const rect = new fabric.Rect({
    left, top, width, height: 4, rx: 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: width, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "accent_line" });
  return rect;
}

// ── Bullet item ───────────────────────────────────────────────────────────────

export function createBulletItem(
  text: string,
  index: number,
  t: CanvasTokens,
  fontSize = 20,
  left = 0,
  top = 0,
  width = 940,
): fabric.Group {
  const CIRCLE_SIZE = 28;
  const circle = new fabric.Circle({
    radius: CIRCLE_SIZE / 2, left: 0, top: 2,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: CIRCLE_SIZE, y2: 0 },
      colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  const num = new fabric.Text(String(index + 1), {
    left: CIRCLE_SIZE / 2, top: 7, fontSize: 13, fontWeight: "700", fill: "#fff",
    fontFamily: t.fontBody, originX: "center" as const, originY: "top" as const,
  });
  const label = new fabric.Textbox(text, {
    left: CIRCLE_SIZE + 12, top: 0, width: width - CIRCLE_SIZE - 12,
    fontSize, fontWeight: "400", fill: "rgba(250,250,250,0.80)",
    fontFamily: t.fontBody, lineHeight: 1.5,
    originX: "left" as const, originY: "top" as const,
  });

  const g = new fabric.Group([circle, num, label], {
    left, top, originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "bullet_item", index });
  return g;
}

// ── Insight item (quote slide bullets) ───────────────────────────────────────

export function createInsightItem(
  text: string,
  t: CanvasTokens,
  left = 0,
  top = 0,
  width = 930,
): fabric.Group {
  const dot = new fabric.Circle({
    radius: 4.5, left: 0, top: 8, fill: t.primary,
    originX: "left" as const, originY: "top" as const,
  });
  const label = new fabric.Textbox(text, {
    left: 23, top: 0, width: width - 23,
    fontSize: 21, fontWeight: "400", fill: "rgba(250,250,250,0.78)",
    fontFamily: t.fontBody, lineHeight: 1.55,
    originX: "left" as const, originY: "top" as const,
  });
  const g = new fabric.Group([dot, label], {
    left, top, originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "insight_item" });
  return g;
}

// ── Glass card (hook + quote) ─────────────────────────────────────────────────

export async function createGlassCard(
  region: { left: number; top: number; width: number; height: number },
  imageUrl: string | null,
  blurRadius = 16,
  t: CanvasTokens,
  rx = 24,
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  // Blurred background region
  if (imageUrl) {
    try {
      const blurred = await createBlurredRegion(imageUrl, region, blurRadius);
      setData(blurred, { role: "glass_blur" });
      objects.push(blurred);
    } catch {
      // Fall through to solid rect
    }
  }

  // Dark overlay
  const overlay = new fabric.Rect({
    left: region.left, top: region.top, width: region.width, height: region.height,
    fill: imageUrl && supportsCtxFilter() ? "rgba(19,19,19,0.65)" : "rgba(19,19,19,0.92)",
    rx, selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
  setData(overlay, { role: "glass_overlay" });
  objects.push(overlay);

  // Border
  const border = new fabric.Rect({
    left: region.left, top: region.top, width: region.width, height: region.height,
    fill: "transparent", stroke: "rgba(255,255,255,0.08)", strokeWidth: 1, rx,
    originX: "left" as const, originY: "top" as const,
  });
  setData(border, { role: "card_border" });
  objects.push(border);

  return objects;
}

export async function createBlurredRegion(
  imageUrl: string,
  region: { left: number; top: number; width: number; height: number },
  blur = 16,
): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = CS; off.height = CS;
      const ctx = off.getContext("2d")!;
      if (supportsCtxFilter()) {
        ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(img, 0, 0, CS, CS);
        ctx.filter = "none";
      } else {
        ctx.drawImage(img, 0, 0, CS, CS);
      }
      const crop = document.createElement("canvas");
      crop.width = region.width; crop.height = region.height;
      crop.getContext("2d")!.drawImage(off, region.left, region.top, region.width, region.height, 0, 0, region.width, region.height);
      fabric.FabricImage.fromURL(crop.toDataURL("image/jpeg", 0.85))
        .then(fi => {
          fi.set({ left: region.left, top: region.top, originX: "left" as const, originY: "top" as const, selectable: false, evented: false });
          resolve(fi);
        })
        .catch(reject);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

// ── Text helper ───────────────────────────────────────────────────────────────

export function makeText(
  text: string,
  opts: Partial<fabric.TextboxProps> & { role?: string },
): fabric.Textbox {
  const { role, ...rest } = opts;
  const tb = new fabric.Textbox(text || " ", {
    fontFamily: "Plus Jakarta Sans, sans-serif",
    lineHeight: 1.25,
    originX: "left" as const,
    originY: "top" as const,
    ...rest,
  });
  if (role) setData(tb, { role });
  return tb;
}

export function makeTitleText(text: string, opts: Partial<fabric.TextboxProps> & { role?: string; t: CanvasTokens }): fabric.Textbox {
  const { t, ...rest } = opts;
  return makeText(text, { fontFamily: `${t.fontTitle}, sans-serif`, fill: t.text, fontWeight: "700", ...rest });
}
