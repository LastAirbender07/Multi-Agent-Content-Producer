import * as fabric from "fabric";

export const METALLIC_PEACH_MID = "#D0BFA0";

const DEFAULT_STOPS = ["#DAC7A5", "#DDD1C0", "#C6B6A0"];

/**
 * Returns a full-canvas warm-brown radial gradient rect.
 * Caller is responsible for adding it (and sending it to back) via canvas.add().
 */
export function makeMetallicGradient(
  canvasW: number,
  canvasH: number,
  opts?: { stops?: string[] },
): fabric.Rect {
  const stops = opts?.stops ?? DEFAULT_STOPS;
  const gradient = new fabric.Gradient({
    type: "radial",
    gradientUnits: "pixels",
    coords: {
      r1: 0,
      r2: Math.sqrt(canvasW * canvasW + canvasH * canvasH) / 2,
      x1: canvasW / 2,
      y1: canvasH / 2,
      x2: canvasW / 2,
      y2: canvasH / 2,
    },
    colorStops: stops.map((color, i) => ({ offset: i / (stops.length - 1), color })),
  });
  return new fabric.Rect({
    left: 0, top: 0,
    width: canvasW, height: canvasH,
    fill: gradient,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
}
