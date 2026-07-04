# Content Strategy — Format Diversity & Modern Slide Design

> **Created:** 2026-07-04
> **Status:** Planning — ready for implementation
> **Supersedes:** `MULTI_FORMAT_CONTENT_PLAN.md`

---

## The Problem (Two Sides of the Same Coin)

Our pipeline produces technically correct carousels. The research is solid, the angles are sharp, and the pipeline is fully automated. But the carousels are not performing on Instagram, and the reason is two interconnected failures:

**Side A — We only produce one format.** Every carousel we generate is an opinion/analysis post: strong thesis + research evidence + "here's the uncomfortable truth" + CTA. This is one content format. Instagram's top creators post a mix of 5–6 format types — tutorials, facts, comparisons, reviews, stories. Audiences follow you for the opinion but they *save and share* the tutorials, fact dumps, and resource lists. We have no saves.

**Side B — Our slides are too dense to read.** Even within the opinion format, our content slides carry 40–70 words in small text with 3–5 bullet points. Casual followers (the majority) abandon at slide 2 because it looks like work. The problem is not our content — it is how we present it. Nobody reads paragraphs on Instagram.

These two problems are not separate. **The slide density problem is blocking us from expanding formats** — a facts carousel or tutorial requires a completely different visual language (one revelation per slide, huge type, minimal text). We cannot build TUTORIAL or FACTS formats using slides designed for dense opinion content. Solving the design problem is the prerequisite for format diversity.

---

## What Currently Exists

### The Pipeline (current state before V2)

The pipeline runs:

```
Topic → Research → Angle generation → Slide generation → Rendering → PNG
```

Angle generation is hardwired to:

- "Take a STRONG stance (not neutral)"
- 4 emotional hooks: Curiosity / Anger / Hope / FOMO
- Reference frame: "What would Naval/Balaji/Patrick Collison say?"

Slide generation has a single instruction set with `STRICT RULES: 1. First slide MUST be hook`, `All numbers and claims must come from RESEARCH SUMMARY`. There is no concept of format or visual density in either prompt.

The rendering picks from 6 slide types. There is no point in the pipeline where format or template family is a parameter. V2 adds that parameter at every layer.
The pipeline uses a single Fabric.js rendering engine for both the editor canvas and PNG export. Templates are TypeScript builder functions registered in a REGISTRY — adding a new slide type is one file and two registry entries. Both the editor and Playwright export pick it up automatically.

**Two themes:** Aurora (dark, violet/teal) and Lumina (light, indigo/teal). Lumina variants are free via a `lw()` wrapper — same builder, different colour tokens.

### Current Slide Types

| Type        | Role                       | What it looks like now                                                 |
| ----------- | -------------------------- | ---------------------------------------------------------------------- |
| `hook`    | Opening headline           | 8–12 words, bold, full-bleed image.**Works well.**              |
| `stat`    | Big number + chart         | One number, one label, one chart.**Works well.**                 |
| `engage`  | Mid-carousel follow prompt | Gradient background, short ask.**Works well.**                   |
| `cta`     | Final call to action       | Centered text + button, atmospheric glows.**Works well.**        |
| `content` | Main body slides           | Title + 40–70 word paragraph + 3–5 bullets.**Too dense.**      |
| `quote`   | Pull quote                 | Full-size quote + attribution + 3 insight bullets.**Too heavy.** |

Hook, stat, engage, and CTA are designed well and should not change. The density problem lives entirely in `content` and `quote`.

### The Rendering Numbers

Running our current templates against Instagram's proven design standards reveals the gap:

| Element                  | Our current value            | Instagram best practice |
| ------------------------ | ---------------------------- | ----------------------- |
| Content slide body       | 40–70 words                 | 10–20 words maximum    |
| Content body font size   | 20–22px (1080px canvas)     | 26–30px minimum        |
| Title font size          | 38–44px                     | 52–64px                |
| Title-to-body size ratio | ~1.8:1                       | 2.5:1 minimum           |
| Words per slide          | ~60                          | ~15                     |
| One idea per slide?      | No — 3–5 bullets per slide | Yes — hard rule        |

*Sources: instacarousel.com 2026 guide, pineable.com typography specs, postnitro.ai viral strategies research.*

### The Pipeline

The pipeline currently runs:

```
Topic → Research → Angle generation → Slide generation → Rendering → PNG
```

