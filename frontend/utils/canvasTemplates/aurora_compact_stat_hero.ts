import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeBrandPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

// Accent colours for the stat callout (one per variant)
const ACCENT_YELLOW = "#F5C518";
const ACCENT_CORAL  = "#D46A5E";

type StatHeroAccent = "yellow" | "coral";

interface CompactStatHeroMeta {
  accent?: StatHeroAccent;
  headline?: string;
  body_intro?: string;
  stat_value?: string;
  stat_explanation?: string;
  attribution?: string;
  brand_wordmark?: string;
  image_url?: string;
}

const DEFAULTS: Required<CompactStatHeroMeta> = {
  accent: "yellow",
  headline: "Security is not a separate career",
  body_intro:
    "Most security roles are built on skills you already use, like networking, identity, automation and access control. The 7 that follow all pay above the average US tech salary.",
  stat_value: "$112,521",
  stat_explanation: "is what the average US tech professional earns, and every role ahead beats it.",
  attribution: "Dice 2025 Tech Salary Report",
  brand_wordmark: "@nextwork",
  image_url: "",
};

const PAD_X       = 64;
const DIVIDER_Y   = 560;   // horizontal split between headline zone and stat zone

export async function buildAuroraCompactStatHero(
  slide: SlideData & { image_url?: string; compact_meta?: CompactStatHeroMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactStatHeroMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };
  const accentColor = m.accent === "coral" ? ACCENT_CORAL : ACCENT_YELLOW;

  const objects: fabric.FabricObject[] = [];
  const resolvedImageUrl = imageUrl ?? (slide.image_url ?? m.image_url ?? null) ?? null;

  // 1. Photo background or dark gradient fallback
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
      setData(img, { role: "stat_bg_photo" });
      objects.push(img);
    } catch { /* fallback below */ }
  }
  if (objects.length === 0) {
    // Dark glass-panel fallback — subtle depth gradient instead of flat color
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
      fill: new fabric.Gradient({
        type: "linear", gradientUnits: "percentage",
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0,   color: "#0D1520" },
          { offset: 0.5, color: "#111A28" },
          { offset: 1,   color: "#0A1018" },
        ],
      }),
      originX: "left", originY: "top", selectable: false,
    }));
  }

  // 2. Heavy glassmorphism overlay — photo barely visible as subtle texture
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: new fabric.Gradient({
      type: "linear", gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
      colorStops: [
        { offset: 0,    color: "rgba(8,12,20,0.88)" },
        { offset: 0.44, color: "rgba(8,12,20,0.91)" },
        { offset: 1,    color: "rgba(8,12,20,0.96)" },
      ],
    }),
    originX: "left", originY: "top", selectable: false,
  }));

  // Subtle glass-surface highlight — faint white band at top edge (reflection)
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: 4,
    fill: "rgba(255,255,255,0.06)",
    originX: "left", originY: "top", selectable: false,
  }));

  // 3. ── TOP ZONE: headline + body intro ──────────────────────────────────────

  const headline = new fabric.Textbox(m.headline, {
    left: PAD_X, top: 72,
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody,
    fontSize: 80, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.12,
    originX: "left", originY: "top", selectable: false,
  });
  setData(headline, { role: "stat_headline" });
  objects.push(headline);

  // Probe headline height to place body_intro
  const hlProbe = new fabric.Textbox(m.headline, {
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody, fontSize: 80, fontWeight: 700, lineHeight: 1.12,
  });
  const hlH = hlProbe.height ?? 80;

  const bodyIntro = new fabric.Textbox(m.body_intro, {
    left: PAD_X, top: 72 + hlH + 24,
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody,
    fontSize: 22, fontWeight: 400,
    fill: "rgba(255,255,255,0.88)", lineHeight: 1.55,
    originX: "left", originY: "top", selectable: false,
  });
  setData(bodyIntro, { role: "stat_body_intro" });
  objects.push(bodyIntro);

  // 4. Horizontal divider between zones
  objects.push(new fabric.Rect({
    left: PAD_X, top: DIVIDER_Y,
    width: CANVAS_SIZE - PAD_X * 2, height: 1,
    fill: "rgba(255,255,255,0.25)",
    originX: "left", originY: "top", selectable: false,
  }));

  // 5. ── BOTTOM ZONE: stat + explanation + attribution ────────────────────────

  const STAT_Y = DIVIDER_Y + 36;

  const statValue = new fabric.Text(m.stat_value, {
    left: PAD_X, top: STAT_Y,
    fontFamily: tokens.fontBody,
    fontSize: 96, fontWeight: 700,
    fill: accentColor,
    originX: "left", originY: "top", selectable: false,
  });
  setData(statValue, { role: "stat_value" });
  objects.push(statValue);

  const statValProbe = new fabric.Text(m.stat_value, {
    fontFamily: tokens.fontBody, fontSize: 96, fontWeight: 700,
  });
  const statH = statValProbe.height ?? 96;

  const statExpl = new fabric.Textbox(m.stat_explanation, {
    left: PAD_X, top: STAT_Y + statH + 16,
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody,
    fontSize: 26, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.4,
    originX: "left", originY: "top", selectable: false,
  });
  setData(statExpl, { role: "stat_explanation" });
  objects.push(statExpl);

  const statExplProbe = new fabric.Textbox(m.stat_explanation, {
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody, fontSize: 26, fontWeight: 700, lineHeight: 1.4,
  });
  const explH = statExplProbe.height ?? 26;

  const attribution = new fabric.Text(m.attribution, {
    left: PAD_X, top: STAT_Y + statH + 16 + explH + 16,
    fontFamily: tokens.fontBody,
    fontSize: 16, fontWeight: 400,
    fill: "rgba(255,255,255,0.52)",
    originX: "left", originY: "top", selectable: false,
  });
  setData(attribution, { role: "stat_attribution" });
  objects.push(attribution);

  // 6. Brand pill (bottom-left, above bottom edge)
  if (m.brand_wordmark) {
    const brandPill = makeBrandPill({
      wordmark: m.brand_wordmark,
      x: PAD_X, y: CANVAS_SIZE - 72,
      tokens, height: 48, fontSize: 17,
    });
    setData(brandPill, { role: "stat_brand_pill" });
    objects.push(brandPill);
  }

  return objects;
}
