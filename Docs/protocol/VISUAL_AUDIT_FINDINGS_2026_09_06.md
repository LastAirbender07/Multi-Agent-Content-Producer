# Visual Audit Findings — 2026-09-06

> **Method:** Playwright non-headless, 1080×1080 canvas snapshots, all 24 templates + 30 components.  
> **Perspective:** Fresh-eyes user perspective — not code review.  
> **Auditor:** AI (Claude), post Phase 2.5 + 2.6 + 2.7 implementation.

---

## Summary Scores

| Family | Score | Status |
|---|---|---|
| Aurora Extended (6 slides) | 6/6 ✅ | Ship-ready |
| Compact Clean (12 slides) | 9/12 ⚠️ | 3 photo-placeholder issues |
| Editorial (2 slides) | 2/2 ✅ | Ship-ready |
| Nextwork Dark (2 slides) | 2/2 ✅ | Ship-ready |
| Cover Hero (2 slides) | 1/2 ⚠️ | Layout balance issue |
| Aurora Components (15) | 15/15 ✅ | Functionally correct |
| Compact Components (6) | 6/6 ✅ | Functionally correct |
| Cover Components (9) | 9/9 ✅ | Functionally correct |

---

## Issues Found

### ISSUE-1 [HIGH] — Photo-background templates show dark placeholders
**Affects:** `aurora-compact-step-index`, `aurora-compact-step-detail`, `aurora-compact-stat-hero`

**What the user sees:** A mostly dark slide with no meaningful content. The photo background is a placeholder gradient `#1a1a2e → #16213e` that looks like an error state, not a slide. A user would not know what this template is supposed to look like.

**Root cause:** These templates require a `compact_meta.image_url` to show a real photo background. Without it they fall back to a dark gradient rectangle.

**Fix options:**
- Option A: Bundle a default landscape photo in `backend/assets/images/` and use it as default background
- Option B: Show a visible "📷 Add background photo" overlay button on the placeholder
- Option C: In the template tile preview (TemplatesPanel), show a mockup image instead of the live Fabric render

**Recommended:** Option A — ship with a decent default photo so the template looks designed, not broken.

---

### ISSUE-2 [HIGH] — Cover Hero slides are visually top-heavy
**Affects:** `aurora-carousel-cover-hero-phone`, `aurora-carousel-cover-hero-images`

**What the user sees:** Phone/image pair components are in the upper ~40% of the canvas. The lower 60% is just the metallic peach gradient background with no content. Looks like a half-finished design.

**Root cause:** The cover hero template was designed to have a `display_headline` and `body_text` in the lower portion, but the default `compact_meta: {}` doesn't populate these — the lower half renders empty.

**Fix:** Ensure `TEMPLATE_METADATA["aurora-carousel-cover-hero-phone"].starter.compact_meta` includes meaningful default values for `display_headline`, `body_text`, and `italic_cta` so the slide looks complete out of the box.

---

### ISSUE-3 [MEDIUM] — Compact portrait-quote shows empty portrait slot
**Affects:** `aurora-compact-quote`

**What the user sees:** A cream slide with terracotta card on the right, but the portrait photo slot is a dark rectangle (B&W placeholder). Quote text is visible but the portrait makes the slide look incomplete.

**Root cause:** Default `compact_meta` has no `portrait_url`.

**Fix:** Bundle a default portrait photo or use a soft illustrated placeholder instead of a dark rectangle.

---

### ISSUE-4 [MEDIUM] — Components previewed on wrong background
**Affects:** Compact components (brand-pill, outlined-pill, mixed-weight-text, etc.) dropped on aurora-hook dark slide

**What the user sees in tests:** Cream/light compact components are nearly invisible on the dark aurora-hook slide. In the real editor, users would drop them on a compact slide (cream bg) where they'd look correct.

**This is a TEST SETUP issue, not a code bug.** Compact components should be tested/previewed on a cream bg slide. For the Components panel preview tiles, no change needed — the description text explains what each component is.

**Fix for tests:** Use `aurora-compact-hook` as the base slide when testing compact components.

---

### ISSUE-5 [LOW] — Aurora components: glow-blob and deco-ring barely visible
**Affects:** `glow-blob`, `deco-ring` dropped on aurora-hook

