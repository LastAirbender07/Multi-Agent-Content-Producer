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
  right_image?: string;
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
  right_image: "",
};


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

  // 2. Dark gradient overlay — stronger so white text reads clearly on any photo
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(0,0,0,0.22)" },
        { offset: 0.32, color: "rgba(0,0,0,0.55)" },
        { offset: 1,    color: "rgba(0,0,0,0.88)" },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));

  // 3. Heading — large, wraps to 2 lines to match reference character
  const hasRightPanel = Boolean(m.right_image);
  const HEADING_WIDTH = hasRightPanel ? 490 : 680;

  // 3a. Optional right-side image panel
  const RIGHT_X = 580;
  const RIGHT_Y = 60;
  const RIGHT_W = 440;
  const RIGHT_H = 960;
  const RIGHT_R = 18;

  if (hasRightPanel) {
    try {
      const panelImg = await fabric.FabricImage.fromURL(m.right_image, { crossOrigin: "anonymous" });
      const scaleX = RIGHT_W / (panelImg.width ?? RIGHT_W);
      const scaleY = RIGHT_H / (panelImg.height ?? RIGHT_H);
      const scale = Math.max(scaleX, scaleY);
      const scaledW = (panelImg.width ?? RIGHT_W) * scale;
      const scaledH = (panelImg.height ?? RIGHT_H) * scale;
      panelImg.set({
        left: RIGHT_X - (scaledW - RIGHT_W) / 2,
        top: RIGHT_Y - (scaledH - RIGHT_H) / 2,
        originX: "left", originY: "top",
        scaleX: scale, scaleY: scale,
        selectable: false,
        clipPath: new fabric.Rect({
          left: RIGHT_X, top: RIGHT_Y,
          width: RIGHT_W, height: RIGHT_H,
          rx: RIGHT_R, ry: RIGHT_R,
          absolutePositioned: true,
          originX: "left", originY: "top",
        }),
      });
      objects.push(panelImg);

      // Subtle border over the panel
      objects.push(new fabric.Rect({
        left: RIGHT_X, top: RIGHT_Y,
        width: RIGHT_W, height: RIGHT_H,
        fill: "transparent",
        stroke: "rgba(255,255,255,0.18)", strokeWidth: 2,
        rx: RIGHT_R, ry: RIGHT_R,
        originX: "left", originY: "top", selectable: false,
      }));
    } catch { /* skip panel on error */ }
  }

  const heading = new fabric.Textbox(m.heading, {
    left: 55, top: 56, width: HEADING_WIDTH,
    fontFamily: tokens.fontBody,
    fontSize: 90, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.05,
    originX: "left", originY: "top",
  });
  setData(heading, { role: "step_index_heading" });
  objects.push(heading);

  // 4. Vertical pipeline connector line — runs from first to last item centre
  const ROW_H    = 118;
  const LIST_TOP = 278;  // below 90pt 2-line heading (56 + ~189px + 33px gap)
  const PIPE_X   = 88;   // x of the connecting vertical line
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

  // 5. Step rows
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
      originX: "left", originY: "center",
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
      originX: "left", originY: "center",
    }));

    // Sub-label below name
    if (item.subLabel) {
      objects.push(new fabric.Text(item.subLabel, {
        left: PIPE_X + 22, top: nameY + 26,
        fontFamily: tokens.fontBody, fontSize: 18, fontStyle: "italic",
        fill: "rgba(255,255,255,0.42)",
        originX: "left", originY: "top",
      }));
    }
  });

  return objects;
}
