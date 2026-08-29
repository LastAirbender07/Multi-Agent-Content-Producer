import * as fabric from "fabric";
import type { CompactTokens } from "../design_tokens";

export interface MakeBrandPillOpts {
  wordmark: string;
  x: number;
  y: number;
  tokens: CompactTokens;
  height?: number;   // default 44
  padding?: number;  // horizontal padding, default 20
  bgColor?: string;  // default textDark (dark pill)
  textColor?: string; // default bgCream
  fontSize?: number; // default 16
}

/**
 * Bottom-left brand pill: dark rounded rectangle with a small dot + wordmark.
 * Matches nextwork/image.png bottom-left pattern.
 *
 * All children use originX/Y "center" to avoid Fabric v7 group bounding-box
 * miscalculation. x/y = top-left corner of the pill (group originX "left").
 */
export function makeBrandPill(opts: MakeBrandPillOpts): fabric.Group {
  const {
    wordmark, x, y, tokens,
    height = 44,
    padding = 20,
    bgColor = tokens.textDark,
    textColor = tokens.bgCream,
    fontSize = 16,
  } = opts;

  // Measure text width via probe
  const probe = new fabric.Text(wordmark, {
    fontFamily: tokens.fontBody,
    fontSize,
    fontWeight: 700,
  });
  const textW = probe.width ?? 0;
  const dotDiameter = 18;
  const dotTextGap = 8;
  const width = Math.round(padding + dotDiameter + dotTextGap + textW + padding);

  // All children positioned at their centre relative to pill top-left (0,0).
  const bg = new fabric.Rect({
    left: width / 2, top: height / 2,
    originX: "center", originY: "center",
    width, height,
    rx: height / 2, ry: height / 2,
    fill: bgColor,
    selectable: false,
  });

  const dot = new fabric.Circle({
    left: padding + dotDiameter / 2,
    top: height / 2,
    originX: "center", originY: "center",
    radius: dotDiameter / 2,
    fill: textColor,
    selectable: false,
  });

  const label = new fabric.Text(wordmark, {
    left: padding + dotDiameter + dotTextGap,
    top: height / 2,
    originX: "left", originY: "center",
    fontFamily: tokens.fontBody,
    fontSize,
    fontWeight: 700,
    fill: textColor,
    selectable: false,
  });

  const group = new fabric.Group([bg, dot, label], {
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
