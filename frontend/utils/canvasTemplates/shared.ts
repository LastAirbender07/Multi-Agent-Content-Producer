/**
 * Shared Fabric component factory functions.
 * Used by all slide templates. Every object uses originX:"left", originY:"top" —
 * this is mandatory (Fabric v7 defaults to center origin which breaks all positioning).
 *
 * COMPONENT LIBRARY — reusable, modern, sleek:
 *  createBrandBar      — bottom bar: logo + brand name + progress
 *  createAccentLine    — gradient divider bar (configurable width/color)
 *  createPillButton    — modern pill CTA button (gradient or glass)
 *  createEyebrowPill   — small floating label pill
 *  createGlowBg        — radial glow decorative background
 *  createGlassCard     — frosted glass card (hook/quote)
 *  createBulletItem    — numbered bullet with gradient circle
 *  createInsightItem   — dot-prefixed insight bullet
 *  makeText            — generic Textbox helper
 *  makeTitleText       — Syne Bold title helper
 */
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";

const CS = 1080;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricAny = fabric.FabricObject & { data?: any };
function setData(obj: fabric.FabricObject, data: Record<string, unknown>): fabric.FabricObject {
  (obj as FabricAny).data = data;
  return obj;
}

// ── ctx.filter support detection ─────────────────────────────────────────────

let _ctxFilterSupported: boolean | null = null;
export function supportsCtxFilter(): boolean {
  if (_ctxFilterSupported !== null) return _ctxFilterSupported;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.filter = "blur(1px)";
  _ctxFilterSupported = ctx.filter !== "none" && ctx.filter !== "";
  return _ctxFilterSupported;
}

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

// ── Background image helpers ─────────────────────────────────────────────────

export async function createBgImage(imageUrl: string, fit: "cover" | "blur-darken"): Promise<fabric.FabricImage | null> {
  try {
    if (fit === "blur-darken") {
      const dataUrl = await blurDarkenImage(imageUrl);
      const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
      img.set({
        left: -(CS * 0.075), top: -(CS * 0.075),
        scaleX: (CS * 1.15) / (img.width  ?? CS),
        scaleY: (CS * 1.15) / (img.height ?? CS),
        originX: "left" as const, originY: "top" as const,
        selectable: false, evented: false,
      });
      setData(img, { role: "bg_texture" });
      return img;
    }
    return await loadCoverImage(imageUrl, "bg_image");
  } catch { return null; }
}

export async function loadCoverImage(imageUrl: string, role: string, selectable = true): Promise<fabric.FabricImage | null> {
  try {
    const el = new Image();
    el.crossOrigin = "anonymous";
    const nat = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      el.onload  = () => resolve({ w: el.naturalWidth, h: el.naturalHeight });
      el.onerror = reject;
      el.src = imageUrl;
    });
    const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" });
    const scale = Math.max(CS / nat.w, CS / nat.h);
    img.set({
      left: (CS - nat.w * scale) / 2, top: (CS - nat.h * scale) / 2,
      scaleX: scale, scaleY: scale,
      originX: "left" as const, originY: "top" as const,
      selectable, evented: selectable,
    });
    setData(img, { role });
    return img;
  } catch { return null; }
}

