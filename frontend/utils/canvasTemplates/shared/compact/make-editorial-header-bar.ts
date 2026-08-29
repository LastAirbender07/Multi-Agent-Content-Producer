import * as fabric from "fabric";
import type { CompactTokens } from "../design_tokens";

export interface MakeEditorialHeaderBarOpts {
  handle: string;         // e.g. "@SahilBloom"
  seriesTitle: string;    // e.g. "The 5 Types of Wealth."
  canvasWidth: number;
  tokens: CompactTokens;
  y?: number;             // top of text line, default 50
  ruleY?: number;         // y of the hairline rule, default 82
  paddingX?: number;      // left/right inset for text, default 55
  fontSize?: number;      // default 20
  textColor?: string;     // default "#3D3D3D" — softer than full black
  ruleColor?: string;     // default "#C8C2BA" — warm grey
}

/**
 * SahilBloom-style editorial header: @handle left, italic series title right,
 * 1px hairline rule below. Always the FIRST element placed after the background.
 *
 * Returns THREE fabric objects (NOT a group) so the template controls Y precisely:
 *   [handleTextbox, seriesTitleTextbox, ruleRect]
 *
 * Key Fabric detail: seriesTitleTextbox uses originX:"right" with
 * left = canvasWidth - paddingX for correct right-alignment without manual width math.
 *
 * Matches SahilBloom/image copy.png and image copy 2.png header pattern.
 */
export function makeEditorialHeaderBar(opts: MakeEditorialHeaderBarOpts): [
  fabric.Textbox,
  fabric.Textbox,
  fabric.Rect,
] {
  const {
    handle, seriesTitle, canvasWidth, tokens,
    y = 50,
    ruleY = 82,
    paddingX = 55,
    fontSize = 20,
    textColor = "#3D3D3D",
    ruleColor = "#C8C2BA",
  } = opts;

  const handleTextbox = new fabric.Textbox(handle, {
    left: paddingX,
    top: y,
    fontFamily: "Inter",
    fontWeight: 300,
    fontSize,
    fill: textColor,
    originX: "left",
    originY: "top",
    width: canvasWidth / 2,  // enough width to not wrap
  });

  const seriesTitleTextbox = new fabric.Textbox(seriesTitle, {
    left: canvasWidth - paddingX,
    top: y,
    fontFamily: tokens.fontSerif,  // Playfair Display Italic
    fontStyle: "italic",
    fontWeight: 400,
    fontSize,
    fill: textColor,
    originX: "right",   // right-align from left = end-x (Fabric's correct right-align pattern)
    originY: "top",
    textAlign: "right",
    width: canvasWidth / 2,
  });

  const ruleRect = new fabric.Rect({
    left: 0,
    top: ruleY,
    width: canvasWidth,
    height: 1,
    fill: ruleColor,
    selectable: false,
  });

  return [handleTextbox, seriesTitleTextbox, ruleRect];
}
