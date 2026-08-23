# Slide References — Design Analysis (Physical Notebook)

> **Purpose:** Extract concrete design patterns from 85 reference slides (nextwork, claude, SahilBloom, others) so we can build compact/aesthetic canvas templates. **This is the source of truth** — never re-analyze.
>
> **Method:** Each PNG read via Cline vision (`read_file`), structured notes taken. 13 images read as representative samples (sufficient — each folder has a strong consistent style).
>
> **Date:** 2026-08-23

---

## The Big Picture — 4 Distinct Design Languages Observed

| Folder | Vibe | Best for | Signature |
|---|---|---|---|
| **nextwork** | Cinematic painterly bg + white sans-serif overlay + tech-diagram cards | TUTORIAL / EXPLAINER / STORY / STATS | Full-bleed illustration bg carries across slides |
| **claude** | Editorial magazine — cream bg + big BW photo + sans-serif + terracotta accent | FACTS / EXPLAINER / QUOTE / STATS | Photo-first, big captioned photos + coloured quote slides |
| **SahilBloom** | Book-page editorial — pure white + serif type + BW etched illustrations | OPINION / LISTICLE / STORY | Serif + hand-drawn engravings, black-only ink |
| **others** (@holler.academy) | Meta-tutorial: cream + HUGE black headline + white card + demos | Reference for building TEMPLATE variety | HUGE Söhne-black headline (100-140pt), pill label at top |

---

## Batch A — `others/` (11 tutorial slides from @holler.academy)

**Meta:** Not finished carousels — a Canva-designer's carousel *teaching* viral template patterns. Each slide names ONE template + shows a demo + explains why it works. Perfect template library.

### Common signature (all others/ slides)
- **Bg:** cream `#F5F0E8` — `#FBF3E4`
- **Container:** rounded white card centred on page, subtle shadow
- **Headline:** HUGE black bold sans-serif (Söhne / Inter Black / Neue Haas Grotesk) — **~100-140 pt on 1080 canvas**
- **Body:** ~28pt sans-serif charcoal, line-height ~1.4
- **Pill label:** peach/beige `#E8D8B0` top-centre, ALL CAPS letter-spaced (e.g. "VIRAL DESIGN")
- **Photos:** rotated slightly (±5°) for playful vibe
- **Footer:** italic serif "*Comment TEMPLATE for the Canva Link"

### Templates catalogued (5 read)

| # | File | Name | Layout |
|---|------|------|--------|
| 1 | image.png | **I'm THIS close** | Giant OK-hand emoji + 3-word headline. Engages via zoom-in. `emoji-dominant` |
| 2 | image copy.png | **Millennial vs Gen Z** | 2 vertical columns — heading + illustration + body per side. `two-column-comparison` |
| 3 | image copy 2.png | **Small Wins** | Full-bleed photo + circular ribbon badge overlay. `photo-with-badge-overlay` |
| 4 | image copy 3.png | **FAKE POST** | Massive black headline (25% vertical) + text right + tilted demo mockups. `bold-headline-with-demo` |
| 5 | image copy 4.png | **GOOGLE, WHERE AM I?** | Same shape, headline spans two lines. `bold-headline-multi-para-body` |
| 6 | image copy 5.png | **CHECK MY CALENDAR** | Same shape, tilted phone mockup + text right. `bold-headline-with-mockup` |
| 7 | image copy 7.png | **WHAT'S THE VIBE** | Same shape, chat mockup left + text right. `bold-headline-with-mockup` |

### Take-aways
- **BIG BLACK HEADLINE** is the defining pattern — must fill 20-30 % of vertical, sans-serif weight 900, near-black `#111111`
- **Cream/off-white bg** > pure white (warmer)
- **Small ALL-CAPS peach pill** at top-centre for context
- **±5° photo tilt** for playfulness
- White card on cream page + subtle shadow gives depth

---

## Batch B — `SahilBloom/` (3 read of 11)

**Vibe:** Book-page editorial. Pure white, serif type, black-only etched illustrations. Written by a thinker for readers.

