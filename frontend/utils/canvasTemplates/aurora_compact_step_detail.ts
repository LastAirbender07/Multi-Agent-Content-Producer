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

  // 2. Gradient overlay — strong enough to read white text over any photo
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(0,0,0,0.20)"  },
        { offset: 0.38, color: "rgba(0,0,0,0.45)"  },
        { offset: 1,    color: "rgba(0,0,0,0.85)"  },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));

  const stepColor = m.stepColor ?? STEP_COLORS[m.stepNumber] ?? "#3B7EDC";

  // 3. White "Preview" card — upper ~45% of canvas
  const CARD_X   = 60;
  const CARD_Y   = 80;
  const CARD_W   = CANVAS_SIZE - 120;
  const CARD_H   = 420;
  const CARD_R   = 14;

  const previewCard = new fabric.Rect({
    left: CARD_X, top: CARD_Y,
    width: CARD_W, height: CARD_H,
    fill: "#FFFFFF", rx: CARD_R, ry: CARD_R,
    originX: "left", originY: "top", selectable: false,
  });
  setData(previewCard, { role: "step_preview_card" });
  objects.push(previewCard);

  // "Preview" label inside card — top-left
  objects.push(new fabric.Text("Preview", {
    left: CARD_X + 22, top: CARD_Y + 18,
    fontFamily: tokens.fontBody,
    fontSize: 19, fontWeight: 400,
    fill: "#888888",
    originX: "left", originY: "top", selectable: false,
  }));

  // Diagram — two side-by-side rounded boxes with a connector line
  const BOX_Y   = CARD_Y + 62;
  const BOX_H   = 300;
  const LEFT_W  = 268;
  const RIGHT_W = 358;
  const GAP     = 26;
  const LEFT_X  = CARD_X + 28;
  const RIGHT_X = LEFT_X + LEFT_W + GAP;

  // Left box
  objects.push(new fabric.Rect({
    left: LEFT_X, top: BOX_Y,
    width: LEFT_W, height: BOX_H,
    fill: "#F4F6F9", rx: 8, ry: 8,
    stroke: "#D0D8E8", strokeWidth: 1.5,
    originX: "left", originY: "top", selectable: false,
  }));

  // Right box
  objects.push(new fabric.Rect({
    left: RIGHT_X, top: BOX_Y,
    width: RIGHT_W, height: BOX_H,
    fill: "#F4F6F9", rx: 8, ry: 8,
    stroke: "#D0D8E8", strokeWidth: 1.5,
    originX: "left", originY: "top", selectable: false,
  }));

  // Left box: "VPC" bold + "Show details" link on same line
  objects.push(new fabric.Text("VPC", {
    left: LEFT_X + 18, top: BOX_Y + 22,
    fontFamily: tokens.fontBody,
    fontSize: 20, fontWeight: 700,
    fill: "#1A1A1A",
    originX: "left", originY: "top", selectable: false,
  }));
  objects.push(new fabric.Text("Show details", {
    left: LEFT_X + 58, top: BOX_Y + 22,
    fontFamily: tokens.fontBody,
    fontSize: 14, fontWeight: 400,
    fill: stepColor,
    originX: "left", originY: "top", selectable: false,
  }));
  objects.push(new fabric.Text("Your AWS virtual network", {
    left: LEFT_X + 18, top: BOX_Y + 48,
    fontFamily: tokens.fontBody,
    fontSize: 14, fontWeight: 400,
    fill: "#888888",
    originX: "left", originY: "top", selectable: false,
  }));
  // VPC name input field
  const INPUT_Y = BOX_Y + 88;
  objects.push(new fabric.Rect({
    left: LEFT_X + 18, top: INPUT_Y,
    width: LEFT_W - 36, height: 34,
    fill: "#FFFFFF", rx: 4, ry: 4,
    stroke: stepColor, strokeWidth: 1.5,
    originX: "left", originY: "top", selectable: false,
  }));
  objects.push(new fabric.Text("nextwork-vpc", {
    left: LEFT_X + 28, top: INPUT_Y + 17,
    fontFamily: tokens.fontBody,
    fontSize: 13, fontWeight: 400,
    fill: "#333333",
    originX: "left", originY: "center", selectable: false,
  }));

  // Connector: from right edge of input field to left edge of right box, at input field midY
  const connY = INPUT_Y + 17;
  objects.push(new fabric.Rect({
    left: LEFT_X + LEFT_W, top: connY - 1,
    width: GAP, height: 2,
    fill: stepColor,
    originX: "left", originY: "top", selectable: false,
  }));

  // Right box: title "Subnets (3)" + subtitle
  objects.push(new fabric.Text(`${m.topicName} (3)`, {
    left: RIGHT_X + 18, top: BOX_Y + 18,
    fontFamily: tokens.fontBody,
    fontSize: 20, fontWeight: 700,
    fill: "#1A1A1A",
    originX: "left", originY: "top", selectable: false,
  }));
  objects.push(new fabric.Text(`${m.topicName} within this VPC`, {
    left: RIGHT_X + 18, top: BOX_Y + 46,
    fontFamily: tokens.fontBody,
    fontSize: 13, fontWeight: 400,
    fill: "#888888",
    originX: "left", originY: "top", selectable: false,
  }));
  // AZ rows with outlined subnet entries
  const AZ_ROWS = ["us-west-2a", "us-west-2b", "us-west-2c"];
  const SUBNET_LABELS = [
    "nextwork-subnet-public1-us-west-2a",
    "nextwork-subnet-public2-us-west-2b",
    "nextwork-subnet-public3-us-west-2c",
  ];
  AZ_ROWS.forEach((az, idx) => {
    const AZ_Y = BOX_Y + 78 + idx * 72;
    objects.push(new fabric.Text(az, {
      left: RIGHT_X + 18, top: AZ_Y,
      fontFamily: tokens.fontBody,
      fontSize: 13, fontWeight: 600,
      fill: "#444444",
      originX: "left", originY: "top", selectable: false,
    }));
    // Outlined subnet row box
    objects.push(new fabric.Rect({
      left: RIGHT_X + 18, top: AZ_Y + 20,
      width: RIGHT_W - 36, height: 34,
      fill: "#FFFFFF", rx: 4, ry: 4,
      stroke: stepColor, strokeWidth: 1.2,
      originX: "left", originY: "top", selectable: false,
    }));
    objects.push(new fabric.Text(SUBNET_LABELS[idx], {
      left: RIGHT_X + 28, top: AZ_Y + 37,
      fontFamily: tokens.fontBody,
      fontSize: 12, fontWeight: 400,
      fill: "#333333",
      originX: "left", originY: "center", selectable: false,
    }));
  });

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
    originX: "left", originY: "top",
  });
  setData(topicText, { role: "step_topic_name" });
  objects.push(topicText);

  // Explanation
  const explanation = new fabric.Textbox(m.explanation, {
    left: TEXT_X, top: TOPIC_Y + topicH + 28, width: 950,
    fontFamily: tokens.fontBody,
    fontSize: 28, fontWeight: 600,
    fill: "#FFFFFF", lineHeight: 1.55,
    originX: "left", originY: "top",
  });
  setData(explanation, { role: "step_explanation" });
  objects.push(explanation);

  return objects;
}
