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
 *
 * All children use originX/Y "center" to avoid Fabric v7 group bounding-box
 * miscalculation from mixed origin modes. The group itself uses originX "left"
 * so x/y map to the pill's top-left corner.
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

  // Measure text width with a probe — initDimensions() is called in the
  // Text constructor in browser context (after document.fonts.ready).
  const probe = new fabric.Text(text.toUpperCase(), {
    fontFamily: tokens.fontBody,
    fontSize,
    fontWeight: 700,
    charSpacing: letterSpacing,
  });
  const textW = probe.width ?? 0;
  const width = Math.round(padding * 2 + textW);

  // Both children centered at the pill's geometric centre (width/2, height/2).
  // Group originX "left" means group.left = left edge of pill.
  const bg = new fabric.Rect({
    left: width / 2, top: height / 2,
    originX: "center", originY: "center",
    width, height,
    rx: height / 2, ry: height / 2,
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
    selectable: false,
  });

  const label = new fabric.Text(text.toUpperCase(), {
    left: width / 2, top: height / 2,
    originX: "center", originY: "center",
    fontFamily: tokens.fontBody,
    fontSize,
    fontWeight: 700,
    fill: textColor,
    charSpacing: letterSpacing,
    selectable: false,
  });

  const group = new fabric.Group([bg, label], {
    left: x,
    top: y,
    originX: "left",
    originY: "top",
    selectable: false,
    subTargetCheck: false,
  });
  group.setCoords();
  return group;
}