async function blurDarkenImage(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = CS; off.height = CS;
      const ctx = off.getContext("2d")!;
      ctx.filter = supportsCtxFilter() ? "blur(32px) brightness(0.15)" : "none";
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

// ── Overlay gradient ─────────────────────────────────────────────────────────

export function createOverlay(variant: "hook" | "content" | "quote", t: CanvasTokens): fabric.Rect {
  const hex2rgb = (h: string) => `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;
  const pRGB = hex2rgb(t.primary);
  const stops = {
    hook:    [{ offset:0, color:"rgba(9,9,9,0.88)" }, { offset:0.5, color:"rgba(9,9,9,0.65)" }, { offset:1, color:`rgba(${pRGB},0.22)` }],
    content: [{ offset:0, color:"rgba(9,9,9,0.93)" }, { offset:1, color:"rgba(9,9,9,0.78)" }],
    quote:   [{ offset:0, color:"rgba(9,9,9,0.78)" }, { offset:1, color:"rgba(9,9,9,0.62)" }],
  }[variant];
  const rect = new fabric.Rect({
    left:0, top:0, width:CS, height:CS,
    fill: new fabric.Gradient({ type:"linear", coords:{ x1:0, y1:0, x2:CS*0.707, y2:CS*0.707 }, colorStops:stops }),
    selectable:false, evented:false, originX:"left" as const, originY:"top" as const,
  });
  setData(rect, { role:"bg_overlay" });
  return rect;
}

// ── Gradient background (CTA / Engage) ───────────────────────────────────────

export function createGradientBg(t: CanvasTokens, height = CS - t.brandBarH, angle = 135): fabric.Rect {
  void angle;
  const rect = new fabric.Rect({
    left:0, top:0, width:CS, height,
    fill: new fabric.Gradient({
      type:"linear", coords:{ x1:CS, y1:0, x2:0, y2:height },  // CSS 135deg
      colorStops:[{ offset:0, color:t.primary }, { offset:1, color:t.secondary }],
    }),
    selectable:false, evented:false, originX:"left" as const, originY:"top" as const,
  });
  setData(rect, { role:"engage_bg" });
  return rect;
}

// ── COMPONENT: Accent line ────────────────────────────────────────────────────
// Bright gradient bar — the signature design element. Bold, vivid, modern.

export function createAccentLine(t: CanvasTokens, width = 52, left = 0, top = 0): fabric.Rect {
  const rect = new fabric.Rect({
    left, top, width, height: 5, rx: 3,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: width, y2: 0 },
      colorStops: [
        { offset: 0,   color: t.primary },
        { offset: 0.55, color: t.secondary },
        { offset: 1,   color: t.secondary + "BB" },
      ],
    }),
    shadow: new fabric.Shadow({ color: t.primary + "80", blur: 8, offsetX: 0, offsetY: 2 }),
    originX: "left" as const, originY: "top" as const,
  });
  setData(rect, { role: "accent_line" });
  return rect;
}

// ── COMPONENT: Pill button ───────────────────────────────────────────────────
// Six named styles — all are components; pick default per template.
//
//  "gradient"      — filled primary→secondary, white text (CTA default)
//  "ghost"         — transparent, gradient border ring, gradient text
//  "frosted-glow"  — translucent white fill, bright border, glow, white text
//  "solid-white"   — pure white fill, gradient text
//  "dark-pill"     — dark semi-opaque fill, white border, white text (on gradient bg)
//  "dark-gradient" — dark fill, lighter gradient text (elegant on gradient bg)
//  "glass"         — legacy alias for frosted-glow

export interface PillButtonOptions {
  label:    string;
  style:    "gradient" | "ghost" | "frosted-glow" | "solid-white" | "dark-pill" | "dark-gradient" | "glass";
  width?:   number;
  height?:  number;
  fontSize?: number;
  left?:    number;
  top?:     number;
  role?:    string;
}

export function createPillButton(t: CanvasTokens, opts: PillButtonOptions): fabric.Group {
  const H   = opts.height  ?? 66;
  const FS  = opts.fontSize ?? 20;
  const W   = opts.width   ?? Math.round(opts.label.length * (FS * 0.52) + 80);
  const R   = H / 2;
  // legacy aliases
  const style = opts.style === "glass" ? "frosted-glow" : opts.style;

  const items: fabric.FabricObject[] = [];

  // ── Gradient ─────────────────────────────────────────────────────────────────
  // Bold filled pill. Same look as CTA. Use where you want maximum impact.
  if (style === "gradient") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: W, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    // Inner top gloss highlight
    items.push(new fabric.Rect({
      left: 4, top: 2, width: W - 8, height: H * 0.38, rx: R,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H * 0.38 },
        colorStops: [{ offset: 0, color: "rgba(255,255,255,0.18)" }, { offset: 1, color: "rgba(255,255,255,0)" }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#fff",
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Ghost ────────────────────────────────────────────────────────────────────
  // Transparent center, white border ring, white text.
  // On dark bg: use aurora gradient border/text variant below.
  // On colorful/gradient bg (engage): white border + white text creates perfect contrast.
  else if (style === "ghost") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "transparent",
      stroke: "rgba(255,255,255,0.80)", strokeWidth: 2,
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Frosted glow ─────────────────────────────────────────────────────────────
  // White-frosted translucent pill + bright border + colored glow shadow.
  // Premium glass-morphism done right.
  else if (style === "frosted-glow") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(255,255,255,0.12)",
      stroke: "rgba(255,255,255,0.55)", strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: t.primary + "66", blur: 22, offsetX: 0, offsetY: 4 }),
      originX: "left" as const, originY: "top" as const,
    }));
    // Subtle top-edge shimmer
    items.push(new fabric.Rect({
      left: 3, top: 2, width: W - 6, height: H * 0.32, rx: R,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H * 0.32 },
        colorStops: [{ offset: 0, color: "rgba(255,255,255,0.20)" }, { offset: 1, color: "rgba(255,255,255,0)" }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: t.fontBody, charSpacing: 30,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Solid white ──────────────────────────────────────────────────────────────
  // Pure white pill, gradient text inside. Maximum contrast, bold & editorial.
  else if (style === "solid-white") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "#FFFFFF",
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700",
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: W * 0.8, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }) as unknown as string,
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Dark pill ─────────────────────────────────────────────────────────────────
  // Best on colorful/gradient backgrounds. Dark semi-opaque cutout + white border + white text.
  // Creates strong contrast without competing with the bg gradient.
  else if (style === "dark-pill") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(9,9,9,0.55)",
      stroke: "rgba(255,255,255,0.70)", strokeWidth: 1.5,
      originX: "left" as const, originY: "top" as const,
    }));
    // Subtle top shimmer
    items.push(new fabric.Rect({
      left: 3, top: 2, width: W - 6, height: H * 0.30, rx: R,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: H * 0.30 },
        colorStops: [{ offset: 0, color: "rgba(255,255,255,0.10)" }, { offset: 1, color: "rgba(255,255,255,0)" }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: t.fontBody, charSpacing: 30,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Dark + gradient text ─────────────────────────────────────────────────────
  // Elegant on gradient backgrounds. Dark pill, lighter aurora-tinted gradient text.
  // The text gradient echoes the brand tokens and pops against the dark fill.
  else {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(9,9,9,0.70)",
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700",
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: W * 0.85, y2: 0 },
        colorStops: [
          { offset: 0, color: "#A78BFA" },   // lighter purple
          { offset: 1, color: "#5EEAD4" },   // lighter teal
        ],
      }) as unknown as string,
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  const g = new fabric.Group(items, {
    left: opts.left ?? 0, top: opts.top ?? 0,
    originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: opts.role ?? "pill_button" });
  return g;
}

// ── COMPONENT: Eyebrow pill (small label above heading) ──────────────────────
// B3 Frosted Glow style — translucent white fill + bright white border + glow.
// Designed for colorful/gradient slide backgrounds (engage, CTA).

export function createEyebrowPill(text: string, t: CanvasTokens, left: number, top: number): fabric.Group {
  const FS  = 13;
  const PH  = 34;
  const PW  = Math.round(text.length * (FS * 0.52) + 48);
  const PX  = left - PW / 2;   // left arg = center X
  const PR  = PH / 2;

  const bg = new fabric.Rect({
    left: 0, top: 0, width: PW, height: PH, rx: PR,
    fill: "rgba(255,255,255,0.14)",
    stroke: "rgba(255,255,255,0.72)", strokeWidth: 1.2,
    shadow: new fabric.Shadow({ color: "rgba(255,255,255,0.25)", blur: 12, offsetX: 0, offsetY: 2 }),
    originX: "left" as const, originY: "top" as const,
  });
  // Subtle top shimmer
  const shimmer = new fabric.Rect({
    left: 2, top: 1, width: PW - 4, height: PH * 0.35, rx: PR,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: PH * 0.35 },
      colorStops: [{ offset: 0, color: "rgba(255,255,255,0.22)" }, { offset: 1, color: "rgba(255,255,255,0)" }],
    }),
    originX: "left" as const, originY: "top" as const,
  });
  const label = new fabric.Text(text, {
    left: PW / 2, top: PH / 2,
    fontSize: FS, fontWeight: "700", fill: "#FFFFFF",
    fontFamily: t.fontBody, charSpacing: 80,
    originX: "center" as const, originY: "center" as const,
  });
  const g = new fabric.Group([bg, shimmer, label], {
    left: Math.max(0, PX), top,
    originX: "left" as const, originY: "top" as const,
  });
  setData(g, { role: "eyebrow_pill" });
  return g;
}

// ── COMPONENT: Radial glow background ────────────────────────────────────────

export interface GlowDef {
  rx:      number;   // ellipse x-radius
  ry:      number;   // ellipse y-radius
  left:    number;
  top:     number;
  color:   string;
  opacity: number;
}

export function createGlowBg(glows: GlowDef[]): fabric.FabricObject[] {
  return glows.map((g, i) => {
    const el = new fabric.Ellipse({
      rx:g.rx, ry:g.ry, left:g.left, top:g.top,
      fill: new fabric.Gradient({
        type:"radial",
        coords:{ x1:g.rx, y1:g.ry, r1:0, x2:g.rx, y2:g.ry, r2:Math.max(g.rx,g.ry) },
        colorStops:[{ offset:0, color:g.color }, { offset:0.55, color:g.color+"55" }, { offset:1, color:"transparent" }],
      }),
      opacity:g.opacity, selectable:false, evented:false,
      originX:"left" as const, originY:"top" as const,
    });
    setData(el, { role:`bg_glow_${i}` });
    return el;
  });
}

// ── COMPONENT: Bullet item ────────────────────────────────────────────────────

export function createBulletItem(
  text:   string,
  index:  number,
  t:      CanvasTokens,
  fontSize = 20,
  left = 0,
  top  = 0,
  width = 940,
): fabric.Group {
  const C = 28;  // circle diameter
  const circle = new fabric.Circle({
    radius:C/2, left:0, top:2,
    fill: new fabric.Gradient({
      type:"linear", coords:{ x1:0, y1:0, x2:C, y2:0 },
      colorStops:[{ offset:0, color:t.primary }, { offset:1, color:t.secondary }],
    }),
    originX:"left" as const, originY:"top" as const,
  });
  const num = new fabric.Text(String(index+1), {
    left:C/2, top:7, fontSize:12, fontWeight:"700", fill:"#fff",
    fontFamily:t.fontBody, originX:"center" as const, originY:"top" as const,
  });
  const label = new fabric.Textbox(text, {
    left:C+12, top:0, width:width-C-12,
    fontSize, fontWeight:"400", fill:"rgba(250,250,250,0.82)",
    fontFamily:t.fontBody, lineHeight:1.45,
    originX:"left" as const, originY:"top" as const,
  });
  const g = new fabric.Group([circle,num,label], {
    left, top, originX:"left" as const, originY:"top" as const,
  });
  setData(g, { role:"bullet_item", index });
  return g;
}

// ── COMPONENT: Insight item (quote slide) ────────────────────────────────────

export function createInsightItem(text: string, t: CanvasTokens, left=0, top=0, width=930): fabric.Group {
  const dot = new fabric.Circle({
    radius:5, left:0, top:9, fill:t.primary,
    originX:"left" as const, originY:"top" as const,
  });
  const label = new fabric.Textbox(text, {
    left:22, top:0, width:width-22,
    fontSize:21, fontWeight:"400", fill:"rgba(250,250,250,0.80)",
    fontFamily:t.fontBody, lineHeight:1.5,
    originX:"left" as const, originY:"top" as const,
  });
  const g = new fabric.Group([dot,label], {
    left, top, originX:"left" as const, originY:"top" as const,
  });
  setData(g, { role:"insight_item" });
  return g;
}

// ── COMPONENT: Glass card (hook + quote) ─────────────────────────────────────
// rx:32 for extra smoothness as requested

export async function createGlassCard(
  region: { left:number; top:number; width:number; height:number },
  imageUrl: string | null,
  blurRadius = 16,
  t: CanvasTokens,
  rx = 32,   // increased from 24 for smoother, more modern feel
): Promise<fabric.FabricObject[]> {
  const objects: fabric.FabricObject[] = [];

  if (imageUrl) {
    try {
      const blurred = await createBlurredRegion(imageUrl, region, blurRadius);
      // Round the blurred region with a clip path matching rx
      const blurClip = new fabric.Rect({
        left:region.left, top:region.top, width:region.width, height:region.height, rx,
        absolutePositioned:true, originX:"left" as const, originY:"top" as const,
      });
      blurred.clipPath = blurClip;
      setData(blurred, { role:"glass_blur" });
      objects.push(blurred);
    } catch { /* fallthrough */ }
  }

  // Dark overlay — solid fill prevents white corner bleed from rounded rect anti-aliasing
  const overlay = new fabric.Rect({
    left:region.left, top:region.top, width:region.width, height:region.height,
    fill: "#0d0d0d",
    opacity: imageUrl && supportsCtxFilter() ? 0.82 : 0.96,
    rx, selectable:false, evented:false,
    originX:"left" as const, originY:"top" as const,
  });
  setData(overlay, { role:"glass_overlay" });
  objects.push(overlay);

  // No hard border — the inner top highlight + blurred bg already define the card edge cleanly.
  // A white stroke always looks harsh on dark designs.

  // Inner top highlight (makes card feel premium / glass-like)
  const highlightH = Math.round(region.height * 0.08);
  const highlight = new fabric.Rect({
    left:region.left+1, top:region.top+1,
    width:region.width-2, height:highlightH, rx,
    fill: new fabric.Gradient({
      type:"linear", coords:{ x1:0, y1:0, x2:0, y2:highlightH },
      colorStops:[{ offset:0, color:"rgba(255,255,255,0.07)" }, { offset:1, color:"rgba(255,255,255,0)" }],
    }),
    selectable:false, evented:false,
    originX:"left" as const, originY:"top" as const,
  });
  setData(highlight, { role:"card_highlight" });
  objects.push(highlight);

  return objects;
}

export async function createBlurredRegion(
  imageUrl: string,
  region:   { left:number; top:number; width:number; height:number },
  blur = 16,
): Promise<fabric.FabricImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width=CS; off.height=CS;
      const ctx = off.getContext("2d")!;
      ctx.filter = supportsCtxFilter() ? `blur(${blur}px)` : "none";
      ctx.drawImage(img, 0, 0, CS, CS);
      ctx.filter = "none";
      const crop = document.createElement("canvas");
      crop.width=region.width; crop.height=region.height;
      crop.getContext("2d")!.drawImage(off, region.left, region.top, region.width, region.height, 0, 0, region.width, region.height);
      fabric.FabricImage.fromURL(crop.toDataURL("image/jpeg", 0.85))
        .then(fi => {
          fi.set({ left:region.left, top:region.top, originX:"left" as const, originY:"top" as const, selectable:false, evented:false });
          resolve(fi);
        })
        .catch(reject);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

// ── Text helpers ─────────────────────────────────────────────────────────────

export function makeText(text: string, opts: Partial<fabric.TextboxProps> & { role?: string }): fabric.Textbox {
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
  return makeText(text, { fontFamily:`${t.fontTitle}, sans-serif`, fill:t.text, fontWeight:"700", ...rest });
}
