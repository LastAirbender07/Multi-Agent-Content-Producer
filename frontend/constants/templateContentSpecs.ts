/**
 * templateContentSpecs.ts
 *
 * Machine-readable content specifications for every template.
 * Used by:
 *   1. Backend slide_generator.py -- injected into the LLM prompt so the LLM
 *      writes content that actually fits the template (right length, right tone)
 *   2. Phase 3 format_selection_node -- picks which template family fits the
 *      available content (e.g. "short punchy hook" → compact-clean, not editorial)
 *   3. Phase 2.8 API endpoint -- GET /api/v1/content/template-spec/:templateId
 *
 * After ANY change here, run: node scripts/export_specs.cjs
 * This regenerates backend/configs/template_content_specs.json (what Python reads).
 */

export interface TextFieldSpec {
  /** Which field in SlideData or compact_meta this maps to */
  field: string;
  /** Human-readable label shown to users / used in LLM prompt */
  label: string;
  /** Font rendered at 1080×1080 canvas size */
  font: string;
  /** Font size in points at 1080×1080 */
  fontSize: number;
  /** Hard max before text visibly overflows or is cut -- do NOT exceed */
  maxChars: number;
  /** Ideal character count for the best visual result */
  targetChars: number;
  /** Minimum -- below this the slide looks empty */
  minChars: number;
  /** true = wraps to multiple lines; false = single line, excess truncated */
  multiline: boolean;
  style: "headline" | "body" | "caption" | "pill_label" | "attribution" | "handle" | "number";
}

export interface ImageSpec {
  /** Which compact_meta field holds the image URL */
  field: string;
  /** false = template renders with a placeholder; true = slide looks broken without it */
  required: boolean;
  /** e.g. "9:16" | "1:1" | "4:5" | "3:2" | "free" */
  aspectRatio: string;
  /** Minimum source pixel width for acceptable quality at 1080 canvas size */
  minWidth: number;
  /** Description of what the image should show -- passed to image search / user guidance */
  purpose: string;
}

export interface TemplateContentSpec {
  templateId: string;
  /** Machine key of the family this template belongs to */
  family: "aurora-lite" | "aurora-extended" | "compact-clean" | "editorial" | "nextwork-dark" | "cover-hero";
  /** Semantic role of this slide in a carousel */
  slideRole: "hook" | "content" | "stat" | "quote" | "cta" | "engage" | "list" | "step";

  textFields: TextFieldSpec[];
  images: ImageSpec[];

  /**
   * One-line tone description injected verbatim into the LLM generation prompt.
   * Must be concrete and directive, not vague ("punchy" not "engaging").
   */
  contentTone: string;
  /**
   * More specific style guidance -- what kind of sentence structure, what to avoid.
   */
  contentStyle: string;
  /**
   * Concrete example the LLM should use as a reference -- NOT copy verbatim.
   * Shows the right length, tone, and word style.
   */
  exampleContent: string;
}

// ── Specs ─────────────────────────────────────────────────────────────────────

