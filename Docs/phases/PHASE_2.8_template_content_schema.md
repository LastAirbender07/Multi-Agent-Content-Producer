# PHASE 2.8 — Template Content Schema & Rich Metadata

## Status
APPROVED — Loop 1 complete (2026-09-06), ready to implement

---

## Problem Statement

Today, templates are black boxes to the pipeline. The LLM-based content generation node (`slide_generator.py`) produces slides with `title`, `body`, and `slide_type` fields — it has no idea whether a given template needs 1 image or 3, whether the headline should be 8 words or 40, or whether there's a portrait crop requirement. This creates two problems:

**Problem 1 — Wrong content for the template:** A "Compact Hook" slide expects a punchy 6–10 word Inter Black headline. An "Editorial Hook" expects a reflective, longer Playfair italic statement. The LLM currently gets no template-specific guidance — it writes generic `body` and `title` fields and the template either truncates or overflows.

**Problem 2 — Template selection is blind:** Phase 3 will introduce a `format_selection_node` that picks which template family and slide type to use. Without machine-readable metadata about what each template needs, this node can only guess. The `TEMPLATE_FAMILIES` constant exists but has no content spec — it just maps family → template key.

**After this phase:**
- Every template has a rich `TemplateContentSpec` in `frontend/constants/templateFamilies.ts`
- The spec defines: image requirements, text field character limits, font style, number of text regions, pill text constraints
- The backend `slide_generator.py` receives this spec and uses it to generate correctly-sized content
- The Phase 3 `format_selection_node` can read specs to decide which template fits the available content

---

## The `TemplateContentSpec` Schema

```typescript
interface TextFieldSpec {
  field: string;           // "title" | "body" | "compact_meta.headline" | etc.
  label: string;           // Human-readable: "Main headline"
  font: string;            // "Playfair Display Bold Italic" | "Inter Black 900" | "Inter 400"
  fontSize: number;        // pt size at 1080×1080
  maxChars: number;        // Hard upper limit before overflow
  targetChars: number;     // Ideal length for best visual result
  minChars: number;        // Minimum for the slide to not look empty
  multiline: boolean;      // True = wraps; False = single line, overflow truncated
  style: "headline" | "body" | "caption" | "pill_label" | "attribution";
}

interface ImageSpec {
  field: string;           // Which compact_meta field holds the URL
  required: boolean;       // If false: template renders with placeholder
  aspectRatio: string;     // "9:16" | "1:1" | "4:5" | "3:2" | "free"
  minWidth: number;        // Minimum px for quality (at 1080 canvas)
  purpose: string;         // "portrait photo" | "product screenshot" | "landscape hero"
  altText: string;         // What the LLM should put here if no image is available
}

interface TemplateContentSpec {
  templateId: string;
  family: string;          // "aurora-extended" | "compact-clean" | "editorial" | "nextwork-dark" | "cover-hero"
  slideRole: "hook" | "content" | "stat" | "quote" | "cta" | "engage" | "list" | "step";

  // Content requirements
  textFields: TextFieldSpec[];
  images: ImageSpec[];

  // LLM generation guidance
  contentTone: string;        // e.g. "punchy, one idea, bold statement"
  contentStyle: string;       // e.g. "question or provocative claim, max 8 words"
  avoidPatterns: string[];    // e.g. ["research shows", "according to", "studies suggest"]
  exampleHeadline: string;    // Concrete example for the LLM to follow

  // Rendering constraints
  canvasSize: 1080;
  components: string[];       // List of component roles rendered: ["compact_bg", "compact_category_pill", "compact_headline", ...]
}
```

---

## Why this matters for Phase 3

The `format_selection_node` (Phase 3) will:
1. Read the research synthesis
2. Look at available content (topic, tone, format)
3. Pick a template family + slide type that fits
4. Generate content using the spec's `targetChars`, `contentTone`, and `exampleHeadline`

Without specs: the LLM writes a 60-word headline for a 10-word slot, or picks "editorial" for a tutorial topic that needs "compact-clean".

With specs: every template advertises its content contract. The pipeline respects it.

---

## Requirements

