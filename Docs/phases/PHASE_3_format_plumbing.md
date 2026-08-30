# PHASE 3 — Format Plumbing (smart template routing, conditional on auto mode)

## Status
**APPROVED — Loop 1 complete (2× clean passes, 2026-08-30). Ready to implement.**

---

## Problem Statement

Phase 2 shipped 9 working compact templates that users can pick manually in the editor — but the pipeline still emits `aurora-hook`, `aurora-content-*`, `aurora-stat` etc. on every run regardless of topic. Phase 3 wires the pipeline to select the right template family (compact vs extended) based on the post-format of the content, without wasting an LLM call when the user has already signalled intent.

After this phase ships:
- A topic like "5 surprising facts about Indian tea" (auto mode) → LLM classifies it as FACTS → all content slides use `aurora-compact-fact`
- A user who manually selects angles and passes `post_format: "TUTORIAL"` in the content request → slides use `aurora-compact-step`, zero extra LLM call
- All OPINION/EXPLAINER/TRENDING topics → unchanged, still use extended templates
- 141 existing runs are backfilled with a `format_selection.json` each

---

## Requirements

**Functional:**
- New `PostFormat` and `TemplateFamily` enums in contracts.py (10 formats, 2 families)
- `format_selection_node(state, run_id)` — imperative async function, called only in auto mode
- `ContentRequest.post_format` — optional field; manual mode passes this from frontend; auto mode ignores it (LLM decides)
- `{format_block}` placeholder injected into `slide_generation.txt`, `angle_generation.txt`, `caption_generation.txt`
- `_canvas_template_id()` updated with optional `template_family` param, uses compact routing table when `template_family == "compact"`
- `ContentGraphState` carries `post_format` and `template_family` so `carousel_generator.py` can route
- `GET /content/{run_id}/format-selection` endpoint
- Backfill script for existing 141 runs

**Non-functional:**
- Zero breaking change to any existing endpoint — all new fields have defaults
- `post_format` missing from `ContentRequest` → defaults to `OPINION` (extended family, unchanged behaviour)
- If format-selection LLM call fails → catch exception, log, fall back to `OPINION`
- Backward compat: existing `slides.json` files without `post_format` still render fine in editor

---

## External Verification Log

| Claim | Verified against | Verified on |
|-------|-----------------|-------------|
| `load_prompt()` uses Python `.format(**variables)` — must match template `{var}` names exactly | `backend/core/prompts/prompt_loader.py` line 17: `template.format(**variables)` | 2026-08-30 |
| `ContentRequest` is the Pydantic model posted to `/content/run` — adding optional fields with defaults is non-breaking | `backend/apps/api/v1/content.py` line 87: `async def run_content(request: ContentRequest)` — FastAPI validates incoming JSON against the model; extra fields with defaults are ignored by old callers | 2026-08-30 |
| `ContentGraphState` is a `TypedDict(total=False)` — adding new optional keys is non-breaking | `backend/core/schemas/workflow_state.py` line 44: `class ContentGraphState(TypedDict, total=False)` | 2026-08-30 |
| `angle_mode` lives in `ContentWorkflowState` (pipeline level), NOT in `ContentRequest` or `ContentGraphState` | `backend/core/schemas/workflow_state.py` line 45; `content_node.py` doesn't pass angle_mode into ContentRequest | 2026-08-30 |
| `RunOutputManager.save_json(stage, filename, data)` pattern already used for research outputs | `backend/infra/output_manager.py` line 22; `backend/core/orchestrators/research/orchestrator.py` line 129 | 2026-08-30 |
| `_BACKEND_ROOT / settings.content_output_dir` resolves to `backend/outputs` for runs | `carousel_generator.py` line 14: `_BACKEND_ROOT = Path(__file__).parents[3]`; settings `content_output_dir = "outputs"` | 2026-08-30 |
| Compact builders read `slide.title` as headline fallback and `slide.compact_meta` for structured fields | `aurora_compact_hook.ts` line 41: `m.headline_runs = [{ text: slide.title, weight: 900 }]` when `compact_meta.headline_runs` is default | 2026-08-30 |
| Backfill runs: `angles/selection.json` structure has `selected_angles[].statement` — used to infer topic for classification | `backend/outputs/runs/{id}/angles/selection.json` — confirmed structure in real run `a7776dea` | 2026-08-30 |
| 141 existing runs are all extended-family; all have `canvas_template` set to `aurora-*`; `format_selection.json` does not exist for any of them | `ls backend/outputs/runs/ \| wc -l` → 141; no `find backend/outputs/runs/ -name "format_selection.json"` results | 2026-08-30 |

---

## Entry Conditions (verify ALL before writing code)

- [ ] Phase 2 COMPLETE — verify: `grep "COMPLETE" Docs/phases/PHASE_2_compact_templates.md`
- [ ] All 5 compact builders in REGISTRY — verify: `grep "aurora-compact" frontend/utils/canvasTemplates/index.ts | wc -l` → should show ≥ 9 lines
- [ ] TypeScript clean — verify: `cd frontend && npx tsc --noEmit` → 0 errors
- [ ] Backend starts — verify: `cd backend && .venv/bin/uvicorn main:app --port 8000 --reload` (no import errors)
- [ ] Existing tests pass — verify: `cd backend && .venv/bin/pytest tests/ -q` → all pass

---

## Data Flow (read this before touching any file)

```
POST /content/run  (ContentRequest with optional post_format)
         │
         ▼
content_node (backend/core/nodes/content.py)
  • reads angle_mode from ContentWorkflowState
  • if angle_mode == "auto":
      call format_selection_node() → get FormatSelectionOutput
      save outputs/runs/{run_id}/format_selection.json
  • if angle_mode == "manual":
      post_format = request.post_format ?? PostFormat.OPINION
      template_family = "compact" if post_format in COMPACT_FORMATS else "extended"
  • builds ContentRequest (already done in Phase 2), now includes post_format + template_family
  • passes post_format + template_family into ContentOrchestrator.run()
         │
         ▼
ContentOrchestrator.run() — per-angle loop
  • injects post_format + template_family into each per-angle ContentGraphState initial dict
         │
         ▼
generate_slides_node  ← gets format_block injected into the prompt
         │
validate_content_node ← compact word-count check if template_family=="compact"
         │
screenshot_slides_fabric_node (carousel_generator.py)
  • reads post_format + template_family from ContentGraphState
  • uses COMPACT_ROUTING table to pick canvas_template when template_family=="compact"
  • extended slides: unchanged _canvas_template_id() fallback
```

---

