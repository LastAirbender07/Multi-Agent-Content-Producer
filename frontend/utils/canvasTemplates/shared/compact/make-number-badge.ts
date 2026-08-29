import * as fabric from "fabric";
import type { CompactTokens } from "../design_tokens";

export interface MakeNumberBadgeOpts {
  number: number | string;
  cx: number;  // centre-x of the circle
  cy: number;  // centre-y of the circle
  tokens: CompactTokens;
  radius?: number;      // default 38 → 76px diameter
  strokeColor?: string; // default tokens.textDark
  strokeWidth?: number; // default 1.5 — thin outline is the key aesthetic
  fillColor?: string;   // default "transparent" — stroke-only, NOT filled
  fontSize?: number;    // default 36
  fontFamily?: string;  // default tokens.fontSerif (Playfair Display)
  textColor?: string;   // default tokens.textDark
}

/**
 * Stroke-only numbered circle badge for SahilBloom-style editorial lists.
 * The outline circle with NO fill is the defining aesthetic — do not add a fill.
 *
 * Returns a Fabric Group positioned so the circle is centred at (cx, cy).
 * Matches SahilBloom/image copy.png badge pattern.
 */
export function makeNumberBadge(opts: MakeNumberBadgeOpts): fabric.Group {
  const {
    number, cx, cy, tokens,
    radius = 38,
    strokeColor = tokens.textDark,
    strokeWidth = 1.5,
    fillColor = "transparent",
    fontSize = 36,
    fontFamily = tokens.fontSerif,
    textColor = tokens.textDark,
  } = opts;

  const circle = new fabric.Circle({
    left: 0,
    top: 0,
    radius,
    fill: fillColor,
    stroke: strokeColor,
    strokeWidth,
    originX: "center",
    originY: "center",
    selectable: false,
  });

  const label = new fabric.Text(String(number), {
    fontFamily,
    fontSize,
    fontWeight: 400,  // Regular weight — the badge is quiet, not bold
    fill: textColor,
    originX: "center",
    originY: "center",
    left: 0,
    top: 0,
    selectable: false,
  });

  const group = new fabric.Group([circle, label], {
    left: cx,
    top: cy,
    originX: "center",
    originY: "center",
    subTargetCheck: false,
  });
  group.setCoords();
  return group;
}
