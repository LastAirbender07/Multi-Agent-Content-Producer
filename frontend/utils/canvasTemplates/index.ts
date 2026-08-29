import * as fabric from "fabric";
import { loadCanvasFonts } from "@/utils/canvasFonts";
import { getTokens, applyOverrides, LUMINA } from "@/utils/canvasTokens";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import { buildAuroraHook }    from "./aurora_hook";
import { buildAuroraContent } from "./aurora_content";
import { buildAuroraStat }    from "./aurora_stat";
import { buildAuroraQuote }   from "./aurora_quote";
import { buildAuroraCta }     from "./aurora_cta";
import { buildAuroraEngage }  from "./aurora_engage";
import { buildAuroraCompactHook }        from "./aurora_compact_hook";
import { buildAuroraCompactFact }        from "./aurora_compact_fact";
import { buildAuroraCompactFactCompare } from "./aurora_compact_fact_compare";
import { buildAuroraCompactStep }        from "./aurora_compact_step";
import { buildAuroraCompactStepIndex }   from "./aurora_compact_step_index";
import { buildAuroraCompactStepDetail }  from "./aurora_compact_step_detail";
import { buildAuroraCompactStatHero }    from "./aurora_compact_stat_hero";
import { buildAuroraCompactListItem }    from "./aurora_compact_list_item";
import { buildAuroraCompactQuote }       from "./aurora_compact_quote";
import { buildAuroraCarouselCoverHeroPhone }  from "./aurora_carousel_cover_hero_phone";
import { buildAuroraCarouselCoverHeroImages } from "./aurora_carousel_cover_hero_images";

export interface SlideMeta {
  slideNum:    number;
  totalSlides: number;
  logoUrl:     string;
  brandName:   string;
}

export type TemplateBuilder = (
  slide:    SlideData & { canvas_template?: string },
  imageUrl: string | null,
  tokens:   CanvasTokens,
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
  // Phase 2 compact family (POC v2)
  "aurora-compact-hook":         buildAuroraCompactHook,
  "aurora-compact-fact":         buildAuroraCompactFact,          // legacy — kept for backward compat
  "aurora-compact-fact-compare": buildAuroraCompactFactCompare,   // notebook card, 2-stat compare
  "aurora-compact-step":         buildAuroraCompactStep,          // legacy
  "aurora-compact-step-index":   buildAuroraCompactStepIndex,     // scannable 6-item list + pipeline
  "aurora-compact-step-detail":  buildAuroraCompactStepDetail,    // single-step deep-dive
  "aurora-compact-stat-hero":    buildAuroraCompactStatHero,      // photo bg + headline + accent stat
  "aurora-compact-list-item":    buildAuroraCompactListItem,
  "aurora-compact-quote":        buildAuroraCompactQuote,
  // Phase 5 cover-hero family
  "aurora-carousel-cover-hero-phone":  buildAuroraCarouselCoverHeroPhone,
  "aurora-carousel-cover-hero-images": buildAuroraCarouselCoverHeroImages,
  // Lumina (thin wrappers — same layout, different tokens)
  "lumina-hook":          lw(buildAuroraHook),
  "lumina-content-0":     lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 0)),
  "lumina-content-1":     lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 1)),
  "lumina-content-2":     lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 2)),
  "lumina-content-3":     lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 3)),
  "lumina-content-text":  lw((s,i,t,m) => buildAuroraContent(s,i,t,m,-1)),
  "lumina-stat":          lw(buildAuroraStat),
  "lumina-quote":         lw(buildAuroraQuote),
  "lumina-cta":           lw(buildAuroraCta),
  "lumina-engage":        lw(buildAuroraEngage),
};

export function inferTemplate(slide: SlideData & { canvas_template?: string }): string {
  // Python pipeline always sets canvas_template before rendering — use it directly.
  // This fallback is only exercised by the editor (no pre-assigned template) or tests.
  if (slide.canvas_template) return slide.canvas_template;
  const theme = ((slide as { _theme?: string })._theme ?? "aurora").toLowerCase();

  if (slide.type === "content") {
    // Mirror Python's _canvas_template_id: text-only when no image, otherwise layout-0 default.
    // The Python side picks layout-0/1/2 based on image aspect ratio — that context is not
    // available here in the fallback path, so we default to layout-0 (left-text/right-image).
    const hasImage = !!slide.image_query;
    return hasImage ? `${theme}-content-0` : `${theme}-content-text`;
  }

  return `${theme}-${slide.type}`;
}

export async function buildSlideCanvas(
  slide:    SlideData & { canvas_template?: string },
  imageUrl: string | null,
  meta:     SlideMeta,
): Promise<fabric.FabricObject[]> {
  await loadCanvasFonts();

  const templateId = inferTemplate(slide);
  const builder    = REGISTRY[templateId] ?? REGISTRY["aurora-hook"];
  const tokens     = applyOverrides(
    getTokens(templateId),
    (slide.slide_overrides as Record<string, string>) ?? {},
  );

  return builder(slide, imageUrl, tokens, meta);
}