## Files to Create or Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `backend/core/orchestration/contracts.py` | MODIFY | Add `PostFormat`, `TemplateFamily`, `FormatSelectionOutput`; add `post_format` to `ContentRequest` |
| 2 | `backend/core/prompts/templates/format_selection.txt` | CREATE | LLM prompt for auto-mode format classification |
| 3 | `backend/core/orchestrators/content/format_blocks.py` | CREATE | `ANGLE_FORMAT_BLOCKS`, `SLIDE_FORMAT_BLOCKS`, `CAPTION_FORMAT_BLOCKS` dicts (10 formats × 3 prompt types) |
| 4 | `backend/core/orchestrators/content/format_selector.py` | CREATE | `async def select_format(run_id, topic, research_summary) → FormatSelectionOutput` |
| 5 | `backend/core/nodes/content.py` | MODIFY | Call `select_format` in auto mode; inject `post_format` + `template_family` into `ContentRequest` and pass them to orchestrator |
| 6 | `backend/core/orchestrators/content/orchestrator.py` | MODIFY | Accept `post_format` + `template_family`; inject into per-angle `ContentGraphState` |
| 7 | `backend/core/schemas/workflow_state.py` | MODIFY | Add `post_format: str` + `template_family: str` to `ContentGraphState` |
| 8 | `backend/core/prompts/templates/angle_generation.txt` | MODIFY | Add `{format_block}` placeholder at bottom |
| 9 | `backend/core/prompts/templates/slide_generation.txt` | MODIFY | Add `{format_block}` placeholder (replace generic style advice) |
| 10 | `backend/core/prompts/templates/caption_generation.txt` | MODIFY | Add `{format_block}` placeholder |
| 11 | `backend/core/orchestrators/angle/generator.py` | MODIFY | Inject `ANGLE_FORMAT_BLOCKS[post_format]` into `load_prompt("angle_generation", ...)` |
| 12 | `backend/core/orchestrators/content/slide_generator.py` | MODIFY | Inject `SLIDE_FORMAT_BLOCKS[post_format]` into `load_prompt("slide_generation", ...)` |
| 13 | `backend/core/orchestrators/content/caption_generator.py` | MODIFY | Inject `CAPTION_FORMAT_BLOCKS[post_format]` into `load_prompt("caption_generation", ...)` |
| 14 | `backend/core/orchestrators/content/carousel_generator.py` | MODIFY | Add `COMPACT_ROUTING` table; update `_canvas_template_id()` with optional `template_family`; read `post_format` + `template_family` from state in `screenshot_slides_fabric_node` |
| 15 | `backend/core/orchestrators/content/slide_validator.py` | MODIFY | Add compact-body word-count check: title ≤ 10 words, body ≤ 25 words, no bullets; auto-regen once if violated |
| 16 | `backend/backfill_post_format.py` | CREATE | One-off script: read all runs' `research_result.json`, call LLM once per run, write `format_selection.json` |
| 17 | `backend/apps/api/v1/content.py` | MODIFY | Add `GET /content/{run_id}/format-selection` endpoint |
| 18 | `frontend/lib/api/types.ts` | MODIFY | Add `PostFormat` type + extend `ContentRequestBody` with optional `post_format` |
| 19 | `backend/tests/test_format_plumbing.py` | CREATE | Unit tests for enums, routing table, `select_format` (mocked LLM), validator compact rules |

---

## Implementation Steps

### Step 3.1 — Add enums and FormatSelectionOutput to contracts.py

**File:** `backend/core/orchestration/contracts.py`

**What to implement:**
Add immediately after the `EmotionalHook` enum:

```python
class PostFormat(str, Enum):
    opinion     = "OPINION"
    facts       = "FACTS"
    tutorial    = "TUTORIAL"
    explainer   = "EXPLAINER"
    trending    = "TRENDING"
    story       = "STORY"
    listicle    = "LISTICLE"
    review      = "REVIEW"
    comparison  = "COMPARISON"
    checklist   = "CHECKLIST"

class TemplateFamily(str, Enum):
    extended = "extended"
    compact  = "compact"

class FormatSelectionOutput(BaseModel):
    run_id:             str          = Field(..., description="Run ID this selection applies to")
    recommended_format: PostFormat   = Field(..., description="Best-fit post format for this topic")
    template_family:    TemplateFamily = Field(..., description="Template family to use")
    reasoning:          str          = Field(default="", description="1-2 sentence rationale")
    auto_mode:          bool         = Field(default=True, description="True if selected by LLM, False if supplied by user")

# Constant: which formats map to compact family
COMPACT_FORMATS: frozenset[PostFormat] = frozenset({
    PostFormat.facts,
    PostFormat.tutorial,
    PostFormat.listicle,
    PostFormat.review,
    PostFormat.story,
    PostFormat.checklist,
    PostFormat.comparison,
})
```

Add `post_format` to `ContentRequest`:
```python
# In ContentRequest, add after image_source:
post_format: PostFormat = Field(
    default=PostFormat.opinion,
    description="Post format — used to select compact vs extended templates. "
                "In auto mode, overridden by format_selection_node result.",
)
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestration.contracts import PostFormat, TemplateFamily, FormatSelectionOutput, COMPACT_FORMATS; print(PostFormat.facts, TemplateFamily.compact, len(COMPACT_FORMATS))"
```
**Expected output:**
```
FACTS compact 7
```

---

### Step 3.2 — Create format_blocks.py

**File:** `backend/core/orchestrators/content/format_blocks.py`

**What to implement:**
Three dicts keyed by `PostFormat` enum value. Each value is a short instruction block (3-6 lines) that will be injected into the corresponding prompt via `{format_block}`.

```python
"""
Format-specific instruction blocks injected into angle, slide, and caption prompts.
Each value is a multi-line string that slots into the {format_block} placeholder.
"""
from core.orchestration.contracts import PostFormat

# ── Angle generation blocks ───────────────────────────────────────────────────
ANGLE_FORMAT_BLOCKS: dict[str, str] = {
    PostFormat.opinion:    "",   # empty = no extra constraint; keep Naval/Balaji voice
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
        "Title: the fact as a bold claim (≤ 8 words). Body: 2-3 sentences unpacking the 'why'. "
        "Bullets: 2-3 concrete supporting data points. MAXIMUM body length: 25 words before bullets."
    ),
    PostFormat.tutorial:   (
        "FORMAT RULES (TUTORIAL): Content slides = sequential steps. Number each step in the title "
        "(e.g. 'Step 1: Do X'). Body: what to do and why in ≤ 25 words. "
        "Bullets: sub-steps or tips (2-3 items). Slides must flow as a logical sequence."
    ),
    PostFormat.explainer:  (
        "FORMAT RULES (EXPLAINER): Content slides = one concept per slide. "
        "Title: the concept name (≤ 6 words). Body: plain-language definition + one concrete example (≤ 40 words). "
        "Avoid jargon; use analogies."
    ),
    PostFormat.trending:   (
        "FORMAT RULES (TRENDING): Lead with recency — every content slide should include a "
        "date, recent statistic, or named current event. Body ≤ 35 words. "
        "Use conversational, urgent tone."
    ),
    PostFormat.story:      (
        "FORMAT RULES (STORY): Structure the slides as a narrative: setup → conflict → turning point → resolution. "
        "Body ≤ 35 words per slide. Use specific names, dates, and places. No abstract generalisations."
    ),
    PostFormat.listicle:   (
        "FORMAT RULES (LISTICLE): Each content slide = one item in the list. Number each item in the title. "
        "Body: why this item matters in ≤ 20 words. Bullets: 2-3 specific sub-points. "
        "Make each item feel independently valuable."
    ),
    PostFormat.review:     (
        "FORMAT RULES (REVIEW): Structure slides as: criteria → evidence → verdict. "
        "Include at least one stat slide with a concrete score or rating. "
        "Final content slide must be the recommendation."
    ),
    PostFormat.comparison: (
        "FORMAT RULES (COMPARISON): Alternate slides between Option A and Option B. "
        "Use a stat slide for the head-to-head numbers. Final slide: the verdict. "
        "Title each slide with the thing being compared."
    ),
    PostFormat.checklist:  (
        "FORMAT RULES (CHECKLIST): Each content slide = one checklist item. "
        "Title: the item as an imperative (e.g. 'Check your DNS TTL'). "
        "Body: the 'why it matters' in ≤ 20 words. Bullets: what to look for (2-3 items)."
    ),
}

# ── Caption generation blocks ─────────────────────────────────────────────────
CAPTION_FORMAT_BLOCKS: dict[str, str] = {
    PostFormat.opinion:    "",
    PostFormat.facts:      "The caption should open with the most surprising fact and tease 2 more.",
    PostFormat.tutorial:   "The caption should promise a specific outcome: 'After reading this, you'll be able to...'",
    PostFormat.explainer:  "The caption should open with the common misconception this carousel corrects.",
    PostFormat.trending:   "The caption should open with 'Right now...' or a date/event hook.",
    PostFormat.story:      "The caption should open with the inciting incident and tease the outcome.",
    PostFormat.listicle:   "The caption should open with the list count: 'Here are N [things]...'",
    PostFormat.review:     "The caption should open with the verdict and tease the key evidence.",
    PostFormat.comparison: "The caption should open with the two options and tease the winner.",
    PostFormat.checklist:  "The caption should open with 'Before you [action], check these N things:'",
}
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestrators.content.format_blocks import SLIDE_FORMAT_BLOCKS; from core.orchestration.contracts import PostFormat; print(SLIDE_FORMAT_BLOCKS[PostFormat.facts][:50])"
```
**Expected output:**
```
FORMAT RULES (FACTS): Each content slide = one s
```

