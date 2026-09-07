"""
format_blocks.py — Phase 3 format-specific instruction blocks.

Three dicts keyed by PostFormat.value injected into angle, slide, and caption prompts
via the {format_block} placeholder. Empty string for OPINION = no change to existing runs.
"""
from core.orchestration.contracts import PostFormat

# ── Angle generation blocks ───────────────────────────────────────────────────
ANGLE_FORMAT_BLOCKS: dict[str, str] = {
    PostFormat.opinion:    "",
    PostFormat.facts:      (
        "FORMAT: FACTS carousel. Generate angles that lead with a surprising, counterintuitive, "
        "or little-known fact as the core hook. Each angle should promise a specific revelation."
    ),
    PostFormat.tutorial:   (
        "FORMAT: TUTORIAL carousel. Generate angles framed as step-by-step walkthroughs. "
        "Each angle should promise a concrete skill or outcome the reader will gain."
    ),
    PostFormat.explainer:  (
        "FORMAT: EXPLAINER carousel. Generate angles that demystify a complex concept. "
        "Each angle should promise clarity — 'here's why X actually works the way it does'."
    ),
    PostFormat.trending:   (
        "FORMAT: TRENDING carousel. Generate angles that tap into current cultural momentum. "
        "Each angle should tie the topic to why it matters RIGHT NOW."
    ),
    PostFormat.story:      (
        "FORMAT: STORY carousel. Generate angles built around a compelling narrative arc. "
        "Each angle should have a clear beginning, conflict, and resolution."
    ),
    PostFormat.listicle:   (
        "FORMAT: LISTICLE carousel. Generate angles structured as a numbered list of items, "
        "tips, or insights. Each angle should promise N specific, actionable items."
    ),
    PostFormat.review:     (
        "FORMAT: REVIEW carousel. Generate angles built around an evaluation or verdict. "
        "Each angle should promise a clear recommendation with evidence."
    ),
    PostFormat.comparison: (
        "FORMAT: COMPARISON carousel. Generate angles that pit two options or approaches "
        "head-to-head. Each angle should promise a clear winner with justification."
    ),
    PostFormat.checklist:  (
        "FORMAT: CHECKLIST carousel. Generate angles structured around a definitive list "
        "of must-dos, must-avoids, or must-knows. Promise completeness."
    ),
}

# ── Slide generation blocks ───────────────────────────────────────────────────
SLIDE_FORMAT_BLOCKS: dict[str, str] = {
    PostFormat.opinion:    "",
    PostFormat.facts:      (
        "FORMAT RULES (FACTS): Each content slide = one surprising fact. "
        "Title: the fact as a bold claim (≤8 words). Body: 2-3 sentences unpacking the 'why'. "
        "Bullets: 2-3 concrete supporting data points. MAXIMUM body: 25 words before bullets. "
        "No filler. Every slide should feel independently shareable."
    ),
    PostFormat.tutorial:   (
        "FORMAT RULES (TUTORIAL): Content slides = sequential steps. Number each step in the title "
        "(e.g. 'Step 1: Do X'). Body: what to do and why in ≤25 words. "
        "Bullets: sub-steps or tips (2-3 items). Slides MUST flow as a logical sequence — "
        "each slide builds on the previous one."
    ),
    PostFormat.explainer:  (
        "FORMAT RULES (EXPLAINER): Content slides = one concept per slide. "
        "Title: the concept name (≤6 words). Body: plain-language definition + one concrete example (≤40 words). "
        "Avoid jargon; use analogies. A 12-year-old should understand it."
    ),
    PostFormat.trending:   (
        "FORMAT RULES (TRENDING): Lead with recency — every content slide should include a "
        "date, recent statistic, or named current event. Body ≤35 words. "
        "Use conversational, urgent tone. Reference specific names/companies/events."
    ),
    PostFormat.story:      (
        "FORMAT RULES (STORY): Structure the slides as a narrative: setup → conflict → turning point → resolution. "
        "Body ≤35 words per slide. Use specific names, dates, and places. No abstract generalisations. "
        "Each slide should feel like a chapter, not a fact."
    ),
    PostFormat.listicle:   (
        "FORMAT RULES (LISTICLE): Each content slide = one item in the list. Number each item in the title. "
        "Body: why this item matters in ≤20 words. Bullets: 2-3 specific sub-points. "
        "Make each item feel independently valuable — not just padding."
    ),
    PostFormat.review:     (
        "FORMAT RULES (REVIEW): Structure slides as: criteria → evidence → verdict. "
        "Include at least one stat slide with a concrete score or rating. "
        "Final content slide must be the recommendation. Be specific — no generic pros/cons."
    ),
    PostFormat.comparison: (
        "FORMAT RULES (COMPARISON): Alternate slides between Option A and Option B. "
        "Use a stat slide for the head-to-head numbers. Final slide: the verdict with reasoning. "
        "Title each slide with the specific thing being compared."
    ),
    PostFormat.checklist:  (
        "FORMAT RULES (CHECKLIST): Each content slide = one checklist item. "
        "Title: the item as an imperative (e.g. 'Check your DNS TTL'). "
        "Body: the 'why it matters' in ≤20 words. Bullets: what to look for (2-3 items). "
        "The full set of slides should feel like a complete, actionable checklist."
    ),
}

# ── Caption generation blocks ─────────────────────────────────────────────────
CAPTION_FORMAT_BLOCKS: dict[str, str] = {
    PostFormat.opinion:    "",
    PostFormat.facts:      "The caption should open with the most surprising fact and tease 2 more.",
    PostFormat.tutorial:   "The caption should promise a specific outcome: 'After reading this, you'll be able to...'",
    PostFormat.explainer:  "The caption should open with the common misconception this carousel corrects.",
    PostFormat.trending:   "The caption should open with 'Right now...' or reference a specific current date/event.",
    PostFormat.story:      "The caption should open with the inciting incident and tease the outcome without spoiling it.",
    PostFormat.listicle:   "The caption should open with the list count: 'Here are N [things]...'",
    PostFormat.review:     "The caption should open with the verdict and tease the key evidence.",
    PostFormat.comparison: "The caption should open with the two options being compared and tease the winner.",
    PostFormat.checklist:  "The caption should open with 'Before you [action], check these N things:'",
}