Angle generation is hardwired to produce opinion angles with no format concept. Slide generation has one set of rules optimised for dense opinion content. The rendering picks from the 6 current slide types. There is no point in the pipeline where format or visual density is a parameter.

---

## What High-Performing Carousels Look Like in 2025–2026

Research across top Instagram educators (Ali Abdaal, Sahil Bloom, Growth Daily) and 2026 performance data reveals a consistent pattern:

### The Design Principle

> **One idea. Bigger type. Fewer words. More air.**

Not because great creators write less, but because they **split more**. What we compress into one content slide (three related points) becomes three separate slides, each carrying a single punch with a big headline. The carousel grows from 12 slides to 16–20, but each slide is consumed in 2 seconds instead of 15.

The measurable effect: 50%+ swipe-through rate (vs ~20% for dense slides), 5–10% save rate, 44% higher engagement vs single images.

### The Two Slide Families

**Extended slides** (what we have now):

- Dense, 40–70 words, multiple bullets
- Appropriate when content genuinely needs depth
- Works for long-form opinion breakdowns read by engaged followers
- Not suitable as a default for casual feed scrollers

**Compact slides** (what we need to build):

- One idea per slide — hard rule
- 10–20 words maximum in the body
- Headline: 52–64px — readable at thumbnail size
- Body: 26–30px — no smaller
- One supporting visual (number, icon, chart) per slide
- Generous whitespace — the slide breathes
- The reader should get the full point in 2 seconds

### The 10 Content Formats

Different formats require different slide density and visual language:

| Format               | Density  | Emotion                | Slide structure                                                                | Best for                                        |
| -------------------- | -------- | ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- |
| **OPINION**    | Extended | Anger, Fear, Curiosity | Hook → 3-4 content/stat → Quote → CTA                                       | Politics, economics, social issues, business    |
| **FACTS**      | Compact  | Surprise, Curiosity    | Hook → 5-8 fact slides → Engage → CTA                                       | History, science, food, culture, sports trivia  |
| **TUTORIAL**   | Compact  | Hope, Inspiration      | Hook (outcome) → Steps 1–N → Summary → CTA                                 | Tech, cooking, fitness, design, finance, career |
| **EXPLAINER**  | Extended | Curiosity, Clarity     | Hook → "What it means" → 3-4 component slides → Example → CTA              | Finance, science, law, economics                |
| **LISTICLE**   | Compact  | FOMO, Completeness     | Hook ("Top N X") → Items reverse-ranked → Bonus → CTA                       | Rankings, recommendations, resources            |
| **REVIEW**     | Compact  | Trust, Curiosity       | Cover (name + rating) → Criteria slides → Pros → Cons → Verdict → CTA     | Movies, books, apps, products, restaurants      |
| **COMPARISON** | Compact  | FOMO, Clarity          | Hook → Dimension slides (1 per row) → Winner → CTA                          | Products, career paths, cities, tools           |
| **TRENDING**   | Extended | Urgency, FOMO          | Hook → What happened → Why → Who's affected → What's next → Take → CTA   | Business news, IPOs, elections, sports          |
| **STORY**      | Mixed    | Inspiration, Curiosity | Incident → Rising stakes → Turning point → Resolution → Lesson → CTA      | Founder stories, history, comebacks             |
| **CHECKLIST**  | Compact  | Preparedness, Utility  | Hook ("Before you X") → Checklist items (5–10) → "What you'll avoid" → CTA | Travel prep, interview prep, productivity       |

**Concrete example titles:**

- OPINION: "Why your MBA is worthless" / "India's education system is designed to fail you"
- FACTS: "5 facts about India's food history that no one teaches in school"
- TUTORIAL: "How to negotiate your salary: 7 steps that actually work"
- EXPLAINER: "What is repo rate? Explained in 5 slides"
- LISTICLE: "10 Indian street foods every traveller must try — ranked"
- REVIEW: "I tried ChatGPT's premium tier for 30 days — here's my honest review"
- COMPARISON: "MBA vs Self-taught: which actually gets you hired?"
- TRENDING: "Salesforce just bought Fin for $3.6B — here's what it means for you"
- STORY: "How Dhirubhai Ambani went from petrol station clerk to building India's largest company"
- CHECKLIST: "Mumbai first-timer checklist: 12 things to do before you land"

---

## What Needs to Change

### 1. Two Template Families, Not One

The current templates are preserved **exactly as-is** — relabelled as the `extended` family. Nothing is deleted, nothing is modified. They continue to serve OPINION and EXPLAINER formats perfectly.

