import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import { makeNumberBadge } from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

// SahilBloom reference: pure white page, thick black border frame — notebook aesthetic
const BG_PAGE          = "#FFFFFF";
const INK_PRIMARY      = "#1B1B1B";
const INK_MUTED        = "#6B6560";
const ROW_RULE_COLOR   = "#D4CEC8";
const ILLUS_PLACEHOLDER= "#E8E2D8";  // grey-warm rect when no real illustration
const BORDER_WIDTH     = 5;
const BORDER_INSET     = 8;          // border sits 8px from slide edge

// Col geometry — 3-column: badge | body text (2/3) | illustration (1/3)
const PAD_X          = 48;
const COL_A_CENTER_X = 55;    // badge circle x-centre
const COL_B_X        = 106;   // body text left edge
const COL_C_X        = 740;   // illustration left edge (right 1/3 zone)
const ILLUS_SIZE     = 130;   // illustration square px — drives MIN_ROW_H
const COL_B_W        = COL_C_X - COL_B_X - 28; // 606px — body text always leaves room for illus
const BADGE_RADIUS   = 26;    // 52px diameter — number fills circle
const BODY_FONT_SIZE = 24;    // Playfair Display Regular
const ROW_GAP        = 24;
const MIN_ROW_H      = ILLUS_SIZE;  // 130px — illustration anchors row height
const LIST_TOP       = BORDER_INSET + BORDER_WIDTH + 32;  // ~45px — just inside border

// Footer (bottom handle + series title) — sits just above border inset
const FOOTER_Y        = CANVAS_SIZE - BORDER_INSET - BORDER_WIDTH - 36; // ~1031
const FOOTER_FONT     = 16;

interface ListItem {
  number: number;
  body: string;
  illustrationUrl?: string;
}

interface CompactListMeta {
  handle?: string;
  seriesTitle?: string;
  items?: ListItem[];
}

const DEFAULTS: Required<CompactListMeta> = {
  handle: "@SahilBloom",
  seriesTitle: "The 5 Types of Wealth.",
  items: [
    {
      number: 1,
      body: "Tell your partner you love them every night before falling asleep. Someday you'll find the other side of the bed empty and wish you could.",
    },
    { number: 2, body: "Never keep score in love." },
    {
      number: 3,
      body: "Laugh until you cry. Laughing together goes a long way to smooth the inevitable bumps in the road.",
    },
    {
      number: 4,
      body: "Never stop dating. Marriages don't get boring — you stop trying.",
    },
  ],
};

