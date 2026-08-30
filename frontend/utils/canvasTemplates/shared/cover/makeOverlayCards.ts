import * as fabric from "fabric";

export interface OverlayCardDef {
  /** Top stat/metric value, e.g. "22–35%" */
  value: string;
  /** Label below the value, e.g. "organic reach" */
  label: string;
  /** Canvas-absolute X position of the card left edge */
  x: number;
  /** Canvas-absolute Y position of the card top edge */
  y: number;
  /** Card width in px (default 210) */
  width?: number;
}

/**
 * Renders floating frosted-glass stat cards (like "22–35% / organic reach")
 * on top of the phone mockup region.
 *
 * Each card is a selectable group of:
 *  - semi-transparent dark rounded background
 *  - bold value Textbox
 *  - smaller label Textbox
 *
 * Returns the array of groups; caller adds them to the canvas.
 */
export function makeOverlayCards(cards: OverlayCardDef[]): fabric.Group[] {
  return cards.map(({ value, label, x, y, width: cardW = 210 }) => {
    const CARD_H       = 88;
    const RADIUS       = 18;
    const PAD_X        = 16;
    const PAD_Y        = 12;
    const VALUE_SIZE   = 28;
    const LABEL_SIZE   = 15;

    // ── Background ───────────────────────────────────────────────────────────
    const bg = new fabric.Rect({
      left: 0, top: 0,
      width: cardW, height: CARD_H,
      rx: RADIUS, ry: RADIUS,
      fill: "rgba(15, 12, 10, 0.72)",
      stroke: "rgba(255,255,255,0.12)",
      strokeWidth: 1,
      selectable: false, evented: false,
      originX: "left" as const, originY: "top" as const,
    });

    // ── Value text ───────────────────────────────────────────────────────────
    const valueTb = new fabric.Textbox(value, {
      left: PAD_X, top: PAD_Y,
      width: cardW - PAD_X * 2,
      fontFamily: "Inter",
      fontWeight: "700",
      fontSize: VALUE_SIZE,
      fill: "#FFFFFF",
      textAlign: "left",
      lineHeight: 1.1,
      originX: "left" as const, originY: "top" as const,
    });

    // ── Label text ───────────────────────────────────────────────────────────
    const labelTb = new fabric.Textbox(label, {
      left: PAD_X, top: PAD_Y + VALUE_SIZE * 1.25,
      width: cardW - PAD_X * 2,
      fontFamily: "Inter",
      fontWeight: "400",
      fontSize: LABEL_SIZE,
      fill: "rgba(255,255,255,0.65)",
      textAlign: "left",
      lineHeight: 1.2,
      originX: "left" as const, originY: "top" as const,
    });

    // ── Group — selectable so user can drag/resize the whole card ────────────
    const group = new fabric.Group([bg, valueTb, labelTb], {
      left: x + cardW / 2,
      top:  y + CARD_H / 2,
      originX: "center" as const,
      originY: "center" as const,
    });

    return group;
  });
}