A new `compact` family is built alongside them, following the modern design principles above.

**Extended family** (current builders, renamed):

```
aurora-extended-content-{0,1,2,3,text}  ← current aurora-content-* unchanged
aurora-extended-stat                     ← current aurora-stat unchanged
aurora-extended-quote                    ← current aurora-quote unchanged
aurora-hook / aurora-engage / aurora-cta ← unchanged, format-agnostic
```

**Compact family** (new builders to create):

```
aurora-compact-content        — bold headline + ≤20 word statement + optional icon
aurora-compact-fact           — single revelation, maximum whitespace, no bullets
aurora-compact-step           — huge step number + action title + 1-sentence instruction
aurora-compact-quote          — short powerful quote (≤15 words) + author, minimal
aurora-compact-list-item      — rank badge + item name + 1-line description
aurora-compact-rating         — criterion + score + 1-line verdict
aurora-compact-comparison     — two options side-by-side, winner badge
```

Old REGISTRY IDs (`aurora-content-0` etc.) stay active, pointing to the same builders. No existing runs break.

### 2. Format Selection — A New Pipeline Step

A new step sits between research and angle generation. After research completes, the LLM reads the synthesis and recommends a content format. This is the right place because:

- Research is genuinely format-agnostic (same tools work for any topic)
- The synthesis contains everything needed to judge which format will perform best
- All downstream steps (angles, slides, captions) need this information

```
Topic
  ↓
Research          ← unchanged
  ↓
Format selection  ← NEW: one LLM call, produces recommended format + alternatives
  ↓
Angle generation  ← receives format, generates format-appropriate angles (3 minimum)
  ↓
Slide generation  ← receives format, injects format-specific slide rules
  ↓
Rendering         ← carousel_generator selects template family from format
  ↓
PNGs
```

**Output of format selection:**

```json
{
  "recommended":      "FACTS",
  "alternatives":     ["EXPLAINER", "OPINION"],
  "reasoning":        "The evidence is rich with surprising data points but lacks
                       a strong controversial thesis — FACTS will outperform OPINION here.",
  "template_family":  "compact"
}
```

In **auto mode**: top recommendation used silently — same pattern as `angle_mode: auto`.
In **manual mode**: UI presents the recommendation and alternatives, user picks or overrides.

### 3. Format-Aware Angle Generation — One Prompt File, Parameterised

The `angle_generation.txt` prompt is **not duplicated** into 10 separate files. Instead, it gets one injection point `{format_block}` where format-specific guidance is inserted. The quality rules, brand voice, and output schema remain shared.

A Python dict maps `post_format → format instructions block`:

```python
FORMAT_BLOCKS = {
    "OPINION": """
        Format: OPINION (extended template family)
        Take a strong, defensible stance. Challenge conventional wisdom.
        Hook emotions: Anger, Fear, Curiosity, FOMO.
        Each angle: something people are afraid to say publicly.
    """,
    "FACTS": """
        Format: FACTS (compact template family)
        Surface genuinely surprising, counterintuitive facts. No strong opinion needed.
        Hook emotions: Surprise, Curiosity, Fear.
        Each angle: "I had no idea this was true."
    """,
    "TUTORIAL": """
        Format: TUTORIAL (compact template family)
        A learnable skill with a promised outcome. Frame: "How to [outcome] in [N steps]."
        Hook emotions: Hope, Inspiration, Urgency.
    """,
    # ... one block per format
}
```

The same parameterisation pattern applies to `slide_generation.txt` (injecting slide structure rules per format) and `caption_generation.txt` (injecting caption hook style per format).

**Result:** Three prompt files. Zero file proliferation. Adding a new format means adding one block to each dict.

### 4. Format → Template Family Mapping

```
OPINION    → extended   aurora-extended-content, aurora-extended-quote, aurora-extended-stat
EXPLAINER  → extended   aurora-extended-content, aurora-extended-stat
TRENDING   → extended   aurora-extended-content (urgency framing)
FACTS      → compact    aurora-compact-fact (+ aurora-extended-stat for charts)
TUTORIAL   → compact    aurora-compact-step, aurora-compact-content
CHECKLIST  → compact    aurora-compact-content (checklist variant)
LISTICLE   → compact    aurora-compact-list-item
REVIEW     → compact    aurora-compact-rating, aurora-compact-quote
COMPARISON → compact    aurora-compact-comparison
STORY      → mixed      aurora-extended-quote + aurora-compact-content
```

