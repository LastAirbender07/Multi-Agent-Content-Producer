import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { PillButtonOptions } from "@/utils/canvasTemplates/shared/types";

const BTN_W = 320;
const BTN_H = 60;
const BTN_FS = 18;
const BTN_LABEL = "Follow for more →";

async function dropButton(
  canvas: fabric.Canvas,
  t: CanvasTokens,
  style: PillButtonOptions["style"],
  dropX: number,
  dropY: number,
): Promise<void> {
  const { createPillButton } = await import("@/utils/canvasTemplates/shared");
  const btn = createPillButton(t, {
    label: BTN_LABEL,
    style,
    width:    BTN_W,
    height:   BTN_H,
    fontSize: BTN_FS,
    left: Math.max(0, dropX - BTN_W / 2),
    top:  Math.max(0, dropY - BTN_H / 2),
    role: "dropped_button",
  });
  canvas.add(btn); canvas.setActiveObject(btn);
}

export const dropBtnGradient    = (c: fabric.Canvas, t: CanvasTokens, x: number, y: number) => dropButton(c, t, "gradient",     x, y);
export const dropBtnGhost       = (c: fabric.Canvas, t: CanvasTokens, x: number, y: number) => dropButton(c, t, "ghost",        x, y);
export const dropBtnFrostedGlow = (c: fabric.Canvas, t: CanvasTokens, x: number, y: number) => dropButton(c, t, "frosted-glow", x, y);
export const dropBtnSolidWhite  = (c: fabric.Canvas, t: CanvasTokens, x: number, y: number) => dropButton(c, t, "solid-white",  x, y);
export const dropBtnDarkPill    = (c: fabric.Canvas, t: CanvasTokens, x: number, y: number) => dropButton(c, t, "dark-pill",    x, y);
export const dropBtnDarkGradient= (c: fabric.Canvas, t: CanvasTokens, x: number, y: number) => dropButton(c, t, "dark-gradient",x, y);
