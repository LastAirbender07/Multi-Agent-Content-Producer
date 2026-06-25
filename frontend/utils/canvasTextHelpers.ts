import * as fabric from "fabric";

export function trunc(s: string, max: number): string {
  if (!s || s.length <= max) return s;
  return s.slice(0, max).trimEnd() + "…";
}

export function estimateLines(text: string, widthPx: number, fontSize: number): number {
  if (!text) return 0;
  // Use 0.65× as a more conservative char-width estimate — accounts for
  // uppercase, currency symbols (₹,$,€), and wider glyphs
  const cpl = Math.max(1, Math.floor(widthPx / (fontSize * 0.65)));
  return Math.ceil(text.length / cpl);
}

export function autoSize(text: string, widthPx: number, max: number, min: number): number {
  if (!text) return max;
  for (let sz = max; sz >= min; sz -= 4) {
    if (estimateLines(text, widthPx, sz) * sz * 1.35 <= 280) return sz;
  }
  return min;
}

export function tb(
  content: string,
  left: number,
  top: number,
  width: number,
  opts: Record<string, unknown>,
): fabric.Textbox {
  const box = new fabric.Textbox(content || " ", {
    left,
    top,
    width,
    // CRITICAL: Fabric v7 defaults originX/Y to 'center'. Override to 'left'/'top'
    // so that left/top mean the top-left corner of the object, not its center.
    // Without this, a textbox at left=72 renders with its CENTER at x=72 —
    // meaning the left edge is at x=72-(width/2)=-396, which clips off-screen.
    originX: "left" as const,
    originY: "top" as const,
    fontFamily: "Plus Jakarta Sans, sans-serif",
    lineHeight: 1.25,
    editable: true,
    splitByGrapheme: false,
    padding: 0,
    ...opts,
  });
  return box;
}
