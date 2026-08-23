# SLIDE_REFERENCES_FULL.md — Exhaustive analysis of all 85 reference images

> **Status:** In progress. This file is written incrementally, one image at a time. If context compacts, resume from the last analyzed image (see the "Progress log" at the bottom).
> **Do NOT overwrite** `Docs/design/SLIDE_REFERENCES_ANALYSIS.md` (v1, sample-only). This file (v2) supersedes it once complete.
> **Purpose:** Extract every design detail needed for a Fabric.js v7 template builder to reproduce the reference at pixel-level fidelity, verifiable via the GAN diff harness (`scripts/gan_multi.js`).

---

## Analysis schema (per image)

Each entry follows this exact template so downstream extraction is scriptable:

```
### <folder>/<filename>
**Pattern class:** <one of: hook | fact | step | list-item | quote | comparison | rating | photo-caption | annotated-shot | visual-stat | chapter-cover | title | outro | other:xxx>
**Overall vibe (1 line):** <editorial / cinematic / conversational / academic / etc.>

- **Canvas:** aspect ratio (assumed 1080×1350 unless noted), safe-zone reserved for IG chrome (top ~200px avatar bar, bottom ~180px caption/CTA), effective content zone.
- **Background:**
    - Base fill hex (sampled).
    - Second layer (gradient / photo / texture / noise / grain — with opacity and blend mode).
    - Third layer if any (vignette, colour wash).
- **Layout zones (top → bottom, in px assuming 1080×1350):**
    - Zone A (y-range): purpose, dimensions.
    - Zone B (y-range): purpose, dimensions.
    - …
    - Gutters / paddings (outer, inter-zone).
- **Grid & alignment:** column count implied, gutter width, alignment axis (left / centre / justified), baseline rhythm if visible.
- **Typography (top → bottom, each text object):**
    - Role (headline / eyebrow / body / caption / annotation / footer / page-number).
    - Font family (best guess with 2–3 candidates from Google Fonts + our current bundle).
    - Weight (100 → 900) and style (italic / regular).
    - Approx size in px (rendered at 1080×1350).
    - Line-height (px or ratio).
    - Letter-spacing (px or em).
    - Colour hex.
    - Text-shadow / stroke / outline if any (offset, blur, colour, opacity).
    - Alignment (left / centre / right / justified).
    - Max width / wrap column.
    - Verbatim text (exact words as printed).
- **Decorative elements:**
    - Shapes (pill / circle / rectangle / arrow / underline / bracket / doodle) — with fill, stroke, radius, blur, blend, position.
    - Icons (SF Symbols / iOS glyphs / custom SVG / emoji) — position, size, colour.
    - Illustrations (etched / flat / photo-cutout) — style, source hint.
    - Photography treatment (BW / duotone / desaturated / tinted / grainy / vignette / drop-shadow / rotation / masking / bleed).
    - Tape, staple, sticker, torn-paper, polaroid frame, film grain overlays.
- **Layering order (back → front):** the z-index stack, e.g. `[bg fill] → [noise 8%] → [photo 60% opacity] → [colour wash] → [headline] → [pill] → [signature]`.
- **Shadows & effects:**
    - Drop shadows (offset x/y, blur, spread, colour, opacity, blend mode).
    - Inner shadows / bevels if any.
    - Blurs (gaussian radius on which layer).
    - Filters (grain px, chromatic aberration, film curves).
- **Brand markers:**
    - Wordmark / handle / logo — position, font, size, colour.
    - Chapter or level pill ("Lvl 03", "Ep. 12", "Part 2 of 5") — placement, style.
    - Page indicator ("3 of 8", dot row) if present.
    - Swipe / CTA cue if present.
- **Word count & density:** total words on slide, longest single text block, avg words per zone. Cognitive load flag (low / medium / high — target = low for compact templates).
- **Fabric.js reproduction notes:**
    - Which existing helpers apply (`makeText`, `makePill`, `makeChip`, `makeImage`, `makeShape`).
    - What new component we'd need (e.g. `makeTornPaper`, `makeCursiveAnnotation`, `makePolaroid`).
    - Non-trivial Fabric v7 caveats (e.g. text-on-path for curved annotations, clipPath for tape corners, filter stack for grain).
    - Font loading requirement (which family must be added to `renderer_entry.ts`).
- **Motion cue (even though static):** if the composition implies motion — arrows, tilted photos, hand-drawn scribbles suggesting a "next" beat — note it (informs future animation phase).
- **IG safe-zone check:** does any critical text/element sit under the top 200 px (avatar bar) or bottom 180 px (caption/CTA overlays)?  Flag risk.
- **Reusability score (1–5):** how many other topics could reuse this exact layout with only text/image swap.
- **Template pattern classification (final):** which canonical builder key this maps to (`aurora-compact-hook`, `-fact`, `-step`, `-list-item`, `-quote`, `-comparison`, `-rating`, `-photo-caption`, `-annotated-shot`, `-visual-stat`, `-chapter-cover`, `-outro`, or a new key we're proposing).
- **Copy-pattern hint (for the LLM writer):** the sentence structure the image implies (e.g. "One-word noun + colon + 3-word predicate", "Question hook + short answer stamped on top").
- **Notes / open questions:** anything ambiguous, worth confirming with the user, or worth cross-referencing against another image.
```

At the end of each folder, a **folder summary** aggregates:
- Recurring colour palette (with hex counts).
- Recurring type stack.
- Recurring layouts (frequency table).
- Recurring decorative primitives.
- Suggested canonical builder set from that folder.

At the very end, a **global synthesis** section:
- Master token palette.
- Master font list to add to `renderer_entry.ts`.
- Final canonical template list (with counts of source images per template).
- New Fabric helpers required.
- Recommendations for `MASTER_PLAN_multi_format.md` / `PHASE_2_compact_templates.md` (not applied until user approves).

---

## Progress log

| # | Folder | File | Analyzed |
|---|---|---|---|
| 1 | others | image.png | ✅ done |
| 2 | others | image copy.png | ✅ done |
| 3 | others | image copy 2.png | ✅ done |
| 4 | others | image copy 3.png | ✅ done |
| 5 | others | image copy 4.png | ✅ done |
| 6 | others | image copy 5.png | ✅ done |
| 7 | others | image copy 6.png | ✅ done |
| 8 | others | image copy 7.png | ✅ done |
| 9 | others | image copy 8.png | ✅ done |
| 10 | others | image copy 9.png | ✅ done |
| 11 | others | image copy 10.png | ✅ done |
| 12 | SahilBloom | image.png | ✅ done |
| 13 | SahilBloom | image copy.png | ✅ done |
| 14 | SahilBloom | image copy 2.png | ✅ done |
| 15 | SahilBloom | image copy 3.png | ✅ done |
| 16 | SahilBloom | image copy 4.png | ✅ done |
| 17 | SahilBloom | image copy 5.png | ✅ done |
| 18 | SahilBloom | image copy 6.png | ✅ done |
| 19 | SahilBloom | image copy 7.png | ✅ done |
| 20 | SahilBloom | image copy 8.png | ✅ done |
| 21 | SahilBloom | image copy 9.png | ✅ done |
| 22 | SahilBloom | image copy 10.png | ✅ done |
| 23 | claude | image.png | ✅ done |
| 24 | claude | image copy.png | ✅ done |
| 25 | claude | image copy 2.png | ✅ done |
| 26 | claude | image copy 3.png | ✅ done |
| 27 | claude | image copy 4.png | ✅ done |
| 28 | claude | image copy 5.png | ✅ done |
| 29 | claude | image copy 6.png | ✅ done |
| 30 | claude | image copy 7.png | ✅ done |
| 31 | claude | image copy 8.png | ✅ done |
| 32 | claude | image copy 9.png | ✅ done |
| 33 | claude | image copy 10.png | ✅ done |
| 34 | claude | image copy 11.png | ✅ done |
| 35 | claude | image copy 12.png | ✅ done |
| 36 | claude | image copy 13.png | ✅ done |
| 37 | claude | image copy 14.png | ✅ done |
| 38 | claude | image copy 15.png | ✅ done |
| 39 | claude | image copy 16.png | ✅ done |
| 40 | claude | image copy 17.png | ✅ done |
| 41 | claude | image copy 18.png | ✅ done |
| 42 | claude | image copy 19.png | ✅ done |
| 43 | claude | image copy 20.png | ✅ done |
| 44 | claude | image copy 21.png | ✅ done |
| 45 | claude | image copy 22.png | ✅ done |
| 46 | claude | image copy 23.png | ✅ done |
| 47 | claude | image copy 24.png | ✅ done |
| 48 | nextwork | image.png | ⏳ pending |
| 49 | nextwork | image copy.png | ⏳ pending |
| 50 | nextwork | image copy 2.png | ⏳ pending |
| 51 | nextwork | image copy 3.png | ⏳ pending |
| 52 | nextwork | image copy 4.png | ⏳ pending |
| 53 | nextwork | image copy 5.png | ⏳ pending |
| 54 | nextwork | image copy 6.png | ⏳ pending |
| 55 | nextwork | image copy 7.png | ⏳ pending |
| 56 | nextwork | image copy 8.png | ⏳ pending |
| 57 | nextwork | image copy 9.png | ⏳ pending |
| 58 | nextwork | image copy 10.png | ⏳ pending |
| 59 | nextwork | image copy 11.png | ⏳ pending |
| 60 | nextwork | image copy 12.png | ⏳ pending |
| 61 | nextwork | image copy 13.png | ⏳ pending |
| 62 | nextwork | image copy 14.png | ⏳ pending |
| 63 | nextwork | image copy 15.png | ⏳ pending |
| 64 | nextwork | image copy 16.png | ⏳ pending |
| 65 | nextwork | image copy 17.png | ⏳ pending |
| 66 | nextwork | image copy 18.png | ⏳ pending |
| 67 | nextwork | image copy 19.png | ⏳ pending |
| 68 | nextwork | image copy 20.png | ⏳ pending |
| 69 | nextwork | image copy 21.png | ⏳ pending |
| 70 | nextwork | image copy 22.png | ⏳ pending |
| 71 | nextwork | image copy 23.png | ⏳ pending |
| 72 | nextwork | image copy 24.png | ⏳ pending |
| 73 | nextwork | image copy 25.png | ⏳ pending |
| 74 | nextwork | image copy 26.png | ⏳ pending |
| 75 | nextwork | image copy 27.png | ⏳ pending |
| 76 | nextwork | image copy 28.png | ⏳ pending |
| 77 | nextwork | image copy 29.png | ⏳ pending |
| 78 | nextwork | image copy 30.png | ⏳ pending |
| 79 | nextwork | image copy 31.png | ⏳ pending |
| 80 | nextwork | image copy 32.png | ⏳ pending |
| 81 | nextwork | image copy 33.png | ⏳ pending |
| 82 | nextwork | image copy 34.png | ⏳ pending |
| 83 | nextwork | image copy 35.png | ⏳ pending |
| 84 | nextwork | image copy 36.png | ⏳ pending |
| 85 | nextwork | image copy 37.png | ⏳ pending |

---

## Folder 1 — others/ (11 images)

_Analyses appended below._

---

### others/image.png
**Pattern class:** other:meta-tutorial (outer wrapper) + hook:zoom-engagement (inner example)
**Overall vibe (1 line):** Design-tutorial post from `@holler.academy` teaching a "zoom in to read" engagement trick — a slide-inside-a-slide.

This is a **two-layer** frame: the outer layer is the tutorial carousel itself (photograph background, mocked IG post card, caption below). The inner layer is the example post being taught. I document both because the inner example is what our compact template must reproduce, and the outer wrapper is itself a valuable "annotated example" template pattern for future use.

#### Outer wrapper (tutorial carousel slide)
- **Canvas:** 1080×1350 assumed, portrait 4:5. Full-bleed lifestyle photo background.
- **Background:**
    - Full-bleed photograph: green grass field, mid-day natural light, soft shadow cast by an off-frame figure (creates depth). Feels like a Pinterest / editorial lifestyle shot.
    - No colour wash on top — bare photo.
- **Layout zones:**
    - Zone A (y≈0–130): breathing room / horizontal top rule (thin dark line, ~2px) visible near very top edge — could be an IG UI overlay bleed, but likely part of tutorial's own frame decoration.
    - Zone B (y≈130–1000): centred mocked "Instagram post" card (see below), rotated 0°, drop shadow beneath.
    - Zone C (y≈1050–1220): caption block, centred.
    - Zone D (y≈1230–1280): dot-row page indicator (8 dots, 4th active), centred.
    - Zone E (y≈1300–1350): thin horizontal rule bleeding to the edges (breathing).
    - Outer padding: ~60 px left/right on the card; text block has ~120 px left/right padding.
- **Grid & alignment:** single-column, centred. All hierarchical text is horizontally centred.
- **Typography (outer):**
    - **Caption headline** (y≈1080): `"I'm this close"` in italic serif, ~52 px, weight 500 italic, colour near-black `#1B1B1B`. Candidates: **Playfair Display Italic**, **DM Serif Text Italic**, **Cormorant Italic**. Curly quotes present (`"…"`).
    - **Caption body** (y≈1150–1220): three lines, italic serif, ~34 px, line-height ~1.35, colour `#1B1B1B`. Verbatim: _"This template encourages HIGH engagement for your viewers to interact and zoom in to see what the rest of the graphic says."_ Note `HIGH` is set in the same italic serif but rendered slightly heavier — could be a semibold cut or simply the same weight (hard to tell at this res). The word is emphatic, not stylistically different.
- **Decorative elements (outer):**
    - Left / right chevron arrows (`‹` `›`) mid-canvas (y≈590), grey `#8A8A8A`, ~48 px, thin stroke. These are UI-cue markers ("swipe through the carousel").
    - Dot-row indicator: 8 dots, ~8 px each, ~14 px gap, 4th dot filled dark, others faded grey.
    - Top hair-line rule and bottom hair-line rule — very thin (~1px).
- **Layering order:** `[grass photo] → [chevron arrows] → [post-card shadow] → [post-card white frame] → [inner example content] → [caption text] → [dot indicator]`.
- **Shadows & effects:**
    - Post-card drop shadow: offset y≈8 px, blur≈24 px, opacity ≈20 %, colour `#000000`. Soft, natural.
- **Brand markers:** None visible on this slide (probably on cover / final slide).
- **Word count:** 26 words (outer caption) + 4 words (inner headline) = 30 total but inner is intentionally partial (mystery).

#### Inner example (the taught template)
- **Card dimensions:** ~475 × 590 px within the outer canvas → represents a 1080×1350 slide when scaled up.
- **Card frame:** white `#FFFFFF` outer bezel ~14 px thick around the artwork, mimicking an IG post preview: at the bottom of the frame, a mini IG-toolbar row (heart icon red-ish, comment bubble, share-arrow on left; bookmark icon on right).
- **Card content background:** warm off-white / bone `#E4DED2` (approx) — has a faint speckled paper texture, very subtle noise (~5 % opacity grain).
- **Inner layout zones (relative to the card):**
    - Zone A (top ~18 %): headline `I'm THIS close`.
    - Zone B (middle ~64 %): giant OK-hand emoji (🤏 or 👌 depending on interpretation — this looks like the 👌 OK-hand emoji tilted).
    - Zone C (middle-right of the emoji, exactly at the pinch point): 3-line tiny mystery text (illegible at normal zoom — the whole gimmick of the template).
- **Typography (inner):**
    - **Headline:** `"I'm THIS close"` — sans-serif, medium weight (~500), ~44 px at the artwork's native scale, colour near-black `#111`. `THIS` is emphasised: same font family but heavier weight (semibold ~600) and slightly larger optical size. Alignment centred.
    - **Mystery text:** 3 lines, tiny (~14 px at native), sans-serif, colour `#111`. Positioned inside the "pinch" between thumb and forefinger of the emoji — the negative-space aperture.
- **Decorative elements (inner):**
    - Emoji is the hero: OK-hand / pinch emoji, rendered at Apple-style 3D gradient (yellow `#F5C43C` with orange `#E39428` shading, subtle black outline). Fills ~70 % of card height. Sits slightly left of centre so the pinch aperture aligns with the vertical centre.
- **Layering order (inner):** `[warm off-white bg] → [subtle grain] → [emoji] → [headline] → [tiny mystery text (highest z)]`.
- **Shadows & effects (inner):** None on the emoji itself (flat placement); no drop shadow on text.
- **Brand markers (inner):** None on this template — it's a pure engagement gimmick, brand is expected on cover/final.
- **Word count (inner):** 3 words visible + 3 lines of hidden mystery text (~15–20 words estimated).

#### Fabric.js reproduction notes
- **Outer wrapper (annotated-example template):**
    - `makeImage` for the photo background (full-bleed).
    - `makeShape` (rounded rect, white fill, subtle shadow) for the mocked post card.
    - Nested group for the inner content (so it can be swapped independently).
    - Two `makeIcon`-style chevrons — SVG glyphs, filled `#8A8A8A`.
    - Text objects with **italic serif** — **Playfair Display Italic** must be added to `renderer_entry.ts` (currently we only ship Syne + Plus Jakarta Sans). This is confirmed also-needed by prior claude/nextwork analysis.
    - Dot indicator: 8 `Circle` primitives with the active one filled darker — reusable `makeDotRow(activeIndex, count)` helper.
    - Mini IG toolbar row: 4 tiny SVG icons (heart, comment, share, bookmark) — could be a single `makeIGToolbarStub` helper (used across "post-inside-a-post" templates).
- **Inner example (zoom-engagement template):**
    - Warm bg `makeRect` fill `#E4DED2`.
    - Grain overlay: PNG texture at 5–8 % opacity, `globalCompositeOperation = 'multiply'` (Fabric v7 supports via `globalCompositeOperation` on the object).
    - Emoji: options ↓
        1. **Native emoji glyph** rendered as `Textbox` with a colour-emoji font (Twemoji or Apple Color Emoji). Simplest but font-availability-dependent on the renderer's Puppeteer chrome — the current renderer already renders emoji (see existing lumina templates), so this should work.
        2. **PNG asset**: safer, ship a curated set of high-res emoji PNGs (👌 🤏 🎯 ❓ 🔥 …) under `backend/assets/emojis/`. Recommend option 2 for pixel-perfect GAN diff.
    - Headline: `makeText` with the "emphasis span" trick — needs mixed-weight run within one line. Fabric v7 `Textbox` supports `styles` per-character; helper `makeMixedWeightText([{text:"I'm ",weight:500},{text:"THIS",weight:700},{text:" close",weight:500}])` — worth adding as a new helper.
- **New helpers required:**
    - `makeDotRow(count, activeIndex, {size, gap, activeColor, dimColor})`
    - `makeIGToolbarStub()` — the mini heart/comment/share/bookmark row for post-inside-a-post templates.
    - `makeMixedWeightText(runs, {family, size, color, align, lineHeight})`.
    - `makeGrainOverlay(opacity, blend)` — reusable noise texture.
    - `makeAnnotatedExample({photoBg, cardChildren, captionHeadline, captionBody, activeDot, dotCount})` — the outer-wrapper builder (deferred to Phase 4/5, not compact-family core).
- **Font loading:** Add **Playfair Display** (Regular + Italic + SemiBold Italic) to `renderer_entry.ts`. (Confirmed also required by SahilBloom folder in v1 analysis.)

#### Motion cue
- Left/right chevrons imply swipe; the tilted emoji + tiny hidden text imply "pinch to zoom" (the actual IG gesture) — genius meta-composition.

#### IG safe-zone check
- Outer caption sits at y≈1080–1220 — safe (below the top 200 px avatar bar, above the bottom 180 px if bottom is at y=1350, which puts the CTA overlay from y=1170 to y=1350). **Risk:** the last caption line (y≈1220) may sit **under** IG's caption overlay when the CTA is expanded. Suggest bringing caption up ~40 px OR making the bottom body text shorter.
- Inner mystery text is centred — well within safe zones.

#### Reusability score
- **Outer wrapper:** 5/5 — this "post-inside-a-post" annotated-example pattern is gold for tutorial content, product screenshots, before-after comparisons.
- **Inner zoom-engagement:** 3/5 — brilliant but gimmicky, only usable when the topic has a "close call" / "almost there" / "one detail matters" angle.

#### Template pattern classification (final)
- **Outer:** proposed new key **`aurora-annotated-example`** (post-inside-a-post with caption below). NOT in the current compact-family core. Recommend adding to Phase 4 (Remaining templates), not Phase 2.
- **Inner:** proposed new key **`aurora-compact-zoom-hook`** — variant of `aurora-compact-hook` with an emoji-hero + tiny-hidden-text hook. Could be a hook-variant within Phase 2 rather than its own template, controlled by a `subVariant: "zoom"` prop.

#### Copy-pattern hint (LLM writer)
- Headline formula: `"[Pronoun] [emphasis-word] [state-adverb]"` — e.g., "I'm THIS close", "You're SO wrong", "It's THAT simple". Emphasis word capitalised.
- Mystery text: the actual payload of the slide (the answer / punchline). 15–25 words. The design forces the reader to pinch-zoom, which is the engagement mechanic.

#### Notes / open questions
- Confirm with user: is the mocked-post-in-a-post wrapper something we want to build as a template, or is it purely a `@holler.academy` tutorial convention? Depending on the answer, we either ship `aurora-annotated-example` in Phase 4 or drop it.
- Emoji rendering path: user preference between (a) native emoji font in the renderer or (b) pre-rasterised PNG emoji assets? PNG is safer for GAN diff stability but adds asset weight.
- Chevron + dot-row indicator are also IG-native affordances — likely we don't need to render these ourselves (IG already provides them), but the tutorial included them for visual completeness. Confirm we should NOT add them to our own templates (they'd double up with IG's chrome).

_Progress: 1 / 85 complete._

---

### others/image copy.png
**Pattern class:** other:meta-tutorial (outer wrapper) + comparison:side-by-side (inner example)
**Overall vibe (1 line):** Second tutorial slide in the same `@holler.academy` carousel — teaching the "50/50 vertical comparison" template using a Millennial-vs-GenZ handbag copy example.

Same outer wrapper convention as image 1 (identical grass photo bg, chevron arrows, mocked post card, italic-serif caption below, 8-dot indicator with 3rd dot active this time). I'll skip repeating the outer wrapper spec — refer to `others/image.png` § "Outer wrapper" for identical values. Only note the caption below is different:

- **Outer caption headline:** `"Millennial vs Gen Z"` — same italic serif ~52 px, near-black `#1B1B1B`, centred, curly quotes.
- **Outer caption body (verbatim):** _"This temp is funny + relatable, and it makes people tag their friends and colleagues without thinking twice!!"_ — three lines, same italic serif ~34 px, line-height ~1.35, centred, colour `#1B1B1B`.

#### Inner example (comparison:side-by-side template) — this is the interesting one

- **Card content dimensions:** ~475 × 590 px on the outer canvas → maps to 1080×1350 target.
- **Background (inner):**
    - Full flat fill of dusty rose / mauve, hex approx `#A57880` (a muted burgundy-pink, mid-tone). No visible grain, no gradient.
- **Layout zones (inner, mapped to 1080×1350):**
    - Zone A (y≈0–80): top margin / breathing.
    - Zone B (y≈80–350): two headline blocks, one per column, both 2-line italic serif.
    - Zone C (y≈350–850): two illustration/photo groups, one per column (each is a **pair of handbags**, one pink and one green, sitting side-by-side facing each other). Nearly identical between the two columns — the humour is that the "Millennial team" and "Gen-Z team" both do the same brand-ad work but the copy differs.
    - Zone D (y≈870–1230): two sans-serif body-copy paragraphs, one per column, ~4 lines each, centred within their column.
    - Zone E (y≈1240–1350): bottom margin (empty, but IG toolbar sits below on the outer wrapper).
    - **Central vertical divider:** a **thin (~1 px) darker rose line** at x=540 (canvas centre), running full height y≈80 to y≈1250, colour `#8A5F65` (a shade darker than the bg). Provides visual separation without shouting.
    - Column padding: ~80 px left/right per column (i.e., each column is ~460 px wide with ~40 px inner padding).
- **Grid & alignment:** 2-column grid, gutter = 0 (columns touch at the centre divider). Everything within each column is centred horizontally within its column.
- **Typography (inner):**
    - **Column headlines** (y≈100–260):
        - Left: `"Millennial Social Team"` (2 lines: "Millennial" / "Social Team").
        - Right: `"Gen-Z Social Team"` (2 lines: "Gen-Z" / "Social Team").
        - Font: **italic serif with a very editorial magazine feel** — high contrast, moderate x-height, tight letter-shapes. Candidates: **Playfair Display Italic (Bold)**, **DM Serif Text Italic**, **Söhne Breit Italic**. Playfair is the closest match — its distinctive `M`, `S`, and `T` letterforms match here.
        - Weight: 700 (Bold) Italic.
        - Size: ~72–80 px (dominant type).
        - Line-height: ~1.05 (very tight — headlines almost touch).
        - Colour: cream / off-white `#F5EDE0` (warm, not pure white — deliberately matches the palette of image 1's inner-post bg, creating a shared brand token).
        - Alignment: centred within the column.
        - No stroke, no text-shadow.
    - **Column body copy** (y≈870–1180):
        - Left verbatim: _"Our limited-edition collection features ethically sourced materials and handcrafted details that make every piece a timeless investment."_
        - Right verbatim: _"it's giving add to cart, cry about it later, worth every penny 👜✨"_ (with handbag + sparkle emoji).
        - Font: **sans-serif**, medium/regular weight. Candidates: **Plus Jakarta Sans Regular**, **Inter Regular**, **Söhne Regular**.
        - Weight: 400 Regular.
        - Size: ~28 px.
        - Line-height: ~1.4.
        - Colour: cream `#F5EDE0` (same as headline).
        - Alignment: centred, wraps at column width.
- **Decorative elements (inner):**
    - **Two identical handbag pairs**, one pair per column, sitting on the same virtual "floor" (no visible ground line — they float on the flat bg).
    - Each pair = one pink structured top-handle handbag on the left + one green croc-embossed top-handle handbag on the right, both facing forward, both with a small gold-tone brass clasp/lock at the centre-front. Photographic (product-shot) style, isolated on the flat bg with a soft grounded shadow beneath (drop shadow: offset y≈8 px, blur≈16 px, opacity ≈30 %).
    - Approx bag dimensions: each ~180 × 220 px (relative to 1080-wide canvas).
    - The pair is centred horizontally within its column, with a small inter-bag gap of ~15 px.
    - **Sparkle + handbag emoji** at end of right column body copy — Apple-style colour emoji glyphs, inline with the text.
    - Central vertical divider (already noted in layout).
- **Layering order:** `[mauve bg fill] → [central divider line] → [drop shadow beneath each bag pair] → [bag photos] → [column headlines] → [column body copy]`.
- **Shadows & effects:**
    - Bag drop shadows: offset y≈8 px, blur≈16 px, colour `#000000`, opacity ~30 %, blend `multiply`.
    - No blur, no grain, no vignette.
- **Brand markers (inner):** None — this is a "template body" slide, brand appears elsewhere.
- **Word count (inner):** ~44 words total (10 headline + 34 body across both columns). Cognitive load = **medium** — pushing the limit of "one idea per slide" because the joke depends on comparing the two columns. Justified for this template class.

#### Fabric.js reproduction notes
- **Two-column grid layout** — factor into a reusable `makeComparisonLayout({leftContent, rightContent, bg, divider})` builder:
    - Column geometry: canvas width divided evenly, `columnWidth = (CANVAS_W - dividerWidth) / 2`.
    - Divider: a `Line` primitive, thin, with `stroke = darken(bg, 20%)`.
    - Each column is a Fabric `Group` positioned at `x = columnIndex * columnWidth` — so template consumers pass 2 group children.
- **Column content templates** (nested inside each column):
    - Headline: 2-line `Textbox` with `fontFamily = 'Playfair Display Italic'`, `fontWeight = 700`, `fontStyle = 'italic'`, `textAlign = 'center'`, `fill = '#F5EDE0'`.
    - Image group: 2 side-by-side `FabricImage` objects with baked-in drop-shadow filter (Fabric's `shadow` property, not a CSS filter — set `shadow: new Shadow({ color: '#00000055', offsetX: 0, offsetY: 8, blur: 16 })`).
    - Body: `Textbox` with sans-serif regular, `fontSize = 28`, `textAlign = 'center'`, `lineHeight = 1.4`.
- **Handbag imagery**: for our system, the two columns should accept an `imageSlot` prop that maps to the AI-generated image pipeline (currently `ai_image_url` in the slide schema). For the tutorial template we'd need 2 image slots per slide (unusual — current slides carry a single image). **This forces a schema extension:** `assets.additional_images: List[ImageAsset]` or per-slot named images. Flag for Phase 2 scoping.
- **New helpers required:**
    - `makeComparisonLayout({left, right, bg, dividerColor, dividerWidth})` — the 2-column skeleton.
    - `makeItalicSerifHeadline({text, size, color})` — repeatable across formats.
    - `makeImagePair({leftUrl, rightUrl, gap, shadow})` — 2 images side-by-side within a group, matched sizing.
    - Emoji-inline text: Fabric v7 handles inline emoji in `Textbox` if the font stack falls back to Apple Color Emoji / Twemoji; test.
- **Font loading:** confirms **Playfair Display Italic Bold** needed (also confirmed by image 1 above).

#### Motion cue
- The mirrored composition (identical bag pair in both columns, only the copy differs) implies a "compare and contrast" reading motion — eyes bounce left→right→left. No arrows.

#### IG safe-zone check
- Column headlines start at y≈100 in the inner mapping — **inside** the top 200 px avatar-bar risk zone. In the outer wrapper this is fine (the whole inner post is a mocked preview), but if we ship this as an actual template, we need to **push the headline down to y≥220** to clear the IG top overlay. **Action:** bake a `topSafeInset = 200` into the comparison template.
- Body copy ends at y≈1180 — safe from the 1170-px CTA line by only 10 px. Tight. Recommend max 3 lines of body copy per column, or truncate at ~25 words per column.

#### Reusability score
- 5/5 — comparison templates are one of the highest-value carousel templates. Uses: Millennial vs Gen-Z, iOS vs Android, Junior vs Senior, Before vs After, Cheap vs Premium, Startup vs Corporate, etc. Should absolutely be in Phase 2.

#### Template pattern classification (final)
- **Inner:** **`aurora-compact-comparison`** — vertical 50/50 split with headline + hero image + short body per side, thin central divider. This is a **must-have** in the compact family.
- **Outer:** same `aurora-annotated-example` as image 1.
- Small caveat: this specific example uses TWO images per side (a pair of bags). The generic template should support **1 image per side by default**, with an optional "image-pair" variant. Two slots per side is a rare need.

#### Copy-pattern hint (LLM writer)
- Column headline formula: `"[Group A] [role/topic]"` vs `"[Group B] [role/topic]"` — 3–4 words each, matched length for symmetry.
- Column body formula: EITHER (a) matched tone (both formal, both casual — literal comparison) OR (b) **contrasted tone** (one formal, one meme-y — this is where the humour lives, as shown here). The LLM prompt should offer both modes.
- Emoji allowed but only in the "casual" column, at end of sentence.

#### Notes / open questions
- **Schema extension needed:** the comparison template needs 2 image slots. Existing slide schema has one `ai_image_url` per slide. Options:
    1. Add `slide.assets.left_image` + `slide.assets.right_image` (typed variant for comparison slides).
    2. Reuse a generic `slide.assets.images: List[ImageAsset]` array (more flexible, less strict).
    3. For MVP: skip image slots entirely, use icon/emoji-only comparison (simpler to build first).
    Recommend flagging this as a decision point for Phase 2.
- The two bags-pair reused identically in both columns is a **stylistic choice** ("we're the same handbags, but marketed differently"). Our generic template should let both sides use different or identical images.
- Cream `#F5EDE0` reappears as the type colour on a coloured bg — same warm off-white as the card bg in image 1. Suggests a **shared token**: `INK_CREAM = #F5EDE0` for use as light-on-dark text.

_Progress: 2 / 85 complete._

---

### others/image copy 2.png
**Pattern class:** other:meta-tutorial (outer wrapper) + hook:trophy-sticker (inner example)
**Overall vibe (1 line):** Third tutorial slide — teaches the "award your reader a fake ribbon for a mundane accomplishment" template, a shareable-humour hook.

Same outer wrapper convention as images 1–2 (identical grass photo bg, chevron arrows, mocked post card, italic-serif caption, 8-dot indicator with 5th dot active). Outer wrapper spec already documented in `others/image.png` § "Outer wrapper".

- **Outer caption headline:** `"Small Wins"` — italic serif ~52 px, near-black `#1B1B1B`, centred, curly quotes.
- **Outer caption body (verbatim):** _"This temp is going to boost SHARES by giving yourself a "ribbon" for those everyday moments that may seem small, but you dread!"_ — three lines, same italic serif ~34 px, colour `#1B1B1B`, centred. Note double quotes around `"ribbon"` inside the body (nested curly quotes).

#### Inner example (photo-hero + medallion-sticker template) — the interesting one

- **Card content dimensions:** ~475 × 590 px on the outer canvas → maps to 1080×1350 target.
- **Background (inner):**
    - Full-bleed **photograph**: interior of a botanical greenhouse / conservatory. Green ferns dominate the frame, arching walkway leading to a lit background, glass-ceiling structure visible in the upper third with warm golden light. Composition is **symmetrical / centred** — the walkway vanishes to the vanishing point at exact centre, framed by ferns on both sides. Colour palette: deep saturated greens + warm gold highlights.
    - No colour wash on top of the photo. No visible grain overlay. Photo has natural depth-of-field (background slightly softer).
- **Layout zones (inner, mapped to 1080×1350):**
    - Zone A (y≈0–1350): full-bleed photograph.
    - Zone B (roughly x≈340–740, y≈360–920): the **prize ribbon medallion** hero — see below. Occupies ~50 % of canvas height, centred.
    - No other layout zones; the entire composition is: photo bg + centred medallion overlay.
- **Grid & alignment:** single-hero, centred both horizontally and vertically. Ribbon is anchored slightly above vertical centre (y-centre ≈ 640, not the true midline at 675) to feel more visually stable.
- **Typography (inner) — ONLY on the ribbon centre:**
    - Text stamped on the round rosette centre:
        - Line 1: `RESPONDED TO` (all caps, ~24 px)
        - Line 2: `AN EMAIL WITHIN` (~24 px)
        - Line 3: `24HRS` (~24 px)
    - Font: **condensed sans-serif, all-caps, bold-ish** — feels like an award-medal stamp. Candidates: **Bebas Neue**, **Oswald Semibold**, **Barlow Condensed Bold**. Not our current Syne / Plus Jakarta stack.
    - Weight: 600–700.
    - Letter-spacing: ~0.08 em (slightly tracked out).
    - Line-height: ~1.15.
    - Colour: white `#FFFFFF`.
    - Alignment: centred.
    - Approx size: 24–28 px (relative to full canvas — this is intentionally small to feel like an authentic engraved medal stamp).
    - The text follows a slight arc? — Hard to tell from the mocked size, but likely **flat straight lines** (not text-on-path). The rosette itself is round, but the type is stamped inside a flat central disc.
- **Decorative elements (inner) — the ribbon medallion:**
    - **Central rosette (round pleated disc)**: a photorealistic red award-ribbon rosette, ~400 px diameter (in the 1080×1350 canvas). Colour: saturated red `#B92827` to `#8F1A1B` (deeper red at pleat folds). Pleats radiate from centre in ~16–20 segments — like a folded fan.
    - **Centre disc**: solid red circle (~180 px diameter, ~50 % of the rosette) with a thin lighter-red inner border (`~#D33F3E`, ~2 px). The white text sits on this disc.
    - **Two ribbon tails** hanging down: two red satin ribbons, each ~90 px wide × 250 px tall, with an inverted-V notch at the bottom. Slight overlap at the top where they emerge from behind the rosette. Warm highlights suggest a soft light source top-left.
    - The medallion is a **realistic 3D-shaded photo/illustration** (not flat vector). Casts a subtle drop shadow onto the photo bg below.
- **Layering order:** `[greenhouse photo bg] → [medallion drop shadow] → [ribbon tails] → [rosette pleats] → [centre disc] → [white stamped text]`.
- **Shadows & effects:**
    - Medallion drop shadow onto photo: offset y≈15 px, blur≈30 px, colour `#000000`, opacity ~40 %, blend `multiply`. Softens the ribbon into the scene.
    - The medallion itself has internal shading (from the illustration source, not applied post-hoc).
- **Brand markers (inner):** None — pure photo + hero-object composition.
- **Word count (inner):** 6 words on the ribbon stamp. Cognitive load = **very low** — the design does 95 % of the work, the text is the punchline.

#### Fabric.js reproduction notes
- **Photo bg:** `FabricImage.fromURL(...)` with `originX = 'center', originY = 'center', left = W/2, top = H/2, scaleX/Y = cover-fit`. Simple.
- **Ribbon medallion:**
    - Simplest path — ship as a **PNG asset** in `backend/assets/stickers/`. A curated set: red-ribbon, blue-ribbon, gold-star, silver-medal, trophy, crown, thumbs-up, sparkle-badge. `makeStickerBadge({sticker: 'red-ribbon', text: '...', textStyle})` helper.
    - Hardest path — build the ribbon in Fabric primitives (many overlapping polygons for pleats, gradients on each). Overkill; use PNG.
    - **Text on the medallion**: render as a separate `Textbox` overlaid on the PNG's centre disc. The PNG needs a **known transparent-disc region** where our text is placed. Encode the disc's centre + radius in a metadata file next to each sticker PNG (e.g., `red-ribbon.json` with `{center: [200,200], radius: 90}`), so the helper can auto-position the text.
- **Text-on-medallion styling:** condensed all-caps sans-serif. **Confirmed: need to add a condensed sans-serif** to the renderer. Recommend **Bebas Neue** (free, Google Fonts, single weight but iconic) OR **Barlow Condensed** (Google Fonts, full weight range, more versatile).
- **Where the caption lives:** in this reference, the "punchline" ("Responded to an email within 24hrs") is stamped on the ribbon itself. In our system, do we want the writer's copy to appear ON the sticker (short, all-caps, 3 lines max) OR below the photo as a caption? Both patterns valid. Recommend: **on-sticker** for compact-hook templates (punchier), **below-photo** for photo-caption templates (already planned).
- **New helpers required:**
    - `makeStickerBadge({sticker, text, textStyle, position, scale, rotation})` — reusable across trophy/badge templates. `sticker` is a key into an asset registry.
    - Asset registry with metadata: `backend/assets/stickers/registry.json` mapping sticker key → `{png, textAnchor: {x,y}, textMaxWidth, defaultRotation}`.
- **Font loading:** add **Bebas Neue** (or Barlow Condensed) to `renderer_entry.ts` for all-caps stamped/tracked text.

#### Motion cue
- The centred symmetry and giant hero-badge feels static and monumental — like a poster. No implied motion. This is deliberate: the joke depends on how "official" and "important" the ribbon looks vs. how trivial the accomplishment is.

#### IG safe-zone check
- The medallion is centred vertically at y≈640 in the full-canvas mapping — well within safe zones (both top 200 and bottom 180). The photo bleeds full-bleed; edges are fine because there's no critical text near edges. ✅ Fully safe.

#### Reusability score
- 4/5 — the "give yourself a fake trophy for a mundane accomplishment" hook is very shareable, but the sticker inventory limits variety. With 6–10 sticker options (ribbon, medal, trophy, crown, star, badge, etc.) and endless photo backgrounds, this template can produce hundreds of unique slides.

#### Template pattern classification (final)
- Proposed key: **`aurora-compact-badge-hook`** — full-bleed photo + centred sticker/badge with a short stamped caption.
- Related to `aurora-compact-hook` but distinctive enough (photo bg + physical-object sticker) that it deserves its own template rather than a sub-variant.
- Sits well in **Phase 4** (extra formats beyond core), not the core 5 in Phase 2. Or promote to Phase 2 if the user loves this pattern.

#### Copy-pattern hint (LLM writer)
- Sticker stamp formula: `"[VERB-past-tense] [OBJECT] [QUALIFIER]"` — all-caps, 3–8 words, split over 2–3 lines.
- Examples generated by pattern: "SURVIVED A MONDAY MEETING", "REPLIED WITHIN 2 HOURS", "MADE COFFEE BEFORE NOON", "READ THE ENTIRE EMAIL", "SAID NO WITHOUT EXPLAINING", "CLOSED 100 CHROME TABS".
- Photo prompt for AI-image gen: should be a **calming, aspirational lifestyle scene** (garden, library, sunset, luxury interior) that ironically contrasts with the mundane "achievement".

#### Notes / open questions
- **Sticker asset library:** we need to commission or source ~10 photorealistic sticker PNGs. Options: (a) illustrate them in-house (design work), (b) source from a stock library with commercial licence (Envato, Creative Market — likely $50–200 for a pack), (c) generate with AI (DALL-E / Midjourney — quick but quality-inconsistent). Flag as a Phase-2 blocker if we ship this template early.
- **Photo generation prompt guidance:** for AI-image gen we'd need a template-specific prompt style ("professional lifestyle photography, muted natural colours, no text, symmetrical composition, subject centred, dof: shallow, background: lush greenery / cosy interior / sunset / etc."). Add this to the image-prompt library for the badge-hook template.
- Photo compositions like this greenhouse shot are **strongly symmetric** — the ribbon anchors on the vanishing-point centre. Should we require the photo prompt to include "symmetric composition with clear central subject/space", or let the LLM decide? Ideally the LLM picks a photo prompt that leaves a clean centre for the badge; otherwise the badge sits awkwardly.

_Progress: 3 / 85 complete._

---

### others/image copy 3.png
**Pattern class:** other:reel-cover (a Reel/Story cover, not a carousel slide) — teaches the "Fake Post inside a Reel" hook.
**Overall vibe (1 line):** Video-cover / Reel opener with a giant black headline, a peach category pill, a tilted-phone Reel mockup, and a right-column body-copy explainer — pastel-metallic mood.

This slide is qualitatively **different** from images 1–2 above: it's a **Reel cover** (note the muted-speaker icon bottom-right, and no chevrons or dot indicator — a Reel has no swipe). So the outer wrapper is different. The overall composition is close to a full "landing tile" for a video — an Instagram-Reel cover. Very rich in components; extraction below is comprehensive.

- **Canvas:** 1080×1350 assumed.
- **Background:**
    - Full-bleed **metallic pastel gradient** — a soft peach/champagne-to-warm-beige radial-ish gradient. Sample points: top-right corner `#DAC7A5` (warm golden peach), centre `#DDD1C0`, bottom-left `#C6B6A0` (mid-warm-beige-brown). Looks like brushed-metallic wrapping paper. Very subtle grain (~3 % opacity) or genuine paper-texture noise.
    - No second overlay besides the gradient itself.
- **Layout zones (top → bottom):**
    - Zone A (y≈50–150): centred peach **category pill** `"VIRAL REEL"` — width ~350 px, height ~64 px.
    - Zone B (y≈115–1250): **big rounded-corner card** (white `#FFFFFF`) filling most of the canvas, ~980 px wide × 1130 px tall, radius ~48 px, subtle drop shadow. This is the primary content container. The peach pill from zone A visually overlaps the card's top edge (pill sits on the card boundary, half above/half on).
    - Zone C inside the card (y≈180–320): giant headline `FAKE POST` — bold sans-serif, black, ~140 px, single line, centred.
    - Zone D inside the card (y≈340–1040):
        - **Left column (x≈80–460, y≈370–1030):** tilted phone-screenshot / Reel mockup showing a video-frame filled with pink+turquoise sprinkles/beads with two mocked comment cards overlaid on top of the video.
        - **Right column (x≈510–950, y≈370–970):** body-copy block, left-aligned, 2 paragraphs.
    - Zone E inside the card (y≈1060–1170): centred italic-serif CTA "*Comment "TEMPLATE" for the Canva Link".
    - Zone F outside the card (y≈1240–1350, right edge): Reel muted-speaker icon (a small dark rounded-rect containing a speaker-with-slash glyph, bottom-right).
    - Zone G outside the card (y≈1290–1330): a fake dot indicator (10 dots, none active) at bottom — decorative, since Reels don't have a real page indicator.
    - Outer padding: ~50 px left/right around the card.
- **Grid & alignment:** 2-column inside the card (left = mockup, right = copy). Peach pill + headline + CTA are centred; body copy in right column is left-aligned to the right column's left edge.
- **Typography:**
    - **Category pill text (Zone A):** `VIRAL REEL` — sans-serif, weight 500, ~30 px, letter-spacing ~0.20 em (widely tracked), colour dark charcoal `#2A2A2A` on peach pill fill.
        - Font candidate: **Söhne Medium**, **Inter Medium**, **Plus Jakarta Sans Medium**.
    - **Headline `FAKE POST` (Zone C):** sans-serif **display**, weight ≥ 800 (Black), all caps, colour `#000000`.
        - Approx size: ~144 px, single line, letter-spacing ~-0.02 em (tight).
        - Line-height: 1.0.
        - Font candidates: **Inter Black**, **Söhne Kraftig / Buch**, **Helvetica Neue Black**, **Neue Haas Grotesk Black**. Feels like an editorial-grotesk display cut — a **very** modern, unornamented black-weight sans.
    - **Body copy (Zone D right column):** neutral sans-serif, weight 400, ~44 px (large for body — this is meant to be a scannable Reel cover), line-height ~1.35, colour `#1B1B1B`. Left-aligned.
        - Verbatim (paragraph 1): _"Create a 'Fake Post' within a reel to capture people's attention and stop the scroll!"_
        - Verbatim (paragraph 2): _"You could even use this just on your opening shot if you don't want to use it as a whole video"_
        - Font candidate: same as headline family but Regular weight — likely **Inter Regular** or **Söhne Buch**.
    - **CTA (Zone E):** italic serif, ~36 px, colour `#1B1B1B`, centred. Verbatim: `"*Comment "TEMPLATE" for the Canva Link"`.
        - Note: leading asterisk + double-quotes around `TEMPLATE` (nested curly quotes).
        - Font: same italic serif as the outer captions in images 1–2 — **Playfair Display Italic Bold**.
- **Decorative elements:**
    - **Peach category pill (Zone A):** rounded-rect (radius ≥ height/2, i.e., full pill), fill `#E8CBA3` (warm apricot/peach), no border. Sits on top of the white card's top edge. Padding inside pill: ~24 px H × 12 px V.
    - **White rounded-corner card:** fill `#FFFFFF`, radius ~48 px, subtle drop shadow (offset y≈8 px, blur≈32 px, `#00000015`). Occupies ~90 % of canvas.
    - **Tilted phone / Reel mockup (left column):** an image showing a full-bleed video frame with pink-and-turquoise sprinkles/beads in a bowl-like setup, tilted counter-clockwise ~-6° from vertical. Two "fake post" comment cards are pasted on top of the video (see next).
        - Overall mockup dims: ~380 × 660 px, portrait 9:16 (Reel aspect).
        - The mockup itself has a thin rounded-rect frame (radius ~28 px, mimicking a phone screen) and rests slightly beyond the tilted rotation with a drop shadow (offset y≈12 px, blur≈24 px, `#00000030`).
    - **Two "fake post" cards on the mockup:** small white rounded-rect cards, each ~340 × 80 px, radius ~14 px, each with:
        - Circle avatar on the left (~28 px), a solid colour placeholder or logo.
        - Handle text `@holler.academy` in small bold sans-serif on top row.
        - Description text (`Canva templates & content trends` on top card, `Here's an example of how you could use this trending reel template, super fun and easy!` on bottom card) in smaller regular grey sans-serif on second row.
        - Card 1 (top, y≈75 % up the mockup): handle + one-line description.
        - Card 2 (bottom, y≈75 % down the mockup): handle + wrapped 2-line description.
        - These cards are the "fake post" the tutorial is teaching viewers to embed inside their Reel.
    - **Reel muted-speaker icon (Zone F):** dark grey rounded square with a diagonal speaker-with-slash SVG icon inside — Instagram's native "muted" indicator, ~60 × 60 px.
    - **Bottom dot row (Zone G):** 10 tiny dots, muted grey. Purely decorative — Reels don't paginate.
- **Layering order:** `[metallic gradient bg] → [very subtle grain] → [white card + shadow] → [peach pill] → [FAKE POST headline] → [phone-mockup shadow] → [phone-mockup image with fake-post cards baked in] → [body copy] → [CTA] → [muted-speaker icon] → [decorative dot row]`.
- **Shadows & effects:**
    - Card drop shadow: offset y≈8 px, blur≈32 px, colour `#00000015`, blend `multiply`.
    - Phone-mockup drop shadow: offset y≈12 px, blur≈24 px, colour `#00000030`, blend `multiply`, plus a slight horizontal skew from the tilt.
    - No filters on the headline or body.
- **Brand markers:**
    - No handle/logo visible (this is the cover of a video; the account is implied by the Reel context).
    - The category pill `VIRAL REEL` functions as a **format tag** — telling the viewer "this is a Reel about a Reel technique".
- **Word count & density:** 2 words (pill) + 2 words (headline) + 36 words (body) + 6 words (CTA) = ~46 words + 2 embedded fake-post captions ≈ 20 more words on the mockup ≈ 66 total. Cognitive load = **medium-high** but justified — this is a cover slide meant to sell the click into the Reel.

#### Fabric.js reproduction notes
- **Metallic gradient bg:** Fabric v7 `Gradient` on the canvas rect. `type = 'radial'`, colour stops `#DAC7A5` → `#DDD1C0` → `#C6B6A0`, or a **linear** at ~135° for a similar effect. A very subtle grain overlay PNG at ~3 % opacity, `globalCompositeOperation = 'overlay'` gives the paper-metallic feel.
- **White card:** `Rect` with `rx=48, ry=48, fill='#FFFFFF'`, plus Fabric's `shadow` property.
- **Peach category pill:** `Rect` with `rx=32, ry=32, fill='#E8CBA3'` + a centred `Textbox` above. Existing `makePill` helper (in aurora templates) can be reused.
- **Big headline:** `Textbox` with an **Inter Black** or **Söhne Black** family, `fontWeight = 800` or `900`, `fontSize = 144`, `charSpacing = -20` (Fabric uses 1/1000ths of em for `charSpacing`), `textAlign = 'center'`. **Confirmed need to add Inter Black to renderer** (Plus Jakarta Sans max is ExtraBold 800 — should be enough, but Inter Black feels closer here). Test both.
- **Phone / Reel mockup:** wrap the video-frame image + the two fake-post cards into a Fabric `Group`, then rotate the group by −6°. Group children:
    - Base video image (`FabricImage`) with `rx=28` via clip-path (Fabric v7 supports `clipPath` = another Fabric object).
    - Two card `Group`s stacked at different y-positions:
        - Each card: a white rounded `Rect` bg + a small circle avatar (or `FabricImage` if logo) + two lines of text (`Textbox`).
    - Group has its own drop shadow.
- **CTA italic serif:** `Textbox` with Playfair Display Italic Bold, `fontSize = 36`, centred.
- **Reel muted-speaker icon:** SVG icon, imported via `loadSVGFromString` and given the correct colour tint. Or ship as a small PNG.
- **New helpers required:**
    - `makeReelCover({categoryPill, hugeHeadline, mockupImage, mockupCards, rightBodyParagraphs, cta})` — a composite builder for this Reel-cover class of template.
    - `makePhoneMockup({image, cards, tilt, cornerRadius, shadow})` — reusable "tilted phone" element (useful across tutorial templates).
    - `makeMockupPostCard({avatar, handle, description, width})` — the miniature fake-post card.
    - `makeMetallicGradient({from, mid, to, angle, grainOpacity})` — the pastel-metallic bg helper.
- **Font loading:** add **Inter** (400 + 800/900) OR confirm Plus Jakarta Sans ExtraBold is sufficient for the display headline. Add **Playfair Display Italic Bold** (already recommended in images 1–2).
- **This is NOT a compact-family core template.** It's a Reel/video cover, and represents a whole new product concept (video-first content). Recommend deferring to **Phase 5+ / a future "Reel Cover" phase**, not Phase 2 or Phase 4.

#### Motion cue
- The **tilted mockup** implies casual scrapbook aesthetic (like it was pasted-on).
- The mockup shows a video frame with pink+turquoise beads — vibrant colour contrast against the muted metallic bg is intentional, drawing the eye to the mockup first.

#### IG safe-zone check
- Category pill sits at y≈50–150 — mostly clear of the 200-px top zone, but the pill straddles the risk boundary. When Reel plays, IG chrome overlays the top ~200 px with the profile/audio info — the pill will be **partially obscured**. Suggest lowering to y≥220 for Reel covers, OR accepting that the pill is decorative when the Reel is playing full-screen.
- Headline `FAKE POST` at y≈180–320 — safely below the top zone.
- CTA at y≈1060–1170 — sits above IG's Reel-bottom overlay (which starts around y=1170 for the like/comment strip). Safe by a small margin.
- Muted-speaker icon bottom-right is our own decoration, not IG's — could be dropped since IG shows its own mute state.

#### Reusability score
- **3/5** — Reel covers are a distinct format and have a shorter useful life than carousels. Higher reusability if we position it as a "tutorial cover template" for any topic.

#### Template pattern classification (final)
- Proposed key: **`aurora-reel-cover`** — a distinct top-level template class, **not** in the compact-carousel family. Belongs to a future "Reel / video-cover" phase.
- Sub-variants worth building later: `aurora-reel-cover-fake-post`, `aurora-reel-cover-tutorial`, `aurora-reel-cover-quote`.

#### Copy-pattern hint (LLM writer)
- Category pill: 1–2 words, ALL CAPS, describes the format ("VIRAL REEL", "STORY HACK", "CAROUSEL TIP").
- Huge headline: **2 words**, ALL CAPS, imperative or noun phrase ("FAKE POST", "SLOW ZOOM", "SPLIT TEXT", "OPEN LOOP").
- Body: 2 short paragraphs, ≤ 20 words each. First = what the technique is + hook value. Second = variant / use case.
- CTA: "Comment [WORD] for the [FREEBIE]" — classic IG lead-magnet CTA formula.

#### Notes / open questions
- **Big architectural question:** should our product build Reel-cover templates AT ALL? Current pipeline is carousel-focused. Adding Reels means: (a) different aspect ratio (9:16 for Reels vs 4:5 for feed), (b) different content brief format (a Reel needs a script, not slides), (c) different publishing API. Recommend **defer Reel-cover work entirely** until carousel is polished.
- The "fake post inside a Reel" is a **content-strategy trick** more than a template — the actual value is in teaching users to make embedded fake posts as animated overlays in Reels. Out of scope for a static-render pipeline.
- Note: this slide's colour palette (metallic beige/peach) is **completely different** from images 1–2's mauve or 2's warm-cream. Suggests `@holler.academy` uses **many** themed palettes across their carousels rather than a single brand system. We should NOT force a single palette on our templates — palette-per-template is fine.

_Progress: 4 / 85 complete._

---

### others/image copy 4.png
**Pattern class:** other:carousel-cover (title/hero slide) — teaches the "Google Search result photo" viral trick.
**Overall vibe (1 line):** Carousel cover slide with the same metallic-peach vibe as the Reel cover (image copy 3), but this time promoting a **design trick** (photo edited to look like a Google search result). Tilted iPad/paper mockups in the lower half showcase the technique.

Very similar composition family to `others/image copy 3.png` (Reel cover) — same peach category pill, same big black display headline, same body-copy stack, same italic-serif CTA — but this is a **carousel slide** (dot indicator + chevrons present) rather than a Reel cover. I'll note deltas and skip repeated spec.

- **Canvas:** 1080×1350 assumed.
- **Background:**
    - Same metallic pastel gradient as image copy 3 — peach/beige/warm-brown, subtle grain. Sample points close to `#D9C4A0` top-right to `#B9A386` bottom-left. Slightly warmer than image copy 3.
    - No coloured wash on top.
- **Layout zones (top → bottom):**
    - Zone A (y≈30–115): centred peach **category pill** `"VIRAL DESIGN"` — same style as image copy 3's `"VIRAL REEL"` pill.
    - Zone B (y≈90–1150): big rounded-corner white card (fills most canvas), radius ~48 px, subtle shadow. Peach pill straddles top edge.
    - Zone C inside card (y≈115–360): **giant multiline headline** `GOOGLE, WHERE AM I?` — 2 lines, huge black display, all-caps, centred.
    - Zone D inside card (y≈380–780): 3-paragraph body-copy block, left-aligned within the card's inner padding (~60 px).
    - Zone E inside card (y≈760–1120): the **two tilted mockup images** — a hand holding a paper cutout on the left, and an iPad/tablet showing a Google-Images-style photo grid on the right, both slightly rotated and overlapping.
    - Zone F inside card (y≈960–1070, bottom-left corner overlapping the left mockup): the CTA `"*Comment "TEMPLATE" for the Canva Link"` in italic serif — small footprint tucked into the whitespace between the mockups and the left edge.
    - Zone G outside card (y≈1170–1210): 8-dot indicator, 3rd dot filled darker — normal carousel indicator, as in images 1–2.
    - Zone H outside card (y≈40–1150, at x≈0 and x≈1080): left/right chevron arrows (grey), same style as images 1–2 — this is a **carousel slide** so the chevrons make sense (unlike image copy 3 which was a Reel).
    - Outer padding: ~50 px left/right around the card.
- **Grid & alignment:** the top stack (pill + headline + body) is single-column, mostly centred (pill + headline) then left-aligned (body). Mockups are freely positioned in the lower half at slight tilt angles.
- **Typography:**
    - **Category pill (Zone A):** `VIRAL DESIGN` — sans-serif, weight 500, ~30 px, letter-spacing ~0.20 em, colour `#2A2A2A` on peach `#E8CBA3` fill. Same as image copy 3's pill.
    - **Headline (Zone C):** `GOOGLE, WHERE AM I?` — 2 lines, sans-serif display, weight 900 Black, all caps, `#000000`.
        - Line 1: `GOOGLE,` (with the comma) — ~130 px.
        - Line 2: `WHERE AM I?` (with the question mark) — ~130 px, hyphenated in-place because the two lines nearly-match visual width.
        - Line-height: ~1.0.
        - Letter-spacing: ~-0.02 em (tight).
        - Font candidate: **Inter Black**, **Söhne Black**, **Neue Haas Grotesk Black** — same family as image copy 3's `FAKE POST` headline. Consistent brand voice.
    - **Body copy (Zone D):** three 2-line paragraphs, sans-serif Regular ~44 px, line-height ~1.35, colour `#1B1B1B`, left-aligned.
        - Paragraph 1 (verbatim): _"Unique edits are making posts go VIRAL on Instagram right now!"_ — note `VIRAL` is CAPS as emphasis.
        - Paragraph 2 (verbatim): _"Instead of just sharing a holiday shot, why not make it look like a Google Search Result!"_
        - Paragraph 3 (verbatim): _"Use on it's own, or as part of a string of photos in a carousel!"_ (note the "it's" — grammatical error, should be "its", but carried over verbatim).
        - Font: same as headline family but Regular weight.
    - **CTA (Zone F):** italic serif, ~30 px (slightly smaller than image copy 3), colour `#1B1B1B`, centred.
        - Verbatim: `"*Comment "TEMPLATE" for the Canva Link"` (over 3 short lines).
        - Font: same **Playfair Display Italic Bold** as images 1–2.
- **Decorative elements:**
    - **Peach category pill:** identical style to image copy 3.
    - **White rounded card:** identical style to image copy 3.
    - **Left mockup (Zone E, lower-left):** a **photograph of a hand** holding up a **paper cutout of a mocked Google-Images-style grid**. The paper cutout is a screenshot-style panel with a small text label at the top and a grid of thumbnails from a "photos of the mountain" search — printed on paper and physically held up in front of a landscape scene (mountains and trees visible around the paper edges). The hand-and-paper composition is rotated ~-4° (slight counter-clockwise tilt). The scene is a real photograph (or realistic composite).
        - Approx dimensions: ~450 × 560 px, tilted.
        - Drop shadow beneath: offset y≈12 px, blur≈24 px, `#00000030`, blend `multiply`.
        - This is the **"IRL prototype" mockup style** — highly effective at making a template feel real. Distinctive and worth its own template class.
    - **Right mockup (Zone E, lower-right):** an **iPad or tablet** shown in someone's hand, screen displaying a **Google Images grid** of aerial ocean/coastline photos with the standard Google-Images UI chrome (search bar, filter tabs, thumbnail grid). The tablet is rotated ~+4° (clockwise tilt, opposite of the left mockup). The bottom-left corner of this mockup overlaps the bottom-right corner of the left mockup.
        - Approx dimensions: ~500 × 500 px, tilted.
        - Drop shadow same as left mockup.
    - The two mockups together form a **paired demo** — "here's the template on paper, here's it on an iPad" — visually anchoring the promise.
    - **Chevron arrows** and **dot indicator** as in images 1–2 (carousel affordances).
- **Layering order:** `[metallic gradient bg] → [subtle grain] → [white card + shadow] → [peach pill] → [headline] → [body copy] → [chevron arrows] → [left mockup shadow] → [left mockup] → [right mockup shadow] → [right mockup] → [CTA text] → [dot indicator]`.
- **Shadows & effects:** same as image copy 3, plus two mockup shadows.
- **Brand markers:** none directly visible. Peach `VIRAL DESIGN` pill is the format tag.
- **Word count & density:** 2 (pill) + 4 (headline) + ~40 (body) + 6 (CTA) = ~52 words + baked-in Google-search text on the mockups. Cognitive load = **high**. Reasonable for a cover slide (needs to sell the click) but at the very edge of "readable at a glance".

#### Fabric.js reproduction notes
- **Reuses same helpers as image copy 3**: `makeMetallicGradient`, `makePill`, `makeCardContainer`, `makeGiantDisplayHeadline`, `makeBodyStack`, `makeCTAText`.
- **NEW distinctive element — "IRL mockup pair":**
    - Two `FabricImage` groups (or `Group` containing photo + optional overlay), each with:
        - `angle = ±4` (Fabric's rotation).
        - Independent `shadow`.
        - Positioned with visual overlap.
    - Recommend a `makeMockupPair({leftUrl, rightUrl, tiltLeft, tiltRight, overlap})` helper.
- **Baked-in "Google Images grid" mockup:** these mockups look like they were **physically photographed** (paper printout held up in a landscape; iPad in a hand). The Google-Images UI is REAL, not overlaid. This means we'd need to either:
    1. Prompt an AI-image gen to compose the exact scene (hard — needs "photorealistic hand holding a paper printout of a Google Images results page overlaid on a mountain landscape"). Very fiddly.
    2. Ship **prefab mockup assets** (a small library of "hand holding paper" / "hand holding iPad" PNG frames with a transparent screen area). User's slide topic drives a **screenshot** inside the transparent zone.
    3. Ship a pure Fabric-composed **mockup layout** — a rectangle with a fake Google-search UI (magnifying glass icon + search bar + tab strip + thumbnail grid) placed onto a photo bg. This is a much cleaner path — we control every pixel, ship it as a distinct template.
    Recommend option 3 for our template system: build **`aurora-google-search-mockup`** as a self-contained template that composes the Google UI in Fabric primitives, no photo compositing required.
- **New helpers required:**
    - `makeGoogleSearchMockup({searchQuery, thumbnails, chromeStyle: "images"|"web"})` — renders a mocked Google Images / Google Search UI in Fabric.
    - `makeTiltedFrame({content, tilt, cornerRadius, shadow, hasPaperTexture})` — reusable tilted-photo container.
    - `makeCTABlock({text, italic, size, position: "bottom-left"|"bottom-right"|"centre"})` — deliberate positioning options.
- **Font loading:** confirms need for **Inter Black / Söhne Black** for the display headline. All other fonts already flagged in previous entries.

#### Motion cue
- Both mockups tilted in opposite directions creates a subtle **"floating pair"** feel — like two photos on a mood board. No arrows implied. The tilt says "casual, hand-crafted".

#### IG safe-zone check
- Peach pill at y≈30–115 — **fully inside** the top 200-px avatar-bar risk zone. Same issue as image copy 3. Push pill to y≥220 for actual production templates.
- Headline at y≈115–360 — top of headline sits under IG chrome; visible portion starts at ~y=200. Recommend either raising pill above the safe line OR lowering the entire card content by 100 px.
- Body copy at y≈380–780 — safe.
- CTA and mockups at y≈760–1150 — mostly safe, but the CTA text sits close to y=1050 which is near the IG-caption-overlay boundary. Fine at max caption expansion.
- Dot indicator at y≈1190 — **inside** the 1170-px CTA-overlay risk zone. Would be obscured by IG's own indicator; drop it from our templates (as noted in image 1).

#### Reusability score
- **4/5** for the general "carousel-cover with pill + display headline + body + mockup pair" structure — high reusability across any tutorial or educational cover.
- **2/5** for the *specific* "Google search result" trick — very niche, only makes sense for one topic.

#### Template pattern classification (final)
- General structure: **`aurora-carousel-cover-hero`** — a canonical "hero cover" template for carousels, with:
    - Peach/coloured category pill at top.
    - Big black display headline (1–2 lines, ≤ 4 words per line).
    - Body copy (2–3 paragraphs).
    - Optional 1 or 2 tilted mockup images in lower half.
    - Small italic-serif CTA (or footer text) at the bottom.
    - **Should be in Phase 2** as it's foundational — every carousel needs a strong cover slide.
- Specific technique demo: **`aurora-google-search-mockup`** — a specialty template for "template teaches a design trick" narratives. Phase 4/5.

#### Copy-pattern hint (LLM writer)
- Category pill: 1–2 words describing the format category (VIRAL DESIGN, TUTORIAL, HOT TAKE, STEP-BY-STEP, DEEP DIVE, MYTHS BUSTED).
- Headline: 2–5 words, ALL CAPS, punchy, question-mark or exclamation-mark optional. Formulas: `"[VERB], [DESCRIPTION]?"` or `"[NOUN] [MODIFIER]"` or `"[QUESTION HOOK]"`.
- Body: 2–3 short paragraphs, each ≤ 15 words. First = the trend/observation. Second = the technique. Third = usage guidance.
- CTA: same "Comment [WORD] for [FREEBIE]" formula as image copy 3.

#### Notes / open questions
- The tilted **hand-holding-a-mockup** aesthetic (image copy 4) and the **tilted phone mockup** (image copy 3) are both variants of the same **"IRL prototype photograph"** pattern. Whether we build them as separate templates or one templated variant with `mockupStyle: "phone" | "paper" | "tablet" | "book"` is a design decision. Recommend the latter — one flexible template.
- The `"it's own"` grammar error verbatim on the reference (should be "its") is a good reminder that our LLM-generated copy needs a **proofreader pass** for common possessive/contraction errors before rendering to canvas.
- Recurring pattern across images 3–4: peach pill + black display headline + body + tilted mockup + italic CTA is **@holler.academy's cover-slide brand system**. If we want to closely emulate this specific creator's style, we can encode this as a single `aurora-holler-cover` variant. But this is a specific-creator homage, not a generic brand.

_Progress: 5 / 85 complete._

---

### others/image copy 5.png
**Pattern class:** other:reel-or-carousel-cover — teaches the "Check My Calendar" trend where a Reel/Carousel summarises the month using a phone-Calendar-app mockup.
**Overall vibe (1 line):** Reel cover of the same `@holler.academy` template family as `image copy 3` & `image copy 4` — peach pill + huge black headline + tilted mockup + right-column body + italic CTA — but the mockup is now an **iOS Calendar app screenshot with polaroid photos taped to the days**, an aspirational summer-scrapbook aesthetic.

Layout, colour palette, and type stack are **near-identical** to `others/image copy 3.png` (Reel cover). I'll cross-reference to that entry and only capture deltas here. The reader should treat this as "same template, new content".

- **Canvas / bg / white card / peach pill:** identical to image copy 3. Same metallic peach-beige gradient, same white rounded card, same peach `"VIRAL REEL"` pill straddling the top edge.
- **Layout zones — deltas from image copy 3:**
    - Zone C headline (y≈120–330): `CHECK MY CALENDAR` — 2 lines (`CHECK MY` / `CALENDAR`), tighter line-break than image copy 3's single-line `FAKE POST`.
    - Zone D content (y≈330–1070):
        - Left column (x≈50–420, y≈340–1060): tilted iPhone-screen mockup showing an iOS Calendar app in a "July 2025" grid view with **polaroid photos taped/pinned to the day cells** (a June-photo on the 2nd, a starfish photo on the 8th, a bouquet + beach shells illustration on day 16, etc.), all against a full-bleed **overhead ocean-waves photo** background. Bottom of the mockup carries the label `SUMMER TIME` in wide-tracked all-caps serif/sans white type. Tilt ~-6°.
        - Right column (x≈470–1000, y≈340–780): body-copy block, sans-serif Regular, ~44 px, left-aligned. Longer than image copy 3 — **7 lines / one long paragraph**.
    - Zone E CTA (y≈820–930, positioned in the right column below the body): centred italic-serif CTA. Different position vs. image copy 3 (which had CTA below the whole card centred); here it sits inside the right column.
    - Zone F/G decorative dot row and muted-speaker icon: same as image copy 3.
    - **Note:** although the muted-speaker icon suggests this is a Reel, I see a **dot-row indicator with 9 dots (4th active)** — this could mean it's a **carousel slide** presented within a Reel context, or the tutorial author included both affordances for demonstration. Treat as "cover-style slide, format-agnostic".
- **Typography — deltas:**
    - Headline `CHECK MY CALENDAR`: same **Inter Black / Söhne Black** ~130 px, all-caps, 2 lines, tight line-height 1.0, no letter-spacing tweaks.
    - Body copy verbatim (one paragraph): _"Use this trending reel to summarise what you did this month, or share with your audience what you have coming up next month! Use in a reel, or within a carousel!"_ — 34 words. Longer than image copy 3's body (36 total across 2 paragraphs).
    - CTA verbatim: `"*Comment "TEMPLATE" for the Canva Link"` — identical to image copy 3.
- **Decorative elements — the mockup:**
    - **Base image:** an overhead photo of ocean waves cresting on a sandy beach (aerial or drone shot) — muted blue/foam colour palette, high natural light. This is the "screensaver" / wallpaper of the phone.
    - **iOS Calendar overlay:** a translucent white rounded-rect frame occupying the middle 60 % of the mockup, showing:
        - iOS status bar at top: date `2025`, magnifier icon, `+` icon (very small, ~12 px).
        - Month header: `July` in a serif italic script (Apple's SF Serif or similar).
        - Weekday abbreviations row (`M T W T F S S`) in tiny caps.
        - 5×7 grid of numbered day cells (1–31).
        - Photos **pinned/taped** to some cells: a small vertical polaroid on day 2, a rectangular photo on day 8, a starfish/summer bouquet illustration on day 16, another polaroid on day 24. Each has a slight tilt (~±5°) and a subtle drop shadow — as if physically stuck onto the digital screen. This mashup is the aesthetic gimmick.
    - **`SUMMER TIME` label:** at bottom of the phone mockup, white text `SUMMER TIME`, wide letter-spacing (~0.30 em), ~30 px, appears to be either **serif Playfair-italic** or **wide sans-serif small-caps** — hard to distinguish at res. This is the "vintage travel poster" caption cue.
    - Mockup drop shadow: offset y≈14 px, blur≈28 px, colour `#000000`, opacity ~30 %, blend `multiply`.
- **Layering order:** `[metallic gradient bg] → [subtle grain] → [white card + shadow] → [peach pill] → [headline] → [mockup shadow] → [mockup image with calendar + polaroid overlays baked in] → [body copy] → [CTA] → [muted-speaker icon] → [dot indicator]`.
- **Word count:** 2 pill + 3 headline + 34 body + 6 CTA = ~45 + baked-in mockup text (~30 more counting month, weekday labels, day numbers). Cognitive load = **high**, borderline overload — but justified for a cover slide.

#### Fabric.js reproduction notes
- **Same core reuse as image copy 3** — the `makeReelCover` / `makeCarouselCover` composite builder applies here directly with different content.
- **NEW distinctive element — "phone screen with taped mementos" mockup:**
    - Base photo (ocean waves) as `FabricImage`.
    - `Group` containing:
        - Semi-transparent white rounded-rect (`Rect` with `fill='rgba(255,255,255,0.8)'`, radius ~24 px) — the Calendar UI panel.
        - Weekday header row: 7 tiny `Textbox` labels evenly spaced.
        - 5×7 grid of tiny day-number `Textbox` objects.
        - 3–4 mini-photo `Group`s with tilt, positioned over specific day cells. Each mini-photo is a small `FabricImage` with a thin white border (`Rect` behind).
    - `SUMMER TIME` label at bottom.
    - Group tilted -6°.
    - Group drop shadow.
- **New helpers required:**
    - `makeCalendarMockup({monthLabel, year, photos: [{day, url, tilt}], baseImageUrl, footerLabel, footerFont})` — reusable "iPhone Calendar with pinned photos" mockup. Very specific but genuinely reusable for any "month recap" template.
    - `makePolaroid({image, tilt, borderColor, borderWidth, shadow})` — the individual pinned photo. **This is a widely-reusable helper** across scrapbook templates.
- **Font loading:** confirms Inter/Söhne Black + Playfair Italic already flagged. May want a **serif italic display** for the `SUMMER TIME` label if we want to match exactly.
- **Same architectural note as image copy 3:** this is a cover-family template (Reel-cover / Carousel-cover), not a compact-family core template. Defer to Phase 5+.

#### Motion cue
- The **taped polaroids on a digital calendar** is a delightful "physical meets digital" mashup — implies "look at my analog memories on a modern schedule". No arrows.

#### IG safe-zone check
- Same issues as image copy 3: peach pill at y≈70 is inside the 200-px avatar-bar risk zone.
- Headline top at y≈120 is also inside the risk zone — the top of `CHECK` will be obscured by IG chrome. Push headline down 100 px in production templates.
- CTA at y≈820–930 is safe.
- Dot indicator at y≈1250 is inside the 1170-px bottom-CTA-overlay risk zone.

#### Reusability score
- **General template family (peach pill + display headline + mockup + body + CTA):** 5/5 — extremely reusable "cover slide" pattern, spawning near-infinite variations by swapping only the copy and the mockup.
- **Specific "month calendar recap" template:** 3/5 — the polaroid-on-calendar mockup is delightfully specific; useful for lifestyle, travel, month-recap content types, but not universal.

#### Template pattern classification (final)
- General cover family: **`aurora-carousel-cover-hero`** (or `aurora-reel-cover` depending on format), as proposed in image copy 3–4. Same builder.
- Specific mockup style: **`aurora-cover-calendar-mockup`** — a variant that uses `makeCalendarMockup` as the hero visual. Phase 4/5.
- **Pattern recognition:** images 3, 4, and 5 are the SAME COVER TEMPLATE with different mockup content. This suggests we should build ONE `aurora-carousel-cover-hero` builder that accepts a **pluggable mockup type**: `mockupType: "phone-post" | "phone-calendar" | "paper-tablet-pair" | "book" | "video-frame" | "none"`.

#### Copy-pattern hint (LLM writer)
- Headline: 2–4 words, all caps, **2 lines**, first-person action verb + object ("CHECK MY CALENDAR", "READ MY DIARY", "OPEN MY FRIDGE", "SCROLL MY FEED"). This first-person voyeuristic framing is a proven hook.
- Body: 20–35 words, single sentence describing the mechanic + usage suggestion.

#### Notes / open questions
- The `SUMMER TIME` italic-caps label at the bottom of the mockup would be a nice pattern to standardise — a **caption stamp** on any hero photo. Add `makePhotoCaptionStamp({text, position: "bottom-centre", font: "serif-italic-wide"})` to the helper list.
- Pattern noticed: `@holler.academy`'s covers use the SAME layout skeleton and only change the mockup + headline. Their differentiation is **content**, not **layout**. This is a good reminder that **layout consistency + content variety** is the winning strategy for a template system — we should NOT proliferate cover templates, we should build ONE strong cover builder with content slots.

_Progress: 6 / 85 complete._

---

### others/image copy 6.png
**Pattern class:** other:reel-cover — teaches the "Hold & Scroll" carousel-transition IG feature.
**Overall vibe (1 line):** Same `@holler.academy` cover template family as images 3–5, but introduces two **new distinctive decorative primitives**: a hand-drawn pen-stroke curved arrow and a hand-drawn pink circle annotation highlighting a UI element on the mockup.

Layout family is identical to images 3–5 (peach pill + display headline + tilted mockup + body + CTA). I'll focus on the **new decorative elements** since the skeleton is already documented.

- **Canvas / bg / white card / peach pill:** identical to images 3–5. Metallic peach-beige gradient, white rounded card, peach pill straddling top edge. Pill text: `"VIRAL TREND"`.
- **Layout zones — deltas from image copy 3:**
    - Zone C headline (y≈120–390): `HOLD & SCROLL` — 2 lines, `HOLD &` on line 1, `SCROLL` on line 2, aligned **left** (not centred like other covers).
    - Zone D content:
        - **Left column** (x≈70–560, y≈390–1050): body copy + hand-drawn arrow doodle + italic-serif CTA — stacked vertically.
        - **Right column** (x≈530–1030, y≈420–1100): tilted iPhone mockup showing an IG post preview.
    - Layout has flipped: mockup on the **right**, text on the **left** (opposite of image copy 3 where mockup was left). Suggests the template accepts a `mockupPosition: "left" | "right"` prop.
- **Typography — deltas:**
    - Headline `HOLD & SCROLL`: same Inter Black / Söhne Black ~140 px, all-caps, **left-aligned**, tight line-height 1.0.
    - Body copy (2 short paragraphs, verbatim):
        - Paragraph 1: _"Use the new Instagram feature (where when you hold the carousel dots and swipe, the slides seamlessly transition)"_
        - Paragraph 2: _"to make cool stop motion posts just like this!!!"_
        - Sans-serif Regular ~44 px, line-height ~1.35, left-aligned, colour `#1B1B1B`.
    - CTA `"*Comment "TEMPLATE" for the Canva Link"`: same Playfair Display Italic Bold ~30 px, positioned bottom-left below the arrow doodle.
- **Decorative elements — NEW primitives:**
    - **Hand-drawn curved arrow (Zone D-left, y≈540–740):** a **pen-stroke doodle** of a curved arrow starting from below the body copy and swooping down-right, ending in an arrowhead pointing at the mockup. Colour: black `#000000` (or very dark grey). Stroke width appears variable (~3–5 px, thinner at ends, thicker in middle — like a real pen stroke). This is a **doodled illustration**, not a geometric SVG arrow. Feels hand-drawn on top of the layout.
        - **Fabric reproduction:** ship as a small PNG asset OR encode as an SVG path (a curved Bézier). Recommend PNG for authenticity — hand-drawn strokes have subtle inconsistency that's hard to reproduce with pure Bézier.
        - **Reusability:** doodled arrows are a canonical "casual/handmade" tutorial primitive. Ship a set: `arrow-curve-right`, `arrow-curve-left`, `arrow-swoop-down`, `arrow-underline`, `arrow-zigzag`, `arrow-loop`. Store in `backend/assets/doodles/`.
    - **Hand-drawn circle annotation (Zone D-right, on top of the mockup at y≈1030–1120):** a **rough hand-drawn oval/circle** in **pink/magenta ~ `#E85582`**, drawn around the mockup's carousel dot indicator at the bottom of the IG post preview. The circle is imperfect (looks like a marker or highlighter stroke) — traces around the dots but not quite closed.
        - Colour: pink `#E85582`.
        - Stroke width: ~5–6 px, marker-like feel.
        - Position: overlays the mockup (drawn on top, higher z-index).
        - **Fabric reproduction:** SVG path (rough ellipse) with `strokeLineCap: 'round'`, `strokeLineJoin: 'round'`, `fill: 'none'`. Or PNG.
        - **Reusability:** highlight-circle annotations are gold for **feature-callout templates** (tutorial slides pointing at a specific UI feature). Ship variants: `circle-pink`, `circle-yellow-highlighter`, `circle-double-loop`, `underline-marker`.
    - **Right-column mockup (Zone D-right):** a tilted (rotated ~+4°) IG post preview showing:
        - Top: IG post header with `holler.academy` handle + subtitle "Sartre (BE) · Body Language" (an IG boost-post preview UI).
        - Middle: the actual mocked slide — a photo of a scooter's side-mirror screen with a **torn-paper card overlay** showing `THIS IS A` in bold sans-serif + `Template` in italic Playfair-like script. The torn-paper edge is a **jagged white paper effect** — a new distinctive primitive.
        - Bottom: IG post footer with reaction icons (heart, comment, share, bookmark) and a **blue "Boost Post" button**.
        - The whole mockup has that "actual screenshot of IG post preview UI" feel — the "IG chrome" is baked into the image.
    - **Torn-paper card:** a new distinctive primitive — a white card with **jagged/torn top edge** (as if paper was ripped). Casts a subtle drop shadow onto the photo bg below. **Fabric reproduction:** the torn edge can be done with a `Path` primitive (jagged polyline as the top edge of a filled rect), OR ship as a PNG mask.
    - **Muted-speaker icon (bottom-right):** same as image copy 3.
    - **Dot indicator (bottom-centre):** 8 dots, 6th active.
- **Layering order:** `[metallic gradient bg] → [subtle grain] → [white card + shadow] → [peach pill] → [headline] → [body copy] → [hand-drawn arrow doodle] → [CTA text] → [mockup shadow] → [mockup image with baked-in IG chrome + torn paper card] → [hand-drawn pink circle annotation (top of stack)] → [muted-speaker icon] → [dot indicator]`.
- **Word count:** 2 pill + 3 headline + 30 body + 6 CTA = ~41 + baked-in mockup text (~5 words on torn paper). Cognitive load = **medium**.

#### Fabric.js reproduction notes
- Reuses same cover-template skeleton as images 3–5.
- **NEW helpers required (novel to this slide):**
    - `makeDoodleArrow({variant, angle, color, strokeWidth, size, x, y})` — SVG-path curved arrows. Ship a set of ~6 variants (curve-right, curve-left, swoop-down, underline, zigzag, loop) — encoded as SVG paths in `backend/assets/doodles/registry.json`.
    - `makeHighlightCircle({color, roughness, angle, width, height, x, y})` — hand-drawn-style oval annotation. Rough ellipse SVG path (with slight jitter for authenticity). Ship variants for pink, yellow-highlighter, red-marker.
    - `makeTornPaperCard({width, height, fillColor, tearEdge: "top" | "bottom" | "both", shadow})` — a white card with jagged edges. Torn edge is a computed polyline (Path primitive).
    - `makeIGPostChrome({handle, subtitle, showBoostButton, footerIcons})` — the IG post-preview UI: header + footer + boost button. Reusable across "template shown as IG post preview" mockups.
- **Font loading:** no new fonts beyond images 3–5.

#### Motion cue
- The doodled arrow **explicitly implies motion** — its curve suggests "look at the mockup". Highly effective for tutorial-narrative direction.
- Hand-drawn annotations mimic a Pinterest-style "someone scribbled on top of this" feel — casual, personal, high-approachability.

#### IG safe-zone check
- Peach pill top at y≈50 — inside top 200 px avatar-bar zone. Same issue as images 3–5.
- Body copy safe.
- Hand-drawn circle at y≈1050–1120 — just above the 1170 px bottom risk line. Safe.

#### Reusability score
- **Doodle arrow + highlight circle primitives:** 5/5 — these are enormously reusable across tutorial / callout / annotated-example templates. Should be standard helpers in the library.
- **Torn-paper card:** 4/5 — great for magazine-style scrapbook templates.
- **The "Hold & Scroll" specific template:** 3/5 — the IG-feature-callout format is useful for "tips" but somewhat niche.

#### Template pattern classification (final)
- General cover family: **`aurora-carousel-cover-hero`** (same as images 3–5).
- New callout template proposal: **`aurora-compact-feature-callout`** — a specialised template for pointing at a specific UI feature. Uses `makeHighlightCircle` + `makeDoodleArrow` on top of a screenshot. Phase 4.
- **Pattern recognition consolidating from images 3–6:** The @holler.academy cover template is **highly parameterised**: pill category, headline (1–2 lines, left or centre), body (1–3 paragraphs), mockup (position: left|right, type: phone|paper|calendar|screenshot), optional doodles/annotations (arrow, circle), and CTA. ONE builder should handle all four variations.

#### Copy-pattern hint (LLM writer)
- Headline: 2–3 words, ALL CAPS, imperative verb + object ("HOLD & SCROLL", "TAP TO ZOOM", "SWIPE UP", "PINCH IN").
- Body: 15–35 words, one long sentence + one short punchy sentence.
- Doodled arrows are typically used to **direct attention** to a mockup or highlighted element — the writer can specify `annotation: {type: "arrow", target: "mockup"}` in the slide spec.

#### Notes / open questions
- **Doodled elements bring huge personality** — the hand-drawn arrow + circle are what make `@holler.academy`'s covers feel warm and personal vs. cold and corporate. **Strongly recommend investing in a doodle asset library** as part of Phase 2 or Phase 4.
- The **torn-paper card** overlay (with the "Template" text) is a canonical "handmade texture" primitive — worth including in the compact template family for hooks and quotes where a scrapbook feel adds warmth.
- Recurring observation: the mockup's **actual mock IG chrome** (post header + footer + boost button) shows how "post-inside-a-post" annotated examples work in practice. Confirms the `makeIGPostChrome` helper is high-value.

_Progress: 7 / 85 complete._

---

### others/image copy 7.png
**Pattern class:** other:reel-cover — teaches an "iMessage emoji-picker vibe check" trending animation.
**Overall vibe (1 line):** Same `@holler.academy` cover template family (peach pill + huge headline + tilted phone mockup + right-column body + italic CTA), now featuring an **iMessage screenshot** as the mockup and a **cloudy pink phone wallpaper** — dreamy, casual.

Same skeleton as images 3–6. Deltas only:

- **Pill (Zone A):** `"VIRAL ANIMATION"` — peach pill, same styling.
- **Headline (Zone C):** `WHAT'S THE VIBE` — 2 lines (`WHAT'S` / `THE VIBE`), Inter Black ~140 px, all-caps, centred. Note the **curly apostrophe in "WHAT'S"** — the display type must handle typographic quotes.
- **Left mockup (Zone D-left, tilted ~-6°):** iPhone iMessage screen:
    - Top: iOS status bar with time `10:36`, cellular/wifi/battery icons, and an iMessage conversation header (avatar + name).
    - Middle: 2 blue iMessage bubbles + one grey reply bubble containing text like "Hey, what's the vibe today?" and "hold on, let me make a playlist".
    - Bottom: **emoji picker keyboard** open, showing a 5-column grid of colourful emoji (birthday cake, gift, party ball, cocktail, sun, bag, shopping bag, present, etc.) — this is Apple's native iOS emoji-picker UI.
    - Background wallpaper: **soft pink cloudy sky** — a dreamy pastel photograph as the phone wallpaper visible around the iMessage frame.
    - Mockup casts a drop shadow (offset y≈12 px, blur≈24 px, `#00000030`).
- **Right column (Zone D-right, y≈360–1100):** 2-paragraph body copy in sans-serif Regular ~44 px, left-aligned:
    - Paragraph 1 (verbatim): _"Use this fun trending animation to share the vibe, mood or what you felt like doing today!"_
    - Paragraph 2 (verbatim): _"Follow it with clips of your day for even more impact!"_
- **CTA (Zone E, y≈1150, centred spanning full card width):** `"*Comment "TEMPLATE" for the Canva Link"` — italic Playfair, ~32 px. Position **differs from image copy 3** (which had CTA centred BELOW the card); here it's inside the card at the bottom, centred, spanning both columns. Reinforces the **`ctaPosition` variability** across cover templates.
- **Muted-speaker icon (bottom-right):** same as image copy 3.
- **Dot indicator (bottom-centre):** 9 dots, 6th active.

#### Fabric.js reproduction notes
- **NEW distinctive element — iMessage mockup:** an iPhone-screen mockup with:
    - Phone wallpaper photo (`FabricImage`).
    - iOS status bar (built with primitives OR a small PNG asset).
    - Message conversation bubbles: rounded rects with tail (blue for outgoing, grey for incoming).
    - Emoji picker keyboard: PNG asset (too complex to Fabric-build) with the search bar + 5-column emoji grid + tab strip at bottom.
    - `makeIMessageMockup({wallpaperUrl, statusBarTime, messages, emojiPickerOpen})` — reusable, high-value for lifestyle-content templates.
- Confirms the recurring pattern: **each mockup type deserves its own helper** (`makePhoneMockup` is too generic; specialise to `makeIMessageMockup`, `makeCalendarMockup`, `makeReelMockup`, etc.).

#### Motion cue
- The emoji picker suggests "text-and-emoji" motion — a Reel where the emoji picker opens and the user picks emojis to answer the "what's the vibe" question. Very trend-driven, playful.

#### IG safe-zone check
- Same as images 3–5: pill inside top 200-px zone; consider pushing pill down for production.
- CTA at y≈1150 is inside the 1170-px bottom risk zone by a hair. Bring up 30 px.

#### Reusability score
- 4/5 for the general cover template family (same as prior).
- 3/5 for the specific iMessage variant — useful for chat-format content types (Q&A, dialogue, therapy jokes, etc.).

#### Template pattern classification (final)
- General: **`aurora-carousel-cover-hero`**, same builder, `mockupType: "imessage"`.
- Specific: **`aurora-cover-imessage-mockup`** — Phase 4/5.

#### Copy-pattern hint (LLM writer)
- Headline: 2–4 words, ALL CAPS, question or curiosity hook ("WHAT'S THE VIBE", "GUESS WHAT", "TELL ME WHY", "HERE'S THE TEA").
- Body: 15–35 words, invites the reader to fill in the blank (i.e., participate).

#### Notes / open questions
- Rapid pattern consolidation: images 3, 4, 5, 6, 7 all share the SAME cover template, differing only in mockup content and headline. Confirms the ONE-builder-with-slots approach.
- The **iMessage emoji picker keyboard** is a UI element viewers will recognise instantly — the mockup does 80 % of the storytelling.

_Progress: 8 / 85 complete._

---

### others/image copy 8.png
**Pattern class:** other:trend-brief (a structured content-strategy "trend breakdown" template).
**Overall vibe (1 line):** Clean editorial newsletter-style content brief — deep teal serif headings, cream background, left phone mockup + right 3-section explainer. **Distinct creator, distinct template family** from images 3–7 (`@holler.academy`).

This slide breaks the @holler.academy pattern entirely — no peach pill, no display-black headline, no italic CTA. It's a **content-brief format** (What's the Trend? / How to create? / Why should I use it?) — the kind of educational newsletter you'd find in a content-creator subscription. New creator, new template family.

- **Canvas:** 1080×1350 assumed.
- **Background:**
    - Full flat fill of soft **cream / off-white** `#F5EFE4` (approx) — no metallic gradient, no grain, no photo. Very clean editorial neutral.
- **Layout zones (top → bottom):**
    - Zone A (y≈70–200): centred **serif headline** `2026 Punch Cards` — colour deep teal `#1E4B4B` (approx).
    - Zone B (y≈200–1250): 2-column layout:
        - **Left column (x≈70–450, y≈220–1200):** **large iPhone mockup** with realistic phone frame (rounded, black bezel, rounded corners ~40 px), containing a portrait video/Reel of hand-held physical punch-cards on a desk (screen-free-days card with punched-out circles in a 3×3 grid). Right side of phone screen shows Instagram Reel action icons (bolt, plus, message, profile). Bottom of phone screen shows IG's tab bar (home, reels, plus, msg, profile).
        - **Right column (x≈470–1030, y≈220–1200):** 3 stacked content sections:
            - **Section 1 (y≈220–420):** heading `"What's the Trend?"` + 5-line body copy.
            - Thin hairline horizontal rule between sections (~1 px, `#B5A990` warm-taupe).
            - **Section 2 (y≈470–800):** heading `"How to create:"` + 7-line body copy.
            - Thin hairline horizontal rule.
            - **Section 3 (y≈850–1100):** heading `"Why should I use it?"` + 3-item bulleted list (bullets are round dots).
    - Outer padding: ~70 px left/right.
- **Grid & alignment:** 2-column, gutter ~20 px. Left column: single hero (phone). Right column: 3 stacked text sections separated by horizontal rules. All right-column content is left-aligned.
- **Typography:**
    - **Top headline `"2026 Punch Cards"` (Zone A):** serif, weight 500 or 600 (semibold), ~72 px, `#1E4B4B` (deep teal — brand accent colour). Alignment centred. Font candidate: **Playfair Display**, **Cormorant Garamond**, **Fraunces**. Not italic here — regular upright serif.
    - **Section headings ("What's the Trend?" etc.):** same serif family, semibold, ~40 px, same deep teal `#1E4B4B`. Left-aligned.
    - **Body copy:** sans-serif Regular, ~30 px, `#3A3A3A` (dark charcoal, not pure black), line-height ~1.4, left-aligned. Font candidate: **Inter Regular**, **Söhne Regular**, **Plus Jakarta Sans Regular**.
    - **Bulleted list items:** same sans-serif Regular, ~30 px, with bullet character `•` at ~30 px, indent ~30 px from left edge.
    - Verbatim content:
        - Section 1 body: _"Create 2026 goals through punch cards. A fresh and creative approach to goal/resolution setting."_ (16 words)
        - Section 2 body: _"Map out little cards; you do not need to be an artist to do this - it can be scrappy. Opportunity to make it funny and highlight your brand."_ (30 words)
        - Section 3 bullets:
            - `Videos are going very viral`
            - `Timely`
            - `Brands can execute`
- **Decorative elements:**
    - Two **thin hairline horizontal rules** between the 3 right-column sections. Colour: warm taupe `#B5A990` (approx), ~1 px thick, ~380 px wide.
    - **iPhone mockup:** photorealistic phone frame (rounded rect with black bezel), containing a photo/video of physical paper punch-cards on a desk with circles punched out (an IRL demo of the trend the slide is teaching).
    - No emoji, no icons, no doodles, no stickers — very restrained editorial style.
- **Layering order:** `[cream bg fill] → [top headline] → [phone bezel] → [phone screen content (video/image)] → [right-column headings + body + rules + list]`.
- **Shadows & effects:** No visible shadows on the phone mockup (or very subtle). No grain, no gradient. Extremely clean.
- **Brand markers:** None visible on this slide — no wordmark, no handle, no page indicator. Suggests this is either an internal-facing brief OR the creator's brand marker appears only on the cover slide.
- **Word count:** 3 headline + 46 body across sections + 8 bullet list = ~60 words. Cognitive load = **medium-high** — this is a dense information slide (deliberately so, for a "brief" format). Reader is expected to spend 30-60 seconds reading.

#### Fabric.js reproduction notes
- **Cream flat bg:** `Rect` with `fill='#F5EFE4'`. Trivial.
- **Serif heading:** `Textbox` with **Playfair Display Regular / Semibold** (~72 px), colour `#1E4B4B`. Need to confirm Playfair supports non-italic variant in our renderer stack — likely yes when we add Playfair Display to `renderer_entry.ts`.
- **Section-heading + body + rule + list template block:** highly repeatable — bake as a helper.
    - `makeSectionBlock({heading, body, listItems, headingColor, ruleColor, ruleWidth, gapAbove, gapBelow})` — one section = heading (serif teal) + body (sans-serif charcoal) OR bullet list. Multiple `makeSectionBlock` can be stacked with rule dividers between.
- **iPhone mockup:** a rectangle with rounded corners + black bezel + full-bleed image content + IG-Reel-UI icons overlaid on the right side.
    - Would need: `makeIPhoneMockup({content, screenType: "reel" | "post" | "story" | "app", showIGChrome})`.
    - Ship the phone bezel as a PNG asset (photorealistic Apple bezel with camera cutout) — much easier than Fabric-composing it.
    - The IG-Reel-UI right-column icons (bolt / plus / message / profile) can be part of the mockup PNG OR overlaid as separate small SVG icons.
- **Hairline rule:** `Line` primitive, thin stroke `#B5A990`, `strokeWidth = 1`.
- **New helpers required:**
    - `makeSectionBlock` — as described. High-value for content-brief / trend-briefing templates.
    - `makeIPhoneMockup({content, screenType, showIGChrome, tilt: 0})` — reusable phone-frame element without tilt (this template has no tilt, unlike @holler.academy's mockups).
    - `makeVerticalContentBrief({sections})` — the whole right-column stack: array of `SectionBlock` items, rule dividers auto-inserted between.
- **Font loading:** `Playfair Display Regular + Semibold` (needed for headings) + Inter/Plus Jakarta for body. Both already flagged.

#### Motion cue
- No implied motion — this is a static, editorial content-brief slide. Reader is expected to pause, read the 3 sections in order, then scroll away.

#### IG safe-zone check
- Headline at y≈70–200 — **inside** the top 200 px avatar-bar zone. The `2026 Punch Cards` text may be partially obscured by IG's UI. Consider pushing headline down to y≥220.
- Section 3 bulleted list at y≈900–1100 — safe from bottom risk zone.
- Overall, tighter safe-zone respect than @holler.academy covers (which push pill deep into the top zone).

#### Reusability score
- 5/5 — this "trend brief" template is highly reusable for any creator/newsletter that unpacks trends, techniques, or how-tos. Directly applicable to educational content on any topic.

#### Template pattern classification (final)
- Proposed key: **`aurora-trend-brief`** — a 2-column brief-style slide with left phone mockup + right sectioned Q&A stack.
- Belongs to a **new template family** distinct from the compact-family AND the cover-family. Could be Phase 4 or Phase 5.
- The right-column "3 stacked sections with headings + rules" pattern is **super versatile** — reusable across trend briefs, editorial reviews, how-to guides, product one-pagers.

#### Copy-pattern hint (LLM writer)
- Top headline: 2–5 words, noun phrase (usually the trend name or topic).
- Section 1 heading: `"What's the Trend?"` (or generic "The Topic", "The Idea", "Definition").
- Section 1 body: 15–25 words defining the trend/concept.
- Section 2 heading: `"How to create:"` (or "How-to", "The Steps", "The Method").
- Section 2 body: 25–40 words explaining the how-to.
- Section 3 heading: `"Why should I use it?"` (or "Why it works", "The Benefits").
- Section 3 body: 3–5 bulleted items, ≤ 5 words each.

#### Notes / open questions
- **New creator, new brand system.** The deep-teal + cream + serif + upright-editorial aesthetic is completely different from @holler.academy's peach-metallic + black-display + tilted-mockup aesthetic. Suggests we should support **multiple template families** with distinct colour + type + composition systems. Not a bug — an intentional feature.
- The **"3 sections separated by hairline rules" pattern** is a canonical editorial device. Include as `makeSectionStack` — highly reusable across `aurora-list`, `aurora-fact`, `aurora-trend-brief`, `aurora-recap` templates.
- The **iPhone mockup here has NO tilt** (unlike @holler.academy's -6° tilt). Reinforces the `mockupTilt` parameter should be freely settable per template.
- The right-column bulleted list is very restrained — no emoji, no icons, just typographic bullets `•`. This is a "serious editorial" mood; different creators may prefer emoji-checklists or icon-lists.

_Progress: 9 / 85 complete._

---

### others/image copy 9.png
**Pattern class:** other:trend-brief — same template family as image copy 8.
**Overall vibe (1 line):** Same trend-brief template as `image copy 8`, now with an **italic-serif ellipsis headline** and a Reel featuring a "Never Have I Ever" IG text-overlay meme.

Same skeleton as image copy 8. Only deltas:

- **Headline (Zone A):** `"You know I did that..."` — same deep teal `#1E4B4B` serif, but **italic** (unlike image copy 8's upright serif). Note the **ellipsis** `...` — trailing punctuation is a common trigger for AI copy-review edge cases.
    - Confirms the serif family is used in both **regular** and **italic** cuts — worth loading both in `renderer_entry.ts`.
    - Font weight looks slightly heavier here — maybe SemiBold Italic vs. Regular in image copy 8.
- **Phone mockup content (Zone B-left):** a Reel showing:
    - A young woman with a **ponytail** in a white top holding up **four fingers** (from the "Never Have I Ever" viral game).
    - **Text overlay stamped on the Reel** in a **hot-pink display font with white outline / drop shadow**:
        - _"Never Have I Ever Gave A Client A Discount Just Because She Was Fun During Her Appointment 😂😂"_
        - Font: **display sans-serif, bold, all-caps or title-caps, hot pink `#E85582` fill with white text-outline**.
        - Two crying-laughing emoji at end.
    - This text-overlay is the **actual Reel content** — the mockup shows how the trend looks in practice.
- **Right column sections (verbatim body copy):**
    - Section 1 `"What's the Trend?"`: _"Text overlay of something you do/have done, while using the viral sound. Creators are using this sound to showcase something they do/have in a funny way."_ (29 words)
    - Section 2 `"How to create:"`: _"Film a video putting one of your fingers down using the viral sound, and add text overlay with "Never have I ever ---""_ (23 words)
    - Section 3 `"Why should I use it?"` (2 bullets):
        - `A fun way to showcase a unique or funny aspect about yourself/your brand`
        - `Best to incorporate humour with this trend`
- Same hairline rules, same colour palette, same body copy typography as image copy 8.
- Same phone mockup style (large, no tilt, black bezel, IG Reel UI baked in).

#### Fabric.js reproduction notes
- **NEW distinctive element — Reel text-overlay stamped on video:**
    - The Reel video has a **hot-pink display-font text overlay** with white text-outline stroke — this is a common IG Reel styling.
    - **`makeReelTextOverlay({text, fillColor, strokeColor, strokeWidth, font, position, tilt})` — new helper** for reproducing IG-Reels-style stamped captions.
    - Fabric v7 supports text stroke via `stroke` + `strokeWidth` + `paintFirst: 'stroke'` (so the fill draws over the stroke).
- Everything else reuses image copy 8's helpers.
- **Font loading:** Confirmed Playfair Display **both Regular AND Italic** needed (upright in image copy 8, italic here).
- **NEW font consideration:** the hot-pink Reel-caption font is a distinctive display sans (looks like **Anton**, **Impact**, or **League Spartan Bold**) — bold, condensed-ish, tight. Worth adding a **condensed bold display sans** to the font stack for Reel-style text overlays.

#### Motion cue
- The 4-fingers-up "counting down" gesture from the "Never Have I Ever" game — implies motion / countdown. The Reel would have the woman putting a finger down each beat.

#### Reusability score
- 5/5 for the template (same as image copy 8).
- The Reel-text-overlay pattern is 5/5 reusable — any viral-caption or on-video-text template.

#### Template pattern classification (final)
- Same: **`aurora-trend-brief`** — confirmed as a repeatable template within the "Creator's Playbook" family.
- The `makeReelTextOverlay` helper is a strong candidate for **Phase 2 or Phase 4** — it's a distinctive Reel-style element that could be reused across many templates (annotated screenshot templates, meme-caption templates, "did you know" fact templates).

#### Copy-pattern hint (LLM writer)
- Headline: casual first-person conversational phrase, trailing ellipsis or exclamation ("You know I did that...", "Wait, watch this!", "Guess what I saw...", "Bet you didn't know...").

#### Notes / open questions
- The "..." trailing ellipsis is a stylistic tell of this creator/template. Suggests the LLM copy-writer should have **an "ellipsis-friendly voice" mode** as an option when generating trend briefs.
- **Two images from same creator (image copy 8, 9) means this is a real templated series** — probably a paid content-strategy newsletter or subscription resource. Very high validation that the `aurora-trend-brief` builder is a real product need.

_Progress: 10 / 85 complete._

---

### others/image copy 10.png
**Pattern class:** other:trend-brief — same template as image copy 8 & 9.
**Overall vibe (1 line):** Third confirmed use of the `aurora-trend-brief` template — this time the Reel shows a physical paper poster stapled to a lamppost/utility pole.

Same skeleton as image copy 8–9. Confirms the template is used across multiple creator entries. Quick deltas only:

- **Headline (Zone A):** `"Poster Trend"` — same deep teal `#1E4B4B` serif, upright (like image copy 8, not italic like image copy 9). Note the word "Trend" is a common noun in this creator's headline vocabulary.
- **Phone mockup content (Zone B-left):** a Reel of a **printed white poster** (paper flyer) stapled to a utility pole in an outdoor urban scene. Poster shows:
    - Headline: `"Become a Beem member to get $400, and you could win $10,000!"` (in a chunky black serif).
    - Small legalese-looking body text below.
    - `BEEM` brand mark at bottom (bold sans-serif).
    - Blue vertical stripes on each side of the poster (design flourish).
- **Right column sections (verbatim):**
    - Section 1 `"What's the Trend?"`: _"Putting up a poster then editing it around in various spots."_ (10 words — shortest of the three trend-briefs so far)
    - Section 2 `"How to create:"`: _"Film an initial clip putting up a poster, and take a photo of the poster. Then, using an editing tool like Canva or Capcut, edit the picture of the poster onto various backgrounds."_ (33 words)
    - Section 3 `"Why should I use it?"` (3 bullets):
        - `Great way to showcase an offer`
        - `Eye catching`
        - `Low-lift`
- Everything else identical to image copy 8: cream bg, hairline rules, deep teal serif, sans body, no doodles, no tilted mockup, no brand mark.

#### Fabric.js reproduction notes
- No new helpers required. Fully served by the `aurora-trend-brief` builder proposed in image copy 8's notes.
- **Confirmation:** 3 slides using the same template with completely different topics/creators-of-Reel-content → the "trend brief" template genuinely reusable. Elevate `aurora-trend-brief` to a **top-priority Phase 4** template (after the compact-family core in Phase 2).

#### Motion cue
- No implied motion — same static editorial newsletter feel as image copy 8.

#### IG safe-zone check
- Same as image copy 8: headline near top edge is inside the risk zone; the rest is safe.

#### Reusability score
- 5/5, confirmed by third instance.

#### Template pattern classification (final)
- **`aurora-trend-brief`** — confirmed canonical builder. Structure: `{ topHeadline, phoneMockup, sections: [{heading, body|bullets}] }`. Sections auto-separated by hairline rules.
- Related idea: build a **`aurora-brief-generic`** builder that generalises the trend-brief structure to ANY 3-section editorial layout (what/how/why, benefits/risks/action, before/during/after). The phone mockup is optional.

#### Copy-pattern hint (LLM writer)
- Headline: 2 words, format = `"[Topic] Trend"` or `"The [Topic] Method"` (short editorial noun-phrase).
- Section 1: 10–20 words (definition/overview).
- Section 2: 25–40 words (step-by-step how).
- Section 3: 2–4 bullets, each ≤ 5 words.

#### Notes / open questions
- **CTA is absent** across all 3 trend-briefs. This creator style does not use lead-magnet CTAs. Confirms the LLM writer should NOT force a CTA into every template — the `hasCTA` flag should be per-template configurable.
- The 3 trend-brief slides confirm this is a **template SERIES** — each slide unpacks one trend in the same format. This is a common carousel pattern: N slides × same template × different content = a themed "digest" carousel. Our system should support **series generation** (all N slides use the same template) as a first-class product feature, not just template-per-slide.

_Progress: 11 / 85 complete. Folder 1 (others/) COMPLETE._

---

## Folder 2 — SahilBloom/ (11 images)

**Folder-level baseline (applies to all SahilBloom slides unless noted):**

This is one clean editorial template family used consistently across the 11 slides of a `@Sahil Bloom` carousel. Establishing the baseline once here so subsequent slides can be documented by deltas only.

- **Overall brand identity:** minimalist book-page / Wall-Street-Journal editorial. Warm cream background, classical serif body copy, black-and-white **hedcut/engraving illustrations**, no colour accents, no metallic gradients, no doodles. Highly restrained, "adult professional" mood.
- **Canvas:** 1080×1350 (portrait 4:5).
- **Base background:** flat cream `#F3ECD8` (approx) — warm, slightly yellow-tinged, no grain visible.
- **Top eyebrow band (y≈15–55):**
    - Thin **hairline horizontal rule** spanning full canvas width (~1 px, dark grey `#3A3A3A`).
    - Top-left: handle `@Sahil Bloom` — italic serif, ~28 px, `#1B1B1B`.
    - Top-right: chapter/section title `The 5 Types of Wealth` (or similar) — italic serif, ~28 px, `#1B1B1B`. Serves as **series identity marker**.
- **Body typography:** Classical serif (candidates: **Playfair Display Regular**, **Cormorant Garamond**, **Fraunces**, **Cardo**). Body always **centred**, ~40–52 px, `#1B1B1B`, line-height ~1.35.
- **Hero illustration:** black-and-white **etched illustration** in the WSJ "hedcut" or vintage-encyclopedia woodcut style (dense cross-hatching, tonal shading built up from ink strokes). Subject varies per slide but style is consistent.
- **Bottom navigation pill (y≈1100–1170):** rounded-pill button, ~250 × 60 px, cream fill matching bg with thin dark border, containing text `Swipe for more>>` in small sans-serif or serif, centred.
- **Bottom dot indicator (y≈1200–1220):** row of ~15–20 tiny dots, centred, with the current-slide dot filled darker — same as IG's own carousel indicator, decorative here.
- **Paddings:** ~120 px left/right for body text; ~60 px left/right for header eyebrow band.
- **No decorative shapes, no coloured accents, no emoji, no CTAs, no photo backgrounds. The illustration IS the visual accent.**

Individual analyses below focus on deltas: illustration subject, body copy verbatim, and any distinctive features.

---

### SahilBloom/image.png
**Pattern class:** hook + editorial-illustration (cover / opener slide).
**Overall vibe (1 line):** SahilBloom's signature editorial cover — cream bg, centred serif hook body copy, black-and-white etched engagement-ring illustration, WSJ book-page aesthetic.

- **Canvas:** 1080×1350.
- **Background:** cream `#F3ECD8`, flat, no grain.
- **Layout zones:**
    - Zone A (y≈15–55): top eyebrow band — hairline rule + handle left + series title right (see folder baseline).
    - Zone B (y≈130–420): 2 stacked body paragraphs, centred serif.
        - Para 1 (y≈130–260): _"Over the last year, I asked couples who have been married 50+ years what advice they'd give to their younger selves."_ (23 words, 3 lines).
        - Para 2 (y≈310–410): _"Here's the relationship advice everyone needs to hear:"_ (8 words, 2 lines).
    - Zone C (y≈470–1050): centred **black-and-white etched engraving illustration** of an **open velvet-lined ring box with a diamond engagement ring** sitting inside. Approx 500 × 500 px, positioned dead-centre horizontally.
    - Zone D (y≈1090–1160): `Swipe for more>>` pill button, centred.
    - Zone E (y≈1200–1220): dot indicator (11-ish dots, first active), centred.
- **Grid & alignment:** single-column, centred throughout except eyebrow (which has left + right corners).
- **Typography:**
    - Eyebrow handle (top-left) `@Sahil Bloom`: italic serif, ~28 px, `#1B1B1B`. Handle name feels like **Playfair Italic** or **Cardo Italic** — high-contrast letterforms.
    - Eyebrow series title (top-right) `The 5 Types of Wealth`: italic serif, ~28 px, `#1B1B1B`. Same family as handle.
    - Body paragraph 1: serif Regular (upright), **~44 px**, line-height ~1.35, centred, `#1B1B1B`. Font: **Playfair Display Regular** or **Cardo Regular** — the letterforms have the elegant high-contrast quality of Playfair.
        - Contractions: `they'd` — smart apostrophe (`'`).
    - Body paragraph 2: same font, **~44 px**, centred, `#1B1B1B`. Trailing colon `:` implies "list follows" — the next slide will begin the advice.
    - Pill button `Swipe for more>>`: sans-serif or serif, ~24 px, centred, dark charcoal on cream. Note the **double angle-bracket `>>`** as directional cue.
- **Decorative elements:**
    - **Etched ring-box illustration:** black-and-white line art in vintage engraving style. Ring box open, showing a raised velvet cushion with a diamond solitaire ring sitting on top. Diamond has geometric facets. Ring box has visible cross-hatching for the exterior fabric. Feels like a book plate from a 19th-century catalogue. Colour: pure black `#000000` on cream bg — no other tones.
        - Illustration source is likely custom-drawn (or licensed hedcut-style). Not vector, likely rendered from a bitmap engraving.
    - Top hairline rule: `#3A3A3A` or `#1B1B1B`, ~1 px, spans x=0 to x=1080.
    - Pill button: rounded rectangle, ~250 × 60 px, radius=height/2, fill `#F3ECD8` (matches bg — so it's outlined-only), thin stroke `#1B1B1B` at ~1.5 px.
    - Dot indicator: 11+ tiny dots (~5 px each), first filled dark, rest faded — hard to count exactly.
- **Layering order:** `[cream bg fill] → [top hairline rule] → [eyebrow text left + right] → [body para 1] → [body para 2] → [ring-box illustration] → [pill button] → [dot indicator]`.
- **Shadows & effects:** NONE. This is deliberately flat, no shadow, no gradient, no grain. Total minimalism.
- **Brand markers:**
    - `@Sahil Bloom` handle top-left (always).
    - Series title `The 5 Types of Wealth` top-right — this is his book title, appears on every slide as a book-chapter reference.
    - `Swipe for more>>` pill is the standard navigation cue on every slide.
- **Word count:** 31 words in body + 6 words in header + 3 words in button = ~40 words. Cognitive load = **medium-low** — body reads like the opening paragraph of an editorial essay.

#### Fabric.js reproduction notes
- **Cream flat bg:** `Rect` with `fill='#F3ECD8'`.
- **Top hairline rule:** `Line({x1:0, y1:35, x2:1080, y2:35, stroke:'#3A3A3A', strokeWidth:1})`.
- **Eyebrow text left + right:** two `Textbox` objects, positioned at `left=60, top=15` and `right=60, top=15`. Right alignment via `originX='right'`.
- **Body paragraphs:** two centred `Textbox` objects with `fontFamily='Playfair Display'`, `fontSize=44`, `textAlign='center'`, `fill='#1B1B1B'`, `lineHeight=1.35`.
- **Etched illustration:**
    - Ship as **PNG asset** (source: commissioned illustrations, or generated by an AI-art model like Midjourney with the prompt style "vintage etched engraving, black and white, hedcut illustration, WSJ style, clean cross-hatching, isolated on white bg, [subject]"). This is a **critical asset category** — SahilBloom's brand is inseparable from this illustration style.
    - Placeholder for our AI-image pipeline: recommend fine-tuning our AI-image-gen prompt to produce this exact style. Or ship a **curated library of ~30 pre-generated etched illustrations** covering common topics (relationships, business, money, health, family, etc.).
    - `makeEtchedIllustration({subject|prebuiltKey, size, position})` — helper.
- **Pill button:** `Rect` (rounded) + `Textbox` centred. `makeOutlinedPill({text, borderColor, textColor, size})` — reusable "Swipe for more" or generic outline-pill helper.
- **Dot indicator:** `makeDotRow(count=11, activeIndex=0)` — same helper as image 1 in `others/`.
- **New helpers required:**
    - `makeEtchedIllustration({subject|prebuiltKey, size, position})` — the critical WSJ-style B&W illustration.
    - `makeEditorialHeader({leftHandle, rightSeries, ruleWidth, ruleColor, font, size, color})` — the top eyebrow band with hairline rule + 2 text corners.
    - `makeOutlinedPill({text, textColor, borderColor, borderWidth, radius, padding})` — the swipe-hint pill.
    - `makeBodyStack({paragraphs, font, size, lineHeight, spacing, color})` — for stacked centred serif paragraphs. Reusable across all book/newsletter templates.
- **Font loading:** **Playfair Display Regular + Italic** confirmed (was already flagged in others/). May want to test also **Cardo** or **Cormorant Garamond** for a more book-like feel — Playfair's high contrast might look too "fashion" and less "editorial" than desired.

#### Motion cue
- No motion cues. This is deliberately still and reflective — matches the tone of "advice from couples married 50+ years".
- The `Swipe for more>>` pill is the only forward cue.

#### IG safe-zone check
- Top eyebrow at y≈15–55 — **inside** the 200 px avatar-bar zone. However, this is essentially breadcrumb-brand text that's OK to be partially obscured (the reader still gets the value). But for a production template, consider pushing to y≥220.
- Body at y≈130–420 — top of para 1 near the safe boundary. Slight risk.
- Ring illustration centred — safe.
- Pill button + dot indicator at y≈1090–1220 — safe from 1170-px CTA overlay by a small margin. Pill is fine; dot indicator sits at y≈1210 which is inside the risk zone but is decorative.

#### Reusability score
- **5/5** for the template — SahilBloom's cover format is one of the most iconic editorial-carousel formats on Instagram. Endlessly reusable for essay-style content: relationships, money, career, health, family, learning, philosophy.

#### Template pattern classification (final)
- Proposed key: **`aurora-editorial-cover`** — a canonical "editorial book-page cover" template. Structure: `{topEyebrow: {handle, seriesTitle}, bodyParagraphs, illustration, navPill, dotIndicator}`.
- **HIGH PRIORITY** for Phase 4 (or Phase 2 if we want a "no-doodles, no-icons, purely editorial" template family alongside the `@holler.academy` cover). Suitable audience: thought-leaders, essayists, business-content creators.
- Related keys for series continuity:
    - `aurora-editorial-list-item` (list points using same header + illustration + serif style)
    - `aurora-editorial-quote` (pull quote with same header)
    - `aurora-editorial-fact` (data point with same header)
    - `aurora-editorial-outro` (final slide with same header, tagline + CTA)

#### Copy-pattern hint (LLM writer)
- Body paragraph 1 formula: `"[Time-frame], I [action] [audience] [subject]."` — sets up the essay's provenance.
- Body paragraph 2 formula: `"Here's [what you'll learn]:"` — colon signals the list to follow.
- Verbal style: **first-person authoritative, warm, essayistic**. NO exclamation points, NO emoji, NO ALL-CAPS emphasis. This is grown-up voice.
- Series title top-right: usually the creator's book/newsletter/course name.

#### Notes / open questions
- **The etched-illustration style is the make-or-break asset for this template family.** Without a way to generate/source these consistently, we can't ship the template convincingly. **Highest-priority decision:**
    1. Commission a library of ~30 topic-tagged illustrations (professional illustrator, ~$20–50 each, ~$600–1500 total).
    2. Fine-tune an AI-image-gen model on WSJ hedcuts.
    3. Prompt-engineer Midjourney/DALL-E with a strict style prompt to produce reliably.
    Recommend a **hybrid**: 10 commissioned + prompt-engineered fallback for the long tail.
- The **series title top-right** implies a **book/newsletter branding system**. Our schema should carry a `series_title` field per carousel run — a subtle metadata detail that reinforces brand across every slide.
- Playfair vs. Cardo vs. Cormorant: worth an **A/B test in Loop 3** — different Google-Fonts serifs produce meaningfully different "editorial voice" moods. Playfair = fashion / high-contrast. Cardo = book / academic. Cormorant = wedding-invitation / romantic. This slide feels most like **Playfair or Cormorant** — but for a business/wealth topic, Cardo may be more appropriate.

_Progress: 12 / 85 complete._

---

### SahilBloom/image copy.png
**Pattern class:** list-item (numbered list, 4-item variant).
**Overall vibe (1 line):** SahilBloom's editorial numbered-list variant — same book-page cream/serif system as cover, but 3-column-per-row layout (number + body + etched icon), 4 items stacked vertically.

- **Canvas:** 1080×1350.
- **Background:** cream `#F3ECD8`, flat — same as cover.
- **Layout zones:**
    - Zone A (y≈100–1200): **4 stacked list items**, each occupying ~275 px vertical space (rows evenly spaced).
    - Each row = **3 horizontal columns**:
        - **Col 1** (x≈45–125, ~80 px wide): numbered circle badge — outlined thin dark circle with a number inside.
        - **Col 2** (x≈145–740, ~600 px wide): body text, **justified** (fills column left-to-right).
        - **Col 3** (x≈760–1040, ~280 px wide): small etched icon-illustration, ~220 × 200 px.
    - Zone B (y≈1240–1290): **bottom eyebrow band** (mirror of the top eyebrow on the cover slide).
        - Thin hairline horizontal rule spanning canvas width.
        - Below rule: dot indicator centred (11+ dots, 2nd active) + handle bottom-left `@Sahil Bloom` + series title bottom-right `The 5 Types of Wealth` (italic serif).
    - **Note:** the eyebrow band position has shifted from TOP (cover) to BOTTOM (list slide). This is a canonical variant — top eyebrow on covers, bottom eyebrow on interior list slides. Both use the same components.
    - Outer padding: ~40 px left/right for content; ~60 px inset for the eyebrow.
- **Grid & alignment:** 3-column horizontal grid per row. Vertically stacked 4 rows. Numbers left-aligned, body **justified**, illustrations centred within their column.
- **Typography:**
    - **Numbered circle badge:** number `1`, `2`, `3`, `4` — sans-serif or serif Regular, ~38 px, `#1B1B1B`, centred inside a ~60 px diameter circle (fill `#F3ECD8` matching bg, stroke `#1B1B1B` at ~1.5 px). Number sits vertically-centred with body text's first line.
    - **Body text:** classical serif, ~36 px, `#1B1B1B`, line-height ~1.3, **justified** (`textAlign='justify'`). Wraps at column width. Font: **Playfair Display Regular** (or Cardo Regular). Slight tracking/kerning adjustments visible where words are stretched to fill lines.
        - Item 1 (verbatim): _"Tell your partner you love them every night before falling asleep. Someday you'll find the other side of the bed empty and wish you could."_ (26 words)
        - Item 2 (verbatim): _"Never keep score in love."_ (5 words, single line)
        - Item 3 (verbatim): _"Laugh until you cry. Laughing together goes a long way to smooth the inevitable bumps in the road."_ (17 words)
        - Item 4 (verbatim): _"Never stop dating. 'I'm 99 and still courting my wife! Marriages don't get boring, you stop trying."_ (17 words) — note **single-quote wrapping** around the "I'm 99" quote (not curly — could be an intentional straight-quote choice).
    - **Bottom eyebrow (`@Sahil Bloom` bottom-left, `The 5 Types of Wealth` bottom-right):** same as top eyebrow on cover — italic serif, ~24 px, `#1B1B1B`.
- **Decorative elements:**
    - **Etched icon-illustrations (Col 3, one per row):** small black-and-white engraved illustrations, each tightly cropped, ~200 × 180 px. Each illustration represents the item's core metaphor:
        - Item 1: **Hand reaching to an empty bed** (a hand extending toward an unmade bed with pillows — "the other side of the bed empty").
        - Item 2: **Scoreboard with heart icon: `♥ 2:0`** — a stadium scoreboard on a post, with a heart symbol next to the score. Charming "keep score in love" metaphor.
        - Item 3: **Couple laughing** — a man and woman with heads thrown back, mouths open in laughter, embracing. Classic hedcut portrait style.
        - Item 4: **Dinner table for two with candle** — a small round bistro table with a lit candle in the centre and two chairs (romantic dinner date).
        - All illustrations: pure black ink `#000000` on cream, dense cross-hatching for tonal depth. Same engraving style as the cover slide's ring-box illustration. Very consistent brand asset.
    - **Numbered circle badges:** thin outlined circles, ~60 px diameter, `stroke='#1B1B1B'`, `strokeWidth=1.5`, `fill='#F3ECD8'` (matching bg). Number centred inside.
    - **Bottom hairline rule:** ~1 px, `#3A3A3A`, spans canvas width.
    - **Dot indicator:** 11+ dots row, 2nd filled dark, rest faded.
    - No coloured accents anywhere.
- **Layering order:** `[cream bg fill] → [4 numbered circles] → [4 body-text blocks] → [4 etched icon-illustrations] → [bottom hairline rule] → [bottom-left handle] → [bottom-right series title] → [dot indicator]`.
- **Shadows & effects:** NONE. Flat.
- **Brand markers:** bottom eyebrow band with handle + series title (moved from top to bottom on interior slides).
- **Word count:** ~65 words across 4 items + 6 words eyebrow. Cognitive load = **medium-high** — but justified for a numbered-list format where reader parses one item at a time.

#### Fabric.js reproduction notes
- **Numbered-list row structure** — a repeating unit worth its own builder.
    - `makeEditorialListItem({number, bodyText, illustration, fontFamily, fontSize, numberBadgeStyle, layout: "row"})` — one row = number-circle + body-text + illustration, positioned in 3 columns.
    - Compose 4 rows vertically with even spacing.
- **Justified text alignment:** Fabric v7 `Textbox` supports `textAlign='justify'` — need to verify it works correctly with the renderer's Puppeteer version. Justification tends to be less reliable than left/centre in web-canvas contexts. **Loop 3 verification needed.**
- **Numbered circle:** `Circle({radius:30, stroke:'#1B1B1B', strokeWidth:1.5, fill:'#F3ECD8'})` + centred `Textbox` on top. Reusable `makeNumberBadge({number, style: "outlined" | "filled", size})` helper.
- **Etched icon-illustrations:** these are **smaller/simpler than the cover illustration** — icons rather than full portraits. Suggests a **two-tier illustration library**:
    - Tier 1: **Hero illustrations** (large, detailed, for cover slides) — ~500 × 500 px each.
    - Tier 2: **Icon illustrations** (small, single-concept, for list-item slides) — ~200 × 200 px each.
    - Same B&W engraving style across both tiers.
- **Bottom eyebrow:** reuse `makeEditorialHeader` from image 12 with a `position: "bottom"` prop. Same components.
- **New helpers required:**
    - `makeNumberBadge({number, size, borderColor, textColor, fill, style: "outlined" | "filled"})` — reusable numbered-circle badge.
    - `makeEditorialListItem({number, bodyText, illustration, numberBadge, fontFamily, fontSize})` — a single 3-column list row.
    - `makeEditorialListLayout({items: [{number, bodyText, illustration}], footerEyebrow})` — the whole list-slide builder.
- **Font loading:** same as image 12 (Playfair Display Regular + Italic).

#### Motion cue
- No implied motion. The **numbered sequence** implies reading order (1 → 2 → 3 → 4), no arrows needed.
- Each row is visually equal — no emphasis on any single item. This is deliberate "level information" style.

#### IG safe-zone check
- Bottom eyebrow at y≈1240–1290 — **inside** the 1170-px CTA-overlay risk zone. The handle/series title will be partially obscured by IG's bottom overlay. Same trade-off as image 12's top eyebrow.
- Content items start at y≈100 (item 1 numbered circle) — inside the top 200-px risk zone. Item 1's number and body-first-line will be partially obscured. Recommend pushing item 1 down 100 px, OR accepting the risk on non-cover slides where the reader can already infer context from the cover.

#### Reusability score
- **5/5** — numbered-list slides are one of the most common IG carousel patterns. Endlessly reusable for advice, tips, mistakes, steps, principles, rules, etc.

#### Template pattern classification (final)
- Proposed key: **`aurora-editorial-list-item`** — a canonical "list slide" template with N numbered items, each row containing (number + body + icon). Companion to `aurora-editorial-cover`.
- Parameter: `itemCount` — supports 3, 4, 5 items per slide (auto-adjusts row height and font size).
- **This is a MUST-HAVE template** for the "editorial book-page" family. Ship in Phase 4 alongside `aurora-editorial-cover`.

#### Copy-pattern hint (LLM writer)
- Item body copy formula: `"[Imperative verb + subject]. [Explanation with subordinate clauses]."` — first sentence is the "rule", second is the elaboration.
- 3–20 words per item; variable-length items OK (Item 2 is very short at 5 words, Item 1 is longer at 26).
- Voice: same as cover — first-person authoritative, warm, essayistic. Quote marks OK for testimonial-style items (see Item 4).

#### Notes / open questions
- **Icon-illustration library size:** for a 5-item list, we need 5 different icons per slide, and each carousel might have 3–5 list slides = 15–25 icons per carousel. Multiplied across ~20 topics = **~300–500 icons** for a comprehensive library. That's a lot of illustration work. Alternative: **fine-tune a Midjourney LoRA on WSJ hedcuts** and generate on-demand. **Critical decision point** — recommend flagging this as a Phase-4 blocker.
- **Justification bug/feature:** justified type in web canvases often looks awkward with short lines (the last line is left-aligned by default, but the middle lines are stretched). Fabric's `textAlign='justify'` needs Loop 3 validation on our renderer.
- **Row spacing intelligence:** if the body copy varies (5 words vs 26 words), the row heights should adjust automatically. Recommend the builder use **auto-height** per row rather than fixed row heights.

_Progress: 13 / 85 complete._

---

### SahilBloom/image copy 2.png
**Pattern class:** list-item (numbered list, items 9–12 continuation).
**Overall vibe (1 line):** Same `aurora-editorial-list-item` template as image 13 — advice items 9 through 12 with etched icons.

Same skeleton as image 13. Deltas only:

- **Number badges:** 9, 10, 11, 12 (double-digit numbers now — badge width stays the same, number size shrinks slightly to fit).
- **Body text is LEFT-ALIGNED, ragged-right** (not justified — this is a CORRECTION to my read on image 13, which is also left-aligned). Fabric's `textAlign='left'` is correct — no justification worry.
- **Verbatim items:**
    - 9: _"It can't always be 50/50. Sometimes it will be 90/10 or 10/90. It just has to add up to 100."_ (22 words, 3 lines)
    - 10: _"Maintain interests and passions separate from your partner's. Marriage should not be the end of individuality."_ (17 words, 4 lines)
    - 11: _"When in doubt, love. We can always use more love."_ (10 words, 2 lines)
    - 12: _"If your relationship has a minor issue, repair it. Minor issues become major issues over time."_ (17 words, 3 lines)
- **Etched icons (4 new subjects for the library):**
    - Item 9: **Balance scale** with `90` and `10` on the two pans — a two-pan brass balance scale.
    - Item 10: **Cactus + houseplant in a pot** — two plants side by side in one pot, representing "separate but together" interests.
    - Item 11: **Heart with radiating sparkles/plus-signs** — a plump heart shape with 4 small plus symbols around it (love multiplying).
    - Item 12: **Cracked heart with a bandage** — a heart with a visible crack line down the middle, bound by an adhesive bandage across the crack. Perfect metaphor for "repair minor issues".
- Bottom eyebrow (handle + series title + dot indicator at ~6th position of ~11 dots) identical to image 13.

#### Fabric.js reproduction notes
- Nothing new. Reuses `makeEditorialListItem` and everything else from image 13.
- **Icon library expansion:** these 4 icons + the 4 from image 13 = 8 icons so far. If each list-slide has 4 items × 3 list slides per carousel = 12 icons per carousel. Confirms the **~30 icons per topic / ~300 icons for a 10-topic library** estimate from image 13's notes.

#### Copy-pattern hint
- Same as image 13. Note the mix of length: item 9 has explicit numeric ratios (`50/50`, `90/10`, `10/90`, `100`) — the template must handle inline numbers gracefully.

#### Notes / open questions
- The `50/50`, `90/10` fractions render fine in serif — no special typography needed.
- **Item numbers 9–12 confirm this carousel has ≥ 12 items total** — likely a 3-slide list carousel (items 1–4, 5–8, 9–12) plus a cover slide = 4 slides. Add potentially an outro = 5. So the SahilBloom folder likely has: 1 cover + 3 list slides + 1 outro = 5 templated slides × 2 carousels = 10 total (close to 11 in folder).

_Progress: 14 / 85 complete._

---

### SahilBloom/image copy 3.png
**Pattern class:** quote / tweet-screenshot (new template family — Twitter/X post styled slide).
**Overall vibe (1 line):** Classic **"tweet screenshot"** carousel slide — pure white bg, avatar + handle + verified checkmark + long tweet body, exactly mimicking a Twitter/X post. Different SahilBloom carousel style from images 12–14 (which were editorial-cream/serif).

- **Canvas:** 1080×1350.
- **Background:** pure white `#FFFFFF`, flat.
- **Layout zones:**
    - Zone A (y≈180–310, x≈50–650): **user header row**:
        - Circular avatar (~100 px diameter, photo of Sahil Bloom) at x≈60.
        - To the right: 2-line stack — display name `Sahil Bloom` + blue verified checkmark ✓ (top line), handle `@SahilBloom` (second line, grey).
    - Zone B (y≈340–950, x≈50–1030): **tweet body copy** — large sans-serif, left-aligned, black on white. Wraps naturally.
    - Zone C (bottom): empty — no timestamp, reply/retweet/like buttons, or Twitter chrome (deliberately stripped down).
    - Outer padding: ~50 px left/right for content.
- **Grid & alignment:** single-column, left-aligned. No centring.
- **Typography:**
    - **Display name `Sahil Bloom`:** sans-serif, weight 700 (Bold), ~36 px, `#000000`. Twitter uses **Chirp** (their custom font) — closest Google Font is **Inter** or **Söhne**.
    - **Blue verified checkmark:** the iconic Twitter/X verified blue-and-white checkmark badge (SVG glyph, colour `#1D9BF0`). ~28 px diameter, inline after the name.
    - **Handle `@SahilBloom`:** same sans-serif, Regular 400, ~28 px, colour `#6E767D` (Twitter grey).
    - **Tweet body:** sans-serif Regular 400, **~52 px** (large, mobile-friendly), line-height ~1.35, `#0F1419` (Twitter's near-black), left-aligned. Wraps at ~1000 px width.
        - Verbatim: _"Underrated life advice: Become a beginner again. Join a run club. Learn the piano. Take up painting. Try woodworking. Plant a garden. Teach yourself to cook. Whatever. It slows you down. It's a small rebellion in a world that wants you to do everything with some purpose in mind."_ (~50 words)
        - Smart apostrophe: `It's` (curly).
- **Decorative elements:**
    - **Circular avatar photo:** portrait photo of Sahil Bloom (headshot, dark hair, white/light background). Perfectly circular clip (`clipPath` or `borderRadius=50%`). No border.
    - **Blue verified checkmark badge:** Twitter's original blue-and-white checkmark icon — solid blue circle with 6-pointed star notches + white checkmark inside. Very distinctive.
    - NO other decorative elements — no like/reply counts, no timestamp, no dot separator, no "Show this thread". Just the essential post.
- **Layering order:** `[white bg fill] → [avatar photo] → [display name + verified badge] → [handle text] → [tweet body]`.
- **Shadows & effects:** NONE. Total flat editorial minimalism.
- **Brand markers:** the avatar + handle IS the brand marker. No handle in eyebrow / footer.
- **Word count:** 51 tweet body + 3 header = ~54 words. Cognitive load = **medium** — the ~50-word tweet reads like a mini-essay.

#### Fabric.js reproduction notes
- **Highly reusable template!** Tweet/X-screenshot slides are one of the most-copied templates on IG (creators re-share their tweets as visual carousels).
- **`makeTweetSlide({avatar, displayName, handle, verified, body, style: "twitter" | "x"})`** — comprehensive helper. Structure:
    - `Rect` white bg.
    - `Circle` clip-path around `FabricImage` for avatar.
    - `Textbox` display name + inline SVG verified badge.
    - `Textbox` handle in grey.
    - `Textbox` body copy in large black.
- **Verified checkmark:** ship as SVG asset — Twitter (blue) and X (black, for newer accounts) variants. `makeVerifiedBadge({style: "twitter-blue" | "x-black", size})`.
- **Font loading:** **Inter Regular + Bold** (closest to Twitter's Chirp). Confirmed also needed.
- **New helpers required:**
    - `makeTweetSlide({...})` — the whole tweet slide.
    - `makeVerifiedBadge({style, size})` — the checkmark.
    - `makeCircularAvatar({url, size, borderColor, borderWidth})` — reusable circular photo.
- **Note:** while the reference has NO Twitter chrome (no like/comment/retweet icons, no timestamp), some variants of this template DO include them. Recommend building **both** with a `showFooter: boolean` flag.

#### Motion cue
- None. Static-quote presentation.

#### IG safe-zone check
- Header (avatar + name) at y≈180–310 — top ~200 px of avatar is in the risk zone, but the display name / body is safely below. Slight risk on the top edge of the avatar being clipped.
- Body copy at y≈340–950 — safe.
- Bottom is empty — safe.

#### Reusability score
- **5/5** — tweet-screenshot template is one of the highest-value carousel templates. Every creator with an X/Twitter presence can share their tweets this way. Endlessly reusable.

#### Template pattern classification (final)
- Proposed key: **`aurora-tweet-quote`** — a canonical "tweet as visual quote" template.
- **HIGH PRIORITY** for Phase 4 (or Phase 2 if we want a quote-family alongside compact-family core).
- Variants: `style: "twitter-blue" | "x-black"` (colour scheme), `showFooter: boolean` (like/comment counts), `screenshot: boolean` (real screenshot with all chrome vs. text-only recreation).

#### Copy-pattern hint (LLM writer)
- Body copy formula: `"[Hook phrase]: [imperative list separated by full stops]. [Reflection/takeaway sentence]."` — canonical Sahil Bloom voice.
- Tone: **first-person conversational essay**, short punchy sentences, sometimes ending with a philosophical / rebellious note.
- Word count: 30–80 words per tweet (Twitter's 280-char limit implies this range).
- No hashtags, no @mentions, no line breaks (natural wrapping only).

#### Notes / open questions
- **This is a NEW template family within SahilBloom's brand**, separate from the editorial-cream/serif family in images 12–14. Suggests SahilBloom has AT LEAST TWO active template styles:
    1. Editorial-cream/serif (images 12–14): book-page cover + numbered list slides.
    2. Tweet-quote (image 15): pure-white minimalist Twitter screenshots.
    Our system should support **multiple template families per creator brand** — a creator can mix styles across their carousels.
- **Blue-vs-black verified checkmark:** Twitter is now X and their verified badge is now black-on-white for legacy verified, blue for paid Blue subscribers. Ship BOTH; let the user pick.
- The **avatar photo** would need to be per-user — recommend storing the user's IG/Twitter avatar in their brand profile and pulling it into any `aurora-tweet-quote` slide automatically.

_Progress: 15 / 85 complete._

---

### SahilBloom/image copy 4.png
**Pattern class:** chapter-cover / illustrated-cover (new variant of the editorial-cream cover — replaces mockup image with an **etched black-and-white illustration**).
**Overall vibe (1 line):** Editorial-cream cover with a **framed b&w line-art illustration** as the hero — like a mid-20th-century book chapter opener. Same SahilBloom cream/serif family as images 12–14, but with an illustrated (not text-only) hero.

Because this shares the SahilBloom folder-level baseline (cream `#F3ECD8`, Playfair serif, top/bottom eyebrow band, hairline rules, `The 5 Types of Wealth` series eyebrow, `Swipe for more>>` outlined pill), only the deltas vs the cover baseline (image 12) are captured here.

- **Canvas:** 1080×1350. Same background `#F3ECD8` flat cream, same eyebrow band chrome.
- **Eyebrow band (top):** `@SahilBloom` (regular italic serif, left) — `The 5 Types of Wealth` (italic serif, right). Hairline rule below at ~y=90. Consistent with images 12–14.
- **Layout zones (top → bottom):**
    - Zone A (y≈50–100): eyebrow band + hairline rule.
    - Zone B (y≈150–430): **display title** — two lines of very large serif bold, centered:
        - Line 1: `The Frog`
        - Line 2: `Pond Effect`
    - Zone C (y≈450–520): **subtitle** — single line of medium-weight serif italic (or regular), centered: `Why Growth Feels Like Destruction`
    - Zone D (y≈570–1080, x≈80–1000): **framed illustration** — landscape rectangle, thin black stroke frame (~3 px), containing an **etched black-and-white line-art drawing** of a frog on a lily pad with a lotus flower.
    - Zone E (y≈1150–1200): **teaser line** in small bold uppercase, centered: `(EVERYONE NEEDS TO READ THIS)`
    - Zone F (y≈1220–1250): **dot-row progress indicator** — 7–8 small circles horizontally, first (or first two) filled black, rest outlined. Signals "you are on page 1 of N".
    - Right edge (y≈540, x≈1010): **circular nav arrow** — white filled circle with a black chevron `>` inside. Small floating button (~80 px). New primitive vs images 12–14.
    - Right edge (y≈650, x≈1010): **`SWIPE FOR MORE` circular sticker** — same as image 12 baseline (hand-pointing icon + wrapped text in a circle).
- **Typography:**
    - **Display title `The Frog Pond Effect`:** Playfair Display Bold (or similar high-contrast serif — could also be **Fraunces Bold** or **Cardo Bold**), ~180 px, `#000000`, line-height ~1.0 (very tight), letter-spacing ~-2 px, centered. Two lines with a manual break between `Frog` and `Pond`.
    - **Subtitle `Why Growth Feels Like Destruction`:** same serif family, Regular ~52 px, `#000000`, centered, single line.
    - **Teaser `(EVERYONE NEEDS TO READ THIS)`:** sans-serif or serif small-caps, **Bold**, ~26 px, `#000000`, tracked slightly (~1–2 px), centered, wrapped in literal parentheses.
    - **Nav arrow chevron `>`:** simple black chevron glyph inside white circle.
- **Decorative elements:**
    - **Framed etched illustration** — the hero. Style is very specific: **hand-drawn / etched b&w line art**, similar to **WSJ hedcuts** but applied to a scene (not a portrait). High detail, cross-hatching for shading, thin uniform line weight. The lily pad is centered, frog on it, lotus flower to the upper-left, water droplets around. Framed by a thin black rectangle stroke (no fill).
    - **Circular nav arrow (`>`)** — new primitive not on prior SahilBloom slides. White fill, black chevron, slight subtle drop shadow possibly. Sits half-off the right edge suggesting swipe direction.
    - **Swipe-for-more sticker** — reused from image 12.
    - **Dot-row progress indicator** — 7–8 dots, uniform spacing (~20 px between centers), first one or two filled solid black, rest are outline-only circles. ~10 px diameter each.
- **Layering order:** `[cream bg] → [top eyebrow row + hairline] → [display title] → [subtitle] → [illustration frame + artwork] → [nav arrow] → [swipe sticker] → [teaser line] → [dot indicator]`.
- **Shadows & effects:** nav arrow may have a tiny drop shadow (subtle, `0 2 4 rgba(0,0,0,0.15)`). Otherwise everything is flat.
- **Brand markers:** eyebrow `@SahilBloom` + series `The 5 Types of Wealth` (though the specific post title is "The Frog Pond Effect" — the eyebrow likely denotes SahilBloom's overarching series/brand rather than this specific post's series).
- **Word count:** title 4 + subtitle 5 + teaser 5 = 14 words. Cognitive load = **low** — very clean cover.

#### Fabric.js reproduction notes
- **Extend the editorial-cover template** from image 12 with a new `heroType` field:
    - `heroType: "text-hero"` (image 12 style — big text-only cover).
    - `heroType: "illustrated-frame"` (this image — framed illustration + smaller title above).
- New helper: `makeFramedIllustration({url, x, y, width, height, frameStroke, frameStrokeWidth, framePadding})` — image with a thin rectangular stroke frame.
- New helper: `makeCircularNavArrow({direction: "next" | "prev", x, y, size, fillColor, iconColor})` — circular button with chevron.
- New helper: `makeDotProgressIndicator({total, currentIndex, x, y, dotSize, dotGap, filledColor, outlineColor})` — horizontal dot-row.
- **Illustration asset source:** we need a library of these WSJ-hedcut-style etched illustrations. Options (flag for user):
    1. Commission a set from an illustrator (highest fidelity, slow, expensive — ~$50–200 per illustration).
    2. Midjourney with a custom LoRA / style reference (medium fidelity, fast, cheap).
    3. Existing stock (Noun Project has some, but hedcut style is rare).
    4. Generate via `gpt-image-1` or DALL·E with a strict "1930s WSJ hedcut engraving, black ink on cream, high-contrast crosshatching, no colour" prompt.
    - **My recommendation:** start with Midjourney/style-locked generation (option 2 or 4) with human review; consider commissioning a permanent library only after we ship v1.
- **Font loading:** same as image 12 (Playfair Display Bold + Regular + Italic). No new fonts.
- **Reusable across topics:** yes — any single-topic essay carousel can use this cover template. `heroType: "illustrated-frame"` is easily topical (a book, a frog, a mountain, a compass, whatever fits the essay's metaphor).

#### Motion cue
- The nav-arrow chevron and swipe sticker both point **right** — implies swipe-right for next. The dot indicator signals "1 of N" (first dot filled). Together these are strong "keep going" affordances.

#### IG safe-zone check
- Eyebrow band at y≈50–100 sits in the top ~200 px avatar-bar risk zone. Same as image 12 — brand markers OK to bleed, IG chrome may partially obscure.
- Title starts at y≈150 — safe.
- Bottom dot indicator at y≈1220 — sits well inside the bottom ~180 px caption zone. **Minor risk** — the dot indicator may be clipped by IG UI when viewed on the mobile app. Consider raising it to y≈1100 or making the dot indicator optional / decorative-only.

#### Reusability score
- **5/5** — Perfect essay-cover template. Swap the title, subtitle, teaser, and illustration and you have a new post. This is the highest-value template for long-form-essayist creators.

#### Template pattern classification (final)
- Extend the existing `aurora-editorial-cover` (from image 12) with a new subVariant:
    - `subVariant: "text-hero"` (image 12).
    - `subVariant: "illustrated-frame"` (this image).
- Alternative naming: introduce a new sibling `aurora-editorial-illustrated-cover` if we want cleaner separation in the builder registry.
- **My recommendation:** single template `aurora-editorial-cover` with a `subVariant` enum — same brand chrome, different hero.

#### Copy-pattern hint (LLM writer)
- Cover copy formula: `"[Metaphor Title (2–4 words)]" + "[Subtitle explaining metaphor (4–7 words)]" + "([Attention-grabbing teaser in parens, ALL CAPS, 4–8 words])"`.
- Title style: **concrete noun metaphor** (`The Frog Pond Effect`, `The Compass Principle`, `The Mountain Illusion`). Not abstract.
- Subtitle style: **counter-intuitive framing** (`Why X Feels Like Y`, `The Hidden Cost of X`, `How X Is Actually Y`).
- Teaser style: **imperative + universality** (`EVERYONE NEEDS TO READ THIS`, `THIS CHANGED MY LIFE`, `THE ONE THING NO ONE TELLS YOU`).

#### Notes / open questions
- **Illustration library is the critical bottleneck** for this template. Without a stable, brand-consistent set of hedcut-style illustrations, `subVariant: "illustrated-frame"` will feel inconsistent from post to post. Recommend a Phase 3 (or dedicated illustration phase) subtask: "Build the SahilBloom-style illustration pipeline — Midjourney prompt + style ref + review workflow" before we promise this template to end users.
- The series eyebrow says `The 5 Types of Wealth` but the post title is `The Frog Pond Effect` — this is likely a **separate series** that SahilBloom recycles with the same brand chrome. Confirms the eyebrow is a **series-slot**, not a per-post-title slot. Our template should treat it as an optional prop.
- Add **`makeCircularNavArrow`** and **`makeDotProgressIndicator`** to the helper library — both are broadly useful across cover templates from many creators.

_Progress: 16 / 85 complete._

---

### SahilBloom/image copy 5.png
**Pattern class:** essay-body / prose-with-embedded-chart (new template family).
**Overall vibe (1 line):** Long-form essay body slide — plain **sans-serif** prose paragraphs with **inline bolded terms** and a **hand-designed schematic bar chart** embedded mid-slide. Direct continuation of image 16's "Frog Pond Effect" cover.

**Key correction to SahilBloom folder baseline:** the family uses **serif for display, eyebrow, and list-item body**, but **sans-serif (Inter-like) for essay-body prose**. Two-tier type system, not serif-only.

- **Canvas:** 1080×1350. Bg: cream `#F5F0E5` (reads paler here due to sans body + white chart negative space).
- **Top eyebrow:** identical baseline — `@SahilBloom` italic serif L, `The 5 Types of Wealth` italic serif R, hairline rule. **No bottom eyebrow, no dot indicator** on interior body slides.
- **Layout (top → bottom):**
    - y≈15–70: eyebrow band.
    - y≈130–620: **3 prose paragraphs**, sans-serif Regular ~34 px, left-aligned, `#1B1B1B`. Para 3 contains **inline bold** on `class rank` and `school quality`.
    - y≈640–1000: **embedded schematic bar chart** (see below).
    - y≈1030–1200: concluding 3-line prose paragraph.
    - Left + right edges y≈600: **circular chevron nav arrows** (`<` and `>`) — mirrored version of image 16's nav arrow.
- **Prose typography:** sans-serif Regular ~34 px, line-height ~1.35, `#1B1B1B`. Candidates: **Inter Regular**, **Söhne Buch**, **iA Writer Quattro**. Feels most like **Inter**. Inline bold spans use weight 700.
- **Verbatim prose:**
    - P1: _"Have you ever noticed that growth feels like destruction? That getting better feels like getting worse?"_
    - P2: _"You are not doing something wrong. You are just experiencing something nobody told you about."_
    - P3: _"In 1966, sociologist James Davis studied thousands of graduating college seniors. He found that career aspirations tracked to **class rank** (a relative metric) far more than **school quality** (an absolute metric)."_
    - P4 (closing): _"Two students of identical ability perceived themselves completely differently based on how they stacked up to those around them."_
- **The embedded schematic bar chart:**
    - **2 groups × 5 bars each** — `AVERAGE SCHOOL` (left) vs `TOP SCHOOL` (right). Bold underlined all-caps column headers.
    - Bars are **outlined rectangles** (thin black stroke, no fill — cream shows through) EXCEPT one `YOU` bar per group which is **solid blue `#3B82F6`** with white `YOU` label centered inside.
    - Bar heights vary within each group; the blue `YOU` bar sits mid-group-left (top-of-class) but bottom-group-right (bottom-of-class-in-top-school). BOTH blue bars reach the SAME absolute height.
    - **Dashed horizontal reference line** spans both groups at the top of the blue bars, labeled `same ability` in small grey type above the dashes.
    - Below each group: bold caption (`Top of the class` / `Bottom of the class`) + smaller grey sub-caption (`feels great, aims high` / `feels small, aims low`).
    - Ground line beneath both groups (solid black, ~2 px).
    - **NO axes, NO numeric labels** — purely conceptual/schematic, not data-driven.
- **Layering:** `[cream bg] → [eyebrow row + rule] → [prose above chart] → [ground line] → [outlined bars] → [blue YOU bars] → [dashed reference line] → [chart labels + captions] → [column headers] → [prose below chart] → [L/R nav arrows]`.
- **Shadows/effects:** none. Flat.
- **Word count:** ~90 words prose + ~20 chart labels = ~110 words. **Cognitive load = HIGH**, but justified for long-form essay UX (30–60 s dwell time).

#### Fabric.js reproduction notes
- **New helpers required:**
    - `makeMixedWeightText({runs: [{text, weight}], baseStyle})` — mixed-weight inline text (refined from image 1's proposal). Directly enables `class rank` / `school quality` bolded inline.
    - `makeSchematicBarChart({groups: [{header, bars: [{height, isHighlight, label}], caption: {primary, secondary}}], referenceLine: {yValue, label, dashPattern, color}, groundLine: true})` — the **biggest new component of this session.** Hand-composed comparative bar chart, not data-driven.
    - `makeEssayBodySlide({eyebrowTop, prose, embedComponent?, prose2, navArrows})` — the whole slide builder.
- Fabric primitives used: `Rect` (outlined + solid bars), `Line` with `strokeDashArray: [10, 6]` for reference line, `Textbox` for all text.
- **Font loading:** confirmed need for **Inter Regular + Bold** (or Söhne Buch + Kraftig). Add to `renderer_entry.ts`.
- **NOT the same as our data-driven chart engine** — this is a **hand-composed schematic diagram**, driven by human-authored geometry. Ship as a specialty template + helper, not a chart-engine feature.

#### IG safe-zone check
- Eyebrow inside top 200-px zone (acceptable — brand marker).
- Bottom prose ends y≈1200 — **AT** the 1170-px CTA-overlay boundary. Risk of last line being clipped. Recommend tightening body copy or raising chart 50 px.

#### Reusability score
- **General "essay-body-with-embedded-diagram" template:** 5/5 — HIGH-VALUE for thought-leadership carousels.
- **This specific schematic chart geometry:** 3/5 — bespoke; the LLM must design each chart case-by-case.

#### Template pattern classification (final)
- Proposed key: **`aurora-essay-body`** — long-form prose slide with optional embedded diagram/chart/image mid-slide.
- Companion to `aurora-editorial-cover` (12, 16). Cover + N body slides + outro = a full essay carousel.
- **SahilBloom template family now confirmed at 4 templates:**
    1. `aurora-editorial-cover` — 2 subVariants: text-hero (12) + illustrated-frame (16).
    2. `aurora-editorial-list-item` — numbered list, 3–5 items (13, 14).
    3. `aurora-tweet-quote` — standalone tweet screenshot (15). Cross-brand.
    4. `aurora-essay-body` — long-form essay body with optional embed (17). **NEW.**

#### Copy-pattern hint (LLM writer)
- Essay body slide structure: **hook (1–2 lines)** → **reframe (1–2 lines)** → **evidence with inline-bolded key terms (2–4 lines)** → **[diagram]** → **interpretation (1–3 lines)**.
- Word count: 80–120 words per essay-body slide.
- Voice: first-person authoritative + warm essayistic. Uses "you" to address reader directly. Bolds 1–3 key terms per slide.

#### Notes / open questions
- **Custom schematic charts are a genuine architectural challenge.** Options:
    1. Ship a **library of ~10–15 schematic chart templates** (comparative-bars, ranked-bars, pyramid, matrix-2x2, funnel, ladder, timeline, quadrant, before-after, spectrum, dial). LLM picks template + populates concept labels.
    2. LLM emits JSON chart spec (declarative geometry) → builder renders.
    3. Punt for MVP — only image-based diagrams (LLM writes prose, user uploads or AI-generates matching illustration).
    **Recommend option 1 for Phase 4** — 10 canned schematic-chart templates give the LLM structured slots without forcing it to design geometry from scratch.
- **Chrome differs per slide type in SahilBloom family:** covers = top eyebrow only, list slides = bottom eyebrow + dots, essay body = top eyebrow only (no bottom, no dots). Template registry should encode `chromeStyle` per template.
- Continues from image 16 → these are slides 1 and 2 of a multi-slide essay carousel. Confirms essay format is a **linked series**, not standalone.

_Progress: 17 / 85 complete._

---

### SahilBloom/image copy 6.png
**Pattern class:** essay-body — second confirmed use of `aurora-essay-body` (image 17's template).
**Overall vibe (1 line):** Slide 3 of the "Frog Pond Effect" essay — same sans-serif essay-body layout, but the embed is now a **diptych of framed etched illustrations** (two side-by-side hedcut frog scenes) instead of a schematic chart.

Same skeleton as image 17. Deltas only:

- **Canvas / bg / eyebrow / nav arrows:** identical to image 17.
- **Prose paragraphs (4 stacked, sans-serif ~34 px, `#1B1B1B`, left-aligned):**
    - P1 (y≈130–290, ~4 lines): opens with an **inline bold-italic quotation** `"They see themselves as big frogs in little ponds or frogs in big ponds."` attributed to Davis, followed by regular-weight body. Verbatim: _`Davis wrote: **"They see themselves as big frogs in little ponds or frogs in big ponds."** This is the Frog Pond Effect: The way we feel about ourselves depends on our relative positioning more than our absolute performance.`_
    - P2 (y≈330–470, ~3 lines): _"Our scoreboard is relative, not absolute. This is why growth feels like destruction. Why getting better feels like getting worse. Why building up feels like tearing down."_
    - P3 (y≈510–570, 1 line): _"Because growth forces a change in environment."_ (single-line "punchy paragraph" — common essay rhythm).
    - P4 (y≈610–770, ~3 lines): _"You cannot reach your true potential in the tiny pond where you started. At some point, you outgrow the places, people, mindsets, and beliefs that once felt like home."_
- **Embed (y≈820–1200):** **diptych of framed etched illustrations** — 2 landscape rectangles side-by-side, thin black stroke frames (same as image 16's frame), each containing a hedcut b&w scene:
    - Left frame: **frog sitting on a lily pad** (calm, static — echoes image 16's frog).
    - Right frame: **frog leaping out of the water**, with splash ripples in the pond — the moment of transformation.
    - Together they form a **before/after visual metaphor** — "stuck in the small pond" vs "leaping into the bigger world".
    - Frames are equal-sized (~460 × 380 px each), sit at same y, small gap ~20 px between them.
- **Cognitive load = HIGH** but justified — ~110 words prose + strong visual metaphor. Reader dwell ~45–60 s.

#### Fabric.js reproduction notes
- **New composition pattern — "diptych embed":**
    - `makeIllustrationDiptych({leftImage, rightImage, frameStroke, frameWidth, gap, aspectRatio})` — a helper that lays out 2 framed images side-by-side. Reuses `makeFramedIllustration` from image 16.
    - Should also support `makeIllustrationTriptych` (3-panel) for essay-body slides that need before/during/after.
- **Mixed-weight + italic inline text** — the P1 quotation is BOTH bold AND italic on the same run. Extend `makeMixedWeightText` from image 17 to support: `{text, weight, style}` per run, e.g. `{text: "They see themselves as...", weight: 700, style: "italic"}`. Fabric's `Textbox.styles` map supports both `fontWeight` and `fontStyle` per-character.
- Everything else is the same `makeEssayBodySlide` builder as image 17, just swap `embedComponent` from `schematicBarChart` to `illustrationDiptych`.
- **Font loading:** confirms need for **Inter Italic (Regular + Bold Italic)** in addition to already-flagged Inter Regular + Bold.

#### Motion cue
- The diptych IS the motion cue — left panel (static frog) → right panel (leaping frog) visually implies transformation. No arrows needed.

#### IG safe-zone check
- Same as image 17: bottom of diptych at y≈1200 sits AT the 1170-px risk boundary. The lower half of the right frame's splash might get clipped. Recommend raising diptych 40–50 px OR ensuring the illustrations have "safe compositions" (subject not at bottom edge).

#### Reusability score
- **Diptych/triptych embed pattern:** 5/5 — extremely useful for before/after, stuck/free, cause/effect metaphor pairs. Add to Phase 4 essay-body helper library.

#### Template pattern classification (final)
- Same `aurora-essay-body` as image 17. This entry confirms the template supports **multiple embed types**: `embed: {type: "schematicChart" | "illustrationDiptych" | "singleIllustration" | "quotePullout" | "none", ...props}`.

#### Copy-pattern hint (LLM writer)
- Essay-body variant with **quotation lead-in**: P1 opens with `"[Author] wrote:"` + bold-italic quote + interpretation. Common editorial device.
- Punchy single-line paragraphs (P3 here) create rhythm. LLM should be prompted to mix long (3–4-line) and short (1-line) paragraphs.
- Repetition device: three parallel "Why X feels like Y" clauses in P2 — LLM should recognise this as a legitimate rhetorical pattern.

#### Notes / open questions
- **Two essay-body slides so far (17, 18)** — both from the same essay. Confirms the essay format is a **series** (cover → 4–6 body slides → outro).
- The **illustration diptych** here reuses the SAME frog illustration style as image 16's cover, keeping visual continuity across the essay. Suggests each essay carousel should commit to ONE illustration subject/motif and reuse it across all slides. Our system should support **per-carousel illustration theming**.
- The framed-illustration primitive (`makeFramedIllustration` from image 16) is now used at 3 sizes: full-slide cover-hero (image 16, ~940×510) and diptych-panel (this slide, ~460×380). Confirms the frame primitive should be **size-agnostic** — passes width/height as params.

_Progress: 18 / 85 complete._

---

### SahilBloom/image copy 7.png
**Pattern class:** essay-body — third confirmed use of `aurora-essay-body`.
**Overall vibe (1 line):** Slide 4 of the Frog Pond essay — same essay-body layout, embed is now a **single framed illustration with inline caption stamps** (bold-caps labels placed ON the artwork itself).

Same skeleton as image 17. Deltas only:

- **Canvas / bg / eyebrow / nav arrows:** identical to image 17.
- **Prose paragraphs (4 short staircase paragraphs, sans-serif ~34 px, left-aligned, `#1B1B1B`):**
    - P1 (y≈130–180, 1 line, ends with colon): _"In those moments, you have a choice:"_
    - P2 (y≈220–320, 2 lines): _"You can stay. Embrace the comfort and safety of your small pond."_
    - P3 (y≈360–460, 2 lines): _"Or you can leave. Push into new frontiers. Enter a bigger pond."_
    - P4 (y≈500–590, 2 lines): _"But if you choose to leave, if you choose the path of growth, do so knowing that it is going to hurt."_
- **Embed (y≈650–1200):** **single framed etched illustration** — one landscape rectangle (~1000 × 550 px), thin black stroke frame, hedcut b&w scene of a **rowboat moored on a stone quay** (foreground, left) with **crashing ocean waves** (background, right) breaking against a stone breakwater. Composition contrasts calm safety (boat/harbor) with turbulent growth (open sea/waves).
- **NEW distinctive feature — inline caption stamps ON the illustration:**
    - Top-right of illustration (in the wave-crashing area): `PUSH INTO NEW FRONTIERS` — sans-serif Bold, all-caps, ~24 px, black `#000000`, 2 lines, positioned as an annotation over the artwork.
    - Bottom-centre of illustration (on the quay near the boat): `EMBRACE COMFORT` — same treatment, ~24 px, 2 lines.
    - These are **caption stamps placed ON the illustration**, not below/beside it. Guides the reader's eye to two contrasted regions of the same image.
- **Cognitive load = HIGH** (~50 words prose + ~5 words on-image labels + rich illustration).

#### Fabric.js reproduction notes
- **New embed sub-type: `illustrationWithAnnotations`** — a single `makeFramedIllustration` + N `makeOnImageLabel` overlays.
    - `makeOnImageLabel({text, position: {x, y}, font, size, color, weight, align, maxWidth})` — a text label anchored to a specific position on the illustration. Multiple can be composed.
- Embed types now confirmed: `schematicChart` (17), `illustrationDiptych` (18), `illustrationWithAnnotations` (19), plus obvious future: `singleIllustration` (no annotations), `quotePullout`, `photoWithCaption`.
- **Big implication:** essay-body slides need a **rich embed abstraction** — not just "put an image here". The embed is a first-class composable component. Recommend:
    ```
    embed: {
      type: "illustrationWithAnnotations",
      illustration: {url, frame: {stroke: "#000", strokeWidth: 3}},
      annotations: [
        {text: "PUSH INTO NEW FRONTIERS", position: {x: 0.75, y: 0.15}, ...},
        {text: "EMBRACE COMFORT", position: {x: 0.30, y: 0.85}, ...}
      ]
    }
    ```
    Positions as fractions of illustration dimensions (0–1) so they scale.
- Everything else reuses `makeEssayBodySlide`.

#### Motion cue
- The composition's **left→right visual gradient** (calm boat → crashing waves) implies motion / choice / transformation. The two on-image labels reinforce the metaphor without needing arrows.

#### IG safe-zone check
- Bottom of illustration frame at y≈1200 — same tight boundary risk as images 17/18. Recommend illustration composition avoid critical detail in the bottom 30 px.

#### Reusability score
- **Inline-caption-stamps-on-illustration pattern:** 5/5 — a classic editorial device (Feynman-diagram / Wired-magazine style) for annotating hero images. Applies to any single-illustration essay slide.

#### Template pattern classification (final)
- Same `aurora-essay-body`, new `embed.type = "illustrationWithAnnotations"`.

#### Copy-pattern hint (LLM writer)
- **"Staircase paragraphs"** — 3–5 short 1–2-line paragraphs each offering a step/choice/consequence. Escalating rhythm.
- On-image annotation labels: 2–4 words each, ALL CAPS, bold sans-serif. Positioned to guide the eye through the illustration's key regions. LLM should identify semantic "hotspots" in the illustration and place a short label at each.

#### Notes / open questions
- Three essay-body slides (17, 18, 19) — all same template, three different embed types. Reinforces the `aurora-essay-body` builder is the correct abstraction: **prose + pluggable embed**.
- The **on-image labels** here use a **different type family** than the prose — sans-serif BOLD vs the prose's regular Inter. Consistent — the illustration labels feel like woodcut engraving captions (all-caps, bold, condensed feel), while prose is body-friendly. Confirms that essay-body slides may use **2–3 type roles** (prose + on-image caption + eyebrow).

_Progress: 19 / 85 complete._

---

### SahilBloom/image copy 8.png
**Pattern class:** essay-body — fourth confirmed use of `aurora-essay-body`.
**Overall vibe (1 line):** Slide 5 of the Frog Pond essay — same essay-body layout, embed type is now **plain single framed illustration** (no annotations). Prose uses a strong **anaphora / parallel-list rhetorical device**.

Same skeleton as image 17. Deltas only:

- **Canvas / bg / eyebrow / nav arrows:** identical to image 17.
- **Prose paragraphs (5 short 1–2-line paragraphs, sans-serif ~34 px, left-aligned, `#1B1B1B`):**
    - P1 (thesis): _"Identity-shaking pain is the cost of entry."_
    - P2: _"The discomfort of being the dumbest one in the room."_
    - P3: _"The imposter syndrome of feeling like you will be exposed."_
    - P4: _"The ego hit of being at the back of the pack."_
    - P5: _"The embarrassment of being a beginner again."_
    - **Rhetorical device: anaphora** — P2–P5 are all `"The [emotion/state noun] of [being + gerund clause]."` A canonical writing pattern for building emotional weight. The LLM should recognise and be able to generate this structure.
- **Embed (y≈680–1200):** **single framed etched illustration** — one landscape rectangle (~1000 × 540 px), thin black stroke frame, hedcut b&w scene of **a man standing in a study/library looking into a large ornate freestanding mirror**. Bookshelf behind him, armchair to the left, patterned rug beneath, ornate mirror on stand. Man's face in mirror shows his reflection. Perfect visual metaphor for "identity" theme.
    - Embed type: **`singleIllustration`** (no annotations, no diptych, no chart). Simplest embed variant.
- **Cognitive load = MEDIUM-HIGH** (~50 words prose across 5 short paragraphs + rich illustration). Slightly easier than images 17/18 because paragraphs are ultra-short.

#### Fabric.js reproduction notes
- Nothing new architecturally. `aurora-essay-body` with `embed.type = "singleIllustration"` — the minimal embed case. Just `makeFramedIllustration` + prose stack.
- **Embed-type registry so far** (from SahilBloom essays):
    1. `schematicChart` (17) — hand-composed diagram.
    2. `illustrationDiptych` (18) — 2 framed images side-by-side.
    3. `illustrationWithAnnotations` (19) — 1 framed image + on-image labels.
    4. `singleIllustration` (20) — 1 framed image, no annotations. **Minimal case.**
    Expected future: `illustrationTriptych` (3-panel), `photoWithCaption`, `quotePullout`, `videoStill`, `dataTable`, `bulletedList`.

#### IG safe-zone check
- Same as image 17: bottom of illustration at y≈1200 sits AT the risk boundary. Illustration composition here has the rug/floor at the bottom — no critical content clipped.

#### Reusability score
- **Anaphora paragraph structure:** 5/5 — extremely reusable rhetorical device. LLM prompt library should include it.
- **Single illustration embed:** trivial to reproduce.

#### Template pattern classification (final)
- Same `aurora-essay-body`, `embed.type = "singleIllustration"`.

#### Copy-pattern hint (LLM writer)
- **Anaphora pattern for essay body slides:**
    - Line 1 (thesis, 1 sentence): _"[Abstract noun-phrase] is the [role/cost/reason] of [X]."_
    - Lines 2–5 (parallel examples): _"The [emotion-noun] of [being + gerund clause]."_ — repeated 3–5 times with different emotion nouns.
    - Rhythm: escalating specificity from abstract thesis to concrete emotional examples.
- Voice: same first-person authoritative + warm essayistic. No emoji, no ALL-CAPS, no exclamation.

#### Notes / open questions
- Four essay-body slides now documented (17, 18, 19, 20). Confirms the SahilBloom "Frog Pond Effect" essay carousel is a **5-slide** structure: cover (16) + 4 body slides (17, 18, 19, 20). We haven't seen the outro yet — likely images 21 or 22 in the folder.
- The illustration here is another **etched hedcut**, same visual style as image 16's frog + image 18's diptych + image 19's harbour scene. **All 4 illustrations in this essay carousel share one style-family and one artist** — extremely tight visual continuity. Confirms per-essay illustration theming is critical for brand feel.
- **Anaphora paragraph device recommendation for Phase 4:** add an `essayBodyCopyStyle: "anaphora" | "prose" | "staircase" | "quotation-lead" | "hook-reframe-evidence"` prop to the essay-body LLM prompt, so the writer can pick a rhetorical structure per slide.

_Progress: 20 / 85 complete._

---

### SahilBloom/image copy 9.png
**Pattern class:** chapter-cover / illustrated-cover — second confirmed use of `aurora-editorial-cover` with `subVariant: "illustrated-frame"`.
**Overall vibe (1 line):** Second essay cover in this folder (after image 16's Frog Pond) — same template, new essay: "Why Are You In Such A Rush?". Introduces a **mixed-style display title** (upright sans + italic serif emphasis word).

Same skeleton as image 16 (`aurora-editorial-cover`, `subVariant: "illustrated-frame"`). Deltas only:

- **Canvas / bg / eyebrow / nav arrow / swipe sticker / dot indicator:** identical to image 16.
- **Display title (Zone B):** `Why Are You In Such A Rush?` — 2 lines (`Why Are You In` / `Such A Rush?`), **NEW MIXED STYLE:**
    - Most words: **upright bold sans-serif** OR **upright bold serif** (letterforms are modern, moderate contrast — could be **Inter Bold**, **Söhne Kraftig**, or a subtle serif like **Fraunces Bold**). ~170 px, `#000000`, tight tracking.
    - The word `Rush` is **italic serif** (clearly Playfair-Italic-like letterforms, high contrast, slanted). Same size as the surrounding text. Emphasises the key concept.
    - **Mixed-weight AND mixed-family AND mixed-style in one title.** Fabric implication: `makeMixedWeightText` must be extended to accept `fontFamily` per run, not just weight/style. Full 3-axis run typography.
- **Subtitle (Zone C):** `The Hidden Trap Destroying Your Happiness` — sans-serif Regular ~48 px, colour **muted taupe/brown** (`#8A7B6E` approx — NOT pure black, unlike image 16's subtitle which is black). New colour token: `INK_MUTED_BROWN`. Centred, single line.
- **Framed illustration (Zone D):** landscape rectangle, thin black stroke frame, hedcut b&w scene:
    - **Overhead / top-down view of a busy paved road/plaza** with many pedestrians walking in various directions as **blurred motion streaks** (drawn with hatched diagonal lines suggesting rushing bodies). Dead centre of the composition: **ONE person standing still**, upright and clearly rendered, while everyone else is a blur. Perfect visual metaphor for "everyone else is rushing, only you can stop".
    - Style: same hedcut b&w line-art as prior essay illustrations. Consistent artist.
- **Teaser line (Zone E):** `(EVERYONE NEEDS TO READ THIS)` — identical to image 16's teaser. Confirms this teaser is a **reused SahilBloom essay-cover formula**.
- **Dot indicator (Zone F):** 10 dots visible, first filled. Signals a longer essay carousel (~10 slides). More than image 16's 7-8 dots.

#### Fabric.js reproduction notes
- **`makeMixedWeightText` — extend to full 3-axis:**
    ```
    runs: [
      {text: "Why Are You In Such A ", family: "Inter", weight: 700, style: "normal"},
      {text: "Rush", family: "Playfair Display", weight: 700, style: "italic"},
      {text: "?", family: "Inter", weight: 700, style: "normal"}
    ]
    ```
    Fabric v7 `Textbox.styles` map supports `fontFamily`, `fontWeight`, `fontStyle` per-character — verified via docs. Ship this as the definitive mixed-run text helper.
- **New colour token:** `INK_MUTED_BROWN = #8A7B6E` (for muted subtitle text on cream). Sits alongside `INK_BLACK = #1B1B1B` and `INK_CREAM = #F5EDE0`. Emerging token palette:
    - `BG_CREAM = #F3ECD8` (SahilBloom bg)
    - `INK_BLACK = #1B1B1B` (primary body)
    - `INK_MUTED_BROWN = #8A7B6E` (subtitle / secondary)
    - `INK_CREAM = #F5EDE0` (light-on-dark text)
- Everything else reuses `aurora-editorial-cover` builder from image 16.

#### Reusability score
- **Template:** 5/5 confirmed by 2nd instance in the folder.
- **Mixed-style-run display title:** 5/5 — a canonical editorial technique. Add to LLM writer capabilities (identify 1 emphasis word per title and mark it for italic-serif treatment).

#### Template pattern classification (final)
- Same `aurora-editorial-cover`, `subVariant: "illustrated-frame"`.
- **Confirms this cover template supports 2 essays in the same folder** — likely SahilBloom uses this as his repeatable essay-cover across many essays. High-value canonical.

#### Copy-pattern hint (LLM writer)
- Title formula (refined from image 16): `"[Question-hook or metaphor-noun] [emphasis-word]?"` with the emphasis-word set in italic-serif for typographic drama.
    - Alt: `"[Statement + emphasis-word + qualifier]"` (e.g. `The [Compass] Principle`, `Why [Growth] Feels Like [Destruction]`)
- Subtitle formula: `"[The Hidden X] [Verb-ing] [Your Y]"` — same "hidden trap" schema as image 16's `"Why Growth Feels Like Destruction"`.
- Teaser: **verbatim reused** — `(EVERYONE NEEDS TO READ THIS)`. Confirms it's a template-level constant, not a per-essay LLM choice. Suggests the LLM writer should be able to select a **teaser template** from a small library: `EVERYONE NEEDS TO READ THIS` / `THIS CHANGED MY LIFE` / `WISH I KNEW THIS SOONER` / `THE ONE THING NO ONE TELLS YOU`.

#### Notes / open questions
- **This is essay 2 in the folder — cover only.** Interior body slides for this essay (likely images 22+ of the folder) aren't yet seen. Only one interior body slide remains in SahilBloom folder (image 22 = `image copy 10.png`) — probably the first body slide of this "Why Are You In Such A Rush?" essay, OR the outro slide of the prior Frog Pond essay.
- The **font pairing decision** (upright display + italic serif emphasis) is CRITICAL to this SahilBloom aesthetic. Even if we can't match the exact upright font, the pairing must be preserved: modern-sans-or-transitional-serif upright + Playfair-Italic emphasis word.
- **`(...)` around teaser** — literal parentheses in the copy. Include in template as constant framing.

_Progress: 21 / 85 complete._

---

### SahilBloom/image copy 10.png
**Pattern class:** essay-body — fifth confirmed use of `aurora-essay-body`.
**Overall vibe (1 line):** Long-form essay body slide about "seasons of life" — 4 straight prose paragraphs + single framed illustration with a **split-scene visual metaphor** (spring/autumn double-image of a man walking).

Same `aurora-essay-body` skeleton (image 17). Deltas only:

- **Canvas / bg / eyebrow / nav arrows:** identical to image 17. `@SahilBloom` italic serif L, `The 5 Types of Wealth` italic serif R, hairline rule.
- **Prose paragraphs (4 stacked, sans-serif ~34 px, `#1B1B1B`, left-aligned, NO inline bold this time):**
    - P1 (2 lines): _"Your life is not a singular, static experience. It has seasons."_
    - P2 (2 lines): _"Each one is unique. Characterized by its own desires, struggles, opportunities, and identity."_
    - P3 (3 lines): _"But it is dangerously easy to disassociate from the present season. To give all your energy toward nostalgia for the past or anticipation for the future."_
    - P4 (3 lines): _"You may spend your entire life skipping through the present, deferring your presence, your joy, and your very humanity to a future that never comes."_
- **Embed (y≈780–1230):** **single framed etched illustration** — landscape rectangle, thin black stroke frame, hedcut b&w scene with a **NEW distinctive visual device — split-scene / temporal-double**:
    - **Left half of the scene:** spring/summer — blooming trees with dense foliage, flowers on the ground, a walking path.
    - **Right half of the scene:** autumn/winter — bare skeletal trees, fallen leaves, empty branches.
    - **Center of the scene:** TWO overlapping figures of the same man (a man in a hat and coat) — one facing left (into spring), one facing right (into autumn). Represents "your past self walking into the future" or "temporal displacement".
    - The two halves are separated by a **vertical seam right through the man's centre** — literal split-scene composition.
    - Framed by thin black rectangle stroke. Same hedcut illustration style as prior essay illustrations.
    - Embed type: **`singleIllustration` with a split-scene compositional subVariant** — worth noting as an illustration-prompt pattern (`"split scene: left = spring, right = autumn, centre = same figure duplicated"`).
- **Cognitive load = MEDIUM-HIGH** (~85 words prose + rich metaphor illustration).

#### Fabric.js reproduction notes
- Template-wise: same `aurora-essay-body` + `embed.type = "singleIllustration"`.
- **Illustration prompt engineering note:** the split-scene composition is a **specific illustration-prompt pattern** worth cataloguing. When the LLM writer describes an essay-body illustration, it should be able to specify compositional archetypes:
    - `"split-scene"` — vertical seam divides two contrasting environments/states.
    - `"single-focal-point"` — one clear subject in a scene.
    - `"symmetric-mirror"` — subject reflected/mirrored.
    - `"before-after-diptych"` — two panels (image 18).
    - `"annotated-hero"` — subject + label hotspots (image 19).
    - `"path/motion"` — subject moving through space (images 17, 19, 21).
    - `"gathering/crowd"` — many figures with one focal person (image 21).
- Contributes to a **compositional archetype library** the illustration-generation prompt can use.

#### Reusability score
- **Split-scene composition:** 4/5 — very useful for before/after, past/present, joy/pain, quiet/chaos metaphors. Add to illustration-prompt library.
- Template: 5/5 (5th confirmed instance).

#### Template pattern classification (final)
- Same `aurora-essay-body`, `embed.type = "singleIllustration"` with `illustrationComposition: "split-scene"` (new prompt-level parameter).

#### Copy-pattern hint (LLM writer)
- Essay-body variant: **conceptual expansion** — starts with a claim (P1), unfolds attributes (P2), warns of a danger (P3), catastrophises the danger (P4). "Claim → Unfold → Warn → Escalate" rhythm.
- No inline emphasis needed — the natural rhythm of the paragraphs carries the reader.

#### Notes / open questions
- **This carousel is likely the Rush essay (image 21's cover) continued** — the "seasons of life" theme flows naturally from "why are you in such a rush". Confirms the 2nd essay in the folder has at least 1 body slide.
- **11-slide SahilBloom folder now fully documented.** Summary of content structure:
    - Essay A "50+ Year Marriage Advice" — images 12 (cover) + 13 (list items 1-4) + 14 (list items 9-12). 3 slides visible (missing items 5-8 slide + outro).
    - Standalone tweet — image 15.
    - Essay B "The Frog Pond Effect" — images 16 (cover) + 17, 18, 19, 20 (body slides). 5 slides visible.
    - Essay C "Why Are You In Such A Rush?" — images 21 (cover) + 22 (body slide). 2 slides visible.
    - So the 11 images sample = 3 partial carousels + 1 standalone tweet.

_Progress: 22 / 85 complete. Folder 2 (SahilBloom/) COMPLETE._

**Folder 2 summary (SahilBloom):**
- **Colour palette:** `#F3ECD8` (bg cream), `#F5F0E5` (paler bg variant), `#F5F0E8` (essay bg), `#1B1B1B` (primary ink), `#3A3A3A` (rule grey), `#8A7B6E` (muted subtitle), `#3B82F6` (chart highlight blue), `#FFFFFF` (tweet slide bg), `#0F1419` (tweet body), `#6E767D` (tweet handle grey), `#1D9BF0` (Twitter blue).
- **Type stack:** Playfair Display Regular + Italic + Bold + Bold Italic (headings, eyebrow, list body) + Inter Regular + Bold + Italic + Bold Italic (essay prose, tweet body) + a sans-serif Bold for on-image annotations + condensed bold display sans for hedcut-style caption stamps.
- **Canonical templates identified (4):**
    1. `aurora-editorial-cover` — 2 subVariants (`text-hero`, `illustrated-frame`). 3 confirmed instances (images 12, 16, 21).
    2. `aurora-editorial-list-item` — 3 confirmed instances (images 13, 14, plus item 5-8 slide implied).
    3. `aurora-tweet-quote` — 1 instance (image 15). Cross-brand reusable.
    4. `aurora-essay-body` — 5 confirmed instances (images 17, 18, 19, 20, 22). Multi-embed-type: `schematicChart`, `illustrationDiptych`, `illustrationWithAnnotations`, `singleIllustration` (with `illustrationComposition` subVariant).
- **Recurring decorative primitives:**
    - `makeEditorialHeader` (all slides).
    - `makeFramedIllustration` (covers + body embeds).
    - `makeCircularNavArrow` (left+right on body slides).
    - `makeDotProgressIndicator` (covers only).
    - `makeOutlinedPill` (cover "Swipe for more" button).
    - `makeMixedWeightText` (3-axis: family, weight, style).
    - `makeOnImageLabel` (essay-body annotations).
    - `makeSchematicBarChart` (essay-body chart embed).
    - `makeIllustrationDiptych` / `makeIllustrationTriptych` (multi-panel embeds).
- **Critical asset dependency:** WSJ-hedcut-style etched illustration library. This is THE single blocker for shipping the SahilBloom template family convincingly. Must decide on generation strategy (Midjourney LoRA / commission / prompt-engineering).

---

## Folder 3 — claude/ (25 images)

**Folder-level baseline (applies to all claude slides unless noted):**

This folder is one or more **Anthropic Claude product-marketing carousels**. Distinctive brand identity — very different from SahilBloom's editorial-cream + hedcut aesthetic. Establishing baseline here; individual entries below focus on deltas.

- **Overall brand identity:** clean product-marketing modernism. Warm off-white/beige neutral bg + coral/salmon accent (Anthropic's signature "coral"), bold modern sans-serif display type, science-diagram-style photorealistic 3D renders or clean vector illustrations. No metallic gradients, no hedcuts, no doodles. Very "tech-tabloid" polished mood.
- **Canvas:** 1080×1350 (portrait 4:5).
- **Base background:** flat warm off-white `#F5F0E5` approx (paler and slightly cooler than SahilBloom's `#F3ECD8`). No grain, no gradient.
- **Brand accent colour:** Anthropic **coral / salmon** `~#D46A5E` to `#C55642` (varies by render). Used on 3D protein ribbons, illustration accents, buttons.
- **Type stack:** modern sans-serif — likely **Inter Bold** (or Anthropic's custom brand font "Copernicus"/"Styrene") for display headlines, Regular for body. Occasionally **monospace** for technical labels (`RBX1-MYTHOSPREVIEW-RANK01` style).
- **Chrome:**
    - **No top eyebrow / handle** on these slides (very different from SahilBloom's persistent brand header).
    - **Circular chevron nav arrow `>`** on right edge (same primitive as SahilBloom's).
    - **Bottom dot indicator** — small dots row centred at bottom, current dot filled coral or black.
    - No "Swipe for more" pill, no series eyebrow. Cleaner.
- **Composition pattern:** hero image dominates (typically top-right), text stack sits bottom-left. Text is **left-aligned** and **bottom-anchored**.

Individual analyses below focus on deltas.

---

### claude/image.png
**Pattern class:** chapter-cover / product-marketing-cover — new template family for Anthropic-style product-storytelling carousels.
**Overall vibe (1 line):** Clean Anthropic product-carousel cover — big bold sans-serif question headline bottom-left, photorealistic 3D protein render top-right, small monospace technical label — magazine-tech-feature aesthetic.

- **Canvas:** 1080×1350.
- **Background:** warm off-white `#F5F0E5` (approx), flat.
- **Layout zones (top → bottom):**
    - Zone A (y≈50–950, x≈260–1000): **hero 3D image** — photorealistic render of a protein structure (secondary-structure ribbon diagram showing alpha-helices in coral-salmon `#D46A5E` and beta-sheets + backbone in muted grey/silver, small spheres representing ions or ligand atoms). Positioned in the top-right ~70 % of canvas.
    - Zone B (y≈960–990, x≈740–990, right-aligned): **monospace technical label** `RBX1-MYTHOSPREVIEW-RANK01` — muted grey, ~18 px.
    - Zone C (y≈1050–1250, x≈45–990): **display headline** — bold sans-serif, black, 3 lines, left-aligned: `Can Claude speed up / an early step / in drug discovery?`
    - Zone D (y≈1280–1330, x≈45–990): **subtitle** — sans-serif Regular, black, 2 lines, left-aligned: `We asked Claude to design protein binders. It succeeded at about twice the field's typical rate.`
    - Zone E (y≈1360, bottom-centre): **dot indicator** — 10 tiny dots, first filled, rest outlined.
    - Right edge (y≈650, x≈1010): **circular chevron nav arrow** — white filled circle with black `>` chevron, same primitive as SahilBloom image 16.
- **Grid & alignment:** hero-right + text-bottom-left composition. Text left-aligned throughout the text stack.
- **Typography:**
    - **Display headline:** modern sans-serif, weight 700 (Bold), ~72 px, `#1B1B1B` (near-black, not pure black), line-height ~1.1, letter-spacing ~-0.5 px. Font: **Anthropic's brand font (Copernicus / Styrene?)** or **Inter Bold** as a fallback. High x-height, geometric-humanist letterforms.
        - Note the **curly apostrophe** in `field's`.
    - **Subtitle:** same sans-serif family, Regular 400, ~30 px, `#1B1B1B`, line-height ~1.35, left-aligned.
    - **Monospace label `RBX1-MYTHOSPREVIEW-RANK01`:** monospace font, Regular 400 or Medium 500, ~18 px, muted grey `#8A8A8A`, letter-spacing slightly tracked. Candidate: **JetBrains Mono**, **IBM Plex Mono**, or **Anthropic's Söhne Mono** if they have one.
- **Decorative elements:**
    - **3D protein render:** photorealistic rendering of a protein secondary structure. Coral/salmon `~#D46A5E` alpha-helices spiralling around a grey central beta-sheet + coil region. Small dark-grey spheres represent ions/ligand atoms. Cast shadow from the light source (upper-right). This is a **PyMOL / ChimeraX / BioBlender render** style — very specific to structural biology.
    - Coral colour is Anthropic's signature accent — appears on all their marketing. `#D46A5E` (approx).
    - **Circular nav arrow (`>`):** same primitive as SahilBloom. White circle, black chevron, subtle drop shadow.
    - **Dot indicator:** 10 dots, ~6 px each, first filled dark, rest outlined faded.
- **Layering order:** `[off-white bg] → [3D protein render] → [monospace label under render] → [display headline] → [subtitle] → [nav arrow] → [dot indicator]`.
- **Shadows & effects:** subtle drop shadow beneath the 3D render (baked into the render output). Nav arrow has subtle shadow. Otherwise flat.
- **Brand markers:** NONE overt (no @handle, no logo visible). Brand identity is carried by:
    - Coral colour on the protein render.
    - Bold sans-serif display font.
    - Technical monospace label style.
    - Overall "Anthropic product carousel" polish.
    - Likely the FINAL slide of the carousel (image 47) will have the Anthropic wordmark.
- **Word count:** 3 monospace label + 12 headline + 15 subtitle = ~30 words. Cognitive load = **low** — very clean cover.

#### Fabric.js reproduction notes
- **Cream flat bg:** `Rect` with `fill='#F5F0E5'`.
- **Hero 3D render:** `FabricImage.fromURL(...)`. This is likely **a curated Anthropic-supplied render**, not something we'd generate. For our system to reproduce this template style, we need to decide:
    1. Ship a **library of stock 3D-render/vector illustration hero images** on the coral-and-neutral palette.
    2. Generate on-demand via Midjourney/DALL-E with prompt style `"photorealistic 3D protein secondary structure render, coral alpha-helices, grey beta-sheets, PyMOL rendering style, isolated on cream background"`.
    3. Punt — user uploads their own hero image (product screenshot, diagram, illustration).
    Recommend option 3 for MVP + option 1 as we accumulate a stock library.
- **Display headline:** `Textbox` with `fontFamily='Inter'`, `fontWeight=700`, `fontSize=72`, `textAlign='left'`, `fill='#1B1B1B'`, `lineHeight=1.1`.
- **Monospace technical label:** `Textbox` with `fontFamily='JetBrains Mono'` or `'IBM Plex Mono'`, `fontSize=18`, `fill='#8A8A8A'`.
- **New helpers required:**
    - `makeProductCoverSlide({heroImage, technicalLabel?, displayHeadline, subtitle, dotIndicator, navArrow, bg})` — the whole cover-slide builder.
    - `makeMonospaceLabel({text, size, color, position})` — reusable small monospace tag (any tech-marketing slide).
- **Font loading:**
    - **Anthropic's brand font** — likely proprietary. Fall back to **Inter Bold + Regular** for display + body.
    - **JetBrains Mono** or **IBM Plex Mono** — must add for monospace labels. Neither is in our current stack.

#### Motion cue
- The nav arrow points right — implies swipe. The composition's diagonal (top-right image → bottom-left text) creates a natural reading path.

#### IG safe-zone check
- Hero image top at y≈50 — inside 200-px top zone. But it's decorative (no text there), so acceptable.
- Bottom subtitle ends y≈1330 — inside the 1170-px bottom-CTA-overlay zone. **Risk** — subtitle's last line may be clipped by IG's caption overlay. Recommend raising the text stack 100 px, or accepting the risk on covers where the reader has context.
- Dot indicator at y≈1360 — deep in the bottom risk zone. Optional decorative element.

#### Reusability score
- **General template family (hero-image-top-right + display-headline-bottom-left + subtitle):** 5/5 — canonical tech-marketing carousel cover. Endlessly reusable across AI product features, research posts, product launches.
- **Specific "protein render + drug discovery" content:** 3/5 — niche to biotech/AI-research.

#### Template pattern classification (final)
- Proposed key: **`aurora-product-cover`** — a canonical "tech product marketing cover" template.
- Structure: `{bg, heroImage, technicalLabel?, displayHeadline (question format supported), subtitle (1-2 lines), navArrow, dotIndicator}`.
- **HIGH PRIORITY** for product-marketing use cases. Ship in Phase 4 or Phase 5 alongside the editorial family.
- Sits in a new **product-marketing template family** distinct from compact / editorial / trend-brief families.

#### Copy-pattern hint (LLM writer)
- Headline formula: **question hook** — `"Can [Subject] [verb] [aspect] in [domain]?"` or `"How does [Subject] [verb] [aspect]?"`.
- Subtitle formula: **claim + evidence** — `"We [action-verb] [subject]. [Numeric evidence sentence]."` Concrete numeric result at the end sells the click.
- Technical label formula: `[ID-CODE]` — a distinctive tech-lab identifier (looks like a compound / project / model ID). Adds credibility.
- Voice: **corporate research-marketing** — first-person plural ("We asked...", "We tested..."), concrete numeric claims, understated tone.

#### Notes / open questions
- **This is essay/carousel 1 of the claude folder — cover only.** 24 more claude slides remain (images 24–47). Very likely all belong to the same "Claude drug discovery" carousel OR a mix of 2–3 Claude product carousels.
- **Anthropic brand palette:** we should establish a distinct **`LUMINA_ANTHROPIC` palette** in our design tokens, if we want to offer this template. Includes:
    - `BG_WARM_OFFWHITE = #F5F0E5`
    - `INK_BLACK = #1B1B1B`
    - `INK_MUTED_GREY = #8A8A8A`
    - `ACCENT_CORAL = #D46A5E`
    - `ACCENT_CORAL_DEEP = #C55642`
    - `SURFACE_LIGHT_GREY = #E8E4DA` (for card surfaces)
- Anthropic's **custom fonts (Copernicus, Styrene)** are proprietary and licensed. We can't ship them. **Fallback: Inter Bold + Regular + Söhne family**. May want to A/B test which sans best matches the Anthropic aesthetic.
- The **3D-render hero style is a huge asset dependency.** Similar to SahilBloom's hedcut illustrations, this template family requires a specific asset style to feel authentic. Options:
    1. Curated stock library of coral+neutral 3D renders/vectors.
    2. AI-image-gen prompt style tuned to this aesthetic.
    3. User-supplied hero image (product screenshot, chart, illustration).
    Recommend option 3 for MVP + gradual asset library growth.

_Progress: 23 / 85 complete._

---

### claude/image copy.png
**Pattern class:** essay-body / product-marketing-body — first Anthropic body slide with **annotated hero image + heading + body**.
**Overall vibe (1 line):** Body slide in the Claude drug-discovery carousel — 3D protein-complex render with hand-drawn callout arrows labelling `Target molecule` and `Protein binder`, then bold section heading + prose paragraph below.

Same claude/ folder-level baseline (off-white bg, no top eyebrow, coral accent, monospace label). Establishes a new **body-slide template** distinct from cover slide 23.

- **Canvas:** 1080×1350. Bg: `#F5F0E5` warm off-white, flat.
- **Layout zones (top → bottom):**
    - Zone A (y≈50–870, x≈40–1000): **hero 3D image** — large protein-complex render:
        - Main structure: pale grey/silver **ribbon protein** (secondary structure) filling most of the frame — coils, sheets, loops.
        - Highlighted section: **coral/salmon `#D46A5E` helix bundle** in the upper-right, docked against the grey structure. This is the "protein binder" attached to the "target molecule".
        - Same photorealistic PyMOL/ChimeraX-style render as image 23.
    - Zone B (annotations OVER the image):
        - Top-right (y≈50–120, x≈490–620): **label `"Protein binder"`** — sans-serif Regular ~28 px, black, single line. Below the label: **hand-drawn pen-stroke arrow** curving DOWN-LEFT and pointing at the coral helix bundle.
        - Left-middle (y≈145–200, x≈75–280): **label `"Target molecule"`** — same sans-serif Regular ~28 px, black. Below/beside the label: **hand-drawn pen-stroke arrow** with a little curl at the end, pointing DOWN-RIGHT at the grey ribbon structure.
        - These are **hand-drawn / doodled annotation arrows** — different from the sharp SVG chevrons. Pen-stroke feel, single continuous curve with arrowhead. Colour: black `#000000`.
    - Zone C (y≈905–935, right-aligned x≈720–990): **monospace technical label** `EGFR-MYTHOSPREVIEW-RANK04` — muted grey `#8A8A8A`, ~18 px. Note the compound name has changed from image 23's `RBX1-...` to `EGFR-...` — different molecule, different slide.
    - Zone D (y≈990–1050, x≈45–500): **section heading** `It begins with binding` — bold sans-serif, ~44 px, `#1B1B1B`, left-aligned, single line.
    - Zone E (y≈1080–1250, x≈45–1000): **body paragraph** — sans-serif Regular ~30 px, `#1B1B1B`, line-height ~1.4, left-aligned, 4 lines: _"Most medicines work by latching onto a specific molecule in the body and switching it on or off. That grabber, which can be a protein binder shaped to fit one target, is where a lot of drug discovery starts."_ (44 words)
    - Zone F (y≈1290, centre): **dot indicator** — 11 dots, 2nd filled (this is slide 2 of the carousel).
    - Left edge (y≈650, x≈15): **circular chevron nav arrow** `<` (previous). White fill, black chevron.
    - Right edge (y≈650, x≈1015): **circular chevron nav arrow** `>` (next). Same style.
- **Typography:**
    - **Annotation labels** (`Protein binder`, `Target molecule`): sans-serif Regular ~28 px, `#1B1B1B` (near-black), single line each. Font same as body — **Inter Regular**.
    - **Section heading** `It begins with binding`: sans-serif **Bold 700**, ~44 px, `#1B1B1B`, left-aligned. Same font as image 23 headline (**Anthropic Copernicus/Styrene** or **Inter Bold** fallback).
    - **Body paragraph**: sans-serif Regular ~30 px, `#1B1B1B`, line-height ~1.4.
    - **Monospace label**: same JetBrains/IBM Plex Mono style as image 23.
- **NEW distinctive decorative primitive — hand-drawn annotation arrows:**
    - Simple black pen-stroke arrows, ~2–3 px stroke width, curving from a label to an on-image target. Small arrowhead at target end.
    - **DIFFERENT from SahilBloom image 17's clean SVG nav arrows.** These are **doodle-style annotation arrows** — like a pencil-drawn callout in an academic figure. Feel: hand-drafted, informal, "professor sketching on a whiteboard".
    - Related to `others/image copy 6.png`'s hand-drawn arrow but simpler/thinner and used as callout markers, not "swipe direction" cues.
- **Layering order:** `[off-white bg] → [3D protein render] → [annotation labels] → [hand-drawn annotation arrows] → [monospace label] → [section heading] → [body paragraph] → [L/R nav arrows] → [dot indicator]`.
- **Shadows/effects:** subtle drop shadow on the 3D render (baked in). Nav arrows have subtle shadow. Otherwise flat.
- **Word count:** 4 annotation + 3 monospace + 4 heading + 44 body = ~55 words. Cognitive load = **medium** — reader is expected to inspect the illustration + read the paragraph. Reasonable for a body slide.

#### Fabric.js reproduction notes
- Same core template as image 23 for the top half; new components in the bottom half:
    - `makeAnnotatedImage({image, annotations: [{text, position: {x, y}, arrowPath, arrowStyle}]})` — a helper that takes an image + array of annotations. Each annotation has a text label + an SVG-path arrow from label anchor to target point on the image.
    - `makeHandDrawnCalloutArrow({from: {x, y}, to: {x, y}, style: "pen-stroke" | "pencil" | "marker", color, strokeWidth})` — the arrow primitive. Uses SVG Bézier paths with slight jitter for hand-drawn authenticity. Ship a small library of variants.
- **Big picture:** claude body slides use the **same essay-body abstraction** as SahilBloom essay-body slides (image 17+), but the illustration style + annotation aesthetic + section-heading pattern are different. So we might have:
    - `aurora-essay-body` — long-form prose + pluggable embed (SahilBloom's style).
    - `aurora-product-body` — hero image + optional annotations + heading + body paragraph (Anthropic's style).
    Both belong to the **long-form** family. Different chrome, different composition, different voice.
- **New helpers required:**
    - `makeAnnotatedImage({image, annotations, arrowStyle: "hand-drawn" | "svg-clean"})` — combines image + labels + arrows.
    - `makeHandDrawnCalloutArrow({from, to, style, color, strokeWidth, curl?: boolean})` — pen-stroke curved arrows for annotations. Related to `makeDoodleArrow` from `others/image copy 6.png` but positioned as an annotation callout, not a direction cue.
    - `makeProductBodySlide({heroImage, imageAnnotations?, monospaceLabel?, sectionHeading, bodyParagraph, navArrows, dotIndicator, bg})` — the whole builder.
- Confirms the `aurora-product-body` template with `embed.type = "annotatedImage"` — parallel to `aurora-essay-body`'s `illustrationWithAnnotations`.

#### Motion cue
- The two annotation arrows guide the eye through the image: read "Protein binder" → follow arrow to coral bundle → read "Target molecule" → follow arrow to grey structure. Then eye drops to heading + body. Clean reading path.

#### IG safe-zone check
- Hero at top edge — decorative, acceptable.
- Body paragraph ends y≈1250 — inside the 1170-px bottom-CTA-overlay zone. Body's last line may be clipped by IG chrome. Same tight-bottom pattern as SahilBloom essay slides.

#### Reusability score
- **Annotated-hero-image + heading + body template:** 5/5 — the canonical "scientific/technical explainer" slide. Applies to any AI-marketing carousel, product-feature carousel, research post.
- **Hand-drawn callout arrows:** 5/5 — reusable across ANY explainer slide with a labelled diagram.

#### Template pattern classification (final)
- Proposed key: **`aurora-product-body`** — Anthropic-style body slide with hero image + optional callout annotations + section heading + body paragraph.
- Companion to `aurora-product-cover` (image 23). Cover + N body slides = a Claude-style product carousel.
- Sits in the **product-marketing template family** (new alongside compact / editorial / trend-brief / essay-body).

#### Copy-pattern hint (LLM writer)
- Section heading formula: `"[Verb-phrase / declarative statement]"` — short, punchy, sets up the paragraph. Examples: `"It begins with binding"`, `"The challenge is finding fits"`, `"Scale changes everything"`. Voice is **explanatory-authoritative**.
- Body paragraph formula: **claim → clarify → connect** — 30–60 words. First sentence states a fact, second clarifies a term/mechanism, third connects to the broader story.
- Annotation labels: 2–3 words each, plain Regular (not bold, not caps). Neutral descriptor of what the callout marks. LLM should generate annotations from the hero-image content (requires the image to be described first).

#### Notes / open questions
- **Body slide chrome differs from cover:** covers have monospace label + big display headline; body slides have monospace label + smaller bold heading + prose paragraph + nav arrows on BOTH edges. Registry: `chromeStyle: "product-cover" | "product-body"`.
- **The two-tier illustration approach** in the claude family:
    - **Cover slide (image 23):** hero-only, no annotations. Sells the click.
    - **Body slide (image 24):** hero + annotations + explanatory paragraph. Delivers the payload.
- **Compound name in monospace label changes per slide** (`RBX1-...` on cover → `EGFR-...` on body slide). Suggests each slide has a **different data point / molecule** — this is a data-heavy carousel showing multiple experimental results. Our system could support this via per-slide `technicalLabel` field.

_Progress: 24 / 85 complete._

---

### claude/image copy 2.png
**Pattern class:** essay-body / product-marketing-body — second confirmed use of `aurora-product-body` template, this time with a **cinematic lab photograph** hero.
**Overall vibe (1 line):** Slide 3 of the Claude drug-discovery essay — same essay-body layout as image 24, but the embed is a **photograph** (three white-coated researchers working at benches in a cinematic modern lab) instead of a 3D protein render. No annotations this time.

Same `aurora-product-body` skeleton as image 24. Deltas only:

- **Canvas / bg / nav arrows:** identical to image 24.
- **Hero image (Zone A, y≈70–890):** cinematic **photograph** with **shallow depth of field**:
    - Three scientists in white lab coats working at bench stations in a modern glass-walled lab.
    - Mid-ground: two researchers standing at a bench, a third seated at a microscope in the middle distance.
    - Foreground blur: something metallic + glass out-of-focus (a beaker or lab equipment), creating a photographic "peek-through" effect.
    - Background: full-height glass windows with natural daylight.
    - Colour palette: muted warm neutrals (beige/silver/cream) + touches of teal/steel-blue on lab equipment. Matches the cream bg palette.
    - **NO annotations** on this image — cleaner, storytelling-through-photography rather than diagram-with-labels.
- **NO monospace technical label** on this slide. Confirms the label is optional per-slide (not every body slide has a compound identifier).
- **Section heading (Zone D, y≈950–1000):** `A slow, manual process` — sans-serif Bold ~44 px, `#1B1B1B`, left-aligned, single line.
- **Body paragraph (Zone E, y≈1030–1230):** sans-serif Regular ~30 px, `#1B1B1B`, line-height ~1.4, left-aligned, 4 lines: _"Designing new binder proteins takes time. A specialist can spend weeks on a single target, running a stack of AI tools and stitching the results together by hand."_ (28 words)
- **Dot indicator (Zone F, y≈1270):** 8 dots visible, 3rd filled (slide 3 of the carousel — dot count differs from image 24's 11, either miscount or the total-visible-dots count is per-slide-variable, which would be weird; likely the actual total is consistent and dots just aren't all visible).

#### Fabric.js reproduction notes
- Nothing new architecturally. `aurora-product-body` with `heroImage = photograph` and `imageAnnotations = null` and `technicalLabel = null`.
- Confirms the template supports **flexible hero-image types**:
    - `heroImage.type: "3d-render" | "photograph" | "illustration" | "chart" | "screenshot"`
    - Each may or may not have `annotations`, `technicalLabel`, `caption`.
- Photograph body slides are much easier to source than 3D renders — user can upload stock photography or their own images. Makes this template accessible to non-technical brands.

#### Motion cue
- Cinematic photograph implies "day-in-the-life" documentary feel. The **foreground blur** creates a "peek-through" motion — reader feels like they're spying on the researchers. Great for empathy building ("look how hard these scientists work").

#### IG safe-zone check
- Same as image 24: body paragraph ends y≈1230, inside the 1170-px risk zone. Last line at risk of clipping.
- Dot indicator at y≈1270 is inside the risk zone (decorative).

#### Reusability score
- **Photograph-hero body slide:** 5/5 — accessible template for any business/product carousel with lifestyle photography.
- **"Show the work" documentary aesthetic:** high value for research/product/mission-driven brands.

#### Template pattern classification (final)
- Same `aurora-product-body`, `heroImage.type = "photograph"`, no annotations.

#### Copy-pattern hint (LLM writer)
- Section heading formula (image 24 style): `"A [adjective], [adjective] [process/noun]"` — descriptive, sets up a challenge or observation. Examples: `"A slow, manual process"`, `"A fresh look at old problems"`, `"A better way forward"`.
- Body formula: same "state → elaborate → contextualise" 3-sentence structure.
- Voice: same corporate-explanatory. **First-person plural NOT used here** (unlike image 23's "we asked") — this slide uses third-person impersonal ("A specialist can spend...") to describe the industry norm before Claude improves on it. Common narrative arc: describe status quo → show breakthrough.

#### Notes / open questions
- Confirms **photograph is a valid hero-image type** for the product-body template. Our system should support **user-uploaded hero photos** as a first-class case, not just AI-generated illustrations. Photography is the accessible fallback when custom illustrations aren't available.
- **Narrative arc across the carousel:** slide 23 = "Can Claude do X?" → slide 24 = "Here's how binding works" (educational) → slide 25 = "Here's the current painful process" (problem-setting) → slides 26+ likely = "Here's what Claude does" (solution). Classic problem-solution narrative structure. Our LLM should generate essay-carousels following this arc.

_Progress: 25 / 85 complete._

---

### claude/image copy 3.png
**Pattern class:** product-marketing-body — **grid-of-thumbnails variant** of `aurora-product-body`. Instead of a single hero image, this slide uses a **6-cell (2×3) grid of small labelled protein renders**.
**Overall vibe (1 line):** Slide 4 of the Claude drug-discovery essay — showcases the "candidate library" Claude produced, presenting six protein-target results as a specimen sheet, then delivers the "Enter Claude" reveal paragraph.

Same claude-family folder baseline as images 23–25 (warm off-white bg `#F5F0E5`, `#1B1B1B` ink, coral accent, JetBrains Mono for labels, Inter Bold/Regular for headings/body, L/R circular nav chevrons, bottom dot indicator). Deltas from `aurora-product-body` (image 24):

- **Canvas:** 1080×1350. Same folder baseline. Full-bleed cream `#F5F0E5`.
- **Nav arrows:** L chevron (y≈675, x≈40) + R chevron (y≈675, x≈1000), same circular outlined style as images 24–25.
- **NO monospace top-eyebrow label** (like image 25 — the technical-label field is empty for this slide).

- **Zone A — Thumbnail grid (y≈80 → y≈960):** the new distinctive element.
    - **2 columns × 3 rows = 6 cells**, roughly equal-sized, arranged in a **loose regular grid** (not table lines — pure whitespace separation).
    - Each cell contains:
        - **Protein render** (small 3D "ribbon" illustration, same coral `#D46A5E`-ish coral colouring on cream bg, no drop shadow, no bounding box). Renders vary in shape (helical bundles, sheets, mixed folds) so each looks distinct — the visual variety is the point.
        - **Monospace caption underneath** the render: JetBrains Mono Regular, ~20–22 px, all-caps, `#1B1B1B`, letter-spacing ~0.05em, centred under the render.
    - **Caption format:** `<TARGET-CODE>-<MODEL-CODE>-RANK<##>`. Verbatim samples visible in this image:
        - Row 1: `BHRF1-MYTHOSPREVIEW-RANK08` | `TREM2-OPUS4.8-RANK03`
        - Row 2: `BBF-14-OPUS4.8-RANK21` | `PD-L1-MYTHOSPREVIEW-RANK18`
        - Row 3: `NIPAH G-MYTHOSPREVIEW-RANK03` | `VEGF-A-OPUS4.8-RANK22`
    - **Cell dimensions (approx):**
        - Cell width ~460 px, cell height ~280 px, gutter ~60 px between columns, ~40 px between rows.
        - Render size inside cell: ~180 px wide × ~140 px tall, centred horizontally, top ~40 px of cell.
        - Caption sits ~20 px below render, centred.
    - **No cell borders**, no background tints, no dividers — pure whitespace grid.
    - Layout has a **specimen-sheet / catalogue** feel — evokes a scientific poster showing multiple experimental results.

- **Zone B — Section heading (y≈1020 → y≈1075):** `Enter Claude` — Inter Bold ~44 px, `#1B1B1B`, left-aligned, ~40 px x-margin, single line.

- **Zone C — Body paragraph (y≈1090 → y≈1265):** Inter Regular ~28 px, `#1B1B1B`, line-height ~1.4, left-aligned, 4 lines. Verbatim:
    _"We gave Claude 15 protein targets and let it work on its own. It chose where to bind, operated the specialist design tools, and selected its own candidates. In just over **two days**, it was finished."_
    - Inline **bold** on `two days` (Inter Bold, same size, `#1B1B1B`) — same mid-paragraph-emphasis pattern seen in editorial-body slides.
    - Word count: ~46 words. Density: medium.

- **Zone D — Dot indicator (y≈1290):** row of dots at bottom-centre, 4th filled (this is slide 4 in the carousel). ~8–10 visible dots, `#8A8A8A` muted for unfilled, `#1B1B1B` for the active one. Same primitive as images 23–25.

#### Layering (back → front)
`[bg #F5F0E5]` → `[6 × protein render + caption cells]` → `[section heading "Enter Claude"]` → `[body paragraph]` → `[L nav chevron]` → `[R nav chevron]` → `[dot indicator]`.

#### Typography stack (this slide)
- **Caption (×6):** JetBrains Mono Regular ~22 px, all-caps, `#1B1B1B`, letter-spacing ~0.05em, centred. Total on-slide: 6 captions.
- **Section heading:** Inter Bold ~44 px, `#1B1B1B`, left-aligned.
- **Body paragraph:** Inter Regular ~28 px, `#1B1B1B`, line-height 1.4. Inline Bold on emphasis word (`two days`).

#### Decorative elements
- 6 × small 3D protein renders (coral tones, cream bg-integrated, no shadows, no frames).
- L & R circular nav chevrons (same as folder baseline).
- Dot progress indicator.
- No other decoration — the grid + paragraph does all the work.

#### Fabric.js reproduction notes
- **NEW template variant:** `aurora-product-body-grid` — or better, extend `aurora-product-body` with a `bodyLayout` union:
    - `bodyLayout: "single-hero"` (image 24, 25) — one large image on top.
    - `bodyLayout: "thumbnail-grid"` (image 26) — N × M grid of labelled thumbnails.
- Grid config: `{ columns: 2, rows: 3, cellWidth, cellHeight, hGutter, vGutter, cells: Array<{ imageUrl, caption }> }`.
- **New Fabric helper needed:** `makeLabelledThumbnailGrid({ cells, columns, rows, hGutter, vGutter, x, y, cellSize, captionFont, captionSize, captionColor })` — auto-lays out a grid of image + centred monospace caption pairs.
- Each cell reuses `makeImage` + `makeMonospaceLabel` (already proposed for image 23).
- Empty-cell handling: if fewer cells than columns×rows, either centre remaining or leave blank — TBD.
- No new fonts required (JetBrains Mono + Inter already needed from earlier claude/ slides).

#### Motion cue
- The grid feels **inventory-like / specimen-catalogue** — reader "browses" the six candidates as if flipping through a lab notebook. Implied motion = scanning L→R, T→B across the six items before landing on the reveal paragraph.
- Static, but the arrangement suggests "here is the output — now read what happened".

#### IG safe-zone check
- Top of grid at y≈80 — grid partly clipped by top 200-px avatar bar (row 1 renders + captions may sit under the avatar bar). Risk: MEDIUM. The two top-row molecules may be visually obscured on some IG viewports.
- Body paragraph ends y≈1265 — inside the 1170-px bottom-CTA-overlay zone. Last line at risk of clipping. Same tight-bottom pattern as images 24–25.
- Dot indicator at y≈1290 — inside CTA overlay risk zone (decorative).

#### Reusability score
- **Labelled-thumbnail-grid body layout:** 5/5 — extremely reusable. Any slide showing "here are the N variants/candidates/options we produced" fits this template. Product carousels (SKU grids), portfolio slides (project thumbnails), research posts (specimen sheets), before/after comparisons (multiple pairs), team pages (headshots + names).
- **Specimen-sheet aesthetic:** 5/5 — evokes scientific rigour; useful for AI, biotech, research, engineering brands.

#### Template pattern classification (final)
- Proposed: **`aurora-product-body`** with `bodyLayout: "thumbnail-grid"` variant.
- Alternatively, split into a dedicated **`aurora-product-body-grid`** template if the grid config is complex enough to warrant its own builder — recommend keeping it as a subVariant to minimise template proliferation.

#### Copy-pattern hint (LLM writer)
- Section heading formula: **`"Enter <Subject>"`** or `"<Verb-phrase>"` — very short (2–3 words), declarative, marks a narrative pivot ("here's what changes"). Examples: `"Enter Claude"`, `"The result"`, `"What we found"`.
- Body paragraph formula: **subject-in-action → mechanism → outcome-with-emphasis-timing**. First sentence names the subject and what it did; second sentence lists the sub-actions; third sentence closes with a **time/quantity beat** using inline-bold emphasis (`two days`, `15 minutes`, `3 lines of code`). The bold-on-time pattern reappears from SahilBloom essay-body slides.
- Grid caption formula: **`<TARGET>-<MODEL>-<RANK>`** monospace all-caps — a coded identifier that reads like a filename or DB key. LLM should generate captions in the domain vocabulary of the topic (e.g. for a design carousel: `LANDING-V3-DRAFT02`, for a code carousel: `AUTH-CLAUDE-v4.8-COMMIT12`).

#### Notes / open questions
- **Narrative arc confirmed (extends analysis from image 25):**
    - Slide 23 (cover): `"Can Claude speed up drug discovery?"` — question hook.
    - Slide 24 (body 1): `"It begins with binding"` — educational context.
    - Slide 25 (body 2): `"A slow, manual process"` — problem-setting.
    - Slide 26 (body 3): `"Enter Claude"` — the reveal / solution pivot. **Uses grid layout to show the concrete output** before the narrative resumes.
    - Expected slides 27+: outcomes, impact, results, close.
- **The grid appears at the "reveal" moment** — not the cover, not the educational build-up. Suggests our system should let the LLM writer decide the pivot slide and mark it with `bodyLayout: "thumbnail-grid"` to signal "this is where we show the goods".
- **Grid cell count is flexible:** 6 = 2×3 works well at 1080×1350. Could also support 4 (2×2) for larger renders, 8 (2×4) for denser catalogue, 9 (3×3) for gallery. Registry: `gridConfig: { columns: 2 | 3, rows: 2 | 3 | 4 }`.
- **Coral colour on all 6 renders is consistent** — implies the source images were rendered with a fixed material colour (matches the brand accent `#D46A5E`). Our system needs to either (a) instruct the illustration generator to use a specific accent colour, or (b) post-process user-uploaded renders via a duotone / colour-wash filter to enforce brand consistency. This is a NEW requirement — flag for the image-generation phase.
- **Caption text is factual/database-y**, not marketing prose. Reinforces the scientific-authority tone. LLM writer for this template variant should generate captions in the "identifier" style, not the "descriptor" style.

_Progress: 26 / 85 complete._

---

### claude/image copy 4.png
**Pattern class:** product-marketing-body — **stat-comparison variant** of `aurora-product-body`. Two stacked large-numeric stat blocks (baseline vs. Claude), then heading + body paragraph.
**Overall vibe (1 line):** Slide 5 of the Claude drug-discovery essay — the "here are the numbers" reveal, using giant display percentages to contrast field-typical performance vs. Claude's, then a "Into the lab" section explaining how the numbers were measured.

Same claude/ folder-level baseline (warm off-white `#F5F0E5`, Inter Bold/Regular, JetBrains Mono for tech tags, L/R circular nav chevrons, bottom dot indicator, no top eyebrow). Deltas from `aurora-product-body` (image 24):

- **Canvas:** 1080×1350. Full-bleed `#F5F0E5`.
- **Nav arrows:** L chevron (y≈540, x≈40) + R chevron (y≈540, x≈1000). Same circular outlined style.
- **NO monospace top-label** (like images 25–26).

- **Zone A — Baseline stat block (y≈120 → y≈340):**
    - **Giant numeric display:** `10-15%` — Inter Black / Bold ~156 px, colour **muted warm grey `#B8B0A5`** (a low-contrast "you're not the point" grey — deliberately faded against the cream bg). Left-aligned, ~50 px left margin. Note the **en-dash `–`** between numerals (not hyphen).
    - **Caption underneath:** `Typical for the field` — Inter Regular ~30 px, `#1B1B1B`, left-aligned, ~30 px below the numeric.

- **Zone B — Highlight stat block (y≈390 → y≈630):**
    - **Giant numeric display:** `22-35%` — Inter Black / Bold ~156 px, colour **Anthropic coral `#D46A5E`** (the brand accent — signals "this is the win"). Left-aligned, same left margin as Zone A.
    - **Caption underneath:** `Claude's protein designs` — Inter Regular ~30 px, `#1B1B1B`, left-aligned. Note **curly apostrophe** in `Claude's`.
    - The visual weight contrast (faded grey vs saturated coral) does 90% of the storytelling — reader instantly sees "Claude is ~2× the baseline".

- **Zone C — Section heading (y≈900 → y≈955):** `Into the lab` — Inter Bold ~40 px, `#1B1B1B`, left-aligned, single line.

- **Zone D — Body paragraph (y≈970 → y≈1240):** Inter Regular ~30 px, `#1B1B1B`, line-height ~1.4, left-aligned, 4 lines. Verbatim:
    _"Two independent labs (Adaptyv Bio and Twist Bioscience) physically built Claude's proteins and tested them. Claude's designs bound at roughly double the rate typical for the field."_
    - Word count: ~28 words. Density: medium.

- **Zone E — Dot indicator (y≈1290):** ~11 dots, 5th filled (slide 5 of the carousel). Same primitive as prior claude/ slides.

#### Typography stack (this slide)
- **Giant numerics (×2):** Inter Black or Bold ~156 px, en-dash between ranges, letter-spacing tight (~-1 px). Colour swaps per row: muted grey `#B8B0A5` (baseline) → coral `#D46A5E` (highlight). This colour contrast IS the design.
- **Stat captions (×2):** Inter Regular ~30 px, `#1B1B1B`.
- **Section heading:** Inter Bold ~40 px, `#1B1B1B`.
- **Body paragraph:** Inter Regular ~30 px, `#1B1B1B`, line-height 1.4.

#### Decorative elements
- No illustration, no photograph, no chart chrome. **The typography IS the visual.** The two giant numerics function as visual heroes.
- L & R circular nav chevrons.
- Dot indicator.

#### Layering (back → front)
`[bg #F5F0E5]` → `[baseline stat numeric + caption]` → `[highlight stat numeric + caption]` → `[section heading "Into the lab"]` → `[body paragraph]` → `[L nav chevron]` → `[R nav chevron]` → `[dot indicator]`.

#### Fabric.js reproduction notes
- **NEW `bodyLayout` variant for `aurora-product-body`:** `"stat-comparison"`. Extends the union:
    - `bodyLayout: "single-hero"` (image 24, 25) — one big image.
    - `bodyLayout: "thumbnail-grid"` (image 26) — N × M labelled thumbnails.
    - `bodyLayout: "stat-comparison"` (image 27) — 2 (or N) stacked stat blocks, each = big-numeric + caption, each block has a colour role (`baseline` vs `highlight`).
- **New Fabric helper needed:** `makeStatBlock({ value, caption, valueColor, captionColor, valueSize, captionSize, valueFont, captionFont, x, y })` — one giant-numeric + caption pair. Left-aligned.
- **Composition helper:** `makeStatComparisonLayout({ blocks: Array<{ value, caption, role: "baseline" | "highlight" }>, x, y, gap, roleColorMap })` — stacks N stat blocks vertically with configurable colour roles.
- Value formatting: en-dash for ranges (`10–15%`, `22–35%`), literal `%` glyph. LLM should generate values as strings, not numbers, to preserve formatting.
- **No new fonts required.** Inter Black + Regular + Bold already needed. If Inter Bold at ~156 px doesn't have enough visual weight for the display numerics, consider adding **Inter Black (900)** — many Anthropic marketing slides seem to use a heavier cut than plain Bold. Flag for Loop-3 verification.
- **Emerging design token:** `MUTED_STAT_GREY = #B8B0A5` — a warm low-contrast grey specifically for "de-emphasised" numerics against cream. Sits alongside `INK_MUTED_GREY = #8A8A8A` (which is cooler + darker, used for tech labels).

#### Motion cue
- Reader's eye lands on the giant grey `10-15%` first (weakened by low contrast), then drops to the giant coral `22-35%` (saturated → visually dominant). Colour contrast = built-in comparison motion. Then eye drops to "Into the lab" section for the payoff explanation. Clean top-to-bottom reading path with visual hierarchy doing the work.
- **The colour swap (muted → saturated) is the entire persuasion mechanic.** No arrows, no bars, no chart — pure typographic contrast.

#### IG safe-zone check
- Top of grey `10-15%` numeric at y≈120 — inside the top 200-px avatar-bar risk zone. Top of the digits may be clipped. Recommend raising to y≥220 in production adaptation, OR accepting the risk since the baseline stat is deliberately de-emphasised (clipping matters less).
- Body paragraph ends y≈1240 — inside the 1170-px CTA-overlay zone. Last line at risk of clipping. Same tight-bottom pattern as all claude/ body slides.
- Dot indicator at y≈1290 — deep in CTA overlay zone (decorative).

#### Reusability score
- **Stat-comparison body layout:** 5/5 — extremely reusable. Any slide showing "baseline vs. our result" fits. Product benchmarks, before/after metrics, industry-vs-ours comparisons, user-satisfaction scores. Universally applicable.
- **Colour-contrast persuasion technique (muted grey vs brand accent):** 5/5 — a design pattern the LLM should apply anywhere it has 2 stats to compare.

#### Template pattern classification (final)
- Proposed: **`aurora-product-body`** with `bodyLayout: "stat-comparison"`.
- Extensible to N blocks (not just 2). Common variants: 2 (before/after), 3 (past/present/future), 4 (Q1/Q2/Q3/Q4).
- Each block has `role: "baseline" | "highlight" | "neutral"` — driving colour selection from the palette.

#### Copy-pattern hint (LLM writer)
- Baseline stat: **muted framing** — describes the industry norm, average, or pre-state. Caption formula: `"Typical for [the field / users / X]"` or `"Industry average"` or `"Before [event]"`.
- Highlight stat: **branded framing** — describes the win. Caption formula: `"[Subject]'s [thing]"` or `"After [our system]"` or `"[Product] users"`.
- Value pairs should have a **clear numeric win** for the highlight — reader should mentally compute the delta at a glance. Roughly 1.5× to 3× improvement reads best; 1.1× is too subtle, 10× reads as unrealistic.
- Section heading formula (image 27 style): `"Into the [context]"` or `"How we measured"` or `"The proof"` — signals "here's the methodology". 2–4 words.
- Body paragraph formula: **methodology → measurement → confirmation of win**. Names the collaborators/tools, describes the test, restates the improvement in words. ~25–40 words.

#### Notes / open questions
- **The "Into the lab" heading pattern** is worth cataloguing — a **contextual-transition heading** that signals "here is the source of the data above". Related headings: `"How we tested"`, `"The methodology"`, `"Behind the numbers"`. LLM should generate these as **connective tissue** between a stat-block and its methodology paragraph.
- **Narrative arc so far (slides 23–27):**
    - Slide 23 (cover): question hook.
    - Slide 24: educational context (what binding is).
    - Slide 25: problem-setting (slow current process).
    - Slide 26: reveal (Claude produced a candidate library — grid).
    - Slide 27: **proof/numbers** (Claude's designs work ~2× better — stat comparison).
    - Expected slides 28+: implications, use-cases, close.
    - This confirms the classic narrative arc: `hook → context → problem → solution → proof → implications → close`. Our LLM should generate essay carousels following this 7-beat structure, with each beat mapping to a specific `aurora-product-body` `bodyLayout` variant.
- **The `aurora-product-body` template is proving remarkably flexible.** So far we've seen 4 layout variants:
    - `single-hero` (image 24: annotated 3D render; image 25: photograph).
    - `thumbnail-grid` (image 26: 2×3 protein grid).
    - `stat-comparison` (image 27: 2 stacked stat blocks).
    - Expected: `chart-embed`, `quote-pullout`, `steps-list`, `feature-callout` — TBD from remaining slides.
- **`aurora-product-body` is becoming the "swiss-army knife" body template for product-marketing carousels.** Recommend treating it as a **composition framework** (chrome + slot for a body-block) rather than a fixed layout. The `bodyLayout` union will grow to ~6-10 variants as we work through the folder.

_Progress: 27 / 85 complete._

---

### claude/image copy 5.png
**Pattern class:** product-marketing-body — third confirmed use of `aurora-product-body` with `bodyLayout: "single-hero"`, `heroImage.type: "photograph"`. Third photograph-hero body slide in the carousel.
**Overall vibe (1 line):** Slide 6 of the Claude drug-discovery essay — the "safety" beat. Cinematic over-the-shoulder photograph of a researcher inspecting a monitor packed with genomics dashboards; heading + body paragraph frame the risk narrative.

Same claude/ folder-level baseline (warm off-white `#F5F0E5`, Inter Bold/Regular, L/R circular nav chevrons, bottom dot indicator, no top eyebrow, no monospace label). Same `single-hero + photograph` template as image 25 — this entry is a compact delta.

- **Canvas:** 1080×1350. Full-bleed `#F5F0E5`.
- **Nav arrows:** L chevron (y≈680, x≈40) + R chevron (y≈680, x≈1000). Same circular outlined style, same primitive as prior claude/ slides. Sit visually **on top of** the hero photo (over its bottom-half area) rather than beside it.

- **Zone A — Hero photograph (y≈130 → y≈900, x≈0 → x≈960):** cinematic **over-the-shoulder photograph** with **shallow depth of field**:
    - Foreground blur: back of a researcher's head (grey hair, out of focus at left edge) + a lab-coated shoulder cutting across the right foreground.
    - Sharp mid-ground: **large computer monitor** filling most of the frame, displaying a **genomics/bioinformatics analysis dashboard** — a rainbow-heatmap column-panel on the left (colour-coded categorical data, looks like a variant-effect prediction matrix), a small 3D protein render as an inset panel top-centre, and multiple secondary charts (bar charts, scatter plots, dot plots) tiled to the right.
    - The monitor content is legible-ish but small — the reader gets "this is a serious tool" rather than reading specifics. Text on-screen is real-lab bioinformatics UI (variant IDs, p-values, cluster labels).
    - Photo tones: cool office fluorescent tint on the monitor + warm skin/hair tones in the blurred foreground. Overall muted, not saturated.
    - **Note the composition:** photo is roughly **rectangular but sits inset from canvas edges** — ~40 px inset all around, not full-bleed. Different from image 25 (which appeared full-width). Gives the photo a **"framed / windowed"** feel rather than bleeding to edges.
    - **NO annotations, NO monospace technical label** — same restraint as image 25.

- **Zone B — Section heading (y≈960 → y≈1015, x≈45):** `With capability comes risk` — Inter Bold ~44 px, `#1B1B1B`, left-aligned, single line.

- **Zone C — Body paragraph (y≈1045 → y≈1240, x≈45 → x≈1000):** Inter Regular ~30 px, `#1B1B1B`, line-height ~1.4, left-aligned, 4 lines. Verbatim:
    _"The ability to design proteins this well could be dangerous in the wrong hands. In publicly available Claude models, these types of requests are intentionally restricted."_
    - Word count: ~27 words. Density: medium.

- **Zone D — Dot indicator (y≈1290, centre):** ~11 dots, 6th filled (slide 6). Same primitive.

#### Typography stack (this slide)
- **Section heading:** Inter Bold ~44 px, `#1B1B1B`, left-aligned.
- **Body paragraph:** Inter Regular ~30 px, `#1B1B1B`, line-height 1.4.

#### Decorative elements
- Hero photograph (inset ~40 px from all edges, giving it a soft "windowed" placement).
- L & R circular nav chevrons (overlaid on hero photo lower area — creates good contrast against the darker monitor content).
- Dot indicator.
- No other decoration.

#### Layering (back → front)
`[bg #F5F0E5]` → `[hero photograph (inset)]` → `[section heading]` → `[body paragraph]` → `[L nav chevron]` → `[R nav chevron]` → `[dot indicator]`.

#### Fabric.js reproduction notes
- **Nothing new architecturally.** `aurora-product-body` with `bodyLayout: "single-hero"`, `heroImage.type: "photograph"`, no annotations, no monospace label. Same as image 25.
- **Small refinement worth capturing:** the hero image is **inset by ~40 px** rather than full-bleed. Compare to image 25 which appeared to bleed close to the top edge. Suggests the `aurora-product-body` template should support a `heroImageInset: number` prop (default ~40 px). Both full-bleed and inset variants exist in the wild.
- **Nav-arrow placement over image:** on this slide the L/R chevrons overlap the photograph (not the cream bg beside it). This works because the chevron primitive has a **white circle background** that reads clearly against any hero content. Reinforces that the chevron is a floating-affordance primitive, not tied to canvas margins.
- No new fonts or helpers needed.

#### Motion cue
- **Over-the-shoulder composition** creates a strong "we are watching an expert at work" voyeuristic feel — reader is placed as an observer behind the scientist. Combined with the dense on-screen data, implies "serious specialist doing responsible research". Perfect visual for a **safety/responsibility** narrative beat.
- The photograph's foreground blur again does documentary storytelling work — same technique as image 25's lab photo.

#### IG safe-zone check
- Hero top at y≈130 — top ~70 px inside the top 200-px avatar-bar risk zone. But the risk area of the photo is decorative (blurred foreground, dark monitor bezel), so clipping is low-cost.
- Body paragraph ends y≈1240 — inside the 1170-px CTA-overlay zone. Last line at risk of clipping. **Same tight-bottom risk** as every claude/ body slide so far. Recommend production adaptations trim body copy to 3 lines max OR raise the content stack.
- Dot indicator at y≈1290 — in CTA overlay zone (decorative).

#### Reusability score
- **Same as image 25:** 5/5 for photograph-hero body slides. High-value template for any research / product-narrative / mission-driven brand.
- **Safety / responsibility narrative beat:** 5/5 — reusable across AI, biotech, fintech, healthcare — any brand that needs to demonstrate "we thought about the ethical implications". The template's clean, understated composition matches the seriousness of the topic.

#### Template pattern classification (final)
- Same `aurora-product-body`, `bodyLayout: "single-hero"`, `heroImage.type: "photograph"`. Two photograph-hero body slides now confirmed (25, 28) — this is a **stable, recurring layout**.

#### Copy-pattern hint (LLM writer)
- Section heading formula (image 28 style): **`"With [attribute] comes [consequence]"`** — a classic aphoristic pattern (`"With great power comes great responsibility"` echo). Concise, memorable, 3–5 words. Related patterns for the "safety beat" of a product carousel:
    - `"With capability comes risk"` (this slide)
    - `"A powerful tool needs guardrails"`
    - `"Speed changes the stakes"`
    - `"Better tools, harder questions"`
- Body paragraph formula: **capability statement → risk framing → mitigation** — 3 clauses. First sentence acknowledges the capability. Second names the risk. Third states the safety measure. ~25–35 words. Voice: **corporate-responsible**, first-person plural for "we"-actions (`"we restricted"`) OR passive/impersonal for constraint-focused framing (`"these requests are intentionally restricted"`).

#### Notes / open questions
- **Narrative arc update (slides 23–28):**
    - 23 (cover): question hook.
    - 24: educational context (binding).
    - 25: problem-setting (slow process, lab photo).
    - 26: reveal (grid of candidates).
    - 27: proof (stat comparison).
    - 28: **safety** (with capability comes risk). ← **NEW BEAT: safety/responsibility.**
    - Expected 29+: implications, next steps, close.
    - The narrative arc is proving richer than a simple `hook → problem → solution → close`. Anthropic includes a **safety beat** between the win and the close — worth encoding in the LLM's carousel-arc template. Proposed arc: `hook → context → problem → solution → proof → safety/caveat → implications → close` (8 beats).
- **Photograph body slides are the "narrative connective tissue"** — they don't reveal new data (that's what stat-comparison and grid slides do), they set emotional tone and pace between data-heavy slides. Slide 25 = "hard current work" (empathy for scientists), slide 28 = "responsible new work" (trust in Anthropic). Both use cinematic photography, both are inset-hero + heading + body. Same builder, same purpose, different moment in the arc.
- **The "responsibility" heading + body pattern is a highly reusable safety-slot** for any AI/product carousel. Our LLM should surface this as an explicit beat option when generating carousels for topics that need trust-building.

_Progress: 28 / 85 complete._

---

### claude/image copy 6.png
**Pattern class:** chapter-cover / product-marketing-cover — **new carousel cover** for a second Anthropic essay ("How Claude's values shift across languages"). Extends `aurora-product-cover` with a **typography-art hero** variant (no photograph, no 3D render).
**Overall vibe (1 line):** Cover of a NEW Claude carousel about multilingual values — cool warm-grey background, a big decorative "typography cloud" of the word `Claude` interleaved with scattered multi-alphabet characters (Cyrillic, Devanagari, Arabic, Korean, Hebrew, etc.), and a bold 2-line heading at the bottom.

**Important:** this is the **second carousel** in the claude/ folder. The drug-discovery essay (images 23–28) ends around slide 6 (image 28). Image 29 opens a new essay — evidenced by (a) new topic, (b) dot indicator resetting to slide 1 of a new count, (c) NO monospace technical label (which was drug-discovery specific).

Same claude/ folder-level type stack + chrome primitives, but with an **updated palette** (warmer stone grey vs pale cream) and a **type-art hero** instead of a rendered image.

- **Canvas:** 1080×1350. Full-bleed.
- **Background:** flat warm **stone / mushroom grey** `~#DFD8CB` (slightly warmer + darker than the drug-discovery carousel's `#F5F0E5`). No grain, no gradient, no photo. This is a **NEW palette variant** for the claude family — call it `BG_WARM_STONE` (compared to `BG_WARM_OFFWHITE` for the drug-discovery carousel).
- **Nav arrows:** only a **single R chevron** visible (y≈680, x≈1000). No L chevron — consistent with this being **slide 1 of a new carousel** (nothing to go back to).

- **Zone A — Typography-art hero (y≈40 → y≈980):** the distinctive new element.
    - **The word `Claude`** rendered in a large serif display face — `C`, `l`, `a`, `u`, `d`, `e` — each letter set very large (~180 px tall) in `#1B1B1B`, **spaced apart** and scattered across the composition rather than tightly aligned. Reads as `Claude` when the eye tracks left-to-right (like reading a word made of independent objects on a table).
    - **Between and around the `Claude` letters:** dozens of **smaller letters/glyphs from multiple writing systems**, in a **muted greyscale palette** (mostly `~#B0A99B`, some slightly lighter `~#CCC3B4`, some pure white `#FFFFFF`, some darker `~#8B857B`). Sample glyphs identified:
        - Cyrillic: `Ж`, `ц`, `ы`, `Ю`, `Э`, `Ё`, `И`, `Ь`
        - Devanagari: `अ`, `औ`, `स`, `प`, `ग`
        - Arabic / Farsi: `ف`, `ض`, `ی`, `غ`
        - Korean Hangul: `ᄊ`, `ᄋ`, `ᄆ`
        - Hebrew: `א`, `ז`
        - Japanese kana / Katakana: `ア`, `ト`
        - Latin extended / punctuation: `M`, `F`, `E`, `K`, `T`, `J`, `V`, `B`
        - Various other exotic glyphs (Thai, Bengali, Greek etc.)
    - Each glyph is at a **different size** (roughly 30 px → 90 px) and a **different tilt** (though most are upright, a few are subtly rotated ±10°). Positioned as an organic scatter, not a grid.
    - **Colour layering:** the darker `Claude` letters read as the foreground; the muted greyscale glyphs recede into the background — creates depth without shadows, purely via colour/tone contrast.
    - The composition is **loose but centred** on the canvas — the whole cluster fills most of the width, occupying the top ~65% of the slide.
    - **Fabric implication:** this is a **hand-designed art asset**, not something generated programmatically per slide. The N glyphs would be too fiddly to script per-slide. Ship as a **PNG asset** OR a curated SVG. Alternatively, the template supports `heroType: "custom-artwork"` — the user (or a design pass) supplies the artwork.

- **Zone B — Section heading (y≈1050 → y≈1220, x≈45 → x≈1035):** `How Claude's values shift across languages` — Inter Bold ~72 px, `#1B1B1B`, **left-aligned**, 2 lines:
    - Line 1: `How Claude's values`
    - Line 2: `shift across languages`
    - Note the **curly apostrophe** in `Claude's`.
    - Line-height ~1.1 (tight, punchy display setting).
    - Same font family and weight as the drug-discovery carousel's cover headline (image 23) — confirming the Anthropic type-system continuity across carousels.

- **Zone C — Dot indicator (y≈1280, centre):** ~11 dots, first dot filled `#1B1B1B`, rest muted grey. Signals this is **slide 1** of a new N-slide carousel.

#### Typography stack
- **Hero display letters `Claude`:** serif display, weight 700 (Bold), ~180 px, `#1B1B1B`. Font candidate: **Fraunces Bold** or **Domaine Display Bold** (Anthropic's brand font). The letterforms have visible contrast (thick/thin variation), classical proportions — clearly a serif, not the sans used for headings.
- **Multilingual scatter glyphs:** each glyph rendered in its native script's system font. Colour range: `#8B857B` (darkest) to `#FFFFFF` (lightest), skewed toward `~#B0A99B` (muted stone grey) for the majority. Sizes ~30–90 px, various rotations.
- **Section heading:** Inter Bold ~72 px, `#1B1B1B`, left-aligned, line-height 1.1. Same as cover heading in image 23.

#### Decorative elements
- The **typography-art hero** IS the visual. No illustration, no photo, no icons.
- Single R nav chevron (no L on slide 1).
- Dot indicator.

#### Layering (back → front)
`[bg #DFD8CB stone]` → `[muted scatter glyphs, various greys]` → `[hero "Claude" letters in black]` → `[section heading]` → `[R nav chevron]` → `[dot indicator]`.

#### Fabric.js reproduction notes
- **NEW `heroType` variant for `aurora-product-cover`:** `"typography-art"` — the hero is a pre-designed typography composition, not a photographic/render image.
    - `heroType: "3d-render"` (image 23, molecule)
    - `heroType: "photograph"` (implied for a future variant)
    - `heroType: "typography-art"` (image 29) ← NEW
    - `heroType: "illustration"` (implied — SahilBloom uses this via a different template family)
- **Asset strategy for typography-art:**
    1. Ship the whole hero as a **single PNG/SVG asset** (simplest). One asset per carousel, tightly designed to match the essay's theme (multilingual for values, code snippets for a code carousel, mathematical symbols for reasoning, etc.).
    2. OR: build a **`makeMultilingualGlyphCloud({centralWord, centralWordFont, centralWordColor, centralWordSize, scatterGlyphs: [{char, size, x, y, angle, color}], bg})`** helper — programmatic composition. Overkill for MVP; probably ship as PNG.
    3. LLM might specify `heroTheme: "multilingual" | "code" | "math" | "medical" | ...` and the system picks the matching pre-designed hero asset from a small library.
- **Palette update:** add `BG_WARM_STONE = #DFD8CB` to `LUMINA_ANTHROPIC` palette. Note: the two Anthropic carousels use **different bg tones** (`#F5F0E5` off-white for drug-discovery, `#DFD8CB` stone for languages), suggesting each essay chooses its own palette variant from a small approved set. Our system should allow **per-carousel bg selection** from the Anthropic palette family.
- **Font loading:** confirms **serif display font** needed alongside Inter — likely **Fraunces Bold** or a similar contrast-forward serif for the display "Claude" word. Note we already need Playfair Display for SahilBloom; either Playfair could double for this use case OR we add Fraunces separately (Fraunces has a bigger optical-size range and reads more "modern-editorial" vs Playfair's "fashion-editorial").
- **Multi-script glyph rendering:** critical for our system generally — if we generate any text with mixed scripts, the renderer's Puppeteer chrome must have fallback fonts covering Cyrillic, Devanagari, Arabic, Hangul, Hebrew, Kana, etc. **Google Noto Sans family** is the canonical solution — bundles CJK, Cyrillic, Devanagari, Arabic, Hebrew as separate weights. Ship Noto Sans + Noto Serif fallback in the renderer. Flag as an infrastructure blocker before ever shipping a multilingual template.
- **New helpers required:**
    - `makeTypographyArtHero({assetUrl})` — simple wrapper for a pre-designed hero asset. Positions it centred in the hero zone.
    - `makeGlyphCloud({centralWord, scatterGlyphs})` — programmatic version if we want scripted generation.
    - Extend `aurora-product-cover` to accept a `heroType: "typography-art"` prop and read from `heroImage.url` when set.

#### Motion cue
- The **scattered-then-forming-a-word** composition suggests **assembly / emergence** — reader sees fragments (foreign glyphs) but the eye assembles `Claude` from the dark letters. Metaphor for the essay's topic: from many languages emerges one Claude. Strong conceptual visual.
- No arrows, no gestures — the typography does all the work.

#### IG safe-zone check
- Hero area top at y≈40 — the topmost scatter glyphs may sit under the top 200-px avatar bar, but they're decorative and non-critical.
- Section heading at y≈1050–1220 — top line safe, but the second line's bottom sits at y≈1220, well inside the 1170-px bottom-CTA-overlay zone. **HIGH RISK** — the second line of the heading may be clipped by IG's caption overlay. **Recommend raising the heading stack 60–80 px** in a production version, tightening the top hero, or using a shorter heading.
- Dot indicator at y≈1280 — in CTA overlay zone (decorative).

#### Reusability score
- **`aurora-product-cover` with typography-art hero:** 5/5 — an alternative to photography/render heroes for cover slides. Uses pure typography as visual (which many creators can produce cheaply). Great for topics without an obvious photographic subject: "values", "principles", "language", "history of code", "mathematical concepts".
- **Multilingual glyph cloud specifically:** 3/5 — only applies to internationalisation / multilingual / global topics. Niche but powerful when applicable.

#### Template pattern classification (final)
- **`aurora-product-cover`** with `heroType: "typography-art"`.
- Confirms this cover template supports **at least 2 essays in the same brand** (drug-discovery + language-values). High-value canonical.

#### Copy-pattern hint (LLM writer)
- Cover heading formula (image 29 style): **`"How [Subject]'s [attribute] [verb] across [dimension]"`** — a curiosity-hook question phrased as a declarative title (no `?`). Examples:
    - `"How Claude's values shift across languages"` (this slide)
    - `"How ChatGPT's reasoning changes with context"`
    - `"How our brand's voice adapts across markets"`
- ~7 words, 2 lines, punchy.
- Voice: **essayistic-analytical**, not marketing. First person avoided; instead uses the product as subject (`Claude's values`).
- **No subtitle on this cover** (unlike image 23 which had a 2-line subtitle). Suggests the subtitle is **optional** in `aurora-product-cover` — for topics where the heading is enough, drop the subtitle. Template should support `subtitle: string | null`.
- **No monospace technical label** either (unlike image 23's `RBX1-...`). This is essay 2, no data-tag context. Confirms both `technicalLabel` and `subtitle` are optional.

#### Notes / open questions
- **Confirmed: claude/ folder contains MULTIPLE carousels.** Carousel 1 = "Claude drug discovery" (images 23–28, potentially more), Carousel 2 = "How Claude's values shift across languages" (image 29+). We should expect further boundaries in the remaining 18 claude/ slides — the next essay may start around slide 35 or 40.
- **The `aurora-product-cover` template variants keep growing:**
    - `heroType: "3d-render"` (image 23) — photorealistic render.
    - `heroType: "typography-art"` (image 29) — pre-designed typography composition.
    - Plus optional slots: `technicalLabel?`, `subtitle?`.
    - Confirmed as a **flexible composition framework**, similar to `aurora-product-body`. Same architectural pattern: chrome + flexible hero slot + optional metadata + heading + optional subtitle.
- **The palette shift** (`#F5F0E5` → `#DFD8CB` between carousels) is a critical brand-system observation. Anthropic's design team clearly maintains a **palette family** for the brand and picks per essay:
    - Drug discovery = pale cream (medical/scientific / laboratory-clean feel).
    - Language values = warmer stone (linguistic / textual / cultural feel).
    - Both palettes are within the "warm neutral" family but different emotional temperatures. Our system should support **palette-per-carousel** (not palette-per-account) — each essay picks a bg tone from a small approved set that matches the topic mood.
- **Foreground-vs-background contrast via colour tone only** (dark black `Claude` vs muted grey glyphs) is a **classic editorial trick** for depth without shadows. Worth cataloguing as a design pattern: `depthTechnique: "tonal-recede"` (letters get lighter = further away). Reusable in any multi-element hero composition.

_Progress: 29 / 85 complete._

---

### claude/image copy 7.png
**Pattern class:** product-marketing-body — **NEW `spectrum-chart` bodyLayout variant** of `aurora-product-body`. Introduces the "opposing-values axis diagram" as a first-class embed type. Also the first claude/ body slide with heading placed **above** the embed (not below).
**Overall vibe (1 line):** Slide 2 of the Claude-values essay — introduces the four axes of "value tension" (Deference↔Caution, Warmth↔Rigor, Depth↔Brevity, Candor↔Execution) as a card-embedded spectrum diagram, framed by a top intro paragraph.

Same claude-family folder baseline as image 29 (warm stone `#DFD8CB`, Inter Bold/Regular). New content composition — heading + intro-paragraph ABOVE the embed, embed contains a **rounded white card** with 4 stacked axis rows.

- **Canvas:** 1080×1350. Full-bleed `#DFD8CB` warm stone.
- **Nav arrows:** L chevron (y≈400, x≈40) + R chevron (y≈400, x≈1000). Same circular outlined style as all other claude body slides. Reflection on chevron colour: on this darker stone bg the white chevron reads with slightly more contrast than on the paler drug-discovery bg — same primitive still works.

- **Zone A — Intro paragraph (y≈45 → y≈210, x≈45 → x≈1035):** Inter Bold ~48 px, `#1B1B1B`, left-aligned, 4 lines. Verbatim:
    _"We analyzed 300k+ anonymized conversations across 20 languages, measuring the values Claude expressed across four axes. They differ by language, for reasons we don't fully know."_
    - Word count: ~26 words. Density: medium.
    - **Bold weight throughout** — different from prior body slides which used Bold only for the section heading and Regular for the paragraph. Here the whole intro is Bold, functioning as **display copy** (not body copy). Reader-guiding + attention-grabbing.
    - Note **curly apostrophe** in `don't`.
    - **`300k+` uses `k+`** — a shorthand-numeric-with-plus convention. Confirms the LLM writer should handle `300k+`, `1M+`, `50k+` style abbreviations gracefully.

- **Zone B — Spectrum-chart embed (y≈235 → y≈1225, x≈40 → x≈1040):** the **NEW distinctive element**.
    - **Container:** rounded rectangle "card" with fill `~#F5EFE0` (a paler cream inside the warm stone slide bg) and radius ~24 px. Card fills width × ~990 px tall. Subtle drop shadow could be baked in (barely visible, low contrast against stone).
    - **Internal layout — 4 stacked "axis rows":** each row represents one pair of opposing values. Rows are evenly spaced from top to bottom of the card, ~230 px per row.
    - **Anatomy of one axis row (using row 1 as reference, y≈290 → y≈380):**
        - **Left label pill:** small rounded-rect pill in **light lavender-blue** `~#D3D0F0` (approx), rounded corners radius ~12 px, containing the word `Deference` in Inter Bold ~40 px, dark purple `~#4A3AA3`. Pill sits at x≈65, top-aligned in the row.
        - **Right label pill:** mirrored to the right side (x≈750–990) — light mint-green `~#C6DBBE` (approx), containing `Caution` in Inter Bold ~40 px, dark forest-green `~#3D5C3A`. Same rounded rectangle style.
        - **Horizontal axis line between them:** thin ~1.5 px stroke, `~#8A857B` (warm grey), extending from just right of the left pill (~x=305) to just left of the right pill (~x=740). ~430 px wide.
        - **Small tick mark at centre of the axis:** a short vertical line (~10 px tall) at the exact midpoint of the axis line, same colour — indicates the "neutral" midpoint of the tension.
        - **Arrowheads at both ends of the axis:** small triangular arrowheads pointing outward (toward each pill), same colour. Signals "these are two directions", not "start and end". `<---|--->`
        - **Descriptor line below each pill:** small caption in Inter Regular ~24 px, `#1B1B1B`, left-aligned under the pill.
            - Left descriptor (~x=65, y≈380): `Going along with what people want` — describes the "Deference" pole.
            - Right descriptor (~x=750, y≈380, right-aligned): `Guarding against risk and harm` — describes the "Caution" pole.
    - **The 4 axis rows in order (verbatim):**
        1. **Deference ↔ Caution** — `Going along with what people want` / `Guarding against risk and harm`. Left pill lavender-blue `#D3D0F0` + dark purple `#4A3AA3`. Right pill mint-green `#C6DBBE` + dark green `#3D5C3A`.
        2. **Warmth ↔ Rigor** — `Expressing positivity and care` / `Emphasising accuracy and precision`. Same colour scheme (lavender-blue L, mint-green R).
        3. **Depth ↔ Brevity** — `Explaining in depth` / `Doing only what was asked`. Same colours.
        4. **Candor ↔ Execution** — `Foregrounding uncertainty and limits` / `Producing a polished, confident answer`. Same colours.
    - **Colour semantics of the pills:** consistent across all 4 rows. Left column pills = lavender-blue palette (represents one "value pole"). Right column pills = mint-green palette (represents the opposing pole). This binary colour coding IS the semantic of the diagram — reader immediately reads "these are two teams of values in tension".

- **Zone C — Dot indicator (y≈1275, centre):** ~11 dots, 2nd filled (slide 2 of the second Anthropic carousel).

#### Typography stack (this slide)
- **Intro paragraph:** Inter Bold ~48 px, `#1B1B1B`, left-aligned, line-height ~1.15. Functions as display, not body — larger than typical body paragraphs (which are ~30 px in prior claude body slides).
- **Axis-row pill labels:** Inter Bold ~40 px, coloured `~#4A3AA3` (dark purple, on lavender-blue pill) or `~#3D5C3A` (dark green, on mint-green pill).
- **Axis-row descriptors:** Inter Regular ~24 px, `#1B1B1B`, left-aligned (left) or right-aligned (right).

#### Decorative elements
- Rounded white card `~#F5EFE0` containing the whole axis diagram.
- 8 rounded pills (2 per row × 4 rows) in lavender-blue and mint-green.
- 4 horizontal axis lines with double-headed arrows and a centre tick.
- L & R circular nav chevrons (outside the card).
- Dot indicator.

#### Layering (back → front)
`[bg #DFD8CB stone]` → `[intro paragraph]` → `[white rounded card]` → `[axis lines with arrows + centre ticks]` → `[left pills (×4) with text]` → `[right pills (×4) with text]` → `[left descriptors (×4)]` → `[right descriptors (×4)]` → `[L nav chevron]` → `[R nav chevron]` → `[dot indicator]`.

#### Fabric.js reproduction notes
- **NEW `bodyLayout` variant for `aurora-product-body`:** `"spectrum-chart"`.
    - `bodyLayout: "single-hero"` (24, 25, 28)
    - `bodyLayout: "thumbnail-grid"` (26)
    - `bodyLayout: "stat-comparison"` (27)
    - `bodyLayout: "spectrum-chart"` (30) ← NEW
- **Composition shift:** on this slide the **heading/intro-paragraph sits ABOVE the embed** (Zone A → Zone B → Zone C reading order), not below. All prior claude body slides had `[hero image] → [heading] → [body paragraph]` (embed-first). This slide flips: `[intro paragraph] → [embed] → [dot indicator]`. Suggests `aurora-product-body` should support a **`headingPosition: "above" | "below"`** prop, defaulting to `"below"` (embed-first is more common) but supporting `"above"` for slides where the intro contextualises the diagram.

- **New Fabric helpers:**
    - `makeSpectrumChart({ axes: Array<{ leftLabel: string, rightLabel: string, leftDescriptor: string, rightDescriptor: string, leftPillFill, leftPillTextColor, rightPillFill, rightPillTextColor }>, x, y, width, height, cardFill, cardRadius, cardShadow, axisColor, arrowheadSize })` — full builder for the axis-diagram embed. Configurable per-row.
    - `makeAxisRow({ leftLabel, rightLabel, leftDescriptor, rightDescriptor, leftPillFill, rightPillFill, axisColor, y, cardBounds })` — single axis row primitive, composed by `makeSpectrumChart`.
    - `makeColouredPill({ text, fill, textColor, padding, borderRadius, font, size })` — reusable coloured pill primitive. Same primitive could be used across compact/hook templates (already proposed in `others/` folder for `VIRAL REEL` peach pill etc. — same idea, different palette).
    - `makeDoubleHeadedArrow({ from, to, arrowheadSize, color, strokeWidth, midTick: boolean })` — the axis line with arrows at both ends and optional centre tick.
- **New palette tokens (Anthropic values-carousel):**
    - `PILL_LAVENDER_BLUE_BG = #D3D0F0`
    - `PILL_LAVENDER_BLUE_TEXT = #4A3AA3`
    - `PILL_MINT_GREEN_BG = #C6DBBE`
    - `PILL_MINT_GREEN_TEXT = #3D5C3A`
    - `CARD_CREAM = #F5EFE0` (inside-card fill on stone bg)
    - These 4 pill colours together form a **semantic palette pair** representing "two poles of a tension". Our system should treat them as a coded pair, not individual colours — e.g. `spectrumChart.polePalette: "lavender-mint" | "coral-teal" | "gold-slate" | ...`. Ship 3–4 tension-pair palettes; the LLM picks per essay.
- **Font loading:** no new fonts required beyond claude/-baseline (Inter Regular/Bold + JetBrains Mono).

#### Motion cue
- Each axis row IS a **motion cue** — the double-headed arrow explicitly tells the reader "these values pull in opposite directions". Combined with the 4 rows stacked vertically, the composition reads like a **dashboard / control-panel diagram** — reader is being shown "here are the levers, here are the tensions".
- No animation implied — this is a static concept-diagram slide.

#### IG safe-zone check
- Intro paragraph at y≈45 — starts inside the 200-px top zone. Top line of the intro paragraph (`We analyzed 300k+...`) may be partially clipped by IG's avatar bar. Recommend a small y-offset in production adaptation (start intro at y≥210).
- Bottom of card at y≈1225 — inside the 1170-px CTA-overlay zone. The bottom row's descriptors (y≈1195–1220) may be clipped. **HIGH RISK.**
- Dot indicator at y≈1275 — deep in CTA overlay zone (decorative).

#### Reusability score
- **`spectrum-chart` body layout:** 5/5 — extremely reusable for any topic showing "opposing values in tension". Product-values matrices, brand-personality quadrants, personality-type diagrams (Introvert↔Extrovert etc.), architectural trade-offs (Speed↔Consistency etc.), design principles (Simple↔Feature-rich etc.), leadership pairs (Direct↔Diplomatic etc.). Universal utility.
- **Card-in-slide composition** (rounded card containing structured content on a coloured bg): 5/5 — a strong device for signalling "this is a data section, distinct from prose". Reusable across many templates.

#### Template pattern classification (final)
- Proposed: **`aurora-product-body`** with `bodyLayout: "spectrum-chart"`.
- Extensible: `axes: Array<...>` supports 2–6 rows. 4 is optimal for 1080×1350.
- Companion to `stat-comparison` (both are "structured-data embeds"). Both belong to the same **quantitative-body-slide** subfamily; `single-hero`, `thumbnail-grid` belong to the **visual-hero-body-slide** subfamily.

#### Copy-pattern hint (LLM writer)
- Intro paragraph formula (image 30 style): **`"We [action-verb] [N] [scale] [subjects] across [dimensions], [measuring/observing] [property]. [Reader-invitation to explore the diagram below]."`** — sets up the reader for a data-dense diagram. ~20–30 words. Bold weight to function as display.
- Axis row formula: `LeftPole ↔ RightPole` where each pole is a **single noun** (1–3 syllables). Followed by a **verb-phrase descriptor** (5–8 words) that explains what that pole "does".
    - Examples generated by pattern: `Move Fast ↔ Ship Safe` / `Iterate quickly and often` / `Test thoroughly and rarely break`.
    - `Follow ↔ Lead` / `Doing what's asked` / `Setting the agenda`.
    - `Local ↔ Global` / `Rooted in specific context` / `Applying universal principles`.
- LLM should be able to generate **4 tension-pair rows per slide**, all following the same descriptor length + rhythm.

#### Notes / open questions
- **The card-in-slide device is worth cataloguing separately.** So far we've seen:
    - **Slide-native content** (no card) — most claude/ body slides.
    - **Card-in-slide content** (rounded rect wrapper) — image 30's spectrum chart.
    Cards create a **secondary content layer** — signal to reader "this is structured data, not prose". Recommend our `aurora-product-body` template supports an optional `embedWrapper: "card" | "none"` prop. When `"card"`, the embed content is wrapped in a rounded rect with a slightly-different-fill from the slide bg.
- **The colour pair (lavender-blue + mint-green) is deliberately gentle/soft** — no red/blue "conflict" framing, no strong contrast. Signals "these tensions are healthy trade-offs, not conflicts". Anthropic's philosophical framing: values-as-spectrums, not values-as-opposites. Worth encoding as a **design-intent token**: `tensionPaletteMood: "harmonious" | "conflictual" | "neutral"`.
- **Content-diagram-first slides** (heading above, diagram below) are common in **educational carousels** — they set up context before revealing the visual. Different rhythm from **impact-diagram-first slides** (image dominates, heading is caption). Our LLM writer should choose the rhythm based on beat: `impact-first` for reveals (26, 27), `context-first` for explanations (30).
- **Narrative arc for the language-values carousel (slides 29–30):**
    - 29 (cover): typographic hero + heading.
    - 30 (body 1): the measurement setup — 300k+ conversations, 20 languages, four axes. Uses spectrum-chart to show the axes.
    - Expected 31+: specific findings — how each axis shifts across specific languages, sample conversations, implications.
    - Anthropic essays use **the same 8-beat narrative arc** proposed in image 28's analysis but with **different embed types** per beat. The `spectrum-chart` here plays the "context/framework" beat, similar to slide 24's annotated-image "context" beat in the drug-discovery essay.

_Progress: 30 / 85 complete._

---

### claude/image copy 8.png
**Pattern class:** product-marketing-body — **NEW `axis-shift-chart` bodyLayout variant** of `aurora-product-body`. A per-language "how Claude shifts" data slide. Extends the `spectrum-chart` primitive with **signed-magnitude shift arrows** on a numeric axis and a **card-embedded language-portrait**.
**Overall vibe (1 line):** Slide 3 of the Claude-values essay — the first "findings" slide, showing how Claude's values shift when speaking Hindi. Displays magnitudes as coloured shift-pills with arrows along a signed σ-axis (positive = right, negative = left).

Same claude/ folder-level baseline as image 29–30 (warm stone `#DFD8CB`, Inter Bold/Regular, L/R circular nav chevrons, bottom dot indicator, no top eyebrow). Combines the top-heading pattern of image 30 with a NEW quantitative embed variant.

- **Canvas:** 1080×1350. Full-bleed `#DFD8CB` warm stone.
- **Nav arrows:** L chevron (y≈400, x≈40) + R chevron (y≈400, x≈1000). Same primitive as prior claude/ slides.

- **Zone A — Top section heading (y≈75 → y≈115, x≈100 → x≈900):** `How Claude differs across languages` — Inter Bold ~36 px, `#1B1B1B`, left-aligned, single line. Functions as **carousel-level sub-brand** — the recurring context for this beat of the essay. Every "language finding" slide (31, 32, ...) likely reuses this same heading. Confirms Anthropic uses **section-header slots** in `aurora-product-body` for multi-slide narrative arcs. Recommend `topSectionHeading: string | null` prop.

- **Zone B — Card-embedded chart (y≈150 → y≈1230, x≈40 → x≈1040):** rounded white card `~#F5EFE0` (same paler cream as image 30's card), radius ~24 px. Inside:
    - **Language display headline (Zone B.1, y≈190 → y≈275, x≈100):** `Hindi` — Inter **Black** or extra-bold Bold ~130 px, `#1B1B1B`, left-aligned, single word. Enormously scaled — this is the visual anchor. Each per-language slide would swap this single word (e.g. `Spanish`, `Mandarin`, `Arabic`).
    - **Language subtitle / voice-descriptor (Zone B.2, y≈290 → y≈375, x≈100 → x≈700):** `Claude at its warmest, showing more politeness and reassurance.` — Inter Regular ~34 px, colour **muted warm grey `~#7A756A`** (a step warmer + slightly lighter than `INK_MUTED_BROWN`, feels similar to Anthropic's `INK_MUTED_STONE`). Left-aligned, 2 lines. Word count: 10.
    - **Numeric-axis shift chart (Zone B.3, y≈420 → y≈1130):** the new quantitative element.
        - **Central vertical axis:** thin ~1.5 px stroke, `~#1B1B1B` (or dark charcoal), at x≈340 (positioned left of centre of the card). Runs from y≈440 down to y≈1080 (~640 px tall). **This is a signed-numeric-value axis** (0 in the middle, positive to the right, negative to the left).
        - **Horizontal scale-tick strip (Zone B.4, y≈1120 → y≈1160):** at the bottom of the axis, a horizontal x-axis line with tick marks:
            - `0.4σ` (left) — a small text label at x≈75, y≈1150 (or so).
            - `0.2σ` (left) — at x≈205.
            - `0` (centre) — at x≈340.
            - `0.2σ` (right) — at x≈475.
            - `0.4σ` (right) — at x≈600 (approx).
            - Each tick is a small vertical hash on the horizontal axis-line, ~10 px tall.
            - Font: Inter Regular ~26 px, muted warm grey. Note the σ (Greek sigma) unit — indicates standard deviations. This is a statistical presentation.
        - **4 shift-arrow rows** (one per value axis), stacked vertically, each with:
            - **Left label** (the value name, e.g. `Deference`, `Rigor`, `Depth`, `Candor`): Inter Regular ~30 px, muted warm grey `~#7A756A`. Positioned to the LEFT of the central axis.
            - **Colored value pill on the shifted side:** shows the direction of the shift with a pill + inline signed value.
                - Row 1 `Deference`: label sits left, pill sits RIGHT of centre (positive shift). Pill = mint-green `#C6DBBE` bg + dark green `#3D5C3A` text. Content: `More caution +0.04σ`. Interpretation: Claude in Hindi is **more towards Caution** (mint-green pole, positive-σ direction) by 0.04 standard deviations. The pill's text combines a **directional statement** (`More caution`) + a **signed magnitude** (`+0.04σ`).
                - Row 2 `Rigor` (this row is FLIPPED — the label `Rigor` sits to the RIGHT of the axis, and the shifted pill sits LEFT of centre — indicating shift toward Warmth): pill = **lavender-blue** `#D3D0F0` bg + dark purple `#4A3AA3` text. Content: `+0.49σ More warmth`. **Longer arrow!** — the axis-line for this row extends past the tick-mark `0.4σ` all the way to the far left edge of the visible axis area, with a chunky filled arrowhead at the tip. Emphasises the magnitude (largest shift on this slide).
                - Row 3 `Depth`: label left, pill right. Mint-green pill. Content: `More brevity +0.03σ`. Small right-arrow-line to indicate direction + magnitude.
                - Row 4 `Candor`: label left, pill right. Mint-green pill. Content: `More execution +0.02σ`. Small right-arrow line.
        - **Arrow-line rendering:** each shifted pill has a **directional line from the axis (or centre-tick) to the pill**, with a filled arrowhead pointing toward the pill (indicating "shift in that direction"). Line colour matches the pill's dark-text colour (dark purple for lavender pills, dark green for mint pills). Line thickness ~2–3 px. Length of the arrow-line proportional to the σ-magnitude — small shifts (0.02–0.04σ) get short arrows, big shifts (0.49σ) get long arrows.

- **Zone C — Dot indicator (y≈1275, centre):** ~11 dots, 3rd filled (slide 3 of the language-values essay).

#### Typography stack (this slide)
- **Top section heading:** Inter Bold ~36 px, `#1B1B1B`, left-aligned. **Recurring across "language finding" slides** — brand-marker for the beat.
- **Language display headline:** Inter Black / ExtraBold ~130 px, `#1B1B1B`, left-aligned. Single word.
- **Language subtitle:** Inter Regular ~34 px, muted warm grey `~#7A756A`, left-aligned.
- **Axis row labels** (`Deference`, `Rigor`, `Depth`, `Candor`): Inter Regular ~30 px, muted warm grey.
- **Shift pills:** Inter Bold ~28 px for the directional statement (`More caution`, `+0.49σ More warmth`, etc.), lavender or mint palette. Inline signed value (`+0.04σ`) matches the pill text.
- **Axis tick labels:** Inter Regular ~26 px, muted warm grey.

#### Decorative elements
- Rounded white card containing the whole chart (same as image 30's card wrapper).
- Central vertical axis line with horizontal tick strip at the bottom.
- 4 shift-arrow lines with pills at the tip.
- L & R circular nav chevrons (outside card).
- Dot indicator.

#### Layering (back → front)
`[bg #DFD8CB stone]` → `[top section heading]` → `[white rounded card]` → `[language display "Hindi"]` → `[language subtitle]` → `[central vertical axis line + horizontal tick strip]` → `[4 axis-row labels]` → `[4 arrow-lines from axis]` → `[4 shift pills at line tips]` → `[L nav chevron]` → `[R nav chevron]` → `[dot indicator]`.

#### Fabric.js reproduction notes
- **NEW `bodyLayout` variant for `aurora-product-body`:** `"axis-shift-chart"`.
    - `bodyLayout: "single-hero"` (24, 25, 28)
    - `bodyLayout: "thumbnail-grid"` (26)
    - `bodyLayout: "stat-comparison"` (27)
    - `bodyLayout: "spectrum-chart"` (30)
    - `bodyLayout: "axis-shift-chart"` (31) ← NEW
- **Composition:** `[topSectionHeading?] → [card containing (languageDisplay + subtitle + axisChart)] → [dotIndicator]`. Combines the **card-wrapper pattern** from image 30 with a **large-display headline** inside the card. The card is now doing "concept container" work AND "labelled data" work.
- **New Fabric helpers:**
    - `makeAxisShiftChart({ centralAxis: { xPosition, verticalRange }, ticks: [{ value, label }], rows: Array<{ leftLabel: string, shiftLabel: string, shiftValue: number, direction: "left" | "right", palette: "lavender" | "mint" | ... }>, unit: string })` — full builder for the signed-shift chart. `centralAxis.xPosition` allows the axis to sit non-centred (left, centre, or right); on this slide it's off-centre-left. `direction` per row lets the LLM designate which pole the language shifts toward.
    - `makeShiftPill({ text, signedValue, palette, arrowLineLength, arrowLineColor, arrowheadStyle })` — pill with attached directional arrow-line. Combines `makeColouredPill` (from image 30) + `makeDirectionalArrow`.
    - `makeSignedAxisScale({ ticks, unit, y, xRange, labelFont, labelColor })` — the horizontal σ-scale at the bottom of the chart.
- **σ Unit rendering:** the Greek letter σ (U+03C3) needs to be supported by the loaded fonts. **Inter has it** — confirmed. But for other diacritics / Greek / math symbols, we may need to load a wider Unicode range. Add **Inter's full Latin+Greek+Cyrillic subset** to `renderer_entry.ts`.
- **NEW palette tokens (Anthropic values, continued):**
    - `INK_MUTED_STONE = #7A756A` (subtitle + tick labels on warm-stone bg).
    - Same lavender + mint palette as image 30.
- **The "large display language name" as visual hero:** each language-finding slide would have a different language word as visual anchor. The word IS the visual — different languages, different lengths (`Hindi` = 5 chars, `Portuguese` = 10 chars, `Mandarin` = 8 chars). Template needs **auto-scaling display font** or **fixed-size + clip/wrap-safe layout** for longer language names.
- **Font loading:** confirms need for **Inter Black (weight 900)** — for the ~130 px display language name. Inter Bold at that size may not be visually heavy enough (compare to image 27's stat-comparison numerics, same weight-vs-size trade-off).

#### Motion cue
- The **shift arrows** are the primary motion cue — each arrow visually says "Claude shifts THIS FAR in THIS direction". The relative lengths of the 4 arrows tell the story at a glance: `Rigor→Warmth` shift is enormous (0.49σ), the other 3 shifts are tiny (0.02–0.04σ). Reader instantly sees "Hindi Claude = massively warmer, otherwise similar".
- Combined with the **σ-scale at the bottom**, this reads as a **statistical shift-diagram** — scientific credibility.

#### IG safe-zone check
- Top section heading at y≈75 — inside the top 200-px avatar-bar zone. Since it's a small recurring header, some clipping is acceptable.
- Bottom of card at y≈1230 — inside the 1170-px CTA-overlay zone. The horizontal tick strip at y≈1150 may be partially clipped. **HIGH RISK.**
- Dot indicator at y≈1275 — deep in CTA overlay zone (decorative).

#### Reusability score
- **`axis-shift-chart` body layout:** 5/5 — extremely reusable for any data-shift / delta-comparison topic. Reader-response scores, before/after benchmarks, A/B-test results across N dimensions, personality-shift-across-contexts diagrams. High-value quantitative-body-slide template.
- **The "language display + subtitle + axis chart" composition:** 5/5 — a strong "per-instance findings" template. Could be used for per-user profiles, per-region breakdowns, per-product benchmarks. Universal for "N variants of the same measurement".

#### Template pattern classification (final)
- Proposed: **`aurora-product-body`** with `bodyLayout: "axis-shift-chart"`.
- Sits in the **quantitative-body-slide** subfamily alongside `stat-comparison` (27) and `spectrum-chart` (30).
- Extensible: N shift rows (typically 3–5), configurable axis position (left / centre / right), signed magnitude values, direction per row, palette per row.

#### Copy-pattern hint (LLM writer)
- Top section heading formula: **`"How [Subject] [verb] across [dimensions]"`** — recurring across N sibling slides. Same wording every slide, only the language name changes.
- Language display: **single-word noun** — the language name. LLM should not pluralise or qualify.
- Language subtitle: **`"[Subject] at its [emotion-adjective], showing more [attribute-1] and [attribute-2]."`** — a **voice-of-the-language** descriptor. 2 short clauses. ~10 words. Voice: descriptive-editorial ("Claude at its warmest, showing more politeness and reassurance"). LLM should generate a distinct **emotional character** per language (`Hindi = warmest`, `Portuguese = most concise`, etc.).
- Shift-pill formulas:
    - Positive-direction shift: `"More [pole-noun] [+X.XXσ]"` — e.g. `"More caution +0.04σ"`.
    - Negative-direction shift (label flipped): `"[+X.XXσ] More [opposite-pole-noun]"` — e.g. `"+0.49σ More warmth"`. Note the value comes **before** the "More X" phrase when the shift is toward the LEFT pole — this creates a symmetric visual reading where the pill's text always reads in the direction of the shift.
    - Values in **σ (standard-deviation) units**. Small shifts (0.01–0.05σ) = normal; large shifts (>0.3σ) = notable. LLM should not fabricate implausibly-large values.

#### Notes / open questions
- **Card-embedded slides are becoming the Anthropic norm for structured-data body slides.** So far images 30 and 31 both use rounded white cards. Sets a precedent — Anthropic's data body slides = card-wrapped; their narrative body slides (24, 25, 28) = full-bleed. Registry: `embedWrapper: "card" | "none"`, with card-wrapping for quantitative content and no-wrap for prose/photo.
- **The "language findings" beat is likely a MULTI-SLIDE sub-sequence** — one slide per interesting language, all using this same template. If Anthropic covered 4-5 languages (Hindi, Portuguese, Mandarin, Arabic, and English baseline?), that's 4-5 slides in the same template. Confirms **`aurora-product-body` is used as a series template** within a carousel — same builder rendered N times with just the language-name + subtitle + shift-values changed. This is a very repeatable structure the LLM can generate.
- **The "flipped row" trick (Rigor label on the right, shift arrow going left):** the label sits on the pole that's LOSING influence, and the arrow points to the pole that's GAINING influence. On the row where Hindi shifts toward Warmth, Rigor sits on the right (the "losing" side), Warmth is implied as the destination. This is a subtle but important visual — the label-position tells the direction. Our helper should support **auto-flipping** based on the shift `direction`: if `direction: "left"`, put the label on the right; if `direction: "right"`, put the label on the left.
- **Narrative arc update (slides 29–31):**
    - 29 (cover): typographic hero + heading.
    - 30 (body 1, context): methodology + framework (the 4 axes).
    - 31 (body 2, findings-instance-1): Hindi shifts — first per-language finding.
    - Expected 32+: more per-language findings (Portuguese?, Mandarin?, etc.).
    - This confirms the arc `hook → context → finding-1 → finding-2 → ... → findings-summary → implications → close` — a **N-instance-comparison arc** that's very common for "we analysed N things and here's what we found" carousels.

_Progress: 31 / 85 complete._

---

### claude/image copy 9.png
**Pattern class:** chapter-cover / product-marketing-cover — **THIRD Anthropic carousel** in this folder. New topic (AI researcher interviews), new hero composition: **stacked photo-strip panels sandwiching a centred serif headline**.
**Overall vibe (1 line):** Cover of Carousel 3 — "When AI runs the experiments, what's the role of a researcher?" — features two B&W portrait strips (top: 3 male researchers; bottom: 2 male + 1 female researcher waving) with coral rectangle accents between each portrait, serif question headline centred between the two photo strips.

**Third carousel confirmed** — this closes any doubt that `claude/` contains multiple essays. Boundaries so far: Carousel 1 drug-discovery (23–28), Carousel 2 language-values (29–31 continuing), Carousel 3 AI-researchers (starts at 32).

Same folder-level tokens (`BG_WARM_STONE #DFD8CB` as bg, Inter Bold/Regular, coral accent, R nav chevron on slide 1, bottom dot indicator). **NEW hero composition** — photo-panel strip.

- **Canvas:** 1080×1350. Full-bleed `#DFD8CB` warm stone (same as language-values carousel — Anthropic reuses this palette for its "editorial/analytical" essays).
- **Nav arrows:** single R chevron (y≈540, x≈1000). Slide 1 of a new carousel.

- **Zone A — Top photo strip (y≈50 → y≈250, x≈50 → x≈1030):**
    - Horizontal strip containing **3 B&W portraits of male researchers** side-by-side, each ~320 px wide × 200 px tall. Each portrait is cropped waist-up, subjects looking at camera or off-frame, seated on chairs.
    - **Distinctive coral rectangles interleaved between portraits:** each photo has a **coral rectangle behind/beside it** (partially visible as slim vertical bars ~40 px wide, in `ACCENT_CORAL #D46A5E`, extending slightly above and below the photo). The rectangles function as **coloured "matting" behind each photo**, or as vertical **spacers/accents** that break up the row rhythmically.
    - Portraits are **duotone / grayscale**, not colour — creates unified look and lets the coral rectangles pop as the only colour on the slide.
    - The 3 portraits: from left: bespectacled man in dark tee; man with moustache in grey tee; older man in striped shirt. Real researchers, not stock photos.

- **Zone B — Serif question headline (y≈290 → y≈450, x≈75 → x≈900):** `When AI runs the experiments, what's the role of a researcher?` — 3 lines, **serif Bold** ~72 px, `#1B1B1B`, **left-aligned** but not full-bleed (indented ~75 px from left).
    - Font: **serif display** — reads like Fraunces Bold, Domaine Display, or similar Anthropic brand serif. Same family as image 29's `Claude` word (matches — this is the family for question-headlines in Anthropic essays).
    - Note the **curly apostrophe** in `what's`.
    - Line-break structure: `When AI runs the` / `experiments, what's the` / `role of a researcher?` — natural sentence-flow breaks, not forced.
    - Line-height ~1.15.

- **Zone C — Subtitle paragraph (y≈470 → y≈575, x≈75 → x≈900):** `Anthropic researchers met with professors from ETH Zurich and ISTA to talk about how AI is changing their own work →` — Inter Regular ~30 px, `#1B1B1B`, left-aligned, 3 lines. Ends with a **right-arrow glyph `→`** (U+2192) at the end of the sentence — signals "continue for more".
    - The arrow glyph as end-of-subtitle is a **new pattern** — invites the reader to swipe. Different affordance from a nav chevron; more like a "read more" indicator baked into the copy.

- **Zone D — Bottom photo strip (y≈610 → y≈1220, x≈0 → x≈1080):**
    - Larger than top strip — 3 more portraits, waist-up but taller (~610 px tall × ~360 px wide each), full-bleed to canvas edges (no side padding).
    - Same B&W duotone treatment + coral rectangle accents behind.
    - Subjects: from left: man in black shirt smiling, woman with long blond hair looking at camera, man in dark jacket & glasses **waving** at camera (arm raised, casual gesture).
    - The bottom strip is more prominent than the top — 3× taller, more expressive subjects. This asymmetric photo composition creates visual hierarchy.

- **Zone E — Dot indicator (y≈1275, centre):** 6 dots visible, 1st filled. Signals slide 1 of ~6-slide carousel. Shorter than the values-carousel (11 dots) — this AI-researchers essay may be a smaller carousel.

#### Typography stack (this slide)
- **Serif question headline:** ~72 px, Bold serif, `#1B1B1B`, left-aligned. Third instance of Anthropic's serif-display in this folder (images 29, 32 use it as hero; image 30+ used Inter Bold as heading). Confirms Anthropic uses **serif for question-driven / editorial-tone headlines** vs **sans-serif for declarative / product-tone headlines**. Voice signal: `serif = essay/curious, sans = product/factual`.
- **Subtitle:** Inter Regular ~30 px, ends with `→` glyph.

#### Decorative elements
- **6 B&W duotone portraits** in two horizontal strips.
- **Coral rectangle accents** (~40–60 px wide, height matching photos) interleaved between/behind portraits. These are the **only colour** on the slide besides the muted stone bg + near-black text.
- Single R nav chevron.
- Dot indicator.

#### Layering (back → front)
`[bg #DFD8CB stone]` → `[coral rectangles behind top photos]` → `[top photo strip (3 B&W portraits)]` → `[serif headline]` → `[subtitle with → arrow]` → `[coral rectangles behind bottom photos]` → `[bottom photo strip (3 B&W portraits)]` → `[R nav chevron]` → `[dot indicator]`.

#### Fabric.js reproduction notes
- **NEW `heroType` variant for `aurora-product-cover`:** `"portrait-strip"`.
    - `heroType: "3d-render"` (23)
    - `heroType: "typography-art"` (29)
    - `heroType: "portrait-strip"` (32) ← NEW
- **NEW composition variant:** photo strips **on TOP AND BOTTOM** with headline sandwiched in the middle. Different from all prior claude cover slides (which had one hero + text below). Could be called **`aurora-product-cover-sandwich`** if we want a separate template, or a `subVariant: "sandwich"` on `aurora-product-cover`.
- **New Fabric helpers:**
    - `makePortraitStrip({ portraits: Array<{ url }>, accentColor, accentWidth, height, y, x, portraitsFullBleed: boolean, treatment: "bw" | "duotone" | "color" })` — strip of N portraits with interleaved coloured rectangles.
    - `makeDuotonePortrait({ url, shadowColor: "#000000", highlightColor: "#DFD8CB" })` — apply grayscale-then-duotone treatment to a photo. Fabric v7 supports filter chains via `filters: [Grayscale, ColorTint, ...]`.
- **The coral rectangles behind photos** are a signature Anthropic device — they break up the strip into rhythmic units and add the brand accent colour to a photo-first composition. Could be implemented as `Rect` primitives z-indexed BEHIND each portrait, with slight offset (photos slightly overlap the rectangles). Or as a **striped bg pattern** (alternating warm-stone + coral rectangles) with photos placed on top.
- **Ending arrow glyph in subtitle:** `→` (U+2192) at end of copy. Fabric supports Unicode glyphs in `Textbox` — no special work needed, just make sure fonts include the arrow character (Inter does).
- **No new fonts required** — but confirms need for **serif display** (Fraunces Bold or equivalent) already flagged in image 29.

#### Motion cue
- The **B&W → coral rectangle → B&W** rhythm of the strips creates a **filmstrip / interview-panel** aesthetic — implies "these are multiple people we talked to". Combined with the waving figure in the bottom-right portrait, the composition feels **social + human** vs the data-heavy prior slides.
- The `→` glyph at end of subtitle is a **micro-motion cue** — the arrow points reader forward.
- Nav chevron on right also points forward. Multiple redundant "keep going" affordances.

#### IG safe-zone check
- Top photo strip at y≈50 — inside 200-px top zone. Some of the portrait tops may be clipped by IG avatar bar. Acceptable — portrait crops usually have head-space, so clipping the very top isn't devastating.
- Bottom photo strip extends to y≈1220 — inside the 1170-px CTA-overlay zone. The bottom edges of portraits (chairs, hands) may be clipped, but subjects' faces are safely above the risk line.
- Dot indicator at y≈1275 — deep in CTA overlay zone (decorative).

#### Reusability score
- **`portrait-strip` hero + question-headline sandwich composition:** 5/5 — extremely reusable for **interview-format carousels**, **team introduction posts**, **panel-discussion recaps**, **research collaboration posts**. Anywhere you want to feature multiple humans + a big question, this works.
- **Coral rectangle accents behind photos:** 5/5 — a subtle brand-injection technique reusable across any photo composition. Any brand with a signature accent colour can use their brand-accent-rectangles-behind-photos.

#### Template pattern classification (final)
- Proposed: **`aurora-product-cover`** with `heroType: "portrait-strip"` + `subVariant: "sandwich"` (or a dedicated `aurora-editorial-portrait-cover`).
- Confirms the `aurora-product-cover` template is a **very flexible composition framework**. Variants so far: 3d-render (23), typography-art (29), portrait-strip (32). All share the same chrome (bg + nav arrow + dot indicator) and the same optional heading/subtitle stack.

#### Copy-pattern hint (LLM writer)
- Question-headline formula: **`"When [Subject] [does X], what's the [role / meaning / value / future] of [Y]?"`** — a philosophical / role-inversion question. Examples:
    - `"When AI runs the experiments, what's the role of a researcher?"` (this slide)
    - `"When code writes code, what's the value of a developer?"`
    - `"When robots do the driving, what's the role of a chauffeur?"`
    - `"When machines translate, what's the future of a translator?"`
- ~10-15 words, 2-3 lines, serif display.
- Voice: **essayistic-curious**, question-driven, philosophical rather than promotional.
- Subtitle formula: **`"[Subject / role] [action-verb] with [collaborators / participants] from [institutions] to [discuss / measure / explore] [topic] →"`** — sets up the essay's research premise. ~20-30 words. Ends with `→` arrow. LLM should always name specific institutions/collaborators for credibility.

#### Notes / open questions
- **Third carousel in the folder starts here.** Boundaries so far:
    - Carousel 1: images 23–28 (Claude drug discovery, 6 slides).
    - Carousel 2: images 29–31 (Claude language values, 3 slides seen so far, likely continues to ~36 based on 11-dot indicator).
    - Carousel 3: images 32+ (AI researchers essay, ~6 slides based on dot count).
    - Given 16 remaining claude/ slides after this (32–47), we might see: 3 more from Carousel 2 (32–34) + 6 from Carousel 3 (35–40, but the sequence would then need to check) OR the essays are interleaved. Actually image 32 is clearly Carousel 3's cover (new topic, dot 1 of ~6), so Carousel 2 may only span 3 slides (29-31) and Carousel 3 starts at 32.
    - Expected: 6 slides for Carousel 3 = 32–37, then possibly a Carousel 4 for 38–47 (~10 slides). We'll see.
- **The B&W portrait treatment + coral rectangle** is a **signature Anthropic editorial device** — likely used across their brand system for "we're humanising the AI story" content. Worth cataloguing as `LUMINA_ANTHROPIC.mood: "human-editorial"` — the brand-mood that pairs B&W human portraits with the coral accent.
- **Serif for editorial-question headlines** vs **sans for product-factual headlines** — confirmed as a **brand system rule** in Anthropic's design language. Our system's LLM should choose serif vs sans based on the slide's rhetorical mode:
    - Serif: questions, philosophical framing, essay-style openers.
    - Sans: declarative statements, stats, "here's what happened".
- **The `→` arrow ending subtitles** is a subtle but repeatable device — signals continuation. LLM should have an option to include it: `subtitleEndsWithArrow: boolean` — mostly on cover slides, not on body slides.

_Progress: 32 / 85 complete._

---

### claude/image copy 10.png

**Progress-log row:** 33 · claude · image copy 10.png

#### Composition & structure
- **Canvas:** 1080 × 1350 (portrait 4:5), Instagram / LinkedIn carousel standard.
- **Full-bleed background:** solid **coral-orange** — this is the same hue we've been calling `ACCENT_CORAL` on earlier Anthropic slides (`~#D46A5E`), but here it's promoted from **accent** to **entire slide background**. Confirms coral is not just an accent role but also a **hero background role** — a "warm-loud" mood slide that punctuates the otherwise cream-toned carousel.
- **Layout family:** `aurora-product-body` (Anthropic body-slide framework) with a **NEW `bodyLayout` variant: `"pull-quote"`**. Structure top → bottom:
    1. **Small intro question** (top, Inter Bold, cream/ivory text on coral, ~28-32 pt) — a rhetorical bridge from the previous slide.
    2. **Big serif pull quote** (middle, dominant visual weight, ~68-80 pt serif with curly quotes, wraps 4-5 lines). Contains **inline-bold emphasis** on a key phrase mid-quote.
    3. **Attribution block** (below quote, ~2 lines): speaker name in Inter Bold, then role/affiliation in Inter Regular.
    4. **Duotone portrait cutout** of the interviewee, occupying the right ~40 % of the slide, cutout from background (no photo frame, no rectangle — subject silhouetted directly onto the coral bg).
    5. **Chrome (persistent across all Anthropic carousel slides):** small "Anthropic" brand wordmark top-right, left + right circular white chevron nav buttons vertically centred on side edges, dot indicator bottom-centre (6 dots total; **dot 3 filled** — this is slide 3 of Carousel 3).
- **Silhouette / cutout technique:** The portrait of Dan Alistarh is a **B&W duotone** (highlights map to cream/ivory, shadows map to a deeper coral-red — same "duotone-into-slide-bg" recipe used on the Carousel 3 cover, image 32). The subject is **cutout** — no rectangular frame — so his shirt, arms, and posture merge cleanly into the coral background. This is a **signature Anthropic editorial device**: portrait-as-part-of-composition rather than portrait-in-a-box.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Top intro question (~72 → ~200 y):** left-aligned Inter Bold, cream/ivory `#F5EFE0` on coral. ~28-32 pt. 1-2 lines. Content: `If you can try 20 ideas at once, why pick one?`
- **Zone B — Pull quote (~240 → ~880 y):** left-aligned serif (Fraunces Bold or Playfair Display, ~72 pt display size), cream/ivory. **Wraps ~4 lines.** Opens with an **oversized left curly-quote glyph** `"` (possibly a decorative drop-cap treatment: the opening quote is larger and slightly outdented). Closes with matching right curly quote at end of quote. **Inline-bold** span in the middle for the key phrase: `**powerful telescope.**` (bold weight, same serif family, same colour — emphasis-by-weight not by hue).
    - Full quote text: `"It's a bit like we got a more **powerful telescope.** You can map deeper or broader, but you're still mapping an infinite space. You still need to know where to look."`
    - This is the **third confirmed occurrence** of Anthropic's mid-quote-bold pattern (also seen on the drug-discovery essay body slides). Confirms it as a systematic device, not a one-off.
- **Zone C — Attribution (~920 → ~1010 y):** left-aligned, 2 lines. Line 1: `Dan Alistarh` in Inter Bold ~24-28 pt cream. Line 2: `Researcher, Anthropic` in Inter Regular ~20-22 pt cream (or slightly muted cream at ~85 % opacity).
- **Zone D — Portrait cutout (right ~40 % of canvas, ~y 200 → 1250):** Dan Alistarh seated in a chair, arms folded, looking slightly off-camera. **No rectangular photo frame** — the portrait is silhouetted with a soft transparency mask so his head, hair, folded arms and shirt integrate directly onto the coral bg. Duotone processing: highlights → cream `#F5EFE0`, shadows → deep-coral-red `~#8A3A32`. This gives the portrait a "posterised warm" feel that reads editorial rather than photographic.
- **Zone E — Chrome:**
    - Top-right: `Anthropic` wordmark, Inter Medium, ~18 pt cream.
    - Left/right side edges (~y 675): white circular nav chevrons `‹` / `›`, ~50 px diameter, ~80 % white fill on coral bg (subtle contrast — chrome, not focal).
    - Bottom-centre (~y 1290): 6 dot indicator, ~6 px each, ~10 px apart. Dot 3 filled cream, dots 1/2/4/5/6 hollow / muted-cream at ~40 % opacity.

#### Palette (extracted, this slide)
- `BG_HERO_CORAL = #D46A5E` — full-bleed slide bg. Same as `ACCENT_CORAL` — now promoted to `heroBg` role.
- `TEXT_ON_CORAL = #F5EFE0` (cream/ivory) — same `CARD_CREAM` we defined on image 30. Reused as text colour on coral bg.
- `TEXT_ON_CORAL_MUTED ≈ #F5EFE0 @ 85%` (or possibly `#E5DDCC`) — softer cream for role/affiliation line.
- `DUOTONE_SHADOW_CORAL_DEEP ≈ #8A3A32` — the darker end of the duotone lookup for the portrait shadows. Deep-coral-red.
- `DUOTONE_HIGHLIGHT = #F5EFE0` — cream highlights, matches text colour so portrait blends into the compositional colour system.

**Palette-role additions (Anthropic system, cumulative):**
| Role | Token | Hex |
|---|---|---|
| `heroBg-coral` (new — coral promoted to bg role) | `BG_HERO_CORAL` | `#D46A5E` |
| `duotone-shadow-on-coral` (new) | `DUOTONE_SHADOW_CORAL_DEEP` | `~#8A3A32` |

#### Typography
- **Intro question:** Inter Bold, ~28-32 pt, cream on coral, left-aligned, tight line height (~1.15).
- **Pull quote:** **serif display face — Fraunces Bold or Playfair Display Bold**, ~68-80 pt, cream on coral, left-aligned. Line height ~1.15-1.2. **Curly quotes** (`"` `"`), not straight — this is important; the LLM/renderer must always output curly for pull-quotes.
- **Inline emphasis inside quote:** same serif family, same size, but **weight bumped from Regular/Book → Bold or ExtraBold**, same cream colour. **Do NOT use italic** for this emphasis — Anthropic uses weight-based emphasis in serif quotes, italic is reserved for editorial cover subtitles only.
- **Attribution name line:** Inter Bold, ~24-28 pt, cream.
- **Attribution role line:** Inter Regular, ~20-22 pt, cream (or muted cream).

**Confirms:** two font families are BOTH required in a single slide — Inter (sans, for intro/attribution) + Fraunces or Playfair (serif, for the quote itself). This mixed-typography-per-slide pattern is a core Anthropic body-slide capability.

#### Iconography
- **Curly quote glyphs** are the only "iconography" — they are typographic, not vector-icons. The opening `"` may be slightly outdented / oversized as a subtle drop-cap emphasis.
- No other icons. Chrome nav chevrons are `‹ ›` typographic glyphs inside circles, not custom icons.

#### Motion / interaction affordance
- Static export. Nav chevrons imply carousel swipe. Coral background is loud enough to serve as a "punchline" slide — likely the emotional peak of Carousel 3 (a memorable quote is the takeaway).

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "pull-quote"` — NEW variant (6th confirmed body layout).

**Key template extension:** `heroImage.type: "portrait-cutout"` — a NEW hero-image sub-type distinct from `"photograph"` (rectangular photo frame) and `"3d-render"`. `portrait-cutout` renders a duotoned silhouette-masked person onto the slide background with no rectangular frame — the subject becomes part of the composition. This same technique was used on image 32 (Carousel 3 cover with portrait strip) — so `portrait-cutout` is a shared primitive across `aurora-product-cover` + `aurora-product-body`.

**Full LLM output contract (image 33 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "pull-quote",
  "slideBackground": {
    "role": "hero-coral",
    "hex": "#D46A5E"
  },
  "textColourOnBg": {
    "primary": "#F5EFE0",
    "muted": "#F5EFE0@85%"
  },
  "introQuestion": "If you can try 20 ideas at once, why pick one?",
  "pullQuote": {
    "text": "It's a bit like we got a more powerful telescope. You can map deeper or broader, but you're still mapping an infinite space. You still need to know where to look.",
    "boldSpans": [{ "phrase": "powerful telescope.", "weight": "bold" }],
    "font": "fraunces-bold",
    "sizePt": 72,
    "curlyQuotes": true
  },
  "attribution": {
    "name": "Dan Alistarh",
    "role": "Researcher, Anthropic"
  },
  "portrait": {
    "type": "portrait-cutout",
    "subject": "Dan Alistarh",
    "duotone": {
      "highlight": "#F5EFE0",
      "shadow": "#8A3A32"
    },
    "position": "right",
    "widthFraction": 0.4,
    "silhouetteMask": true
  },
  "chrome": {
    "wordmark": "Anthropic",
    "navChevrons": true,
    "dotIndicator": { "total": 6, "current": 3 }
  }
}
```

**Renderer / Fabric helpers required (new for this slide):**
- `makePortraitCutout({ subjectImage, duotoneHighlight, duotoneShadow, silhouetteMaskPath, x, y, widthFraction })` — applies duotone + alpha-mask + composites onto the slide bg. This is the trickiest new helper: needs a **pre-processed portrait asset** (either provided by user or generated via a background-removal pass) plus a duotone LUT applied at render time. **NOTE:** for MVP we could accept a PNG with alpha already baked in and only apply the duotone at render time.
- `makePullQuote({ text, boldSpans, font, sizePt, colour, curlyQuotes, wrapWidth })` — serif quote block with in-line bold span support. Uses Fabric's textbox with per-character font-weight styling (Fabric supports `styles: {[lineIdx]: {[charIdx]: {fontWeight: 'bold'}}}` — we already have this pattern in existing helpers).
- `makeAttributionBlock({ name, role, colour, x, y })` — 2-line label pair with weight contrast.
- `makeIntroQuestion({ text, font, sizePt, colour, x, y, maxWidth })` — small emphatic hook above the quote. Reusable across other body layouts.

**LLM prompt hooks:**
- `bodyLayout: "pull-quote"` should be selected by the LLM when the **most memorable line in the source content is a quotation from a named source**. It's the "money-quote slide."
- The LLM should structure the prompt: `introQuestion` = a rhetorical bridge from the prior slide (usually a question form ending in "?"). `pullQuote` = the actual quotation. `attribution` = who said it.
- **BoldSpans rule:** exactly one span, typically 2-4 words, positioned to highlight the metaphor or key noun-phrase in the quote (here: "powerful telescope"). LLM should identify the concrete metaphor-anchor inside the quote and mark it bold.

#### Notes / open questions
- **Coral-as-hero-background is confirmed** as a distinct role — not just an accent. Anthropic uses ~1 coral-hero slide per carousel as the emotional/rhetorical peak. Recommend our system reserve `heroBg-coral` for 1 slide per carousel maximum (over-use dilutes the peak).
- **Portrait-cutout is a demanding asset pipeline requirement.** Options:
    1. **User uploads pre-masked PNG** (alpha channel already baked in) — simplest.
    2. **Backend runs `rembg` or similar on upload** — automated, but adds an image-processing dependency.
    3. **AI-generated portrait via image-model** — most flexible but least controllable identity.
    Recommend Option 1 for MVP (user-supplied masked PNG), Option 2 (`rembg`) for polish phase.
- **Fraunces vs Playfair Display for the pull-quote serif:** Fraunces has more contemporary character and more optical-size flexibility; Playfair is more classic. Anthropic's brand system appears to lean toward Fraunces (based on the letterform character in image 32's headline). Recommend Fraunces as our primary serif for editorial/quote use.
- **Inline-bold emphasis in serif quotes is a confirmed Anthropic pattern** (3rd occurrence). Our system should support `boldSpans: {phrase, weight}[]` on any text-block prop, not just this one variant.
- **Carousel 3 sequence so far:** slide 1 = cover (image 32 portrait-strip), slide 3 = pull-quote (this image). Slide 2 (unseen — likely between 32 and 33 in the source deck but not in our export set OR it's an interstitial we haven't yet analysed) probably introduces Dan Alistarh's research context. Dot indicator confirms 6 total, so 3 more slides expected (34, 35, 36).
- **Confirmation of 15 remaining `claude/` slides:** likely 3 more from Carousel 3 (34-36) + possibly 11-12 from a 4th carousel (37-47). We'll see.

_Progress: 33 / 85 complete._

---

### claude/image copy 11.png

**Progress-log row:** 34 · claude · image copy 11.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same folder-baseline claude/ chrome (Anthropic wordmark top-right, circular white nav chevrons on side edges, dot indicator bottom-centre).
- **Carousel context:** slide 4 of Carousel 3 (AI-researchers essay). Dot indicator = 6 dots total, **dot 4 filled**. Sits directly after image 33 (slide 3, Dan Alistarh pull-quote) — this is the **second consecutive pull-quote slide**, with a different interviewee.
- **Template:** `aurora-product-body` with `bodyLayout: "pull-quote"` — same variant introduced in image 33. **No new primitives, no new palette tokens.** This is a delta entry confirming template stability.

#### Zones (same schema as image 33)
- **Zone A — Full-bleed coral bg:** `BG_HERO_CORAL = #D46A5E`. Second consecutive coral-hero slide in Carousel 3, which is unusual — most carousels in this folder use ~1 coral slide as the emotional peak. Either (a) Carousel 3 is deliberately using back-to-back coral for a **"parade of quotes" beat** — several interviewees in a row, each getting the coral-hero treatment; or (b) Carousel 3's design system uses coral as the base bg for its interview beats, and only cover + summary slides break away. Suggests our system should let LLM group N sibling slides under a shared `slideBackground.role` when they share a rhetorical function.
- **Zone B — Top intro question (~72 → ~130 y):** `What does it mean to publish a paper now?` — Inter Bold, ~28-32 pt, cream `#F5EFE0` on coral, left-aligned. Single line. Sets up the quote below by reframing the interview topic as a question.
- **Zone C — Pull quote (~170 → ~980 y):** left-aligned serif (Fraunces Bold or Playfair Display Bold), cream on coral, ~68-72 pt, wraps **~10 lines** (longer than image 33's ~4-line quote — the box scales to accommodate). Curly quotes at both ends. Full text:
    > `"Individually we feel empowered. We're at home and maybe we can develop ideas very quickly and it's satisfactory. **But what does it do to the whole community?** Because it accelerates everything. Who has time even to read it, to review it?"`
    - **Inline-bold span:** `But what does it do to the whole community?` — a **7-word question embedded mid-quote**, bolded for emphasis. **Confirms bold-span rule scales from 2-word phrases (image 33's "powerful telescope") to full 7-word questions.** LLM prompt should therefore not cap `boldSpans[].phrase.length` at a small word count; the rule is semantic (the "money-line" of the quote), not length-based.
    - Curly apostrophes throughout (`We're`, `it's`) — reinforces "always output smart quotes" rule.
- **Zone D — Attribution (~1000 → ~1080 y):** left-aligned, 2 lines.
    - Line 1: `Thomas Hofmann` — Inter Bold, ~24-28 pt, cream.
    - Line 2: `Professor, ETH Zurich` — Inter Regular, ~20-22 pt, cream (or slightly muted). **Institutional affiliation format:** `<Role>, <Institution>`. Matches the pattern from image 32's cover subtitle mentioning "professors from ETH Zurich and ISTA" — the LLM writer can cross-reference cover metadata to populate per-slide attribution.
- **Zone E — Portrait cutout (right ~40 % of canvas, ~y 250 → 1300):** Thomas Hofmann seated in a director's chair, left hand resting on knee, striped collared shirt, curly grey hair, warm gaze slightly off-camera. **B&W duotone → coral cutout** (highlights map to cream, shadows map to `DUOTONE_SHADOW_CORAL_DEEP ~#8A3A32`). No rectangular frame — silhouette-masked and composited directly onto the coral bg. **Same technique as image 33 with a different subject.**
    - Notable: the chair-back is partially visible on the right edge (as a dark angular shape), and the portrait subject's hand-on-knee posture is retained — the mask preserves the full seated pose, not just a headshot. Suggests our portrait-cutout pipeline should preserve **full-body context** where available (posture reads as personality).
- **Zone F — Chrome:** identical to image 33.
    - Top: no visible wordmark on this crop (may sit outside the visible area, or the crop was tight); assume `Anthropic` wordmark still present in production render.
    - Side edges (~y 675, x ~30 and x ~600): white circular nav chevrons `‹` / `›`.
    - Bottom-centre (~y 1330): 6 dot indicator, **dot 4 filled**.

#### Typography (unchanged from image 33)
- Intro question: Inter Bold, ~28-32 pt, cream, left-aligned.
- Pull quote: Fraunces Bold / Playfair Display Bold, ~68-72 pt, cream, left-aligned, curly quotes, inline-bold span.
- Attribution: Inter Bold (name) + Inter Regular (role), cream.

#### Palette (unchanged from image 33)
- `BG_HERO_CORAL = #D46A5E`
- `TEXT_ON_CORAL = #F5EFE0`
- `DUOTONE_SHADOW_CORAL_DEEP ~= #8A3A32`
- `DUOTONE_HIGHLIGHT = #F5EFE0`

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "pull-quote"`. **Second confirmed instance** — the pattern is now validated as a **repeatable multi-slide beat**, not a one-off. Carousel 3 has AT LEAST TWO consecutive pull-quote slides (33 + 34), and possibly more coming (35, 36 may continue the interview-parade beat).

**LLM prompt hooks (refined from image 33):**
- **Pull-quote is a repeatable beat**, not a solo device. When the source content includes an interview or panel discussion with N speakers, the LLM should be able to generate N sibling `pull-quote` slides in a row, each following the same layout with a different `attribution` + `pullQuote` + `introQuestion`.
- **introQuestion pattern (refined):** each sibling slide can either (a) **share the same introQuestion** across the series (framing all quotes with one meta-question) OR (b) **vary the introQuestion per slide** (each quote gets its own rhetorical setup). Image 33 asked `"If you can try 20 ideas at once, why pick one?"` (research-methodology framing); image 34 asks `"What does it mean to publish a paper now?"` (publication-workflow framing). **Different questions, different framings** → this carousel uses **option (b): varied intro-questions per slide**. LLM should generate a unique framing question per quote, tuned to what the quote is about.
- **boldSpans length is flexible.** Image 33's bold span was 2 words ("powerful telescope"); image 34's is 7 words ("But what does it do to the whole community?"). **The rule is semantic, not syntactic:** the bold span is whatever phrase carries the emotional/argumentative peak of the quote — regardless of length.
- **Institutional affiliation format:** `<Role>, <Institution>` (image 33: `Researcher, Anthropic`; image 34: `Professor, ETH Zurich`). Comma-separated, no honorific prefix, no title suffix. LLM should follow this exact format.

**Renderer / Fabric helpers required:** all already proposed in image 33 (`makePortraitCutout`, `makePullQuote`, `makeAttributionBlock`, `makeIntroQuestion`). **No new helpers.**

#### Iconography
- Same as image 33: only curly quote glyphs. No vector icons.

#### IG safe-zone check
- Intro question at y≈72–130 — inside the top 200-px avatar-bar risk zone. Same as image 33.
- Attribution at y≈1000–1080 — safely above the 1170-px bottom risk zone.
- Portrait bottom extends to y≈1300 — deep in the bottom risk zone; the chair/lower-body of the portrait may be clipped by IG chrome. Since it's decorative (subject's face is well above the risk line), acceptable.
- Dot indicator at y≈1330 — deep in risk zone (decorative).

#### Reusability score
- **5/5 for the pull-quote layout** — second confirmed instance validates the template as high-value.
- **5/5 for the coral-hero repetition strategy** — using the same bold bg across a sibling series creates rhythm without introducing new design work per slide.

#### Notes / open questions
- **Two consecutive coral-hero slides** (33, 34) breaks the earlier assumption ("~1 coral slide per carousel"). Updated rule: **coral-hero can span a sibling series when the series carries a shared rhetorical function (interviews, quotes, testimonials)**. Reserve the transition IN/OUT of the coral run as the "peak markers" — the slide BEFORE the coral run signals "we're entering the human voice", and the slide AFTER signals "we're returning to analysis". Look for these boundaries in slides 32 (before) and 35+ (after).
- **The pull-quote beat is proving to be a MULTI-SLIDE sub-sequence** in Carousel 3 — similar to the "language findings" multi-slide beat in Carousel 2 (image 31 = Hindi, and presumably more per-language slides existed for Portuguese, Mandarin, etc.). Confirms Anthropic's carousel design uses **repeatable-template multi-slide beats** as a structural device. Our LLM should be able to emit `Array<PullQuoteSlide>` for a "quotes-parade" beat, not just single slides.
- **Portrait cutout subjects vary in composition:** image 33 = arms-folded seated (compact); image 34 = seated with hand on knee (more relaxed/expansive). The `widthFraction: 0.4` prop is roughly consistent, but the **portrait aspect ratio varies** — some subjects fill more vertical space (Hofmann here extends nearly full-canvas-height) than others. The template should support flexible portrait dimensions, not a fixed bounding box. LLM should specify `portrait.aspectRatio` OR let the pre-masked PNG's native dimensions drive layout.
- **Confirmed absence of image between 33 and 34 was NOT a missing slide** — Carousel 3 goes cover (32) → pull-quote-1 (33) → pull-quote-2 (34) → ... with **no interstitial context slide** between quotes. Anthropic trusts the reader to move between quotes without hand-holding. Efficient, editorial rhythm.

_Progress: 34 / 85 complete._

---

### claude/image copy 12.png

**Progress-log row:** 35 · claude · image copy 12.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same folder-baseline claude/ chrome (L/R circular nav chevrons at ~y 540, dot indicator bottom-centre).
- **Carousel context:** slide 5 of Carousel 3. Dot indicator = 6 dots total, **dot 5 filled** (5/6).
- **Full-bleed background:** `BG_WARM_STONE = #DFD8CB` — Anthropic's warm stone palette (same as Carousel 2 body slides + Carousel 3 cover). **Break from the coral-hero run** (slides 33, 34) — signals a rhythmic return to the analytical/editorial baseline while still carrying the interview-quote content. Coral is reserved for the emotional-peak slides; stone hosts the "gather multiple voices" beats.
- **NEW `bodyLayout` variant: `"stacked-quotes"`** — the slide holds **TWO pull-quotes stacked vertically**, each with:
    - Small intro question above (Inter Bold ~24-28 pt cream/dark).
    - Serif quote body (Fraunces Bold ~52-56 pt, dark ink `#1B1B1B`, wraps 3-5 lines, curly quotes, inline-bold span).
    - Attribution row = small **circular avatar chip** (~90 px diameter, coral-tinted duotone portrait crop) + name in Inter Bold + role in Inter Regular.
    - Two quote blocks separated by ~40-60 px vertical whitespace (no rule, no divider — purely typographic separation).
- This is a **compressed-interview beat** — packs two speakers' contributions into one slide instead of dedicating a full slide per speaker. Efficient use of carousel real estate when quotes are shorter or thematically paired.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Quote block 1 (y ~65 → ~470):**
    - Intro question (y ~65-100): `Will we eventually hit a plateau?` — Inter Bold ~28 pt, `#1B1B1B`, left-aligned, single line.
    - Pull quote (y ~115-360): Fraunces Bold ~54 pt, `#1B1B1B`, left-aligned, wraps 5 lines. Curly quotes. Full text:
        > `"It would be great if we hit a wall—it would give us time to think certain things through. But I fear that the opposite will happen. **We are still on a train that's really accelerating.**"`
        - **Inline-bold span:** `We are still on a train that's really accelerating.` (~10 words). Third occurrence of the bold-span pattern, again the "money-line" of the quote.
        - Note the **em-dash `—`** in `wall—it` (U+2014). Anthropic uses em-dashes for internal-sentence breaks; the LLM writer should output em-dashes, not `--` or hyphen-minus.
    - Attribution row (y ~380-450):
        - **Small circular avatar chip** (~90 px diameter) at x ~80: cropped headshot of Thomas Hofmann on a coral-red circular bg (`~#D46A5E`). The portrait is **duotone-processed** onto coral — same colour-treatment as image 34's full-body portrait, but scaled down to a 90 px circle. Reader recognises this as the same speaker from the previous slide.
        - To the right of avatar (x ~205, y ~380): `Thomas Hofmann` — Inter Bold ~26 pt, `#1B1B1B`.
        - Below name (y ~415): `Professor, ETH Zurich` — Inter Regular ~22 pt, muted stone `~#7A756A` (INK_MUTED_STONE from image 31).

- **Zone B — Quote block 2 (y ~500 → ~1050):**
    - Intro question (y ~500-540): `Have you ever outsourced your thinking?` — Inter Bold ~28 pt, `#1B1B1B`, single line.
    - Pull quote (y ~555-940): Fraunces Bold ~54 pt, `#1B1B1B`, left-aligned, wraps 5 lines. Curly quotes. Full text:
        > `"Forgive me, for I have sinned. It's 10 PM, it's been a long Claude session, and you just say: 'Okay, come up with a better idea.' It has never worked so far, sadly."`
        - **No inline-bold** on this quote — the wit and voice do the emphasis work without typographic marking. Confirms bold-span is **optional per quote** — for quotes where the humour or full text carries itself, LLM should leave `boldSpans: []`.
        - **Nested single quotes** (`'Okay, come up with a better idea.'`) inside the outer double quotes. Curly forms for both (`'` `'` inside `"` `"`). LLM must correctly nest curly quote marks.
        - Interesting: `Anthropic` is misspelled `Anthropic` on the role line below (reads `Anthropic`, but visible in the source it's `Anthropic` — actually the crop shows `Anthropic` correctly. Ignore this note.)
    - Attribution row (y ~960-1030):
        - **Small circular avatar chip** at x ~80: cropped headshot of Dan Alistarh (same speaker from image 33) on coral bg. **Confirms the avatar chip is a compressed portrait-cutout** — same speaker as slide 33's full-body cutout, reused at 90 px.
        - Name (x ~205, y ~960): `Dan Alistarh` — Inter Bold ~26 pt.
        - Role (y ~995): `Researcher, Anthropic` — Inter Regular ~22 pt, muted stone (misspelled `Anthropic` in the reference — actually it reads correctly).

- **Zone C — Chrome:**
    - Side edges (~y 540): white circular nav chevrons `‹` / `›`. Same primitive as prior claude slides.
    - Bottom-centre (~y 1310): 6 dot indicator, dot 5 filled.

#### Palette
- `BG_WARM_STONE = #DFD8CB` (slide bg)
- `INK_BLACK = #1B1B1B` (quote body, name, intro question)
- `INK_MUTED_STONE = #7A756A` (role/affiliation line)
- `AVATAR_BG_CORAL = #D46A5E` (small circular avatar-chip bg — same as `BG_HERO_CORAL`, reused for avatar chips)
- `DUOTONE_HIGHLIGHT = #F5EFE0` + `DUOTONE_SHADOW = ~#8A3A32` (avatar portrait duotone)

**No new palette tokens.** All values were already established in prior claude/ entries.

#### Typography
- **Intro question (×2):** Inter Bold ~28 pt, `#1B1B1B`, left-aligned.
- **Pull quote (×2):** Fraunces Bold ~54 pt, `#1B1B1B`, left-aligned, curly quotes, optional inline-bold span. **Size reduced** from 68-72 pt (image 33/34 single-quote layout) to ~54 pt (this stacked-quote layout) to accommodate two quotes on one slide. LLM should scale the quote body-text size **inversely to slide density** — dense = smaller quote type.
- **Name (×2):** Inter Bold ~26 pt, `#1B1B1B`.
- **Role (×2):** Inter Regular ~22 pt, muted stone.

#### Iconography / decorative primitives
- **NEW primitive: circular avatar chip** — small ~90 px diameter circle, coral-red bg, containing a duotone-processed portrait headshot. Reader recognises this as a **shrunken version of the portrait-cutout primitive**. Recommend: `makeAvatarChip({ portraitUrl, size, bgColor, duotoneHighlight, duotoneShadow, borderRadius: "50%" })` — a compact reusable primitive. Different from `makePortraitCutout` in scale + shape (circular vs full-body silhouette) but sharing the duotone-onto-coral colour recipe.
- No other icons. Chrome as usual (chevrons, dot indicator).

#### Motion / interaction affordance
- Static. Two quotes read top-to-bottom, reader dwells longer per slide.
- The stacked composition creates a **paired-perspective moment** — reader compares Hofmann's caution ("we're accelerating") against Alistarh's self-deprecating humour ("Claude session at 10 PM"). Slide functions as a **thematic pair-up** rather than two disconnected quotes.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "stacked-quotes"` — **NEW 7th confirmed body layout** for `aurora-product-body`. Running total:
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34)
7. `stacked-quotes` (35) ← NEW

**Full LLM output contract (image 35 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "stacked-quotes",
  "slideBackground": {
    "role": "warm-stone",
    "hex": "#DFD8CB"
  },
  "quotes": [
    {
      "introQuestion": "Will we eventually hit a plateau?",
      "pullQuote": {
        "text": "It would be great if we hit a wall—it would give us time to think certain things through. But I fear that the opposite will happen. We are still on a train that's really accelerating.",
        "boldSpans": [{ "phrase": "We are still on a train that's really accelerating.", "weight": "bold" }],
        "font": "fraunces-bold",
        "sizePt": 54
      },
      "attribution": {
        "name": "Thomas Hofmann",
        "role": "Professor, ETH Zurich",
        "avatar": {
          "type": "avatar-chip",
          "portraitUrl": "…",
          "bgColor": "#D46A5E",
          "size": 90
        }
      }
    },
    {
      "introQuestion": "Have you ever outsourced your thinking?",
      "pullQuote": {
        "text": "Forgive me, for I have sinned. It's 10 PM, it's been a long Claude session, and you just say: 'Okay, come up with a better idea.' It has never worked so far, sadly.",
        "boldSpans": [],
        "font": "fraunces-bold",
        "sizePt": 54
      },
      "attribution": {
        "name": "Dan Alistarh",
        "role": "Researcher, Anthropic",
        "avatar": {
          "type": "avatar-chip",
          "portraitUrl": "…",
          "bgColor": "#D46A5E",
          "size": 90
        }
      }
    }
  ],
  "chrome": {
    "navChevrons": true,
    "dotIndicator": { "total": 6, "current": 5 }
  }
}
```

**Renderer / Fabric helpers required (new for this slide):**
- `makeAvatarChip({ portraitUrl, size, bgColor, duotoneHighlight, duotoneShadow })` — small circular avatar with duotone-on-coral portrait. **New primitive.** Related to `makePortraitCutout` (image 33) but simpler (circular clip, no silhouette mask needed — just a normal circular photo crop with duotone LUT).
- `makeStackedQuoteRow({ introQuestion, pullQuote, attribution, y, availableHeight })` — one row = intro + quote + attribution row. Composed by the `stacked-quotes` body layout.
- `makeAttributionWithAvatar({ avatarChip, name, role, y, x })` — extends `makeAttributionBlock` (image 33) with the avatar-chip primitive to the left of the name/role stack.

**LLM prompt hooks:**
- `bodyLayout: "stacked-quotes"` should be selected when **two related quotes are shorter than the full-slide pull-quote size (~40-90 words each)** AND they carry thematically-linked or contrasting perspectives that benefit from adjacency. If either quote exceeds ~90 words OR needs strong emphasis, use single-slide `pull-quote` instead.
- **Avatar chip vs full portrait cutout:** the LLM should specify:
    - `avatar.type: "avatar-chip"` for stacked-quotes and any high-density layout.
    - `avatar.type: "portrait-cutout"` for single-quote slides that give one speaker centre-stage.
    Both share the duotone-on-coral colour system.
- **Pairing rule:** the two quotes on a stacked-quotes slide should be from **different speakers**. Same-speaker back-to-back quotes read as one long quote — waste of the primitive. LLM should identify contrasting perspectives (Hofmann-cautious vs Alistarh-humble here).

#### Notes / open questions
- **The stone-bg return after two coral-hero slides** is a **rhythmic reset** — Anthropic doesn't let coral dominate. The pattern in Carousel 3 seems to be: cover (stone) → coral (peak 1) → coral (peak 2) → stone (breather with stacked quotes) → ??? (slide 36 will reveal). Suggests LLM's slide-arc generator should **alternate bold-bg slides with neutral-bg slides** to create pacing.
- **Avatar chips reuse previously-shown speakers** — Hofmann appears full-body on slide 34 AND as an avatar-chip on slide 35. Dan Alistarh appears full-body on slide 33 AND as an avatar-chip on slide 35. Anthropic is **rewarding the attentive reader** — the chip is a compressed callback to the earlier full-portrait. Our system could support this pattern: `avatar.reusesSlide: <slideIndex>` metadata to help maintain visual identity continuity across slides.
- **Quote body-text size scales inversely with slide density** (68-72 pt for single-quote slides, ~54 pt for stacked-quote slides). Recommend our renderer support **auto-scaling** for the pull-quote text based on `bodyLayout` variant — one central config table maps layout → default sizes.
- **The `Anthropic` misspelling as `Anthropic`** — I mis-read the reference; it actually reads correctly. Ignore this note; the source is well-formed.
- **Carousel 3 sequence so far (revised):** cover (32) → pull-quote-1 Alistarh (33) → pull-quote-2 Hofmann (34) → stacked-quotes Hofmann+Alistarh (35). This is a **quote-heavy carousel** with 3 out of 5 body slides dedicated to interview quotes. Slide 6 (image 36, next to analyse) will likely close the essay with a summary/reflection or a new format (chart, findings, close).
- **The `→` glyph pattern (image 32's cover subtitle) doesn't reappear on quote body slides** — reserved for cover-slide "read more" affordances. Confirms slot-position rules for `→` glyph usage.

_Progress: 35 / 85 complete._

---

### claude/image copy 13.png

**Progress-log row:** 36 · claude · image copy 13.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same folder-baseline claude/ chrome (circular nav chevrons, dot indicator bottom-centre).
- **Carousel context:** **COVER of a NEW carousel** (Carousel 4 in the claude/ folder). Dot indicator = **7 dots**, **dot 1 filled**. Signals a 7-slide carousel — larger than Carousel 3's 6-slide interview essay. Also confirms this is the definitive END of Carousel 3 (which was 6 slides: 32-37 by dot-count expected, but only slides 32-35 have been analysed with dot positions 1-5; slides 36 could be dot 6 = final of Carousel 3, OR this image is dot 1 of Carousel 4). **This image's dot indicator shows dot 1 filled and NEW topic ("Anthropic Economic Index") — definitively slide 1 of Carousel 4.** Therefore Carousel 3 ended at slide 35 as a 4-slide essay (32,33,34,35), not 6 slides. Revised Carousel 3 count: cover + 3 body = 4 slides total.
- **Full-bleed background:** **NEW palette — cool pale-blue** `~#C7D3DE` (a muted powder-blue with slight grey). Distinct from Anthropic's cream (`#F5F0E5`, drug-discovery) and stone (`#DFD8CB`, language-values + AI-researchers) palettes. **Confirms Anthropic uses topic-specific bg palettes**:
    - Cream / warm off-white → medical / scientific / clinical topics.
    - Warm stone → editorial / analytical / cultural topics.
    - Cool pale-blue (this slide) → economic / geographic / data-driven topics.
    - **Emerging brand-palette taxonomy:** each Anthropic carousel picks 1 bg from a curated palette family, matched to the topic's emotional register.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Hand-drawn hero illustration (~y 40 → 550, x 260 → 700):** the distinctive new element.
    - **A whimsical black-ink line drawing** — reads as a very casual/kids-book aesthetic, not the polished 3D renders or hedcut etchings of prior claude carousels.
    - Content: a **cream-yellow filled circle** (~370 px diameter, `~#F5EFCA` — pale butter-yellow) representing a globe/planet, with a **black hand-drawn grid** overlaid on the sphere (5 vertical + 5 horizontal marker-lines with dot intersections, like an economic-data grid or globe-longitude-latitude). Below the grid, a **loose scribbled hand** (drawn with a wobbly single-line marker style) reaches up to touch the globe. Above the globe, a **curly scribble** (looks like signature or hair) emerges from the top-right of the grid.
    - Line weight: **~4-6 px thick black marker strokes**, hand-drawn with visible imperfections (wobble, over-tracings, small gaps at intersections). Deliberate "handmade / whiteboard sketch" feel. Colour: pure black `#000000`.
    - Dots at grid intersections: solid black circles ~14-18 px diameter, deliberately imperfect (some larger, some smaller). Fabric implication: SVG path with hand-jitter rather than mathematically clean primitives.
    - The composition sits in the **upper-right ~50%** of the canvas — text hangs from the bottom-left, hero from top-right. Same **diagonal composition** as image 23's product cover (top-right hero + bottom-left text), just with different aesthetic.

- **Zone B — Kicker / series eyebrow (~y 610 → 655, x 60 → 900):** `Anthropic Economic Index` — Inter Regular ~28 pt, `#1B1B1B`, left-aligned, single line.
    - **NEW slot: series eyebrow / kicker.** Distinct from a section heading or title. Functions as **product/series brand-marker** — signals "this is part of a named series/publication". Similar to a magazine "column name" or an academic "journal title".
    - Different weight from the drug-discovery cover's monospace label — kicker uses Regular sans, not monospace. Suggests two distinct "small-label" slot types in `aurora-product-cover`:
        - `technicalLabel` (JetBrains Mono / IBM Plex Mono, muted grey, monospace, right-aligned) — for compound IDs, model refs, technical tags.
        - `seriesEyebrow` / `kicker` (Inter Regular, near-black, sans, left-aligned) — for series/publication names.
    - Should extend `aurora-product-cover` spec: `slot: "technicalLabel" | "seriesEyebrow" | "none"`.

- **Zone C — Main display headline (~y 680 → 1120, x 60 → 900):** `How Claude usage varies around the world` — **Inter Bold or Extra-Bold** ~110-120 pt (very large — the biggest heading size seen so far in the claude/ folder), `#1B1B1B`, left-aligned, wraps 4 lines:
    - Line 1: `How Claude`
    - Line 2: `usage varies`
    - Line 3: `around the world`
    - Actually looking again: 4 lines with the split `How Claude / usage varies / around the world` (3 lines) — narrower wrap column suggests the text has ample right-margin room.
    - Line-height ~1.05 (very tight).
    - Line-break honours natural sentence-flow (no forced hyphenation or awkward splits).
    - Note: **NO curly apostrophe** in this headline (no possessives or contractions to test).
    - Font weight: heavier than image 32's serif headline (which was Fraunces Bold ~72 pt). Confirms **sans-Bold for declarative-marketing headlines** (economic-index topic = data-driven, sans) vs **serif-Bold for editorial-question headlines** (image 32's philosophical question = serif). Reinforces the Anthropic brand-system rule from image 32's notes.

- **Zone D — Chrome (chevron + dot indicator):**
    - Right edge (~y 400, x ~600): white circular chevron `›`, ~50 px diameter. **Only R chevron** (no L) — confirms slide 1 status.
    - Bottom-centre (~y 1300): 7-dot indicator, **dot 1 filled** `#1B1B1B`, dots 2-7 muted grey/outlined.

#### Palette (extracted, this slide)
- **NEW palette tokens for Anthropic system:**
    - `BG_PALE_BLUE_ECONOMIC = ~#C7D3DE` — cool pale-blue slide bg for economic/data carousels.
    - `HERO_ACCENT_CREAM_YELLOW = ~#F5EFCA` — the pale butter-yellow globe fill.
- `INK_BLACK = #1B1B1B` (reused — headline, kicker, dot indicator active).
- No coral, no stone, no other accent colours on this slide — very restrained cool palette.

**Palette-role additions (Anthropic system, cumulative):**
| Role | Token | Hex |
|---|---|---|
| `bg-pale-blue-economic` (new) | `BG_PALE_BLUE_ECONOMIC` | `~#C7D3DE` |
| `hero-accent-cream-yellow` (new) | `HERO_ACCENT_CREAM_YELLOW` | `~#F5EFCA` |

#### Typography
- **Series eyebrow / kicker:** Inter Regular ~28 pt, `#1B1B1B`, left-aligned.
- **Main display headline:** Inter Bold / Extra-Bold ~110-120 pt, `#1B1B1B`, left-aligned, line-height ~1.05, wraps 3-4 lines. Largest headline size seen in claude/ folder so far.
- **Dot indicator labels:** none (dots only).

**No new font families required.** Inter Regular + Bold already loaded from prior claude/ entries.

#### Iconography / decorative primitives
- **NEW distinctive primitive: hand-drawn marker illustration** — a whimsical black-ink line drawing with intentional wobble/imperfection. Different from all prior claude/ hero types:
    - Not a photorealistic 3D render (image 23).
    - Not a photographic portrait/lab shot (image 25, 28).
    - Not typography-art (image 29).
    - Not a portrait-strip (image 32).
    - **This is a NEW `heroType: "hand-drawn-illustration"`.**
- Aesthetic: reminiscent of **Anthropic's "essential-Claude" brand illustrations** — friendly, casual, marker-line, single-hue-black-on-cream. Feels like it belongs to a specific "data-storytelling" sub-brand of Anthropic (economic/social research).
- **NEW palette accent:** cream-yellow globe fill breaks the pale-blue monochrome. Represents "data / metric / index" abstractly — a globe that's ALSO a grid.

#### Motion / interaction affordance
- Static. R chevron implies swipe-right for slide 2.
- The **hand reaching up to touch the globe** creates implied motion — human reach + global data = the whole essay's premise in one image. Powerful conceptual visual.
- The **wobbly hand-drawn quality** signals "this is exploratory / open-ended research, not a polished product announcement" — matches the tone of an "economic index" (analytical, curious, not sales-pitchy).

#### Template family & LLM prompt structure

**Template:** `aurora-product-cover` with `heroType: "hand-drawn-illustration"` — **NEW 4th confirmed heroType** for `aurora-product-cover`. Running total:
1. `3d-render` (image 23)
2. `typography-art` (image 29)
3. `portrait-strip` + `sandwich` subVariant (image 32)
4. `hand-drawn-illustration` (image 36) ← NEW

**Full LLM output contract (image 36 exemplar):**
```json
{
  "template": "aurora-product-cover",
  "heroType": "hand-drawn-illustration",
  "slideBackground": {
    "role": "pale-blue-economic",
    "hex": "#C7D3DE"
  },
  "heroIllustration": {
    "assetUrl": "…",
    "aspectRatio": "square",
    "position": "top-right",
    "styleHint": "marker-line hand-drawn, black ink on cream-yellow accent, 4-6px stroke, deliberate wobble, subject: globe + grid + hand reaching up"
  },
  "seriesEyebrow": "Anthropic Economic Index",
  "displayHeadline": {
    "text": "How Claude usage varies around the world",
    "font": "inter-bold",
    "sizePt": 118,
    "align": "left",
    "lineHeight": 1.05
  },
  "chrome": {
    "navChevrons": { "showLeft": false, "showRight": true },
    "dotIndicator": { "total": 7, "current": 1 }
  }
}
```

**Renderer / Fabric helpers (new for this variant):**
- `makeHandDrawnIllustrationHero({ assetUrl, x, y, width, height })` — thin wrapper for a pre-designed marker-line SVG/PNG. **Asset-driven** (like `typography-art` hero): the illustration is designed by a human/AI once per carousel, not procedurally generated per-slide.
- Extend `makeProductCoverSlide` (image 23) to accept `heroType: "hand-drawn-illustration"` and route through `makeHandDrawnIllustrationHero`.
- **Asset generation strategy for hand-drawn illustrations:**
    1. **User-supplied SVG/PNG** — creator draws (or commissions) a marker-line illustration once, uploads as asset. Simplest.
    2. **AI-generated via image model** with prompt style like: `"casual marker-line drawing, thick black strokes with visible imperfections, cream-yellow accent circle, subject: [X], no shading, no gradients, minimalist"`. Requires prompt engineering + curation.
    3. **Rough.js / Perfect Freehand library** — generate marker-line versions of clean vector shapes procedurally. Overkill for MVP but interesting future work.
    - **Recommend Option 1 for MVP** (user uploads) + Option 2 as image-gen pipeline matures.

**LLM prompt hooks:**
- `heroType: "hand-drawn-illustration"` should be selected when the topic is **exploratory, curious, data-driven, or intentionally casual** — matches the tone of research reports, curiosity essays, index/dashboard intros. NOT for polished product launches (use `3d-render`) or philosophical questions (use `portrait-strip` or `typography-art`).
- **Series eyebrow** (`Anthropic Economic Index`) is a new metadata slot — LLM should include this on covers when the content belongs to a named series/publication. Format: 2-4 words, title case, no punctuation.
- **Sans-Bold for declarative/data headlines** — reinforces the brand-system rule: serif for question/philosophical headlines, sans for declarative/data headlines.
- **Large headline size (~118 pt) works when the slide has no subtitle** — this cover has only kicker + headline (no subtitle paragraph like image 23). Headline can therefore be very large. Recommend our system: `if (subtitle) headlineSize = 72pt else headlineSize = 118pt`.

#### IG safe-zone check
- Hero at y≈40 → 550 — top edge inside the 200-px avatar-bar zone. Some of the top of the illustration (the curly scribble above the globe) may be partially obscured. Since it's decorative, acceptable.
- Kicker at y≈610 — safely below top-risk zone.
- Headline at y≈680 → 1120 — safely within the content zone.
- Dot indicator at y≈1300 — inside the 1170-px bottom-CTA-overlay zone. Decorative, acceptable.

#### Reusability score
- **`hand-drawn-illustration` heroType:** 5/5 — extremely versatile for any curiosity-driven / data-storytelling / research-report cover. Universally applicable across topics with the right illustration.
- **Cool pale-blue palette:** 4/5 — great for data/economic/analytical topics; less ideal for warm-editorial content (which uses stone) or medical/clinical (cream).
- **Kicker/series eyebrow slot:** 5/5 — universal for any brand with named publications/series.

#### Template pattern classification (final)
- **`aurora-product-cover`** with `heroType: "hand-drawn-illustration"`, `seriesEyebrow: string | null`.
- Extended cover-slide framework: chrome + bg palette + hero (4 variants) + optional kicker + display headline + optional subtitle.

#### Copy-pattern hint (LLM writer)
- Series eyebrow formula: **2-4 words, title case, brand + report-type**. Examples:
    - `"Anthropic Economic Index"` (this slide)
    - `"Anthropic Trust & Safety Brief"`
    - `"Anthropic Research Log"`
    - `"Claude Weekly Digest"`
- Display headline formula (image 36 style): **`"How [Subject] [verb-phrase] around/across [dimension]"`** — a declarative title framed as a "geographic/comparative exploration" question. Examples:
    - `"How Claude usage varies around the world"` (this slide)
    - `"How AI adoption differs across industries"`
    - `"How coding assistants shape team velocity"`
- Voice: **explanatory-analytical**, not marketing. First person avoided; subject-centric framing.
- **No subtitle** on this cover — kicker + big headline is enough. LLM should recognize when a subtitle adds nothing and omit it.

#### Notes / open questions
- **The claude/ folder now contains 4 CONFIRMED CAROUSELS:**
    - Carousel 1: drug-discovery (23-28, 6 slides).
    - Carousel 2: language-values (29-31, 3 slides seen).
    - Carousel 3: AI-researchers (32-35, 4 slides).
    - Carousel 4: economic-index (36+, 7 slides expected based on dot count).
    - **Total so far: 4 essays × avg 5 slides = ~20 slides.** Fits with the 25 remaining claude/ slides. Expected: 6 more slides (37-42) complete Carousel 4, then possibly Carousel 5 (43-47) with ~5 slides. We'll see.
- **The 4 heroType variants show Anthropic's design range:**
    - `3d-render` — polished, product-marketing, professional.
    - `typography-art` — conceptual, essay-opener.
    - `portrait-strip` — human/interview-focused.
    - `hand-drawn-illustration` — casual, curious, data-storytelling.
    - The LLM should be trained on the **tone-to-heroType matching**: what topic → what visual style.
- **Cool pale-blue is a NEW palette-family entry.** Together with cream + stone, Anthropic now uses 3 approved bg palettes:
    - `#F5F0E5` cream (warm) — clinical/scientific.
    - `#DFD8CB` stone (warmer) — editorial/analytical.
    - `#C7D3DE` pale-blue (cool) — economic/data-driven.
    - Suggests a fourth palette may appear for other topic-types (e.g. energy = green, security = grey, health = white). Our system should support **N approved bg palettes per brand system** — LLM picks one per essay based on topic mood.
- **The cream-yellow accent on the globe** (`~#F5EFCA`) is a new palette accent — distinct from the coral (`#D46A5E`) used on drug-discovery + AI-researchers. Suggests Anthropic uses **different accent hues per carousel** matched to the illustration style. Not just palette-per-topic but full theme-per-topic.
- **NO monospace technical label** on this cover — reinforces that the `technicalLabel` slot is optional and used only when there's an actual data-ID to display. Economic-index carousels use `seriesEyebrow` instead.
- **Anthropic wordmark** is not visible on this slide — either sits above the canvas crop (top-right, standard) OR is omitted on this specific cover. Assume it's present in production.

_Progress: 36 / 85 complete._

---

### claude/image copy 14.png

**Progress-log row:** 37 · claude · image copy 14.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same folder-baseline claude/ chrome.
- **Carousel context:** slide 2 of Carousel 4 (Anthropic Economic Index). Dot indicator = 7 dots, **dot 2 filled**.
- **Full-bleed background:** **warmer cream** `~#F5EFDC` (slightly warmer + more yellow than Carousel 1's `#F5F0E5`). **Not the pale-blue** used on the cover (image 36). **Confirms per-slide palette variation within a single carousel** — Anthropic's covers can use bolder/distinct palette bg from their body slides. Carousel 4 pattern so far: cover = cool pale-blue with hand-drawn hero, body slide = warm cream with prose. This creates rhythmic contrast between cover and body.
- **NEW `bodyLayout` variant: `"prose-only"`** — the entire slide is **serif prose paragraphs**. No embed, no chart, no image, no heading. Just body copy filling the content zone. Different from all prior claude body slides which had a hero image/chart + heading + body paragraph. **Simplest body layout in the aurora-product-body family** — text-only.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Chrome-only top margin (~y 0 → 100):** empty, no eyebrow / kicker / label.
- **Zone B — Full body-copy region (~y 100 → 1220, x 60 → 1000):** three serif paragraphs stacked vertically with ~60 pt paragraph-gap.
    - **Paragraph 1 (~y 100 → 290, wraps 4 lines):**
        > `"To better understand AI's effects on the economy, we conducted an anonymized study of how people use Claude around the world."`
        - Word count: 21. Font: **serif display / serif text** — Fraunces or similar, weight ~500-600 (medium/semibold), ~50-56 pt, dark ink `#1B1B1B`, left-aligned. Line-height ~1.15-1.2 (open, breathing space between lines).
        - **Curly apostrophe** in `AI's`.
    - **Paragraph 2 (~y 330 → 550, wraps 5 lines):**
        > `"Our Usage Index measures whether a region uses Claude more or less than expected based on its population."`
        - Word count: 18. Same serif style, same size.
    - **Paragraph 3 (~y 590 → 680, wraps 2 lines):**
        > `"These findings are based on data from June 26, 2026."`
        - Word count: 10. Same serif, same size. Reads as a **timestamp / provenance note** — signals data currency.
- **Zone C — Chrome:**
    - Side edges (~y 400): white circular nav chevrons `‹` / `›`.
    - Bottom-centre (~y 1290): 7-dot indicator, **dot 2 filled** cream/dark, rest muted.

#### Palette
- `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` — warmer cream used on Carousel 4 body slides. **NEW palette token** — differs from Carousel 1's `BG_WARM_OFFWHITE = #F5F0E5` (which is cooler / paler). Both cream, but Economic Index cream is slightly more yellow-tinged.
- `INK_BLACK = #1B1B1B` (prose colour).

**Palette-role addition:**
| Role | Token | Hex |
|---|---|---|
| `bg-warm-cream-economic` (new — Carousel 4 body slides) | `BG_WARM_CREAM_ECONOMIC` | `~#F5EFDC` |

Note: Anthropic now has 4 approved bg palettes:
1. `BG_WARM_OFFWHITE = #F5F0E5` — Carousel 1 (drug-discovery).
2. `BG_WARM_STONE = #DFD8CB` — Carousels 2, 3 (language-values, AI-researchers).
3. `BG_PALE_BLUE_ECONOMIC = ~#C7D3DE` — Carousel 4 cover.
4. `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` — Carousel 4 body slides.

**Palette-per-slide (not per-carousel) is now the emerging pattern.** Anthropic freely swaps bg palettes within a single carousel based on slide-mood. Our system should support this: `slide.background: { role, hex }` per slide, not per carousel.

#### Typography
- **Body prose (×3):** **serif display face** — Fraunces or Domaine Text, weight ~500 (Medium/Semibold), ~50-56 pt, `#1B1B1B`, left-aligned. Generous line-height ~1.15-1.2.
- **NEW body-typography pattern for the claude/ folder:** prior claude body slides used **sans (Inter Regular ~30 pt)** for body prose. This slide uses **serif ~50-56 pt** — much larger, more editorial. Confirms Carousel 4 has a **different typographic voice** from the other Anthropic carousels — more magazine-like, less scientific-report-like.

**Serif vs sans for body prose:**
- Serif body prose (this slide): editorial, essay-like, contemplative. Slower reading pace, more literary.
- Sans body prose (prior claude slides): technical, marketing, product-focused. Faster scanning, more informational.
- Anthropic uses **serif body prose for context-setting / narrative-building slides** where the reader is meant to slow down and absorb.
- The **font pairing rule extends:** within a single carousel, Anthropic may use:
    - Serif for editorial/narrative slides + Sans for data/chart slides.
    - OR sans throughout for a more scientific/product tone.
    - Carousel 4 chooses the mixed approach — hand-drawn hero on cover (casual), serif prose on context slide (editorial), and likely sans on later data slides (yet to be seen).

#### Iconography / decorative primitives
- **None.** No icons, no illustrations, no charts. Pure typography. This is the **minimalist end of the body-slide spectrum**.
- Chrome only: L/R chevrons + dot indicator.

#### Motion / interaction affordance
- Static. Text is the only content — reader dwells to read.
- The three-paragraph structure creates a **rhythmic reading pace**: `long context → medium definition → short data-provenance`. Descending paragraph length signals "here's what we did, here's the metric, here's the data source" — a **methodology-scoping rhythm**.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "prose-only"` — **NEW 8th confirmed body layout**. Running total:
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34)
7. `stacked-quotes` (35)
8. `prose-only` (37) ← NEW

**Full LLM output contract (image 37 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "prose-only",
  "slideBackground": {
    "role": "warm-cream-economic",
    "hex": "#F5EFDC"
  },
  "prose": {
    "font": "fraunces-medium",
    "sizePt": 54,
    "color": "#1B1B1B",
    "lineHeight": 1.18,
    "align": "left",
    "paragraphs": [
      "To better understand AI's effects on the economy, we conducted an anonymized study of how people use Claude around the world.",
      "Our Usage Index measures whether a region uses Claude more or less than expected based on its population.",
      "These findings are based on data from June 26, 2026."
    ]
  },
  "chrome": {
    "navChevrons": { "showLeft": true, "showRight": true },
    "dotIndicator": { "total": 7, "current": 2 }
  }
}
```

**Renderer / Fabric helpers (new for this variant):**
- `makeProseOnlyBody({ paragraphs, font, sizePt, color, lineHeight, align, paragraphGap, x, y, maxWidth })` — simple stack of paragraph blocks with configurable gap. Reuses `makeMixedWeightText` (image 17) if bold spans are needed within paragraphs.
- No new asset primitives — this is text-only.

**LLM prompt hooks:**
- `bodyLayout: "prose-only"` should be selected for **context-setting / methodology / provenance / disclaimer slides** — where the reader needs to absorb narrative context BEFORE data/findings arrive. Typically slide 2 of a data-heavy carousel (after the cover, before the first chart).
- **Serif vs sans body prose choice:** LLM should pick **serif for narrative/editorial** context and **sans for technical/scientific** context. Rule of thumb: if the topic is exploratory/humanistic, use serif; if it's product/benchmark, use sans.
- **Descending paragraph length rhythm** (long → medium → short) is a rhetorical device for methodology slides. LLM should generate paragraphs in this order: **context (~20 words) → definition of key metric (~15 words) → data timestamp (~10 words)**.
- **Timestamp paragraph** (`"These findings are based on data from [DATE]."`) is a canonical Anthropic device for data currency/credibility. LLM should include it on any slide that reports specific data.

#### IG safe-zone check
- Prose top at y≈100 — inside the 200-px top zone. First line may be partially obscured, but since it's a "warm-up" paragraph (context, not headline), some clipping is acceptable.
- Prose bottom at y≈680 — well above the 1170-px bottom-CTA-overlay zone. **Comfortably within safe zone.** Rare — most claude body slides had tight bottom margins. This slide is short + centred-ish, so it's safe.
- Dot indicator at y≈1290 — inside bottom risk zone (decorative).

#### Reusability score
- **`prose-only` body layout:** 5/5 — universally reusable for any "context-setter" / "methodology" / "chapter-intro" slide. Anywhere the content requires the reader to absorb narrative context without visual distraction.
- **Serif body prose pattern:** 5/5 — a highly reusable "editorial voice" mode. Any brand can use serif prose when they want to signal "slow down and read" (vs sans "scan quickly").
- **Descending paragraph rhythm:** 4/5 — a strong methodology-slide device, but not universal to all prose slides.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "prose-only"`.
- Sits in the **narrative-body-slide subfamily** alongside `single-hero + photograph` (25, 28) — both prioritise emotional/narrative tone over data. Different from the **quantitative-body-slide** subfamily (`stat-comparison`, `spectrum-chart`, `axis-shift-chart`).
- **Simplest body layout to implement** — no primitives beyond text stacking.

#### Copy-pattern hint (LLM writer)
- Paragraph 1 formula: **`"To better understand [topic], we [action-verb] [subject]."`** — sets up the study's purpose. ~15-25 words.
- Paragraph 2 formula: **`"Our [Metric-name] measures [what it measures]."`** — defines the key concept the reader needs to understand. ~10-20 words.
- Paragraph 3 formula: **`"These findings are based on data from [DATE]."`** — data-currency statement. ~8-12 words. **Should always include a specific date** for credibility.
- Voice: **corporate-scientific**, first-person plural (`"we"`), understated confidence, no exclamation.

#### Notes / open questions
- **Serif body prose in a claude/ carousel is a NEW discovery** — prior claude body slides all used Inter Regular (sans) for prose. Carousel 4 (Economic Index) breaks this by using serif — matches the more "editorial newsletter" tone the Economic Index brand implies. Adds evidence that **font-family choice varies per carousel/per-slide based on rhetorical mode**.
- **BG palette variation within one carousel** — Carousel 4's cover (image 36) used pale-blue, but this body slide (image 37) uses cream. Confirms our system should allow `slide.background.role` per slide, not per carousel.
- **The timestamp paragraph (`These findings are based on data from June 26, 2026.`)** — this is a **new canonical Anthropic content pattern**. Every "data study" slide should include a timestamp for scientific credibility. LLM should add this as a standard slot on data slides.
- **Carousel 4 sequence so far:**
    - Slide 1 (cover, image 36): pale-blue bg, hand-drawn hero, headline "How Claude usage varies around the world".
    - Slide 2 (this image): cream bg, serif prose only, context + methodology.
    - Expected slides 3-7: data visualisations, per-region breakdowns, findings, close.
    - The **cover → context-setter → data reveals** rhythm mirrors the drug-discovery essay (Carousel 1's slides 23 → 24 → 26-27). Confirms the Anthropic narrative-arc template is stable across topics.
- **`aurora-product-body` template is now confirmed with 8 body-layout variants.** The template is becoming a **canonical "body-slide framework"** — same chrome, same base structure (bg + chrome + content zone), with the content zone swapping between 8+ layouts. Recommend our system treat `aurora-product-body` as the **primary body-slide builder** for all product-marketing / research-storytelling carousels.

_Progress: 37 / 85 complete._

---

### claude/image copy 15.png

**Progress-log row:** 38 · claude · image copy 15.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same claude/ folder-baseline chrome (L/R circular nav chevrons, bottom dot indicator).
- **Carousel context:** slide 4 of Carousel 4 (Anthropic Economic Index). Dot indicator = 7 dots, **dot 4 filled**. (Slide 3 = image not in our export, likely an intermediate data slide.)
- **Full-bleed background:** `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` — same warm cream as image 37's prose-only slide. **Confirms Carousel 4's body slides use cream consistently**, only the cover uses pale-blue. Pattern: bold bg for cover, neutral bg for body slides.
- **NEW `bodyLayout` variant: `"state-heatmap-grid"`** — the entire content zone is a **US-states cartogram** (a geographic-abstract grid where each US state is represented by a rounded-square tile arranged in a rough map-shape), with a Q&A-style question-heading + colour-legend above and a closing serif-prose finding below. Uses a **mint-green 5-step colour gradient** (`~#DDE8DD` palest → `~#3C6E4F` darkest) to encode a continuous "Usage Index low → high" scale on the tiles.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Question heading (~y 90 → 190, x 60 → 900):** `Which states have the highest usage?` — Inter Bold ~50-56 pt, `#1B1B1B`, left-aligned, 2 lines. Functions as a **direct question to the reader** — sets up curiosity. Distinct from Carousel 3's philosophical question-headlines (image 32); this one is **data-question**, not essay-question. Both use sans-serif Inter Bold — reinforces the rule: **sans for data/product headlines** vs serif for philosophical.
- **Zone B — Colour legend (~y 220 → 260, x 60 → 480):** small legend at top-left showing:
    - Five small rounded-square swatches side-by-side, each ~30 px, from left-to-right in a **5-step mint-green gradient**: pale (`~#DDE8DD`) → light (`~#B8D4B8`) → mid (`~#8FB897`) → medium-dark (`~#5F9772`) → dark (`~#3C6E4F`).
    - Adjacent label: `Usage Index low → high` — Inter Regular ~24 pt, `#1B1B1B`, with a right-arrow glyph `→` (U+2192) separating "low" and "high". **The arrow glyph reappears here as a scale-direction indicator** — different from Carousel 3's "read-more" arrow (image 32's subtitle). Same character, different function.
- **Zone C — US-states cartogram (~y 290 → 1120, x 40 → 1040):** the distinctive new element.
    - **~50 rounded-square tiles** arranged in a rough US-map shape (not a real geographic map — abstract cartogram where each state gets equal-area representation).
    - Tile dimensions: ~90 × 90 px, rounded corners ~18 px, small gap ~10 px between tiles.
    - **Each tile:**
        - Fill: one of the 5 gradient colours (mint-green scale) representing that state's usage index.
        - Text: state's 2-letter abbreviation (e.g. `AK`, `WI`, `CA`, `NY`) — Inter Bold ~24-28 pt, `#1B1B1B` (near-black on all tiles regardless of tile fill). Centred inside the tile.
    - **Layout arrangement (rough US-map cartogram, top-to-bottom):**
        - Row 1 (top edge): `AK` (Alaska, isolated top-left) + `WI` + `VT` + `NH` (northern states)
        - Row 2: `WA` + `ID` + `MT` + `ND` + `MN` + `IL` + `MI` + `NY` + `MA`
        - Row 3: `OR` + `NV` + `WY` + `SD` + `IA` + `IN` + `OH` + `PA` + `NJ` + `CT` + `RI`
        - Row 4: `CA` + `UT` + `CO` + `NE` + `MO` + `KY` + `WV` + `VA` + `DC` + `MD`
        - Row 5: `AZ` + `NM` + `KS` + `AR` + `TN` + `NC` + `SC`
        - Row 6: `OK` + `LA` + `MS` + `AL` + `GA`
        - Row 7: `HI` (Hawaii, isolated bottom-left) + `TX` + `FL`
    - **~50 tiles total** — represents all 50 US states + DC (which is a distinct tile here, marked as the darkest — highest usage).
    - **Colour distribution visible in the cartogram:**
        - **Darkest (highest usage):** `DC` (District of Columbia) — the visual centrepiece, positioned near the top-right of the cartogram, distinctly darker than any state tile. Signals "DC is the standout".
        - **Second-darkest cluster:** `WA`, `NY`, `MA`, `CA` — coastal-elite states.
        - **Medium:** most East Coast + West Coast states.
        - **Palest (lowest usage):** Southern states (`MS`, `AL`, `AR`), some Great Plains (`SD`, `NE`, `WY`).
    - **Cartogram implementation note:** this is a **tile-based approximation of the US map**, not a geographic projection. Each state is a rounded-square, positioned to preserve rough neighbour-relationships (Northeast dense, Southwest sparse, Alaska/Hawaii isolated). Similar to `@nytimes` cartograms or Wikipedia's "tile grid map" template. Highly reusable — could be adapted for other geographic layers (countries, continents, EU regions, Indian states, etc.) with a preset tile-layout dictionary.

- **Zone D — Closing finding paragraph (~y 1140 → 1290, x 60 → 1020):** **serif prose** (same Fraunces Medium ~50 pt as image 37), `#1B1B1B`, left-aligned, wraps 3 lines. Verbatim:
    > `In the US, Washington, D.C. ranked first by a wide margin, followed by California, New York, Washington, and Massachusetts.`
    - Word count: ~19. Functions as a **caption / finding-statement** — tells the reader what the map shows if they don't have time to inspect all tiles.
    - **Repeats serif prose from image 37** — confirms Carousel 4 uses serif consistently for body prose, mixed with sans-heading for Q&A framing.

- **Zone E — Chrome:**
    - Side edges (~y 400): white circular nav chevrons `‹` / `›`, ~50 px diameter.
    - Bottom-centre (~y 1330): 7-dot indicator, dot 4 filled.

#### Palette (extracted, this slide)
- **NEW palette family: 5-step mint-green usage-index scale:**
    - Step 1 (palest, lowest usage): `~#DDE8DD`
    - Step 2 (light): `~#B8D4B8`
    - Step 3 (mid): `~#8FB897`
    - Step 4 (medium-dark): `~#5F9772`
    - Step 5 (darkest, highest usage): `~#3C6E4F`
- Background: `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` (reused from image 37).
- Text: `INK_BLACK = #1B1B1B`.

**Palette-role additions (Anthropic Economic Index carousel):**
| Role | Token | Hex |
|---|---|---|
| `heatmap-scale-1-pale` | `HEATMAP_MINT_1` | `~#DDE8DD` |
| `heatmap-scale-2-light` | `HEATMAP_MINT_2` | `~#B8D4B8` |
| `heatmap-scale-3-mid` | `HEATMAP_MINT_3` | `~#8FB897` |
| `heatmap-scale-4-dark` | `HEATMAP_MINT_4` | `~#5F9772` |
| `heatmap-scale-5-deepest` | `HEATMAP_MINT_5` | `~#3C6E4F` |

**Note:** Anthropic reuses the mint-green family (from Carousel 2's `PILL_MINT_GREEN` palette, images 30-31) but at 5 lightness-steps rather than 2 pill-colours. Confirms Anthropic's design system uses **mint-green as a data-visualisation hue** in addition to its role as a pill-palette pair.

#### Typography
- **Question heading:** Inter Bold ~50-56 pt, `#1B1B1B`, left-aligned, 2 lines. Line-height ~1.15.
- **Legend text:** Inter Regular ~24 pt, `#1B1B1B`, single line with `→` glyph.
- **State abbreviation labels (×50):** Inter Bold ~24-28 pt, `#1B1B1B`, centred inside each tile. Same weight regardless of tile fill (readability preserved by using dark-ink on all tiles, even on darkest tile — sufficient contrast).
- **Closing prose:** Fraunces Medium ~50 pt, `#1B1B1B`, left-aligned. Same as image 37's body prose.

**Mixed serif + sans in one slide** — question-heading + legend + tile-labels all sans (Inter), closing finding is serif (Fraunces). Reinforces the pattern from image 30 (sans intro + serif quote) that Anthropic freely mixes serif and sans within a single slide, with **role-based font choice**: sans = interactive/UI/data, serif = editorial/prose/finding.

#### Iconography / decorative primitives
- **NEW primitive: state-heatmap-grid (US cartogram)** — 50-tile abstract US map with continuous-scale colour encoding.
- **NEW primitive: gradient-scale legend** — 5-swatch horizontal legend with directional arrow.
- Chrome: L/R nav chevrons + dot indicator.

#### Motion / interaction affordance
- Static, but the map is **inspectable** — reader can hunt for their own state, compare regional patterns. This creates **engagement dwell time** — the reader lingers to find their state.
- The **DC-as-darkest** creates a natural "hero moment" — reader eye is drawn to the darkest tile, then reads the closing finding to confirm.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "state-heatmap-grid"` — **NEW 9th confirmed body layout**. Running total:
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34)
7. `stacked-quotes` (35)
8. `prose-only` (37)
9. `state-heatmap-grid` (38) ← NEW

**Full LLM output contract (image 38 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "state-heatmap-grid",
  "slideBackground": {
    "role": "warm-cream-economic",
    "hex": "#F5EFDC"
  },
  "questionHeading": {
    "text": "Which states have the highest usage?",
    "font": "inter-bold",
    "sizePt": 54,
    "lines": 2
  },
  "colorLegend": {
    "steps": ["#DDE8DD", "#B8D4B8", "#8FB897", "#5F9772", "#3C6E4F"],
    "label": "Usage Index low → high",
    "position": "top-left"
  },
  "cartogram": {
    "type": "us-states",
    "tiles": [
      { "code": "AK", "value": 0.35 },
      { "code": "WI", "value": 0.55 },
      { "code": "DC", "value": 1.00 },
      { "code": "CA", "value": 0.85 }
    ],
    "tileSizePx": 90,
    "tileGapPx": 10,
    "tileRadiusPx": 18,
    "colorScale": "mint-5-step",
    "labelFont": "inter-bold",
    "labelSizePt": 26
  },
  "closingFinding": {
    "text": "In the US, Washington, D.C. ranked first by a wide margin, followed by California, New York, Washington, and Massachusetts.",
    "font": "fraunces-medium",
    "sizePt": 50,
    "lines": 3
  },
  "chrome": {
    "navChevrons": true,
    "dotIndicator": { "total": 7, "current": 4 }
  }
}
```

**Renderer / Fabric helpers (new for this variant):**
- `makeStateCartogram({ region: "us" | "eu" | "india" | ..., tiles: Array<{code, value}>, colorScale, tileSize, tileGap, tileRadius, labelFont, labelSize, labelColor })` — the whole heatmap-grid. Requires a **pre-defined tile-layout dictionary** per region (e.g. `US_STATES_TILE_LAYOUT` = 50 `{code, x, y}` positions). Ships as a JSON asset.
- `makeGradientLegend({ steps, label, arrowGlyph, position, size })` — small colour-scale legend with 5 swatches + label + arrow.
- `makeContinuousColorScale({ min, max, steps: 5, palette: "mint" | "coral" | "slate" | ... })` — utility function to map a value ∈ [0, 1] to one of 5 palette steps.
- **Tile-layout dictionaries needed:** for MVP, ship `us-states` only. Later add `eu-countries`, `world-countries`, `india-states`, `uk-counties`, etc. Each is a JSON: `{ [stateCode]: { row, col, x, y } }`.

**LLM prompt hooks:**
- `bodyLayout: "state-heatmap-grid"` should be selected for **geographic-comparison slides** — anywhere data varies by state/country/region and the reader benefits from spatial context.
- **Question-heading + closing-finding structure** is a strong Q&A frame: heading = the question, cartogram = the visual answer, closing = the punchline text. LLM should always pair this template with a question-heading (not a declarative title).
- **Continuous-scale colour encoding** (as opposed to categorical): the LLM's data should be normalised to `[0, 1]` before rendering, then mapped to 5-step palette. Small counts should fall into step-1, extreme outliers into step-5.
- **Standout callouts:** LLM should identify the "hero tile" (highest value) in the closing finding — mention it by name (`Washington, D.C. ranked first`) and give a runner-up list. Turns the map into a **narrative** rather than raw data.

#### IG safe-zone check
- Question heading at y≈90 — inside the top 200-px risk zone. First line may be partially obscured. Recommend lowering to y≥210 in production.
- Cartogram at y≈290–1120 — fully within safe content zone.
- Closing prose ends y≈1290 — inside the 1170-px bottom-CTA-overlay zone. Last line may be clipped. **Moderate risk** — recommend shortening finding to 2 lines OR raising the cartogram 30 px.
- Dot indicator at y≈1330 — deep in bottom risk zone (decorative).

#### Reusability score
- **`state-heatmap-grid` body layout:** 5/5 — extremely reusable for any geographic-data topic. States, countries, EU regions, provinces, market territories, sports leagues, election maps, weather patterns. High-value universal template.
- **5-step continuous colour scale:** 5/5 — reusable for any continuous-value visualisation (heatmaps, saturation charts, gradient legends).
- **Tile-cartogram approach** (vs true geographic projection): 5/5 — much easier to render than a real map (no SVG topology, no projection math), reads clearly, and is arguably more legible than a true map for data-comparison purposes.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "state-heatmap-grid"`.
- Sits in the **quantitative-body-slide** subfamily alongside `stat-comparison`, `spectrum-chart`, `axis-shift-chart`, and `thumbnail-grid`.
- **New composition variant** in the family: `[questionHeading + colorLegend] → [cartogram embed] → [closingFinding]`. Structurally identical to image 30/31 (heading → chart → dots), just with a different embed type. Confirms `aurora-product-body` is fundamentally a **swappable-embed framework**.

#### Copy-pattern hint (LLM writer)
- Question-heading formula: **`"Which [Subject-plural] have the [superlative-adjective] [attribute]?"`** — direct data-question. Examples:
    - `"Which states have the highest usage?"` (this slide)
    - `"Which industries adopted AI fastest?"`
    - `"Which age groups spend the most?"`
- Legend label formula: **`"[Metric-name] [low] → [high]"`** — always with a `→` glyph. LLM should ensure the arrow is present (U+2192, not `->` or `-->`).
- Closing finding formula: **`"[Region-context], [top-1-subject] ranked [rank] by a [magnitude-modifier], followed by [top-2], [top-3], [top-4], and [top-5]."`** — the "top-1 + runners-up" narrative. LLM should always highlight 1 clear winner + 3-5 runners-up.

#### Notes / open questions
- **The `→` glyph does triple duty in Anthropic's design system:**
    1. **End-of-subtitle "continue" cue** on cover slides (image 32's subtitle).
    2. **Scale-direction indicator** in gradient legends (this slide's `low → high`).
    3. **Directional-shift indicator** on axis-shift-chart pills (image 31's `+0.49σ →`).
    - All three uses share the same arrow character but different roles. Our system should recognize this and consistently render `→` where appropriate.
- **Cartogram data quality is critical.** The LLM's data must be **real-value normalised**, not fabricated. If we don't have real usage-by-state data, we shouldn't render this template. Alternative: LLM emits a "topic + hypothetical data" and we render a **demo cartogram** with a disclaimer overlay ("Illustrative data"). Flag as a data-integrity decision.
- **The `→` arrow inside the legend uses the same U+2192 character** as the subtitle-continuation arrow — but at a smaller size and with a different meaning (scale direction, not swipe-forward).
- **Carousel 4 sequence so far (extended):**
    - Slide 1 (cover, image 36): pale-blue bg, hand-drawn hero, headline.
    - Slide 2 (image 37): cream bg, serif prose only, methodology.
    - Slide 3 (unseen, image 38 candidate but this is dot 4): likely a data-summary or top-level stat slide.
    - Slide 4 (this image, image 38): cream bg, US-states cartogram, geographic breakdown.
    - Expected slides 5-7: more data slides + close.
    - Confirms Carousel 4's arc: `cover → methodology → data-summary → geographic-breakdown → [more data] → close`. Data-heavy carousel with clear narrative progression.
- **The mint-green heatmap palette contradicts an earlier note** (image 32's Carousel 3 uses coral). Confirms Anthropic uses **carousel-specific data-visualisation palettes** — mint for economic/regional data, coral for interview/human data, lavender for values-analysis data. Our system should map `topic → palette` explicitly.

_Progress: 38 / 85 complete._

---

### claude/image copy 16.png

**Progress-log row:** 39 · claude · image copy 16.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same claude/ folder-baseline chrome (L/R circular white nav chevrons vertically centred on side edges, dot indicator bottom-centre).
- **Carousel context:** slide 5 of Carousel 4 (Anthropic Economic Index). Dot indicator = 7 dots, **dot 5 filled**.
- **Full-bleed background:** `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` — same warm cream as images 37 and 38. Confirms **Carousel 4 body-slide palette lock**: all Carousel 4 body slides share this warm cream bg, only the cover breaks into pale-blue. Palette-per-slide (not palette-per-carousel), but with a **strong body-slide default** that most slides in a data-carousel adhere to.
- **NEW `bodyLayout` variant: `"stacked-100pct-bar-chart"`** — a grouped 100%-stacked horizontal bar chart. Two group sections ("Most personal use" / "Least personal use"), each with 3 country rows. Each row = country label + horizontal bar with 3 coloured segments summing to 100%. Only the semantically-salient segment (`Personal`) carries an inline % label. Serif closing finding beneath. This is the **10th confirmed body layout** for `aurora-product-body`.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Heading (~y 80 → 190, x 60 → 1000):** `Which countries use Claude most for personal reasons?` — Inter Bold ~48-52 pt, `#1B1B1B`, left-aligned, 2 lines. Question-heading pattern — same rhetorical device as image 38's `Which states have the highest usage?`. Sans-Bold, matching the "sans for data/product headlines" rule. Ends with `?`.
- **Zone B — Categorical legend (~y 210 → 250, x 60 → 500):** 3 pill-swatch + label pairs, horizontally arranged, left-aligned:
    - `[lavender pill] Work` — Inter Regular ~22 pt, `#1B1B1B`.
    - `[forest-green pill] Personal` — same style.
    - `[pale-sage pill] Other` — same style.
    - Pill dimensions: small rounded-pill ~28 × 14 px, `borderRadius = height/2` (fully rounded), each pill filled with the category's canonical colour.
- **Zone C — Group 1 section (~y 290 → 620):**
    - Group label at `~y 290`: `Most personal use` — Inter Bold ~16 pt, `#1B1B1B`, left-aligned, tight. Functions as a small section header above the 3 rows.
    - **3 country rows** stacked vertically at `~y 335, 405, 475`:
        - Row 1: `United States` label + horizontal 100% stacked bar with inline `49.7%` label on the Personal (forest-green) segment.
        - Row 2: `Canada` + `49.6%`.
        - Row 3: `Iceland` + `48.9%`.
- **Zone D — Group 2 section (~y 660 → 990):**
    - Group label: `Least personal use` — same style as Group 1's label.
    - 3 country rows:
        - Row 1: `Tunisia` + `20.5%`.
        - Row 2: `Peru` + `22.0%`.
        - Row 3: `Zimbabwe` + `22.3%`.
- **Zone E — Closing finding (~y 1040 → 1240, x 60 → 1020):** **serif prose** (Fraunces Medium ~34-38 pt, `#1B1B1B`, left-aligned, wraps ~4 lines). Verbatim:
    > `In the US, nearly half of all Claude conversations are personal—the highest share of any country. Tunisia uses Claude the least for personal reasons.`
    - Word count: ~26. Contains an **em-dash `—`** (`personal—the highest`). Repeats the image-37/image-38 pattern of serif closing prose on Carousel 4 body slides. Confirms **serif closing-finding is a slide-level slot** across Carousel 4, promotable into `aurora-product-body` base schema as `optional closingFinding: { text, font: "serif" | "sans" }`.
- **Zone F — Chrome:**
    - Side edges (~y 400): white circular nav chevrons `‹` / `›`.
    - Bottom-centre (~y 1290): 7-dot indicator, **dot 5 filled**.

#### Anatomy of one country row (using US row as reference)
- Row height ~50 px; inter-row gap ~12 px.
- **Left column (~x 60 → 240, ~180 px wide):** country label — Inter Regular ~22 pt, `#1B1B1B`, vertically centred with the bar.
- **Middle column (~x 260 → 880, ~620 px wide):** the horizontal 100% stacked bar itself.
    - **Bar total width fixed** across all 6 rows (all bars share the same total width and y-offset within their row) so segments visually align across countries.
    - Height ~32 px, `borderRadius = 16` (fully rounded pill ends — soft, editorial feel, not hard-edged data-viz).
    - **3 segments** (left → right):
        1. `Work` — lavender fill `CAT_WORK_LAVENDER ≈ #A9AEDC`. Widths vary per country (roughly 30-33%).
        2. `Personal` — forest-green fill `CAT_PERSONAL_FOREST ≈ #3E6B4F`. Width = the country's personal-share %. **Only this segment carries an inline label**: `49.7%` in Inter Bold ~15 pt, white `#FFFFFF`, right-anchored inside the segment.
        3. `Other` — pale sage/lime fill `CAT_OTHER_SAGE ≈ #C7D68A`. Fills the remainder.
    - Segments touch — no gaps between them, unified pill shape with 3 colour bands.
- **Right column (~x 900 → 1020):** empty on rows where the % label fits inside the Personal segment. On rows where Personal is thin (e.g. Tunisia at 20.5%), the label may still fit inside — the bar is wide enough that even a 20% segment is ~124 px wide, enough for a 5-char % label.

#### Palette (extracted, this slide)
- **NEW categorical 3-colour palette for Claude usage segments:**
    - `CAT_WORK_LAVENDER ≈ #A9AEDC` — muted periwinkle/lavender.
    - `CAT_PERSONAL_FOREST ≈ #3E6B4F` — deep forest green. Same family as `HEATMAP_MINT_5` from image 38 (`~#3C6E4F`) but slightly warmer/browner. Sibling but not identical token.
    - `CAT_OTHER_SAGE ≈ #C7D68A` — pale sage/lime.
- Inline % label on bar: `#FFFFFF` (white) on forest-green segment. Sufficient contrast.
- Background: `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` (reused).
- Text: `INK_BLACK = #1B1B1B`.

**Palette-role additions:**
| Role | Token | Hex |
|---|---|---|
| `cat-work-lavender` (new categorical) | `CAT_WORK_LAVENDER` | `~#A9AEDC` |
| `cat-personal-forest` (new categorical) | `CAT_PERSONAL_FOREST` | `~#3E6B4F` |
| `cat-other-sage` (new categorical) | `CAT_OTHER_SAGE` | `~#C7D68A` |

**Note:** Anthropic's Carousel 4 uses **green as the semantic "Claude highlight" colour** — both the heatmap gradient (image 38) and this categorical scale peak on deep-green. Confirms a **carousel-level colour semantic**: `green = the metric of interest` for the Economic Index carousel. Different from Carousel 3's coral-as-highlight (interview quotes).

#### Typography
- **Heading:** Inter Bold ~48-52 pt, `#1B1B1B`, left-aligned, 2 lines, tight leading (~1.15).
- **Legend labels:** Inter Regular ~22 pt, `#1B1B1B`.
- **Group section labels** (`Most personal use`, `Least personal use`): Inter Bold ~16 pt, `#1B1B1B`, regular case (not small-caps).
- **Country row labels:** Inter Regular ~22 pt, `#1B1B1B`.
- **In-bar % values:** Inter Bold ~15 pt, `#FFFFFF`, right-anchored on the Personal segment.
- **Closing finding:** Fraunces Medium ~34-38 pt, `#1B1B1B`, left-aligned, ~4 lines, generous leading (~1.25).

**Mixed serif + sans:** entire chart interface is sans (Inter), closing finding is serif (Fraunces). Same role-based font choice as image 38.

#### Iconography / decorative primitives
- **NEW primitive: stacked-100%-bar-chart row** — one horizontal pill-bar with N coloured segments summing to 100%, only the highlight segment carrying an inline label.
- **Categorical legend with pill swatches** — small rounded-pill swatches + labels.
- **Group-section label** — small bold label above N rows to segment the chart into thematic clusters (`Most X` / `Least X`).
- Chrome: L/R nav chevrons + dot indicator.

#### Motion / interaction affordance
- Static. Two grouped sections invite **within-group + across-group comparison** — reader sees the US/Canada/Iceland trio close in on ~50% personal usage, then Tunisia/Peru/Zimbabwe cluster at ~20%. The **grouped-comparison rhetoric** ("Most X" vs "Least X") does more storytelling than raw ranking would.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "stacked-100pct-bar-chart"` — **NEW 10th confirmed body layout**. Running total:
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34)
7. `stacked-quotes` (35)
8. `prose-only` (37)
9. `state-heatmap-grid` (38)
10. `stacked-100pct-bar-chart` (39) ← NEW

**Full LLM output contract (image 39 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "stacked-100pct-bar-chart",
  "slideBackground": {
    "role": "warm-cream-economic",
    "hex": "#F5EFDC"
  },
  "heading": {
    "text": "Which countries use Claude most for personal reasons?",
    "font": "inter-bold",
    "sizePt": 50,
    "lines": 2
  },
  "categories": [
    { "key": "work",     "label": "Work",     "color": "#A9AEDC" },
    { "key": "personal", "label": "Personal", "color": "#3E6B4F" },
    { "key": "other",    "label": "Other",    "color": "#C7D68A" }
  ],
  "highlightCategory": "personal",
  "groups": [
    {
      "label": "Most personal use",
      "rows": [
        { "label": "United States", "segments": { "work": 32.1, "personal": 49.7, "other": 18.2 } },
        { "label": "Canada",        "segments": { "work": 32.3, "personal": 49.6, "other": 18.1 } },
        { "label": "Iceland",       "segments": { "work": 33.0, "personal": 48.9, "other": 18.1 } }
      ]
    },
    {
      "label": "Least personal use",
      "rows": [
        { "label": "Tunisia",  "segments": { "work": 32.0, "personal": 20.5, "other": 47.5 } },
        { "label": "Peru",     "segments": { "work": 32.0, "personal": 22.0, "other": 46.0 } },
        { "label": "Zimbabwe", "segments": { "work": 30.7, "personal": 22.3, "other": 47.0 } }
      ]
    }
  ],
  "barConfig": {
    "totalWidthPx": 620,
    "heightPx": 32,
    "cornerRadiusPx": 16,
    "inlineLabelOn": "highlight-only",
    "inlineLabelColor": "#FFFFFF",
    "inlineLabelFont": "inter-bold",
    "inlineLabelSizePt": 15
  },
  "closingFinding": {
    "text": "In the US, nearly half of all Claude conversations are personal—the highest share of any country. Tunisia uses Claude the least for personal reasons.",
    "font": "fraunces-medium",
    "sizePt": 36
  },
  "chrome": {
    "navChevrons": true,
    "dotIndicator": { "total": 7, "current": 5 }
  }
}
```

**Renderer / Fabric helpers required (new for this variant):**
- `makeStacked100pctBar({ x, y, totalWidth, height, segments, cornerRadius, inlineLabelOn, inlineLabelStyle })` — the pill-bar primitive. Segments are laid out left-to-right proportional to their % values, filled with per-segment colours. Only segments where `inlineLabelOn` matches carry a right-anchored white label.
- `makeCountryBarRow({ y, label, labelWidth, bar, labelFont, labelSize })` — 2-column row = country label (left) + bar (right).
- `makeCategoricalLegend({ x, y, items: [{swatch, label}], swatchShape: "pill" | "square", gapBetweenItems, itemFont, itemSize })` — reusable horizontal legend. Generalisable across future categorical-data slides.
- `makeChartGroupSection({ label, rows, labelFont, labelSize, groupGap, rowGap, y })` — a small group-header above N rows. Reusable across any "Most X / Least X" grouped comparison.

**LLM prompt hooks:**
- `bodyLayout: "stacked-100pct-bar-chart"` should be selected for **compare-N-entities-across-M-categories** data where the categories sum to 100% (or are naturally proportional). Country-share breakdowns, market-share splits, time-allocation breakdowns, user-segment mixes.
- **Grouped comparison rhetoric:** LLM should prefer **`Most X` / `Least X`** framing (as here) over a single ranked list — creates a stronger narrative than a single top-N list.
- **`highlightCategory`** is a required semantic: LLM must identify the **1 category the slide is really about** (here `Personal`), and only that segment carries the darkest colour + inline label. Supporting categories recede via muted/pale hues + no labels.
- **Number of rows per group:** 3 is optimal (as here). 2 is too sparse, 4+ crowds the slide. LLM should trim to top-3 / bottom-3.
- **Closing finding pattern:** 2-sentence structure — first sentence names the "top" (with a superlative), second sentence names the "bottom". Uses an em-dash `—` for internal emphasis. LLM should always output real em-dash character (U+2014), not `--`.

#### IG safe-zone check
- Heading at y≈80–190 — top inside 200-px avatar-bar risk zone. First line may be partially obscured. Recommend lowering to y≥210 in production.
- Bars + labels safely within y≈290–990 content zone.
- Closing finding ends y≈1240 — inside the 1170-px bottom-CTA-overlay zone. Last line at risk of clipping. **Moderate risk** — recommend trimming to 3 lines OR raising the chart 40 px.
- Dot indicator at y≈1290 — deep in bottom risk zone (decorative).

#### Reusability score
- **`stacked-100pct-bar-chart` body layout:** 5/5 — extremely reusable across any "N entities × M categories summing to 100%" comparison. Market-share, time-use, budget-allocation, demographic mix, industry breakdowns.
- **Grouped `Most X / Least X` rhetoric:** 5/5 — a canonical Anthropic Economic Index device (repeatable across many slides in the same carousel).
- **Categorical pill-swatch legend + `makeCategoricalLegend` helper:** 5/5 — reusable across all categorical-data body layouts.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "stacked-100pct-bar-chart"`.
- Sits in the **quantitative-body-slide** subfamily alongside `stat-comparison` (27), `spectrum-chart` (30), `axis-shift-chart` (31), `thumbnail-grid` (26), `state-heatmap-grid` (38).
- Confirms `aurora-product-body` supports **data-driven "compare-N-entities" layouts** in addition to narrative / quote / heatmap layouts. The template's flexibility keeps growing without needing new top-level template names.

#### Copy-pattern hint (LLM writer)
- Heading formula: **`"Which [Subject-plural] use/have [Object] [most / least / highest / lowest] [for/in [Context]]?"`** — direct data-question, always ending with `?`. Examples:
    - `"Which countries use Claude most for personal reasons?"` (this slide)
    - `"Which industries adopted AI fastest for coding?"`
    - `"Which age groups spend the most on subscriptions?"`
- Group-label formula: **`"Most [attribute]"` / `"Least [attribute]"`** — 2-3 words, matched pair. Sentence case, no punctuation.
- Country/row label formula: standard place/entity name in title case (`United States`, not `USA`; `Iceland`, not `IS`). Full names read more editorial than abbreviations for this template.
- Closing finding formula (image 39 style): **`"In [scope], [top-entity] [action-verb] [rank-superlative][em-dash][detail]. [bottom-entity] [action-verb] [contrast-superlative]."`** — 2 sentences: top-mention + bottom-mention.

#### Notes / open questions
- **Confirms `closingFinding` is a slide-level slot, not bodyLayout-specific.** Images 37 (prose-only), 38 (state-heatmap-grid), and 39 (this slide) all end with a serif closing prose block. Recommend promoting `closingFinding` into the `aurora-product-body` base schema as an **optional slot** available across ALL body layouts, not just the ones seen so far. Layouts that already have prose (like `prose-only` and `pull-quote`) would not use it; layouts that are visual/data-first (`state-heatmap-grid`, `stacked-100pct-bar-chart`) benefit greatly from it.
- **Carousel 4 has a consistent 3-slot rhythm on body slides:** `[question heading (sans-Bold)] → [data visualisation] → [serif closing finding]`. This is a **repeatable per-slide template pattern** that the LLM can generate reliably. Images 38 and 39 both follow it; image 37 (prose-only) is a variant where the whole slide is the "finding" without a visualisation.
- **Green-as-highlight semantic** for Carousel 4 is now confirmed across 2 slides (38 mint heatmap, 39 forest categorical). Anthropic's Economic Index brand identity: **green = the metric of interest**. Should be encoded as a carousel-level palette rule: `Carousel.highlightPaletteFamily: "mint-green"`.
- **`highlightCategory` pattern is broadly useful.** Any categorical-comparison slide (stacked bar, grouped bar, side-by-side bar, pie chart) benefits from designating ONE category as "the point" — that category gets the darkest colour, the inline label, and the closing-finding mention. Supporting categories fade. LLM prompt schema should require `highlightCategory` on all categorical-data layouts.
- **Bar rounded-pill ends (radius = height/2)** is a stylistic choice — softer than hard-edged bars, more editorial. Anthropic's design signature. Our default `barConfig.cornerRadiusPx = height/2` for this template.
- **Carousel 4 sequence so far (extended):**
    - Slide 1 (cover, image 36): pale-blue bg, hand-drawn hero, headline `How Claude usage varies around the world`.
    - Slide 2 (image 37): cream bg, prose-only methodology.
    - Slide 3 (unseen): likely a data-summary or top-level stat slide.
    - Slide 4 (image 38): cream bg, US-states cartogram (`Which states have the highest usage?`).
    - Slide 5 (this image, image 39): cream bg, country-level stacked-100pct bar chart (`Which countries use Claude most for personal reasons?`).
    - Expected slides 6-7: possibly another cut-of-the-data (per-industry? per-age? per-language?) + a summary/close slide.
    - Confirms Carousel 4's arc: `cover → methodology → summary → geographic breakdown → categorical breakdown → [more cuts] → close`. Each body slide reveals a different **cut of the same dataset**, using a different chart type. Beautiful editorial pattern for multi-dimensional data essays.

_Progress: 39 / 85 complete._

---

### claude/image copy 17.png

**Progress-log row:** 40 · claude · image copy 17.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same claude/ folder chrome (L/R circular white nav chevrons, dot indicator bottom-centre).
- **Carousel context:** slide 6 of Carousel 4 (Anthropic Economic Index). Dot indicator = 7 dots, **dot 6 filled**.
- **Full-bleed background:** `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` — 4th consecutive Carousel 4 body slide on this palette. Palette lock is definitive.
- **NEW `bodyLayout` variant: `"treemap"`** — a rectangular **hierarchical treemap** (Voronoi-free, axis-aligned nested rectangles). 5 category cells partition the treemap area, each cell sized proportional to its % share, each filled with a distinct pastel colour. Question heading above, serif closing finding below. This is the **11th confirmed body layout** for `aurora-product-body`.

#### Zones (approximate 1080 × 1350 coords)
- **Zone A — Question heading (~y 80 → 140, x 60 → 900):** `How do Americans use Claude?` — Inter Bold ~44-48 pt, `#1B1B1B`, left-aligned, single line. Question-heading + `?` — same rhetorical device as image 38 (states) and image 39 (countries). Confirms **question-headings are the dominant framing device for Carousel 4 data slides** (3 out of 3 body slides so far use them).

- **Zone B — Treemap embed (~y 180 → 940, x 40 → 1040, ~1000 × 760 px):** the distinctive new element. Rectangular treemap divided into 5 cells with an **asymmetric layout** — one tall cell on the left + a 2×2 grid on the right, with the middle-row-of-right-grid cells rebalanced. Actual visible partition:
    - **Cell 1 — Content creation and copywriting (`20.0%`):** LEFT column, full height (~y 180 → 940, ~330 × 760 px). Fill: **dusty rose / muted mauve** `~#B58C97`. Label inside cell (top-left, ~30 px in from edges): `Content creation and copywriting` — Inter Bold ~20-22 pt, `#1B1B1B`, wraps 2 lines. Below label: `20.0%` — Inter Regular ~18-20 pt, `#1B1B1B`.
    - **Cell 2 — Hobbies and lifestyle (`13.6%`):** TOP-CENTRE (~x 380 → 700, ~y 180 → 570, ~320 × 390 px). Fill: **pale sage/lime** `~#DDE49E`. Same label + % layout inside.
    - **Cell 3 — Research and intelligence (`13.5%`):** TOP-RIGHT (~x 720 → 1040, ~y 180 → 570, ~320 × 390 px). Fill: **muted lavender/periwinkle** `~#B7BEDE`. Same label + %.
    - **Cell 4 — Education and learning (`9.3%`):** BOTTOM-CENTRE (~x 380 → 700, ~y 600 → 940, ~320 × 340 px). Fill: **warm terracotta / clay** `~#C97F5F`. Same label + %.
    - **Cell 5 — Software development (`8.1%`):** BOTTOM-RIGHT (~x 720 → 1040, ~y 600 → 940, ~320 × 340 px). Fill: **muted slate-blue** `~#8EA0C0`. Same label + %.
    - Cells have **~10 px gaps between them** (rounded corners on cells, radius ~14 px). Not squished-together like a strict treemap — more of a "grid of tiles sized proportional to values" (visually softer than a mathematically-accurate treemap; simpler to render). The cells sizes ARE proportional to the %s within their row-groupings (top row Cell 2 & 3 similar size at ~13% each, bottom row Cell 4 & 5 similar at 9-8%, left Cell 1 the largest at 20%).
    - The **treemap here is only 5 categories** — enough to be a simple partition. The 5 sizes clearly encode the hierarchy: 20% ≫ 13-14% ≫ 8-9%. Reader sees the biggest slice instantly.

- **Zone C — Closing finding (~y 970 → 1210, x 60 → 1020):** **serif prose** (Fraunces Medium ~34-38 pt, `#1B1B1B`, left-aligned, wraps ~4 lines). Verbatim:
    > `A fifth of all US conversations are about content creation, followed by hobbies and lifestyle, research, education, and software development.`
    - Word count: ~22. Confirms the **`closingFinding` slot** hypothesis from image 39 — Carousel 4 body slides consistently end with a 2-4-line serif prose statement that names the top category + runners-up.
    - **Rhetorical structure:** `[Superlative for top-category] [+ list of runners-up in descending order]`. Same pattern as image 38 (`Washington DC ranked first... followed by California, New York, ...`).

- **Zone D — Chrome:**
    - Side edges (~y 400): white circular nav chevrons `‹` / `›`.
    - Bottom-centre (~y 1290): 7-dot indicator, **dot 6 filled**.

#### Palette (extracted, this slide)
- **NEW 5-colour categorical palette for the "US usage categories" partition:**
    - `CAT_CONTENT_ROSE ≈ #B58C97` — dusty rose / muted mauve (Content creation).
    - `CAT_HOBBIES_LIME ≈ #DDE49E` — pale sage/lime (Hobbies and lifestyle).
    - `CAT_RESEARCH_LAVENDER ≈ #B7BEDE` — muted lavender (Research and intelligence). Sibling of `PILL_LAVENDER_BLUE_BG = #D3D0F0` from image 30 but slightly darker/more muted.
    - `CAT_EDUCATION_TERRACOTTA ≈ #C97F5F` — warm terracotta / clay (Education). Sibling of `BG_HERO_CORAL = #D46A5E` but slightly warmer/browner.
    - `CAT_SOFTWARE_SLATE ≈ #8EA0C0` — muted slate-blue (Software development).
- Background: `BG_WARM_CREAM_ECONOMIC = ~#F5EFDC` (reused).
- Text: `INK_BLACK = #1B1B1B` (all labels + %s + heading + closing prose).

**Palette-role additions:**
| Role | Token | Hex |
|---|---|---|
| `cat-content-rose` (new categorical) | `CAT_CONTENT_ROSE` | `~#B58C97` |
| `cat-hobbies-lime` (new categorical) | `CAT_HOBBIES_LIME` | `~#DDE49E` |
| `cat-research-lavender` (new categorical) | `CAT_RESEARCH_LAVENDER` | `~#B7BEDE` |
| `cat-education-terracotta` (new categorical) | `CAT_EDUCATION_TERRACOTTA` | `~#C97F5F` |
| `cat-software-slate` (new categorical) | `CAT_SOFTWARE_SLATE` | `~#8EA0C0` |

**Note on palette philosophy:** Carousel 4 now uses **at least 3 distinct categorical palettes**:
- Image 38 (states heatmap): 5-step mint-green **sequential** scale (continuous, 1 hue, 5 lightness steps).
- Image 39 (countries bar): 3 colours **categorical** — lavender + forest + sage. Green is highlight.
- Image 40 (treemap, this slide): 5 colours **categorical** — rose + lime + lavender + terracotta + slate. **All 5 cells are equally-highlighted** — no "highlight vs supporting" split like image 39.
- Confirms: **`highlightCategory` is optional per chart** — some layouts (like this treemap) treat all cells as equal peers; the reader distinguishes by size, not colour. Others (like the stacked-bar in image 39) use colour hierarchy to elevate one segment.
- The 5 chosen hues are **pastel + muted + editorial** — no saturated reds/blues, no dark blacks. Anthropic's design signature is muted-pastel-with-warm-neutrals.

#### Typography
- **Question heading:** Inter Bold ~44-48 pt, `#1B1B1B`, left-aligned, 1 line.
- **In-cell category label:** Inter Bold ~20-22 pt, `#1B1B1B`, left-aligned inside cell, wraps to 2 lines if long. Category name only (no `%`).
- **In-cell percentage:** Inter Regular ~18-20 pt, `#1B1B1B`, below the label with ~10 px gap. Includes `%` suffix (e.g. `20.0%`, `9.3%`).
- **Closing prose:** Fraunces Medium ~34-38 pt, `#1B1B1B`, left-aligned, ~4 lines. Same styling as images 37-39's closing findings.

**Text colour on ALL cells is `#1B1B1B` (dark ink) regardless of cell fill colour.** This is because the 5 fills are all mid-toned pastels — dark ink has sufficient contrast on all 5. This is a **key readability guardrail** for our system: when using pastel cell fills, always use dark ink for labels; never invert to white/light text (which would fail on the pale sage/lime).

#### Iconography / decorative primitives
- **NEW primitive: rectangular treemap (soft-grid variant)** — a set of coloured rectangles arranged in a proportional-size layout, with rounded corners and gaps between cells. Simpler than a strict Voronoi/squarified treemap.
- Chrome: L/R nav chevrons + dot indicator.

#### Motion / interaction affordance
- Static. **Cell sizes tell the ranking story at a glance** — reader instantly sees Content creation dominates. Then eye scans right/down through the smaller cells. Combined with the closing finding text, the slide delivers "the shape of the answer + the narrative sentence" — dual-encoded so both fast-scanners and readers get the point.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "treemap"` — **NEW 11th confirmed body layout**. Running total:
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34)
7. `stacked-quotes` (35)
8. `prose-only` (37)
9. `state-heatmap-grid` (38)
10. `stacked-100pct-bar-chart` (39)
11. `treemap` (40) ← NEW

**Full LLM output contract (image 40 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "treemap",
  "slideBackground": {
    "role": "warm-cream-economic",
    "hex": "#F5EFDC"
  },
  "heading": {
    "text": "How do Americans use Claude?",
    "font": "inter-bold",
    "sizePt": 46,
    "lines": 1
  },
  "treemap": {
    "cells": [
      { "label": "Content creation and copywriting", "value": 20.0, "color": "#B58C97" },
      { "label": "Hobbies and lifestyle",             "value": 13.6, "color": "#DDE49E" },
      { "label": "Research and intelligence",         "value": 13.5, "color": "#B7BEDE" },
      { "label": "Education and learning",            "value": 9.3,  "color": "#C97F5F" },
      { "label": "Software development",              "value": 8.1,  "color": "#8EA0C0" }
    ],
    "layoutAlgorithm": "soft-grid",
    "cellGapPx": 10,
    "cornerRadiusPx": 14,
    "labelFont": "inter-bold",
    "labelSizePt": 22,
    "labelColor": "#1B1B1B",
    "valueFont": "inter-regular",
    "valueSizePt": 20,
    "valueColor": "#1B1B1B",
    "labelPosition": "top-left"
  },
  "closingFinding": {
    "text": "A fifth of all US conversations are about content creation, followed by hobbies and lifestyle, research, education, and software development.",
    "font": "fraunces-medium",
    "sizePt": 36
  },
  "chrome": {
    "navChevrons": true,
    "dotIndicator": { "total": 7, "current": 6 }
  }
}
```

**Renderer / Fabric helpers required (new for this variant):**
- `makeTreemap({ x, y, width, height, cells, layoutAlgorithm, cellGap, cornerRadius, labelStyle, valuePosition })` — the treemap primitive. `layoutAlgorithm` options:
    - `"soft-grid"` (this slide) — hand-tuned rectangular partition. Simpler; needs a JSON `layoutPreset` per cell count (5-cell, 4-cell, 6-cell, etc.).
    - `"squarified"` — algorithmic treemap (D3-style). More flexible; renders any N cells with any values.
    - Recommend soft-grid presets for MVP (matches Anthropic's editorial feel), squarified as advanced option.
- `makeTreemapCell({ x, y, width, height, fill, cornerRadius, label, value, labelFont, labelSize, labelColor, valueFont, valueSize })` — one cell primitive.

**LLM prompt hooks:**
- `bodyLayout: "treemap"` should be selected for **categorical share-of-total data with 3-8 categories** where the reader benefits from seeing relative sizes visually. Market share, time allocation, subject distribution, spending breakdown.
- **Cell count sweet spot:** 5 (as here). 3-4 cells feel sparse, 6-8 need careful label truncation, 9+ overwhelm the reader.
- **Colour assignment:** LLM should not pick colours randomly. Use a **carousel-locked categorical palette** — Anthropic reuses the same 5-colour palette (rose, lime, lavender, terracotta, slate) across treemap slides. Cell colour should be **stable per category** (Content creation is always rose, Software is always slate) so the reader can build mental colour-associations across the essay.
- **All-caps or title case:** category labels are Title Case here (`Content creation and copywriting`, not `CONTENT CREATION`). Softer, editorial.
- **Cell label decoration:** just label + `%` — no icons, no emojis, no explanatory text. Trust the cell size + colour to do the visual work.

#### IG safe-zone check
- Heading at y≈80–140 — top inside 200-px avatar-bar risk zone. Recommend production adaptation lower to y≥210.
- Treemap cells at y≈180–940 — fully in safe zone.
- Closing prose ends y≈1210 — inside the 1170-px bottom-CTA-overlay zone. Last line at risk of clipping. **Moderate risk** — recommend trimming to 3 lines OR raising the treemap 40 px.
- Dot indicator at y≈1290 — deep in bottom risk zone (decorative).

#### Reusability score
- **`treemap` body layout:** 5/5 — one of the most universally-applicable data visualisations. Applies to any share-of-total question: market share, budget, time-use, category mix, portfolio composition, demographic breakdown, industry breakdown. High-value template.
- **5-colour muted-pastel categorical palette:** 5/5 — reusable across all `aurora-product-body` data layouts where categories need distinct-but-equal colours. Not just for treemaps.
- **Soft-grid treemap layout** (vs strict Voronoi): 4/5 — easier to render, softer editorial feel, but limited to preset layouts per cell count. Trade-off is favourable for a template system.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "treemap"`.
- Sits in the **quantitative-body-slide** subfamily. Now 6 confirmed quantitative variants (stat-comparison, spectrum-chart, axis-shift-chart, thumbnail-grid, state-heatmap-grid, stacked-100pct-bar-chart, treemap).
- **Companion to `stacked-100pct-bar-chart`** — both encode share-of-total data. Choose:
    - `treemap` when you have 3-6 categories and want a single-slide "overview" visualisation.
    - `stacked-100pct-bar-chart` when you have 2-5 categories that repeat across N entities (countries, regions, etc.) — bar chart lets the reader compare across entities.

#### Copy-pattern hint (LLM writer)
- Heading formula: **`"How do [Subject-plural] [action-verb] [Object]?"`** — direct question about behaviour. Variant of image 39's `"Which [Subject-plural] [verb] [Object] [most/least]?"`. Related sibling formulas:
    - `"How do Americans use Claude?"` (this slide)
    - `"How do developers spend their time?"`
    - `"How do teams allocate their budget?"`
- Closing finding formula: **`"A [fraction/superlative] of [scope] are [top-category], followed by [runner-up-1], [runner-up-2], ..., and [smallest]."`** — one sentence, names top-category first, then descending list. Uses "followed by" as the connector. Adopted from image 38's "ranked first ... followed by ..." pattern.
- Category labels: **descriptive noun phrases** (2-4 words), Title Case, joined by `and` if needed (`Content creation and copywriting`, `Hobbies and lifestyle`, `Education and learning`). Not single-word categories.

#### Notes / open questions
- **Anthropic's 5-colour muted-pastel palette is worth cataloguing as a first-class token set.** Suggest naming: `LUMINA_ANTHROPIC.categoricalPalette.pastel5 = [rose, lime, lavender, terracotta, slate]`. This palette can be reused across:
    - Treemap cells (this slide).
    - Categorical bar segments.
    - Pie/donut slices.
    - Grouped-comparison groups.
    - Any 5-category data-viz.
- **Cell-label placement (top-left corner of cell)** is a Tufte-inspired choice — keeps the label within the cell boundary, avoids external label lines/leaders. Recommend our `makeTreemapCell` supports `labelPosition: "top-left" | "top-centre" | "centre" | "bottom-left"` — default top-left as here.
- **Colour-per-category is stable across the carousel** — I predict image 41 or 42 will reuse Content = rose, Software = slate, etc., IF the same categories appear again. This is a **carousel-level palette lock** that reinforces reader recognition. Our LLM should track category-to-colour mappings within a carousel and reuse consistently.
- **The treemap here does NOT use a `highlightCategory`.** All 5 cells are equal peers (colour-wise), and hierarchy is encoded ONLY by size. Different from image 39's stacked-bar which used one dark colour for the Personal segment. Confirms that **`highlightCategory` is optional per layout** — for treemaps, size alone tells the story; for stacked bars, size + colour together tell it.
- **Carousel 4 sequence (extended, 6/7 slides seen):**
    - Slide 1 (cover): pale-blue bg, hand-drawn hero, `How Claude usage varies around the world`.
    - Slide 2: cream bg, prose-only methodology.
    - Slide 3 (unseen): likely top-line summary stat.
    - Slide 4: US-states cartogram (`Which states have the highest usage?`).
    - Slide 5: country-level stacked-100pct bar (`Which countries use Claude most for personal reasons?`).
    - Slide 6 (this image): treemap (`How do Americans use Claude?`) — task-category breakdown.
    - Slide 7 (expected): summary/close slide with citations, methodology reprise, or an aggregate stat.
    - Confirms: Carousel 4 is a **7-slide data essay** using 4 different chart layouts (heatmap, bar, treemap, + prose) — each slide reveals a different cut of the dataset. Beautiful editorial pattern.

_Progress: 40 / 85 complete._

---

### claude/image copy 18.png

**Progress-log row:** 41 · claude · image copy 18.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same claude/ folder chrome (R circular white nav chevron; a Reel-mute speaker icon appears bottom-right; dot indicator bottom-centre).
- **Carousel context:** **COVER of a NEW carousel (Carousel 5)** in the claude/ folder. Dot indicator = **7 dots, dot 1 filled**. Definitively opens a new essay — new topic (`"How does AI work?" — hard questions series`), new hero style.
- **Full-bleed background:** warm cream, closer to `BG_WARM_OFFWHITE = ~#F5F0E5` (Carousel 1's palette) than to the Economic Index cream. Anthropic here **reuses the Carousel 1 pale-warm-cream palette**, confirming palettes are cross-carousel-reusable within the brand system.
- **NEW `heroType` variant for `aurora-product-cover`: `"connected-mood-board"`** — the hero is NOT one image; it's a **cluster of ~10 small varied illustrations/artefacts arranged around the central text**, all **connected by thin hairline lines** like a mind-map or knowledge-graph. Each image is a distinct **visual metaphor** for a specific research theme, and the connecting lines communicate "these are all threads of one body of work". A **new hero primitive** — different from `3d-render` (single hero), `typography-art` (single composition), `portrait-strip` (photo grid), `hand-drawn-illustration` (single marker drawing).
- This is the **5th confirmed heroType** for `aurora-product-cover`.

#### Zones (approximate 1080 × 1350 coords)

- **Zone A — Top mood-board cluster (~y 60 → 320):** 4-5 small assorted images clustered in the upper half of the canvas:
    - A **pixelated / mosaic collage** panel (~200 × 130 px) at top-centre (~x 190 → 380, y 60 → 190) — pixel-art squares in muted blues, browns, cream, green.
    - A **B&W hedcut/engraving of a brain** on a **pale-pink card** (~150 × 200 px) at left (~x 60 → 210, y 175 → 375).
    - A **green pixel-grid + 3D isometric cube** panel (~180 × 155 px, split composition: left half is a green grid with a small dark dot, right half is white 3D cubes) at (~x 240 → 420, y 195 → 350).
    - A **photograph of a bread loaf slice** (~155 × 155 px) at (~x 380 → 535, y 155 → 310).
    - A **pale-green minimalist print** (small dark objects on green ground, ~150 × 175 px) at right (~x 500 → 650, y 175 → 350).

- **Zone B — Central text block (~y 320 → 640, centred x):**
    - **Kicker eyebrow** (~y 320): `Our work on the hard questions` — Inter Regular ~22-24 pt, `#1B1B1B`, **centred**, single line. Small, understated.
    - **Big serif display headline** (~y 355 → 490): `"How does AI work?"` — **serif Bold** (Fraunces Bold or similar), ~110-120 pt, `#1B1B1B`, **centred**, single line. **Wrapped in curly quotes** (`"..."`) — treating the question itself as a quoted phrase, an editorial device that signals "this is THE question we're answering". Very distinctive.
    - **Body paragraph** (~y 510 → 640): Inter Regular ~26-28 pt, `#1B1B1B`, **centred**, ~4 lines. Verbatim:
        > `As AI reshapes our daily lives, it raises hard questions that deserve transparent answers. This is a selection of our research, policy commitments, and thinking so far.`
        - Word count: ~28. Sets up the carousel as a **portfolio / anthology / index** of Anthropic's work on AI-transparency questions. Different rhetorical mode from prior claude carousels (which were single-topic essays).

- **Zone C — Bottom mood-board cluster (~y 620 → 950):** 5-6 more small assorted images clustered in the lower half:
    - A **Grecian urn / vase** on a **pale-green card** (~145 × 190 px) at left (~x 60 → 210, y 630 → 820).
    - A **B&W diagonal-grid architectural photo** (~155 × 205 px) at (~x 165 → 330, y 750 → 955).
    - A **dial / sun-ray drawing on a warm-yellow bg** (~155 × 155 px) at (~x 275 → 430, y 700 → 855).
    - A **molecular / connected-balls illustration** (colourful balloons on strings on a pale-pink card, ~200 × 130 px) at centre-right (~x 400 → 600, y 640 → 770).
    - A **soft rainbow-gradient blur / lens flare** panel (~150 × 175 px) at (~x 400 → 550, y 720 → 895).
    - A **golden key on a pale-pink card** (~145 × 175 px) at right (~x 585 → 730, y 640 → 815).

- **Zone D — Hairline connector lines (over Zones A + C):** thin **~1-1.5 px** black-or-dark-grey lines connecting the small images in a **knowledge-graph pattern**. Each image node connects to 2-4 neighbours via straight or slightly-angled lines. Lines pass BEHIND the images (z-order: lines → images → text) so they read as "linking threads" beneath the artefact cluster. Colour: `~#8A857B` (muted warm grey) or `#1B1B1B` at very low weight. Line-count: ~15-20 total connections visible across the composition.

- **Zone E — Chrome:**
    - Right edge (~y 545, x 600): white circular chevron `›`, ~50 px diameter. R only (slide 1).
    - Bottom-right (~y 950, x 585): **dark rounded-square icon with a muted-speaker glyph** (speaker with slash). Suggests this slide has an associated audio/video component OR the slide is a **Reel cover with a muted audio state**. Reel-mute icon = `~55 × 55 px`, dark bg `#2A2A2A`, white icon glyph. **NEW chrome primitive** — first Reel-mute indicator seen in claude/ folder.
    - Bottom-centre (~y 1000): 7-dot indicator, **dot 1 filled**.

#### Palette (extracted, this slide)
- Background: `BG_WARM_OFFWHITE = ~#F5F0E5` (reused from Carousel 1).
- Text: `INK_BLACK = #1B1B1B` (kicker + heading + body).
- Line connectors: `~#8A857B` (muted warm grey) OR `#1B1B1B` at ~30-40% opacity — hairline weight makes exact colour hard to determine.
- Small image swatches vary widely (pink, green, yellow, cream card backgrounds), but the **collage effect** is unified by consistent **card sizes + muted saturation + hairline connections**.

**Palette-role additions:**
| Role | Token | Hex |
|---|---|---|
| `connector-line-hairline` (new) | `CONNECTOR_HAIRLINE` | `~#8A857B` (or #1B1B1B @ 35%) |

**Note:** the small "cards" inside the mood-board each have their own bg colour (pink, green, yellow, cream) — these are **art-directed per artefact**, not palette-tokenised. Recommend our system treat each card as an **asset with baked-in bg colour**, not as procedurally-tinted content.

#### Typography
- **Kicker eyebrow:** Inter Regular ~22-24 pt, `#1B1B1B`, **centred**, single line. First seen use of `seriesEyebrow`-style label CENTRED (image 36 was left-aligned). Position varies by cover composition.
- **Big serif headline (with curly quotes):** Fraunces Bold (or similar) ~115 pt, `#1B1B1B`, **centred**, single line. Reader immediately parses "this is a quoted question the essay will answer". **The curly-quote wrapping is the key device** — makes the headline read like an epigraph or research question, not a title.
- **Centred body paragraph:** Inter Regular ~26-28 pt, `#1B1B1B`, **centred**, 4 lines. Line-height ~1.4. Centred alignment is new for claude/ body copy (prior slides were left-aligned) — matches the centred cover composition.

**Centred typography = "mood-board / editorial cover" composition.** Left-aligned = "product-marketing cover" (like image 23). Two distinct cover-typography modes for `aurora-product-cover`. Our LLM should choose alignment based on `heroType`: mood-board / typography-art / portrait-strip → centred; 3d-render / hand-drawn-illustration → left-aligned diagonal composition.

#### Iconography / decorative primitives
- **NEW primitive: mood-board with connector lines** — a cluster of N small varied images + hairline lines linking neighbouring images.
- **NEW primitive: Reel-mute icon** (dark rounded-square with speaker+slash glyph). **First Reel-format chrome in the claude/ folder** — suggests this cover is repurposed for a Reel/video-format post, not just a static carousel. Anthropic may publish the same content in both static (carousel) and animated (Reel) formats.
- **Small card artefacts** (10+): each is a distinct visual metaphor — brain (research), pixel grid (data/algorithms), bread (everyday life), urn (culture/history), key (unlocking), gradient (colour/AI-art), molecules (chemistry/models), architectural grid (structure), sun-dial (time/philosophy), etc. Each card ~150 × 175 px, some with soft coloured backgrounds (pink, green, yellow).
- Chrome: R chevron + Reel-mute icon + dot indicator.

#### Motion / interaction affordance
- Static, but the **connector lines create implied motion** — reader's eye follows the lines from one artefact to the next, tracing an "exploration path" through the mood-board. Like scanning a Pinterest board where the pins are linked by threads.
- The centred question (in quotes) sits at the visual + rhetorical anchor. Reader eye = mood-board → question → body → mood-board (down) → chevron/mute → dot indicator.
- The Reel-mute icon strongly suggests this cover is **also being published as a Reel** — Anthropic likely animates the mood-board (each artefact fades in, connector lines draw) to make an intro animation for the video version.

#### Template family & LLM prompt structure

**Template:** `aurora-product-cover` with `heroType: "connected-mood-board"` — **NEW 5th confirmed heroType**. Running total:
1. `3d-render` (image 23)
2. `typography-art` (image 29)
3. `portrait-strip` + `sandwich` subVariant (image 32)
4. `hand-drawn-illustration` (image 36)
5. `connected-mood-board` (image 41) ← NEW

**Full LLM output contract (image 41 exemplar):**
```json
{
  "template": "aurora-product-cover",
  "heroType": "connected-mood-board",
  "slideBackground": {
    "role": "warm-offwhite",
    "hex": "#F5F0E5"
  },
  "moodBoard": {
    "artefacts": [
      { "id": "pixel-collage", "url": "…", "position": { "x": 280, "y": 125 }, "size": { "w": 200, "h": 130 } },
      { "id": "brain-hedcut", "url": "…", "cardBg": "#F5DDE0", "position": { "x": 130, "y": 275 }, "size": { "w": 150, "h": 200 } },
      { "id": "green-pixel-grid", "url": "…", "position": { "x": 330, "y": 275 }, "size": { "w": 180, "h": 155 } },
      { "id": "bread-slice", "url": "…", "position": { "x": 460, "y": 235 }, "size": { "w": 155, "h": 155 } },
      { "id": "green-print", "url": "…", "cardBg": "#DDEACF", "position": { "x": 575, "y": 265 }, "size": { "w": 150, "h": 175 } },
      { "id": "grecian-urn", "url": "…", "cardBg": "#B8CDA6", "position": { "x": 135, "y": 725 }, "size": { "w": 145, "h": 190 } },
      { "id": "arch-grid-bw", "url": "…", "position": { "x": 250, "y": 855 }, "size": { "w": 155, "h": 205 } },
      { "id": "sun-dial-yellow", "url": "…", "cardBg": "#F5E4A8", "position": { "x": 355, "y": 780 }, "size": { "w": 155, "h": 155 } },
      { "id": "molecules-balloons", "url": "…", "cardBg": "#F5DDE0", "position": { "x": 500, "y": 705 }, "size": { "w": 200, "h": 130 } },
      { "id": "rainbow-gradient", "url": "…", "position": { "x": 475, "y": 810 }, "size": { "w": 150, "h": 175 } },
      { "id": "golden-key", "url": "…", "cardBg": "#F5DDE0", "position": { "x": 660, "y": 725 }, "size": { "w": 145, "h": 175 } }
    ],
    "connectors": [
      { "from": "brain-hedcut", "to": "pixel-collage" },
      { "from": "pixel-collage", "to": "green-pixel-grid" },
      { "from": "green-pixel-grid", "to": "bread-slice" },
      { "from": "bread-slice", "to": "green-print" },
      { "from": "grecian-urn", "to": "arch-grid-bw" },
      { "from": "sun-dial-yellow", "to": "molecules-balloons" },
      { "from": "molecules-balloons", "to": "rainbow-gradient" },
      { "from": "rainbow-gradient", "to": "golden-key" }
    ],
    "connectorStyle": {
      "stroke": "#8A857B",
      "strokeWidth": 1.5,
      "strokeDashArray": null
    }
  },
  "kicker": "Our work on the hard questions",
  "displayHeadline": {
    "text": "How does AI work?",
    "font": "fraunces-bold",
    "sizePt": 115,
    "align": "centre",
    "wrapInCurlyQuotes": true
  },
  "body": {
    "text": "As AI reshapes our daily lives, it raises hard questions that deserve transparent answers. This is a selection of our research, policy commitments, and thinking so far.",
    "font": "inter-regular",
    "sizePt": 27,
    "align": "centre",
    "lines": 4
  },
  "chrome": {
    "navChevrons": { "showLeft": false, "showRight": true },
    "reelMuteIcon": true,
    "dotIndicator": { "total": 7, "current": 1 }
  }
}
```

**Renderer / Fabric helpers required (new for this variant):**
- `makeMoodBoard({ artefacts, connectors, connectorStyle, x, y, width, height })` — full builder. Places N image cards at specified positions, then draws hairline connector lines BEHIND them.
- `makeArtefactCard({ url, cardBg, position, size, cornerRadius, dropShadow })` — one image card, optionally with a coloured card-bg tint behind the image (like a sticker background). Cards without `cardBg` are transparent-backgrounded photos.
- `makeConnectorLine({ from, to, stroke, strokeWidth, strokeDashArray, artefactRegistry })` — draws a hairline line from centre-of-artefact-A to centre-of-artefact-B, optionally with dash pattern. Takes an `artefactRegistry` so the line can auto-anchor to card boundaries.
- `makeReelMuteIcon({ x, y, size, bgColor, iconColor })` — Reel-format mute indicator. Small dark rounded-square with white speaker-slash icon.

**LLM prompt hooks:**
- `heroType: "connected-mood-board"` should be selected when the carousel is a **portfolio / anthology / index post** — showcasing multiple pieces of work (research papers, product features, policy statements, projects) under one thematic umbrella. NOT for single-topic essays (use `3d-render` or `hand-drawn-illustration`).
- **Artefact count:** 8-12 works well at 1080×1350. Fewer feels sparse; more crowds the connector graph.
- **Wrapping the headline in curly quotes** signals "this is the question our body of work addresses". LLM should include `wrapInCurlyQuotes: true` when the headline is phrased as a research question.
- **Kicker + centred display + centred body = "portfolio cover" typography mode.** LLM should choose:
    - `align: "centre"` for `heroType: "connected-mood-board" | "typography-art" | "portrait-strip"` — symmetric, editorial covers.
    - `align: "left"` for `heroType: "3d-render" | "hand-drawn-illustration"` — diagonal, product-marketing covers.
- **Artefact assets are stylistically diverse but curated:** varied mediums (etching, photo, illustration, gradient, sculpture) but muted-pastel saturation and matching card sizes. LLM should NOT try to make artefacts stylistically uniform — the point is a "cabinet of curiosities" feel where each artefact reflects a different piece of work.

#### IG safe-zone check
- Top mood-board cluster at y≈60–320 — top edge inside 200-px avatar-bar risk zone. Some artefacts may be partially obscured, but this is decorative + the cluster still reads even if the top ~20 % is clipped.
- Central kicker + heading at y≈320–490 — safely below the top risk zone.
- Body at y≈510–640 — safe.
- Bottom mood-board cluster at y≈620–955 — top half safe, bottom edge approaches 1000. Reel-mute icon at y≈950 is near the 1170-px bottom risk boundary but well-clear.
- Dot indicator at y≈1000 — safe with plenty of margin (unusually — most claude slides have dot indicators at y≈1290+).
- **Overall safe-zone health:** better than most claude slides. Layout is compact within the safe zone.

#### Reusability score
- **`connected-mood-board` heroType:** 5/5 — one of the most distinctive covers seen so far in the reference set. Extremely reusable for **portfolio posts** (design agency work, research anthologies, feature roundups, "year in review" posts, product line-up covers).
- **Centred cover typography mode:** 5/5 — universally applicable for editorial / anthology covers.
- **Curly-quote-wrapped headlines:** 4/5 — a specific device useful when the essay is framed as answering a specific question. Not universal.

#### Template pattern classification (final)
- **`aurora-product-cover`** with `heroType: "connected-mood-board"`, `headline.wrapInCurlyQuotes: boolean`, `alignmentMode: "centred"`.
- Extended cover-slide framework now supports 5 heroTypes. Same chrome + palette + text-slot base, with the hero slot swapping between:
    1. Single 3D render (right-anchored)
    2. Typography composition (single asset)
    3. Portrait strip (2 rows of 3 photos)
    4. Single hand-drawn illustration
    5. Connected mood-board (cluster of N artefacts with connector lines)

#### Copy-pattern hint (LLM writer)
- Kicker formula: **`"Our [work / research / thinking] on [topic-domain]"`** or **`"[Brand] [format]: [theme]"`**. 4-6 words. Understated, sets context. Examples:
    - `"Our work on the hard questions"` (this slide)
    - `"Our research on human-AI collaboration"`
    - `"Anthropic Weekly: policy edition"`
- Curly-quote-wrapped headline formula: **`"How does [Subject] [verb]?"`** or **`"What if [premise]?"`** — a research question the reader would naturally ask, quoted as an epigraph. 3-6 words inside quotes. Examples:
    - `"How does AI work?"` (this slide)
    - `"What makes a good decision?"`
    - `"Why do models hallucinate?"`
- Body formula: **`"As [Subject] [action-verb] [scope], it [raises / demands / creates] [property]. This is [a curated collection of] our [work-types] so far."`** — 20-40 words, sets up the essay as an anthology, ends with `so far` (implying ongoing work). Voice: **essayistic-corporate**, first-person plural, understated confidence.

#### Notes / open questions
- **Carousel 5 launches here.** claude/ folder now confirmed at 5 carousels (5 more slides remaining after this: images 42–47). Given 6 remaining slides (41–47 = 7 total for Carousel 5's dot count), the 5th essay likely spans slides 41–47 as a 7-slide anthology. Would leave 0 slides for a 6th carousel — so **the claude/ folder is exactly 5 carousels: drug-discovery (6), language-values (3-seen), AI-researchers (4), economic-index (7), and this new anthology (7)**. Total: 27 slides tracked, roughly matches the 25 in the folder (allowing for missing slides in essays 2 & 3).
- **The Reel-mute icon** is a signal that Anthropic publishes covers in **both static AND animated formats**. Our system might eventually need to support "generate a Reel-cover companion" for any carousel-cover slide — a whole animation pipeline. **Flag for future / not-MVP.**
- **The mood-board layout is genuinely hard to reproduce** — it requires:
    1. A curated library of ~10-15 diverse "artefact" images (photos, illustrations, gradients, engravings, etc.) matching the essay's themes.
    2. Hand-tuned positions for each artefact (or an algorithmic layout that avoids overlaps).
    3. Meaningful connector-line choices (which artefacts are semantically linked).
    - For MVP, recommend supplying a **preset mood-board template** with 8-10 stock artefact positions + connector patterns, and the user chooses artefact URLs (or lets AI-image-gen fill each slot with topic-related visuals).
    - Longer-term: an interactive UI where the user drags artefacts into positions and draws connector lines. Very high polish, out of scope for early phases.
- **The curly-quote-wrapped headline is the most distinctive rhetorical device** on this slide. Reader's eye lands on it first, and it immediately signals "this carousel is answering a specific question". A powerful hook — worth building explicit LLM support for.
- **All 5 claude/ heroTypes so far map to different content genres:**
    - `3d-render` → product features / scientific tools.
    - `typography-art` → conceptual / abstract essays.
    - `portrait-strip` → interview / panel / human-focused.
    - `hand-drawn-illustration` → curious / exploratory / data-driven.
    - `connected-mood-board` → portfolio / anthology / question-driven.
    - Our LLM should surface heroType as an early carousel-planning decision, driven by the topic's genre.
- **Cover slide with Reel-mute icon** is unusual — I predict Carousel 5's cover exists in TWO published formats: (1) static IG carousel with just a regular dot indicator (no mute icon), and (2) Reel version with the mute icon. The reference we have is the Reel export. Our system might want to generate BOTH formats from one composition.

_Progress: 41 / 85 complete._

---

### claude/image copy 19.png

**Progress-log row:** 42 · claude · image copy 19.png

#### Composition & structure
- **Canvas:** 1080 × 1350. Same claude/ folder chrome (L/R circular white nav chevrons, dot indicator bottom-centre).
- **Carousel context:** slide 2 of Carousel 5 (anthology carousel, "How does AI work?"). Dot indicator = 7 dots, **dot 2 filled**.
- **Full-bleed background:** `BG_WARM_OFFWHITE = ~#F5F0E5` (reused from cover). Confirms Carousel 5 palette lock — pale-warm-cream for both cover AND body slides. Different from Carousel 4's pattern (bold cover / neutral body).
- **NEW `bodyLayout` variant: `"article-reference-card"`** — the entire slide is one "card" representing a linked research article / policy statement / paper. Structure:
    1. **Hero image** at the top — a specific artefact reused from the mood-board cover (image 41). Enlarged to full body width.
    2. **Timestamp / dateline** below hero (`MARCH 8, 2023` — small caps sans).
    3. **Serif article title** (2 lines, Fraunces Bold, left-aligned).
    4. **Serif body summary paragraph** (Fraunces Regular, ~5 lines, left-aligned).
- The whole slide reads as a **magazine-style article preview card** — like clicking through a table-of-contents item. Perfect for a "portfolio anthology" carousel where each slide showcases one item from the body of work.
- This is the **12th confirmed body layout** for `aurora-product-body`.

#### Zones (approximate 1080 × 1350 coords)

- **Zone A — Hero image (~y 145 → 385, x 100 → 555):** rectangular image occupying the top ~30% of the content zone. Content: a **pixel-collage / mosaic** artwork of a **cloudy sky painted in an old-master style, overlaid with a scattered rectangle-grid** in muted blues (`~#A8B5D0`), pale-grey-blues (`~#D8E0EA`), and warm-browns (`~#8A6B54`). The rectangles are aligned to a hidden grid and cover ~40% of the sky-painting, creating a **glitched-classical** aesthetic — old + new, meaning + form.
    - **NOTABLE:** this artwork is the SAME as the top-centre "pixel-collage" artefact from the mood-board on the cover (image 41)! Reader immediately recognises it — the cover's mood-board is being **unpacked**, one artefact at a time, across the carousel. Confirms this is an **anthology carousel** where the cover's mood-board previews the slides, and each interior slide zooms into one artefact.
    - Image dimensions: ~455 × 240 px. Rounded corners: none (sharp corners) or very slight ~4-6 px radius. Positioned with ~100 px left margin.
    - No card frame or bg tint — image sits directly on the cream slide bg.

- **Zone B — Timestamp / dateline (~y 425 → 445, x 100):** `MARCH 8, 2023` — Inter (or JetBrains Mono?) **small-caps or all-caps sans**, ~18-20 pt, colour `INK_MUTED_STONE ≈ #7A756A` (muted warm grey), letter-spacing slightly tracked (~0.08 em). Left-aligned. Single line.
    - Signals article publication date. Editorial / journalistic device. Not seen in prior claude/ slides.

- **Zone C — Serif article title (~y 475 → 610, x 100 → 620):** `Core views on AI safety: When, why, what, and how` — **Fraunces Bold** (or Playfair Display Bold), ~54-58 pt, `#1B1B1B`, **Title Case** (not all-caps, not sentence case), left-aligned, wraps 2 lines.
    - Line 1: `Core views on AI safety:` — with **trailing colon** (title:subtitle structure).
    - Line 2: `When, why, what, and how` — the subtitle, still same size/weight (not smaller).
    - **NEW typography pattern:** article title uses `Title Case` (every content word capitalised except articles/prepositions) — different from cover headline in image 41 which was sentence case (`How does AI work?`). Confirms **Title Case = article-title convention**; sentence-case = display-headline convention.
    - Line-height ~1.15, generous.
    - Note **NO curly-quote wrapping** here (unlike image 41's headline) — the title stands alone as a normal article title, not a quoted research question.

- **Zone D — Body summary paragraph (~y 640 → 855, x 100 → 620):** Inter Regular ~26 pt, `#1B1B1B`, left-aligned, 5 lines, line-height ~1.4. Verbatim:
    > `The outline of our empirically-driven approach to AI safety. These areas of work include developing techniques for scalable oversight, creating interpretable AI systems, and evaluating the societal impacts of AI to guide policy and research.`
    - Word count: ~35. Functions as an **abstract / article summary**. Same content structure as a news-site article-preview card.

- **Zone E — Chrome:**
    - Side edges (~y 405): white circular nav chevrons `‹` / `›`, ~50 px diameter. Standard claude/ primitive.
    - **NEW distinctive detail:** a **thin diagonal hairline line** extends from the RIGHT chevron off-screen to the top-right corner. Reader recognises this as a **connector-line continuation from the mood-board on the previous slide** — the connector-lines are literally continuing across slide boundaries. **This is a genuinely novel design device**: the connector-graph from the cover mood-board is being "traced" through the carousel, with each interior slide showing one artefact + prose, connected by the same hairline lines that appeared on the cover. Genius editorial continuity.
    - Same continuation line likely appears on the LEFT chevron connecting back to the previous slide's artefact.
    - Bottom-centre (~y 890): 7-dot indicator, **dot 2 filled**.

#### Palette (extracted, this slide)
- Background: `BG_WARM_OFFWHITE = ~#F5F0E5` (reused).
- Text primary: `INK_BLACK = #1B1B1B` (title + body).
- Text muted: `INK_MUTED_STONE ≈ #7A756A` (dateline). Reused from image 31.
- Connector line: `CONNECTOR_HAIRLINE ≈ #8A857B` (from image 41). Extends off-slide.
- Image internal colours: muted period-blue `~#A8B5D0`, pale grey-blue `~#D8E0EA`, warm brown `~#8A6B54`, cream `~#F5F0E5`, dark storm-grey `~#2E353C` — these are **inside the artwork**, not slide-level tokens.

**No new palette tokens** added by this slide (all values already established).

#### Typography
- **Dateline:** Inter (or mono) all-caps or small-caps ~18-20 pt, muted stone, tracked.
- **Article title:** Fraunces Bold ~56 pt, `#1B1B1B`, Title Case, left-aligned, 2 lines. **First seen use of Title Case for article titles in claude/ folder**.
- **Body summary:** Inter Regular ~26 pt, `#1B1B1B`, left-aligned, 5 lines. **Sans-serif body copy** — different from Carousel 4's serif body prose. Confirms Carousel 5 uses a **mixed type strategy**: serif for headlines (article titles) + sans for body summaries. Reverse of Carousel 4's mix (sans headings + serif body prose).

**Confirms:** Carousel 5's typography mode = **serif titles + sans body**, which is the **classic magazine / editorial-article convention**. Reinforces that this is an anthology carousel styled as a table-of-contents.

#### Iconography / decorative primitives
- **NEW primitive: continuation-connector-line at slide edge** — a thin hairline stroke starting inside the current slide's canvas and extending off the edge, suggesting it continues onto the next slide. Reader mentally connects it to the mood-board on the cover. Beautiful editorial device — rarely seen in social-media carousels.
    - Recommend our system support this at the carousel level: `carousel.continuityFeature: "mood-board-connectors"` — when enabled, each interior slide displays the fragment of the connector-graph that touches its own hero-artefact.
- Chrome: L/R chevrons + dot indicator.
- Hero image (reused from cover mood-board).

#### Motion / interaction affordance
- Static, but the **connector line extending off the right edge** is a strong "there's more coming — this connects to the next artefact" cue. Better than a plain chevron.
- The composition mimics a **magazine article preview card**: image → date → title → summary → click-through. Reader instinct is to imagine clicking on the card to read the full article.
- Carousel 5's model: cover is the ToC + preview; each interior slide is a "card" for one item; the connector-graph is the "you are here / next item is over there" navigation.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "article-reference-card"` — **NEW 12th confirmed body layout**. Running total:
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34)
7. `stacked-quotes` (35)
8. `prose-only` (37)
9. `state-heatmap-grid` (38)
10. `stacked-100pct-bar-chart` (39)
11. `treemap` (40)
12. `article-reference-card` (42) ← NEW

**Full LLM output contract (image 42 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "article-reference-card",
  "slideBackground": {
    "role": "warm-offwhite",
    "hex": "#F5F0E5"
  },
  "heroImage": {
    "url": "…",
    "reusesArtefactId": "pixel-collage",
    "size": { "w": 455, "h": 240 },
    "position": { "x": 100, "y": 145 },
    "cornerRadius": 4
  },
  "dateline": {
    "text": "MARCH 8, 2023",
    "font": "inter-regular",
    "sizePt": 20,
    "color": "#7A756A",
    "letterSpacing": 0.08,
    "case": "all-caps"
  },
  "articleTitle": {
    "text": "Core views on AI safety: When, why, what, and how",
    "font": "fraunces-bold",
    "sizePt": 56,
    "color": "#1B1B1B",
    "case": "title-case",
    "lines": 2,
    "align": "left"
  },
  "bodySummary": {
    "text": "The outline of our empirically-driven approach to AI safety. These areas of work include developing techniques for scalable oversight, creating interpretable AI systems, and evaluating the societal impacts of AI to guide policy and research.",
    "font": "inter-regular",
    "sizePt": 26,
    "color": "#1B1B1B",
    "align": "left",
    "lines": 5
  },
  "continuityConnector": {
    "type": "mood-board-connector-fragment",
    "fromEdge": "right",
    "toArtefactOnPrevSlide": "pixel-collage"
  },
  "chrome": {
    "navChevrons": true,
    "dotIndicator": { "total": 7, "current": 2 }
  }
}
```

**Renderer / Fabric helpers required (new for this variant):**
- `makeArticleReferenceCard({ heroImage, dateline, articleTitle, bodySummary, x, y })` — the whole card layout. Reuses existing text primitives.
- `makeDateline({ text, font, sizePt, color, letterSpacing, case })` — small tracked all-caps label. Reusable across editorial slides.
- `makeContinuityConnector({ fromEdge, angle, length, stroke, strokeWidth })` — draws a hairline extending from a slide edge, suggesting continuation. Useful primitive for any "linked-slide" narrative.

**LLM prompt hooks:**
- `bodyLayout: "article-reference-card"` should be selected for **anthology / portfolio / research-review carousels** where each interior slide showcases one linked item (paper, article, project, feature). Common in "our year in X" or "our body of work on Y" carousels.
- The **hero image should ideally reuse an artefact** from the cover's mood-board (image 41) — reader recognises it and mentally links the anthology to the cover overview.
- **Dateline is optional but strongly encouraged** — anchors the article in time, adds editorial authority. Format: `MONTH D, YYYY` in all-caps.
- **Article title uses Title Case + optional colon subtitle** — `[Concrete claim]: [Elaboration or scope]`. Examples:
    - `"Core views on AI safety: When, why, what, and how"` (this slide)
    - `"On our commitment to safe AI: Principles and practice"`
    - `"Deploying Claude for critical work: A framework"`
- **Body summary** is a proper article-abstract — 30-50 words, describes what the article covers. Different from the "closing finding" style of Carousel 4 (which was a punchy takeaway). Voice: **abstract/scholarly**, not marketing.

#### IG safe-zone check
- Hero image top at y≈145 — inside the 200-px top zone. Top ~55 px of the image may be partially obscured by IG chrome. Since the image is decorative (a stylized artwork), some clipping is acceptable — the recognisable-from-cover element is preserved.
- Article title at y≈475 → 610 — well within safe content zone.
- Body summary ends y≈855 — comfortably above the 1170-px bottom risk boundary. **Great safe-zone respect** — layout is anchored to the middle of the canvas.
- Dot indicator at y≈890 — unusually high position (most claude slides have dots at y≈1290). This slide's content occupies only y≈145-855, leaving significant bottom margin. Reflects the "compact-card" design intent — the article-reference-card doesn't fill the canvas.

#### Reusability score
- **`article-reference-card` body layout:** 5/5 — extremely reusable for any anthology / portfolio / research-review carousel. Applies to book club recommendations, "top articles this month" digests, product feature lists, project portfolios, resource guides.
- **Continuity-connector primitive:** 4/5 — a beautiful editorial device but hard to design well; requires the entire carousel to be planned around a mood-board cover. When applicable, it's a huge differentiator vs plain slides.
- **Dateline + Title-Case-title + summary composition:** 5/5 — canonical magazine table-of-contents pattern, universally applicable.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "article-reference-card"`.
- Sits in the **narrative-body-slide** subfamily alongside `prose-only` (37), `single-hero + photograph` (25, 28). Not a data slide — it's a linked-content-preview slide.
- **Carousel 5's likely per-slide pattern:** cover (mood-board) → 6 article-reference-card slides (one per artefact). Each interior slide shows one artefact + its date + title + summary. Confirms the anthology-carousel format.
- Companion to `connected-mood-board` heroType on covers — **the two go together as a carousel template pair**: `heroType: "connected-mood-board"` on the cover + `bodyLayout: "article-reference-card"` on N body slides. Should be paired in our LLM's carousel-planning schema.

#### Copy-pattern hint (LLM writer)
- Dateline formula: **`"MONTH D, YYYY"`** — always all-caps, comma before year. Real publication date if available; approximate month/year if not.
- Article title formula: **`"[Concrete claim]: [Elaboration / scope]"`** — Title Case, uses colon to introduce subtitle. 6-12 words total. Examples above.
- Body summary formula: **`"[The overview / outline / abstract] of [our approach / research / commitment] to [topic]. [These / this / it] [includes / addresses / covers] [3 concrete areas]."`** — 30-50 words. 2 sentences: high-level statement + concrete list of what's inside. Voice: understated-scholarly.
- **NEW convention: article title uses colon-subtitle pattern.** This is a hallmark of academic / research-paper titles — signals "this is a substantial piece of work with a clear scope". LLM should default to this format for anthology carousels.

#### Notes / open questions
- **Reusing the mood-board artefact as the article's hero image is a genius editorial device.** Reader's brain fires: "Oh, that pixel-cloud collage from the cover was THIS article!" Rewards attentive readers. Recommend our system enforce this: any `article-reference-card` slide MUST use a `reusesArtefactId` pointing to a specific artefact on the cover's mood-board. Creates guaranteed narrative continuity.
- **The continuity connector line is a spectacular flourish** but it's fragile — it requires precise coordination between slide N's right-edge line and slide N+1's left-edge line to reconstruct the mood-board graph across the carousel. Very hard to author manually. For MVP, ship the mood-board on the cover only; if it renders well, add continuity lines as a Phase 5+ enhancement.
- **Compact card layout with bottom margin** is a **new composition mode for claude/**. Prior body slides filled the canvas vertically; this one leaves ~460 px of bottom whitespace. Reflects the editorial card aesthetic — the card sits centred on the "page" like a magazine layout. Our system should allow `bodyLayout` variants to specify a `contentHeight: "full" | "compact"` prop, where `compact` centres the content in the top ~60% of the canvas and leaves bottom whitespace.
- **Dateline typography choice** (Inter vs JetBrains Mono) — hard to tell at this resolution. **My best guess: Inter Regular all-caps tracked** rather than monospace. Monospace would give a more "technical" feel; Inter all-caps gives an "editorial" feel. This slide reads editorial. Ship Inter tracked-all-caps for our dateline primitive; add mono variant later if needed.
- **Carousel 5 sequence prediction:**
    - Slide 1 (cover, image 41): mood-board hero + `"How does AI work?"` centred serif.
    - Slide 2 (this image): article-reference-card #1 (pixel-collage artefact, Core views on AI safety).
    - Slides 3-7 expected: article-reference-cards for the other 5-6 mood-board artefacts (brain-hedcut, green-print, urn, sun-dial, molecules, key, etc.), each with a different date, title, and summary.
    - Very structured, very editorial. Confirms Carousel 5 is a **6-item anthology** (cover + 6 article cards, matching the 7-dot indicator).

_Progress: 42 / 85 complete._

---

### claude/image copy 20.png

**Progress-log row:** 43 · claude · image copy 20.png

#### Composition & structure — CRITICAL FOLDER-TAXONOMY REVISION

**This slide is NOT Anthropic.** It's from **`@yanliudesign`** (Yan Liu, a personal-brand product designer). The `claude/` folder is therefore **NOT exclusively Anthropic** — it's a mixed-creator collection. Revised folder taxonomy:

- Anthropic Carousel 1 (drug-discovery): images 23–28 (6 slides).
- Anthropic Carousel 2 (language-values): images 29–31 (3 slides).
- Anthropic Carousel 3 (AI-researchers): images 32–35 (4 slides).
- Anthropic Carousel 4 (Economic Index): images 36–40 (5 slides).
- Anthropic Carousel 5 (anthology "How does AI work?"): images 41–42 (2 slides seen).
- **Yan Liu personal-brand carousel: starts at image 43** (this slide). New creator, new template family.
- Total: 6+ carousels across the 25-slide folder, not 5.

- **Canvas:** 1080 × 1350 (portrait 4:5).
- **Carousel context:** likely slide 2 of a Yan Liu personal-brand carousel — dot-indicator position + composition ("intro copy with doodle-arrow annotation pointing at profile card + photo hero") suggests this is the "hi, I'm ___" body slide that typically follows a cover.
- **Full-bleed background:** **NEW palette token — warm cream** `~#E6DFD1` (slightly warmer + more saturated than Anthropic's `BG_WARM_OFFWHITE = #F5F0E5`, sits between Anthropic's off-white and stone). Propose token `BG_WARM_CREAM_PERSONAL`.
- **NEW template family:** `aurora-personal-brand-intro` — a personal-designer / creator-portfolio body slide with **photo-hero on one side + intro copy on the other side + doodle-arrow annotation linking them + floating social-profile-card overlay**. Very different composition from any Anthropic slide seen so far. **This is the 1st confirmed slide for a whole new template family.**

#### Zones (approximate 1080 × 1350 coords)

- **Zone A — Intro copy top-left (~y 130 → 300, x 60 → 550):** `Yan is a product designer and tinkerer` — sans-serif **Medium** (weight ~500, could be Inter Medium or Instrument Sans Medium), ~72-80 pt, `#141414` near-black, left-aligned, wraps 2 lines (`Yan is a product` / `designer and tinkerer`). Tight leading (~1.05). **Not serif** — this is a sans-forward personal-brand voice, distinct from Anthropic's serif-heavy editorial tone.

- **Zone B — Hand-drawn doodle-arrow annotation (~y 200 → 320, x 490 → 615):** black `#141414` **pen-stroke curve** starting from just after the end of the "tinkerer" word, curving down-and-right, ending in a small filled arrowhead pointing at the top of the floating profile card. Structure: gentle right-descending curve → tight downward hook → arrowhead. Stroke width ~2.5-3 px, `strokeLineCap: 'round'`, hand-drawn feel (slightly imperfect Bézier, not mathematically clean). **Different from `others/image copy 6.png`'s doodle-arrow** — that one was straighter and shorter; this one has a distinct S-curve terminating with a downward hook. Propose primitive family: `makeDoodleArrow({ style: 'curved-down' | 'straight' | 'wavy' | 'loop' })`.

- **Zone C — Photo hero (~y 400 → 1350, x 400 → 1080, portrait rect, full-bleed to right + bottom):** large photograph of Yan Liu — young woman with long dark-brown hair, black-framed glasses, wearing a grey sweater, seated in front of a **laptop showing code on-screen** (visible in lower half of photo). Warm indoor lighting, slight smile, gaze at camera. **Full-bleed to right + bottom edges** — photo starts at approximately canvas horizontal centre (x ≈ 400) and bleeds to both right and bottom. Top of photo is at ~y 400 (not full-bleed top — leaves the cream bg visible in the upper zone for the intro copy). **Sharp rectangular crop, no rounded corners, no frame**.

- **Zone D — Floating social-profile-card overlay (~y 445 → 570, x 60 → 400):** **NEW distinctive primitive.** A white rounded-rectangle card overlaid on the middle-left of the canvas, **overlapping the left edge of the photo** by ~30-40 px (deliberate depth cue — card sits ON TOP OF the photo, not beside it). Anatomy:
    - **Container:** ~340 × 130 px, fill `#FFFFFF`, `borderRadius: 20 px`, soft drop-shadow (`shadowColor: rgba(0,0,0,0.08), shadowBlur: 24, shadowOffsetY: 8`).
    - **Circular avatar** (left side, ~x 80 → 152, y 465 → 537): ~72 × 72 px, circular-clipped photo of Yan Liu (a different smaller headshot crop than the main photo — probably her profile-pic asset). Filled with photo, no border.
    - **Display-name row** (right of avatar, top-aligned): `Yan Liu` — Inter Bold ~24-26 pt, `#141414`, followed inline by **blue verified checkmark badge**:
        - Verified badge = ~20 px diameter, solid `#1D9BF0` (Twitter/X brand blue) circle with a white `✓` checkmark centred. Positioned ~4 px to the right of the name, vertically centred with the name text.
    - **Handle row** (directly below name, ~y 505): `@yanliudesign` — Inter Regular ~18-20 pt, muted grey `#7A7A7A`, single line.
    - Card mimics a Twitter/X profile-row layout at compact size — a "chip" version of a full profile.

- **Zone E — Chrome:**
    - Left edge (~y 405, x 30): white circular nav chevron `‹`, ~50 px diameter, `#FFFFFF` fill, medium-grey glyph ink. **Vertically centred with the photo**, not with the whole canvas.
    - Right edge (~y 405, x 1030): matching white circular chevron `›`.
    - Bottom-centre (~y 1230): **7-dot indicator**, ~8 px each with ~10 px spacing. Dot 2 appears filled (harder to tell at this export resolution — the dot indicator sits **inside/over the photo**, not on the cream bg). Suggests this is slide 2 of a 7-slide carousel. Chrome-over-image is a **new chrome variation** — first time we've seen the dot indicator rendered on the hero image rather than in a neutral bottom margin. Confirms `dotIndicator.overContent: boolean` should be a supported flag.

#### Palette (extracted, this slide)
- `BG_WARM_CREAM_PERSONAL ≈ #E6DFD1` — **NEW**. Personal-brand-cream, sits between Anthropic's off-white and stone.
- `INK_NEAR_BLACK ≈ #141414` — headline + doodle-arrow + card-name ink. Slightly darker than Anthropic's `INK_BLACK = #1B1B1B`; personal-brand voice uses harder contrast.
- `PROFILE_CARD_BG = #FFFFFF` — pure white card fill.
- `HANDLE_GREY = #7A7A7A` — muted grey for the `@yanliudesign` handle.
- `X_BRAND_BLUE = #1D9BF0` — Twitter/X verified-badge blue. **Confirmed shared token** with SahilBloom image 15's tweet-quote slide.
- `NAV_CHEVRON_WHITE = #FFFFFF` — white circular chevron fill. Same primitive as Anthropic's chevrons.

**Palette-role additions:**
| Role | Token | Hex |
|---|---|---|
| `bg-warm-cream-personal` (new — Yan Liu carousel) | `BG_WARM_CREAM_PERSONAL` | `~#E6DFD1` |
| `ink-near-black` (personal-brand variant of `INK_BLACK`) | `INK_NEAR_BLACK` | `#141414` |
| `handle-grey` (social-card handle) | `HANDLE_GREY` | `#7A7A7A` |
| `x-brand-blue` (confirmed shared with SahilBloom img 15) | `X_BRAND_BLUE` | `#1D9BF0` |

#### Typography
- **Intro copy:** sans-serif Medium (weight ~500), ~72-80 pt, `#141414`, left-aligned, 2 lines, tight leading (~1.05). Candidate font families: **Inter Medium** (most likely), **Instrument Sans Medium**, or **Söhne Medium**. Personal-brand designers often pick Inter or Instrument for their portfolios.
- **Profile-card display name:** Inter Bold ~24-26 pt, `#141414`.
- **Profile-card handle:** Inter Regular ~18-20 pt, `#7A7A7A`.

**All sans-serif, no serif on this slide.** Confirms personal-brand-intro slides use **sans-forward typography** (vs Anthropic's serif+sans mix). LLM should pick sans-only for personal-brand template family.

#### Iconography / decorative primitives

- **NEW primitive: `doodle-arrow-annotation`** — hand-drawn curved arrow with arrowhead, pen-stroke feel. Related but distinct from `others/image copy 6.png`'s doodle-arrow. Propose unified family: `makeDoodleArrow({ style: 'curved-down' | 'straight' | 'wavy' | 'loop', start, end, color, strokeWidth })`.

- **NEW primitive: `floating-social-profile-card`** — a rounded-rectangle overlay chip mimicking a Twitter/X profile row. Anatomy: white bg, rounded corners, drop-shadow, circular avatar left, display-name + verified-badge inline, handle below. Compact ~340 × 130 px. Sibling of SahilBloom image 15's full-canvas tweet-quote slide — same primitive at different scales:
    - `variant: 'full-canvas'` (SahilBloom img 15) — occupies whole slide, no card frame around it, large body text.
    - `variant: 'floating-chip'` (this slide) — small overlay, rounded card frame, drop-shadow, positioned over other content.
    - Propose unified helper: `makeSocialProfileCard({ variant: 'full-canvas' | 'floating-chip', avatarUrl, displayName, handle, verified: boolean, bodyText?: string, x, y })`.

- **NEW primitive: `verified-badge`** — small circular platform-verification badge. Propose `makeVerifiedBadge({ platform: 'x' | 'instagram' | 'linkedin', size, fillColor, checkColor })`. For X/Twitter: `fillColor = '#1D9BF0'`, `checkColor = '#FFFFFF'`. For Instagram (blue with white ✓): same colours, slightly different star-notch shape. For LinkedIn: gold-yellow fill.

- **NEW primitive: `photo-hero-panel`** — a large photograph occupying half the canvas, bleeding to specified edges. Propose `makePhotoHeroPanel({ url, bleedEdges: ('top' | 'right' | 'bottom' | 'left')[], startAt: number | string, cornerRadius: 0 })`. On this slide: `bleedEdges: ['right', 'bottom']`, `startAt: 0.37` (i.e., photo starts at 37% down the canvas).

- **Chrome primitives (existing):** L/R circular nav chevrons + dot indicator (with new flag `dotIndicator.overContent: boolean`).

#### Motion / interaction affordance
- Static, but the **doodle-arrow explicitly directs the reader's eye** — reader reads intro copy top-left, arrow guides eye down-right to the profile card, then eye moves right to the photo. Strong reading path: **copy → arrow → card → face**. Classic personal-brand introduction rhythm.
- The **floating profile card overlapping the photo** creates depth — reader perceives card as "on top of" the photo, adding to the "physical mood-board / scrapbook" aesthetic.
- The **verified badge + handle** signal identity/legitimacy — reader immediately understands "this is Yan Liu, verified on X, professional designer".

#### Template family & LLM prompt structure

**Proposed NEW template:** `aurora-personal-brand-intro` — a personal-designer / creator-portfolio body slide.

Alternatively, this could be modelled as **extension of an existing template** with a new bodyLayout:
- `aurora-product-body` with `bodyLayout: "photo-hero-with-floating-social-card"` — reuses the flexible `aurora-product-body` framework, adds a new layout variant. **Recommended approach** to minimise template proliferation.

**Slot schema (draft):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "photo-hero-with-floating-social-card",
  "slideBackground": {
    "role": "warm-cream-personal",
    "hex": "#E6DFD1"
  },
  "introCopy": {
    "text": "Yan is a product designer and tinkerer",
    "font": "inter-medium",
    "sizePt": 76,
    "color": "#141414",
    "align": "left",
    "position": { "x": 60, "y": 130 },
    "maxWidth": 490,
    "lines": 2
  },
  "photoHero": {
    "url": "…",
    "bleedEdges": ["right", "bottom"],
    "startAtFraction": 0.37,
    "widthFraction": 0.63,
    "cornerRadius": 0
  },
  "socialCard": {
    "variant": "floating-chip",
    "avatar": { "url": "…", "size": 72, "shape": "circle" },
    "displayName": "Yan Liu",
    "handle": "@yanliudesign",
    "verified": { "platform": "x", "badgeColor": "#1D9BF0", "checkColor": "#FFFFFF" },
    "position": { "x": 60, "y": 445 },
    "size": { "w": 340, "h": 130 },
    "overlapPhoto": true,
    "cardBg": "#FFFFFF",
    "cornerRadius": 20,
    "dropShadow": { "color": "rgba(0,0,0,0.08)", "blur": 24, "offsetY": 8 }
  },
  "doodleAnnotation": {
    "style": "curved-down",
    "from": { "anchor": "introCopy.end", "offset": { "x": 20, "y": -20 } },
    "to": { "anchor": "socialCard.topLeft", "offset": { "x": 20, "y": -20 } },
    "stroke": "#141414",
    "strokeWidth": 2.5,
    "arrowheadSize": 12
  },
  "chrome": {
    "navChevrons": { "showLeft": true, "showRight": true, "verticalAnchor": "photo-centre" },
    "dotIndicator": { "total": 7, "current": 2, "overContent": true }
  }
}
```

**Renderer / Fabric helpers required (new for this variant):**
- `makeDoodleArrow({ style, start, end, color, strokeWidth, arrowheadSize })` — hand-drawn pen-stroke arrow with variants. Ship a small library of pre-designed SVG paths for common curves (curved-down, curved-up, straight, wavy, loop-back) with slight jitter for hand-drawn authenticity.
- `makeSocialProfileCard({ variant, avatar, displayName, handle, verified, bodyText, position, size, cardBg, cornerRadius, dropShadow })` — social-media profile row primitive with 2 variants.
- `makeVerifiedBadge({ platform, size, fillColor, checkColor })` — platform-verification badge glyph.
- `makePhotoHeroPanel({ url, bleedEdges, startAt, widthFraction, cornerRadius })` — full-bleed photo panel with configurable bleed direction.

**LLM prompt hooks:**
- `bodyLayout: "photo-hero-with-floating-social-card"` should be selected for **personal-brand intro slides** — the "hi, I'm ___" body slide of a designer/creator portfolio carousel. Also applicable to team-member intro slides in company carousels.
- **Intro-copy formula:** `"[First-name] is a [role] and [additional-descriptor]"` — third-person self-introduction. 5-8 words. Voice: **casual-conversational**, not marketing-formal. Examples:
    - `"Yan is a product designer and tinkerer"` (this slide)
    - `"Alex is a software engineer and photographer"`
    - `"Jamie is a UX researcher and cat mom"`
- **Doodle-arrow direction:** should curve from the end of the last word of the intro copy toward the profile card OR toward a specific point on the photo. Signals "here's the thing I'm pointing at". LLM specifies `anchor`; renderer computes the Bézier.
- **Verified badge:** include only if the subject is actually verified on the platform. Don't fake verification. Platform is user-configurable (`x` | `instagram` | `linkedin` | `none`).
- **Photo-hero bleed direction:** `['right', 'bottom']` is one option; `['left', 'bottom']` mirrors it; `['top', 'right']` puts photo top-right (like an Anthropic product-cover). Composition depends on which side the intro copy sits.

#### IG safe-zone check
- Intro copy top at y≈130 — inside the 200-px top zone. First line may be partially obscured. Recommend lowering to y≥220 in production.
- Photo top at y≈400 — well within safe content zone.
- Profile card at y≈445-570 — safely centred vertically.
- Nav chevrons at y≈405 — safely within photo area, high contrast against dark photo bg. No clipping risk.
- Dot indicator at y≈1230 — **inside** the 1170-px CTA-overlay risk zone (as usual). But since it's rendered over the photo (already-decorative area), clipping is acceptable.

#### Reusability score
- **`photo-hero-with-floating-social-card` body layout:** 5/5 — extremely reusable for **any personal-brand / team-member / creator-intro carousel**. Every designer, dev, creator, or team member with a portfolio needs this exact slide.
- **`makeDoodleArrow` primitive:** 5/5 — universally applicable across annotated-example, feature-callout, and tutorial slides. Now confirmed 3rd instance (Anthropic body slides used hand-drawn callout arrows on image 24; others/img 6 used them for direction; this slide uses them for annotation).
- **`makeSocialProfileCard` primitive:** 5/5 — universally reusable for any social-proof / attribution / testimonial context.
- **`makeVerifiedBadge` primitive:** 5/5 — small but crucial identity-signal for any social-media-styled slide.
- **`makePhotoHeroPanel` primitive:** 5/5 — reusable for any large-photo composition.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "photo-hero-with-floating-social-card"`. Extends the flexible aurora-product-body framework to a 13th body layout.
- Alternatively: **new sibling template family `aurora-personal-brand-*`** (intro, project-highlight, portfolio-grid, tool-stack, cta). Recommend **not proliferating templates** — reuse `aurora-product-body` as the framework and add personal-brand-specific bodyLayouts as needed.
- **Full 13-variant running total for `aurora-product-body`:**
    1. `single-hero` (24, 25, 28)
    2. `thumbnail-grid` (26)
    3. `stat-comparison` (27)
    4. `spectrum-chart` (30)
    5. `axis-shift-chart` (31)
    6. `pull-quote` (33, 34)
    7. `stacked-quotes` (35)
    8. `prose-only` (37)
    9. `state-heatmap-grid` (38)
    10. `stacked-100pct-bar-chart` (39)
    11. `treemap` (40)
    12. `article-reference-card` (42)
    13. `photo-hero-with-floating-social-card` (43) ← NEW

#### Copy-pattern hint (LLM writer)
- Intro-copy formula: **`"[FirstName] is a [role] and [descriptor]"`** — 5-8 words, casual third-person self-introduction. Use as-is for personal-brand carousels; adapt to `"[Name], [role] at [Company]"` for company team-member slides.
- **Doodle annotations should be sparse** — one per slide max. Over-use dilutes the "handmade personality" feel. LLM should only add doodle-arrow when there's ONE clear thing to point at.
- **Voice for personal-brand slides:** casual, playful, first- or third-person, no exclamation points, no ALL-CAPS. "and tinkerer" / "cat mom" / "cocktail enthusiast" — self-deprecating hobby descriptor works well.

#### Notes / open questions
- **CRITICAL: this discovery invalidates the earlier folder assumption.** The `claude/` folder is a **mixed-creator research reference collection**, not exclusively Anthropic. Anthropic Carousel 5's dot count (7) suggested 7 slides total (images 41-47), but slide 43 (this one) is definitively from a different creator. So Anthropic Carousel 5 only has 2 slides in our export (41-42), and slides 43-47 belong to Yan Liu's personal-brand carousel + possibly more creators.
- **Expected structure of the Yan Liu carousel (based on personal-brand conventions):**
    - Slide 1 (cover, unseen): probably a designer's cover — big name + tagline + hero photo.
    - Slide 2 (this image, image 43): "who is Yan" intro — photo + intro copy + profile card.
    - Slides 3-7 (expected in images 44-47 + one more): probably project-highlights, tool-stack, testimonials, and CTA. Each may introduce a NEW body-layout variant for the personal-brand template family.
- **The `makeDoodleArrow` primitive is proving to be one of the most universally-useful new primitives.** So far confirmed uses:
    1. `others/image copy 6.png` — direction cue between slides.
    2. `claude/image copy.png` (image 24) — callout annotation on a scientific hero image.
    3. `claude/image copy 20.png` (this slide) — annotation linking intro copy to profile card.
    - Recommend prioritising `makeDoodleArrow` as one of the FIRST new primitives to build in Phase 4.
- **The `makeSocialProfileCard` primitive doubles down** on SahilBloom image 15's tweet-quote template. Both use the same underlying primitive at different scales — should share the same helper.
- **`X_BRAND_BLUE = #1D9BF0`** is now confirmed as a **shared cross-brand token** — same colour used on both SahilBloom's slide 15 (2 folders ago) and this slide (Yan Liu). It's Twitter/X's official brand blue and should be a **stable global token** in our system, not a per-carousel token.
- **Photo-hero composition (photo bleeds to 2-3 edges + text/card on the other side + doodle-arrow linking them)** is a **classic personal-brand aesthetic** popularised by design portfolios on IG. Reusable pattern beyond just Yan Liu; countless designers use this exact composition.
- **Anthropic wordmark** obviously not present here — this slide has no brand-wordmark chrome. Personal-brand slides typically rely on the profile-card + photo to convey identity, not a separate wordmark.

_Progress: 43 / 85 complete._

---

### claude/image copy 21.png

**Progress-log row:** 44 · claude · image copy 21.png

#### Composition & structure

**Second slide from the Yan Liu personal-brand carousel** (following image 43's photo-hero intro). This slide is a **manifesto pull-quote on a dark cosmic-globe bg** — a completely different mood from slide 43's warm-cream photo-hero. Confirms Yan Liu's personal-brand carousel uses **multiple bg palettes across slides** (like Anthropic).

- **Canvas:** 1080 × 1350. Full-bleed.
- **Carousel context:** slide 4 of a Yan Liu personal-brand carousel — dot indicator = 9 dots, **dot 4 filled** (highlighted with a small pink/coral dot vs muted white dots for others). This confirms the Yan Liu carousel is **at least 9 slides long**, larger than any of the 5 Anthropic carousels in the folder. Also means slides 43-47 (5 slides seen) are only a fragment of the full carousel.
- **Full-bleed background:** **NEW palette — deep near-black** `~#0A0A0C` (very dark navy/black, not pure black). NEW palette family for this folder: `BG_COSMIC_DARK`. Same dark tone across the whole slide including behind the globe.
- **NEW `bodyLayout` variant: `"pull-quote-with-artefact-globe"`** — a full-slide serif pull-quote (like Anthropic's coral pull-quote in image 33) but on dark bg, with an interactive-looking **3D globe artefact** occupying the bottom half. **The globe has small annotation cards on it** — mimicking the UI of an interactive 3D globe app (weather / data / travel dashboard). This is the **14th confirmed body layout** for the flexible `aurora-product-body` framework (though it could equally be a new personal-brand template).

#### Zones (approximate 1080 × 1350 coords)

- **Zone A — Big serif pull-quote (~y 130 → 640, x 60 → 1000):** `"I'm driven by curiosity and the desire to see what an idea could become. It doesn't need to be genius, useful, or guaranteed to be loved by other people. If I have the tools and the time, I'd rather try it than overthink whether it deserves to be built."` — serif Regular / Medium ~50-54 pt, colour `#FFFFFF` (pure white on dark), left-aligned, wraps 7 lines. **Wrapped in curly quotes `"..."`** (same convention as Anthropic's Carousel 5 headline in image 41). Line-height ~1.15.
    - Font candidate: **Fraunces Regular** or **Fraunces Book** — the letterforms match the serif family used in Anthropic covers. NOT bold — this is a lighter weight (Regular/Book) than the pull-quote serif seen in Anthropic image 33 (which was Fraunces Bold). Suggests personal-brand voice uses **lighter serif weights** for a more contemplative / conversational tone vs Anthropic's bolder editorial voice.
    - Curly apostrophes throughout (`I'm`, `doesn't`, `I'd`). Reinforces the "always output smart quotes" rule.
    - **Word count: ~54 words** — one of the longest single quotes seen so far in the reference set. Reads as a personal-brand manifesto.
    - **NO inline-bold spans.** Unlike Anthropic's pull-quotes (which always had a bolded "money-line"), Yan Liu's quote is set uniformly. Suggests personal-brand voice is **less didactic** — the whole quote is equally weighted, reader is trusted to pick their own resonance.

- **Zone B — Attribution (~y 675 → 705, x 60):** `Yan Liu` — Inter Bold (or serif Bold?) ~26-28 pt, `#FFFFFF`, left-aligned. Single line, no role/affiliation below (different from Anthropic's `<Name> / <Role>, <Institution>` format). Personal-brand context = the reader already knows who Yan Liu is from the intro slide, so no role needed.

- **Zone C — 3D globe artefact (~y 720 → 1250, centred-ish):** the distinctive new element.
    - A **photorealistic dark 3D globe rendering** (~530 × 530 px) positioned in the lower half of the slide. Continents outlined in thin light strokes (`~#666676`), oceans dark near-black, land dark navy/grey. Very astronomical / cosmic aesthetic. Reads as a **UI screenshot of a data-visualisation app** (perhaps a weather / flight-tracker / phenology tool).
    - Small **pink/coral highlight dots** scattered on the globe surface (~5-6 visible), marking cities/data-points. Colour: `~#FF7A75` (a warm coral-pink, similar to Anthropic's coral `#D46A5E` but brighter/more saturated).
    - **NEW distinctive UI element — small annotation card on the globe** (~y 970, x 350):
        - Small **dark rounded-rect card** (~230 × 130 px), fill `~#1A1A1E` (slightly lighter than bg), rounded corners ~10 px, subtle outer glow / soft shadow.
        - **Header row:** small pink/coral dot bullet + `JAPAN` label — sans-serif small-caps ~10 pt, muted grey/pink.
        - **Title:** `Tokyo · Showa Kinen` — serif Regular ~18 pt, `#FFFFFF`, single line (uses `·` middle-dot separator, not `-` or `/`).
        - **Data rows:** two horizontal rows with monospace-styled labels:
            - Row 1: `PEAK` (left, small caps, muted) + `Apr 8` (right, white).
            - Row 2: `WINDOW` (left, small caps, muted) + `Mar 22 → May 1` (right, white). Note the `→` glyph again (U+2192) — same convention as Anthropic (image 32's subtitle, image 38's legend, image 31's shift-pill).
        - **Bottom mini-chart:** a small horizontal bar-chart / timeline ~200 × 15 px, showing tiny grey vertical bars with the letters `2  M  H  M  2  S  N` labelled below (looks like some kind of colour-scale or intensity indicator, hard to read at export resolution). Suggests a **cherry-blossom bloom timeline** for Tokyo's Showa Kinen park.
    - **Context:** this is Yan Liu's actual product — a cherry-blossom / travel-window prediction app (possibly `sakura.watch` or similar). The globe artefact is a **live-product screenshot**, showing off her own work as the visual anchor for her manifesto quote. Genius personal-brand move — quote + product-in-action = "here's my philosophy AND here's what I built with it".

- **Zone D — Chrome:**
    - Left edge (~y 640, x 30): **circular white nav chevron `‹`** (~50 px diameter). Same primitive as image 43, but here on a dark bg the white circle reads with high contrast.
    - Right edge (~y 640, x 1030): matching white circular chevron `›`.
    - Bottom-centre (~y 1290): **9-dot indicator**, small horizontal row. Dots are `~#FFFFFF @ 40%` opacity (muted white) EXCEPT dot 4 which is `~#FF7A75` (coral-pink) — matches the pink accent on the globe. **NEW variation: highlighted dot uses accent colour, not just fill-vs-outline like Anthropic's dots.** Recommend our `makeDotProgressIndicator` support `activeStyle: "fill" | "accent-color" | "size-larger"`.

#### Palette (extracted, this slide)
- **NEW palette tokens:**
    - `BG_COSMIC_DARK ≈ #0A0A0C` — deep near-black slide bg. Very cold, cosmic.
    - `INK_ON_DARK = #FFFFFF` — pure white ink for quote + attribution + card title.
    - `GLOBE_STROKE_MUTED ≈ #666676` — muted cool grey for continent outlines. 
    - `ACCENT_CORAL_PINK ≈ #FF7A75` — bright warm coral-pink accent for highlight dot + active dot-indicator + globe hotspots. Sibling of `BG_HERO_CORAL = #D46A5E` but brighter/pinker.
    - `CARD_BG_ELEVATED ≈ #1A1A1E` — slightly lighter dark tone for the on-globe annotation card (creates elevation vs slide bg).
    - `INK_MUTED_ON_DARK ≈ #999999` or `~#B0B0B0` — muted white/grey for card metadata rows (`PEAK`, `WINDOW` labels).

**Palette-role additions:**
| Role | Token | Hex |
|---|---|---|
| `bg-cosmic-dark` (new — Yan Liu manifesto slides) | `BG_COSMIC_DARK` | `~#0A0A0C` |
| `card-bg-elevated-dark` (new — elevated cards on dark bg) | `CARD_BG_ELEVATED` | `~#1A1A1E` |
| `accent-coral-pink` (new — brighter than Anthropic coral) | `ACCENT_CORAL_PINK` | `~#FF7A75` |
| `globe-stroke-muted` (new) | `GLOBE_STROKE_MUTED` | `~#666676` |
| `ink-muted-on-dark` (new) | `INK_MUTED_ON_DARK` | `~#B0B0B0` |
| `ink-on-dark` (white, on dark bg) | `INK_ON_DARK` | `#FFFFFF` |

**Note:** this is the **first dark-bg slide** in the entire reference set (others + SahilBloom + all prior claude slides use warm neutrals). Confirms **dark-mode is a valid palette variant** for personal-brand carousels — creates high-contrast, cosmic / immersive mood.

#### Typography
- **Pull quote:** Fraunces Regular / Book ~50-54 pt, `#FFFFFF`, left-aligned, 7 lines, curly quotes. Lighter weight than Anthropic's Bold serif quotes.
- **Attribution:** Inter Bold ~28 pt, `#FFFFFF`, left-aligned. Single line (no role).
- **Card title:** Fraunces Regular ~18 pt, `#FFFFFF`, single line, `·` separator.
- **Card region label** (`JAPAN`): sans-serif small-caps ~10 pt, muted.
- **Card data labels** (`PEAK`, `WINDOW`): sans-serif small-caps ~9 pt, `#B0B0B0` muted grey.
- **Card data values** (`Apr 8`, `Mar 22 → May 1`): sans-serif Regular ~11 pt, `#FFFFFF`.

**Mixed families within one slide:** Fraunces serif (quote + card title) + Inter sans (attribution + card metadata). Confirms **serif for narrative / editorial content** + **sans for data / metadata / UI labels** rule extends to personal-brand slides.

#### Iconography / decorative primitives

- **NEW primitive: `3d-globe-artefact`** — a photorealistic dark 3D globe rendering with continent outlines + hotspot dots + optional annotation cards. High-value distinctive visual asset. Options for reproduction:
    1. **Ship as pre-rendered PNG asset** — user uploads their own globe render (or we provide a small library).
    2. **Use a 3D globe library** (e.g., `three.js` / `globe.gl` / `d3-geo`) rendered at build-time to PNG.
    3. **AI-generate via image model** with prompt like `"photorealistic dark 3D globe render, thin light continent outlines, dark cosmic bg, small pink hotspot dots on Japan"`. Requires prompt engineering.
    - **Recommend Option 1 for MVP** (user-supplied) — the globe is a product-specific artefact, not a generic template element.

- **NEW primitive: `on-artefact-annotation-card`** — a small dark rounded-rect card floating on top of a hero artefact (globe here, but reusable for photos, charts, maps). Anatomy: dark bg + region label + title + N metadata rows + optional mini-chart. Similar to a **map pin popup** or **hover tooltip**. Propose `makeOnArtefactCard({ x, y, width, height, cardBg, header: { icon, label }, title, dataRows: [{ label, value }], miniChart?, dropShadow })`.

- **Chrome primitives** (existing): L/R white circular nav chevrons + dot indicator (with new `activeStyle: "accent-color"` flag).

- **The `→` glyph** (U+2192) reappears here in the `Mar 22 → May 1` date range. This is now confirmed as a **cross-brand universal date/range separator** in editorial design. Uses so far:
    1. End-of-subtitle "continue reading" cue (Anthropic image 32).
    2. Scale-direction indicator in gradient legends (Anthropic image 38).
    3. Directional-shift indicator on axis-shift chart (Anthropic image 31).
    4. Continuity-connector line off slide edge (Anthropic image 42).
    5. **Date-range separator** (this slide, Yan Liu). ← NEW USE

#### Motion / interaction affordance

- Static export, but the composition **strongly implies interactivity** — the globe artefact reads as "this is a UI screenshot of an app". The annotation card mimics a live tooltip. The pink dots on the globe suggest data-points a user could click.
- **Reader's eye path:** manifesto quote (top, dominant) → attribution → globe (bottom, drawing eye down) → annotation card highlights `Tokyo · Showa Kinen` (specific concrete detail). Sequence goes: **philosophy → maker → work**. Perfect personal-brand narrative arc in one slide.
- The **dark bg with a glowing globe** creates a cinematic / cosmic feel — reader feels like they're looking through a spaceship viewport at Earth. Amplifies the "curiosity / possibility" theme of the quote.

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` (or `aurora-personal-brand-body`) with `bodyLayout: "pull-quote-with-artefact-globe"` — **NEW 14th confirmed body layout** for the flexible framework.

Actually, this is better modelled as a **more general layout: `"pull-quote-with-live-artefact"`** — where the artefact could be a globe, a screenshot, a photo, a chart, a diagram, etc. The 3D-globe here is just one instance of the "live artefact" slot. Recommend the general layout name.

Running total (13 → 14):
1. `single-hero` (24, 25, 28)
2. `thumbnail-grid` (26)
3. `stat-comparison` (27)
4. `spectrum-chart` (30)
5. `axis-shift-chart` (31)
6. `pull-quote` (33, 34) — Anthropic coral-hero pull-quote
7. `stacked-quotes` (35)
8. `prose-only` (37)
9. `state-heatmap-grid` (38)
10. `stacked-100pct-bar-chart` (39)
11. `treemap` (40)
12. `article-reference-card` (42)
13. `photo-hero-with-floating-social-card` (43) — Yan Liu photo intro
14. `pull-quote-with-live-artefact` (44) ← NEW — Yan Liu manifesto on dark globe

**Full LLM output contract (image 44 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "pull-quote-with-live-artefact",
  "slideBackground": {
    "role": "cosmic-dark",
    "hex": "#0A0A0C"
  },
  "textColourOnBg": {
    "primary": "#FFFFFF",
    "muted": "#B0B0B0"
  },
  "pullQuote": {
    "text": "I'm driven by curiosity and the desire to see what an idea could become. It doesn't need to be genius, useful, or guaranteed to be loved by other people. If I have the tools and the time, I'd rather try it than overthink whether it deserves to be built.",
    "font": "fraunces-regular",
    "sizePt": 52,
    "curlyQuotes": true,
    "boldSpans": [],
    "align": "left",
    "lines": 7
  },
  "attribution": {
    "name": "Yan Liu",
    "role": null,
    "font": "inter-bold",
    "sizePt": 28,
    "align": "left"
  },
  "artefact": {
    "type": "3d-globe",
    "assetUrl": "…",
    "position": { "x": 275, "y": 720 },
    "size": { "w": 530, "h": 530 },
    "hotspots": [
      { "location": "Japan", "color": "#FF7A75" }
    ],
    "annotationCard": {
      "region": "JAPAN",
      "regionColor": "#FF7A75",
      "title": "Tokyo · Showa Kinen",
      "dataRows": [
        { "label": "PEAK", "value": "Apr 8" },
        { "label": "WINDOW", "value": "Mar 22 → May 1" }
      ],
      "miniChart": {
        "type": "timeline-bars",
        "labels": ["2", "M", "H", "M", "2", "S", "N"]
      },
      "cardBg": "#1A1A1E",
      "position": { "x": 320, "y": 960 }
    }
  },
  "chrome": {
    "navChevrons": { "showLeft": true, "showRight": true, "style": "white-circle" },
    "dotIndicator": {
      "total": 9,
      "current": 4,
      "activeStyle": "accent-color",
      "activeColor": "#FF7A75",
      "mutedColor": "#FFFFFF@40%"
    }
  }
}
```

**Renderer / Fabric helpers required (new for this variant):**
- `makeArtefactPanel({ type, assetUrl, position, size, hotspots?, annotationCard? })` — a hero-artefact slot that can render a globe / screenshot / map / chart / photo with optional hotspot annotations. Extensible artefact types.
- `makeOnArtefactCard({ x, y, width, height, cardBg, header, title, dataRows, miniChart?, dropShadow })` — the floating dark-card tooltip primitive.
- `makeMiniTimelineChart({ labels, dataValues, colours, width, height })` — a tiny horizontal timeline / gradient / bar-chart for embedding in annotation cards. Reusable in dashboard mock-ups.
- **Extend `makeDotProgressIndicator`** to support `activeStyle: "fill" | "accent-color" | "size-larger"` and separate `activeColor` + `mutedColor` params.

**LLM prompt hooks:**
- `bodyLayout: "pull-quote-with-live-artefact"` should be selected for **personal-brand manifesto slides** — where the creator states their philosophy AND shows a piece of their actual work as visual proof. Powerful "walk the talk" narrative device.
- **Voice for personal-brand manifestos:** first-person authentic, ~40-60 words, no boasting or superlatives, plainspoken. Fraunces Regular weight (not Bold) — signals contemplative rather than declarative.
- **Artefact should be REAL, not decorative** — must be a screenshot / render of the creator's actual work. LLM should not fabricate; the artefact must be user-supplied.
- **Dark bg for manifesto slides** is a valid palette choice when the creator's brand is technical / cosmic / immersive. Warm-cream bg (like Yan Liu's slide 43) for casual/friendly intro; dark bg for philosophical/serious content. Same carousel can have both.

#### IG safe-zone check
- Pull-quote top at y≈130 — inside the 200-px top zone. First line may be partially clipped by IG chrome. Since IG's avatar bar is white on transparent, it will read OK against the dark slide bg (unlike on cream slides where clipping was visually jarring). Recommend still lowering to y≥210 in production.
- Attribution at y≈675-705 — safely below top risk zone.
- Globe artefact at y≈720-1250 — mostly in safe content zone. Bottom ~50 px of globe extends into the 1170-px bottom-CTA-overlay risk zone. Since it's decorative (bottom of globe is oceans/pole), clipping is acceptable.
- Annotation card at y≈960-1090 — comfortably in safe content zone.
- Dot indicator at y≈1290 — inside CTA overlay zone (decorative, as usual).

#### Reusability score
- **`pull-quote-with-live-artefact` body layout:** 5/5 — extremely reusable for **any creator / product / SaaS carousel** where the creator wants to pair a philosophy statement with a live product screenshot. Universally applicable pattern.
- **Dark cosmic-bg palette:** 5/5 — reusable for any technical / product / data-driven brand. Creates high-contrast, premium feel.
- **On-artefact annotation card primitive:** 5/5 — universally useful for any dashboard-style / map-style / screenshot-style body slide.
- **`makeMiniTimelineChart` primitive:** 4/5 — useful in dashboard mockups, but niche.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "pull-quote-with-live-artefact"`.
- Sits in the **narrative-body-slide** subfamily alongside `pull-quote` (33, 34), `prose-only` (37), `article-reference-card` (42), `photo-hero-with-floating-social-card` (43).
- Confirms `aurora-product-body` is a **canonical body-slide framework** across at least 3 distinct brand systems: Anthropic (Carousels 1-5), and now Yan Liu personal-brand.

#### Copy-pattern hint (LLM writer)

- **Personal-brand manifesto pull-quote formula:** first-person "I'm driven by / motivated by / obsessed with [X]. It doesn't need to be [Y] or [Z] or [W]. [Concluding action statement about how the creator approaches work]." 40-70 words. Voice: **plainspoken, self-aware, non-boasting**. Absence of technical jargon.
- **Attribution:** just the name (no role) when the slide is deep in the creator's personal-brand carousel (reader has context). Attribution formula `"[Full Name]"`.
- **Annotation card region label:** country / city / region in ALL CAPS ~10 pt with coloured bullet dot. Signals data-provenance.
- **Card title with middle-dot `·` separator:** `"[City] · [Location-name]"` — canonical UI convention for hierarchical data (city + venue, brand + product, etc.).
- **Data rows use ALL-CAPS labels + right-aligned values.** Labels are metadata-descriptors (`PEAK`, `WINDOW`, `SIZE`, `DATE`, `PRICE`). Values are concrete data (`Apr 8`, `$249`, `2.4M`).

#### Notes / open questions

- **This slide dramatically expands the design range of the Yan Liu carousel.** Slide 43 (image 43) was warm cream + photo hero + casual intro copy — friendly, approachable. This slide (44) is dark cosmic + serif manifesto + live product artefact — philosophical, cinematic. **Same creator, radically different palettes and moods on adjacent slides.** Confirms personal-brand carousels can freely mix palettes across slides.
- **The 3D globe with cherry-blossom bloom tracker** is likely Yan Liu's actual product (probably `sakura.watch` based on the "Tokyo · Showa Kinen" park reference — Showa Kinen Park is famous for cherry blossoms). This makes the slide a **product demo disguised as a manifesto slide** — genius personal-brand pattern.
- **The `pull-quote-with-live-artefact` layout is a canonical pattern** that many creators use. Notion, Linear, Figma, Vercel, etc. all use "philosophy quote + product screenshot" in their marketing. This template will be highly requested.
- **Bright coral-pink `#FF7A75`** vs Anthropic's muted coral `#D46A5E` — same colour family but different saturation. Personal-brand palettes lean brighter / more saturated; corporate-editorial palettes lean muted / warm. Worth noting as a **brand-personality axis**: `palette.saturation: "muted-editorial" | "bright-personal"`.
- **The 9-dot indicator** confirms the Yan Liu carousel is at least 9 slides. We have slides 43 and 44 in our export; slides 45, 46, 47 will complete our folder view but there are likely 4-5 more slides in the actual carousel that we don't have access to.
- **The dot-indicator accent-colour variation** is a design detail worth capturing. Anthropic used **fill-vs-outline** to signal active dot; Yan Liu uses **accent-color vs muted-white**. Both are valid; our system should support both via a `activeStyle` enum on the primitive.
- **Prediction for slides 45-47:** based on personal-brand carousel conventions, expect: `project-showcase-grid` slide (portfolio thumbnails), `tool-stack-icons` slide (list of tools/tech used), and `cta-with-social-icons` outro slide (contact info + links). Each may introduce a NEW body-layout variant for the personal-brand template family.

_Progress: 44 / 85 complete._

---

### claude/image copy 22.png

**Progress-log row:** 45 · claude · image copy 22.png

#### Composition & structure

**Third slide from the Yan Liu personal-brand carousel** (following images 43 photo-hero-intro + 44 manifesto-on-dark-globe). This slide is a **workflow-demo / case-study composition** — two "tweet cards" (one at top, one at bottom) framing a **collaged screenshot montage** in the middle that shows Yan's design process: a context-menu screenshot (with `Claude Fable 5` highlighted) + Claude Design document + game concept art + iPhone showing the running game. Tells a **"tweet → work → tweet"** story in a single slide.

- **Canvas:** 1080 × 1350. Full-bleed.
- **Carousel context:** slide 5 of the Yan Liu personal-brand carousel — dot indicator = 9 dots, **dot 5 filled** (again with the pink/coral accent-colour active-dot from image 44). Confirms carousel is 9 slides, we're now on slide 5 of 9.
- **Full-bleed background:** warm cream, same or very close to `BG_WARM_CREAM_PERSONAL ≈ #E6DFD1` from image 43 — confirms Yan Liu carousel returns to warm cream for casual/friendly slides (dark cosmic reserved for manifesto peak). Establishes the palette rhythm: warm-cream body slides + one dark-cosmic emotional peak.
- **NEW `bodyLayout` variant: `"tweet-sandwich-with-work-collage"`** — two floating tweet cards (top + bottom) frame a case-study montage of screenshots. This is the **15th confirmed body layout** for the flexible `aurora-product-body` framework.

#### Zones (approximate 1080 × 1350 coords)

- **Zone A — Top floating tweet card (~y 100 → 260, x 65 → 570):**
    - Same `floating-social-profile-card` primitive as image 43, but this time carrying a **tweet body** (multi-line quote below the profile row), making it a **full tweet card** rather than just an identity chip.
    - **Container:** ~510 × 165 px, white `#FFFFFF` fill, `borderRadius: 20 px`, soft drop-shadow (same recipe as image 43: `rgba(0,0,0,0.08), blur: 24, offsetY: 8`).
    - **Profile row (top of card, y ~120):** circular avatar (~52 px) + `Yan Liu` in Inter Bold ~22 pt + blue verified checkmark + `@yanliudesign` in muted grey directly below name.
    - **Tweet body (bottom of card, y ~200 → 260):** `Just experimented with Claude Fable 5 in Claude Design. Less than 20 minutes. Less than 5 prompts.` — Inter Regular ~22 pt, `#141414`, left-aligned, wraps 2 lines. Word count: ~15.
    - Confirms the **`makeSocialProfileCard` primitive extends** with an optional `bodyText` slot: `variant: 'floating-chip' + hasBodyText: true` → makes the card a full tweet. Recommend refining primitive to `makeSocialCard({ variant: 'chip' | 'tweet' | 'full-canvas', ... })`.

- **Zone B — Screenshot collage / case-study montage (~y 280 → 900):**
    - A **layered composition** of ~4 overlapping screenshots + one iPhone photograph, arranged to imply a workflow narrative (menu → doc → concept → running game).
    - **Layer 1 (top-left, ~x 90 → 260, y 260 → 425):** a **classic Mac right-click context menu screenshot** — small floating white rounded-rect (~170 × 165 px) showing menu items:
        - `Open...`
        - `Step Backward`
        - `Copy`
        - `Claude Fable 5` — **highlighted with a bright blue selection band** (~`#3B7EDC`), white text on the blue. This is the **decisive moment** of the slide — the reader's eye is drawn to this highlight, understanding "Yan clicked THIS item, which triggered the workflow".
        - `File Info`
        - `Print...`
        - `Exit`
        - **A small hand-cursor icon** sits over the `Claude Fable 5` row, further emphasising the click action.
    - **Layer 2 (right of context menu, ~x 260 → 940, y 260 → 690):** a **long portrait screenshot of a Claude Design / Claude Fable document** — off-white bg, dense small-text lines (unreadable at this resolution, looks like a design brief or notion-style doc). Top of doc has a **soft dreamy cloud illustration** and text `Push (up is ready to play — a...` (partial title visible).
    - **Layer 3 (right side, ~x 460 → 940, y 380 → 700):** a **game-concept mockup / screenshot** — bright dreamy background with pink/lavender clouds + a purple game panel titled `PLUSH POP · MATCH 3 TO WIN` showing a **match-3 puzzle grid** with cute pastel emoji-icons (hearts, stars, moons, suns). Panel also shows `GOAL 10 / MOVES 18 / SCORE 1,440`. This is Yan's **finished game output** — the thing that resulted from clicking `Claude Fable 5`.
    - **Layer 4 (bottom-left, ~x 60 → 340, y 500 → 900):** a **photograph of a hand holding an iPhone** running the same `PLUSH POP` game — showing the finished experience on-device. Same purple game grid visible on the phone screen.
    - **Layer 5 (bottom-right, ~x 200 → 460, y 850 → 950):** decorative "physical laptop" cutout — subtle photo of a hand on a MacBook keyboard, mostly hidden behind Layer 4. Adds "at the desk" texture.
    - **Composition strategy:** the four layers overlap in a **scrapbook / clip-art collage** style, each rectangular screenshot with sharp corners (no rounded borders), slight drop shadows implying paper-cutout depth. The reader's eye follows: **menu-item click → doc opens → game concept generates → game runs on phone** — a full narrative arc in one visual field. Genius editorial device.

- **Zone C — Bottom floating tweet card (~y 950 → 1120, x 250 → 750):**
    - Second full tweet card, offset to the right (opposite of the top card's left-anchor). Creates diagonal reading rhythm.
    - Same anatomy as Zone A. Content:
        - Profile row: same avatar + `Yan Liu` + verified badge + `@yanliudesign`.
        - Tweet body: `And now this cute little match-3 game works on both my desktop and phone.` — Inter Regular ~22 pt, `#141414`, left-aligned, wraps 2 lines. Word count: ~14.
    - Reads as the **"reveal" tweet** — pairs with the opening tweet to form a **"before → after"** framing around the collage. Beautiful narrative device.

- **Zone D — Chrome:**
    - Left edge (~y 400, x 30): white circular chevron `‹`.
    - (Right edge chevron cropped in this export but implied.)
    - Bottom-centre (~y 1230): 9-dot indicator, **dot 5 filled coral-pink** (`#FF7A75` accent-colour active style, same as image 44). Confirms dot-indicator styling is stable across the Yan Liu carousel.

#### Palette (extracted, this slide)

- **Slide bg:** `BG_WARM_CREAM_PERSONAL ≈ #E6DFD1` (reused from image 43).
- **Card bg:** `#FFFFFF` (reused).
- **Card ink:** `INK_NEAR_BLACK = #141414` (reused).
- **Handle grey:** `#7A7A7A` (reused).
- **X brand blue:** `#1D9BF0` (reused, verified badge).
- **NEW: `SELECTION_BLUE ≈ #3B7EDC`** — the macOS context-menu selection highlight colour. Same family as X-brand-blue but slightly deeper/less saturated. Recommend as a **system-UI palette token** — for rendering realistic OS-UI mockups (context menus, form-field focus states, macOS-selection bars).
- **NEW dot-active colour:** `#FF7A75` (`ACCENT_CORAL_PINK` reused from image 44). Confirms this is the **carousel-level accent-colour token** for the Yan Liu series.

**Palette-role additions:**
| Role | Token | Hex |
|---|---|---|
| `selection-blue` (macOS UI selection highlight) | `SELECTION_BLUE` | `~#3B7EDC` |

#### Typography

- **Tweet body text:** Inter Regular ~22 pt, `#141414`, left-aligned. Same size and weight for both tweets.
- **Profile display name:** Inter Bold ~22 pt, `#141414`.
- **Handle:** Inter Regular ~16 pt, `#7A7A7A`.
- **Context menu items:** small system UI font (San Francisco / SF Pro on macOS), ~14 pt, `#141414` on white / `#FFFFFF` on selection-blue.

**No new fonts** — this slide is asset-driven (screenshots baked into a montage), so most of its text is inside PNG assets not procedurally-rendered.

#### Iconography / decorative primitives

- **NEW composition pattern: `screenshot-collage-montage`** — a layered stack of N screenshot rectangles overlapping to imply a workflow narrative. Anatomy: each layer is a `FabricImage` positioned at `{x, y}` with configurable `zIndex` and subtle drop-shadow. Some layers may overlap ~30-40% for a scrapbook feel.
    - Recommend: `makeScreenshotCollage({ layers: Array<{ url, position, size, zIndex, dropShadow? }>, x, y, width, height })` — the whole collage as one composable primitive.
- **NEW UI-mockup primitive: `macos-context-menu`** — a stylised recreation of a macOS right-click context menu (rounded white bg, dark ink menu items, one item highlighted with `SELECTION_BLUE` band + white text, optional hand-cursor overlay). Very specific but reusable for any "click this menu item to trigger workflow" demo.
    - Options for reproduction:
        1. Ship as a PNG asset (simplest).
        2. Build with Fabric primitives: `makeContextMenu({ items: Array<{ label, isHighlighted }>, cursor?: { x, y }, width, x, y })` — programmatic version.
        - **Recommend option 2** for flexibility, so LLM can specify which menu item to highlight without regenerating a PNG.
- Chrome: L/R chevrons + dot indicator (with `activeStyle: "accent-color"`).

#### Motion / interaction affordance

- Static, but the **collage layers imply temporal progression**: top-left context-menu click → mid design-doc appears → concept-art generates on right → finished game runs on iPhone bottom-left. Reader's eye moves in a **rough Z-pattern** through the composition, mimicking a screen-recording of the workflow.
- The **tweet-sandwich structure** (before-tweet at top + after-tweet at bottom) frames the collage as a **case-study** — "here's what I said before, here's what happened, here's what I said after".
- This is the **densest single slide** in our reference set — combines: tweet screenshots × 2 + macOS UI mockup + document screenshot + game concept art + product photograph + dot indicator + chevron. Yet reads clearly because of the sandwich composition + strong visual hierarchy (the highlighted menu-item is the entry point).

#### Template family & LLM prompt structure

**Template:** `aurora-product-body` with `bodyLayout: "tweet-sandwich-with-work-collage"` — **NEW 15th confirmed body layout**.

Running total now (14 → 15):
1-14 (see image 44)
15. `tweet-sandwich-with-work-collage` (45) ← NEW

**Full LLM output contract (image 45 exemplar):**
```json
{
  "template": "aurora-product-body",
  "bodyLayout": "tweet-sandwich-with-work-collage",
  "slideBackground": {
    "role": "warm-cream-personal",
    "hex": "#E6DFD1"
  },
  "tweets": {
    "before": {
      "avatar": { "url": "…", "size": 52 },
      "displayName": "Yan Liu",
      "handle": "@yanliudesign",
      "verified": { "platform": "x" },
      "bodyText": "Just experimented with Claude Fable 5 in Claude Design. Less than 20 minutes. Less than 5 prompts.",
      "position": { "x": 65, "y": 100 },
      "size": { "w": 510, "h": 165 }
    },
    "after": {
      "avatar": { "url": "…", "size": 52 },
      "displayName": "Yan Liu",
      "handle": "@yanliudesign",
      "verified": { "platform": "x" },
      "bodyText": "And now this cute little match-3 game works on both my desktop and phone.",
      "position": { "x": 250, "y": 950 },
      "size": { "w": 500, "h": 170 }
    }
  },
  "collage": {
    "layers": [
      {
        "type": "macos-context-menu",
        "items": ["Open...", "Step Backward", "Copy", "Claude Fable 5", "File Info", "Print...", "Exit"],
        "highlightedItemIndex": 3,
        "cursorOverlay": true,
        "position": { "x": 90, "y": 260 },
        "size": { "w": 170, "h": 165 },
        "zIndex": 5
      },
      {
        "type": "screenshot",
        "url": "…claude-design-doc.png",
        "position": { "x": 260, "y": 260 },
        "size": { "w": 680, "h": 430 },
        "zIndex": 2
      },
      {
        "type": "screenshot",
        "url": "…plush-pop-concept.png",
        "position": { "x": 460, "y": 380 },
        "size": { "w": 480, "h": 320 },
        "zIndex": 3
      },
      {
        "type": "photograph",
        "url": "…iphone-with-game.png",
        "position": { "x": 60, "y": 500 },
        "size": { "w": 280, "h": 400 },
        "zIndex": 4
      }
    ]
  },
  "chrome": {
    "navChevrons": { "showLeft": true, "showRight": true, "style": "white-circle" },
    "dotIndicator": {
      "total": 9,
      "current": 5,
      "activeStyle": "accent-color",
      "activeColor": "#FF7A75"
    }
  }
}
```

**Renderer / Fabric helpers required:**
- `makeSocialCard({ variant: 'chip' | 'tweet' | 'full-canvas', avatar, displayName, handle, verified, bodyText?, position, size, cardBg, cornerRadius, dropShadow })` — extend from image 43's `makeSocialProfileCard` to accept an optional `bodyText` slot, making it a full tweet card when set. **Refactor image 43's primitive to use this consolidated helper.**
- `makeScreenshotCollage({ layers, x, y, width, height, layerDefaults })` — the multi-layer overlapping-screenshot composition. Each layer has `type` (screenshot / photograph / macos-context-menu / etc.), `url` or type-specific content, `position`, `size`, `zIndex`, optional `dropShadow`.
- `makeMacOSContextMenu({ items, highlightedItemIndex, cursorOverlay, width, x, y })` — programmatic macOS context menu (white rounded bg, ink items, one selection-blue-highlighted row, optional hand-cursor).

**LLM prompt hooks:**
- `bodyLayout: "tweet-sandwich-with-work-collage"` should be selected for **workflow-demo / case-study slides** where the creator wants to pair "before tweet + after tweet + evidence" in one slide. Common in developer / designer case-study carousels.
- **Tweet-sandwich narrative arc:** the "before" tweet sets the context/challenge, the "after" tweet reports the result. LLM must generate a **pair** of tweets that read as sequential — before is anticipation, after is retrospection.
- **Collage narrative arc:** ~3-5 layers, each showing one stage of the workflow. LLM should specify layer content in **chronological workflow order** (menu → doc → concept → running product). Renderer places them in a Z-pattern for natural reading flow.
- **Screenshot assets must be user-supplied** — this is a case-study template, so the screenshots are the creator's actual work. LLM should not fabricate; must accept `layers[].url` from the user.

#### IG safe-zone check
- Top tweet card at y≈100–260 — top ~100 px of the card is inside the 200-px avatar-bar risk zone. The top of the card (avatar + display name) may be partially clipped. Recommend lowering to y≥210 in production. Since the card has a rounded corner + drop shadow, some clipping is acceptable visually (unlike a rectangular photo).
- Collage at y≈280–900 — fully in safe content zone.
- Bottom tweet card at y≈950–1120 — comfortably above the 1170-px bottom-CTA-overlay boundary. Safe.
- Dot indicator at y≈1230 — inside the CTA overlay risk zone (decorative, as usual).

#### Reusability score
- **`tweet-sandwich-with-work-collage` body layout:** 5/5 — genuinely one of the most powerful case-study slide patterns seen so far in the reference set. Every dev-tool / design-tool / creator-tool company will want this exact composition to showcase user workflows.
- **`makeSocialCard` with `variant: 'tweet'` (with bodyText):** 5/5 — universally applicable for any "here's a tweet I sent" quote/testimonial context.
- **`makeMacOSContextMenu` primitive:** 4/5 — niche but distinctive; reusable for any "click this menu item" workflow demo. Related family should include `makeIOSContextMenu`, `makeAndroidContextMenu`, `makeChromeRightClickMenu` for the ecosystem.
- **`makeScreenshotCollage` primitive:** 5/5 — reusable across any case-study / portfolio / workflow-demo composition where multiple screens tell a story.
- **Tweet-sandwich narrative pattern:** 5/5 — a canonical rhetorical device (before-tweet + evidence + after-tweet) that maps to countless case-study scenarios.

#### Template pattern classification (final)

- **`aurora-product-body`** with `bodyLayout: "tweet-sandwich-with-work-collage"`.
- Sits in a **NEW composition-subfamily**: `workflow-case-study` — slides that show a creator's workflow narrative with paired social-media quotes framing a work-artefact collage. Companion patterns:
    - `pull-quote-with-live-artefact` (image 44) — one quote + one artefact.
    - `tweet-sandwich-with-work-collage` (image 45) — two quotes + N-layer artefact collage.
    - Future: `single-tweet-with-embedded-media` (one quote + N inline images).

#### Copy-pattern hint (LLM writer)

- **Tweet-sandwich formula:**
    - **Before tweet:** `"Just [action-verb] [product/feature]. Less than [N] [time-unit]. Less than [M] [effort-unit]."` — factual, understated, brag-with-numbers. Example verbatim: `"Just experimented with Claude Fable 5 in Claude Design. Less than 20 minutes. Less than 5 prompts."`. LLM should use the **"less than X, less than Y"** rhetorical device for constraint-based bragging.
    - **After tweet:** `"And now [result-noun-phrase] works on [scope]."` — announces the outcome. Uses "And now" as a **temporal-narrative connector**. Example verbatim: `"And now this cute little match-3 game works on both my desktop and phone."`.
- **Voice consistency across the sandwich:** the same person (with the same handle + avatar) posts both tweets. LLM should ensure the two tweets sound like a sequence, not two disconnected observations.
- **Word count:** 12-20 words per tweet. Tweets should be Twitter-length, not paragraphs.

#### Notes / open questions

- **Context menu with hand-cursor + highlighted `Claude Fable 5` item is a scroll-stopper design detail.** Reader's eye MUST land on it because it's the only interactive-looking element in the slide. Genius composition — Yan is essentially saying "watch this exact click that started everything". Recommend our LLM writer be trained to identify a **"decisive moment"** in any workflow narrative (the specific action that triggered the outcome) and give it visual emphasis via a highlighted UI element.
- **The Claude Design + Claude Fable references** are product features Anthropic launched — this slide is Yan Liu's testimonial / demo of using them. Confirms she's an Anthropic-adjacent creator (probably works or partners with them), which is why her carousel ends up in the `claude/` folder alongside 5 Anthropic-owned carousels. **The folder is thus "Anthropic + Anthropic-community" content**, not strictly-Anthropic.
- **Screenshot montage requires 4 pre-cropped assets** — this template has a real asset-pipeline requirement. Alternatives:
    1. User provides 4 screenshot URLs (Yan Liu's actual approach).
    2. Renderer supports a **"placeholder collage"** with grid-shapes + labels for design-preview mode, then swap in real screenshots later.
    3. AI image-gen generates stylised mock screenshots per topic. Uncontrolled fidelity.
    - Recommend option 1 for MVP.
- **Layer overlap ratio is important.** Layers on this slide overlap by ~30-40% — enough to imply grouping, not so much they hide each other's essential content. Our `makeScreenshotCollage` helper should have a **collision-detection warning** — if layers overlap >60%, flag as design issue.
- **This slide has NO section heading, NO closing finding, NO body paragraph.** The two tweets ARE the copy. The collage IS the content. **Slide-body density = zero words the creator wrote directly — all copy is quoted from real tweets**. Interesting minimalist creator-move. LLM writer for this template just needs to generate the two tweet strings; everything else is layout + asset.
- **The bottom tweet card has a slightly-updated Yan Liu avatar** — same subject, different photo (wider crop, slightly different pose). Suggests the tweets are from **different real timestamps**, not synthetic. This is authentic content, not fabricated. Recommend our system flag when tweet cards should use "real screenshots" vs "recreated tweet compositions" — different LLM copy-generation modes.
- **Prediction for slides 46-47:** based on personal-brand carousel conventions + Yan Liu's demonstrated range (photo-hero-intro, dark-cosmic-manifesto, workflow-case-study), remaining slides likely include: `project-showcase-grid` (multiple past projects with thumbnails), `tool-stack-icons` (list of tools/tech), or `cta-with-social-icons` (contact/follow outro). May introduce 1-2 more body-layout variants.

_Progress: 45 / 85 complete._

---

### Image 46 — `claude/image copy 23.png` (Yan Liu carousel, slide 8 of 9)

#### Visual summary
- **Warm-cream background** — reuses `BG_WARM_CREAM_PERSONAL ≈ #E6DFD1` (Yan Liu's carousel-locked cream, first established in image 43).
- **Three-zone vertical composition** — this is a NEW composition pattern for the reference set:
  1. **Top zone (y≈100–460):** large serif pull-quote, left-aligned, wraps to 3 lines. `"I usually start with a simple idea, but I have a clear vision of what I want to achieve."` — Fraunces Regular, ~62-66 pt, `#141414`, curly quotes. Slightly heavier / larger than image 44's manifesto quote (which was ~52 pt Fraunces Regular on dark cosmic bg).
  2. **Middle zone (y≈500–1000):** full-width landscape **screenshot embed** of the `Tulip Bloom Atlas` app running inside Claude Design (Yan Liu's Anthropic-adjacent product tool). Screenshot is **not** a multi-layer collage (contrast to image 45) — it is a single unified rectangular UI capture with subtle drop shadow + slight corner rounding (~12 px).
  3. **Bottom zone (y≈1030–1220):** closing prose paragraph, sans-serif Regular, ~24 pt, `#141414`, left-aligned, wraps to 6 lines. Verbatim: `From there, I iterate through lots of small decisions. I'm not asking Claude to 'make something beautiful'. I give it specific direction, then keep adjusting the colors, details, pacing, copy, flow, and interactions until the result feels closer to what I imagined.` (nested curly single-quotes inside outer sentence, no ALL-CAPS, no bold).
- **9-dot progress indicator** bottom-centre, dot 8 filled coral-pink (`#FF7A75`), remaining dots muted grey — confirms position 8/9 in the Yan Liu carousel.
- **Navigation chevrons** in white-circle style, left + right, at vertical centre of the screenshot embed.

#### Screenshot detail (Tulip Bloom Atlas UI, embedded artefact)
- **Dark-mode canvas** (`#0A0A0C` ≈ `BG_COSMIC_DARK`, reused from image 44) — creates a striking dark-inside-cream sandwich effect.
- **Left panel (~35% width):** chat UI. Sender label `You`, message body: multi-line prompt reading roughly `"Build a simple, interactive 3D-globe visualization using a dark mode UI to display worldwide tulip blooming seasons..."`. Ink is `INK_ON_DARK #FFFFFF`, muted metadata in `INK_MUTED_ON_DARK #B0B0B0`.
- **Centre panel (~50% width):** globe canvas.
  - Header: `Tulip Bloom Atlas` (Fraunces Regular ~24 pt on dark), sub-header `WORLDWIDE SEASONAL INDEX 2026` (ALL-CAPS sans, tracked, muted grey).
  - 3D globe rendered with muted stroke `#666676`, coral-pink hotspot dots (`#FF7A75`) plotting bloom locations.
  - **Floating annotation card** overlaid on globe: `Skagit Valley / 48.44° N, 122.34° W / PACIFIC NW BLOOM FESTIVAL / BLOOM WINDOW / PEAK Apr 4`. Card top-left holds a small tulip photograph thumbnail (~56×56 px, rounded 8 px). Card bg `CARD_BG_ELEVATED #1A1A1E`, subtle border, drop shadow.
  - **Bottom mini timeline chart** with axis label `BLOOM PEAK MONTH` — line/area chart, coral-pink stroke, muted-grey gridlines. Mirrors image 44's mini-chart primitive.
- **Right sidebar (~15% width):** `TWEAKS` panel — vertical list of UI controls in the dark-mode design system. Labels seen: `MARKER STYLE`, `COLOR THEME`, `GLOBE UI`, `ROTATION SPEED`, `COUNTRY BORDERS`, `SHOW GRATICULE`. Bottom of sidebar has three action buttons: `AUTO-ROTATE`, `RESET VIEW`, `TWEAKS`.
- **No chrome/frame** around the screenshot — no browser bar, no macOS window traffic-lights. It's a **clean UI capture** presented as a design-object rather than an authenticity-photograph. Contrast to image 45's collage, where macOS chrome (context menu + cursor) was part of the storytelling.

#### Template pattern
- **`aurora-product-body`** family, **NEW `bodyLayout: "pull-quote-with-full-width-screenshot"`** — 16th confirmed variant.
- Differs from image 44's `pull-quote-with-live-artefact` — that had `quote-top + artefact-bottom` (2-zone) on dark bg with a 3D-globe artefact. This slide has `quote-top + screenshot-middle + prose-bottom` (3-zone) on cream bg with a screenshot artefact.
- Differs from image 45's `tweet-sandwich-with-work-collage` — that had multi-layer overlapping screenshots as evidence between two tweet cards. This is a single unified screenshot bracketed by editorial pull-quote + interpretive prose (not tweets).
- Composition subfamily: **`quoted-artefact-interpretation`** — quote sets up creative principle, artefact demonstrates it, closing prose interprets it. A canonical craft-manifesto layout that reads top-to-bottom as ONE argument.

#### Composition JSON (fully spec'd for renderer)
```json
{
  "template": "aurora-product-body",
  "subVariant": "personal-brand",
  "creator": "yan-liu",
  "bodyLayout": "pull-quote-with-full-width-screenshot",
  "canvas": { "w": 1080, "h": 1350, "bg": "#E6DFD1" },
  "content": {
    "pullQuote": {
      "text": "I usually start with a simple idea, but I have a clear vision of what I want to achieve.",
      "font": "Fraunces",
      "weight": "regular",
      "size": 64,
      "lineHeight": 1.15,
      "color": "#141414",
      "align": "left",
      "quoteMarks": "curly",
      "x": 72,
      "y": 100,
      "maxWidth": 936,
      "expectedLines": 3
    },
    "artefact": {
      "type": "screenshot",
      "url": "…tulip-bloom-atlas-claude-design.png",
      "x": 60,
      "y": 500,
      "width": 960,
      "height": 480,
      "cornerRadius": 12,
      "dropShadow": { "offsetY": 12, "blur": 32, "color": "rgba(0,0,0,0.18)" },
      "innerBg": "#0A0A0C",
      "onArtefactAnnotations": [
        {
          "type": "on-artefact-card",
          "title": "Skagit Valley",
          "subtitle": "48.44° N, 122.34° W",
          "eyebrow": "PACIFIC NW BLOOM FESTIVAL",
          "dataRows": [
            { "label": "BLOOM WINDOW", "value": "Mar 22 → May 1" },
            { "label": "PEAK", "value": "Apr 4" }
          ],
          "thumbnail": { "url": "…tulip-photo-thumb.jpg", "size": 56, "cornerRadius": 8 }
        }
      ]
    },
    "closingProse": {
      "text": "From there, I iterate through lots of small decisions. I'm not asking Claude to 'make something beautiful'. I give it specific direction, then keep adjusting the colors, details, pacing, copy, flow, and interactions until the result feels closer to what I imagined.",
      "font": "Inter",
      "weight": "regular",
      "size": 24,
      "lineHeight": 1.45,
      "color": "#141414",
      "align": "left",
      "x": 72,
      "y": 1030,
      "maxWidth": 936,
      "expectedLines": 6
    }
  },
  "chrome": {
    "navChevrons": { "showLeft": true, "showRight": true, "style": "white-circle" },
    "dotIndicator": {
      "total": 9,
      "current": 8,
      "activeStyle": "accent-color",
      "activeColor": "#FF7A75"
    }
  }
}
```

**Renderer / Fabric helpers required (mostly reuse):**
- Reuse `makeArtefactPanel({ type: 'screenshot', ... })` from image 44 — but this slide confirms the helper must support `type: 'screenshot'` with a landscape aspect (~2:1) and no globe-specific chrome. Extend the type union to `'3d-globe' | 'screenshot' | 'photo' | 'chart' | 'video-still'`.
- Reuse `makeOnArtefactCard({ ... })` from image 44 — same annotation-card pattern (title, eyebrow, data-rows, optional thumbnail).
- Reuse `makeMiniTimelineChart({ ... })` from image 44 — the `BLOOM PEAK MONTH` bottom chart inside the screenshot is a rendered artefact, though in practice the screenshot is a captured PNG, not rendered by our engine. **Design note:** if we were re-rendering the app in-engine (e.g. for animation), we'd need these helpers; for static reference cases like this slide, we just need `makeArtefactPanel` to place the PNG.
- Reuse `makeDotProgressIndicator({ ..., activeStyle: 'accent-color', activeColor: '#FF7A75' })` — same as images 43/44/45.
- **NEW extension:** `makeArtefactPanel` should optionally support `frame` prop — `frame: 'none' | 'macos-window' | 'browser' | 'iphone' | 'ipad'` — for slides that want to wrap the screenshot in a device chrome. This slide uses `frame: 'none'`, but sister slides may want device-frames.

#### LLM prompt hooks
- `bodyLayout: "pull-quote-with-full-width-screenshot"` should be selected for **craft-manifesto slides** in personal-brand carousels — where the creator states a working philosophy, then shows an in-progress artefact that embodies it, then interprets the connection in a closing paragraph.
- **Pull-quote formula (craft-manifesto):** `"I usually [action-A], but I [contrasting-action-B]."` — contrast between two working modes is the rhetorical engine. Yan's version: "start simple BUT have a clear vision". This is a **paradox-of-craft** device (X and not-X are both true at once), signalling nuance / maturity. LLM should generate quotes with this X-but-not-X contrastive structure.
- **Closing prose formula:** `"From there, I [iterative-verb-phrase]. I'm not [naive-approach]. I [specific-approach], then [refinement-loop]."` — a **process-descriptor paragraph** that unpacks the pull-quote's abstraction into concrete craft steps. Should always include:
  - A **rejection clause** (`I'm not asking Claude to 'make something beautiful'`) — states what the naive/lazy approach looks like.
  - A **contrast clause** (`I give it specific direction, then...`) — states the actual (harder, better) approach.
  - A **refinement-loop clause** (`keep adjusting the colors, details, pacing...`) — enumerates the fine-grained levers of iteration. **Long list of comma-separated adjustables is a signature craft-manifesto move** — signals "I care about many small things".
- **Screenshot must be user-supplied.** Same as image 45's collage requirement — this is documentary content, not synthesised. LLM should not fabricate; must accept a URL.
- **Quote-to-prose thematic link:** the LLM must ensure the closing prose paragraph is a **direct commentary on the pull-quote**, not a tangent. In this slide, quote says "simple idea + clear vision" → prose says "small decisions + specific direction + iteration". The commentary is: *the clear-vision-from-simple-idea IS achieved through iterative small decisions with specific direction*. LLM should generate quote + prose as a **pair** with explicit thematic connection.

#### IG safe-zone check
- Pull-quote at y≈100–460 — top ~100 px overlaps the 200-px avatar-bar risk zone. Only the top of the opening curly-quote glyph would be clipped, which is aesthetically acceptable (readers still parse the quote). Recommend nudging y≥140 in production for cleaner clearance.
- Screenshot at y≈500–980 — fully inside safe content zone. No clipping risk. Good composition anchor.
- Closing prose at y≈1030–1220 — the last line (~y 1180-1220) may sit inside the 1170-px bottom-CTA-overlay risk zone. Since the prose ends mid-sentence-flow (no critical single word at line 6), some overlay clipping is tolerable. Recommend line-height tightening or shorter prose (5 lines instead of 6) for guaranteed safety.
- Dot indicator at y≈1230 — inside the CTA overlay risk zone, decorative-only, acceptable.

#### Reusability score
- **`pull-quote-with-full-width-screenshot` body layout:** 5/5 — extremely reusable for any craft / product / design commentary carousel. This is the canonical "here's my principle + here's my work + here's my interpretation" slide.
- **`makeArtefactPanel` extension to support screenshot type + frame variants:** 5/5 — a universally reusable primitive for embedding UI captures in slides.
- **Three-zone vertical composition (quote / artefact / prose):** 5/5 — pattern applies far beyond Yan Liu's carousel. Every personal-brand craft carousel benefits from this rhythm.
- **Nested-curly-quote punctuation inside prose:** 3/5 — a subtle typographical detail that signals writerly polish, worth preserving in generated copy. LLM should be allowed (not required) to use `'inner'` quotes when the outer sentence is a statement without outer quotes.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "pull-quote-with-full-width-screenshot"`.
- Composition subfamily: **`quoted-artefact-interpretation`** (Yan Liu's craft-manifesto voice) — companion to `pull-quote-with-live-artefact` (image 44) and `tweet-sandwich-with-work-collage` (image 45). All three form the **personal-brand-workflow-case-study family** within `aurora-product-body`.

#### Copy-pattern hint (LLM writer)
- **Pull-quote character count:** ~90 chars target (Yan's is 88 chars). Fits 3 lines at ~30 chars/line, Fraunces 64 pt.
- **Closing prose character count:** ~260-280 chars target (Yan's is 273 chars). Fits 6 lines at ~45 chars/line, Inter 24 pt.
- **Pull-quote/prose voice consistency:** first-person "I" throughout. Present tense for principles (`I usually start...`), habitual present for process (`I iterate through...`, `I give it...`, `keep adjusting...`). No past tense.
- **No product name in the quote or prose.** Yan mentions "Claude" only in the rejection clause (`I'm not asking Claude to...`) — the product is a **tool being wielded**, not the subject. This subordinates the tool to the craft. LLM should NOT lead with product name; the creator's craft is the subject.
- **List enumeration:** "the colors, details, pacing, copy, flow, and interactions" — 6 items. Rule of thumb: 5-7 comma-separated adjustables per refinement-loop clause. Fewer feels shallow, more feels exhausting.

#### Notes / open questions
- **The screenshot showcases Yan Liu's own project (`Tulip Bloom Atlas`) built inside Anthropic's own tool (`Claude Design`).** This is a **meta-reference**: creator uses brand-product to build their own product, then features the workflow. Confirms `claude/` folder taxonomy as `Anthropic + Anthropic-community-showcase`. Recommendation for our LLM writer: when generating personal-brand craft-manifesto content targeting a specific tool ecosystem, include an **artefact-built-in-the-tool** slide that demonstrates the philosophy in a real project.
- **The three-zone composition doubles as a "silent tutorial"** — a reader who never reads the quote or prose can still learn what the slide is about by looking at the screenshot. Recommend flagging this as a **strong slide** — accessible at both fast-scroll and deep-read tempos. Our slide QA scorer should reward slides where the artefact alone communicates the essence.
- **The `Tulip Bloom Atlas` screenshot uses the same dark-mode design language as image 44's globe** — same coral-pink accent, same `CARD_BG_ELEVATED`, same `INK_MUTED_ON_DARK`. This is Yan's **personal design system** carried across her demonstrated projects. Design-system consistency across a creator's carousel-embedded artefacts is a strong authenticity signal.
- **The pull-quote has no attribution byline** — because the entire carousel is authored by Yan, self-quotation is implicit. Contrast with editorial pull-quote slides (SahilBloom's essay templates) where quotes are typically attributed. Rule: **no byline needed when the deck's cover has established the author**.
- **The 3-zone composition consumes more vertical space than most slides in the reference set.** With the screenshot at 480 px + quote at ~360 px + prose at ~190 px + gaps + top/bottom padding, the slide is at ~1220 px of used content in a 1350 px canvas. Tight but not overflowing. Any expansion of any zone forces trade-offs. **Design constraint:** LLM must respect the 6-line max on prose and 3-line max on quote.
- **Prediction for slide 47 (image 47, final slide):** given 9-slide arc structure and Yan Liu's demonstrated repertoire, slide 9 is most likely a **CTA / outro / follow-me slide** — probably featuring her handles across platforms (`@yanliudesign`), a subscribe CTA, or a "thanks for reading" pull-quote with her portrait. May introduce a new bodyLayout variant `outro-cta-with-avatar` or reuse `photo-hero-with-floating-social-card` (image 43) with an outro-flavoured caption.

_Progress: 46 / 85 complete._

---

### Image 47 — `claude/image copy 24.png` (Yan Liu carousel, slide 9 of 9 — final)

#### Visual summary
- **Warm-cream background** — reuses `BG_WARM_CREAM_PERSONAL ≈ #E6DFD1` (Yan Liu's carousel-locked cream, established in images 43, 45, 46).
- **NEW composition: `four-corner-project-showcase-grid-with-central-pull-quote`** — the whole slide is a **2×2 grid of product-preview cards** (each a screenshot of one Yan Liu project), with a **serif pull-quote overlaid across the horizontal centre** bridging the top row and bottom row. Reads as an **outro / portfolio summary** slide — "here's my body of work + the philosophy that ties it all together".
- **Top row of grid (y≈0–290, full-width bleed):**
  - **Top-left card (~x 40–305):** `Skagit Valley` annotation card from image 46's Tulip Bloom Atlas — reused as a compressed teaser. Dark bg (`#0A0A0C`), coral-pink accent, `USA · WASHINGTON` eyebrow, `Skagit Valley` Fraunces title, `COORDINATES 48.44° N, 122.34° W / CULTIVAR NOTE PACIFIC NW BLOOM FESTIVAL / BLOOM WINDOW [mini timeline chart] / PEAK Apr 6`.
  - **Top-right card (~x 335–1080):** landscape screenshot of `Whisk Up Something Calm` — a matcha-drink product landing page. Dark green bg (`~#4A5A3A` deep matcha green), photograph of a matcha latte in a stone cup with matcha powder scoop beside it, all-caps display serif headline `WHISK UP / SOMETHING CALM` (2 lines), tiny eyebrow `CEREMONIAL MATCHA · CRAFTED DAILY`, small pill buttons at bottom (`ADOPT`, `FIND MORE`). New Yan Liu project — a matcha-brand landing page.
- **Middle band — pull-quote (y≈340–500, spanning full width, centred):**
  - `"The space between 'What if...?' and 'I made this' feels much smaller."` — Fraunces Bold ~54-58 pt, `#141414`, centred, wraps 3 lines. Curly outer double quotes + nested curly single quotes around `'What if...?'` and `'I made this'`. Ellipsis (three-dot glyph `…`) inside the first nested phrase.
  - This is Yan Liu's **thesis statement** — the intellectual through-line of her whole carousel. Perfect outro-slide device: after 8 slides of showing work + philosophy, one final quote synthesises everything.
- **Bottom row of grid (y≈530–780):**
  - **Bottom-left card (~x 40–370):** dark bg pixel-art scene — `DESIGN` set in pixelated bitmap-font white letters over a black-with-stars sky, city skyline silhouette in pixel-art below. Reads like a retro-game or 80s-computing screenshot. Suggests Yan Liu has a pixel-art / retro-computing side project.
  - **Bottom-right card (~x 400–785):** another annotation card in the same design language as top-left (dark bg, coral-pink accent). Header: photograph of pale-orange tulips (small square thumbnail top). `USA · WASHINGTON` eyebrow. `Seattle` Fraunces title. Data rows: `COORDINATES 47.61° N, 122.33° W / CULTIVAR NOTE VIBRANT ORANGE & PINK`. Small `×` close-glyph top-right (mimics a dismissible-card UI).
- **Left-edge chevron** (~y 400, x 30): white circular nav chevron `‹`, standard primitive.
- **Bottom dot indicator** (~y 780): **9-dot indicator**, dot 9 filled coral-pink `#FF7A75`, others muted white — confirms this is the final slide (9/9) of the Yan Liu carousel. **NO next chevron** — nothing to swipe to.

#### Template pattern
- **`aurora-product-body`** family, **NEW `bodyLayout: "project-showcase-grid-with-central-quote"`** — 17th confirmed variant.
- Composition subfamily: **`outro-portfolio-summary`** — a canonical carousel-final slide that showcases N projects + one thesis quote. Companion to Yan Liu's other slides but structurally distinct — unlike images 43 (photo-intro), 44 (manifesto), 45 (workflow-case-study), 46 (craft-manifesto), this slide is a **retrospective summary** rather than a single-focus statement.
- Grid config: **2×2 project-preview cards** with variable-height rows to accommodate the central pull-quote insertion. Cards vary in content type: annotation cards (2×), landing-page screenshot (1×), pixel-art asset (1×). Confirms the outro grid is **content-heterogeneous** — each cell showcases a different medium.

#### Composition JSON (fully spec'd for renderer)
```json
{
  "template": "aurora-product-body",
  "subVariant": "personal-brand",
  "creator": "yan-liu",
  "bodyLayout": "project-showcase-grid-with-central-quote",
  "canvas": { "w": 1080, "h": 810, "bg": "#E6DFD1" },
  "note": "Slide crop appears wider-aspect (~1080×810) than standard 1080×1350. May be a Reel/story-format export rather than square carousel; verify aspect at asset-inspection time. Adjust y-coords to canvas.h if 1350.",
  "content": {
    "projectGrid": {
      "rows": 2,
      "cols": 2,
      "cells": [
        {
          "row": 0, "col": 0,
          "type": "annotation-card",
          "cardBg": "#0A0A0C",
          "content": {
            "eyebrow": { "text": "USA · WASHINGTON", "accentDot": "#FF7A75" },
            "title": { "text": "Skagit Valley", "font": "Fraunces-Regular", "size": 22, "color": "#FFFFFF" },
            "dataRows": [
              { "label": "COORDINATES", "value": "48.44° N, 122.34° W" },
              { "label": "CULTIVAR NOTE", "value": "PACIFIC NW BLOOM FESTIVAL" }
            ],
            "miniChart": { "type": "timeline-bars", "label": "BLOOM WINDOW" },
            "footerRow": { "label": "PEAK", "value": "Apr 6" }
          },
          "reusesFromSlide": 46,
          "reason": "Callback to slide 46's Tulip Bloom Atlas artefact — reinforces recognition"
        },
        {
          "row": 0, "col": 1,
          "type": "landing-page-screenshot",
          "url": "…whisk-up-something-calm-matcha.png",
          "cardBg": "#4A5A3A",
          "content": {
            "eyebrow": "CEREMONIAL MATCHA · CRAFTED DAILY",
            "headline": { "text": "WHISK UP\nSOMETHING CALM", "font": "serif-display-caps", "lines": 2 },
            "photograph": "matcha-latte-in-stone-cup",
            "ctaPills": ["ADOPT", "FIND MORE"]
          },
          "represents": "Yan Liu project: matcha-brand landing page"
        },
        {
          "row": 1, "col": 0,
          "type": "pixel-art-preview",
          "url": "…design-pixelart-cityscape.png",
          "cardBg": "#000000",
          "content": {
            "headline": { "text": "DESIGN", "font": "bitmap-pixel", "color": "#FFFFFF" },
            "sceneElements": ["stars", "city-skyline-silhouette", "space-needle"]
          },
          "represents": "Yan Liu project: retro / pixel-art design piece (city = Seattle)"
        },
        {
          "row": 1, "col": 1,
          "type": "annotation-card",
          "cardBg": "#0A0A0C",
          "content": {
            "thumbnail": { "url": "…tulips-orange-photo.jpg", "size": 90, "cornerRadius": 8 },
            "eyebrow": { "text": "USA · WASHINGTON", "accentDot": "#FF7A75" },
            "title": { "text": "Seattle", "font": "Fraunces-Regular", "size": 22, "color": "#FFFFFF" },
            "dataRows": [
              { "label": "COORDINATES", "value": "47.61° N, 122.33° W" },
              { "label": "CULTIVAR NOTE", "value": "VIBRANT ORANGE & PINK" }
            ],
            "closeGlyph": true
          },
          "represents": "Second Tulip Bloom Atlas card — sibling of top-left"
        }
      ]
    },
    "centralPullQuote": {
      "text": "The space between 'What if…?' and 'I made this' feels much smaller.",
      "font": "Fraunces",
      "weight": "bold",
      "size": 56,
      "lineHeight": 1.2,
      "color": "#141414",
      "align": "center",
      "quoteMarks": "curly-outer-double-nested-single",
      "positionSpansRows": true,
      "yFraction": 0.42
    }
  },
  "chrome": {
    "navChevrons": { "showLeft": true, "showRight": false, "style": "white-circle" },
    "dotIndicator": {
      "total": 9,
      "current": 9,
      "activeStyle": "accent-color",
      "activeColor": "#FF7A75"
    }
  }
}
```

**Renderer / Fabric helpers required (mostly reuse):**
- Reuse `makeOnArtefactCard` from image 44 — top-left + bottom-right cells are compressed versions of it.
- Reuse `makeArtefactPanel({type: 'screenshot'})` for the top-right matcha landing-page cell (extend to accept `frame: 'landing-page'` variant).
- **NEW primitive: `makePixelArtPanel({url, cardBg, cornerRadius})`** — simple wrapper for pixel-art / retro screenshot assets. May not need a helper — plain `makeImage` inside a rounded card works.
- **NEW primitive: `makeProjectShowcaseGrid({rows, cols, cells, gapPx, centralQuoteInsert})`** — 2×2 (or N×M) grid with configurable cells and an optional **band-inserted pull-quote** that spans the horizontal midline. Reader parses top row → quote → bottom row.
- Reuse `makePullQuote` from image 33 (with curly outer + nested single-quotes support). Confirm the primitive handles ellipsis `…` (U+2026, not three dots `...`) inside nested quotes — Yan's uses the real ellipsis glyph.

#### LLM prompt hooks
- `bodyLayout: "project-showcase-grid-with-central-quote"` should be selected for **carousel outro / portfolio-summary slides** — where the creator wants to signal "here's my body of work" + "here's my synthesising thought" in one final slide. Common in personal-brand / design-portfolio / product-catalog carousels.
- **Pull-quote formula (outro-thesis):** `"The [abstract-noun] between '[naive-state]' and '[achieved-state]' feels [comparative-adjective]."` — a **temporal-distance / conceptual-distance** framing that compresses the creator's philosophy. Yan's version compresses the gap between "wondering" and "shipping". This is a **maturity signal** — the creator claims to have shortened the distance others struggle with. LLM should generate outro-quotes with this compression-of-distance rhetorical device.
- **Grid content rule:** the 4 cells should be **medium-heterogeneous** (mix of screenshots, cards, illustrations, product photos). Homogeneous grids (4 identical-style screenshots) read as sterile catalogue; mixed media reads as "creator with range". LLM should specify `cells[].type` from a small enum: `annotation-card | landing-page-screenshot | pixel-art-preview | photograph | product-mockup | tweet-card | chart-preview`.
- **Cell content should reuse artefacts from earlier slides where possible.** Yan reuses the Skagit Valley card from slide 46, creating **callback recognition**. LLM should track carousel-level asset registry and reuse ~50% of cells from earlier slides. Fresh cells (50%) preview never-shown-before projects, hinting at the creator's wider portfolio.
- **Central quote is the visual pivot** — reader reads top row → gets grounded → reads quote as summarising context → reads bottom row with that context in mind. LLM should choose a quote that **thematically links** to both the top and bottom cells (Yan's "space between wonder and making" applies equally to Tulip Atlas, Whisk Up matcha, DESIGN pixel-art, and Seattle card).

#### IG safe-zone check
- **Canvas aspect ratio warning:** the crop I read appears wider than typical 1080×1350 (looks ~1080×810 or similar). This may be a **Reel-format export** (1080×1920 with the middle band cropped for preview) OR a standard slide truncated by the export pipeline. Verify at asset-inspection time; the composition JSON above assumes the full 1080×1350 canvas may have additional whitespace above/below what we see.
- Assuming standard 1080×1350: top-row cards at y≈50–290 sit inside the top 200-px avatar-bar risk zone (top ~150 px of each card). Since cards have unique visual identity (dark bg with white text), reader still parses even if partially obscured.
- Central quote at y≈500–800 sits comfortably in mid-canvas safe zone. **The quote is the priority element** and must not be clipped — recommend production LLM ensure quote y-range ≥ 210 and ≤ 1150.
- Bottom-row cards + dot indicator at y≈900–1300 — dot indicator inside CTA overlay risk zone, standard tradeoff.

#### Reusability score
- **`project-showcase-grid-with-central-quote` body layout:** 5/5 — extremely reusable for any carousel outro / portfolio-summary slide. Every personal-brand / design-agency / product-catalog carousel benefits from a synthesising final slide. This is the canonical outro layout.
- **Grid × central-quote composition device:** 5/5 — a strong editorial pattern. Works with 2×2, 3×2, or 2×3 grids depending on project count.
- **Reused-artefact callbacks in grid cells:** 5/5 — rewards attentive readers by re-showing familiar visuals. Best practice for carousel authors, easy for our LLM to enforce via carousel-level asset registry.

#### Template pattern classification (final)
- **`aurora-product-body`** with `bodyLayout: "project-showcase-grid-with-central-quote"`.
- Composition subfamily: **`outro-portfolio-summary`** — sibling to Yan Liu's other bodyLayouts and to the broader carousel "outro" beat. Distinct from `quoted-artefact-interpretation` (image 46) because THIS slide is grid-heavy + retrospective, not single-artefact-focused.

#### Copy-pattern hint (LLM writer)
- **Pull-quote character count:** ~65 chars target (Yan's is 64 chars). Fits 3 lines at ~22 chars/line, Fraunces 56 pt centred.
- **Grid-cell reuse ratio:** aim for 50% reused (from earlier carousel slides) + 50% new (previewing wider portfolio).
- **Grid-cell diversity:** 3-4 distinct visual mediums per grid. Yan uses: dark annotation card, colour landing-page screenshot, black-bg pixel art, dark annotation card. All different aesthetics, unified by "these are all Yan's projects".
- **No caption text on grid cells** — cells are self-labelled by their own content (product name, project name, embedded text). Reader parses each cell autonomously.
- **Quote voice:** third-person / gnomic ("The space between…"), not first-person. Signals a **general philosophical claim** rather than personal experience. Contrast with Yan's other quotes (44, 46) which were first-person "I". Outro quotes shift to universal-voice to make the philosophy transferable.

#### Notes / open questions
- **The `WHISK UP SOMETHING CALM` matcha landing page is a completely new Yan Liu project** — not seen in earlier slides. Suggests she has multiple product-design projects, and the outro previews them. Recommend our LLM writer treat outro grids as **portfolio expansion moments** — introduce 1-2 new projects beyond what the carousel body covered.
- **The `DESIGN` pixel-art panel with a Seattle Space Needle silhouette** hints at Yan's location (Seattle-based designer) + retro-tech affinity. Reinforces the personal-brand narrative. Recommend our LLM writer sprinkle **place / hometown signals** in outro grids when applicable — geographic identity adds warmth.
- **The Seattle annotation card in bottom-right is subtly different** from the Skagit Valley one (top-left): it includes a **photograph thumbnail** in the header (tulips), while Skagit Valley has no photo thumbnail (just the mini-chart). Confirms the `makeOnArtefactCard` primitive supports **optional-thumbnail** variant.
- **The `×` close glyph on the Seattle card** — a small dismissible-UI hint. Reinforces that these are **UI screenshots**, not just decorative cards. Reader gets the impression "these are pieces of software you can interact with". Recommend our system support optional UI-chrome affordances (close buttons, mini-controls) on card primitives when the source material is a real UI capture.
- **The composition is likely a Reel-format export** — the 1080×810 aspect ratio + the compressed vertical rhythm suggests this slide was designed for both static carousel AND vertical Reel viewing. Aspect-adaptive design is a Yan Liu signature. Recommend our system consider **multi-format outputs** for outro slides — the same grid + quote composition works at multiple aspect ratios.
- **This closes the Yan Liu carousel (slides 43-47 in our export set, actual 9-slide carousel).** Reference-set analysis of the `claude/` folder is now complete. Total claude/ folder now: 25 images analysed, spanning **5 Anthropic carousels + 1 Yan Liu personal-brand carousel** = 6 distinct carousels.

_Progress: 47 / 85 complete. Folder 3 (claude/) COMPLETE._

**Folder 3 summary (claude/):**
- **Carousels identified:** 6 total.
  1. Anthropic drug-discovery (images 23–28, 6 slides).
  2. Anthropic language-values (images 29–31, 3 slides visible).
  3. Anthropic AI-researchers (images 32–35, 4 slides).
  4. Anthropic Economic Index (images 36–40, 5 slides visible).
  5. Anthropic anthology "How does AI work?" (images 41–42, 2 slides visible).
  6. Yan Liu personal-brand (images 43–47, 5 slides visible of 9-slide carousel).
- **Canonical templates identified (2 major families, N variants):**
  - `aurora-product-cover` — 5 heroType variants (`3d-render`, `typography-art`, `portrait-strip`, `hand-drawn-illustration`, `connected-mood-board`).
  - `aurora-product-body` — **17 bodyLayout variants** (`single-hero`, `thumbnail-grid`, `stat-comparison`, `spectrum-chart`, `axis-shift-chart`, `pull-quote`, `stacked-quotes`, `prose-only`, `state-heatmap-grid`, `stacked-100pct-bar-chart`, `treemap`, `article-reference-card`, `photo-hero-with-floating-social-card`, `pull-quote-with-live-artefact`, `tweet-sandwich-with-work-collage`, `pull-quote-with-full-width-screenshot`, `project-showcase-grid-with-central-quote`).
- **Palette tokens established:** ~30+ (BG_WARM_OFFWHITE, BG_WARM_STONE, BG_PALE_BLUE_ECONOMIC, BG_WARM_CREAM_ECONOMIC, BG_WARM_CREAM_PERSONAL, BG_COSMIC_DARK, BG_HERO_CORAL, ACCENT_CORAL, ACCENT_CORAL_PINK, INK_BLACK, INK_NEAR_BLACK, INK_ON_DARK, INK_MUTED_ON_DARK, INK_MUTED_STONE, CARD_CREAM, CARD_BG_ELEVATED, DUOTONE_SHADOW_CORAL_DEEP, SELECTION_BLUE, X_BRAND_BLUE, HANDLE_GREY, GLOBE_STROKE_MUTED, CONNECTOR_HAIRLINE, HERO_ACCENT_CREAM_YELLOW, HEATMAP_MINT 1-5, CAT_WORK_LAVENDER, CAT_PERSONAL_FOREST, CAT_OTHER_SAGE, CAT_CONTENT_ROSE, CAT_HOBBIES_LIME, CAT_RESEARCH_LAVENDER, CAT_EDUCATION_TERRACOTTA, CAT_SOFTWARE_SLATE, PILL_LAVENDER_BLUE_BG, PILL_LAVENDER_BLUE_TEXT, PILL_MINT_GREEN_BG, PILL_MINT_GREEN_TEXT, MUTED_STAT_GREY).
- **Cross-brand shared token:** `X_BRAND_BLUE = #1D9BF0` (verified badge blue, confirmed shared with SahilBloom folder image 15).
- **Cross-brand universal glyph:** `→` (U+2192) — confirmed 5+ uses across brands (subtitle continuation, scale-direction, shift-direction, date-range separator, continuity-connector).
- **`aurora-product-body` is now definitively the "swiss-army knife" body template.** 17 confirmed layout variants — the template's flexibility is its defining feature. Recommend this be the primary body-slide builder in our system.
- **Critical asset dependencies:**
  - 3D protein renders (Anthropic Carousel 1).
  - Typography-art hero (Carousel 2).
  - Duotone portrait-cutout pipeline (Carousel 3, needs `rembg` or manual masking).
  - Hand-drawn marker illustrations (Carousel 4).
  - Mood-board artefact library (Carousel 5).
  - Personal-brand photography + product screenshots (Yan Liu carousel).
- **Continue analysis in `Docs/design/SLIDE_REFERENCES_FULL_PART2.md`** for nextwork/ folder (images 48-85, 38 slides). Part 2 will follow the same schema.
</content>