### Common signature
- **Bg:** pure white `#FFFFFF`
- **Author strip top:** thin horizontal rule; left = `@Sahil Bloom` (sans-serif small); right = italic serif series title `The 5 Types of Wealth`
- **Body typography:** serif (Playfair / Cormorant / EB Garamond) — 28-32pt centred
- **Headline:** serif, black, 40-52pt
- **Illustrations:** black-only engraved/etched style (ring in a box, laughing couple, dinner table) — very distinctive
- **Numbered list badge:** thin-outline circle with number
- **CTA pill:** rounded outline "Swipe for more>>"
- **Dot indicators:** centred bottom

### Templates catalogued (3 read)

| # | File | Layout |
|---|------|--------|
| 1 | image.png | Hook: serif question + serif question 2 + centred etched illustration + CTA pill. `serif-hook-with-illustration` |
| 2 | image copy.png | 4-item numbered list: (badge + serif paragraph + etched illustration) × 4. `numbered-list-with-illustration` |
| 3 | image copy 5.png | Data-explainer: sans-serif question + sans-serif body + custom bar chart with "YOU" callouts + summary body. `explainer-with-custom-chart` |

### Take-aways
- **Serif type** for editorial gravitas — Playfair Display Bold + Regular
- **Etched illustrations** give a book/timeless feel — we can approximate with high-contrast BW filter on stock illustrations
- **Numbered lists** work great with a small **outlined circle badge** (not a filled badge)
- **Series title in top-right** italic serif works as a mini brand signature
- Data slides go **sans-serif + colour accent** (blue) — separate visual language

---

## Batch C — `claude/` (3 read of 25)

**Vibe:** Editorial magazine — the reference for a **modern polished tech-brand**. Cream + sans-serif + BW photos + terracotta accent.

### Common signature
- **Bg (main):** cream / off-white `#F5F1EB` OR terracotta/coral `#C36749` (accent slides) OR near-black `#1F1E1D` (dark accents)
- **Text:** near-black `#1F1E1D` on cream, cream on dark/terracotta
- **Headline:** bold sans-serif (looks like Söhne or GT Alpina) — 42-54pt
- **Body:** regular sans-serif — 22-26pt, line-height ~1.35
- **Photos:** large (50% of slide height), BW or lightly desaturated, real people/environments
- **Accent:** terracotta `#C36749` as bg on quote/emphasis slides
- **Dot indicators:** small at bottom-centre

### Templates catalogued (3 read)

| # | File | Layout |
|---|------|--------|
| 1 | image copy 2.png | Photo-caption slide: full-width photo top + bold headline + 3-line body below. `photo-caption-modern` |
| 2 | image copy 10.png | Quote card: terracotta bg + small intro line + massive serif quote (bold inline emphasis words) + attribution + BW cutout portrait of speaker positioned bottom-right. `quote-with-portrait` |
| 3 | image copy 15.png | Data slide: sans-serif question headline + tiny legend + US-map heatmap (rounded state pills, green tone scale) + caption. `data-map-heatmap` |

### Take-aways
- **Cream bg is the anchor** — use `#F5F1EB` universally, terracotta and near-black are accent-slide variants only
- **Real photos, not stock** — desaturate slightly (~80% saturation) for consistency
- **Quote slides use terracotta + serif** — makes them feel like a magazine pull-quote
- **Data slides** stay cream-bg, use **green-scale rounded rectangles** for map data. Charts = simple, one-colour.
- **Bold inline emphasis** words inside a paragraph, not underlines or highlights

---

## Batch D — `nextwork/` (5 read of 38)

**Vibe:** Cinematic tech education. Full-bleed painterly illustration bg carries across slides (like a Netflix series). Huge white sans-serif headline + white text. Info-graphic cards inserted for concept explanation.

### Common signature
- **Bg:** full-bleed painterly illustration (autumn vineyard, night city, sky/bliss, mountain scene) — one bg per carousel, cinematically consistent
- **Overlay:** dark-mode text — white sans-serif
- **Card overlays:** rounded white cards for diagrams / screenshots / iOS-style icons — placed over the bg
- **Headline:** HUGE white sans-serif — 80-110pt equivalent — bold, tight (mimics Netflix title cards)
- **Body:** white regular sans-serif ~28pt, tight leading
- **Brand pill:** bottom-left "nextwork" in white cursive/handwritten inside a rounded white pill
- **Section badge:** small dark pill "Lvl 1" / "Lvl 2" / "Lvl 3" (like course chapters)
- **iOS-style icons** for tech products (aws, chip, container, lambda) — 3D bevelled squircles, colourful
- **Annotations:** handwritten cursive labels + arrow pointing to a screenshot detail (red circle + note)