### 5. Schema Changes

```python
class PostFormat(str, Enum):
    opinion    = "OPINION"
    facts      = "FACTS"
    tutorial   = "TUTORIAL"
    explainer  = "EXPLAINER"
    trending   = "TRENDING"
    story      = "STORY"
    listicle   = "LISTICLE"
    review     = "REVIEW"
    comparison = "COMPARISON"
    checklist  = "CHECKLIST"

class TemplateFamily(str, Enum):
    extended = "extended"
    compact  = "compact"
    mixed    = "mixed"

class FormatSelectionOutput(BaseModel):
    recommended:     PostFormat
    alternatives:    list[PostFormat]   # top 2, ranked
    reasoning:       str
    template_family: TemplateFamily

class Angle(BaseModel):
    statement:           str
    emotional_hook:      EmotionalHook   # already an enum — unchanged
    supporting_evidence: str
    post_format:         PostFormat      # ← new field
```

---

## Design Principles for Compact Builders

Every compact builder must follow these rules without exception:

| Rule               | Value       | Reason                                                     |
| ------------------ | ----------- | ---------------------------------------------------------- |
| Headline font size | 52–64px    | Readable at thumbnail size, 2.5× body                     |
| Body font size     | 26–30px    | Minimum for mobile legibility                              |
| Body word count    | ≤20 words  | 2-second readability at a glance                           |
| Ideas per slide    | 1           | Hard rule — if there are two ideas, make two slides       |
| Padding from edges | ≥60px      | Instagram's UI overlaps at smaller margins                 |
| Bullets per slide  | 0           | Each bullet is its own slide in compact format             |
| Line-height        | 1.4–1.5    | Tighter than extended (1.6) — creates more breathing room |
| Supporting visual  | 1 per slide | Icon, number, or chart — never text + text                |

**From → to (what changes going from extended to compact):**

| Element          | Extended (current) | Compact (target)               |
| ---------------- | ------------------ | ------------------------------ |
| Content title    | 38–44px           | 52–64px                       |
| Content body     | 20–22px           | 26–30px                       |
| Content bullets  | 19–20px           | 22–24px (or removed entirely) |
| Quote text       | 40px               | 48–52px                       |
| Body line-height | 1.6                | 1.4–1.5                       |
| Body max words   | ~60                | 20                             |

**Layout column split for compact content slides with an image:**

- Text column: 45% width (down from 57% in extended)
- Image panel: 55% width (up from 43% in extended)
- The image does the heavy lifting; text is the caption

**For compact slides without an image:**

- One large centred bold statement at 52–64px
- Single-line supporting body at 28px maximum
- No bullets — the slide is a poster, not a document

**Concrete before/after example:**

```
EXTENDED (current):
  Title: "The 2020 departure was a red flag"
  Body:  "When original creators leave mid-production citing 'creative differences,'
          it signals a structural incompatibility between vision and execution.
          Western production systems—committee-driven, metrics-obsessed,
          risk-averse—collided with material requiring deep cultural specificity."
  Bullets: [3 items, ~50 more words]

COMPACT (target):
  Title: "The 2020 departure was a red flag"
  Body:  "When creators walk away, the show is already broken."
  [No bullets — those 3 bullet points become the next 3 slides, each with its own headline]
```

This change alone cuts body word count by ~60%. The carousel grows from 12 to 14–18 slides, but each slide is consumed in 2 seconds. More slides, less friction.

The visual signature: you should be able to get the full point of a slide by reading the headline alone, in under 2 seconds, with one arm extended at phone distance.

---

## Implementation Plan

### Week 1 — Plumbing (no visual changes, pipeline infrastructure only)

1. **Schema:** Add `PostFormat`, `TemplateFamily`, `FormatSelectionOutput` to `contracts.py`
2. **Node:** Create `format_selection_node` — one LLM call, structured output
3. **Graph:** Wire `format_selection_node` into `content_graph.py` between research and angles
4. **Prompts:** Add `{format_block}` injection to `angle_generation.txt`, `slide_generation.txt`, `caption_generation.txt` with FORMAT_BLOCKS dicts in each orchestrator
5. **Registry:** Register `aurora-extended-*` IDs alongside existing IDs (no old IDs removed)
6. **Generator:** Update `_canvas_template_id()` to accept `template_family` parameter
7. **Backfill:** `backfill_post_format.py` script to classify existing 35 runs (same pattern as `backfill_categories.py`)