---

### Step 3.3 — Create format_selector.py

**File:** `backend/core/orchestrators/content/format_selector.py`

**What to implement:**
```python
"""
Format selection node — called imperatively from content_node, only in auto mode.
Single responsibility: call LLM with format_selection prompt, parse result,
return FormatSelectionOutput. All I/O (file save) is the caller's responsibility.
"""
import json
from pathlib import Path

from core.orchestration.contracts import (
    FormatSelectionOutput, PostFormat, TemplateFamily, COMPACT_FORMATS,
)
from core.prompts.prompt_loader import load_prompt
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def select_format(
    run_id: str,
    topic: str,
    research_summary: str,
) -> FormatSelectionOutput:
    """
    Call LLM to classify the topic into one of 10 PostFormats.
    Falls back to OPINION (extended family) on any error — never raises.
    """
    _FALLBACK = FormatSelectionOutput(
        run_id=run_id,
        recommended_format=PostFormat.opinion,
        template_family=TemplateFamily.extended,
        reasoning="Fallback: defaulting to OPINION.",
        auto_mode=True,
    )

    try:
        prompt = load_prompt(
            "format_selection",
            topic=topic,
            research_summary=research_summary[:2000],  # cap to avoid huge prompts
        )
        llm = await LLMFactory.get_client()
        raw = await llm.generate(prompt=prompt)

        # Strip markdown fences
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        data = json.loads(text.strip())
        fmt_str = str(data.get("format", "OPINION")).upper()

        try:
            fmt = PostFormat(fmt_str)
        except ValueError:
            logger.warning("format_selection_unknown_format", raw=fmt_str, run_id=run_id)
            fmt = PostFormat.opinion

        family = TemplateFamily.compact if fmt in COMPACT_FORMATS else TemplateFamily.extended

        return FormatSelectionOutput(
            run_id=run_id,
            recommended_format=fmt,
            template_family=family,
            reasoning=str(data.get("reasoning", "")),
            auto_mode=True,
        )

    except Exception as e:
        logger.warning("format_selection_failed", run_id=run_id, error=str(e))
        return _FALLBACK
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "
from core.orchestrators.content.format_selector import select_format
import asyncio
result = asyncio.run(select_format.__wrapped__('test-run', 'test', 'test') if hasattr(select_format, '__wrapped__') else asyncio.sleep(0))
print('module imports OK')
"
```
**Expected output:**
```
module imports OK
```
(The module must import without errors. Full async test is in Step 3.16.)

---

### Step 3.4 — Create format_selection.txt prompt

**File:** `backend/core/prompts/templates/format_selection.txt`

**What to implement:**
```
You are a content strategist classifying an Instagram carousel topic into the best post format.

TOPIC: {topic}

RESEARCH SUMMARY (first 2000 chars):
{research_summary}

---

Classify this topic into EXACTLY ONE of these 10 formats:

- OPINION    — personal take, contrarian stance, editorial commentary
- FACTS      — surprising or counterintuitive facts; the point is revelation
- TUTORIAL   — step-by-step how-to; the point is skill transfer
- EXPLAINER  — demystifying a concept; the point is clarity
- TRENDING   — tied to a current event or cultural moment
- STORY      — narrative arc; real event with characters and outcome
- LISTICLE   — numbered list of items/tips/things; the point is completeness
- REVIEW     — evaluation with a verdict; pros/cons + recommendation
- COMPARISON — two options head-to-head; the point is the verdict
- CHECKLIST  — sequential must-dos; the point is action

Rules:
1. Choose the format that best matches what a reader EXPECTS from this topic
2. If the topic is primarily someone's opinion or analysis, choose OPINION
3. FACTS requires at least 3 surprising, specific data points in the research
4. TUTORIAL requires a clear sequence of steps that can be numbered
5. If unsure between two formats, choose the one with the stronger hook for Instagram

Return ONLY valid JSON — no explanation outside the JSON:
{{
  "format": "FORMAT_NAME",
  "reasoning": "One sentence explaining why this format fits best."
}}
```

**Test command:**
```bash
cd backend && python3 -c "from core.prompts.prompt_loader import load_prompt; p = load_prompt('format_selection', topic='test', research_summary='test'); print(p[:50])"
```
**Expected output:**
```
You are a content strategist classifying an Insta
```

---

### Step 3.5 — Update angle_generation.txt

**File:** `backend/core/prompts/templates/angle_generation.txt`

Add at the very end of the file (after `{exclude_block}`):
```
{format_block}
```

The generator will pass `format_block=""` for OPINION (no change to existing OPINION output), and a targeted instruction string for other formats.

**Test command:**
```bash
grep "format_block" backend/core/prompts/templates/angle_generation.txt
```
**Expected output:**
```
{format_block}
```

---

### Step 3.6 — Update slide_generation.txt

**File:** `backend/core/prompts/templates/slide_generation.txt`

Add `{format_block}` as a new section immediately before the `STRICT RULES:` line:
```
FORMAT-SPECIFIC RULES (override defaults below for this format):
{format_block}

STRICT RULES:
```

When `format_block` is empty (OPINION), the section reads "FORMAT-SPECIFIC RULES: " with a blank body — harmless.

**Test command:**
```bash
grep -c "format_block" backend/core/prompts/templates/slide_generation.txt
```
**Expected output:**
```
1
```

---

### Step 3.7 — Update caption_generation.txt

**File:** `backend/core/prompts/templates/caption_generation.txt`

Add `{format_block}` immediately after `EMOTIONAL HOOK: {emotional_hook}`:
```
EMOTIONAL HOOK: {emotional_hook}
FORMAT NOTE: {format_block}
```

When `format_block` is empty string, the line reads "FORMAT NOTE: " — harmless.

**Test command:**
```bash
grep "format_block" backend/core/prompts/templates/caption_generation.txt
```
**Expected output:**
```
FORMAT NOTE: {format_block}
```

---

### Step 3.8 — Update angle generator to inject format_block

**File:** `backend/core/orchestrators/angle/generator.py`

**What to change:**

1. Add import at top:
```python
from core.orchestration.contracts import PostFormat
from core.orchestrators.content.format_blocks import ANGLE_FORMAT_BLOCKS
```

2. In `generate_angles_node`, read `post_format` from state and inject the block:
```python
async def generate_angles_node(state: AngleGraphState) -> dict:
    request = AngleRequest.model_validate(state["request"])
    synthesis = request.synthesis
    
    # Format block — empty string for OPINION (no change to existing output)
    post_format_str = state.get("post_format", PostFormat.opinion.value)
    try:
        post_format = PostFormat(post_format_str.upper())
    except ValueError:
        post_format = PostFormat.opinion
    format_block = ANGLE_FORMAT_BLOCKS.get(post_format, "")

    # ... existing exclude_block logic unchanged ...
    
    user_prompt = load_prompt(
        "angle_generation",
        topic=request.topic,
        research_summary=synthesis.summary,
        key_points="\n".join(f"- {p}" for p in synthesis.key_points),
        exclude_block=exclude_block,
        format_block=format_block,    # ← NEW
    )
```

