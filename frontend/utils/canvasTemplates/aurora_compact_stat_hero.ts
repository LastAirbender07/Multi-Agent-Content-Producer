import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeBrandPill } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData, resolveAssetUrl } from "./shared";

// SRP: one job — make the number land hard.
// Headline sets up why. 152px number IS the slide. Label says what. Space says importance.
// No body text. No chart. This template does nothing else.

const CANVAS_SIZE  = 1080;
const PAD_X        = 64;
const TEXT_W       = CANVAS_SIZE - PAD_X * 2;  // 952px
const HEADLINE_FS  = 64;
const STAT_FS      = 152;
const LABEL_FS     = 42;
const ATTR_FS      = 14;
const BRAND_PILL_Y = CANVAS_SIZE - 80;

const ACCENT_YELLOW = "#F5C518";
const ACCENT_CORAL  = "#D46A5E";

type StatHeroAccent = "yellow" | "coral";

interface CompactStatHeroMeta {
  accent?:          StatHeroAccent;
  headline?:        string;
  stat_value?:      string;
  stat_explanation?: string;
  attribution?:     string;
  brand_wordmark?:  string;
  image_url?:       string;
}

const DEFAULTS: Required<CompactStatHeroMeta> = {
  accent:           "yellow",
  headline:         "Security is not a separate career",
  stat_value:       "$112,521",
  stat_explanation: "average US tech salary — every role ahead beats it",
  attribution:      "Dice 2025 Tech Salary Report",
  brand_wordmark:   "@nextwork",
  image_url:        "",
};

export async function buildAuroraCompactStatHero(
  slide: SlideData & { image_url?: string; compact_meta?: CompactStatHeroMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens      = COMPACT_TOKENS;
  const m: Required<CompactStatHeroMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };
  if (_meta.brandName) m.brand_wordmark = `@${_meta.brandName.replace(/^@/, "")}`;
  const accentColor = m.accent === "coral" ? ACCENT_CORAL : ACCENT_YELLOW;

  const objects: fabric.FabricObject[] = [];
  const resolvedImageUrl = resolveAssetUrl(imageUrl ?? (slide.image_url ?? m.image_url ?? null) ?? null);

  // ── Background ────────────────────────────────────────────────────────────────
  if (resolvedImageUrl) {
    try {
      const img = await fabric.FabricImage.fromURL(resolvedImageUrl, { crossOrigin: "anonymous" });
      const scaleX = CANVAS_SIZE / (img.width ?? CANVAS_SIZE);
      const scaleY = CANVAS_SIZE / (img.height ?? CANVAS_SIZE);
      img.set({ left: 0, top: 0, originX: "left", originY: "top",
        scaleX: Math.max(scaleX, scaleY), scaleY: Math.max(scaleX, scaleY), selectable: false });
      setData(img, { role: "stat_bg_photo" });
      objects.push(img);
    } catch { /* fallback */ }
  }
  if (objects.length === 0) {
    objects.push(new fabric.Rect({
      left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
      fill: new fabric.Gradient({
        type: "linear", gradientUnits: "percentage",
        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0,   color: "#0D1520" },
          { offset: 0.5, color: "#0F1825" },
          { offset: 1,   color: "#0A1018" },
        ],
      }),
      originX: "left", originY: "top", selectable: false,
    }));
  }
  // Glassmorphism overlay
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
  // Subtle top highlight
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: 4,
    fill: "rgba(255,255,255,0.06)",
    originX: "left", originY: "top", selectable: false,
  }));

  // ── Anchor-based layout: pin stat at canvas 40% → number center lands near y=540 ──
  // Flow headline UP from stat anchor, label DOWN below it.
  // This is more reliable than totalH centering since Fabric probes can undercount.

  const statProbe = new fabric.Text(m.stat_value, {
    fontFamily: tokens.fontBody, fontSize: STAT_FS, fontWeight: 700,
  });
  const statH = (statProbe.height ?? STAT_FS) + 4;

  // Stat starts at 40% of canvas — its center ~= visual midpoint
  const statY = Math.round(CANVAS_SIZE * 0.40);

  // Headline and divider flow up from stat
  const dividerY  = statY - 46;
  const hlProbe   = new fabric.Textbox(m.headline, {
    width: TEXT_W, fontFamily: tokens.fontBody,
    fontSize: HEADLINE_FS, fontWeight: 700, lineHeight: 1.1,
  });
  const hlH        = (hlProbe.height ?? HEADLINE_FS) + 8;
  const headlineY  = Math.max(48, dividerY - 32 - hlH);

  const labelProbe = new fabric.Textbox(m.stat_explanation, {
    width: TEXT_W, fontFamily: tokens.fontBody, fontSize: LABEL_FS, fontWeight: 600, lineHeight: 1.3,
  });
  const labelH = (labelProbe.height ?? LABEL_FS) + 4;

  // ── Headline (context: why this number matters) ───────────────────────────────
  const headline = new fabric.Textbox(m.headline, {
    left: PAD_X, top: headlineY, width: TEXT_W,
    fontFamily: tokens.fontBody, fontSize: HEADLINE_FS, fontWeight: 700,
    fill: "#FFFFFF", lineHeight: 1.1,
    originX: "left", originY: "top",
  });
  setData(headline, { role: "stat_headline" });
  objects.push(headline);

  // ── Accent divider ────────────────────────────────────────────────────────────
  objects.push(new fabric.Rect({
    left: PAD_X, top: dividerY, width: TEXT_W, height: 2,
    fill: accentColor + "59",  // 35% opacity
    originX: "left", originY: "top", selectable: false,
  }));

  // ── THE NUMBER (the entire reason this slide exists) ─────────────────────────
  const statValue = new fabric.Text(m.stat_value, {
    left: PAD_X, top: statY,
    fontFamily: tokens.fontBody, fontSize: STAT_FS, fontWeight: 700,
    fill: accentColor,
    originX: "left", originY: "top",
  });
  setData(statValue, { role: "stat_value" });
  objects.push(statValue);

  // ── Stat label (what the number IS — 2-3 lines OK) ──────────────────────────
  const labelY = statY + statH + 12;
  const statLabel = new fabric.Textbox(m.stat_explanation, {
    left: PAD_X, top: labelY, width: TEXT_W,
    fontFamily: tokens.fontBody, fontSize: LABEL_FS, fontWeight: 600,
    fill: "rgba(255,255,255,0.85)", lineHeight: 1.3,
    originX: "left", originY: "top",
  });
  setData(statLabel, { role: "stat_explanation" });
  objects.push(statLabel);

  // ── Attribution (barely-there sourcing) ──────────────────────────────────────
  if (m.attribution) {
    objects.push(new fabric.Text(m.attribution, {
      left: PAD_X, top: labelY + labelH + 14,
      fontFamily: tokens.fontBody, fontSize: ATTR_FS, fontWeight: 400,
      fill: "rgba(255,255,255,0.45)",
      originX: "left", originY: "top",
    }));
  }

  // ── Brand pill ────────────────────────────────────────────────────────────────
  if (m.brand_wordmark) {
    const brandPill = makeBrandPill({
      wordmark: m.brand_wordmark,
      x: PAD_X, y: BRAND_PILL_Y,
      tokens, height: 48, fontSize: 17,
    });
    setData(brandPill, { role: "stat_brand_pill" });
    objects.push(brandPill);
  }

  return objects;
}