export const TEMPLATE_CONTENT_SPECS: TemplateContentSpec[] = [

  // ── Aurora Extended ──────────────────────────────────────────────────────────

  {
    templateId:   "aurora-hook",
    family:       "aurora-extended",
    slideRole:    "hook",
    contentTone:  "Bold, direct, one surprising idea -- stop-the-scroll energy",
    contentStyle: "6-9 words. A question, a provocative claim, or a shocking statement. No filler words. Reads instantly.",
    exampleContent: "Most people build for the wrong customer",
    textFields: [
      { field: "title", label: "Hook headline", font: "Inter Black 900", fontSize: 64,
        maxChars: 80, targetChars: 40, minChars: 15, multiline: true, style: "headline" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-content-0",
    family:       "aurora-extended",
    slideRole:    "content",
    contentTone:  "Informative, medium density -- one specific insight per slide",
    contentStyle: "Title: max 8 words, sets the key idea. Body: 30-55 words of specific, actionable insight. No generics.",
    exampleContent: "Title: 'Why retention beats acquisition'. Body: 'Acquiring a new customer costs 5-7x more than retaining one. Yet 44% of companies spend more on acquisition. The compounding math of retention -- lower CAC amortised over longer LTV -- is the single biggest lever most SaaS founders ignore.'",
    textFields: [
      { field: "title", label: "Slide title", font: "Inter 700", fontSize: 40,
        maxChars: 60, targetChars: 35, minChars: 10, multiline: false, style: "headline" },
      { field: "body", label: "Body copy", font: "Inter 400", fontSize: 24,
        maxChars: 300, targetChars: 150, minChars: 60, multiline: true, style: "body" },
    ],
    images: [
      { field: "image_url", required: false, aspectRatio: "4:3",
        minWidth: 600, purpose: "Supporting visual -- chart, diagram, or relevant photo" },
    ],
  },

  {
    templateId:   "aurora-stat",
    family:       "aurora-extended",
    slideRole:    "stat",
    contentTone:  "One number that reframes everything -- shocking, precise, concrete",
    contentStyle: "stat_value: the number itself (max 12 chars including %, $, etc). stat_label: what it measures (5-12 words). Title: why this number matters (8-12 words).",
    exampleContent: "stat_value: '73%'. stat_label: 'of AI projects never reach production'. Title: 'Most AI investment is vaporware'",
    textFields: [
      { field: "stat_value", label: "The number", font: "Inter Black 900", fontSize: 96,
        maxChars: 12, targetChars: 4, minChars: 1, multiline: false, style: "number" },
      { field: "stat_label", label: "What it measures", font: "Inter 400", fontSize: 28,
        maxChars: 60, targetChars: 30, minChars: 10, multiline: false, style: "caption" },
      { field: "title", label: "Context sentence", font: "Inter 700", fontSize: 32,
        maxChars: 80, targetChars: 50, minChars: 20, multiline: true, style: "body" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-quote",
    family:       "aurora-extended",
    slideRole:    "quote",
    contentTone:  "A memorable pull-quote that crystallises the core insight",
    contentStyle: "Title: the quote itself (under 35 words, quotation marks included). Body: attribution -- who said it, context (10-20 words).",
    exampleContent: "Title: '\"The goal is not to do business with everybody who needs what you have. The goal is to do business with people who believe what you believe.\"'. Body: 'Simon Sinek, Start With Why, 2009'",
    textFields: [
      { field: "title", label: "The quote", font: "Inter Italic 400", fontSize: 36,
        maxChars: 200, targetChars: 100, minChars: 30, multiline: true, style: "body" },
      { field: "body", label: "Attribution", font: "Inter 400", fontSize: 22,
        maxChars: 60, targetChars: 35, minChars: 10, multiline: false, style: "attribution" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-cta",
    family:       "aurora-extended",
    slideRole:    "cta",
    contentTone:  "Direct, high-energy follow/save ask -- the payoff for reading this far",
    contentStyle: "Title: 8-12 words, action verb first, specific benefit. Body: 1 sentence reinforcing the value of following.",
    exampleContent: "Title: 'Follow for one research-backed insight every week'. Body: 'We break down the studies most people never read.'",
    textFields: [
      { field: "title", label: "CTA headline", font: "Inter Black 700", fontSize: 52,
        maxChars: 80, targetChars: 50, minChars: 20, multiline: true, style: "headline" },
      { field: "body", label: "Supporting copy", font: "Inter 400", fontSize: 26,
        maxChars: 120, targetChars: 60, minChars: 20, multiline: true, style: "body" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-engage",
    family:       "aurora-extended",
    slideRole:    "engage",
    contentTone:  "Warm mid-carousel pause -- personal, conversational, curiosity-building",
    contentStyle: "Title: direct warm ask (10-16 words). Body: 1-2 sentences with a specific promise of value.",
    exampleContent: "Title: 'If this changed how you think, follow -- we cover this every week'. Body: 'Most people scroll past research that could change their decisions. We make sure you don't.'",
    textFields: [
      { field: "title", label: "Engage prompt", font: "Inter Black 700", fontSize: 52,
        maxChars: 100, targetChars: 65, minChars: 25, multiline: true, style: "headline" },
      { field: "body", label: "Value reinforcement", font: "Inter 400", fontSize: 26,
        maxChars: 120, targetChars: 70, minChars: 20, multiline: true, style: "body" },
    ],
    images: [],
  },

  // ── Compact Clean ─────────────────────────────────────────────────────────────

  {
    templateId:   "aurora-compact-hook",
    family:       "compact-clean",
    slideRole:    "hook",
    contentTone:  "Punchy, bold, one-idea -- Inter Black stop-the-scroll energy on cream",
    contentStyle: "5-8 words max. Start with an action verb or number. No passive voice. Should work as a standalone statement.",
    exampleContent: "Stop learning. Start building.",
    textFields: [
      { field: "title", label: "Hook headline", font: "Inter Black 900", fontSize: 88,
        maxChars: 40, targetChars: 20, minChars: 5, multiline: true, style: "headline" },
      { field: "body", label: "Sub-label (optional)", font: "Inter 400", fontSize: 28,
        maxChars: 60, targetChars: 30, minChars: 0, multiline: false, style: "caption" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-fact",
    family:       "compact-clean",
    slideRole:    "stat",
    contentTone:  "Two-number contrast -- the before vs after, the old vs new, the expected vs actual",
    contentStyle: "One baseline number and one featured (highlight) number side by side. Header: 1 sentence explaining the contrast (max 60 chars). Body: 1 sentence on the implication.",
    exampleContent: "baseline: '11%', featured: '47%', header: 'AI-assisted teams outperform by 4x', body: 'Source: McKinsey 2024'",
    textFields: [
      { field: "compact_meta.baseline_stat", label: "Baseline number", font: "Inter 400", fontSize: 90,
        maxChars: 8, targetChars: 4, minChars: 1, multiline: false, style: "number" },
      { field: "compact_meta.featured_stat", label: "Featured number", font: "Inter 700", fontSize: 140,
        maxChars: 8, targetChars: 4, minChars: 1, multiline: false, style: "number" },
      { field: "compact_meta.body_header", label: "Contrast headline", font: "Inter 700", fontSize: 34,
        maxChars: 60, targetChars: 40, minChars: 15, multiline: false, style: "headline" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-fact-compare",
    family:       "compact-clean",
    slideRole:    "stat",
    contentTone:  "Visual two-column comparison -- A vs B, before vs after",
    contentStyle: "Two clear sides. Left: the old/worse/smaller value. Right: the new/better/larger. Label each side explicitly.",
    exampleContent: "Left: 'Traditional: 6 months', Right: 'With AI: 3 weeks'",
    textFields: [
      { field: "compact_meta.left_stat",   label: "Left value",  font: "Inter Black 900", fontSize: 88,
        maxChars: 10, targetChars: 5, minChars: 1, multiline: false, style: "number" },
      { field: "compact_meta.right_stat",  label: "Right value", font: "Inter Black 900", fontSize: 88,
        maxChars: 10, targetChars: 5, minChars: 1, multiline: false, style: "number" },
      { field: "compact_meta.left_label",  label: "Left label",  font: "Inter 400", fontSize: 24,
        maxChars: 30, targetChars: 15, minChars: 3, multiline: false, style: "caption" },
      { field: "compact_meta.right_label", label: "Right label", font: "Inter 400", fontSize: 24,
        maxChars: 30, targetChars: 15, minChars: 3, multiline: false, style: "caption" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-step",
    family:       "compact-clean",
    slideRole:    "step",
    contentTone:  "One clear numbered step -- actionable, concrete, self-contained",
    contentStyle: "Step number + title (5-8 words) + body (20-40 words of specific instruction). Each step must be independently useful.",
    exampleContent: "Step 2: 'Map your current customer journey'. Body: 'List every touchpoint from awareness to purchase. Include channels, time spent, and dropout rates. Focus on where friction exceeds 3 seconds -- that's where you lose people.'",
    textFields: [
      { field: "compact_meta.step_number", label: "Step number", font: "Inter Black 900", fontSize: 80,
        maxChars: 3, targetChars: 2, minChars: 1, multiline: false, style: "number" },
      { field: "title", label: "Step title", font: "Inter Black 900", fontSize: 52,
        maxChars: 50, targetChars: 30, minChars: 10, multiline: false, style: "headline" },
      { field: "body", label: "Step description", font: "Inter 400", fontSize: 26,
        maxChars: 150, targetChars: 80, minChars: 30, multiline: true, style: "body" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-step-index",
    family:       "compact-clean",
    slideRole:    "step",
    contentTone:  "Visual pipeline/roadmap -- shows the full journey at a glance",
    contentStyle: "3-6 steps, each 2-4 words. Photo background required for visual depth. Steps should flow left-to-right or top-to-bottom logically.",
    exampleContent: "steps: ['Research', 'Prototype', 'Test', 'Launch', 'Iterate']",
    textFields: [
      { field: "compact_meta.steps", label: "Step labels (array of 3-6 items)", font: "Inter 700", fontSize: 28,
        maxChars: 25, targetChars: 15, minChars: 3, multiline: false, style: "caption" },
    ],
    images: [
      { field: "compact_meta.image_url", required: true, aspectRatio: "1:1",
        minWidth: 800, purpose: "Atmospheric landscape or abstract photo for dark overlay background" },
    ],
  },

  {
    templateId:   "aurora-compact-step-detail",
    family:       "compact-clean",
    slideRole:    "step",
    contentTone:  "Deep-dive step with visual card -- detailed instruction with framing",
    contentStyle: "Title: step name (3-6 words). Body: 30-55 words of specific how-to. Photo background provides visual context.",
    exampleContent: "Title: 'Build your evidence stack'. Body: 'Collect 5 data points that support your hypothesis: customer interviews, competitor analysis, market size data, technical feasibility notes, and at least one contrarian view. Document sources for every claim.'",
    textFields: [
      { field: "title", label: "Step title", font: "Inter Black 900", fontSize: 48,
        maxChars: 40, targetChars: 20, minChars: 5, multiline: false, style: "headline" },
      { field: "body", label: "Step detail", font: "Inter 400", fontSize: 24,
        maxChars: 200, targetChars: 120, minChars: 40, multiline: true, style: "body" },
    ],
    images: [
      { field: "compact_meta.image_url", required: true, aspectRatio: "1:1",
        minWidth: 800, purpose: "Relevant atmospheric photo for background -- landscape, workspace, or abstract" },
    ],
  },

  {
    templateId:   "aurora-compact-stat-hero",
    family:       "compact-clean",
    slideRole:    "stat",
    contentTone:  "Full-bleed photo with one dominant number -- cinematic stat moment",
    contentStyle: "stat_value: the number (max 8 chars). stat_label: what it measures (max 40 chars). title: the dramatic context sentence (max 60 chars). Photo should relate to the stat topic.",
    exampleContent: "stat_value: '3.2B'. stat_label: 'people use social media daily'. title: 'More than any TV network ever reached'",
    textFields: [
      { field: "compact_meta.stat_value", label: "Headline number", font: "Inter Black 900", fontSize: 120,
        maxChars: 8, targetChars: 4, minChars: 1, multiline: false, style: "number" },
      { field: "compact_meta.stat_label", label: "What it measures", font: "Inter 400", fontSize: 26,
        maxChars: 40, targetChars: 25, minChars: 8, multiline: false, style: "caption" },
      { field: "title", label: "Context line", font: "Inter 700", fontSize: 32,
        maxChars: 60, targetChars: 40, minChars: 10, multiline: false, style: "headline" },
    ],
    images: [
      { field: "compact_meta.image_url", required: true, aspectRatio: "1:1",
        minWidth: 800, purpose: "Full-bleed atmospheric photo contextually related to the stat topic" },
    ],
  },

  {
    templateId:   "aurora-compact-list-item",
    family:       "compact-clean",
    slideRole:    "list",
    contentTone:  "Ranked editorial list -- SahilBloom book-page aesthetic, serif typography",
    contentStyle: "4-5 ranked items, each with a number badge + title (3-6 words) + short description (15-25 words). White background, border frame. Items should be genuinely ranked, not arbitrary.",
    exampleContent: "1. 'Compounding habits' -- 'Small daily actions that multiply over years, not weeks. Consistency beats intensity.' 2. 'Network quality' -- 'Ten deep relationships outperform a hundred shallow ones every time.'",
    textFields: [
      { field: "compact_meta.items", label: "List items (array, each with title + description)", font: "Playfair Display 700", fontSize: 28,
        maxChars: 200, targetChars: 120, minChars: 40, multiline: true, style: "body" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-quote",
    family:       "compact-clean",
    slideRole:    "quote",
    contentTone:  "Editorial pull-quote with B&W portrait -- credibility through attribution",
    contentStyle: "quote_body: the exact quote (50-120 chars). quote_attribution: full name + context (max 40 chars). Portrait should be of the person being quoted.",
    exampleContent: "quote: '\"Perfection is the enemy of progress.\"' attribution: '-- Winston Churchill, 1943'",
    textFields: [
      { field: "compact_meta.quote_body",        label: "The quote",    font: "Playfair Display Bold Italic", fontSize: 44,
        maxChars: 120, targetChars: 80, minChars: 30, multiline: true, style: "body" },
      { field: "compact_meta.quote_attribution", label: "Attribution",  font: "Inter 400", fontSize: 22,
        maxChars: 40, targetChars: 25, minChars: 5, multiline: false, style: "attribution" },
    ],
    images: [
      { field: "compact_meta.image_url", required: false, aspectRatio: "9:16",
        minWidth: 400, purpose: "B&W portrait photo of the person being quoted, or thematically related portrait" },
    ],
  },

  // ── Compact Clean Gap-fills (Phase 2.5) ──────────────────────────────────────

  {
    templateId:   "aurora-compact-clean-cta",
    family:       "compact-clean",
    slideRole:    "cta",
    contentTone:  "Cream-bg follow ask -- clean, direct, first-person",
    contentStyle: "pill_text: 2-4 ALL-CAPS words (max 20 chars). headline: action-oriented, first-person (max 40 chars). sub_text: one line with handle and cadence.",
    exampleContent: "pill_text: 'FOLLOW FOR MORE'. headline: 'Follow for weekly career insights.'. sub_text: '@yourbrand · Every Sunday'",
    textFields: [
      { field: "compact_meta.pill_text", label: "Pill label (ALL CAPS)", font: "Inter 700", fontSize: 22,
        maxChars: 20, targetChars: 12, minChars: 4, multiline: false, style: "pill_label" },
      { field: "title", label: "CTA headline", font: "Inter Black 900", fontSize: 92,
        maxChars: 40, targetChars: 25, minChars: 8, multiline: true, style: "headline" },
      { field: "body", label: "Handle + cadence", font: "Inter 400", fontSize: 28,
        maxChars: 60, targetChars: 35, minChars: 10, multiline: false, style: "caption" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-clean-quote",
    family:       "compact-clean",
    slideRole:    "quote",
    contentTone:  "Cream serif pull-quote -- attributable wisdom, elegant and save-worthy",
    contentStyle: "quote_text: the actual quotation (60-120 chars, no quotation marks needed -- template adds them). attribution: -- Name, context (max 40 chars).",
    exampleContent: "quote_text: 'The secret of getting ahead is getting started.' attribution: '-- Mark Twain'",
    textFields: [
      { field: "title", label: "Quote text", font: "Playfair Display Bold Italic", fontSize: 56,
        maxChars: 120, targetChars: 80, minChars: 30, multiline: true, style: "body" },
      { field: "body", label: "Attribution", font: "Inter 400", fontSize: 26,
        maxChars: 40, targetChars: 25, minChars: 5, multiline: false, style: "attribution" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-compact-clean-engage",
    family:       "compact-clean",
    slideRole:    "engage",
    contentTone:  "Single-action save/share ask on cream -- benefit-first, warm",
    contentStyle: "pill_text: the action in 2-3 ALL-CAPS words. headline: what to do + why in 5-8 words. body: one supporting line (max 100 chars).",
    exampleContent: "pill_text: 'SAVE + SHARE'. headline: 'Save this. Share with someone who needs it.'. body: 'If this helped you, pass it on.'",
    textFields: [
      { field: "compact_meta.pill_text", label: "Action pill (ALL CAPS)", font: "Inter 700", fontSize: 22,
        maxChars: 20, targetChars: 12, minChars: 4, multiline: false, style: "pill_label" },
      { field: "title", label: "Action headline", font: "Inter Black 900", fontSize: 88,
        maxChars: 40, targetChars: 25, minChars: 5, multiline: true, style: "headline" },
      { field: "body", label: "Supporting copy", font: "Inter 400", fontSize: 28,
        maxChars: 100, targetChars: 55, minChars: 10, multiline: true, style: "body" },
    ],
    images: [],
  },

  // ── Editorial ─────────────────────────────────────────────────────────────────

  {
    templateId:   "aurora-editorial-hook",
    family:       "editorial",
    slideRole:    "hook",
    contentTone:  "Reflective, wisdom-style opening -- book-page quality, thought leadership NOT clickbait",
    contentStyle: "headline: a rich declarative statement (50-70 chars). Playfair Italic -- should sound like a sentence from a thoughtful essay. Avoid questions. body: one grounding sentence (max 80 chars).",
    exampleContent: "headline: 'The one idea that changed how I think about everything.' body: 'A deep-dive into the framework behind it.'",
    textFields: [
      { field: "title", label: "Essay-style opening", font: "Playfair Display Bold Italic", fontSize: 88,
        maxChars: 80, targetChars: 60, minChars: 30, multiline: true, style: "headline" },
      { field: "body", label: "Framing sentence", font: "Inter 400", fontSize: 30,
        maxChars: 100, targetChars: 60, minChars: 15, multiline: false, style: "body" },
      { field: "compact_meta.handle",       label: "@handle",      font: "Inter 300", fontSize: 20,
        maxChars: 20, targetChars: 12, minChars: 3, multiline: false, style: "handle" },
      { field: "compact_meta.series_title", label: "Series title", font: "Playfair Italic", fontSize: 20,
        maxChars: 30, targetChars: 20, minChars: 5, multiline: false, style: "caption" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-editorial-cta",
    family:       "editorial",
    slideRole:    "cta",
    contentTone:  "Graceful journal-page closing -- literary, confident, not salesy",
    contentStyle: "cta_headline: 2 short lines, \n between them (total max 60 chars). Reads like a book's closing sentence. follow_text: simple action + handle (max 40 chars).",
    exampleContent: "cta_headline: 'Follow along.\\nMore every week.' follow_text: 'Follow @yourbrand'",
    textFields: [
      { field: "title", label: "Closing CTA (two lines)", font: "Playfair Display Bold Italic", fontSize: 80,
        maxChars: 60, targetChars: 35, minChars: 10, multiline: true, style: "headline" },
      { field: "body", label: "Follow line", font: "Inter 400", fontSize: 28,
        maxChars: 40, targetChars: 20, minChars: 5, multiline: false, style: "caption" },
    ],
    images: [],
  },

  // ── Nextwork Dark ─────────────────────────────────────────────────────────────

  {
    templateId:   "aurora-nextwork-dark-cta",
    family:       "nextwork-dark",
    slideRole:    "cta",
    contentTone:  "Confident, authoritative dark-mode follow ask -- no fluff, direct command",
    contentStyle: "pill_text: 2-4 ALL-CAPS words (max 20 chars). headline: action verb first, period at end (max 40 chars). sub_text: handle + cadence (max 60 chars).",
    exampleContent: "pill_text: 'FOLLOW FOR MORE'. headline: 'Follow for more.' sub_text: '@yourbrand · Every Sunday'",
    textFields: [
      { field: "compact_meta.pill_text", label: "Pill label (ALL CAPS)", font: "Inter 700", fontSize: 20,
        maxChars: 20, targetChars: 12, minChars: 4, multiline: false, style: "pill_label" },
      { field: "title", label: "CTA command", font: "Inter Black 900", fontSize: 96,
        maxChars: 40, targetChars: 20, minChars: 5, multiline: true, style: "headline" },
      { field: "body", label: "Handle + cadence", font: "Inter 400", fontSize: 28,
        maxChars: 60, targetChars: 35, minChars: 10, multiline: false, style: "caption" },
    ],
    images: [],
  },

  {
    templateId:   "aurora-nextwork-dark-engage",
    family:       "nextwork-dark",
    slideRole:    "engage",
    contentTone:  "Dark-mode single action -- SAVE THIS energy, terse and powerful",
    contentStyle: "headline: 2-4 words, imperative, period at end. pill_text: 2-3 ALL-CAPS words. body: one supporting line (max 80 chars).",
    exampleContent: "headline: 'Save this.' pill_text: 'SAVE THIS'. body: 'If this helped you, send it to someone who needs it.'",
    textFields: [
      { field: "title", label: "Action headline", font: "Inter Black 900", fontSize: 88,
        maxChars: 30, targetChars: 15, minChars: 3, multiline: true, style: "headline" },
      { field: "compact_meta.pill_text", label: "Action pill (ALL CAPS)", font: "Inter 700", fontSize: 20,
        maxChars: 20, targetChars: 12, minChars: 4, multiline: false, style: "pill_label" },
      { field: "body", label: "Supporting copy", font: "Inter 400", fontSize: 28,
        maxChars: 100, targetChars: 55, minChars: 10, multiline: true, style: "body" },
    ],
    images: [],
  },

  // ── Cover Hero ────────────────────────────────────────────────────────────────

  {
    templateId:   "aurora-carousel-cover-hero-phone",
    family:       "cover-hero",
    slideRole:    "hook",
    contentTone:  "High-impact product/app showcase -- visual-first, minimal copy",
    contentStyle: "headline: Inter Black display text, 1-3 words per line, 2 lines max (max 40 chars total). body_text: one punchy supporting line (max 80 chars). screen_image: the product/app screenshot for the phone screen.",
    exampleContent: "headline: 'YOUR HEADLINE\\nGOES HERE'. body_text: 'One idea. One slide. Maximum impact.'",
    textFields: [
      { field: "compact_meta.headline",  label: "Display headline", font: "Inter Black 900", fontSize: 140,
        maxChars: 40, targetChars: 20, minChars: 5, multiline: true, style: "headline" },
      { field: "compact_meta.body_text", label: "Supporting line",  font: "Inter 400", fontSize: 32,
        maxChars: 80, targetChars: 45, minChars: 10, multiline: false, style: "body" },
    ],
    images: [
      { field: "compact_meta.screen_image_url", required: false, aspectRatio: "9:16",
        minWidth: 360, purpose: "App or product screenshot for the phone mockup screen" },
    ],
  },

  {
    templateId:   "aurora-carousel-cover-hero-images",
    family:       "cover-hero",
    slideRole:    "hook",
    contentTone:  "Photo-first cover -- two images tell the story, copy is minimal and grounding",
    contentStyle: "headline: 2-3 word statement on two lines (max 40 chars). body_text: one grounding sentence (max 80 chars). Images: two tilted photos that together tell a visual story.",
    exampleContent: "headline: 'THE BIGGER\\nPICTURE'. body_text: 'Context that makes the story land.'",
    textFields: [
      { field: "compact_meta.headline",  label: "Display headline", font: "Inter Black 900", fontSize: 140,
        maxChars: 40, targetChars: 20, minChars: 5, multiline: true, style: "headline" },
      { field: "compact_meta.body_text", label: "Supporting line",  font: "Inter 400", fontSize: 32,
        maxChars: 80, targetChars: 45, minChars: 10, multiline: false, style: "body" },
    ],
    images: [
      { field: "compact_meta.image_urls[0]", required: false, aspectRatio: "free",
        minWidth: 300, purpose: "First photo -- left/main tilted slot" },
      { field: "compact_meta.image_urls[1]", required: false, aspectRatio: "free",
        minWidth: 300, purpose: "Second photo -- right/smaller tilted slot" },
    ],
  },

  // ── Aurora Lite (Phase 3.5) ────────────────────────────────────────────────

  {
    templateId:   "aurora-lite-content",
    family:       "aurora-lite", // type cast -- TemplateContentSpec.family is a union
    slideRole:    "content",
    contentTone:  "Dark aurora aesthetic, one bold declarative statement -- Instagram-readable, no bullets ever",
    contentStyle: "Title: one declarative statement, 6-10 words max, Syne 64pt. Body: one supporting idea, <=15 words, Plus Jakarta Sans 28pt. No bullet points under any circumstances. Think: newspaper headline + one-sentence lead.",
    exampleContent: "Title: 'The attention economy is eating your career.' Body: 'Every hour scrolling is an hour not building.'",
    textFields: [
      { field: "title", label: "One bold statement", font: "Syne 700", fontSize: 64,
        maxChars: 60, targetChars: 35, minChars: 10, multiline: true, style: "headline" as const },
      { field: "body", label: "One supporting idea (max 15 words)", font: "Plus Jakarta Sans 400", fontSize: 28,
        maxChars: 80, targetChars: 45, minChars: 5, multiline: false, style: "body" as const },
    ],
    images: [],
  },

  {
    templateId:   "aurora-lite-quote",
    family:       "aurora-lite",
    slideRole:    "quote",
    contentTone:  "Dark atmospheric pull-quote -- premium, the quote speaks for itself, no bullets",
    contentStyle: "title: the quote (under 30 words, with quotation marks). body: attribution only -- name + context (10-20 words). Never add insight bullets or key takeaways.",
    exampleContent: "title: '\"The goal is not to be better than other people, but to be better than you used to be.\"' body: '-- Wayne Dyer'",
    textFields: [
      { field: "title", label: "The quote (with quotation marks)", font: "Plus Jakarta Sans Italic 600", fontSize: 50,
        maxChars: 200, targetChars: 100, minChars: 20, multiline: true, style: "body" as const },
      { field: "body", label: "Attribution only", font: "Plus Jakarta Sans 400", fontSize: 26,
        maxChars: 60, targetChars: 30, minChars: 5, multiline: false, style: "attribution" as const },
    ],
    images: [],
  },

];

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** O(1) lookup by templateId */
export const TEMPLATE_CONTENT_SPEC_MAP: Record<string, TemplateContentSpec> =
  Object.fromEntries(TEMPLATE_CONTENT_SPECS.map(s => [s.templateId, s]));

/** Get spec for a template, or null if not found */
export function getTemplateContentSpec(templateId: string): TemplateContentSpec | null {
  return TEMPLATE_CONTENT_SPEC_MAP[templateId] ?? null;
}
