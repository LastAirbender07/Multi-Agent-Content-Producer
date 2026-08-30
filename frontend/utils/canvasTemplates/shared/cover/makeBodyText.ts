import * as fabric from "fabric";

export interface BodyTextOpts {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  color?: string;
}

/**
 * Body copy block — Inter Regular, dark ink, wrapping Textbox.
 * Returns a fabric.Textbox; caller adds it to the object list.
 */
export function makeBodyText(opts: BodyTextOpts): fabric.Textbox {
  const {
    text, x, y, width,
    fontSize   = 30,
    fontFamily = "Inter",
    fontWeight = "400",
    lineHeight = 1.45,
    align      = "left",
    color      = "#1B1B1B",
  } = opts;

  return new fabric.Textbox(text, {
    left: x, top: y,
    width,
    fontFamily,
    fontWeight,
    fontSize,
    fill: color,
    lineHeight,
    textAlign: align,
    originX: "left" as const, originY: "top" as const,
  });
}
