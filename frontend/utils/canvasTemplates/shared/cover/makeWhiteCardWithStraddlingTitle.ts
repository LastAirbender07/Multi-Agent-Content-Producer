import * as fabric from "fabric";

export interface WhiteCardWithStraddlingTitleOpts {
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  cardFill?: string;
  cardRadius?: number;
  chipText: string;
  // Chip style: thin-border tag (matches reference "VIRAL REEL" aesthetic)
  chipFillColor?: string;       // default "#FBF5EB" (warm cream)
  chipStrokeColor?: string;     // default "#8B7355" (warm brown border)
  chipStrokeWidth?: number;     // default 2.5
  chipHeight?: number;          // default 56
  chipWidthRatio?: number;      // clamped [0.15, 0.32]; default 0.22
  chipCornerRadius?: number;    // default 10 (slightly rectangular tag)
  chipFontFamily?: string;      // default "Inter"
  chipFontWeight?: string;      // default "700"
  chipFontSize?: number;        // default 22
  chipTextColor?: string;       // default "#3D2E1A"
  chipLetterSpacing?: number;   // default 3 (in px — applied via charSpacing*1000/size)
}

/**
 * White rounded card + straddling title chip composite.
 *
 * Chip invariants (enforced):
 * - chip.centerY === card.top   (straddles top edge)
 * - chip.width   === card.width * clamp(chipWidthRatio, 0.15, 0.32)
 * - chip centred horizontally on card
 * - Chip style: thin warm-brown border, cream fill, all-caps spaced text (reference-matched)
 */
export function makeWhiteCardWithStraddlingTitle(
  opts: WhiteCardWithStraddlingTitleOpts,
): fabric.Group {
  const {
    cardX, cardY, cardWidth, cardHeight,
    cardFill = "#FFFFFF",
    cardRadius = 48,
    chipText,
    chipFillColor    = "#FBF5EB",
    chipStrokeColor  = "#8B7355",
    chipStrokeWidth  = 2.5,
    chipHeight       = 56,
    chipWidthRatio   = 0.22,
    chipCornerRadius = 10,
    chipFontFamily   = "Inter",
    chipFontWeight   = "700",
    chipFontSize     = 22,
    chipTextColor    = "#3D2E1A",
    chipLetterSpacing = 3,
  } = opts;

  const ratio    = Math.min(Math.max(chipWidthRatio, 0.15), 0.32);
  const chipWidth = cardWidth * ratio;
  const chipLeft  = cardX + (cardWidth - chipWidth) / 2;
  const chipTop   = cardY - chipHeight / 2;

  const cardRect = new fabric.Rect({
    left: cardX, top: cardY,
    width: cardWidth, height: cardHeight,
    fill: cardFill,
    rx: cardRadius, ry: cardRadius,
    shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.15)", blur: 28, offsetX: 0, offsetY: 10 }),
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });

  const chipRect = new fabric.Rect({
    left: chipLeft, top: chipTop,
    width: chipWidth, height: chipHeight,
    fill: chipFillColor,
    stroke: chipStrokeColor, strokeWidth: chipStrokeWidth,
    rx: chipCornerRadius, ry: chipCornerRadius,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });

  // charSpacing in Fabric = 1/1000 em units; convert px letter-spacing → fabric units
  const charSpacingFabric = (chipLetterSpacing / chipFontSize) * 1000;

  const chipTextObj = new fabric.Textbox(chipText.toUpperCase(), {
    left: chipLeft,
    top: chipTop + (chipHeight - chipFontSize * 1.2) / 2,
    width: chipWidth,
    fontFamily: chipFontFamily,
    fontWeight: chipFontWeight,
    fontSize: chipFontSize,
    fill: chipTextColor,
    textAlign: "center",
    charSpacing: charSpacingFabric,
    selectable: false, evented: false,
    originX: "left" as const, originY: "top" as const,
  });

  return new fabric.Group([cardRect, chipRect, chipTextObj], {
    selectable: false,
    evented: false,
  });
}
