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
 * Bottom-left brand pill: dark rounded rectangle with a small mark + wordmark.
 * Matches nextwork/image.png bottom-left pattern.
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

  // Measure text width via a temporary Text object
  const text = new fabric.Text(wordmark, {
    fontFamily: tokens.fontBody,
    fontSize,
    fontWeight: 700,
    fill: textColor,
    originX: "left",
    originY: "center",
  });
  const textW = text.width ?? 0;
  const width = Math.round(padding + 18 + 8 + textW + padding);  // pad + dot + gap + text + pad

  const bg = new fabric.Rect({
    left: 0, top: 0,
    width, height,
    rx: height / 2, ry: height / 2,
    fill: bgColor,
    selectable: false,
  });

  const dot = new fabric.Circle({
    left: padding + 9, top: height / 2,
    radius: 9,
    fill: textColor,
    originX: "center",
    originY: "center",
    selectable: false,
  });

  text.set({ left: padding + 18 + 8, top: height / 2 });

  const group = new fabric.Group([bg, dot, text], {
    left: x, top: y,
    originX: "left", originY: "top",
    selectable: false,
    subTargetCheck: false,
  });
  // Explicitly ensure the group's bounding origin aligns with (x, y) top-left.
  // Fabric v7 groups can auto-adjust position when children have varying origins;
  // pin explicitly:
  group.set({ left: x, top: y });
  group.setCoords();
  return group;
}
