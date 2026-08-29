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

interface CompactStepDetailMeta {
  topicName?: string;
  stepNumber?: number;
  stepColor?: string;
  explanation?: string;
  image_url?: string;
}

const DEFAULTS: Required<CompactStepDetailMeta> = {
  topicName: "Subnets",
  stepNumber: 1,
  stepColor: STEP_COLORS[1],
  explanation:
    "A subnet is a slice of your VPC's address range. You choose whether it can reach the internet. A /16 VPC gives you 65,536 addresses across Availability Zones.",
  image_url: "",
};

export async function buildAuroraCompactStepDetail(
  slide: SlideData & { image_url?: string; compact_meta?: CompactStepDetailMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactStepDetailMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

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

  // 2. Gradient overlay
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(0,0,0,0)"    },
        { offset: 0.38, color: "rgba(0,0,0,0.28)" },
        { offset: 1,    color: "rgba(0,0,0,0.72)" },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));

  const stepColor = m.stepColor ?? STEP_COLORS[m.stepNumber] ?? "#3B7EDC";
  const TOPIC_Y   = 558;
  const TOPIC_FONT = 96;
  const DOT_X     = 60;
  const TEXT_X    = 96;

  // Two-pass: measure topic height for explanation positioning
  const probe = new fabric.Textbox(m.topicName, {
    width: 960, fontFamily: tokens.fontBody,
    fontSize: TOPIC_FONT, fontWeight: 700, lineHeight: 1.05,
  });
  const topicH = probe.height ?? TOPIC_FONT;

  // Colour dot
  objects.push(new fabric.Circle({
    left: DOT_X, top: TOPIC_Y + TOPIC_FONT * 1.05 * 0.5,
    radius: 9, fill: stepColor,
    originX: "center", originY: "center", selectable: false,
  }));

  // Topic name
  const topicText = new fabric.Textbox(m.topicName, {
    left: TEXT_X, top: TOPIC_Y, width: 960,
    fontFamily: tokens.fontBody,
    fontSize: TOPIC_FONT, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.05,
    originX: "left", originY: "top", selectable: false,
  });
  setData(topicText, { role: "step_topic_name" });
  objects.push(topicText);

  // Explanation
  const explanation = new fabric.Textbox(m.explanation, {
    left: TEXT_X, top: TOPIC_Y + topicH + 28, width: 950,
    fontFamily: tokens.fontBody,
    fontSize: 28, fontWeight: 600,
    fill: "#FFFFFF", lineHeight: 1.55,
    originX: "left", originY: "top", selectable: false,
  });
  setData(explanation, { role: "step_explanation" });
  objects.push(explanation);

  return objects;
}