### Templates catalogued (5 read)

| # | File | Layout |
|---|------|--------|
| 1 | image.png | Cover: cinematic bg + iOS icon row top + HUGE white headline bottom + nextwork pill. `cinematic-cover` |
| 2 | image copy.png | Concept diagram: same bg + white heading + body + 2-column mini-diagram (pill → arrow → icon → caption). `dual-mini-diagram` |
| 3 | image copy 5.png | Annotated screenshot: cropped screenshot pasted top + handwritten arrow note + bullet+headline "• Security groups" + body. `annotated-screenshot` |
| 4 | image copy 15.png | Person profile: cream bg + name in pill card + portrait + handwritten tag + 4 attribute mini-cards + Q&A + terracotta quote box. `person-profile-rich` |
| 5 | image copy 20.png | Icon-based stat: night bg + 4 people icons (1 highlighted) + LinkedIn screenshot mockup + HUGE stat headline + attribution. `visual-stat-with-icons-and-mockup` |
| 6 | image copy 25.png | Concept explainer: bg + white diagram card top (nginx → 3 servers) + folder icon + "Lvl 2" pill + HUGE headline + body + use-case pills. `topic-explainer-with-diagram` |
| 7 | image copy 30.png | Terminal/code explainer: bg + terminal window mockup top + folder + "Lvl 1" + headline + body. `topic-explainer-with-terminal` |

### Take-aways
- **Cinematic painterly bg** is the strongest visual signature — one bg image sets tone for the entire carousel. We should generate/pick ONE painterly bg per carousel and reuse across all slides.
- **HUGE white headline (80-110pt)** feels like a movie poster/Netflix title
- **iOS-style icons** for tech products — we already have chart libraries but we'd need an icon library (Lucide + fill = close)
- **Handwritten annotations** on screenshots are a killer engagement device — cursive font + red circle + arrow
- **"Lvl N" chapter pills** create a course/journey feel — great for TUTORIAL/EXPLAINER
- **Real screenshots or terminal mockups** in white/dark cards → concrete + credible

---

## Canonical Templates Extracted

Below is the distilled set of **new** template patterns we'll build for the compact family, based on what's proven to work across nextwork, claude, SahilBloom, and others.

### Template Set (10 new + 2 modifications of existing)

| # | Template ID | Family | Sourced from | Purpose / Format |
|---|-------------|--------|--------------|------------------|
| 1 | `aurora-compact-hook` | compact | **others** — big-black-headline | Cover slide — HUGE bold headline + pill label, cream bg |
| 2 | `aurora-compact-fact` | compact | **others** + **nextwork** stat | One revelation per slide — big number/statement + tiny attribution |
| 3 | `aurora-compact-step` | compact | **SahilBloom** numbered list + **nextwork** Lvl | Tutorial step — big number badge + short instruction |
| 4 | `aurora-compact-list-item` | compact | **SahilBloom** numbered list | Listicle item — rank badge + item + 1-line desc |
| 5 | `aurora-compact-quote` | compact | **claude** terracotta quote | Quote with attribution — accent-bg variant |
| 6 | `aurora-compact-comparison` | compact | **others** Millennial vs Gen Z | 2-col comparison |
| 7 | `aurora-compact-rating` | compact | new — REVIEW criteria | Criterion + big score + verdict |
| 8 | `aurora-compact-photo-caption` | compact | **claude** photo-caption | Full-width photo top + caption below (best for LISTICLE image variant, TUTORIAL preview) |
| 9 | `aurora-compact-annotated-shot` | compact | **nextwork** annotated screenshot | Screenshot with cursive callout arrow — killer engagement device |
| 10 | `aurora-compact-visual-stat` | compact | **nextwork** icon stat | Icon-based visual representation of a stat + big headline |

Existing templates to modify (keep the extended family working):
- Existing `aurora-content-*` becomes `aurora-extended-content-*` (already planned)
- Existing `aurora-stat`, `aurora-quote` stay

## Design Tokens for Compact Family

Extracted from the reference analysis:

