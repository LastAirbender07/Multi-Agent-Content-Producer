/**
 * templateFamilies.ts
 *
 * Maps the four Phase 2.5 template families to their constituent template keys.
 * Used by Phase 3 routing to select which variant to apply for a given brand
 * personality / tone profile without hard-coding keys at the call site.
 *
 * Family structure
 * ─────────────────
 *  Each family declares:
 *    id          — machine key used by the router
 *    label       — display name shown in Brand Settings
 *    description — one-line rationale for the picker UI
 *    color       — accent swatch for the family tile
 *    slides      — ordered map of slide type → canonical template key
 *                  (hook / content / stat / quote / cta / engage)
 *
 * "slides" does NOT need to cover every type — missing types fall back to
 * the aurora-extended default (aurora-<type>).
 *
 * Phase 3 routing algorithm (pseudocode):
 *   template = TEMPLATE_FAMILIES[brand.family_id]?.slides[slide.type]
 *           ?? `aurora-${slide.type}`
 */

export interface TemplateFamilySlides {
  hook?:    string;
  content?: string;
  stat?:    string;
  quote?:   string;
  cta?:     string;
  engage?:  string;
}

export interface TemplateFamily {
  id:          string;
  label:       string;
  description: string;
  color:       string;
  slides:      TemplateFamilySlides;
}

export const TEMPLATE_FAMILIES: Record<string, TemplateFamily> = {
  // ── 1. Aurora Extended ──────────────────────────────────────────────────────
  // The original gradient-heavy aurora family. Rich visuals, bold colours.
  // Best for: tech, SaaS, fintech, dark-mode aesthetic audiences.
  "aurora-extended": {
    id:          "aurora-extended",
    label:       "Aurora Extended",
    description: "Bold gradients, glass cards, vivid colour — premium dark-mode energy.",
    color:       "#7C6EFA",
    slides: {
      hook:    "aurora-hook",
      content: "aurora-content-0",
      stat:    "aurora-stat",
      quote:   "aurora-quote",
      cta:     "aurora-cta",
      engage:  "aurora-engage",
    },
  },

  // ── 2. Compact Clean ────────────────────────────────────────────────────────
  // Warm cream palette, Inter Black display, peach accents.
  // Best for: education, career, self-improvement, "nextwork" style.
  "compact-clean": {
    id:          "compact-clean",
    label:       "Compact Clean",
    description: "Warm cream, Inter Black headlines, peach pills — clean editorial energy.",
    color:       "#E8CBA3",
    slides: {
      hook:    "aurora-compact-hook",
      content: "aurora-compact-step-detail",
      stat:    "aurora-compact-fact",
      quote:   "aurora-compact-clean-quote",
      cta:     "aurora-compact-clean-cta",
      engage:  "aurora-compact-clean-engage",
    },
  },

  // ── 3. Editorial ────────────────────────────────────────────────────────────
  // Cold white, 5px border frame, Playfair serif-first.
  // Best for: thought leadership, newsletter brands, long-form content creators.
  "editorial": {
    id:          "editorial",
    label:       "Editorial",
    description: "White canvas, serif type, border frame — journal and book-page aesthetic.",
    color:       "#1B1B1B",
    slides: {
      hook:    "aurora-editorial-hook",
      content: "aurora-compact-list-item",  // ranked-list editorial card
      stat:    "aurora-compact-fact-compare",
      quote:   "aurora-compact-quote",
      cta:     "aurora-editorial-cta",
      engage:  "aurora-compact-clean-engage",  // no dark-bg engage for editorial yet
    },
  },

  // ── 4. Nextwork Dark ────────────────────────────────────────────────────────
  // Near-black #0D0D0D, warm-white type, white outlined pills.
  // Best for: cybersecurity, tech tutorials, high-contrast brand-building.
  "nextwork-dark": {
    id:          "nextwork-dark",
    label:       "Nextwork Dark",
    description: "Near-black canvas, warm-white type, white outlined pills — dark-mode authority.",
    color:       "#0D0D0D",
    slides: {
      hook:    "aurora-compact-hook",          // compact-hook can be dark with CSS override — Phase 4
      content: "aurora-compact-step-detail",
      stat:    "aurora-compact-stat-hero",
      quote:   "aurora-compact-quote",
      cta:     "aurora-nextwork-dark-cta",
      engage:  "aurora-nextwork-dark-engage",
    },
  },
};

// ── Ordered list for UI rendering ──────────────────────────────────────────────
// Used by Brand Settings picker to show families in intended display order.
export const TEMPLATE_FAMILY_IDS = [
  "aurora-extended",
  "compact-clean",
  "editorial",
  "nextwork-dark",
] as const;

export type TemplateFamilyId = typeof TEMPLATE_FAMILY_IDS[number];

/**
 * Resolve the canonical template key for a given family + slide type.
 * Falls back to the aurora-extended default if the family or type is unmapped.
 *
 * @param familyId   e.g. "editorial"
 * @param slideType  e.g. "cta"
 * @returns          e.g. "aurora-editorial-cta"
 */
export function resolveTemplate(familyId: string, slideType: string): string {
  const family = TEMPLATE_FAMILIES[familyId];
  const key    = family?.slides[slideType as keyof TemplateFamilySlides];
  return key ?? `aurora-${slideType}`;
}
