import * as fabric from "fabric";

export interface TiltedPhoneMockupOpts {
  screenImageUrl?: string;
  tilt?: number;
  phoneFrameStroke?: string;
  phoneFrameStrokeWidth?: number;
  cornerRadius?: number;
  width?: number;
  height?: number;
  x: number;
  y: number;
}

/**
 * Minimal full-screen smartphone: image fills the entire phone shape,
 * clipped by the GROUP (not per-image clip — more reliable in Fabric.js groups).
 * A thin warm-gray stroke gives the phone outline; shadow for depth.
 * No notch, no buttons, no home indicator.
 */
export async function makeTiltedPhoneMockup(
  opts: TiltedPhoneMockupOpts,
): Promise<fabric.Group> {
  const {
    screenImageUrl,
    tilt                  = -8,
    phoneFrameStroke      = "#C4BAB0",
    phoneFrameStrokeWidth = 3,
    cornerRadius          = 44,
    width:  phoneW        = 360,
    height: phoneH        = 780,
    x: phoneX,
    y: phoneY,
  } = opts;

  const objects: fabric.FabricObject[] = [];

  // ── Screen image — full bleed, NO individual clipPath ────────────────────────
  // Clipping is handled at the Group level so we avoid coordinate-system issues.
  let screenImage: fabric.FabricImage | null = null;
  if (screenImageUrl) {
    try {
      screenImage = await fabric.FabricImage.fromURL(screenImageUrl, { crossOrigin: "anonymous" });
    } catch { /* fall through to placeholder */ }
  }

  if (screenImage) {
    const iw    = screenImage.width  ?? phoneW;
    const ih    = screenImage.height ?? phoneH;
    const scale = Math.max(phoneW / iw, phoneH / ih);
    screenImage.set({
      left:   (phoneW - iw * scale) / 2,
      top:    (phoneH - ih * scale) / 2,
      scaleX: scale,
      scaleY: scale,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });
    objects.push(screenImage);
  } else {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: phoneW, height: phoneH,
      fill: new fabric.Gradient({
        type: "linear", gradientUnits: "pixels",
        coords: { x1: 0, y1: 0, x2: 0, y2: phoneH },
        colorStops: [{ offset: 0, color: "#1a1a2e" }, { offset: 1, color: "#16213e" }],
      }),
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    }));
  }

  // ── Phone outline stroke — drawn OVER image so it's always visible ────────────
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: phoneW, height: phoneH,
    fill: "transparent",
    stroke: phoneFrameStroke,
    strokeWidth: phoneFrameStrokeWidth,
    rx: cornerRadius, ry: cornerRadius,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  }));

  // ── Group + clip to phone shape + shadow ─────────────────────────────────────
  const group = new fabric.Group(objects, {
    selectable: false, evented: false,
    shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.22)", blur: 28, offsetX: 5, offsetY: 14 }),
  });

  // Clip the group to the phone rounded-rect in GROUP local space (0,0 = group center).
  // This is far more reliable than per-image clipPath inside a group.
  group.clipPath = new fabric.Rect({
    left: -phoneW / 2, top: -phoneH / 2,
    width: phoneW, height: phoneH,
    rx: cornerRadius, ry: cornerRadius,
    originX: "left" as const, originY: "top" as const,
  });

  group.set({
    left:  phoneX + phoneW / 2,
    top:   phoneY + phoneH / 2,
    angle: tilt,
  });
  return group;
}