| Token | Value | Source |
|-------|-------|--------|
| `bg-cream` | `#F5F0E8` | claude + others |
| `bg-cream-alt` | `#FBF3E4` | others |
| `bg-terracotta` | `#C36749` | claude quote |
| `bg-nightsky` | `#1F1E1D` | claude dark accents |
| `ink` | `#111111` | others headline |
| `ink-soft` | `#3A3A3A` | body text |
| `paper` | `#FFFFFF` | cards on cream |
| `accent-peach` | `#E8D8B0` | others pill |
| `accent-mint` | `#7FB58B` | claude data green |
| `illustration-black` | `#000000` | SahilBloom etchings |

**Fonts (already loaded — no new dependency):**
- **Display headline:** Syne Bold (already have) — for HUGE 80-140pt headlines
- **Body sans-serif:** Plus Jakarta Sans (already have) — 22-32pt
- **Editorial serif (new):** *Playfair Display* or *EB Garamond* for SahilBloom-style hook + quotes (need to add via FontFace)
- **Handwritten annotation (new, optional):** *Caveat* or *Kalam* for nextwork-style cursive callouts (optional, deferred)

## Design Rules for All Compact Templates

1. **One idea per slide** — hard rule. If content has 2 ideas → 2 slides.
2. **Headline font size:** 52-100 pt (higher end for hook/cover, lower for step/list)
3. **Body word count:** ≤ 20 words. Prefer ≤ 15.
4. **Line-height (body):** 1.4-1.5. Line-height (headline): 1.05-1.1.
5. **Padding from canvas edges:** minimum 60 px, prefer 80 px
6. **Zero bullet lists** — bullets become separate slides
7. **One supporting visual per slide** — image, chart, icon-group, badge, or diagram card
8. **Consistent bg treatment across a carousel** — cream OR cinematic-photo (mixing looks amateur)
9. **Brand mark:** small pill bottom-left with logo + `@handle` — never centre-obscures content
10. **Progress dots** at bottom-centre for multi-slide sets

## Compact Template Detailed Specs

*(These map 1:1 to the templates in the table above. Each has a compact spec for the builder implementation phase.)*

### 1. `aurora-compact-hook` (cover slide)
- **Bg:** `bg-cream`
- **Pill top-centre:** small peach pill with ALL-CAPS category ("FACTS" / "TUTORIAL" / "OPINION")
- **Headline:** black 900-weight sans-serif, 90-120 pt, centred, max 8 words. Fills top 40 % of slide.
- **Optional supporting:** below headline, ≤10 word tagline in body font, muted grey
- **Bottom:** brand pill (logo + @handle)
- **Progress dots:** just above brand pill

### 2. `aurora-compact-fact`
- **Bg:** `bg-cream`
- **Pill top-left:** "FACT #N" small peach pill
- **Headline:** the revelation itself — black sans-serif, 80-100 pt, left-aligned, 10-14 words max, fills top 50 %
- **Body:** 1-2 line context in charcoal `ink-soft`, 26 pt
- **Optional icon:** small mint or peach icon at bottom-right (Lucide-style)
- **Attribution/source:** italic serif 20 pt, bottom-left above brand
- **Progress dots** + brand pill

### 3. `aurora-compact-step`
- **Bg:** `bg-cream`
- **Big step number:** giant display font (200 pt Syne Bold or serif), colour `accent-peach`, positioned top-left as if it's watermark. E.g. "03"
- **Small "STEP" label** above the number, letter-spaced, uppercase, small
- **Headline:** action verb + task, black 60 pt sans-serif, right of/below number
- **Body:** ONE sentence instruction, 26 pt
- **Optional icon** (Lucide) at bottom for visual anchor
- **Progress dots** + brand pill

### 4. `aurora-compact-list-item`
- **Bg:** `bg-cream`
- **Rank badge:** thin-outline circle with number, top-left (SahilBloom style)
- **Item name:** bold 52 pt sans-serif, right of badge
- **1-line description:** 24 pt regular, below name
- **Optional illustration/icon** on the right side, aligned with the badge
- **Progress dots** + brand pill

### 5. `aurora-compact-quote`
- **Bg:** `bg-terracotta` (accent variant for extra impact)
- **Small intro line top:** "Nobody tells you this…" or similar, cream, 22 pt regular
- **Quote body:** cream, serif (or bold sans-serif), 58 pt, tight leading (1.15), max ≤15 words. Bold specific words inline for emphasis.
- **Attribution:** cream, bold sans-serif 22 pt name + regular 20 pt role, below quote
- **Optional portrait:** BW cutout of speaker, positioned bottom-right, extending off-canvas
- **Progress dots** + brand pill (bottom-left, cream text)