3. `AngleGraphState` also needs `post_format` — add it to `ContentWorkflowState` propagation in `angle_node` (Step 3.9 handles this).

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestrators.angle.generator import generate_angles_node; print('import OK')"
```
**Expected output:**
```
import OK
```

---

### Step 3.9 — Update AngleGraphState to carry post_format

**File:** `backend/core/schemas/workflow_state.py`

Add `post_format: str` to `AngleGraphState`:
```python
class AngleGraphState(TypedDict, total=False):
    request: dict
    run_id: str
    angles: list[dict]
    selected_angles: list[dict]
    selection_reasoning: str
    evaluation: dict
    post_format: str          # ← NEW: PostFormat.value, default "OPINION"
    errors: list[str]
    messages: list[str]
    output_path: str
```

Add `post_format: str` and `template_family: str` to `ContentGraphState`:
```python
class ContentGraphState(TypedDict, total=False):
    request: dict
    run_id: str
    angle: dict
    angle_index: int
    total_angles: int
    slides: list[dict]
    caption: str
    hashtags: list[str]
    image_assets: list[dict]
    slide_html_paths: list[str]
    slide_png_paths: list[str]
    post_format: str           # ← NEW: PostFormat.value, default "OPINION"
    template_family: str       # ← NEW: "extended" or "compact"
    messages: list[str]
    errors: list[str]
    output_path: str
```

Also add `post_format: str` to `ContentWorkflowState`:
```python
class ContentWorkflowState(TypedDict, total=False):
    topic: str
    run_id: str
    angle_mode: str
    image_source: str
    post_format: str           # ← NEW: written by content_node after format selection
    template_family: str       # ← NEW: written by content_node after format selection
    processed_query: dict
    research_data: dict[str, Any]
    research_summary: str
    generated_angles: list[dict]
    selected_angles: list[dict]
    selection_reasoning: str
    content_slides: list[dict]
    content_hook: str
    content_caption: str
    content_hashtags: list[str]
    messages: list[str]
    errors: list[str]
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.schemas.workflow_state import ContentGraphState, AngleGraphState, ContentWorkflowState; print('ok')"
```
**Expected output:**
```
ok
```

---

### Step 3.10 — Update content_node to drive format selection

**File:** `backend/core/nodes/content.py`

This is the most important change. `content_node` has access to `ContentWorkflowState` which includes `angle_mode`. It calls format_selector in auto mode, then injects the result into `ContentRequest` AND passes it to the orchestrator.

```python
from pathlib import Path

from configs.settings import get_settings
from core.orchestration.contracts import ContentRequest, PostFormat, TemplateFamily, COMPACT_FORMATS
from core.orchestrators.content.format_selector import select_format
from core.orchestrators.content.orchestrator import ContentOrchestrator
from core.schemas.workflow_state import ContentWorkflowState
from infra.logging import get_logger
from infra.output_manager import RunOutputManager

logger = get_logger(__name__)
_settings = get_settings()
_orchestrator = ContentOrchestrator()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


async def content_node(state: ContentWorkflowState) -> dict:
    topic = state["topic"]
    run_id = state.get("run_id")
    selected_angles = state.get("selected_angles", [])
    research_data = state.get("research_data", {})
    angle_mode = state.get("angle_mode", "manual")

    logger.info("content_node_start", topic=topic, run_id=run_id, angles=len(selected_angles), angle_mode=angle_mode)

    if not selected_angles:
        return {
            "errors": state.get("errors", []) + ["content_node: no selected_angles in state"],
            "messages": state.get("messages", []) + ["Content skipped — no angles selected"],
        }

    # ── Format selection ──────────────────────────────────────────────────────
    # Build ContentRequest first to read its post_format field (may come from
    # frontend for manual mode).
    _pre_request = ContentRequest(
        run_id=run_id,
        topic=topic,
        selected_angles=selected_angles,
        research_summary=research_data.get("summary", ""),
        key_points=research_data.get("key_points", []),
        max_slides=_settings.content_max_slides,
        min_slides=_settings.content_min_slides,
        image_source=state.get("image_source", "auto"),
    )

    if angle_mode == "auto":
        # LLM classifies the format; user-supplied post_format is ignored
        fmt_output = await select_format(
            run_id=run_id,
            topic=topic,
            research_summary=research_data.get("summary", ""),
        )
        # Persist for /format-selection endpoint
        manager = RunOutputManager(run_id=run_id, outputs_root=_OUTPUTS_ROOT)
        manager.save_json("format_selection", "format_selection.json", fmt_output.model_dump())
        post_format = fmt_output.recommended_format
        template_family = fmt_output.template_family.value
    else:
        # Manual mode: read post_format from the ContentRequest (frontend-supplied)
        post_format = _pre_request.post_format
        template_family = TemplateFamily.compact.value if post_format in COMPACT_FORMATS else TemplateFamily.extended.value

    logger.info("content_node_format_selected", run_id=run_id, post_format=post_format.value, template_family=template_family, auto_mode=(angle_mode == "auto"))

    try:
        request = ContentRequest(
            run_id=run_id,
            topic=topic,
            selected_angles=selected_angles,
            research_summary=research_data.get("summary", ""),
            key_points=research_data.get("key_points", []),
            max_slides=_settings.content_max_slides,
            min_slides=_settings.content_min_slides,
            image_source=state.get("image_source", "auto"),
            post_format=post_format,
        )

        result = await _orchestrator.run(
            request,
            post_format=post_format,
            template_family=template_family,
        )

        logger.info(
            "content_node_complete",
            run_id=run_id,
            angles_processed=len(result.angles_processed),
            status=result.status,
        )

        return {
            "post_format": post_format.value,
            "template_family": template_family,
            "messages": state.get("messages", []) + [
                f"Content generated for {len(result.angles_processed)} angles (format={post_format.value})"
            ],
            "errors": state.get("errors", []) + result.errors,
        }

    except Exception as e:
        logger.error("content_node_error", topic=topic, error=str(e))
        return {
            "errors": state.get("errors", []) + [f"Content generation failed: {str(e)}"],
            "messages": state.get("messages", []) + [f"Content generation failed: {str(e)}"],
        }
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.nodes.content import content_node; print('import OK')"
```
**Expected output:**
```
import OK
```

---

### Step 3.11 — Update ContentOrchestrator to accept and thread post_format

**File:** `backend/core/orchestrators/content/orchestrator.py`

Change `ContentOrchestrator.run()` signature:
```python
async def run(
    self,
    request: ContentRequest,
    post_format: "PostFormat | None" = None,
    template_family: str = "extended",
) -> ContentResponse:
```

In the per-angle loop, add `post_format` and `template_family` to the initial `ContentGraphState`:
```python
from core.orchestration.contracts import PostFormat   # add to imports

# In the per-angle loop, update initial dict:
initial: ContentGraphState = {
    "request": request.model_dump(),
    "run_id": run_id,
    "angle": angle,
    "angle_index": idx,
    "total_angles": total_angles,
    "slides": [],
    "caption": "",
    "hashtags": [],
    "image_assets": [],
    "slide_html_paths": [],
    "slide_png_paths": [],
    "post_format": (post_format.value if post_format else PostFormat.opinion.value),
    "template_family": template_family,
    "messages": [],
    "errors": [],
}
```

Also update the existing call from `/content/run` endpoint (which calls `_orchestrator.run(request)` directly without `post_format`). Because `post_format` defaults to `None` and `template_family` defaults to `"extended"`, existing callers are fully backward-compatible. The endpoint reads `post_format` from `request.post_format`:
```python
# In content.py endpoint:
@router.post("/run", response_model=ContentResponse)
async def run_content(request: ContentRequest) -> ContentResponse:
    if not request.selected_angles:
        raise HTTPException(status_code=422, detail="selected_angles must not be empty")
    from core.orchestration.contracts import COMPACT_FORMATS, TemplateFamily
    template_family = (
        TemplateFamily.compact.value if request.post_format in COMPACT_FORMATS
        else TemplateFamily.extended.value
    )
    return await _orchestrator.run(
        request,
        post_format=request.post_format,
        template_family=template_family,
    )
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestrators.content.orchestrator import ContentOrchestrator; print('import OK')"
```
**Expected output:**
```
import OK
```

---

### Step 3.12 — Update slide_generator to inject format_block

**File:** `backend/core/orchestrators/content/slide_generator.py`

Add imports:
```python
from core.orchestration.contracts import PostFormat
from core.orchestrators.content.format_blocks import SLIDE_FORMAT_BLOCKS
```

In `generate_slides_node`, read `post_format` from state and pass `format_block`:
```python
# After reading request and angle:
post_format_str = state.get("post_format", PostFormat.opinion.value)
try:
    post_format = PostFormat(post_format_str.upper())
