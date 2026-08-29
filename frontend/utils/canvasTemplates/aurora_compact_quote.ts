import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

const BG_CREAM        = "#EDE5D8";   // outer canvas — editorial cream border
const BG_ORANGE       = "#D46A5E";   // inner card — terracotta
const TEXT_INK        = "#1B1B1B";

// Cream border on every side — orange card floats inside
const CARD_INSET = 36;
const CARD_SIZE  = CANVAS_SIZE - CARD_INSET * 2; // 1008

// All positions below are absolute canvas coords (CARD_INSET already included)
const PAD_L    = CARD_INSET + 72;   // text column left edge (abs)
const INTRO_Y  = CARD_INSET + 60;   // intro question top (abs)

// Portrait — large, starts at upper-third, bleeds to card edges (B&W editorial)
const IMG_X    = CARD_INSET + 546;  // 582 — portrait left (abs)
const IMG_TOP  = CARD_INSET + 175;  // 211 — portrait top (abs)
const IMG_W    = CANVAS_SIZE - CARD_INSET - IMG_X; // 462px — right to card edge
const IMG_H    = CANVAS_SIZE - CARD_INSET - IMG_TOP; // 833px — bottom to card edge

const TEXT_W   = IMG_X - PAD_L - 16;  // ~458px — text column stays left of portrait

// Adaptive font sizes — probe largest first, step down on overflow
const QUOTE_FONT_CANDIDATES = [62, 54, 46, 40, 34];

// Attribution is placed dynamically below the quote (not pinned to bottom)
const ATTR_GAP  = 44;   // px gap between quote bottom and attribution name
const SAFE_BOT  = CANVAS_SIZE - CARD_INSET - 80;  // absolute maximum — stays on card

interface CompactQuoteMeta {
  intro_question?: string;
  quote_body?: string;
  attribution_name?: string;
  attribution_role?: string;
  portrait_url?: string;
  image_url?: string;
  portrait_edge?: "fade" | "hard" | "rule";
}

const DEFAULTS: Required<CompactQuoteMeta> = {
  intro_question: `If you can try 20 ideas at once, why pick one?`,
  quote_body:
    `”It’s a bit like we got a more powerful telescope. You can map deeper or broader, but you’re still mapping an infinite space. You still need to know where to look.”`,
  attribution_name: `Dan Alistarh`,
  attribution_role: `Researcher, Anthropic`,
  portrait_url: ``,
  image_url: ``,
  portrait_edge: `hard`,
};