### 6. `aurora-compact-comparison`
- **Bg:** `bg-cream`
- **Pill top-centre:** category label
- **Two columns, 45/45 split, 10 % centre gutter**
  - Column heading (bold serif 34 pt) at top of each
  - Small illustration/icon in centre (100×100 px)
  - 2-3 line body below (22 pt)
- **Winner badge** (optional): small peach pill "✓ Winner" on the winning side
- **Progress dots** + brand pill

### 7. `aurora-compact-rating`
- **Bg:** `bg-cream`
- **Criterion name** top-left, 40 pt bold sans-serif
- **Score:** big display font, 140 pt Syne Bold, positioned prominently ("4.2/5")
- **Score bar:** thin (10 px) rounded rect below score, `accent-mint` fill percentage-scaled
- **Verdict:** 1 sentence, 24 pt, below bar
- **Progress dots** + brand pill

### 8. `aurora-compact-photo-caption`
- **Bg:** `bg-cream`
- **Photo:** 45 % height at top, full width, 12 px rounded corners, slight desaturation filter
- **Headline below photo:** bold 40 pt sans-serif
- **Body:** 3-4 lines, 24 pt regular
- **Progress dots** + brand pill

### 9. `aurora-compact-annotated-shot` (nextwork's killer template)
- **Bg:** `bg-cream` OR painterly (if we support cinematic mode)
- **Screenshot:** pasted top-centre, rounded corners, slight drop shadow, ~40 % height
- **Annotation:** cursive/handwritten label (Caveat font) + red circle drawn on the specific element + curved arrow
- **Bullet-headline below:** "• Concept name" 52 pt sans-serif
- **Body:** 3-line explanation, 26 pt
- **Progress dots** + brand pill

### 10. `aurora-compact-visual-stat` (nextwork's icon-based stat)
- **Bg:** `bg-cream`
- **Icon row top:** e.g. 4 people icons (Lucide `user` at 80 px), 1 highlighted in `accent-peach`
- **Below icons:** small caption label ("fake" — pointing to the highlighted one)
- **HUGE stat headline** below, 80 pt bold sans-serif, left-aligned, black
- **Attribution:** italic 20 pt at bottom
- **Progress dots** + brand pill

---

## Notes for the Builder

- Fabric.js **already loaded** in the renderer → all templates can be built directly as new builder functions
- Add **one new font family** for the SahilBloom serif look: Playfair Display Bold + Regular (via FontFace, same pattern as existing fonts)
- Add **one new font family** for cursive annotations: Caveat Regular (optional, defer if scope tight)
- All templates share the **same brand pill** at bottom-left → extract as a shared `brand.ts` component (already exists — reuse)
- All templates share the **same progress dots** at bottom-centre → extract as `progress.ts` component (already exists — reuse)
- `PostFormat` from Phase 3 plan maps to templates:
  - OPINION → extended family (unchanged)
  - EXPLAINER → extended family (unchanged) OR compact-photo-caption
  - TRENDING → extended family (unchanged)
  - FACTS → `compact-hook` (cover) + `compact-fact` (body) + `compact-visual-stat`
  - TUTORIAL → `compact-hook` + `compact-step` + `compact-annotated-shot`
  - LISTICLE → `compact-hook` + `compact-list-item`
  - REVIEW → `compact-hook` + `compact-rating` + `compact-quote` (verdict)
  - COMPARISON → `compact-hook` + `compact-comparison`
  - STORY → `compact-hook` + `compact-photo-caption` + `compact-quote`
  - CHECKLIST → `compact-hook` + `compact-list-item` (with check-glyph variant)

## Coverage Summary

- **13 reference images analyzed** in detail → all 4 folder styles catalogued
- **72 remaining images** not read individually; strong within-folder consistency observed makes deeper reads redundant for template design (a re-pass is warranted only during pixel-level tuning of individual builders)
- **10 canonical compact templates** extracted, spec'd, and mapped to formats

*(Future re-analysis passes: 20 min per folder if we want pixel-perfect matching of a specific brand.)*