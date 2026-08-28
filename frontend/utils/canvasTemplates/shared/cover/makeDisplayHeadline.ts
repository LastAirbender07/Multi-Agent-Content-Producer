import * as fabric from "fabric";

export interface DisplayHeadlineOpts {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize?: number;      // default 140
  fontFamily?: string;    // default "Inter"
  fontWeight?: string;    // default "900"
  color?: string;         // default "#1A1A1A"
  lineHeight?: number;    // default 1.05
  align?: "left" | "center" | "right";
}

/**
 * Large display headline — Inter Black, reference-matched.
 * Returns a fabric.Textbox; caller adds it to canvas/object list.
 */
export function makeDisplayHeadline(opts: DisplayHeadlineOpts): fabric.Textbox {
  const {
    text, x, y, width,
    fontSize   = 140,
    fontFamily = "Inter",
    fontWeight = "900",
    color      = "#1A1A1A",
    lineHeight = 1.05,
    align      = "left",
  } = opts;

  return new fabric.Textbox(text, {
    left: x, top: y,
    width,
    fontFamily,
    fontWeight,
    fontSize,
    fill: color,
    textAlign: align,
    lineHeight,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });
}
