import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

// Step colour contract — matches nextwork reference carousel
const STEP_COLORS: Record<number, string> = {
  1: "#3B7EDC",
  2: "#E8B045",
  3: "#4AC48D",
  4: "#B65FE0",
  5: "#F08A3D",
  6: "#EDE8D8",
};

type StepLayout = "index" | "detail";

interface StepItem {
  name: string;
  subLabel?: string;
  stepNumber: number;
  stepColor?: string;
}

interface CompactStepMeta {
  layout?: StepLayout;
  heading?: string;
  steps?: StepItem[];
  topicName?: string;
  stepNumber?: number;
  stepColor?: string;
  explanation?: string;
}

const DEFAULT_STEPS: StepItem[] = [
  { name: "Subnets",           subLabel: "split",   stepNumber: 1 },
  { name: "Route tables",      subLabel: "direct",  stepNumber: 2 },
  { name: "Internet gateway",  subLabel: "open",    stepNumber: 3 },
  { name: "NAT gateway",       subLabel: "hide",    stepNumber: 4 },
  { name: "Security groups",   subLabel: "allow",   stepNumber: 5 },
  { name: "Network ACLs",                           stepNumber: 6 },
];

const DEFAULTS: Required<CompactStepMeta> = {
  layout: "detail",
  heading: "The parts of a VPC",
  steps: DEFAULT_STEPS,
  topicName: "Subnets",
  stepNumber: 1,
  stepColor: STEP_COLORS[1],
  explanation:
    "A subnet is a slice of your VPC's address range. You choose whether it can reach the internet. A /16 VPC gives you 65,536 addresses across Availability Zones.",
};

export async function buildAuroraCompactStep(
  slide: SlideData & { image_url?: string; compact_meta?: CompactStepMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactStepMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  const objects: fabric.FabricObject[] = [];
  const resolvedImageUrl = imageUrl ?? (slide.image_url ?? null);

  // 1. Photo background — cover-fit to canvas
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
    } catch {
      // fallback below
    }
  }

  // Dark fallback when no image loaded
  if (objects.length === 0) {
    objects.push(new fabric.Rect({
      left: 0, top: 0,
      width: CANVAS_SIZE, height: CANVAS_SIZE,
      fill: "#2A1F14",
      originX: "left", originY: "top",
      selectable: false,
    }));
  }

  // 2. Gradient overlay — transparent at top, dark at bottom
  const overlayRect = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear",
      gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(0,0,0,0)"    },
        { offset: 0.38, color: "rgba(0,0,0,0.28)" },
        { offset: 1,    color: "rgba(0,0,0,0.72)" },
      ],
    }),
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(overlayRect, { role: "step_gradient_overlay" });
  objects.push(overlayRect);

  if (m.layout === "index") {
    // ── INDEX LAYOUT ──────────────────────────────────────────────────────────

    const heading = new fabric.Text(m.heading, {
      left: 55, top: 72,
      fontFamily: tokens.fontBody,
      fontSize: 64, fontWeight: 700,
      fill: "#FFFFFF",
      originX: "left", originY: "top",
    });
    setData(heading, { role: "step_index_heading" });
    objects.push(heading);

    const ROW_H = 128;
    const LIST_TOP = 210;

    (m.steps ?? DEFAULT_STEPS).forEach((item, i) => {
      const rowY = LIST_TOP + i * ROW_H;
      const color = item.stepColor ?? STEP_COLORS[item.stepNumber] ?? "#FFFFFF";
      const hasSubLabel = Boolean(item.subLabel);
      // When there's a sub-label, shift item name up so the pair is vertically centred in row
      const itemCenterY = rowY + (hasSubLabel ? ROW_H / 2 - 16 : ROW_H / 2);

      // Step number (muted)
      objects.push(new fabric.Text(String(item.stepNumber), {
        left: 55, top: rowY + ROW_H / 2,
        fontFamily: tokens.fontBody,
        fontSize: 20, fontWeight: 300,
        fill: "rgba(255,255,255,0.45)",
        originX: "left", originY: "center",
      }));

      // Colour dot
      objects.push(new fabric.Circle({
        left: 94, top: itemCenterY,
        radius: 7, fill: color,
        originX: "center", originY: "center",
        selectable: false,
      }));

      // Item name
      objects.push(new fabric.Text(item.name, {
        left: 114, top: itemCenterY,
        fontFamily: tokens.fontBody,
        fontSize: 44, fontWeight: 600,
        fill: "#FFFFFF",
        originX: "left", originY: "center",
      }));

      // Sub-label
      if (item.subLabel) {
        objects.push(new fabric.Text(item.subLabel, {
          left: 114, top: itemCenterY + 30,
          fontFamily: tokens.fontBody,
          fontSize: 20, fontStyle: "italic",
          fill: "rgba(255,255,255,0.45)",
          originX: "left", originY: "top",
        }));
      }
    });

  } else {
    // ── DETAIL LAYOUT ─────────────────────────────────────────────────────────

    const stepColor = m.stepColor ?? STEP_COLORS[m.stepNumber] ?? "#3B7EDC";
    const TOPIC_Y = 558;
    const TOPIC_FONT = 96;
    const DOT_X = 60;
    const TEXT_X = 96;

    // Two-pass: probe topic name height so explanation Y is computed, not guessed
    const probe = new fabric.Textbox(m.topicName, {
      width: 960,
      fontFamily: tokens.fontBody,
      fontSize: TOPIC_FONT, fontWeight: 700,
      lineHeight: 1.05,
    });
    const topicH = probe.height ?? TOPIC_FONT;

    // Colour dot — vertically centred to first line of topic
    const dotCenterY = TOPIC_Y + TOPIC_FONT * 1.05 * 0.5;
    objects.push(new fabric.Circle({
      left: DOT_X, top: dotCenterY,
      radius: 9, fill: stepColor,
      originX: "center", originY: "center",
      selectable: false,
    }));

    // Topic name
    const topicText = new fabric.Textbox(m.topicName, {
      left: TEXT_X, top: TOPIC_Y,
      width: 960,
      fontFamily: tokens.fontBody,
      fontSize: TOPIC_FONT, fontWeight: 700,
      fill: "#FFFFFF",
      lineHeight: 1.05,
      originX: "left", originY: "top",
    });
    setData(topicText, { role: "step_topic_name" });
    objects.push(topicText);

    // Explanation — Y is computed from measured topic height
    const explanationY = TOPIC_Y + topicH + 28;
    const explanation = new fabric.Textbox(m.explanation, {
      left: TEXT_X, top: explanationY,
      width: 950,
      fontFamily: tokens.fontBody,
      fontSize: 28, fontWeight: 600,
      fill: "#FFFFFF",
      lineHeight: 1.55,
      originX: "left", originY: "top",
    });
    setData(explanation, { role: "step_explanation" });
    objects.push(explanation);
  }

  return objects;
}
