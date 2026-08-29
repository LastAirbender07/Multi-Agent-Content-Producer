import * as fabric from "fabric";
import type { CompactTokens } from "../design_tokens";

export interface TextRun {
  text: string;
  family?: string;
  weight?: number | string;
  style?: "normal" | "italic";
  color?: string;
}

export interface MakeMixedWeightTextOpts {
  runs: TextRun[];
  x: number;
  y: number;
  size: number;       // base font size
  maxWidth: number;
  tokens: CompactTokens;
  lineHeight?: number; // default 1.05 for large display headlines
  align?: "left" | "center" | "right";
  defaultFamily?: string;  // default: tokens.fontDisplay
  defaultWeight?: number | string; // default 900
  defaultColor?: string;   // default: tokens.textDark
}

/**
 * Multi-run Textbox with per-character font family, weight, style, and color.
 * Enables mixed headlines like "Why Are You In Such A Rush?" with `Rush`
 * italic-serif and the rest bold-sans.
 *
 * Uses fabric.Textbox.styles = { [lineIdx]: { [charIdx]: TextStyleDeclaration } }.
 */
export function makeMixedWeightText(opts: MakeMixedWeightTextOpts): fabric.Textbox {
  const {
    runs, x, y, size, maxWidth, tokens,
    lineHeight = 1.05,
    align = "left",
    defaultFamily = tokens.fontDisplay,
    defaultWeight = 900,
    defaultColor = tokens.textDark,
  } = opts;

  const fullText = runs.map(r => r.text).join("");

  // Build per-character styles. Fabric applies styles keyed by (line, char)
  // AFTER wrapping — but at construction time we don't yet know wrap points.
  // So we build a flat char→style map and expand it into the {line:{char:...}}
  // shape lazily via fabric.Textbox.styles setter. Fabric handles wrap remap
  // via its `styles` setter when text is measured.
  //
  // Approach: attach styles as line-0 entries; fabric.Textbox will re-project
  // them when it wraps.
  const styles: Record<number, Record<number, fabric.TextStyleDeclaration>> = { 0: {} };
  let charIdx = 0;
  for (const run of runs) {
    for (let i = 0; i < run.text.length; i++) {
      styles[0][charIdx] = {
        fontFamily: run.family ?? defaultFamily,
        fontWeight: run.weight ?? defaultWeight,
        fontStyle: run.style ?? "normal",
        fill: run.color ?? defaultColor,
      };
      charIdx++;
    }
  }

  const tb = new fabric.Textbox(fullText, {
    left: x, top: y,
    width: maxWidth,
    fontFamily: defaultFamily,
    fontWeight: defaultWeight,
    fontSize: size,
    fill: defaultColor,
    lineHeight,
    textAlign: align,
    originX: "left",
    originY: "top",
    splitByGrapheme: false,
    styles,
  });
  return tb;
}
