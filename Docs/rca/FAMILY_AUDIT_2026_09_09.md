# Full Family Visual Audit — Sept 9 2026

> **Method:** `scripts/see_slide.py` on one representative PNG per family × slide-type.  
> **Agents:** 3 parallel agents, 26 slides total across 6 families.  
> **Purpose:** Find what needs fixing and prioritise for Phase 4 and beyond.

---

## Rating Scale

| Rating | Meaning |
|--------|---------|
| 5/5 | Publish-ready, no changes needed |
| 4/5 | Ship — minor polish only |
| 3/5 | Fix before next release |
| 1-2/5 | Block — do not use in pipeline |

---

## AURORA-EXTENDED Family

| Template | Rating | Headline | Body ~pt | Key Issues |
|----------|--------|----------|----------|-----------|
| aurora-hook | 4/5 | massive | ~17pt | Bottom dead space |
| aurora-content-0 | 4/5 | massive | ~16pt | Bullet circles slightly cramped |
| aurora-stat | 3.5/5 | large | ~15pt | **Bar chart hairline bug** (biryani bar renders as single pixel) |
| aurora-engage | 4/5 | massive | ~17pt | Dual-button redundant, bottom dead space |
| aurora-quote | 3.5/5 | massive | ~15pt | Bottom dead space ~25%, insight bullets cramped vs. quote |
| aurora-cta | 3.5/5 | massive | ~17pt | Bottom dead space, no visual anchor |

**Family verdict:** Works well for dense content. Do not modify — aurora-extended is the stable reference. Known issues are design-level, not bugs.

---

## AURORA-LITE Family

| Template | Rating | Headline | Body ~pt | Key Issues |
|----------|--------|----------|----------|-----------|
| aurora-lite-hook | 3.5/5 | massive | ~20pt | Background watermark text bleeds into body text |
| aurora-lite-content-0 (56pt) | 3/5 | massive | ~17pt | "HISPANCN" AI artifact on stock image; dead space below text block |
| aurora-lite-content-text (96pt) | 4/5 | massive | ~17pt | Awkward line break on long headline |
| aurora-lite-stat | 4/5 | large | ~15pt | "#1" badge alignment slightly off |
| aurora-lite-quote | 4/5 | massive | ~30pt | Bottom dead space ~35% |
| aurora-lite-cta | 4/5 | massive | ~17pt | Bottom dead space ~40%, body borderline small |

**Family verdict:** Most templates 4/5. The content-0 image artifact and hook watermark are image-fetch quality issues (DDG scraping), not template bugs.  
**Dead space pattern:** Recurring on quote/cta/hook — the two-pass vertical centering creates empty lower thirds on short content.

---

## COMPACT-CLEAN Family

| Template | Rating | Issue |
|----------|--------|-------|
| aurora-compact-hook | 3/5 | Sentence truncated — no body copy visible; reads as broken |
| aurora-compact-content | 4/5 | Alamy watermarks on background image undermine credibility |
| aurora-compact-stat-hero | 4/5 | Large empty lower half; needs visual anchor |
| aurora-compact-quote | 3/5 | Twitter bird icon competes with quote — distracting, disconnected |
| aurora-compact-clean-engage | 4/5 | No content value delivered — purely self-promotional ask |
| aurora-compact-clean-cta | 4/5 | Bottom half empty; otherwise clean |

**Family verdict:** 4 of 6 at 4/5. The hook truncation and quote icon are bugs. The empty lower half on stat/cta is the recurring dead-space pattern.

---

## LUMINA Family

| Template | Rating | Issue |
|----------|--------|-------|
| lumina-hook | 3/5 | Feels like clickbait — no supporting data; watermarked image |
| lumina-content | 3/5 | **Numbered list bug**: bullets render as "1. 1. Social media..." — double numbering |
| lumina-stat | 4/5 | Bar chart missing percentage labels |
| lumina-quote | 4/5 | Key insights section cramped vs quote |
| lumina-cta | 3/5 | Bottom half mostly empty — same dead space pattern |

**Family verdict:** Lumina has a critical **double-numbering bug** on content slides. 3 slides at 3/5. Light theme works for quote/stat but hook and cta need fixing.

---

## EDITORIAL Family

| Template | Rating | Issue |
|----------|--------|-------|
| aurora-editorial-hook | 3/5 | Subtitle text overlaps bold headline — layout collision |
| aurora-editorial-cta | 3/5 | Placeholder text ("The Series Title.") not replaced; no value prop |

**Family verdict:** Both 3/5. Editorial hook has a text overlap bug. The CTA placeholder means this family is **not pipeline-ready** — brand name injection not wired.

---

## NEXTWORK-DARK Family

| Template | Rating | Issue |
|----------|--------|-------|
| aurora-nextwork-dark-cta | 3/5 | **Subtext overlaps headline** — confirmed layout bug |
| aurora-nextwork-dark-engage | 2/5 | No content delivered; overlap bug; purely self-promotional |

**Family verdict:** Both templates have confirmed **text overlap bugs** (hardcoded y-positions). Rated 2-3/5. Need two-pass layout fix (same fix applied to stat-hero and compact-clean-engage earlier).