End of Week 1: full pipeline works end-to-end. OPINION/EXTENDED is still the only active format family. All plumbing is live and tested.

### Week 2 — First compact builders (unlocks FACTS + TUTORIAL)

1. `aurora-compact-content` — bold headline + short body + optional icon/number accent
2. `aurora-compact-fact` — single revelation, headline-dominant, maximum whitespace
3. `aurora-compact-step` — huge step number (display font) + action headline + 1-sentence body

Validate each with the GAN validation suite. Run a full pipeline test with `post_format: FACTS` and `post_format: TUTORIAL`.

End of Week 2: FACTS and TUTORIAL formats fully operational.

### Week 3 — Remaining compact builders (unlocks remaining formats)

Priority order:

1. `aurora-compact-quote` — for STORY format
2. `aurora-compact-list-item` — for LISTICLE
3. `aurora-compact-rating` + `aurora-compact-comparison` — for REVIEW and COMPARISON

### Week 4 — UI and UX

1. Show format recommendation in the pipeline UI after research completes
2. Allow user override (format picker with reasoning displayed)
3. Show `post_format` badge on each angle card in the angle selector
4. Analytics: add `post_format` distribution to the analytics dashboard

---

## What Does Not Change

- **All existing `aurora_*` builders** — not touched, not moved, not renamed
- **The rendering pipeline** — Playwright + Fabric, format-agnostic by design
- **The GAN validation system** — run after each new compact builder
- **Hook, engage, CTA slide types** — already concise and effective
- **Aurora/Lumina themes** — both families get both themes via `lw()`
- **The editor** — new templates appear in the Slides tab automatically via REGISTRY
- **All 35 existing runs** — render correctly via old IDs, always

---

## Sources

- Direct codebase audit (July 2026)
- instacarousel.com — "Instagram Carousel Guide 2026" (word count, padding specs)
- pineable.com — "Social Media Carousel Design Best Practices" (typography hierarchy, font size em values)
- postnitro.ai — "15 Strategies for Viral Instagram Carousels 2025" (1 idea/slide rule, save rate data)
- sproutsocial.com — intent signal analysis (saves/shares over likes)
- Pipeline RCA learnings — format diversity as a prerequisite for audience growth

---

## Appendix A — Emotional Hooks (Shipped)

> **Status: ✅ Shipped 2026-07-04** — `EmotionalHook` Pydantic enum in `contracts.py`. Enforced at schema validation. All 35 existing runs backfilled via `backfill_categories.py`.

**Shipped hooks and their best-fit formats:**

| Hook        | Best formats                       |
| ----------- | ---------------------------------- |
| Anger       | Opinion, Trending                  |
| Hope        | Story, Tutorial                    |
| Curiosity   | Facts, Explainer                   |
| FOMO        | Comparison, Trending               |
| Surprise    | Facts, Listicle                    |
| Fear        | Opinion, Health & Science, Finance |
| Urgency     | Trending, News                     |
| Inspiration | Story, Tutorial                    |

**Deferred hooks and reasons:**

| Hook             | Reason not shipped                                                       |
| ---------------- | ------------------------------------------------------------------------ |
| Empowerment      | Overlaps Hope + Inspiration; Urgency covers the action-drive aspect      |
| Nostalgia        | Hard to enforce reliably; Story + Curiosity cover narrative hooks        |
| Trust/Validation | A framing, not an emotion — better expressed via`post_format: REVIEW` |
| Pride/Identity   | Overlaps Hope + Inspiration; culturally context-dependent                |
| Relatability     | A writing style, not a hook emotion                                      |

These can be added to the enum when a specific format genuinely needs them.

---

## Appendix B — Recommended Weekly Content Mix

For a channel like TheOpinionBoard, the mix that balances identity, discoverability, and saves:

| Format    | Frequency   | Why                                 |
| --------- | ----------- | ----------------------------------- |
| OPINION   | 2×/week    | Core identity, drives follows       |
| FACTS     | 2×/week    | High saves, high shares, low effort |
| EXPLAINER | 1×/week    | Authority-building, high bookmarks  |
| TRENDING  | 1×/week    | Timely, drives discovery            |
| TUTORIAL  | 1×/week    | High saves, evergreen traffic       |
| REVIEW    | 1×/2 weeks | Trust-building, unique voice        |
| STORY     | 1×/2 weeks | Emotional connection, retention     |