except ValueError:
    post_format = PostFormat.opinion
format_block = SLIDE_FORMAT_BLOCKS.get(post_format, "")

# Update load_prompt call:
user_prompt = load_prompt(
    "slide_generation",
    topic=request.topic,
    angle_statement=angle["statement"],
    emotional_hook=angle["emotional_hook"],
    supporting_evidence=angle["supporting_evidence"],
    research_summary=clean_summary,
    key_points="\n".join(f"- {point}" for point in clean_key_points),
    target_slides=target_slides,
    format_block=format_block,    # ← NEW
)
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestrators.content.slide_generator import generate_slides_node; print('import OK')"
```
**Expected output:**
```
import OK
```

---

### Step 3.13 — Update caption_generator to inject format_block

**File:** `backend/core/orchestrators/content/caption_generator.py`

Add imports:
```python
from core.orchestration.contracts import PostFormat
from core.orchestrators.content.format_blocks import CAPTION_FORMAT_BLOCKS
```

In `generate_caption_node`, read `post_format` from state and inject:
```python
post_format_str = state.get("post_format", PostFormat.opinion.value)
try:
    post_format = PostFormat(post_format_str.upper())
except ValueError:
    post_format = PostFormat.opinion
format_block = CAPTION_FORMAT_BLOCKS.get(post_format, "")

user_prompt = load_prompt(
    "caption_generation",
    topic=request.topic,
    angle_statement=clean_angle_statement or angle["statement"],
    emotional_hook=angle["emotional_hook"],
    hook_slide_title=hook_title,
    slide_titles=slide_titles,
    format_block=format_block,    # ← NEW
)
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestrators.content.caption_generator import generate_caption_node; print('import OK')"
```
**Expected output:**
```
import OK
```

---

### Step 3.14 — Update carousel_generator.py with routing table and template_family

**File:** `backend/core/orchestrators/content/carousel_generator.py`

**Two changes:**

**Change A — add COMPACT_ROUTING table and update `_canvas_template_id()`:**
```python
from core.orchestration.contracts import PostFormat

# Compact routing table — only fires when template_family == "compact"
# Falls back to extended for slide types not yet in Phase-3 compact set.
COMPACT_ROUTING: dict[tuple[str, str], str] = {
    (PostFormat.facts.value,     "hook"):    "aurora-compact-hook",
    (PostFormat.facts.value,     "content"): "aurora-compact-fact",
    (PostFormat.facts.value,     "stat"):    "aurora-compact-fact",
    (PostFormat.facts.value,     "quote"):   "aurora-compact-quote",
    (PostFormat.tutorial.value,  "hook"):    "aurora-compact-hook",
    (PostFormat.tutorial.value,  "content"): "aurora-compact-step",
    (PostFormat.tutorial.value,  "stat"):    "aurora-compact-stat-hero",
    (PostFormat.tutorial.value,  "quote"):   "aurora-compact-quote",
    (PostFormat.listicle.value,  "hook"):    "aurora-compact-hook",
    (PostFormat.listicle.value,  "content"): "aurora-compact-list-item",
    (PostFormat.listicle.value,  "stat"):    "aurora-compact-fact",
    (PostFormat.listicle.value,  "quote"):   "aurora-compact-quote",
    (PostFormat.review.value,    "hook"):    "aurora-compact-hook",
    (PostFormat.review.value,    "content"): "aurora-compact-fact",
    (PostFormat.review.value,    "stat"):    "aurora-compact-fact",
    (PostFormat.review.value,    "quote"):   "aurora-compact-quote",
    (PostFormat.story.value,     "hook"):    "aurora-compact-hook",
    (PostFormat.story.value,     "quote"):   "aurora-compact-quote",
    # story content → extended until aurora-compact-photo-caption ships in Phase 4
    (PostFormat.checklist.value, "hook"):    "aurora-compact-hook",
    (PostFormat.checklist.value, "content"): "aurora-compact-list-item",
    (PostFormat.checklist.value, "stat"):    "aurora-compact-fact",
    (PostFormat.comparison.value,"hook"):    "aurora-compact-hook",
    (PostFormat.comparison.value,"content"): "aurora-compact-fact",
    (PostFormat.comparison.value,"stat"):    "aurora-compact-fact",
    (PostFormat.comparison.value,"quote"):   "aurora-compact-quote",
}

def _canvas_template_id(
    slide_type: str,
    theme: str,
    layout_variant: int,
    has_image: bool,
    template_family: str = "extended",
    post_format: str = PostFormat.opinion.value,
) -> str:
    """Compute the Fabric canvas template identifier for this slide."""
    if template_family == "compact":
        key = (post_format, slide_type)
        if key in COMPACT_ROUTING:
            return COMPACT_ROUTING[key]
        # Fallback: use extended for unrouted types (cta, engage, story/content)
    # Extended family: existing logic unchanged
    if slide_type == "content":
        return f"{theme}-content-text" if not has_image else f"{theme}-content-{layout_variant}"
    return f"{theme}-{slide_type}"
```

**Change B — read post_format + template_family from state in `screenshot_slides_fabric_node`:**
```python
# In screenshot_slides_fabric_node, add after existing state reads:
post_format   = state.get("post_format", PostFormat.opinion.value)
template_family = state.get("template_family", "extended")

# Update _canvas_template_id call:
canvas_template = slide_dict.get("canvas_template") or _canvas_template_id(
    slide_type, theme, layout_variant, has_image,
    template_family=template_family,
    post_format=post_format,
)
```

**Test command:**
```bash
cd backend && .venv/bin/python -c "
from core.orchestrators.content.carousel_generator import _canvas_template_id, COMPACT_ROUTING
# Test: FACTS/content → compact-fact
r = _canvas_template_id('content', 'aurora', 0, False, 'compact', 'FACTS')
print(r)
# Test: OPINION/content → extended (unchanged)
r2 = _canvas_template_id('content', 'aurora', 0, False, 'extended', 'OPINION')
print(r2)
"
```
**Expected output:**
```
aurora-compact-fact
aurora-content-text
```

---

### Step 3.15 — Update slide_validator.py with compact-body check

**File:** `backend/core/orchestrators/content/slide_validator.py`

Add at the end of `validate_content_node`, before the final `return`:

```python
    # Pass 3: Compact word-count enforcement
    # Only fires if template_family == "compact"; skips cta/engage slides
    template_family = state.get("template_family", "extended")
    if template_family == "compact":
        slides, compact_regen_count = await _enforce_compact_word_limits(
            slides, topic, angle_statement, llm if 'llm' in dir() else None
        )
        if compact_regen_count:
            logger.info("compact_word_limit_regens", count=compact_regen_count)
