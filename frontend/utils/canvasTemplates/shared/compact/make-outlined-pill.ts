import * as fabric from "fabric";
import type { CompactTokens } from "../design_tokens";

export interface MakeOutlinedPillOpts {
  text: string;
  x: number;
  y: number;
  tokens: CompactTokens;
  fillColor?: string;   // default: peach
  textColor?: string;   // default: peachText
  strokeColor?: string; // default: undefined (no stroke)
  strokeWidth?: number; // default: 0
  height?: number;      // default: 44
  padding?: number;     // horizontal padding, default: 22
  fontSize?: number;    // default: 15
  letterSpacing?: number; // fabric charSpacing units, default 100
}

/**
 * ALL-CAPS letter-spaced pill (e.g. peach `VIRAL REEL` category pill).
 * Matches others/image copy 3.png top peach pill pattern.
 */
export function makeOutlinedPill(opts: MakeOutlinedPillOpts): fabric.Group {
  const {
    text, x, y, tokens,
    fillColor = tokens.peach,
    textColor = tokens.peachText,
    strokeColor,
    strokeWidth = 0,
    height = 44,
    padding = 22,
    fontSize = 15,
    letterSpacing = 100,
  } = opts;

  const label = new fabric.Text(text.toUpperCase(), {
    fontFamily: tokens.fontBody,
    fontSize,
    fontWeight: 700,
    fill: textColor,
    charSpacing: letterSpacing,
    originX: "center",
    originY: "center",
  });
  const textW = label.width ?? 0;
  const width = Math.round(padding * 2 + textW);

  const bg = new fabric.Rect({
    left: 0, top: 0,
    width, height,
    rx: height / 2, ry: height / 2,
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
    selectable: false,
  });

  label.set({ left: width / 2, top: height / 2 });

  const group = new fabric.Group([bg, label], {
    left: x, top: y,
    originX: "left", originY: "top",
    selectable: false,
  });
  return group;
}