---

## Appendix C — Quick Wins (Prompt-Only, Zero Infrastructure)

These four changes expand the format repertoire from 1 to 5 in ~half a day with no code changes — only prompt edits:

1. **Add `post_format` to angle generation** (1–2 hours) — LLM selects format per angle. Store as plain string initially; formalise as enum in the schema phase.
2. **Add FACTS format rules to `slide_generation.txt`** (1 hour) — uses existing `hook`, `content`, `stat` slide types with new structural rules. No new builders needed.
3. **Add TUTORIAL format rules** (1 hour) — uses existing `content` slides with numbered headings. No new builders.
4. **Add TRENDING format** (30 minutes) — nearly identical to OPINION, just urgency hook framing and "what this means for you" structure.

---

## Appendix D — Format-Specific Slide Rules (Reference)

The `{format_block}` injected into `slide_generation.txt` per format. Shown here for the three most distinct formats:

```python
FORMAT_SLIDE_RULES = {
    "FACTS": """
        Structure: 1 hook + 5-8 fact slides + 1 engage + 1 CTA
        Fact slide: title = the surprising fact (≤10 words)
                    body = why it's true / context (15-20 words)
        NO bullet points — each slide = ONE revelation
        Use existing stat slide type for numerical facts
    """,
    "TUTORIAL": """
        Structure: 1 hook (the outcome) + step slides (1 per slide, numbered) + 1 summary + 1 CTA
        Step slide: title = "Step N: [action verb + task]"
                    body = instruction (20-30 words)
                    bullets = sub-steps if needed (max 3, compact builder only)
        Number each step prominently as a large display element
    """,
    "REVIEW": """
        Structure: 1 cover (subject name + overall rating) + 3-5 criteria slides + 1 pros + 1 cons + 1 verdict + 1 CTA
        Criteria slide: title = criterion name
                        stat_value = rating (e.g. "4/5")
                        stat_label = criterion label
        Pros/Cons: bullets only, 4-5 items per slide, short phrases
    """,
}
```

---

## Appendix E — Code Reference

**Updated `_canvas_template_id()` signature:**

```python
def _canvas_template_id(slide_type: str, theme: str, layout_variant: int,
                         has_image: bool, template_family: str = "extended") -> str:
    if slide_type in ("hook", "engage", "cta"):
        return f"{theme}-{slide_type}"          # format-agnostic, no family prefix
    prefix = f"{theme}-{template_family}"
    if slide_type == "content":
        return f"{prefix}-content-text" if not has_image else f"{prefix}-content-{layout_variant}"
    return f"{prefix}-{slide_type}"
```

**`inferTemplate()` fallback behaviour:**
When `canvas_template` is not set on a slide (editor fallback path), `inferTemplate()` defaults to the `extended` family. Compact templates are only selected when `canvas_template` is explicitly set by the pipeline.

**Phase A shipped status (as of 2026-07-04):**

- ✅ Emotional hooks expanded — `EmotionalHook` enum, 8 values, Pydantic-enforced
- ✅ LLM-assigned categories — `ContentCategory` enum + `ResearchSynthesis.categories`, all 35 runs backfilled
- ⏳ `post_format` in angle generation — not yet implemented (next step)
- ⏳ Format-specific slide rules injection — not yet implemented
- ⏳ Caption adaptation per format — not yet implemented

---

## Appendix F — Research Routing Hints Per Format

Some formats benefit from adjusted research pipeline behaviour (prompt-level changes to the synthesis or angle nodes, not architectural):

| Format   | Research hint                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| REVIEW   | Inject a "review rubric" prompt into the synthesis node — structure evidence as evaluation criteria rather than factual synthesis |
| TRENDING | Prioritise news tools first; freshness (`timelimit="d"`) should be the default                                                   |
| TUTORIAL | Request "steps" extraction from evidence — the synthesis should identify sequential actions                                       |

---

## Appendix G — Mixed-Format Runs (Phase D)

A future enhancement: allow a single pipeline run to generate multiple angles **across different formats** for the same topic — e.g., 1 OPINION + 1 FACTS + 1 TUTORIAL from one research pass.

Currently all angles on a run share the same format (selected once after research). Phase D makes format a per-angle choice rather than a per-run choice. This requires the format selection step to produce a list of recommended formats (already supported in `alternatives`) that can be fanned out to parallel angle generation calls.
