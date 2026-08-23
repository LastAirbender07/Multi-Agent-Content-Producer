# Typography Components

Text-styling primitives for Fabric.js templates. Each entry: what it does, prop signature, reference PNGs, families that use it.

**Status:** `NEW` / `EXTEND` `shared/text.ts` / `EXISTS`.

---

## make-mixed-weight-text

**Status:** NEW / EXTEND `shared/text.ts`.

**What:** Renders text with **per-character font family + weight + style** — 3-axis. Enables mixed titles like `"Why Are You In Such A Rush?"` (`Rush` italic-serif, rest bold-sans). Also inline-bold spans in paragraphs.

**Props:** `{runs: [{text, family?, weight?, style?, color?}], size, align, lineHeight, maxWidth, x, y}`

**Ref PNGs:**
- `backend/outputs/slide-references/others/image.png` — `"I'm THIS close"`
- `backend/outputs/slide-references/SahilBloom/image copy 9.png` — `Rush` italic-serif in sans headline
- `backend/outputs/slide-references/claude/image copy 10.png` — `powerful telescope.` inline-bold

**Used by:** aurora-compact-hook, aurora-editorial-cover, aurora-compact-quote, aurora-essay-body, aurora-nextwork-spotlight-cover.

**Fabric:** `Textbox` with `styles: {[lineIdx]: {[charIdx]: {fontWeight, fontStyle, fontFamily, fill}}}`.

---

## make-outlined-pill

**Status:** NEW.

**What:** Rounded rect "pill" with optional stroke + centred text.

**Props:** `{text, fillColor, strokeColor?, strokeWidth?, textColor, padding, cornerRadius: number|"pill", fontFamily, fontSize, fontWeight, letterSpacing?, x, y}`

**Ref PNGs:**
- `backend/outputs/slide-references/others/image copy 3.png` — peach `VIRAL REEL` pill
- `backend/outputs/slide-references/SahilBloom/image.png` — `Swipe for more>>`

**Used by:** aurora-compact-hook, aurora-carousel-cover-hero, aurora-editorial-cover.

---

## make-inline-highlight-pill

**Status:** NEW.

**What:** Yellow pill wrapping ONE word inline in a headline — prose highlighter.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 8.png` — `for free` yellow inline pill
- `backend/outputs/slide-references/nextwork/image copy 16.png` — `77%` yellow inline in cover headline

**Used by:** aurora-nextwork-cover, aurora-carousel-cover-hero (optional).

---

## make-framing-label-pill

**Status:** NEW.

**What:** Cream pill ABOVE a headline sentence, labelling its rhetorical position.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 18.png` — `what most people believe`

**Used by:** aurora-nextwork-body (myth-vs-reality).

---

## make-progress-counter-pill

**Status:** NEW.

**What:** `"skill N of M"` / `"step N of M"` cream pill.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 11.png` — `skill 1 of 7`

**Used by:** aurora-nextwork-body (skill-deep-dive).

---

## make-status-pill

**Status:** NEW.

**What:** Tiny rounded-pill w/ status + tone. Tones: `healthy/elite` = mint, `warn` = yellow, `error` = red.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 32.png` — `Synced` / `Healthy`
- `backend/outputs/slide-references/nextwork/image copy 36.png` — `elite`

**Used by:** aurora-nextwork-body (dashboard mockups).

---

## make-title-underline-rule

**Status:** NEW.

**What:** Thin horizontal accent bar (~130×3px) beneath a section title. Colour: `match-title` / `match-folder` / `match-carousel-accent`.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 24.png` — mint underline
- `backend/outputs/slide-references/nextwork/image copy 34.png` — orange underline (match-folder)

**Used by:** aurora-nextwork-body, aurora-nextwork-spotlight-cover.

---

## make-section-label-text

**Status:** NEW.

**What:** Small coloured section-header, no bg. e.g. `The takeaway` yellow Inter Bold ~28pt.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 22.png` — `The takeaway`

**Used by:** aurora-nextwork-body (takeaway-recap).

---

## make-handwritten-annotation

**Status:** NEW.

**What:** Italic handwritten-script label + curved warn-coloured arrow pointing at target on a mockup.

**Props:** `{text, targetPoint, position: "above"|"below"|"left"|"right", color, textColor, fontFamily: "Caveat"|"Kalam", fontSize, x, y}`

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 5.png` — `"this one lets in the whole internet"`
- `backend/outputs/slide-references/nextwork/image copy 7.png` — `"yours is already in there"`

**Used by:** aurora-compact-annotated-shot, aurora-nextwork-body.

**Fonts to add:** **Caveat**.

---

## make-rotated-sticker-tag

**Status:** NEW.

**What:** Small rounded pill tilted ~5° w/ handwritten script + optional arrow-underline swoosh.

**Ref PNGs:**
- `backend/outputs/slide-references/nextwork/image copy 15.png` — `design + informatics · sophomore`

**Used by:** aurora-nextwork-spotlight-body.

---

## make-monospace-label

**Status:** NEW.

**What:** Small monospace label for technical IDs, citations. Muted grey.

**Props:** `{text, fontFamily: "JetBrains Mono"|"IBM Plex Mono", fontSize, color, letterSpacing?, allCaps?, x, y}`

**Ref PNGs:**
- `backend/outputs/slide-references/claude/image.png` — `RBX1-MYTHOSPREVIEW-RANK01`
- `backend/outputs/slide-references/nextwork/image copy 22.png` — `Dice 2025 Tech Salary Report`

**Fonts to add:** **JetBrains Mono** OR **IBM Plex Mono**.

**Used by:** aurora-product-cover, aurora-product-body, all chart citations.
