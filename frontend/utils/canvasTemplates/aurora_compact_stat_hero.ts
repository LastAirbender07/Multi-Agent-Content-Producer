import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeBrandPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData, resolveAssetUrl } from "./shared";

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
const HEADLINE_TOP = 72;
const HEADLINE_FS  = 56;   // reduced from 80 — prevents wrapping past midpoint on long titles
const MIN_DIVIDER  = 520;  // never push stat zone below this even on short headlines
const MAX_DIVIDER  = 620;  // never let body_intro push stat zone off-canvas

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
  const resolvedImageUrl = resolveAssetUrl(imageUrl ?? (slide.image_url ?? m.image_url ?? null) ?? null);

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

  // 3. ── TOP ZONE: headline + body intro (two-pass — measure before positioning) ─

  const TEXT_W = CANVAS_SIZE - PAD_X * 2;

  // Pass 1: measure headline height at the reduced font size
  const hlProbe = new fabric.Textbox(m.headline, {
    width: TEXT_W,
    fontFamily: tokens.fontBody, fontSize: HEADLINE_FS, fontWeight: 700, lineHeight: 1.12,
  });
  const hlH = (hlProbe.height ?? HEADLINE_FS) + 8;

  // Pass 1: measure body_intro height
  const biProbe = new fabric.Textbox(m.body_intro, {
    width: TEXT_W,
    fontFamily: tokens.fontBody, fontSize: 20, fontWeight: 400, lineHeight: 1.5,
  });
  const biH = (biProbe.height ?? 20) + 8;

  // Compute dynamic divider — clamp so stat zone always fits
  const DIVIDER_Y = Math.min(
    Math.max(HEADLINE_TOP + hlH + 24 + biH + 24, MIN_DIVIDER),
    MAX_DIVIDER,
  );

  // Pass 2: position headline
  const headline = new fabric.Textbox(m.headline, {
    left: PAD_X, top: HEADLINE_TOP,
    width: TEXT_W,
    fontFamily: tokens.fontBody,
    fontSize: HEADLINE_FS, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.12,
    originX: "left", originY: "top",
  });
  setData(headline, { role: "stat_headline" });
  objects.push(headline);

  // Pass 2: position body_intro below headline
  const bodyIntroTop = HEADLINE_TOP + hlH + 24;
  const bodyIntro = new fabric.Textbox(m.body_intro, {
    left: PAD_X, top: bodyIntroTop,
    width: TEXT_W,
    fontFamily: tokens.fontBody,
    fontSize: 20, fontWeight: 400,
    fill: "rgba(255,255,255,0.82)", lineHeight: 1.5,
    originX: "left", originY: "top",
  });
  setData(bodyIntro, { role: "stat_body_intro" });
  objects.push(bodyIntro);

  // 4. Horizontal divider — always below both text blocks
  objects.push(new fabric.Rect({
    left: PAD_X, top: DIVIDER_Y,
    width: TEXT_W, height: 1,
    fill: "rgba(255,255,255,0.25)",
    originX: "left", originY: "top", selectable: false,
  }));

  // 5. ── BOTTOM ZONE: stat + explanation + attribution ────────────────────────

  const STAT_Y = DIVIDER_Y + 28;

  const statValue = new fabric.Text(m.stat_value, {
    left: PAD_X, top: STAT_Y,
    fontFamily: tokens.fontBody,
    fontSize: 88, fontWeight: 700,
    fill: accentColor,
    originX: "left", originY: "top",
  });
  setData(statValue, { role: "stat_value" });
  objects.push(statValue);

  const statValProbe = new fabric.Text(m.stat_value, {
    fontFamily: tokens.fontBody, fontSize: 88, fontWeight: 700,
  });
  const statH = (statValProbe.height ?? 88) + 4;

  const statExpl = new fabric.Textbox(m.stat_explanation, {
    left: PAD_X, top: STAT_Y + statH + 12,
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody,
    fontSize: 22, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.35,
    originX: "left", originY: "top",
  });
  setData(statExpl, { role: "stat_explanation" });
  objects.push(statExpl);

  const statExplProbe = new fabric.Textbox(m.stat_explanation, {
    width: CANVAS_SIZE - PAD_X * 2,
    fontFamily: tokens.fontBody, fontSize: 22, fontWeight: 700, lineHeight: 1.35,
  });
  const explH = (statExplProbe.height ?? 22) + 4;

  const attribution = new fabric.Text(m.attribution, {
    left: PAD_X, top: STAT_Y + statH + 12 + explH + 12,
    fontFamily: tokens.fontBody,
    fontSize: 15, fontWeight: 400,
    fill: "rgba(255,255,255,0.52)",
    originX: "left", originY: "top",
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
