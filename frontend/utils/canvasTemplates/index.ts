import * as fabric from "fabric";
import { loadCanvasFonts } from "@/utils/canvasFonts";
import { getTokens, applyOverrides, LUMINA } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { buildAuroraHook }    from "./aurora_hook";
import { buildAuroraContent } from "./aurora_content";
import { buildAuroraStat }    from "./aurora_stat";
import { buildAuroraQuote }   from "./aurora_quote";
import { buildAuroraCta }     from "./aurora_cta";
import { buildAuroraEngage }  from "./aurora_engage";

export interface SlideMeta {
  slideNum:    number;
  totalSlides: number;
  logoUrl:     string;
  brandName:   string;
}

type TemplateBuilder = (
  slide:    SlideData & { canvas_template?: string },
  imageUrl: string | null,
  tokens:   ReturnType<typeof getTokens>,
  meta:     SlideMeta,
) => Promise<fabric.FabricObject[]>;

// Lumina = Aurora layout + LUMINA token set — no duplicated code
const lw = (fn: TemplateBuilder): TemplateBuilder =>
  (s, i, _t, m) => fn(s, i, LUMINA, m);

export const REGISTRY: Record<string, TemplateBuilder> = {
  // Aurora
  "aurora-hook":          buildAuroraHook,
  "aurora-content-0":     (s,i,t,m) => buildAuroraContent(s,i,t,m, 0),
  "aurora-content-1":     (s,i,t,m) => buildAuroraContent(s,i,t,m, 1),
  "aurora-content-2":     (s,i,t,m) => buildAuroraContent(s,i,t,m, 2),
  "aurora-content-text":  (s,i,t,m) => buildAuroraContent(s,i,t,m,-1),
  "aurora-stat":          buildAuroraStat,
  "aurora-quote":         buildAuroraQuote,
  "aurora-cta":           buildAuroraCta,
  "aurora-engage":        buildAuroraEngage,
  // Lumina (thin wrappers — same layout, different tokens)
  "lumina-hook":          lw(buildAuroraHook),
  "lumina-content-0":     (_s,i,_t,m) => { const s = _s; return buildAuroraContent(s,i,LUMINA,m, 0); },
  "lumina-content-1":     (_s,i,_t,m) => { const s = _s; return buildAuroraContent(s,i,LUMINA,m, 1); },
  "lumina-content-2":     (_s,i,_t,m) => { const s = _s; return buildAuroraContent(s,i,LUMINA,m, 2); },
  "lumina-content-text":  (_s,i,_t,m) => { const s = _s; return buildAuroraContent(s,i,LUMINA,m,-1); },
  "lumina-stat":          lw(buildAuroraStat),
  "lumina-quote":         lw(buildAuroraQuote),
  "lumina-cta":           lw(buildAuroraCta),
  "lumina-engage":        lw(buildAuroraEngage),
};

function inferTemplate(slide: SlideData & { canvas_template?: string }): string {
  const theme = ((slide as { _theme?: string })._theme ?? "aurora").toLowerCase();
  if (slide.type === "content") return `${theme}-content-0`;
  return `${theme}-${slide.type}`;
}

export async function buildSlideCanvas(
  slide:    SlideData & { canvas_template?: string },
  imageUrl: string | null,
  meta:     SlideMeta,
): Promise<fabric.FabricObject[]> {
  await loadCanvasFonts();

  const templateId = slide.canvas_template ?? inferTemplate(slide);
  const builder    = REGISTRY[templateId] ?? REGISTRY["aurora-hook"];
  const tokens     = applyOverrides(
    getTokens(templateId),
    (slide.slide_overrides as Record<string, string>) ?? {},
  );

  return builder(slide, imageUrl, tokens, meta);
}