**Functional:**
- Every template registered in `REGISTRY` has a `TemplateContentSpec` entry in `frontend/constants/templateContentSpecs.ts`
- The spec covers all 23 currently-registered aurora-* templates
- Backend `slide_generator.py` receives the spec for the selected template and injects it into the slide generation prompt
- The spec is exposed at `GET /api/v1/content/template-spec/<template_id>` for frontend/LLM use

**Non-functional:**
- Specs live in `frontend/constants/templateContentSpecs.ts` — importable by both editor (TypeScript) and build-time tooling
- Backend reads from a generated JSON copy (`backend/configs/template_content_specs.json`) built by a script — no direct TypeScript import in Python
- Zero changes to existing slide rendering — purely additive metadata

---

## Files to Create or Modify

| File | Action | Description |
|---|---|---|
| `frontend/constants/templateContentSpecs.ts` | CREATE | Full `TemplateContentSpec[]` for all 23 aurora-* templates |
| `scripts/export_specs.cjs` | CREATE | Reads `templateContentSpecs.ts`, outputs `backend/configs/template_content_specs.json` |
| `backend/configs/template_content_specs.json` | CREATE (generated) | JSON copy of specs for Python to read |
| `backend/core/services/template_spec_service.py` | CREATE | `get_spec(template_id)` — reads the JSON file |
| `backend/apps/api/v1/content.py` | MODIFY | Add `GET /template-spec/<template_id>` endpoint |
| `backend/core/orchestrators/content/slide_generator.py` | MODIFY | Inject spec into generation prompt when template is known |
| `backend/core/prompts/templates/slide_generation.txt` | MODIFY | Add `{template_spec_block}` injection point |

---

## Template Specs — Full List

Below is the spec for each template. This IS the implementation — copy this into `templateContentSpecs.ts`.

### aurora-compact-clean family

**aurora-compact-hook**
- Hook: punchy opening, one bold idea
- textFields: headline (Inter Black 900, 88pt, max 40 chars, target 20–30), sub-label (Inter 400, 28pt, max 60)
- images: none
- contentTone: "Bold, direct, one idea per slide"
- exampleHeadline: "Stop learning. Start building."

**aurora-compact-fact**
- Stat showcase: one big number comparison
- textFields: baseline_stat (Inter 400, 90pt grey), featured_stat (Inter 700, 140pt coral), body_header (Inter 700, 34pt), body_copy (Inter 400, 22pt, max 120 chars), attribution (Inter 400 italic, 18pt)
- images: none
- contentTone: "Data-driven, contrast old vs new, surprising number"
- exampleHeadline: baseline="11%", featured="47%", header="Companies using AI saw a 47% lift in output"

**aurora-compact-clean-cta**
- CTA: follow / subscribe ask
- textFields: pill_text (Inter 700, 22pt, max 20 chars), headline (Inter Black 900, 92pt, max 40 chars), sub_text (Inter 400, 28pt, max 60 chars)
- images: none
- contentTone: "Direct ask, first-person, action-oriented"
- exampleHeadline: "Follow for weekly career insights."

**aurora-compact-clean-quote**
- Quote: attributed quote, Playfair serif
- textFields: quote_text (Playfair Bold Italic, 56pt, max 120 chars, target 60–90), attribution (Inter 400, 26pt, max 40 chars)
- images: none
- contentTone: "Memorable, short, quotable — attribute clearly"
- exampleHeadline: "The secret of getting ahead is getting started."

**aurora-compact-clean-engage**
- Engage: save/share ask
- textFields: headline (Inter Black 900, 88pt, max 40 chars), pill_text (Inter 700, 22pt, max 20), support_copy (Inter 400, 28pt, max 100)
- images: none
- contentTone: "Single action ask, benefit-first"
- exampleHeadline: "Save this. Share with someone who needs it."

### editorial family

**aurora-editorial-hook**
- Book-page hook: reflective, wisdom-style opening
- textFields: handle (Inter 300, 20pt, max 20), series_title (Playfair Italic, 20pt, max 30), headline (Playfair Bold Italic, 88pt, max 80 chars target 50–70), body (Inter 400, 30pt, max 100 chars), chapter (Inter 400, 24pt, max 8)
- images: none
- contentTone: "Reflective, wisdom, thought leadership — NOT clickbait"
- exampleHeadline: "The one idea that changed how I think about everything."

