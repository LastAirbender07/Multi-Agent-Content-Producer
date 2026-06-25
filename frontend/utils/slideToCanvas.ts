import * as fabric from "fabric";
import type { SlideData } from "@/lib/api";
import { trunc, estimateLines, autoSize, tb } from "@/utils/canvasTextHelpers";

const CS = 1080;   // canvas size
const ML = 72;     // margin left
const MR = 72;     // margin right
const TW = CS - ML - MR;  // text width: 936px

const MAX_BODY = 260;

/**
 * Creates Fabric Textbox instances for the initial canvas state.
 * Uses the API directly (not JSON serialization) to guarantee
 * left/top/width are applied exactly as specified.
 */
export function buildInitialObjects(slide: SlideData): fabric.Textbox[] {
  const objs: fabric.Textbox[] = [];

  switch (slide.type) {
    case "hook":
    case "content": {
      const title = slide.title || "";
      const body  = trunc(slide.body || "", MAX_BODY);
      const tSize = autoSize(title, TW, 68, 28);
      const tLines = estimateLines(title, TW, tSize);
      const tBottom = 80 + tLines * tSize * 1.3 + 16;

      objs.push(tb(title, ML, 80, TW, { fontSize: tSize, fontWeight: "bold", fill: "#ffffff", data: { role: "title" } }));
      if (body) {
        const bSize = autoSize(body, TW, 26, 16);
        objs.push(tb(body, ML, Math.max(tBottom, 240), TW, { fontSize: bSize, fill: "#cccccc", lineHeight: 1.4, data: { role: "body" } }));
      }
      if (slide.bullets?.length) {
        const bText = slide.bullets.slice(0, 5).map(b => `• ${trunc(b, 90)}`).join("\n");
        const bodyH = body ? estimateLines(body, TW, 26) * 26 * 1.4 + 24 : 0;
        const bTop = body ? Math.max(tBottom, 240) + bodyH : tBottom;
        objs.push(tb(bText, ML, bTop, TW, { fontSize: 20, fill: "#cccccc", lineHeight: 1.6, data: { role: "bullets" } }));
      }
      break;
    }

    case "stat": {
      if (slide.title) objs.push(tb(slide.title, ML, 60, TW, { fontSize: 34, fontWeight: "bold", fill: "#ffffff", data: { role: "title" } }));
      const val = trunc(slide.stat_value || "—", 20);
      // Use conservative max (96) — currency symbols (₹,$,€) are wider than Latin chars
      // autoSize uses 0.55× multiplier but currency/CJK can be 0.8–1.0× wide
      const vSize = autoSize(val, TW, 96, 48);
      objs.push(tb(val, ML, 240, TW, { fontSize: vSize, fontWeight: "bold", fill: "#7C6EFA", textAlign: "center", lineHeight: 1, data: { role: "stat_value" } }));
      if (slide.stat_label) {
        objs.push(tb(trunc(slide.stat_label, 80), ML, 240 + vSize * 1.3 + 20, TW, { fontSize: 28, fill: "#aaaaaa", textAlign: "center", data: { role: "stat_label" } }));
      }
      break;
    }

    case "quote": {
      const q = trunc(slide.body || "", 180);
      objs.push(tb(`"${q}"`, ML, 220, TW, { fontSize: 34, fontStyle: "italic", fill: "#ffffff", lineHeight: 1.5, data: { role: "body" } }));
      objs.push(tb(`— ${trunc(slide.title || "", 60)}`, ML, 780, TW, { fontSize: 22, fill: "#aaaaaa", data: { role: "title" } }));
      break;
    }

    case "cta":
    case "engage": {
      const t = trunc(slide.title || "", 80);
      const tSize = autoSize(t, TW, 52, 26);
      objs.push(tb(t, ML, 380, TW, { fontSize: tSize, fontWeight: "bold", fill: "#ffffff", textAlign: "center", data: { role: "title" } }));
      if (slide.body) objs.push(tb(trunc(slide.body, 120), ML, 380 + tSize * 1.4 + 20, TW, { fontSize: 24, fill: "#aaaaaa", textAlign: "center", data: { role: "body" } }));
      break;
    }

    default: {
      const t = slide.title || "";
      const tSize = autoSize(t, TW, 52, 22);
      objs.push(tb(t, ML, 80, TW, { fontSize: tSize, fontWeight: "bold", fill: "#ffffff", data: { role: "title" } }));
      if (slide.body) objs.push(tb(trunc(slide.body, MAX_BODY), ML, 240, TW, { fontSize: 24, fill: "#cccccc", lineHeight: 1.4, data: { role: "body" } }));
    }
  }

  return objs;
}
