import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import { setData } from "./types";

export function makeText(text: string, opts: Partial<fabric.TextboxProps> & { role?: string }): fabric.Textbox {
  const { role, ...rest } = opts;
  const tb = new fabric.Textbox(text || " ", {
    fontFamily: "Plus Jakarta Sans, sans-serif",
    lineHeight: 1.25,
    originX: "left" as const,
    originY: "top" as const,
    ...rest,
  });
  if (role) setData(tb, { role });
  return tb;
}

export function makeTitleText(text: string, opts: Partial<fabric.TextboxProps> & { role?: string; t: CanvasTokens }): fabric.Textbox {
  const { t, ...rest } = opts;
  return makeText(text, { fontFamily: `${t.fontTitle}, sans-serif`, fill: t.text, fontWeight: "700", ...rest });
}
