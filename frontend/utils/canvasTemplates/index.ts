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
  "aurora-content-3":     (s,i,t,m) => buildAuroraContent(s,i,t,m, 3),
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
  "lumina-content-3":     (_s,i,_t,m) => { const s = _s; return buildAuroraContent(s,i,LUMINA,m, 3); },
  "lumina-content-text":  (_s,i,_t,m) => { const s = _s; return buildAuroraContent(s,i,LUMINA,m,-1); },
  "lumina-stat":          lw(buildAuroraStat),
  "lumina-quote":         lw(buildAuroraQuote),
  "lumina-cta":           lw(buildAuroraCta),
  "lumina-engage":        lw(buildAuroraEngage),
};

function inferTemplate(slide: SlideData & { canvas_template?: string }): string {
  const theme = ((slide as { _theme?: string })._theme ?? "aurora").toLowerCase();

  if (slide.type === "content") {
    const hasImage   = !!slide.image_query;
    const hasBullets = (slide.bullets?.length ?? 0) > 0;
    const bodyLen    = slide.body?.length ?? 0;

    if (!hasImage) return `${theme}-content-text`;          // no image → text only

    // Prefer layout based on content density:
    // Many bullets (≥3) → layout-0: left text / right image (fits most content)
    // Short body + bullets → layout-2: top image / bottom text (image-first impact)
    // Long body only → layout-1: top text / bottom image
    if (hasBullets && (slide.bullets?.length ?? 0) >= 3) return `${theme}-content-0`;
    if (hasBullets || bodyLen < 120) return `${theme}-content-2`;
    return `${theme}-content-1`;
  }

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
