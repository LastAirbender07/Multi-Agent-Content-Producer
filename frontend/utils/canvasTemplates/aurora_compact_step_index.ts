import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

const STEP_COLORS: Record<number, string> = {
  1: "#3B7EDC", 2: "#E8B045", 3: "#4AC48D",
  4: "#B65FE0", 5: "#F08A3D", 6: "#EDE8D8",
};

interface StepItem {
  name: string;
  subLabel?: string;
  stepNumber: number;
  stepColor?: string;
}

interface CompactStepIndexMeta {
  heading?: string;
  steps?: StepItem[];
  image_url?: string;
}

const DEFAULT_STEPS: StepItem[] = [
  { name: "Subnets",          subLabel: "split",   stepNumber: 1 },
  { name: "Route tables",     subLabel: "direct",  stepNumber: 2 },
  { name: "Internet gateway", subLabel: "open",    stepNumber: 3 },
  { name: "NAT gateway",      subLabel: "hide",    stepNumber: 4 },
  { name: "Security groups",  subLabel: "allow",   stepNumber: 5 },
  { name: "Network ACLs",                          stepNumber: 6 },
];

const DEFAULTS: Required<CompactStepIndexMeta> = {
  heading: "The parts of a VPC",
  steps: DEFAULT_STEPS,
  image_url: "",
};

// Vertical image strip on right side (optional)
const STRIP_X     = 830;
const STRIP_W     = 200;
const STRIP_H     = 720;
const STRIP_TOP   = 200;

export async function buildAuroraCompactStepIndex(
  slide: SlideData & { image_url?: string; compact_meta?: CompactStepIndexMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactStepIndexMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };
  const steps = m.steps ?? DEFAULT_STEPS;

  const objects: fabric.FabricObject[] = [];
  const resolvedImageUrl = imageUrl ?? (slide.image_url ?? m.image_url ?? null) ?? null;

  // 1. Photo background or dark fallback
  if (resolvedImageUrl) {
    try {
      const img = await fabric.FabricImage.fromURL(resolvedImageUrl, { crossOrigin: "anonymous" });
      const scaleX = CANVAS_SIZE / (img.width ?? CANVAS_SIZE);
      const scaleY = CANVAS_SIZE / (img.height ?? CANVAS_SIZE);
      img.set({
        left: 0, top: 0,
        originX: "left", originY: "top",
        scaleX: Math.max(scaleX, scaleY),
        scaleY: Math.max(scaleX, scaleY),
        selectable: false,
      });
      setData(img, { role: "step_bg_photo" });
      objects.push(img);
    } catch { /* fallback below */ }
  }
  if (objects.length === 0) {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
      fill: "#2A1F14", originX: "left", originY: "top", selectable: false,
    }));
  }

  // 2. Dark gradient overlay
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(0,0,0,0.10)" },
        { offset: 0.35, color: "rgba(0,0,0,0.40)" },
        { offset: 1,    color: "rgba(0,0,0,0.80)" },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));

  // 3. Optional right-side vertical image strip placeholder
  const rightImagePlaceholder = new fabric.Rect({
    left: STRIP_X, top: STRIP_TOP,
    width: STRIP_W, height: STRIP_H,
    fill: "rgba(255,255,255,0.08)",
    stroke: "rgba(255,255,255,0.18)",
    strokeWidth: 1,
    rx: 8, ry: 8,
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(rightImagePlaceholder, { role: "step_right_image_zone" });
  objects.push(rightImagePlaceholder);

  // 4. Heading
  const heading = new fabric.Text(m.heading, {
    left: 55, top: 72,
    fontFamily: tokens.fontBody,
    fontSize: 64, fontWeight: 700,
    fill: "#FFFFFF",
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(heading, { role: "step_index_heading" });
  objects.push(heading);

  // 5. Vertical pipeline connector line — runs from first to last item centre
  const ROW_H   = 120;
  const LIST_TOP = 210;
  const PIPE_X  = 88;  // x of the connecting vertical line
  const PIPE_TOP = LIST_TOP + ROW_H / 2;
  const PIPE_BOT = LIST_TOP + (steps.length - 1) * ROW_H + ROW_H / 2;

  const pipeRule = new fabric.Rect({
    left: PIPE_X,
    top: PIPE_TOP,
    width: 2,
    height: PIPE_BOT - PIPE_TOP,
    fill: "rgba(255,255,255,0.28)",
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(pipeRule, { role: "step_pipeline" });
  objects.push(pipeRule);

  // 6. Step rows
  steps.forEach((item, i) => {
    const rowY    = LIST_TOP + i * ROW_H;
    const centerY = rowY + ROW_H / 2;
    const color   = item.stepColor ?? STEP_COLORS[item.stepNumber] ?? "#FFFFFF";
    const hasSubLabel = Boolean(item.subLabel);

    // Step number (far left, muted)
    objects.push(new fabric.Text(String(item.stepNumber), {
      left: 55, top: centerY,
      fontFamily: tokens.fontBody, fontSize: 18, fontWeight: 300,
      fill: "rgba(255,255,255,0.40)",
      originX: "left", originY: "center", selectable: false,
    }));

    // Connector dot on the pipeline line
    objects.push(new fabric.Circle({
      left: PIPE_X + 1, top: centerY,
      radius: 5, fill: color,
      originX: "center", originY: "center", selectable: false,
    }));

    // Item name (shifted right of pipeline)
    const nameY = hasSubLabel ? centerY - 14 : centerY;
    objects.push(new fabric.Text(item.name, {
      left: PIPE_X + 22, top: nameY,
      fontFamily: tokens.fontBody, fontSize: 40, fontWeight: 600,
      fill: "#FFFFFF",
      originX: "left", originY: "center", selectable: false,
    }));

    // Sub-label below name
    if (item.subLabel) {
      objects.push(new fabric.Text(item.subLabel, {
        left: PIPE_X + 22, top: nameY + 26,
        fontFamily: tokens.fontBody, fontSize: 18, fontStyle: "italic",
        fill: "rgba(255,255,255,0.42)",
        originX: "left", originY: "top", selectable: false,
      }));
    }
  });

  return objects;
}