**aurora-editorial-cta**
- Journal-page CTA: closing ask, book-page style
- textFields: cta_headline (Playfair Bold Italic, 80pt, max 60 chars target 30–50), follow_text (Inter 400, 28pt, max 40)
- images: none
- contentTone: "Graceful, confident close — literary feel"
- exampleHeadline: "Follow along.\nMore every week."

### nextwork-dark family

**aurora-nextwork-dark-cta**
- Dark CTA: bold follow ask on dark bg
- textFields: pill_text (Inter 700, 20pt, max 20), headline (Inter Black 900, 96pt, max 40), sub_text (Inter 400, 28pt, max 80)
- images: none
- contentTone: "Confident, direct, dark-mode energy"
- exampleHeadline: "Follow for more."

**aurora-nextwork-dark-engage**
- Dark engage: save/share on dark bg
- textFields: headline (Inter Black 900, 88pt, max 40), pill_text (Inter 700, 20pt, max 20), support_copy (Inter 400, 28pt, max 100)
- images: none
- contentTone: "Single action, benefit-first, dark energy"
- exampleHeadline: "Save this."

### aurora-extended family

**aurora-hook**
- Dark glassmorphism hook
- textFields: label (Inter 700, 16pt, max 30 — category pill text), headline (Inter Black 900 gradient, 64pt, max 80 target 50)
- images: none
- contentTone: "Bold gradient energy, one clear idea"

**aurora-content-0** (and -1, -2, -3)
- Dark content: body text + optional image
- textFields: title (Inter 700, 40pt, max 60), body (Inter 400, 24pt, max 300 chars)
- images: 1 optional (any aspect, min 600px)
- contentTone: "Informative, medium density, not too short"

**aurora-stat**
- Dark stat: big number showcase
- textFields: stat_value (Inter Black 900, big, max 12 chars), stat_label (Inter 400, 28pt, max 60)
- images: none
- contentTone: "One shocking or impressive number"

**aurora-quote**
- Dark quote: insight + attribution
- textFields: quote_text (Inter Italic 400, 36pt, max 200), attribution (Inter 400, 22pt, max 60)
- images: none
- contentTone: "Insightful claim or wisdom, not too long"

**aurora-cta / aurora-engage**
- Dark CTA/engage: gradient pills, glassmorphism
- textFields: headline (Inter Black 700, 52pt, max 80), sub_text (Inter 400, 26pt, max 120)
- images: none

### cover-hero family

**aurora-carousel-cover-hero-phone**
- Cover with tilted phone
- textFields: display_headline (Inter Black 900, 140pt, max 40 chars), body_text (Inter 400, 32pt, max 100), italic_cta (Playfair Italic, 28pt, max 60)
- images: 1 required (9:16 portrait, min 800×1400) — fills phone screen
- contentTone: "Product/app showcase, high-impact visual"

**aurora-carousel-cover-hero-images**
- Cover with image pair
- textFields: display_headline (Inter Black 900, 140pt, max 40), body_text (Inter 400, 32pt, max 100)
- images: 2 optional (any aspect, min 400px — fill tilted slots)
- contentTone: "Photo-first, minimal copy"

---

## Done Criteria

- [ ] `frontend/constants/templateContentSpecs.ts` exports `TEMPLATE_CONTENT_SPECS: TemplateContentSpec[]`
- [ ] All 23 aurora-* templates have a spec entry
- [ ] `node scripts/export_specs.cjs` generates `backend/configs/template_content_specs.json` with no errors
- [ ] `curl localhost:8000/api/v1/content/template-spec/aurora-compact-clean-cta` returns the spec JSON
- [ ] `slide_generator.py` includes `template_spec_block` in the slide generation prompt when spec is available
- [ ] `npx tsc --noEmit` → 0 errors

---

## Known Constraints

- Python reads from the JSON file (not the TS) — the export script must be run after any spec change
- `targetChars` is guidance for the LLM, not enforced at render time — the renderer still wraps whatever content it receives
- Specs for `aurora-compact-step`, `aurora-compact-step-index`, `aurora-compact-step-detail` are complex (multiple sub-items with their own spec) — these use `compact_meta` with array fields; treat the whole `compact_meta` as one `textFields` entry for now, with a separate `stepItemSpec` sub-object