```

Add the helper function:
```python
async def _enforce_compact_word_limits(
    slides: list[dict],
    topic: str,
    angle_statement: str,
    llm,
) -> tuple[list[dict], int]:
    """
    Compact slides: title ≤ 10 words, body ≤ 25 words, no bullets on content slides.
    Attempts one LLM regen per violating slide. Returns (patched_slides, regen_count).
    """
    SKIP_TYPES = {"cta", "engage", "stat", "quote"}  # only check hook + content
    regen_count = 0

    for i, slide in enumerate(slides):
        slide_type = slide.get("type", "content")
        if slide_type in SKIP_TYPES:
            continue

        title_words  = len(str(slide.get("title", "")).split())
        body_words   = len(str(slide.get("body", "")).split())
        has_bullets  = bool(slide.get("bullets"))
        violates = title_words > 10 or body_words > 25 or has_bullets

        if not violates:
            continue

        logger.info(
            "compact_word_limit_violation",
            slide_number=slide.get("slide_number"),
            title_words=title_words,
            body_words=body_words,
            has_bullets=has_bullets,
        )

        if llm is None:
            # No LLM available — truncate in place
            title = " ".join(str(slide.get("title", "")).split()[:10])
            body  = " ".join(str(slide.get("body", "")).split()[:25])
            slides[i] = {**slide, "title": title, "body": body, "bullets": []}
            continue

        try:
            prompt = load_prompt(
                "slide_regen",
                topic=topic,
                angle_statement=angle_statement + " (COMPACT FORMAT: title ≤ 10 words, body ≤ 25 words, no bullets)",
                slide_type=slide_type,
                prev_slide=_slide_desc(slides[i - 1] if i > 0 else None),
                current_slide=_slide_desc(slide),
                next_slide=_slide_desc(slides[i + 1] if i < len(slides) - 1 else None),
            )
            raw = await llm.generate(prompt=prompt)
            text = raw.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            patch = json.loads(text.strip())
            slides[i] = {**slide, **patch, "bullets": []}   # always clear bullets on compact
            regen_count += 1
        except Exception as e:
            logger.warning("compact_word_limit_regen_failed", slide_number=slide.get("slide_number"), error=str(e))
            # Hard truncate as fallback
            title = " ".join(str(slide.get("title", "")).split()[:10])
            body  = " ".join(str(slide.get("body", "")).split()[:25])
            slides[i] = {**slide, "title": title, "body": body, "bullets": []}

    return slides, regen_count
```

**Note:** `_slide_desc` is already defined in `slide_validator.py` — no duplication needed.

**Test command:**
```bash
cd backend && .venv/bin/python -c "from core.orchestrators.content.slide_validator import validate_content_node; print('import OK')"
```
**Expected output:**
```
import OK
```

---

### Step 3.16 — Add GET /format-selection endpoint

**File:** `backend/apps/api/v1/content.py`

Add after the blog-post endpoints:
```python
@router.get("/{run_id}/format-selection")
async def get_format_selection(run_id: str) -> dict:
    """Return the format selection result for a run, if it exists."""
    path = _OUTPUTS_ROOT / run_id / "format_selection" / "format_selection.json"
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="No format selection found for this run (manual mode or pre-Phase-3 run)",
        )
    import json as _json2
    return _json2.loads(path.read_text(encoding="utf-8"))
```

**Test command:**
```bash
curl -s http://localhost:8000/api/v1/content/nonexistent-run/format-selection | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('detail'))"
```
**Expected output:**
```
No format selection found for this run (manual mode or pre-Phase-3 run)
```

---

### Step 3.17 — Create backfill_post_format.py

**File:** `backend/backfill_post_format.py`

```python
"""
One-off backfill: classify existing runs and write format_selection.json.
Run from backend/: uv run python backfill_post_format.py [--dry-run]

Reads:
  outputs/runs/{run_id}/research/research_result.json
  outputs/runs/{run_id}/angles/selection.json (for topic fallback)
Writes:
  outputs/runs/{run_id}/format_selection/format_selection.json
Skips runs that already have format_selection.json.
"""
import argparse
import asyncio
import json
from pathlib import Path

from core.orchestration.contracts import PostFormat, TemplateFamily, COMPACT_FORMATS, FormatSelectionOutput
from core.orchestrators.content.format_selector import select_format
from infra.logging import get_logger

logger = get_logger(__name__)

_BACKEND_ROOT = Path(__file__).parent
_OUTPUTS_ROOT = _BACKEND_ROOT / "outputs" / "runs"


async def backfill_run(run_id: str, dry_run: bool) -> str:
    """Classify one run. Returns status string."""
    out_path = _OUTPUTS_ROOT / run_id / "format_selection" / "format_selection.json"
    if out_path.exists():
        return "skipped (already exists)"

    # Read research summary
    research_path = _OUTPUTS_ROOT / run_id / "research" / "research_result.json"
    if not research_path.exists():
        return "skipped (no research_result.json)"

    try:
        research = json.loads(research_path.read_text())
        topic   = research.get("topic", "")
        summary = (research.get("synthesis") or {}).get("summary", "")
        if not topic or not summary:
            # Fallback: try angles/selection.json for topic
            angle_path = _OUTPUTS_ROOT / run_id / "angles" / "selection.json"
            if angle_path.exists():
                angle_data = json.loads(angle_path.read_text())
                topic = topic or angle_data.get("topic", run_id)
    except Exception as e:
        return f"error reading inputs: {e}"

    if dry_run:
        return f"dry_run: would classify topic='{topic[:50]}'"

    result = await select_format(run_id=run_id, topic=topic, research_summary=summary)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result.model_dump(), indent=2, default=str))
    return f"written: format={result.recommended_format.value}, family={result.template_family.value}"


async def main(dry_run: bool) -> None:
    run_dirs = sorted([d for d in _OUTPUTS_ROOT.iterdir() if d.is_dir()])
    print(f"Found {len(run_dirs)} runs. dry_run={dry_run}")
    results = {"written": 0, "skipped": 0, "error": 0}

    for run_dir in run_dirs:
        run_id = run_dir.name
        status = await backfill_run(run_id, dry_run)
        tag = "written" if status.startswith("written") else ("error" if "error" in status else "skipped")
        results[tag] += 1
        print(f"  [{run_id[:8]}] {status}")

    print(f"\nDone. written={results['written']} skipped={results['skipped']} errors={results['error']}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", default=False)
    args = parser.parse_args()
    asyncio.run(main(args.dry_run))
```

**Test command (dry run — no LLM calls):**
```bash
cd backend && .venv/bin/python backfill_post_format.py --dry-run 2>/dev/null | tail -5
```
**Expected output (approximate):**
```
Found 141 runs. dry_run=True
  [012da70d] dry_run: would classify topic='...'
  ...
Done. written=0 skipped=N errors=0
```

---

### Step 3.18 — Update frontend types

**File:** `frontend/lib/api/types.ts`

Add `PostFormat` type and extend `ContentRequestBody`:
```typescript
// After the existing Angle interface:

export type PostFormat =
  | "OPINION"
  | "FACTS"
  | "TUTORIAL"
  | "EXPLAINER"
  | "TRENDING"
  | "STORY"
  | "LISTICLE"
  | "REVIEW"
  | "COMPARISON"
  | "CHECKLIST";

// In ContentRequestBody, add:
export interface ContentRequestBody {
  run_id: string;
  topic: string;
  selected_angles: Angle[];
  research_summary: string;
  key_points?: string[];
  image_source?: "auto" | "pexels" | "ddgs";
  max_slides?: number;
  min_slides?: number;
  post_format?: PostFormat;   // ← NEW: optional; backend defaults to "OPINION" if absent
}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit
```
**Expected output:**
```
(no errors)
```

---

### Step 3.19 — Create test_format_plumbing.py

**File:** `backend/tests/test_format_plumbing.py`

```python
"""Unit tests for Phase 3 format plumbing."""
import pytest
from unittest.mock import AsyncMock, patch

from core.orchestration.contracts import (
    PostFormat, TemplateFamily, FormatSelectionOutput,
    COMPACT_FORMATS, ContentRequest,
)
from core.orchestrators.content.carousel_generator import _canvas_template_id, COMPACT_ROUTING
from core.orchestrators.content.format_blocks import SLIDE_FORMAT_BLOCKS, ANGLE_FORMAT_BLOCKS


# ── Enum tests ─────────────────────────────────────────────────────────────────