**What the user sees:** The glow-blob is a soft translucent circle — nearly invisible against the aurora hook's existing glows. The deco-ring is a thin circle that could be mistaken for a selection handle.

**These are intentionally subtle decorative elements.** Not a bug. But the component tile descriptions should clarify: "Use on dark gradient slides for atmospheric depth."

---

### ISSUE-6 [LOW] — Cover Hero layout balance
**Note:** Covered in ISSUE-2. Separate note: the metallic gradient background is beautiful and distinctive. The issue is purely the empty lower half with default content.

---

## Improvements Backlog (User Perspective)

### UX-1 [HIGH] — Template panel: collapsible family groups

**User feedback:** "Grouping families and making them collapsable makes it easier to group visually related slides."

**Current state:** TemplatesPanel shows all templates as a flat list of tiles.

**Proposed state:**
```
▼ Aurora Extended  (6 slides)     ← collapsible header
   [hook] [content] [stat] [quote] [cta] [engage]

▶ Compact Clean  (12 slides)      ← collapsed
▶ Editorial  (2 slides)            ← collapsed
▶ Nextwork Dark  (2 slides)        ← collapsed
▶ Cover Hero  (2 slides)           ← collapsed
```

**Implementation:** Add a `section` field to `TEMPLATE_METADATA` (already done for components). Group tiles by `TEMPLATE_FAMILIES` keys. Accordion/collapse state stored in localStorage so the user's preference persists.

**Impact:** Dramatically reduces visual noise. User opening the Templates tab for the first time sees 5 groups, not 24 tiles.

---

### UX-2 [HIGH] — Template panel: family color strip indicator

**Current state:** Each template tile has a colored top stripe but no family grouping visual.

**Proposed:** Each family group header has a family color + description (one line). Template tiles within a group use consistent color-coding that matches the family identity.

---

### UX-3 [MEDIUM] — Photo-placeholder templates: "Add Photo" affordance

See ISSUE-1 and ISSUE-3. When a template has an unfilled photo slot, show a visible "📷 Click to add background photo" overlay button rather than a dark/empty rectangle.

---

### UX-4 [MEDIUM] — Component preview background

**Current state:** All 30 components drop onto whatever slide is open. Compact components look invisible on dark slides.

**Proposed:** When dragging a Compact Family component tile, show a tooltip "Best on Compact slides (cream bg)". Or, in the Components panel, show components grouped with a background color swatch preview.

---

### UX-5 [LOW] — Template tile: show family badge

Add a small family badge to each template tile:
```
[compact-clean-cta tile]
  ──────────────────
  ✦ Compact Clean
  Follow CTA
```
So the user instantly knows which family a slide belongs to without reading the ID.

---

### UX-6 [LOW] — "New to this family" badge on Phase 2.5 templates

The 7 new templates (`editorial-hook`, `editorial-cta`, `nextwork-dark-cta`, etc.) have no visual indicator that they're new. A "NEW" badge would help users discover them.

---

## Priority Implementation Order

| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | UX-1: Collapsible family groups in Templates panel | Medium (1 day) | High |
| 2 | ISSUE-1: Default photo for photo-bg templates | Low (30 min) | High |
| 3 | ISSUE-2: Cover Hero default starter content | Low (30 min) | Medium |
| 4 | UX-2: Family color strips + descriptions | Low | Medium |
| 5 | ISSUE-3: Compact quote default portrait | Low | Low |
| 6 | UX-5: Family badge on template tiles | Low | Low |

---

## What's Confirmed Working Well

- All 4 template families have distinct, recognizable visual DNA ✅
- Aurora Extended: dark glassmorphism — premium feel ✅
- Editorial: white/serif/border frame — instantly distinctive ✅
- Nextwork Dark: near-black with warm white type — strong brand identity ✅
- Cover Hero: metallic peach gradient — unique and beautiful ✅
- Compact Clean: cream/Inter Black — clean and modern ✅
- All 30 components drop correctly, are selectable, and editable ✅
- Crop mode works (double-click any image → ghost overlay + handles) ✅
- Brand pill, category pill, number badge text all editable ✅

---

*Audit completed: 2026-09-06*  
*Next action: Implement UX-1 (collapsible families) — highest user-impact improvement*
