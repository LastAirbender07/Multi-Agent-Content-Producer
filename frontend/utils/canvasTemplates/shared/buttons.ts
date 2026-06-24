import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { setData } from "./types";
import type { PillButtonOptions } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricFill = string | fabric.Gradient<any, any> | fabric.Pattern;
// ── Private shimmer helper ────────────────────────────────────────────────────
// Creates a top-edge highlight rect with a vertical gradient from a semi-transparent
// white to transparent — used inside pill buttons for glass/3-D depth.

function createShimmer(W: number, H: number, R: number, heightRatio: number, topAlpha: number): fabric.Rect {
  const shimmerH = H * heightRatio;
  return new fabric.Rect({
    left: 3, top: 2, width: W - 6, height: shimmerH, rx: R,
    fill: new fabric.Gradient({
      type: "linear", coords: { x1: 0, y1: 0, x2: 0, y2: shimmerH },
      colorStops: [
        { offset: 0, color: `rgba(255,255,255,${topAlpha})` },
        { offset: 1, color: "rgba(255,255,255,0)" },
      ],
    }),
    originX: "left" as const, originY: "top" as const,
  });
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

export function createPillButton(t: CanvasTokens, opts: PillButtonOptions): fabric.Group {
  const H   = opts.height  ?? 66;
  const FS  = opts.fontSize ?? 20;
  const W   = opts.width   ?? Math.round(opts.label.length * (FS * 0.52) + 80);
  const R   = H / 2;
  // legacy aliases
  const style = opts.style === "glass" ? "frosted-glow" : opts.style;

  const items: fabric.FabricObject[] = [];

  // ── Gradient ─────────────────────────────────────────────────────────────────
  if (style === "gradient") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: W, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    // Inner top gloss highlight — uses a 4px inset and 0.38 ratio
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
  else if (style === "frosted-glow") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(255,255,255,0.12)",
      stroke: "rgba(255,255,255,0.55)", strokeWidth: 1.5,
      shadow: new fabric.Shadow({ color: t.primary + "66", blur: 22, offsetX: 0, offsetY: 4 }),
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(createShimmer(W, H, R, 0.32, 0.20));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: t.fontBody, charSpacing: 30,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Solid white ──────────────────────────────────────────────────────────────
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
      }) as FabricFill,
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Dark pill ─────────────────────────────────────────────────────────────────
  else if (style === "dark-pill") {
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: "rgba(9,9,9,0.55)",
      stroke: "rgba(255,255,255,0.70)", strokeWidth: 1.5,
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(createShimmer(W, H, R, 0.30, 0.10));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#ffffff",
      fontFamily: t.fontBody, charSpacing: 30,
      originX: "center" as const, originY: "center" as const,
    }));
  }

  // ── Dark + gradient text ─────────────────────────────────────────────────────
  else if (style === "dark-gradient") {
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
      }) as FabricFill,
      fontFamily: `${t.fontTitle}, sans-serif`, charSpacing: 40,
      originX: "center" as const, originY: "center" as const,
    }));
  } else {
    // Unknown style — fallback to gradient to avoid invisible button
    console.warn(`createPillButton: unknown style "${opts.style}", falling back to gradient`);
    items.push(new fabric.Rect({
      left: 0, top: 0, width: W, height: H, rx: R,
      fill: new fabric.Gradient({
        type: "linear", coords: { x1: 0, y1: 0, x2: W, y2: 0 },
        colorStops: [{ offset: 0, color: t.primary }, { offset: 1, color: t.secondary }],
      }),
      originX: "left" as const, originY: "top" as const,
    }));
    items.push(new fabric.Text(opts.label, {
      left: W / 2, top: H / 2, fontSize: FS, fontWeight: "700", fill: "#fff",
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
