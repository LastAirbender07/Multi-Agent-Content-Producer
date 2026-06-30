# Multi-Format Content Strategy — Analysis & Implementation Plan

> **Created:** 2026-06-29
> **Context:** The pipeline currently produces only opinion/analysis carousels.
> This document maps what's needed to support the full range of high-performing
> Instagram carousel formats.

---

## 1. The Problem: We're Monotonous

Every carousel we produce today follows the same structure:
- Strong opinion stance → research backs it → "here's the dark truth" → CTA to follow
- Emotional hooks are limited to 4 types: Anger, Hope, Curiosity, FOMO
- All angles default to "what Naval/Balaji/Patrick Collison would say"
- Slide types: hook, content, stat, quote, cta, engage — all wired for opinion delivery

This is a single format masquerading as content strategy. It works for some topics (politics, economics, India's problems) but fails for:
- Product/experience reviews
- Educational "did you know" facts
- Step-by-step tutorials
- Trending topic explainers
- Brand/movie/book breakdowns
- Comparison posts ("X vs Y")

The instinct to diversify is right. Instagram's top creators post a **mix of 4–6 format types** across their feed. Audiences follow for the opinion but they save and share the tutorials, review posts, and fact dumps.

---

## 2. What Currently Exists in the Pipeline

### 2A. Slide types (Jinja2 + Fabric canvas)
| Slide type | Purpose | Opinion-optimised? |
|---|---|---|
| `hook` | Opening headline — creates urgency | ✅ Yes — "dark truth" framing |
| `content` | Text + image + bullets | ✅ Yes — dense opinion bullets |
| `stat` | Big number + chart | ✅ Yes — "shocking data" framing |
| `quote` | Pull-quote from research | ✅ Yes — validates the opinion |
| `cta` | Call to action | Neutral |
| `engage` | Mid-carousel follow prompt | Neutral |

**Missing:** review, rating, checklist, step, comparison, profile, timeline, before/after, product card

### 2B. Angle generation prompt
Hardwired to:
- "Take a STRONG stance (not neutral)"
- 4 emotional hooks only: Curiosity / Anger / Hope / FOMO
- Reference frame: "What would Naval/Balaji/Patrick Collison say?"

This is explicitly designed for opinion content. A review post, tutorial, or facts carousel needs a completely different framing.

### 2C. Slide generation prompt
Rules like "All numbers and claims must come from RESEARCH SUMMARY" and "STRICT RULES: 1. First slide MUST be hook" assume opinion structure throughout. There's no mechanism to generate a 5-star rating card, a step-by-step checklist, or a "Pros vs Cons" comparison slide.

### 2D. Research pipeline
The research pipeline works well for any topic — web search, LLM knowledge, synthesis. This is genuinely reusable. The bottleneck is the content layer, not the research layer.

### 2E. Templates (Jinja2 + Fabric)
Two themes (aurora/lumina) with 6 slide type templates each. All designed for the opinion format. No visual components for: star ratings, step numbers (1/2/3), before/after splits, product cards, timeline layouts, pros/cons tables.

---

## 3. Instagram Carousel Format Taxonomy (2025–2026)

Based on top-performing creators, Instagram itself, and content strategy research:

### Format 1 — Opinion / Analysis *(current)*
**What it is:** Takes a strong stance on a topic, backs it with data, challenges conventional wisdom.
**Best for:** Politics, economics, social issues, business, career advice
**Hook emotions:** Anger, Controversy, Shock, Outrage
**Slide structure:** Hook → 3-4 content/stat slides → Quote → CTA
**Example:** "Why your MBA is worthless" / "India's education system is designed to fail you"
**Already built:** ✅ Yes

### Format 2 — Facts / Did You Know
**What it is:** A collection of surprising, counterintuitive, or little-known facts about a topic. No strong stance — just "wow, I didn't know that."
**Best for:** History, science, food, culture, geography, sports trivia
**Hook emotions:** Surprise, Awe, Curiosity (pure), Wonder
**Slide structure:** Hook ("5 facts about X that will surprise you") → 5-8 fact slides (each one a standalone revelation) → "Which surprised you most?" engage → CTA
**Visual pattern:** Each fact slide = large bold claim + supporting context. No long bullets. Clean, single-idea slides.
**Example:** "5 facts about India's food history that no one teaches in school"

### Format 3 — Tutorial / How-To / Step-by-Step
**What it is:** Teaches the audience to do something specific. Each slide = one step. Reader should be able to complete a task after reading.
**Best for:** Tech, cooking, fitness, design, finance, career skills
**Hook emotions:** Empowerment, Achievement, Clarity
**Slide structure:** Hook (the outcome: "How to X in 10 minutes") → Steps 1–7 → Summary/recap → CTA
**Visual pattern:** Large step number (1, 2, 3) + action verb headline + 1-3 sentence instruction + optional screenshot/illustration
**Example:** "How to negotiate your salary: 7 steps that actually work"

### Format 4 — Review / Rating
**What it is:** A structured evaluation of a product, movie, restaurant, book, app, experience, etc. Gives a verdict.
**Best for:** Food, movies, books, gadgets, travel, apps, courses
**Hook emotions:** Trust, Relief, Validation ("is it worth it?"), Anticipation
**Slide structure:** Cover (name + your rating) → 3-5 criteria slides (each rated X/5) → Pros slide → Cons slide → Verdict → CTA
**Visual pattern:** Star rating cards, colour-coded scores (green/amber/red), structured scoring rubric
**Example:** "I tried ChatGPT's premium tier for 30 days — here's my honest review"

### Format 5 — Comparison / X vs Y
**What it is:** Puts two things head-to-head across multiple dimensions. Reader leaves knowing which to choose.
**Best for:** Products, career paths, cities, strategies, tools, frameworks
**Hook emotions:** Decision-relief, Clarity, FOMO (pick the right side)
**Slide structure:** Hook ("X vs Y: the real difference") → Dimension-by-dimension comparison slides → Winner declaration → CTA
**Visual pattern:** Split-screen or table layout, colour identity per option (A=violet, B=teal), winner badge on each dimension
**Example:** "MBA vs Self-taught: which actually gets you hired?"

### Format 6 — Listicle / Countdown
**What it is:** Ranked or unranked list of items. Works on "completeness" psychology — readers want to see all items.
**Best for:** Recommendations, rankings, resources, places, books, tools
**Hook emotions:** Completeness, Discovery, Validation
**Slide structure:** Hook ("Top 10 X") → Items 10–1 (reverse builds anticipation) or 1–N → Bonus item → CTA
**Visual pattern:** Number badge + item name + 1-2 sentence description. Each slide = one list item.
**Example:** "10 Indian street foods every traveller must try — ranked"

### Format 7 — Explainer / Concept Breakdown
**What it is:** Takes a complex concept and makes it simple. No opinion — just clarity.
**Best for:** Finance, science, law, technology, economics, health
**Hook emotions:** Clarity, Relief ("finally someone explained this"), Curiosity
**Slide structure:** Hook (the confusing thing) → "What it actually means" → 3-4 component slides → Real example → Summary → CTA
**Visual pattern:** Simple diagrams, analogies, before/after understanding. Clean text, minimal.
**Example:** "What is repo rate? Explained in 5 slides"

### Format 8 — Trending / News Breakdown
**What it is:** Takes a current event and explains it clearly, adds context, answers "why does this matter?"
**Best for:** Business news, IPOs, elections, sports, entertainment
**Hook emotions:** FOMO, Urgency, Relevance ("you need to know this")
**Slide structure:** Hook (the event) → What happened → Why it happened → Who's affected → What comes next → Your take → CTA
**Visual pattern:** Timeline elements, news-style bold headlines, recency signals ("today", "this week")
**Example:** "Salesforce just bought Fin for $3.6B — here's what it means for you"

### Format 9 — Story / Narrative
**What it is:** Tells a compelling story — a person's journey, a company's rise/fall, a historical arc.
**Best for:** Founders, historical events, comeback stories, failures, underdog narratives
**Hook emotions:** Inspiration, Empathy, Curiosity (what happens next?)
**Slide structure:** Inciting incident → Rising stakes → Turning point → Resolution → Lesson → CTA
**Visual pattern:** Chronological flow, character-focused, human detail in every slide
**Example:** "How Dhirubhai Ambani went from petrol station clerk to building India's largest company"

### Format 10 — Checklist / Resource
**What it is:** A practical checklist or resource list the reader will screenshot and save.
**Best for:** Travel prep, interview prep, productivity, recipes, packing, event planning
**Hook emotions:** Preparedness, Peace of mind, Utility
**Slide structure:** Hook ("Before you X, read this") → Checklist items (5–10) → "What you'll avoid" → CTA
**Visual pattern:** Checkboxes (visual ticks), grouped by category, clean scannable layout
**Example:** "Mumbai first-timer checklist: 12 things to do before you land"

---

## 4. Emotional Hook Expansion

Current pipeline only knows: Anger / Hope / Curiosity / FOMO

The full spectrum needed:

| Hook | Best formats | Example trigger |
|---|---|---|
| Anger / Outrage | Opinion, News | "The system is rigged against you" |
| Hope / Inspiration | Story, Tutorial | "This changed everything for me" |
| Curiosity | Facts, Explainer | "The hidden reason behind X" |
| FOMO | Comparison, Trending | "Everyone else already knows this" |
| **Surprise / Awe** | Facts, Listicle | "I can't believe this is real" |
| **Empowerment** | Tutorial, Checklist | "After this you'll never X again" |
| **Nostalgia** | Story, History | "This is the India you never learned about" |
| **Trust / Validation** | Review, Comparison | "Honest answer after 30 days" |
| **Urgency** | Trending, News | "This is happening right now" |
| **Pride / Identity** | Culture, Food, Sports | "Things only Indians understand" |
| **Relatability** | Story, Listicle | "If you've ever felt like X..." |

---

## 5. What Needs to Change in the Pipeline

### 5A. New concept: `post_format`

Add a `post_format` field alongside the existing `emotional_hook` in the angle. This tells the entire downstream pipeline how to structure the content.

```python
POST_FORMATS = [
    "OPINION",          # current default
    "FACTS",            # did-you-know
    "TUTORIAL",         # step-by-step
    "REVIEW",           # rating/verdict
    "COMPARISON",       # X vs Y
    "LISTICLE",         # ranked/unranked list
    "EXPLAINER",        # concept breakdown
    "TRENDING",         # news + context
    "STORY",            # narrative arc
    "CHECKLIST",        # save-worthy resource
]
```

### 5B. Angle generation prompt changes

**Current:** Forces opinion stance, 4 emotions, Naval/Balaji reference frame.

**New design:** Parameterised by `allowed_formats` and expanded emotion set. The LLM selects the most appropriate format for each angle, not the user.

```
For each angle, select the POST FORMAT that best suits it:
- OPINION: take a strong stance, challenge conventional wisdom
- FACTS: share surprising, little-known truths (no stance needed)
- TUTORIAL: teach a skill step-by-step
- REVIEW: evaluate something with a verdict
- COMPARISON: put two things head-to-head
- LISTICLE: create a ranked/unranked list
- EXPLAINER: simplify a complex concept
- TRENDING: explain a current event and its implications
- STORY: tell a compelling narrative arc
- CHECKLIST: create a save-worthy resource list
```

Each angle output gains a `post_format` field:
```json
{
  "statement": "...",
  "emotional_hook": "SURPRISE",
  "post_format": "FACTS",
  "supporting_evidence": "..."
}
```

### 5C. Slide generation prompt changes

**Current:** Single instruction set wired for opinion format.

**New design:** The prompt is parameterised by `post_format`. Each format gets its own slide structure rules injected at generation time.

```python
FORMAT_SLIDE_RULES = {
    "FACTS": """
        Structure: 1 hook + 5-8 fact slides + 1 engage + 2 CTA
        Fact slide: title = the surprising fact (≤10 words), body = why it's true/context (20-30 words)
        NO bullet points on fact slides — each slide = ONE revelation
        NO stats slides — facts are the stats
    """,
    "TUTORIAL": """
        Structure: 1 hook (the outcome) + step slides (1 per slide, numbered) + 1 summary + 2 CTA
        Step slide: title = "Step N: [action verb + task]", body = instruction (25-40 words), bullets = sub-steps
        Number each step prominently. First slide promises the outcome, not the controversy.
    """,
    "REVIEW": """
        Structure: 1 cover (name + overall rating) + criteria slides (1 per criterion) + pros slide + cons slide + verdict + 2 CTA
        Criteria slide: title = criterion name, stat_value = rating (e.g. "4/5"), stat_label = criterion
        Pros/Cons: bullets only, 4-5 per slide
    """,
    # ... etc for each format
}
```

### 5D. New Jinja2 / Fabric canvas slide templates needed

| New template | Used by formats | What it shows |
|---|---|---|
| `rating` | Review, Comparison | Star rating or score card with colour coding |
| `step` | Tutorial, Checklist | Large step number + action instruction |
| `checklist` | Checklist, Tutorial | Checkbox list, categorised |
| `comparison_row` | Comparison | Side-by-side dimension comparison |
| `profile` | Story, Review | Person/product profile card |
| `timeline` | Story, History, Trending | Chronological event sequence |
| `before_after` | Tutorial, Explainer | Two-state contrast slide |
| `list_item` | Listicle | Numbered/ranked item with description |

These require:
- New Jinja2 HTML template files in `aurora/` and `lumina/`
- New Fabric canvas builder functions in `utils/canvasTemplates/`
- Registration in the REGISTRY

### 5E. Caption generation changes

**Current:** Caption assumes opinion format — "controversial truth" hook structure.

**New:** Caption prompt receives `post_format` and adapts the hook style:
- Facts → "I didn't know #4 until last week..."
- Tutorial → "Save this before you forget..."
- Review → "Honest answer after 30 days..."
- Listicle → "Which one surprised you most? Comment below"
- Story → First-person narrative hook

### 5F. Research pipeline (no changes needed for most formats)

The research pipeline already works for any topic — this was the right call. The LLM knowledge node, web search, synthesis — all reusable. The only format that may need different research routing is:

- **Review** → needs structured evaluation criteria, not just factual synthesis. Could inject a "review rubric" prompt.
- **Trending** → needs freshness priority (route to news tools first)
- **Tutorial** → may need structured "steps" extraction from evidence

These are prompt-level changes to the existing synthesis + angle nodes, not architectural changes.

---

## 6. What Stays the Same

- Research pipeline (tools, synthesis, evaluation) — works for all formats ✅
- Token tracking — format-agnostic ✅
- Analytics — add `post_format` to the tracked fields ✅
- Blogger / Instagram publishing — format-agnostic ✅
- Editor (Fabric canvas) — templates are additive ✅
- Slide reorder/delete — format-agnostic ✅
- Caption editor — works for any caption ✅

---

## 7. Implementation Phases

### Phase A — Zero new infrastructure (2–3 hours)
Change prompts only. No new templates, no schema changes.

1. **Expand emotional hooks** in `angle_generation.txt` — add Surprise, Empowerment, Nostalgia, Trust, Urgency, Pride, Relatability
2. **Add `post_format` selection** to angle generation — LLM picks from 10 formats
3. **Inject format-specific slide rules** in `slide_generation.txt` based on selected `post_format`
4. **Adapt caption hook** based on `post_format` in `caption_generation.txt`

This alone enables FACTS, TUTORIAL, EXPLAINER, TRENDING, STORY formats using existing slide types — they just need different structure rules.

### Phase B — New slide templates (1–2 days per template set)

Priority order based on format popularity and impact:

| Priority | Templates | Enables formats |
|---|---|---|
| P1 | `step`, `checklist` | Tutorial, Checklist |
| P1 | `list_item` | Listicle |
| P2 | `rating`, `comparison_row` | Review, Comparison |
| P3 | `profile`, `timeline` | Story, Trending |
| P3 | `before_after` | Explainer |

Each template set = 1 Jinja2 file + 1 Fabric builder + REGISTRY entry.

### Phase C — Schema and pipeline (1 day)

1. Add `post_format` field to `Angle` contract
2. Add format-specific research routing hints (freshness priority for Trending, rubric injection for Review)
3. Add `post_format` to analytics tracking
4. UI: show post format badge in AngleSelector modal

### Phase D — Mixed-format run (1 day)

Allow a single pipeline run to generate multiple angles **across different formats** — e.g., 1 OPINION + 1 FACTS + 1 TUTORIAL for the same topic. Currently all angles on a run share the same implicit format.

---

## 8. The Lowest-Hanging Fruit Right Now

The absolute fastest wins, in order:

**1. Expand emotional hooks in angle_generation.txt** (15 minutes, one prompt edit)
This alone gives more diverse angles even within the OPINION format.

**2. Add FACTS format rules to slide_generation.txt** (1 hour)
Facts carousels use existing `hook`, `content`, `stat` slide types — just different structural rules. No new templates needed.

**3. Add TUTORIAL format rules to slide_generation.txt** (1 hour)
Tutorial uses existing `content` slides with numbered headings. No new templates.

**4. Add TRENDING format** (30 minutes)
Trending = OPINION but with urgency hook and "what this means for you" framing. Nearly identical to existing pipeline.

**These 4 changes alone expand the format repertoire from 1 to 5 — in half a day, with zero infrastructure work.**

---

## 9. Content Mix Recommendation

Based on what Instagram's algorithm rewards and what audiences save/share, a sustainable weekly content mix for a channel like TheOpinionBoard:

| Format | Frequency | Why |
|---|---|---|
| OPINION | 2x/week | Core identity, drives follows |
| FACTS | 2x/week | High saves, high shares, low effort |
| EXPLAINER | 1x/week | Authority-building, high bookmarks |
| TRENDING | 1x/week | Timely, drives discovery |
| TUTORIAL | 1x/week | High saves, evergreen traffic |
| REVIEW | 1x/2 weeks | Trust-building, unique voice |
| STORY | 1x/2 weeks | Emotional connection, retention |

---

## 10. Sources

This analysis draws from:
- Direct codebase audit of the current pipeline (prompts, templates, slide types)
- Instagram content strategy best practices for carousel posts (2025)
- Analysis of top Indian educational/opinion creators' content mix
- The pipeline's own RCA learnings (diversity of angles = diversity of formats, not just opinion angles)
