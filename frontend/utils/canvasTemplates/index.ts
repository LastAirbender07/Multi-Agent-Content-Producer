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
// Phase 2.5 — compact-clean family gap-fills
import { buildAuroraCompactCleanCta }         from "./aurora_compact_clean_cta";
import { buildAuroraCompactCleanQuote }       from "./aurora_compact_clean_quote";
import { buildAuroraCompactCleanEngage }      from "./aurora_compact_clean_engage";
// Phase RCA fix — general content template for compact-clean family
import { buildAuroraCompactContent }          from "./aurora_compact_content";
// Phase 2.5 — editorial family gap-fills
import { buildAuroraEditorialHook }           from "./aurora_editorial_hook";
import { buildAuroraEditorialCta }            from "./aurora_editorial_cta";
// Phase 3.5 / 3.6 — aurora-lite family
import { buildAuroraLiteContent }  from "./aurora_lite_content";   // 56pt/28pt content layouts
import { buildAuroraLiteQuote }    from "./aurora_lite_quote";
import { buildAuroraLiteHook }     from "./aurora_lite_hook";      // full-canvas bottom-anchor
import { buildAuroraLiteStat }     from "./aurora_lite_stat";      // 24pt body, 18pt meta
import { buildAuroraLiteTextOnly } from "./aurora_lite_text_only"; // 96pt no-image
// Phase 2.5 — nextwork-dark family gap-fills
import { buildAuroraNxtworkDarkCta }          from "./aurora_nextwork_dark_cta";
import { buildAuroraNxtworkDarkEngage }       from "./aurora_nextwork_dark_engage";

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
  // Phase RCA fix — general content template for compact-clean (photo bg + title + body)
  "aurora-compact-content":            buildAuroraCompactContent,
  // Phase 2.5 — compact-clean family gap-fills
  "aurora-compact-clean-cta":          buildAuroraCompactCleanCta,
  "aurora-compact-clean-quote":        buildAuroraCompactCleanQuote,
  "aurora-compact-clean-engage":       buildAuroraCompactCleanEngage,
  // Phase 2.5 — editorial family
  "aurora-editorial-hook":             buildAuroraEditorialHook,
  "aurora-editorial-cta":              buildAuroraEditorialCta,
  // Phase 2.5 — nextwork-dark family
  "aurora-nextwork-dark-cta":          buildAuroraNxtworkDarkCta,
  "aurora-nextwork-dark-engage":       buildAuroraNxtworkDarkEngage,
  // Phase 3.5 — aurora-lite family
  // Content: reuse aurora-extended layout engine (imgRight/imgLeft/imgTop/textOnly).
  // Density rules (≤15w body, no bullets) enforced by slide_validator.py, NOT the builder.
  // aurora-lite content variants — 56pt/28pt (sideBySide) or 52pt/26pt (textTop/imgTop)
  // Aurora-lite uses its own builder so font sizes are larger than aurora-extended.
  "aurora-lite-content":      (s,i,t,m) => buildAuroraLiteContent(s,i,t,m, 0),
  "aurora-lite-content-0":    (s,i,t,m) => buildAuroraLiteContent(s,i,t,m, 0),  // imgRight 56/28
  "aurora-lite-content-1":    (s,i,t,m) => buildAuroraLiteContent(s,i,t,m, 1),  // textTop  52/26
  "aurora-lite-content-2":    (s,i,t,m) => buildAuroraLiteContent(s,i,t,m, 2),  // imgTop   52/26
  "aurora-lite-content-3":    (s,i,t,m) => buildAuroraLiteContent(s,i,t,m, 3),  // imgLeft  56/28
  "aurora-lite-content-text": buildAuroraLiteTextOnly,  // Phase 3.6: 68pt/28pt (was 48pt/23pt)
  "aurora-lite-quote":   buildAuroraLiteQuote,
  "aurora-lite-hook":    buildAuroraLiteHook,    // Phase 3.6: 940px card, 30pt body (was buildAuroraHook)
  "aurora-lite-stat":    buildAuroraLiteStat,    // Phase 3.6: 24pt body, 18pt meta (was buildAuroraStat)
  "aurora-lite-cta":     buildAuroraCta,         // reuse: 64pt headline, 26pt body — already correct
  "aurora-lite-engage":  buildAuroraEngage,      // reuse: gradient bg, correct for aurora-lite
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