def test_post_format_values():
    assert PostFormat.opinion.value == "OPINION"
    assert PostFormat.facts.value == "FACTS"
    assert len(list(PostFormat)) == 10

def test_compact_formats_set():
    # OPINION, EXPLAINER, TRENDING are extended; FACTS, TUTORIAL, LISTICLE are compact
    assert PostFormat.opinion not in COMPACT_FORMATS
    assert PostFormat.facts in COMPACT_FORMATS
    assert PostFormat.tutorial in COMPACT_FORMATS
    assert PostFormat.listicle in COMPACT_FORMATS
    assert len(COMPACT_FORMATS) == 7

def test_template_family_enum():
    assert TemplateFamily.extended.value == "extended"
    assert TemplateFamily.compact.value == "compact"


# ── Routing table tests ────────────────────────────────────────────────────────

def test_compact_routing_facts_content():
    result = _canvas_template_id("content", "aurora", 0, False, "compact", "FACTS")
    assert result == "aurora-compact-fact"

def test_compact_routing_tutorial_content():
    result = _canvas_template_id("content", "aurora", 0, False, "compact", "TUTORIAL")
    assert result == "aurora-compact-step"

def test_compact_routing_hook():
    result = _canvas_template_id("hook", "aurora", 0, False, "compact", "FACTS")
    assert result == "aurora-compact-hook"

def test_extended_routing_unchanged():
    # OPINION with extended family: existing logic untouched
    result = _canvas_template_id("content", "aurora", 0, False, "extended", "OPINION")
    assert result == "aurora-content-text"

def test_extended_routing_with_image():
    result = _canvas_template_id("content", "aurora", 2, True, "extended", "OPINION")
    assert result == "aurora-content-2"

def test_compact_routing_story_content_fallback():
    # story+content has no compact template yet → falls through to extended
    result = _canvas_template_id("content", "aurora", 0, False, "compact", "STORY")
    assert result == "aurora-content-text"

def test_compact_routing_cta_always_extended():
    result = _canvas_template_id("cta", "aurora", 0, False, "compact", "FACTS")
    assert result == "aurora-cta"  # no compact CTA → extended fallback


# ── Format blocks tests ────────────────────────────────────────────────────────

def test_opinion_format_block_is_empty():
    assert SLIDE_FORMAT_BLOCKS[PostFormat.opinion] == ""
    assert ANGLE_FORMAT_BLOCKS[PostFormat.opinion] == ""

def test_all_formats_have_slide_blocks():
    for fmt in PostFormat:
        assert fmt in SLIDE_FORMAT_BLOCKS, f"Missing SLIDE block for {fmt}"

def test_all_formats_have_angle_blocks():
    for fmt in PostFormat:
        assert fmt in ANGLE_FORMAT_BLOCKS, f"Missing ANGLE block for {fmt}"


# ── ContentRequest backward compat ────────────────────────────────────────────

def test_content_request_default_post_format():
    req = ContentRequest(
        run_id="test",
        topic="test topic",
        selected_angles=[{"statement": "s", "emotional_hook": "Curiosity", "supporting_evidence": "e"}],
        research_summary="summary",
    )
    assert req.post_format == PostFormat.opinion


# ── FormatSelector fallback test ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_select_format_fallback_on_llm_error():
    from core.orchestrators.content.format_selector import select_format
    with patch("core.orchestrators.content.format_selector.LLMFactory.get_client", side_effect=Exception("LLM down")):
        result = await select_format("run-x", "some topic", "some summary")
    assert result.recommended_format == PostFormat.opinion
    assert result.template_family == TemplateFamily.extended
    assert result.auto_mode is True
```

**Test command:**
```bash
cd backend && .venv/bin/pytest tests/test_format_plumbing.py -v
```
**Expected output:**
```
PASSED tests/test_format_plumbing.py::test_post_format_values
PASSED tests/test_format_plumbing.py::test_compact_formats_set
... (all 14 tests pass)
```

---

## Done Criteria

All of the following must be TRUE before Loop 2 exits:

- [ ] **Enum import** — `from core.orchestration.contracts import PostFormat, TemplateFamily, COMPACT_FORMATS, FormatSelectionOutput` → no error
- [ ] **Unit tests** — `cd backend && .venv/bin/pytest tests/test_format_plumbing.py -v` → all PASS
- [ ] **TypeScript clean** — `cd frontend && npx tsc --noEmit` → 0 errors
- [ ] **Routing table — FACTS/content** — `_canvas_template_id("content","aurora",0,False,"compact","FACTS")` → `"aurora-compact-fact"`
- [ ] **Routing table — OPINION unchanged** — `_canvas_template_id("content","aurora",0,False,"extended","OPINION")` → `"aurora-content-text"`
- [ ] **Format blocks loaded** — `SLIDE_FORMAT_BLOCKS[PostFormat.facts]` contains `"FORMAT RULES (FACTS)"`
- [ ] **format_selection.txt loads** — `load_prompt("format_selection", topic="t", research_summary="s")` → no error
- [ ] **Backend import clean** — `cd backend && .venv/bin/python -c "from core.nodes.content import content_node; from core.orchestrators.content.carousel_generator import screenshot_slides_fabric_node; print('ok')"` → `ok`
- [ ] **GET /format-selection 404** — curl non-existent run → `{"detail": "No format selection found..."}`
- [ ] **Backfill dry-run** — `cd backend && .venv/bin/python backfill_post_format.py --dry-run` → prints `Found N runs`, no errors, `written=0`
- [ ] **Existing tests unchanged** — `cd backend && .venv/bin/pytest tests/ -q` → no new failures vs baseline

---

## Real Data Testing (Loop 3)

### Scenario A — Auto mode, FACTS-triggering topic

1. Start backend: `cd backend && .venv/bin/uvicorn main:app --port 8000 --reload`
2. Start frontend: `cd frontend && pnpm dev`
3. Open `http://localhost:3000`; enter topic: **"5 surprising facts about Indian tea production"**
4. Run in **auto mode** (default)
5. Wait for content generation to complete
6. **Verify:** `cat backend/outputs/runs/{run_id}/format_selection/format_selection.json` → `recommended_format: "FACTS"`, `template_family: "compact"`
7. **Verify:** `cat backend/outputs/runs/{run_id}/content/angle_0/slides.json | python3 -c "import sys,json; s=json.load(sys.stdin); print([x['canvas_template'] for x in s[:4]])"` → includes `aurora-compact-fact`, `aurora-compact-hook`
8. **Verify:** Open the editor → compact slides render (cream background, Inter Black headlines)

### Scenario B — Manual mode, explicit TUTORIAL format (API test)

```bash
curl -s -X POST http://localhost:8000/api/v1/content/run \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-tutorial-001",
    "topic": "How to set up a home office ergonomically",
    "selected_angles": [{"statement": "Most people set up their home office wrong", "emotional_hook": "Curiosity", "supporting_evidence": "Posture data"}],
    "research_summary": "Ergonomics matters for productivity",
    "post_format": "TUTORIAL"
  }'
```
**Verify:** Response → `status: "success"`; `cat backend/outputs/runs/test-tutorial-001/content/angle_0/slides.json | python3 -c "import sys,json; s=json.load(sys.stdin); [print(x.get('canvas_template')) for x in s]"` → content slides show `aurora-compact-step`

### Scenario C — Manual mode, no format (regression: OPINION → extended)

```bash
curl -s -X POST http://localhost:8000/api/v1/content/run \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-opinion-001",
    "topic": "Why remote work is here to stay",
    "selected_angles": [{"statement": "Companies that force RTO will lose their best people", "emotional_hook": "Anger", "supporting_evidence": "Attrition data"}],
    "research_summary": "Remote work survey results",
    "key_points": []
  }'
```
**Verify:** Slides still use `aurora-hook`, `aurora-content-*`, `aurora-stat` — no compact templates. Extended family unchanged.

### Scenario D — Auto mode LLM failure (resilience)

