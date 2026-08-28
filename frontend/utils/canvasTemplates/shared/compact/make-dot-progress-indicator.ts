import * as fabric from "fabric";
import type { CompactTokens } from "../design_tokens";

export interface MakeDotProgressIndicatorOpts {
  count: number;
  active: number;   // 0-indexed
  x: number;
  y: number;
  tokens: CompactTokens;
  size?: number;        // dot diameter, default: tokens.dotSize (8)
  gap?: number;         // gap between dots, default: tokens.dotGap (12)
  activeColor?: string; // default: tokens.dotColorActive
  dimColor?: string;    // default: tokens.dotColor
  activeScale?: number; // active dot is scaled by this factor, default 1
}

/**
 * Row of dots — N-th dot filled with `activeColor`, rest with `dimColor`.
 * Matches every reference PNG's bottom-center progress indicator.
 */
export function makeDotProgressIndicator(opts: MakeDotProgressIndicatorOpts): fabric.Group {
  const {
    count, active, x, y, tokens,
    size = tokens.dotSize,
    gap = tokens.dotGap,
    activeColor = tokens.dotColorActive,
    dimColor = tokens.dotColor,
    activeScale = 1,
  } = opts;

  const objs: fabric.FabricObject[] = [];
  for (let i = 0; i < count; i++) {
    const isActive = i === active;
    const r = (isActive ? size * activeScale : size) / 2;
    objs.push(new fabric.Circle({
      left: i * (size + gap),
      top: 0,
      radius: r,
      fill: isActive ? activeColor : dimColor,
      originX: "left",
      originY: "center",
      selectable: false,
    }));
  }

  const group = new fabric.Group(objs, {
    left: x, top: y,
    originX: "center", originY: "center",
    selectable: false,
  });
  return group;
}