export async function buildAuroraCompactQuote(
  slide: SlideData & { compact_meta?: CompactQuoteMeta },
  imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactQuoteMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  const objects: fabric.FabricObject[] = [];
  const resolvedPortrait = imageUrl ?? m.image_url ?? m.portrait_url ?? null;

  // ── 1. Cream outer canvas ─────────────────────────────────────────────────
  objects.push(new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: BG_CREAM,
    originX: "left", originY: "top", selectable: false,
  }));

  // ── 2. Orange card — floats inside the cream border ───────────────────────
  objects.push(new fabric.Rect({
    left: CARD_INSET, top: CARD_INSET,
    width: CARD_SIZE, height: CARD_SIZE,
    fill: BG_ORANGE,
    originX: "left", originY: "top", selectable: false,
  }));

  // ── 3. Portrait — large editorial B&W, bleeds to card edges ─────────────────
  if (resolvedPortrait) {
    try {
      const img = await fabric.FabricImage.fromURL(resolvedPortrait, { crossOrigin: "anonymous" });

      // Cover-scale to fill the portrait zone
      const scale = Math.max(IMG_W / (img.width ?? IMG_W), IMG_H / (img.height ?? IMG_H));
      img.set({
        left: IMG_X, top: IMG_TOP,
        scaleX: scale, scaleY: scale,
        originX: "left", originY: "top",
      });

      // Straight rectangular clip — bleeds to card edges (no rounded corners, no frame)
      img.clipPath = new fabric.Rect({
        left: IMG_X, top: IMG_TOP, width: IMG_W, height: IMG_H,
        originX: "left", originY: "top", absolutePositioned: true,
      });

      // B&W greyscale filter — editorial magazine look
      img.filters = [new fabric.filters.Grayscale()];
      img.applyFilters();

      setData(img, { role: "quote_portrait" });
      objects.push(img);

      // Portrait left-edge treatment — controlled by portrait_edge in compact_meta
      if (m.portrait_edge === "fade") {
        // Gradient dissolve into orange bg
        objects.push(new fabric.Rect({
          left: IMG_X, top: IMG_TOP, width: 72, height: IMG_H,
          fill: new fabric.Gradient({
            type: "linear", gradientUnits: "percentage",
            coords: { x1: 0, y1: 0, x2: 1, y2: 0 },
            colorStops: [
              { offset: 0,   color: BG_ORANGE },
              { offset: 1,   color: "rgba(212,106,94,0)" },
            ],
          }),
          originX: "left", originY: "top", selectable: false,
        }));
      } else if (m.portrait_edge === "rule") {
        // Thin 2px cream vertical rule — deliberate boundary as design element
        objects.push(new fabric.Rect({
          left: IMG_X - 1, top: IMG_TOP,
          width: 2, height: IMG_H,
          fill: BG_CREAM,
          originX: "left", originY: "top", selectable: false,
        }));
      }
      // "hard" = no treatment — sharp orange-to-B&W cut
    } catch { /* no portrait — clean orange shows through */ }
  }
  // No portrait = clean orange background, nothing drawn

  // ── 4. Intro question ─────────────────────────────────────────────────────
  const introFontSize = 19;
  let introH = 0;

  if (m.intro_question) {
    const introProbe = new fabric.Textbox(m.intro_question, {
      width: TEXT_W,
      fontFamily: tokens.fontBody, fontSize: introFontSize, fontWeight: 400,
      fontStyle: "normal", lineHeight: 1.4,
    });
    introH = (introProbe.height ?? introFontSize) + 28;

    const intro = new fabric.Textbox(m.intro_question, {
      left: PAD_L, top: INTRO_Y, width: TEXT_W,
      fontFamily: tokens.fontBody,
      fontSize: introFontSize, fontWeight: 400, fontStyle: "normal",
      fill: TEXT_INK, lineHeight: 1.4,
      originX: "left", originY: "top",
    });
    setData(intro, { role: "quote_intro" });
    objects.push(intro);
  }

  // ── 5. Quote body — adaptive font sizing ──────────────────────────────────
  const QUOTE_Y = INTRO_Y + introH;

  // Probe: find largest font where quote fits above SAFE_BOT
  let quoteFontSize = QUOTE_FONT_CANDIDATES[QUOTE_FONT_CANDIDATES.length - 1];
  let quoteProbeH = 0;
  for (const fs of QUOTE_FONT_CANDIDATES) {
    const probe = new fabric.Textbox(m.quote_body, {
      width: TEXT_W,
      fontFamily: tokens.fontSerif, fontSize: fs, fontWeight: 400,
      fontStyle: "normal", lineHeight: 1.22,
    });
    quoteProbeH = probe.height ?? fs;
    if (QUOTE_Y + quoteProbeH <= SAFE_BOT) {
      quoteFontSize = fs;
      break;
    }
  }

  const quoteText = new fabric.Textbox(m.quote_body, {
    left: PAD_L, top: QUOTE_Y, width: TEXT_W,
    fontFamily: tokens.fontSerif,
    fontSize: quoteFontSize, fontWeight: 400, fontStyle: "normal",
    fill: TEXT_INK, lineHeight: 1.22,
    originX: "left", originY: "top",
  });
  setData(quoteText, { role: "quote_body" });
  objects.push(quoteText);

  // ── 6. Attribution — placed dynamically after quote body ──────────────────
  const attrNameSize = 28;
  const attrRoleSize = 20;
  const ATTR_Y = Math.min(QUOTE_Y + quoteProbeH + ATTR_GAP, SAFE_BOT);

  objects.push(new fabric.Text(m.attribution_name, {
    left: PAD_L, top: ATTR_Y,
    fontFamily: tokens.fontBody,
    fontSize: attrNameSize, fontWeight: 700,
    fill: TEXT_INK,
    originX: "left", originY: "top",
  }));

  objects.push(new fabric.Text(m.attribution_role, {
    left: PAD_L, top: ATTR_Y + attrNameSize * 1.45,
    fontFamily: tokens.fontBody,
    fontSize: attrRoleSize, fontWeight: 400,
    fill: "rgba(0,0,0,0.65)",
    originX: "left", originY: "top",
  }));

  return objects;
}