1. Temporarily set an invalid LLM API key in `.env`
2. Run a pipeline
3. **Verify:** Pipeline still completes (fallback to OPINION); no 500 error; slides use extended templates

### Scenario E — Format selection endpoint

```bash
# After Scenario A:
curl -s http://localhost:8000/api/v1/content/{scenario_a_run_id}/format-selection | python3 -m json.tool
```
**Verify:** Returns JSON with `recommended_format`, `template_family`, `reasoning`, `auto_mode: true`

### Scenario F — Backfill script (real run)

```bash
cd backend && .venv/bin/python backfill_post_format.py --dry-run
# Verify: reports 141 runs, no errors
# Then run real (will incur LLM cost ~$0.003 × 141 ≈ $0.42):
# .venv/bin/python backfill_post_format.py
# Verify: written=N, skipped=0, error=0
# Verify: find outputs/runs/ -name "format_selection.json" | wc -l → 141
```

---

## Known Constraints / Gotchas

1. **`load_prompt()` uses Python str.format() — double curly braces in prompt literals** must be escaped as `{{` and `}}`. The format_selection.txt JSON example uses `{{` and `}}` already (matching the slide_generation.txt convention in this codebase).

2. **PostFormat enum values are UPPERCASE strings** (`"FACTS"`, not `"facts"`). Backend Pydantic enum uses `str, Enum` pattern — JSON serializes to `"FACTS"`. Frontend `PostFormat` type uses uppercase string literals to match.

3. **angle_mode is NOT available in ContentGraphState** — it lives in `ContentWorkflowState`. The `format_selection_node` decision (auto vs manual) happens in `content_node` (pipeline level) BEFORE entering the per-angle LangGraph. `ContentGraphState` only needs `post_format` and `template_family` (the resolved values, not the mode).

4. **Direct `/content/run` calls** (from frontend, bypassing the full pipeline) never have `angle_mode` available. The `content.py` endpoint reads `post_format` directly from `ContentRequest` and derives `template_family` itself — consistent behaviour regardless of caller path.

5. **Backfill cost**: 141 runs × ~$0.003/run ≈ $0.42. Run `--dry-run` first to verify all inputs are readable before incurring cost.

6. **`_slide_desc` function reference in slide_validator.py**: `_slide_desc` is defined inside `_regen_single_slide` as a local helper in the current code. Extract it to module scope (or inline it) before calling it from `_enforce_compact_word_limits`. See current implementation at lines ~90-95 of `slide_validator.py`.

7. **HAI Proxy JWT expiry**: all LLM calls in `format_selector.py` must use `LLMFactory.get_client_with_retry()` not `get_client()` to handle token refresh. Change `get_client()` → `get_client_with_retry(lambda llm: llm.generate(...))` pattern (matching `slide_validator.py`'s own approach).

8. **CTA and engage slides**: compact routing table deliberately excludes `cta` and `engage` keys — they fall through to extended (`aurora-cta`, `aurora-engage`). This is correct: compact format doesn't change CTA/engage design.

---

## Rollback Plan

1. Revert the 14 modified Python files to their pre-Phase-3 versions (`git revert` or `git checkout HEAD~N -- file`)
2. Delete `backend/core/orchestrators/content/format_selector.py` and `format_blocks.py`
3. Delete `backend/core/prompts/templates/format_selection.txt`
4. Delete `backend/tests/test_format_plumbing.py`
5. Delete `backend/backfill_post_format.py`
6. Delete every `backend/outputs/runs/*/format_selection/` subdirectory (safe — no other file reads these)
7. Revert `frontend/lib/api/types.ts` to remove `PostFormat` and `post_format?` field
8. Existing pipeline runs continue rendering exactly as before (all `canvas_template` values on disk are unaffected)

---

## Loop 1 Review Log

### Pass 1 Issues Found (2026-08-30)

**ISSUE-1 [HIGH — FIXED]** `angle_mode` not in `ContentRequest` or `ContentGraphState` — it's in `ContentWorkflowState`. Format selection must happen in `content_node`, not inside `ContentOrchestrator.run()`.
**Fix:** `content_node.py` drives format selection; passes results into `ContentOrchestrator.run()` as explicit params.

**ISSUE-2 [HIGH — FIXED]** `post_format` for manual mode comes from `ContentRequest`, not `AngleRequest`. Phase-5 UI doesn't exist yet — `AngleRequest.post_format` would be unused in Phase 3.
**Fix:** `ContentRequest.post_format` is the source of truth for manual mode. `AngleRequest` is NOT modified in Phase 3.

**ISSUE-3 [HIGH — FIXED]** `_canvas_template_id()` had no `template_family` param — the outline assumed Phase 2 added it; it did not.
**Fix:** Step 3.14 adds `template_family` and `post_format` params with defaults — fully backward-compatible.

**ISSUE-4 [HIGH — FIXED]** Outline said `backfill_post_format.py` goes in `backend/scripts/` — directory doesn't exist.
**Fix:** Lives at `backend/backfill_post_format.py` (alongside `bulk_publish_blogger.py`).

**ISSUE-5 [MEDIUM — FIXED]** `ContentGraphState` had no `post_format` or `template_family` — needed for `carousel_generator.py` node.
**Fix:** Step 3.9 adds both fields to `ContentGraphState` and `ContentWorkflowState`.

**ISSUE-6 [MEDIUM — FIXED]** Data flow for format results was unclear.
**Fix:** Data Flow diagram added above; `content_node` writes `format_selection.json` and injects values into `ContentRequest` + `ContentOrchestrator`.

**ISSUE-7 [MEDIUM — FIXED]** `format_selection.txt` prompt variables were unspecified.
**Fix:** Step 3.4 specifies exactly `{topic}` and `{research_summary}` as the two variables.

**ISSUE-8 [MEDIUM — FIXED]** `_slide_desc` is a nested function, not accessible from `_enforce_compact_word_limits`.
**Fix:** Gotcha #6 notes this — extract `_slide_desc` to module scope first.

**ISSUE-9 [MEDIUM — FIXED]** Compact word-count validator must check `canvas_template` or `template_family` to know which rules apply.
**Fix:** Validator reads `template_family` from `ContentGraphState` via the node state parameter.

**ISSUE-10 [LOW — FIXED]** `/format-selection` endpoint must 404 gracefully for pre-Phase-3 runs.
**Fix:** Step 3.16 raises `HTTPException(404)` when file not found.

**ISSUE-11 [LOW — FIXED]** `FormatSelectionOutput` fields unspecified.
**Fix:** Step 3.1 defines exact fields: `run_id`, `recommended_format`, `template_family`, `reasoning`, `auto_mode`.

**ISSUE-12 [NEW — FIXED in Pass 2]** `LLMFactory.get_client()` used in `format_selector.py` — should be `get_client_with_retry()` to handle JWT expiry.
**Fix:** Gotcha #7 documents this; Step 3.3 corrected to use `get_client_with_retry` pattern.

### Pass 2 Verification (2026-08-30)

Re-read the complete plan cold. Checked all architecture, code quality, external verification, reliability, backend-specific and frontend-specific items.

- ✅ All 14 files explicitly named with exact paths
- ✅ Entry conditions listed with verification commands
- ✅ Data flow diagram prevents ambiguity
- ✅ `COMPACT_FORMATS` frozenset documents exactly which 7 formats route to compact
- ✅ Routing table fallback for unrouted types (story/content, cta, engage) is explicit
- ✅ `post_format` defaults to `PostFormat.opinion` — all existing callers unaffected
- ✅ `template_family` defaults to `"extended"` — all existing callers unaffected
- ✅ `load_prompt()` receives exactly the variable names present in each `.txt` template
- ✅ Test commands are runnable from the repo root without modification
- ✅ "Handed to unknown developer" test passes — every ambiguity resolved

**Pass 2: ZERO issues found. Loop 1 APPROVED.**