---

## COVER-HERO Family

| Template | Rating | Issue |
|----------|--------|-------|
| aurora-carousel-cover-hero-images | 3/5 | Decorative cards cut off at bottom edge; feels incomplete |

**Family verdict:** 3/5. Designed as a manual-use cover slide — not intended for pipeline auto-generation. Clip issue is a z-order/positioning problem on the decorative card elements.

---

## Complete Ratings Summary

| Family | Template | Rating | Status |
|--------|----------|--------|--------|
| aurora-extended | hook | 4/5 | ✅ Ship |
| aurora-extended | content-0 | 4/5 | ✅ Ship |
| aurora-extended | stat | 3.5/5 | ⚠️ Chart hairline bug |
| aurora-extended | engage | 4/5 | ✅ Ship |
| aurora-extended | quote | 3.5/5 | ⚠️ Dead space |
| aurora-extended | cta | 3.5/5 | ⚠️ Dead space |
| aurora-lite | hook | 3.5/5 | ⚠️ Image watermark bleed |
| aurora-lite | content-0 | 3/5 | ⚠️ AI artifact; dead space |
| aurora-lite | content-text | 4/5 | ✅ Ship |
| aurora-lite | stat | 4/5 | ✅ Ship |
| aurora-lite | quote | 4/5 | ✅ Ship |
| aurora-lite | cta | 4/5 | ✅ Ship |
| compact-clean | hook | 3/5 | ⚠️ Sentence truncated |
| compact-clean | content | 4/5 | ⚠️ Image watermarks |
| compact-clean | stat-hero | 4/5 | ⚠️ Dead space |
| compact-clean | quote | 3/5 | ⚠️ Twitter icon bug |
| compact-clean | engage | 4/5 | ✅ Ship |
| compact-clean | cta | 4/5 | ✅ Ship |
| lumina | hook | 3/5 | ⚠️ Watermarks; weak copy |
| lumina | content | 3/5 | ❌ **Double-numbering bug** |
| lumina | stat | 4/5 | ✅ Ship |
| lumina | quote | 4/5 | ✅ Ship |
| lumina | cta | 3/5 | ⚠️ Dead space |
| editorial | hook | 3/5 | ❌ **Text overlap bug** |
| editorial | cta | 3/5 | ⚠️ Placeholder not replaced |
| nextwork-dark | cta | 3/5 | ❌ **Text overlap bug** |
| nextwork-dark | engage | 2/5 | ❌ **Text overlap bug** |
| cover-hero | images | 3/5 | ⚠️ Card clip at edge |

---

## Cross-Family Issues (by severity)

### ❌ BUGS — Fix immediately

| Bug | Affects | Root cause | Fix |
|-----|---------|-----------|-----|
| Text overlap | nextwork-dark-cta, nextwork-dark-engage, editorial-hook | Hardcoded y-positions | Two-pass layout (measure first, then position) |
| Double-numbering | lumina-content bullets | `createBulletItem` adds "N." prefix when bullet text already starts with "N." | Strip leading `\d+\.` from bullet text before rendering |
| Twitter icon in quote | compact-quote | Hardcoded social icon unrelated to content | Remove icon or make it optional |

### ⚠️ DESIGN ISSUES — Fix before Phase 4

| Issue | Affects | Fix |
|-------|---------|-----|
| Dead space bottom 25-40% | aurora-extended/lite quote+cta, lumina cta, compact stat | Bottom-anchor layout pattern |
| Chart bar hairline | aurora-stat, aurora-lite-stat | Minimum bar height 4px in `chartRenderer.ts` |
| Placeholder brand ("The Series Title.", "@yourbrand") | editorial-cta, compact templates | Wire `settings.brand_name` into compact_meta adapter |
| Compact hook truncation | compact-hook | First 6-word clamp too aggressive — allow 8-9 words |

### 🖼️ IMAGE QUALITY — Pipeline fix (not template)

| Issue | Affects | Fix |
|-------|---------|-----|
| Alamy/Shutterstock watermarks | aurora-lite-content, compact-content, lumina-hook | Filter DDG results: reject URLs containing `alamy`, `shutterstock`, `getty`, `depositphotos` |
| AI artifacts in illustrations | aurora-lite-content-0 | Same filter + prefer photo over illustration for these queries |

---

## Fix Priority Queue (updated with all families)

| P | Issue | Effort | Impact |
|---|-------|--------|--------|
| P1 | nextwork-dark text overlap (2 slides) | 30 min | Unblocks family |
| P1 | lumina-content double-numbering | 15 min | Unblocks family |
| P2 | Dead space bottom-anchor for CTA/quote/hook | 1 hour | All families |
| P3 | DDG image URL filter (reject watermarks) | 30 min | All families |
| P3 | Chart bar minimum 4px | 5 min | stat templates |
| P4 | Compact hook 6-word clamp → 9-word | 5 min | compact-hook |
| P4 | Editorial placeholder brand injection | 30 min | editorial family |
| P5 | compact-quote Twitter icon removal | 10 min | compact-quote |