export async function buildAuroraCompactListItem(
  slide: SlideData & { compact_meta?: CompactListMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactListMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };
  const items = m.items.length > 0 ? m.items : DEFAULTS.items;

  const objects: fabric.FabricObject[] = [];

  // 1. White page background
  const bg = new fabric.Rect({
    left: 0, top: 0,
    width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: BG_PAGE,
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(bg, { role: "list_bg" });
  objects.push(bg);

  // 2. Notebook border frame — thick black rectangle stroke, no fill
  const border = new fabric.Rect({
    left: BORDER_INSET,
    top: BORDER_INSET,
    width: CANVAS_SIZE - BORDER_INSET * 2,
    height: CANVAS_SIZE - BORDER_INSET * 2,
    fill: "transparent",
    stroke: INK_PRIMARY,
    strokeWidth: BORDER_WIDTH,
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(border, { role: "list_border" });
  objects.push(border);

  // ── Two-pass layout ─────────────────────────────────────────────────────────
  // Pass 1: probe each item's body text height (always use COL_B_W — illustration always shown)
  const textHeights = items.map(item => {
    const probe = new fabric.Textbox(item.body, {
      width: COL_B_W,
      fontFamily: tokens.fontBody,
      fontSize: BODY_FONT_SIZE,
      fontWeight: 400,
      lineHeight: 1.5,
    });
    return probe.height ?? BODY_FONT_SIZE * 1.5;
  });
  const rowHeights = textHeights.map(h => Math.max(h, MIN_ROW_H));

  // Justify-between: distribute items evenly across the available vertical space
  const CONTENT_BOT = FOOTER_Y - 24; // stop 24px above footer
  const totalItemH  = rowHeights.reduce((s, h) => s + h, 0);
  const dynamicGap  = items.length > 1
    ? Math.max(ROW_GAP, (CONTENT_BOT - LIST_TOP - totalItemH) / (items.length - 1))
    : ROW_GAP;

  // Pass 2: place items
  let yCursor = LIST_TOP;

  for (let i = 0; i < items.length; i++) {
    const item     = items[i];
    const rowH     = rowHeights[i];
    const badgeCY  = yCursor + rowH / 2;

    // Badge — stroke-only, number fills the circle (bigger font relative to radius)
    const badge = makeNumberBadge({
      number: item.number,
      cx: COL_A_CENTER_X,
      cy: badgeCY,
      tokens,
      radius: BADGE_RADIUS,
      strokeColor: INK_PRIMARY,
      strokeWidth: 1.5,
      fillColor: "transparent",
      fontSize: item.number > 9 ? 20 : 26,
      fontFamily: tokens.fontSerif,
      textColor: INK_PRIMARY,
    });
    setData(badge, { role: `list_badge_${item.number}` });
    objects.push(badge);

    // Body text — vertically centred within row, Inter Regular (serif not loaded in renderer)
    const bodyText = new fabric.Textbox(item.body, {
      left: COL_B_X,
      top: yCursor + (rowH - textHeights[i]) / 2,
      width: COL_B_W,
      fontFamily: tokens.fontBody,
      fontSize: BODY_FONT_SIZE,
      fontWeight: 400,
      fill: INK_PRIMARY,
      lineHeight: 1.5,
      textAlign: "left",
      originX: "left", originY: "top",
      selectable: false,
    });
    setData(bodyText, { role: `list_body_${item.number}` });
    objects.push(bodyText);

    // Illustration — real image or warm-grey placeholder
    const illusTop = badgeCY - ILLUS_SIZE / 2;
    if (item.illustrationUrl) {
      try {
        const img = await fabric.FabricImage.fromURL(item.illustrationUrl, { crossOrigin: "anonymous" });
        const scale = ILLUS_SIZE / Math.max(img.width ?? ILLUS_SIZE, img.height ?? ILLUS_SIZE);
        img.set({
          left: COL_C_X,
          top: illusTop,
          scaleX: scale, scaleY: scale,
          originX: "left", originY: "top",
          selectable: false,
        });
        setData(img, { role: `list_illus_${item.number}` });
        objects.push(img);
      } catch {
        // fall through to placeholder below
      }
    }
    // Always render placeholder (either as fallback or as the designed grey box)
    if (!item.illustrationUrl) {
      const placeholder = new fabric.Rect({
        left: COL_C_X,
        top: illusTop,
        width: ILLUS_SIZE,
        height: ILLUS_SIZE,
        fill: ILLUS_PLACEHOLDER,
        rx: 8, ry: 8,
        originX: "left", originY: "top",
        selectable: false,
      });
      setData(placeholder, { role: `list_illus_placeholder_${item.number}` });
      objects.push(placeholder);
    }

    // Row separator hairline (between rows, not after last)
    if (i < items.length - 1) {
      const rowRule = new fabric.Rect({
        left: PAD_X,
        top: yCursor + rowH + ROW_GAP / 2,
        width: CANVAS_SIZE - PAD_X * 2,
        height: 1,
        fill: ROW_RULE_COLOR,
        originX: "left", originY: "top",
        selectable: false,
      });
      objects.push(rowRule);
    }

    yCursor += rowH + dynamicGap;
  }

  // 3. Footer — handle bottom-left, series title bottom-right (as per SahilBloom reference)
  const handleText = new fabric.Text(m.handle, {
    left: PAD_X, top: FOOTER_Y,
    fontFamily: tokens.fontBody,
    fontSize: FOOTER_FONT,
    fontWeight: 400,
    fill: INK_MUTED,
    originX: "left", originY: "top",
    selectable: false,
  });
  setData(handleText, { role: "list_handle" });
  objects.push(handleText);

  const seriesText = new fabric.Text(m.seriesTitle, {
    left: CANVAS_SIZE - PAD_X, top: FOOTER_Y,
    fontFamily: tokens.fontSerif,
    fontSize: FOOTER_FONT,
    fontStyle: "italic",
    fontWeight: 400,
    fill: INK_MUTED,
    originX: "right", originY: "top",
    selectable: false,
  });
  setData(seriesText, { role: "list_series_title" });
  objects.push(seriesText);

  return objects;
}
