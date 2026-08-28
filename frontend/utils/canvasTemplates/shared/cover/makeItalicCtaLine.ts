import * as fabric from "fabric";

export interface ItalicCtaLineOpts {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  align?: "left" | "center";
  fontSize?: number;
  color?: string;
}

/**
 * Italic-serif CTA line, e.g. `*Comment "TEMPLATE" for the Canva Link`.
 * Uses Playfair Display Bold Italic ~30 px.
 */
export function makeItalicCtaLine(opts: ItalicCtaLineOpts): fabric.Textbox {
  const {
    text,
    x, y,
    maxWidth,
    align = "left",
    fontSize = 30,
    color = "#1B1B1B",
  } = opts;

  return new fabric.Textbox(text, {
    left: x,
    top: y,
    width: maxWidth,
    fontFamily: "Playfair Display",
    fontStyle: "italic",
    fontWeight: "700",
    fontSize,
    fill: color,
    textAlign: align,
    lineHeight: 1.3,
    selectable: false,
    evented: false,
    originX: "left" as const,
    originY: "top" as const,
  });
}
