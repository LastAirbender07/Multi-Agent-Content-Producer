# PHASE 2 — Format-Selection Plumbing

## Status
APPROVED — Loop 1 complete (2 clean passes), ready to implement

## Problem Statement

Our pipeline is hardwired to produce **opinion-format** carousels only. Every angle prompt says "take a strong stance"; every slide follows opinion-structure rules; every caption ends the same way. The strategy doc lists 10 distinct content formats (FACTS, TUTORIAL, EXPLAINER, TRENDING, STORY, LISTICLE, REVIEW, COMPARISON, CHECKLIST, plus the current OPINION) that different topics warrant.

We can't build any of those formats until the pipeline **knows** which format it's producing. This phase adds that knowledge everywhere — as a Pydantic enum, as a new LangGraph node that recommends a format from the research synthesis, as an injected `{format_block}` in the three prompt files that shape angles + slides + captions, and as a `template_family` field that will (in Phase 3+) route slides to the right visual builders.

**After this phase ships:** every new pipeline run has a `post_format` recommendation, all 3 prompts receive a format-specific instruction block, existing runs continue to render via the fallback path, and the `extended` (current) template family is still the default output. **Zero visible change in slide output.** All existing runs backfilled with a plausible `post_format` so the analytics can start showing distribution.

## Requirements

**Functional**
- New `PostFormat`, `TemplateFamily`, `FormatSelectionOutput` enums/models in `contracts.py`
- New async function `format_selection_node(state)` runs after research synthesis, before angle generation, and produces one `FormatSelectionOutput`
- Node output persisted at `outputs/runs/{run_id}/format_selection.json`
- `angle_generation.txt`, `slide_generation.txt`, `caption_generation.txt` prompts gain a `{format_block}` placeholder; each orchestrator holds a `FORMAT_BLOCKS: dict[PostFormat, str]` map and injects the correct block
- `Angle` model gains `post_format: PostFormat` field (default OPINION for backward-compat)
- `_canvas_template_id()` gains a `template_family: str = "extended"` param and prefixes non-generic types (`content`, `stat`, `quote`) with `{theme}-{family}-` when family is passed
- New REGISTRY entries `aurora-extended-*` and `lumina-extended-*` in `frontend/utils/canvasTemplates/index.ts`, aliasing the current builders — old IDs kept
- One-off Python script `backfill_post_format.py` reads every existing `outputs/runs/*/research/research_result.json`, calls the LLM once to classify `post_format`, and writes it into `angles/selection.json[*].post_format` + a new `format_selection.json` at the run root
- New endpoint `GET /api/v1/content/{run_id}/format-selection` returns the JSON

**Non-functional**
- **Zero visible change** in generated PNGs — `template_family` defaults to `"extended"` throughout Phase 2
- Backward compat — every existing endpoint response schema unchanged (or extended additively)
- Loop 3 legacy-run check still passes (`SlidePngPreview` view-only banner behaviour intact)
- Prompt token bloat < 5 % on the angle-generation LLM call
- All existing backend unit tests continue to pass
- All Playwright specs continue to pass

## External Verification Log

| Claim | Verified against | Verified on |
|-------|------------------|-------------|
| `_canvas_template_id()` is a plain sync function at `carousel_generator.py:30`, only 3 hits total (one def + two internal call sites) — safe to add a keyword-only arg with default | `grep -n "_canvas_template_id" backend/core/orchestrators/content/carousel_generator.py` → lines 30, 77, 114 | 2026-08-22 |
| `EmotionalHook(str, Enum)` and `ContentCategory(str, Enum)` at `contracts.py:96,109` — proven Pydantic-enforced pattern to copy for `PostFormat` and `TemplateFamily` | `sed -n '96,140p' backend/core/orchestration/contracts.py` | 2026-08-22 |
| `load_prompt(name, **kwargs)` uses Python `str.format(**kwargs)` for `{variable}` substitution — adding a new placeholder requires all callers to pass it (or `KeyError`) | `cat backend/core/prompts/prompt_loader.py` — confirmed | 2026-08-22 |
| The content pipeline is orchestrated imperatively by `ContentOrchestrator.run()` in `orchestrator.py`, NOT via a LangGraph node between research and content — so `format_selection_node` is called as a plain async function from the orchestrator, not added to a StateGraph | Direct read of `backend/core/orchestrators/content/orchestrator.py` | 2026-08-22 |
| REGISTRY's TS type `Record<string, TemplateBuilder>` — multiple keys pointing to the same builder is already the pattern for Lumina wrappers (`lw(...)`) | Direct file read `frontend/utils/canvasTemplates/index.ts:31-56` | 2026-08-22 |
| `inferTemplate()` in `index.ts:57-71` returns `${theme}-${slide.type}` for non-content types — new `aurora-extended-*` aliases aren't hit by inference (only when explicit `canvas_template` is set), so editor fallback path is unchanged | Direct file read | 2026-08-22 |
| `generate_structured(schema)` on `LLMFactory.get_client_with_retry` is the standard pattern with Pydantic validation + auto-retry (max 3) | `AI_CHANGELOG.md` 2026-07-04 LLM Knowledge classification: "The node now uses `generate_structured(output_schema=...)` — same pattern as all other pipeline nodes" | 2026-08-22 |
| `backfill_categories.py` set the read-modify-write pattern against `outputs/runs/*` — safe and non-destructive; use for `post_format` backfill | `AI_CHANGELOG.md` 2026-07-04 "backfill_categories.py — 35 runs updated, 38 hooks normalised" | 2026-08-22 |
| `Angle.emotional_hook` is already Pydantic-enforced as `EmotionalHook` enum with a default — safe pattern for adding `post_format: PostFormat` with `PostFormat.opinion` default | `grep -A1 "emotional_hook:" backend/core/orchestration/contracts.py` | 2026-08-22 |

## Entry Conditions (verify ALL before writing code)

- [ ] Phase 1 status is COMPLETE — verify: `grep "^## Status" Docs/phases/PHASE_1_editor_canvas_save.md` shows `COMPLETE` (or move to `COMPLETE` first)
- [ ] Backend health check passes — verify: `cd backend && uv run uvicorn main:app --port 8000 &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/v1/analytics/summary` returns `200`
- [ ] Frontend TypeScript compiles clean — verify: `cd frontend && npx tsc --noEmit` exits 0
- [ ] At least 5 existing runs on disk (for backfill validation) — verify: `ls backend/outputs/runs/ | wc -l` shows ≥ 5
- [ ] LLM provider is reachable — verify: `cd backend && uv run python -c "from infra.llm.factory import LLMFactory, get_client_with_retry; print('OK')"` prints `OK`
- [ ] `load_prompt` supports `**kwargs` — verify: `grep -A3 "def load_prompt" backend/core/prompts/prompt_loader.py` shows `**kwargs` signature

## Files to Create or Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `backend/core/orchestration/contracts.py` | MODIFY | Add `PostFormat`, `TemplateFamily`, `FormatSelectionOutput`; add `post_format` field to `Angle` |
| 2 | `backend/core/prompts/templates/format_selection.txt` | CREATE | LLM prompt to pick 1 recommended + 2 alternative formats from synthesis |
| 3 | `backend/core/orchestrators/content/format_blocks.py` | CREATE | Three dicts: `ANGLE_FORMAT_BLOCKS`, `SLIDE_FORMAT_BLOCKS`, `CAPTION_FORMAT_BLOCKS` — one entry per `PostFormat` |
| 4 | `backend/core/orchestrators/content/format_selector.py` | CREATE | `format_selection_node(state)` async function |
| 5 | `backend/core/orchestrators/content/orchestrator.py` | MODIFY | Call `format_selection_node` after loading research, before dispatching angle orchestrator |
| 6 | `backend/core/prompts/templates/angle_generation.txt` | MODIFY | Add `{format_block}` placeholder in rules section |
| 7 | `backend/core/prompts/templates/slide_generation.txt` | MODIFY | Add `{format_block}` placeholder in structure section |
| 8 | `backend/core/prompts/templates/caption_generation.txt` | MODIFY | Add `{format_block}` placeholder in hook section |
| 9 | `backend/core/orchestrators/angle/generator.py` | MODIFY | Read `state["format_selection"].recommended` → look up `ANGLE_FORMAT_BLOCKS[pf]` → pass as `format_block=` kwarg to `load_prompt` |
| 10 | `backend/core/orchestrators/content/slide_generator.py` | MODIFY | Same as #9 with `SLIDE_FORMAT_BLOCKS` |
| 11 | `backend/core/orchestrators/content/caption_generator.py` | MODIFY | Same as #9 with `CAPTION_FORMAT_BLOCKS` |
| 12 | `backend/core/orchestrators/content/carousel_generator.py` | MODIFY | `_canvas_template_id(..., template_family="extended")`; non-generic types get `{theme}-{family}-` prefix. Read `template_family` from `state["format_selection"]` at the call site |
| 13 | `frontend/utils/canvasTemplates/index.ts` | MODIFY | Add `aurora-extended-*` + `lumina-extended-*` REGISTRY aliases (same builders) |
| 14 | `backend/scripts/backfill_post_format.py` | CREATE | Read every `outputs/runs/*/research/research_result.json`, LLM-classify format, write to run |
| 15 | `backend/tests/test_format_selection.py` | CREATE | Unit tests: enum validation, node happy path (mocked LLM), `_canvas_template_id` with families, `FORMAT_BLOCKS` completeness |
| 16 | `backend/apps/api/v1/content.py` | MODIFY | Add `GET /content/{run_id}/format-selection` endpoint that reads `format_selection.json` |
| 17 | `frontend/lib/api/types.ts` | MODIFY | Add `PostFormat` + `TemplateFamily` string-literal types; extend `Angle` interface with optional `post_format` |
| 18 | `frontend/lib/api/content.ts` | MODIFY | Add `getFormatSelection(runId)` thin fetch |

**No frontend UI changes in Phase 2.** Types are added to the API layer so Phase 5 can consume them.

## Implementation Steps

### Step 2.1 — Add enums + `FormatSelectionOutput` + extend `Angle`

**File:** `backend/core/orchestration/contracts.py`

**What to implement:**
After `ContentCategory` and `EmotionalHook` (lines 96-119), add:

```python
class PostFormat(str, Enum):
    """The narrative format of a carousel — governs voice, structure, and template family."""
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
    """The visual density family — decides which builder family renders each slide."""
    extended = "extended"
    compact  = "compact"
    mixed    = "mixed"


class FormatSelectionOutput(BaseModel):
    """LLM-produced format recommendation from research synthesis."""
    recommended:     PostFormat
    alternatives:    list[PostFormat] = Field(default_factory=list, description="Top 2 alternatives, ranked")
    reasoning:       str = Field(..., description="1-3 sentences: why this format fits")
    template_family: TemplateFamily
```

Then extend `Angle`:
```python
class Angle(BaseModel):
    statement:           str
    emotional_hook:      EmotionalHook = Field(...)
    supporting_evidence: str
    post_format:         PostFormat = Field(
        default=PostFormat.opinion,
        description="Narrative format. Defaults to opinion for backward compatibility with pre-Phase-2 runs.",
    )
```

**Test command:**
```bash
cd backend && uv run python -c "
from core.orchestration.contracts import PostFormat, TemplateFamily, FormatSelectionOutput, Angle
o = FormatSelectionOutput(recommended='FACTS', alternatives=['EXPLAINER','OPINION'], reasoning='Rich data, no strong thesis', template_family='compact')
print('OK:', o.recommended, o.template_family)
a = Angle(statement='x', emotional_hook='Surprise', supporting_evidence='y')
print('Angle default:', a.post_format)
"
```

**Expected output:**
```
OK: PostFormat.facts TemplateFamily.compact
Angle default: PostFormat.opinion
```

---

### Step 2.2 — Write the format-selection prompt

**File:** `backend/core/prompts/templates/format_selection.txt`

**What to implement:**
A ≤2500-token prompt with:
- Table of all 10 formats with their emotion + density + best-fit topics (copy from strategy doc)
- Explicit rules for choosing:
  - If evidence dominated by numbers/dates with no strong thesis → FACTS
  - If evidence has clear how-to / step language → TUTORIAL
  - If evidence has multiple competing options → COMPARISON
  - If evidence has controversial framing / strong opinion axis → OPINION
  - Default → OPINION
- Placeholders: `{topic}`, `{synthesis_summary}`, `{key_points}`, `{evidence_snippets_count}`
- Ends with: "Return ONLY JSON matching the schema" (the actual schema is appended by `generate_structured`)

**Test command:**
```bash
cd backend && uv run python -c "
from core.prompts.prompt_loader import load_prompt
p = load_prompt('format_selection', topic='X', synthesis_summary='Y', key_points='Z', evidence_snippets_count=8)
assert 'FACTS' in p and 'TUTORIAL' in p and 'OPINION' in p
assert len(p) < 3500
print('OK — prompt loaded, all format keywords present, size', len(p), 'chars')
"
```

**Expected output:** `OK — prompt loaded, all format keywords present, size <N> chars`

---

### Step 2.3 — Add `FORMAT_BLOCKS` dicts

**File:** `backend/core/orchestrators/content/format_blocks.py` (new)

**What to implement:**
```python
"""Format-specific instruction blocks injected into 3 prompt files.

Kept in one file (not three) because the three prompts share the same 10 format axes.
Each block is ≤15 lines. Total token cost < 200 per LLM call.
"""
from core.orchestration.contracts import PostFormat

ANGLE_FORMAT_BLOCKS: dict[PostFormat, str] = {
    PostFormat.opinion: """
Format: OPINION (extended template family).
Take a strong, defensible stance. Challenge conventional wisdom.
Preferred emotional hooks: Anger, Fear, Curiosity, FOMO.
Each angle statement: something most people are afraid to say publicly.
""",
    PostFormat.facts: """
Format: FACTS (compact template family).
Surface genuinely surprising, counterintuitive facts. No strong opinion needed.
Preferred emotional hooks: Surprise, Curiosity, Fear.
Each angle statement: 'I had no idea this was true' — one revelation per angle.
""",
    PostFormat.tutorial: """
Format: TUTORIAL (compact template family).
A learnable skill with a promised outcome. Frame: 'How to [outcome] in [N steps].'
Preferred emotional hooks: Hope, Inspiration, Urgency.
Each angle statement: a specific, actionable transformation.
""",
    PostFormat.explainer: """
Format: EXPLAINER (extended template family).
Break down a concept newcomers find intimidating. Assume no prior knowledge.
Preferred emotional hooks: Curiosity, Inspiration.
Each angle statement: 'What is X, explained simply.'
""",
    PostFormat.trending: """
Format: TRENDING (extended template family).
React to a very recent event. Urgency dominates.
Preferred emotional hooks: Urgency, FOMO, Fear.
Each angle statement: 'Here's what just happened and what it means for you.'
""",
    PostFormat.story: """
Format: STORY (mixed template family).
Narrative arc — incident → stakes → turning point → lesson.
Preferred emotional hooks: Inspiration, Hope, Curiosity.
Each angle statement: a specific person / moment as the entry point.
""",
    PostFormat.listicle: """
Format: LISTICLE (compact template family).
Countdown/ranking. 5–10 items. Reverse-ranked (best last).
Preferred emotional hooks: FOMO, Curiosity, Surprise.
Each angle statement: 'Top N [things] you must know about X.'
""",
    PostFormat.review: """
Format: REVIEW (compact template family).
Honest verdict on a product/service/experience. 3-5 criteria, pros, cons.
Preferred emotional hooks: Curiosity, Fear (of wrong choice).
Each angle statement: 'I tried X — here's my honest take.'
""",
    PostFormat.comparison: """
Format: COMPARISON (compact template family).
Two options side-by-side. Winner by criterion.
Preferred emotional hooks: FOMO, Curiosity.
Each angle statement: 'X vs Y: which one actually wins?'
""",
    PostFormat.checklist: """
Format: CHECKLIST (compact template family).
Preparedness list. 5–10 items to do/check before an event.
Preferred emotional hooks: Urgency, Fear (of missing something).
Each angle statement: 'Before you do X, check these N things.'
""",
}

# SLIDE_FORMAT_BLOCKS and CAPTION_FORMAT_BLOCKS follow the same shape.
# Full content: strategy doc Appendix D. Each entry ≤15 lines.
SLIDE_FORMAT_BLOCKS: dict[PostFormat, str] = { ... }   # populate all 10
CAPTION_FORMAT_BLOCKS: dict[PostFormat, str] = { ... } # populate all 10
```

**Test command:**
```bash
cd backend && uv run python -c "
from core.orchestrators.content.format_blocks import ANGLE_FORMAT_BLOCKS, SLIDE_FORMAT_BLOCKS, CAPTION_FORMAT_BLOCKS
from core.orchestration.contracts import PostFormat
for pf in PostFormat:
    assert pf in ANGLE_FORMAT_BLOCKS, f'missing angle block for {pf}'
    assert pf in SLIDE_FORMAT_BLOCKS, f'missing slide block for {pf}'
    assert pf in CAPTION_FORMAT_BLOCKS, f'missing caption block for {pf}'
print('OK — all 10 formats have all 3 blocks')
"
```

**Expected output:** `OK — all 10 formats have all 3 blocks`

---

### Step 2.4 — Implement `format_selection_node`

**File:** `backend/core/orchestrators/content/format_selector.py` (new)

**What to implement:**
```python
"""Format-selection node — LLM recommends a post_format from the research synthesis."""
from __future__ import annotations
import json
from pathlib import Path
from configs.settings import get_settings
from core.orchestration.contracts import FormatSelectionOutput
from core.prompts.prompt_loader import load_prompt
from core.prompts.system_prompts import get_system_prompt
from core.tools.metadata_helper import get_llm_metadata_block
from infra.llm.factory import get_client_with_retry
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[3]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


async def format_selection_node(state: dict) -> dict:
    """Read state['synthesis'], call LLM, return {'format_selection': dict}.

    Persists format_selection.json to outputs/runs/{run_id}/format_selection.json.
    On any error, defaults to OPINION + extended (backward-compat behaviour).
    """
    run_id = state.get("run_id") or ""
    synthesis = state.get("synthesis") or {}
    topic = state.get("topic") or ""

    prompt = load_prompt(
        "format_selection",
        topic=topic,
        synthesis_summary=synthesis.get("summary", ""),
        key_points="\n".join(f"- {kp}" for kp in synthesis.get("key_points", [])),
        evidence_snippets_count=len(state.get("evidence", [])),
    ) + "\n\n" + get_llm_metadata_block()

    try:
        async def _call(llm):
            result, _usage = await llm.generate_structured(
                prompt=prompt,
                output_schema=FormatSelectionOutput,
                system_prompt=get_system_prompt("angle"),
            )
            return result

        result = await get_client_with_retry(_call)
    except Exception as exc:
        logger.warning("format_selection_llm_failed", run_id=run_id, error=str(exc))
        result = FormatSelectionOutput(
            recommended="OPINION",
            alternatives=[],
            reasoning=f"LLM classification failed ({type(exc).__name__}); defaulting to opinion.",
            template_family="extended",
        )

    logger.info(
        "format_selection_complete",
        run_id=run_id,
        recommended=result.recommended.value,
        template_family=result.template_family.value,
    )

    if run_id:
        run_dir = _OUTPUTS_ROOT / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        (run_dir / "format_selection.json").write_text(
            result.model_dump_json(indent=2), encoding="utf-8",
        )

    return {"format_selection": result.model_dump()}
```

**Test command:**
```bash
cd backend && uv run pytest tests/test_format_selection.py::test_node_happy_path_mocked -v
```

**Expected output:** `1 passed`

---

### Step 2.5 — Wire the node into `ContentOrchestrator`

**File:** `backend/core/orchestrators/content/orchestrator.py`

**What to modify:**
1. Import: `from core.orchestrators.content.format_selector import format_selection_node`
2. In `ContentOrchestrator.run()`, immediately after `state` has been populated with research (`synthesis`, `evidence`, `topic`, `run_id`) and BEFORE the first call that consumes it downstream:
   ```python
   # Format selection — read synthesis, recommend post_format + template_family
   state.update(await format_selection_node(state))
   ```
3. Later in the same method, pass `state["format_selection"]` (or extract the `recommended` field) to any function that needs it. Specifically:
   - When calling `slide_generator_node`, pass `state.get("format_selection", {})` as part of the state dict — the slide generator will look up its own block.
   - When calling `carousel_generator_node` / `_canvas_template_id`, pass `template_family=state["format_selection"]["template_family"]` (or default `"extended"`).

**Backward compat:** if `state.get("format_selection")` is missing (e.g. a caller invokes the orchestrator without going through the full graph), everything defaults to OPINION / extended — no crash.

**Test command:**
```bash
cd backend && uv run python -c "
from core.orchestrators.content.orchestrator import ContentOrchestrator
o = ContentOrchestrator()
print('orchestrator loads OK; format_selector import chain intact')
"
```

**Expected output:** `orchestrator loads OK; format_selector import chain intact`

---

### Step 2.6 — Inject `{format_block}` into 3 prompt files

**Files:**
- `backend/core/prompts/templates/angle_generation.txt`
- `backend/core/prompts/templates/slide_generation.txt`
- `backend/core/prompts/templates/caption_generation.txt`

**What to modify (per file):**
Add a clearly marked block near the top of the rules/structure section:
```
=== FORMAT-SPECIFIC RULES ===
{format_block}
=== END FORMAT RULES ===
```

**Test command (checks all 3 prompts render with a block):**
```bash
cd backend && uv run python -c "
from core.prompts.prompt_loader import load_prompt
from core.orchestrators.content.format_blocks import ANGLE_FORMAT_BLOCKS, SLIDE_FORMAT_BLOCKS, CAPTION_FORMAT_BLOCKS
from core.orchestration.contracts import PostFormat
# angle
p1 = load_prompt('angle_generation', topic='x', current_date='2026-08-22',
    synthesis_summary='y', key_points='', contradictions='', implications='', gaps='',
    exclude_block='', num_angles=3, format_block=ANGLE_FORMAT_BLOCKS[PostFormat.facts])
assert 'FACTS' in p1
# slide
p2 = load_prompt('slide_generation', topic='x', angle_statement='y', angle_hook='Anger',
    angle_evidence='z', filtered_research='', num_slides=12,
    format_block=SLIDE_FORMAT_BLOCKS[PostFormat.tutorial])
assert 'TUTORIAL' in p2 or 'compact' in p2
# caption
p3 = load_prompt('caption_generation', topic='x', angle_statement='y',
    slide_summary='', hashtags='#a #b', format_block=CAPTION_FORMAT_BLOCKS[PostFormat.facts])
assert 'Did you know' in p3 or 'FACTS' in p3
print('OK — all 3 prompts accept {format_block} injection')
"
```

**Expected output:** `OK — all 3 prompts accept {format_block} injection`

---

### Step 2.7 — Wire injections into the 3 generators

**Files:**
- `backend/core/orchestrators/angle/generator.py`
- `backend/core/orchestrators/content/slide_generator.py`
- `backend/core/orchestrators/content/caption_generator.py`

**Pattern (identical in each file):**
```python
from core.orchestrators.content.format_blocks import ANGLE_FORMAT_BLOCKS  # or SLIDE_, CAPTION_
from core.orchestration.contracts import PostFormat

# In the function that builds the prompt:
fs = state.get("format_selection") or {}
try:
    pf = PostFormat(fs.get("recommended", "OPINION"))
except ValueError:
    pf = PostFormat.opinion
format_block = ANGLE_FORMAT_BLOCKS.get(pf, ANGLE_FORMAT_BLOCKS[PostFormat.opinion])

prompt = load_prompt("angle_generation", ..., format_block=format_block)
```

**Test command:**
```bash
cd backend && uv run pytest tests/test_format_selection.py::test_generators_receive_format_block -v
```

**Expected output:** `1 passed`

---

### Step 2.8 — Add `template_family` to `_canvas_template_id`

**File:** `backend/core/orchestrators/content/carousel_generator.py`

**What to modify:**

Line 30 signature:
```python
def _canvas_template_id(
    slide_type: str,
    theme: str,
    layout_variant: int,
    has_image: bool,
    template_family: str = "extended",
) -> str:
    if slide_type in ("hook", "engage", "cta"):
        return f"{theme}-{slide_type}"          # family-agnostic
    prefix = f"{theme}-{template_family}"
    if slide_type == "content":
        return f"{prefix}-content-text" if not has_image else f"{prefix}-content-{layout_variant}"
    return f"{prefix}-{slide_type}"
```

Line ~114 call site:
```python
template_family = (
    (state.get("format_selection") or {}).get("template_family")
    or "extended"
)
canvas_template = slide_dict.get("canvas_template") or _canvas_template_id(
    slide_type, theme, layout_variant, has_image, template_family
)
```

**Test command:**
```bash
cd backend && uv run python -c "
from core.orchestrators.content.carousel_generator import _canvas_template_id
assert _canvas_template_id('content','aurora',0,True) == 'aurora-extended-content-0'
assert _canvas_template_id('content','aurora',0,False) == 'aurora-extended-content-text'
assert _canvas_template_id('hook','aurora',0,True) == 'aurora-hook'
assert _canvas_template_id('cta','aurora',0,False) == 'aurora-cta'
assert _canvas_template_id('stat','aurora',0,True,'compact') == 'aurora-compact-stat'
assert _canvas_template_id('content','lumina',2,True,'compact') == 'lumina-compact-content-2'
print('OK — all 6 cases pass')
"
```

**Expected output:** `OK — all 6 cases pass`

---

### Step 2.9 — Register `aurora-extended-*` + `lumina-extended-*` in the REGISTRY

**File:** `frontend/utils/canvasTemplates/index.ts`

**What to modify:**
In the `REGISTRY` object literal, add alias entries pointing to the same builder functions. All alias entries added AFTER the current entries so diffs are additive:

```typescript
export const REGISTRY: Record<string, TemplateBuilder> = {
  // ... existing aurora-* and lumina-* entries kept as-is ...

  // ── Extended-family aliases (Phase 2 — same builders as the aurora/lumina defaults) ──
  "aurora-extended-content-0":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 0),
  "aurora-extended-content-1":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 1),
  "aurora-extended-content-2":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 2),
  "aurora-extended-content-3":    (s,i,t,m) => buildAuroraContent(s,i,t,m, 3),
  "aurora-extended-content-text": (s,i,t,m) => buildAuroraContent(s,i,t,m,-1),
  "aurora-extended-stat":         buildAuroraStat,
  "aurora-extended-quote":        buildAuroraQuote,

  "lumina-extended-content-0":    lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 0)),
  "lumina-extended-content-1":    lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 1)),
  "lumina-extended-content-2":    lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 2)),
  "lumina-extended-content-3":    lw((s,i,t,m) => buildAuroraContent(s,i,t,m, 3)),
  "lumina-extended-content-text": lw((s,i,t,m) => buildAuroraContent(s,i,t,m,-1)),
  "lumina-extended-stat":         lw(buildAuroraStat),
  "lumina-extended-quote":        lw(buildAuroraQuote),
};
```

Then run `pnpm run build` in `backend/` (this rebuilds `renderer.bundle.js` — same as Phase 1).

**Test command:**
```bash
cd backend && node renderer/build.mjs 2>&1 | tail -3
echo "--- REGISTRY entries with extended prefix ---"
grep -c "extended" frontend/utils/canvasTemplates/index.ts
```

**Expected output:** bundle rebuilds cleanly + `grep` shows ≥ 14 hits.

---

### Step 2.10 — Backfill script for existing runs

**File:** `backend/scripts/backfill_post_format.py` (new)

**What to implement:**
```python
"""Backfill post_format on every existing run.

Reads outputs/runs/*/research/research_result.json, calls format_selection_node
against a minimal state dict, writes:
  - outputs/runs/{run_id}/format_selection.json
  - patches every angle in outputs/runs/{run_id}/angles/selection.json with post_format

Idempotent: if format_selection.json already exists, that run is skipped.
"""
from __future__ import annotations
import asyncio, json
from pathlib import Path
from core.orchestrators.content.format_selector import format_selection_node

BACKEND_ROOT = Path(__file__).parents[1]
RUNS_ROOT = BACKEND_ROOT / "outputs" / "runs"


async def process_one(run_dir: Path) -> tuple[str, str]:
    """Returns (run_id, status). Status is 'skipped', 'updated', or f'error:{msg}'."""
    run_id = run_dir.name
    fs_path = run_dir / "format_selection.json"
    if fs_path.exists():
        return run_id, "skipped (already has format_selection.json)"
    research_path = run_dir / "research" / "research_result.json"
    if not research_path.exists():
        return run_id, "skipped (no research_result.json)"
    try:
        research = json.loads(research_path.read_text())
        state = {
            "run_id": run_id,
            "topic": research.get("topic", ""),
            "synthesis": research.get("synthesis", {}),
            "evidence": research.get("evidence", []),
        }
        result = await format_selection_node(state)
        fs = result["format_selection"]
        # Patch angles/selection.json
        sel_path = run_dir / "angles" / "selection.json"
        if sel_path.exists():
            sel = json.loads(sel_path.read_text())
            for angle in sel.get("angles", []):
                angle.setdefault("post_format", fs["recommended"])
            sel_path.write_text(json.dumps(sel, indent=2, ensure_ascii=False))
        return run_id, f"updated → {fs['recommended']}"
    except Exception as exc:
        return run_id, f"error: {type(exc).__name__}: {exc}"


async def main():
    if not RUNS_ROOT.exists():
        print(f"No runs directory at {RUNS_ROOT}")
        return
    runs = sorted(d for d in RUNS_ROOT.iterdir() if d.is_dir())
    print(f"Backfilling post_format on {len(runs)} runs…\n")
    for run_dir in runs:
        rid, status = await process_one(run_dir)
        print(f"  {rid[:12]}… : {status}")


if __name__ == "__main__":
    asyncio.run(main())
```

**Test command (dry-run on 3 runs first):**
```bash
cd backend && PYTHONPATH=. uv run python scripts/backfill_post_format.py 2>&1 | tail -20
```

**Expected output:** every existing run reports either `updated → <FORMAT>` or `skipped (already has format_selection.json)`. Zero `error:` lines.

---

### Step 2.11 — Expose `GET /content/{run_id}/format-selection` endpoint

**File:** `backend/apps/api/v1/content.py`

**What to modify:**
Add a new handler alongside the existing GET endpoints:
```python
@router.get("/{run_id}/format-selection")
async def get_format_selection(run_id: str) -> dict:
    """Return the format_selection.json for a run — or 404 if not yet generated."""
    path = _OUTPUTS_ROOT / run_id / "format_selection.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="format_selection.json not found")
    return _json.loads(path.read_text(encoding="utf-8"))
```

**Test command:**
```bash
# Requires backend running + at least one backfilled run
curl -s http://localhost:8000/api/v1/content/$(ls backend/outputs/runs | head -1)/format-selection | python3 -m json.tool
```

**Expected output:** JSON containing `recommended`, `alternatives`, `reasoning`, `template_family`.

---

### Step 2.12 — Frontend types + thin API method

**File:** `frontend/lib/api/types.ts`

**What to modify:**
```typescript
export type PostFormat =
  | "OPINION" | "FACTS" | "TUTORIAL" | "EXPLAINER" | "TRENDING"
  | "STORY" | "LISTICLE" | "REVIEW" | "COMPARISON" | "CHECKLIST";

export type TemplateFamily = "extended" | "compact" | "mixed";

export interface FormatSelectionOutput {
  recommended:     PostFormat;
  alternatives:    PostFormat[];
  reasoning:       string;
  template_family: TemplateFamily;
}

// Extend existing Angle interface
export interface Angle {
  statement:           string;
  emotional_hook:      string;
  supporting_evidence: string;
  post_format?:        PostFormat;   // optional — pre-Phase-2 runs may lack this
}
```

**File:** `frontend/lib/api/content.ts`
```typescript
getFormatSelection: (runId: string): Promise<FormatSelectionOutput> =>
  fetch(`${BASE}/content/${runId}/format-selection`).then(r => {
    if (!r.ok) throw new Error(`format-selection ${r.status}`);
    return r.json();
  }),
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -5
```

**Expected output:** exit 0.

---

### Step 2.13 — Unit tests

**File:** `backend/tests/test_format_selection.py` (new)

**What to implement:** 4 tests covering:

1. `test_enum_values_intact` — asserts `PostFormat` has all 10 values with the correct string names
2. `test_node_happy_path_mocked` — mocks `get_client_with_retry` to return a fixed `FormatSelectionOutput(recommended=FACTS, ...)`; asserts state gets `format_selection` key and `format_selection.json` is written
3. `test_node_llm_failure_defaults_to_opinion` — mocks LLM to raise; asserts the returned dict has `recommended = OPINION`
4. `test_canvas_template_id_with_families` — parameterised over 6 slide types × 3 families
5. `test_format_blocks_completeness` — every `PostFormat` has an entry in all 3 dicts

**Test command:**
```bash
cd backend && uv run pytest tests/test_format_selection.py -v
```

**Expected output:** `5 passed`

## Done Criteria

All must be TRUE before Loop 2 exits:

- [ ] **`pytest tests/test_format_selection.py -v`** → `5 passed`
- [ ] **`pytest tests/ -q`** (full backend suite) → all pass
- [ ] **`cd frontend && npx tsc --noEmit`** → exits 0
- [ ] **`cd frontend && pnpm lint`** → exits 0
- [ ] **Full pipeline runs on a real topic** — backend logs show `format_selection_complete run_id=X recommended=<X>`; `outputs/runs/{run_id}/format_selection.json` exists and validates as `FormatSelectionOutput`
- [ ] **`curl -s http://localhost:8000/api/v1/content/<real_run_id>/format-selection`** returns the JSON with all 4 fields
- [ ] **`GET /content/{run_id}/slides/{angle}/…/canvas`** on a Phase-1 canvas save still works (regression check — Phase 1 tests pass)
- [ ] **Backfill script runs cleanly** — `uv run python scripts/backfill_post_format.py` reports zero errors across all existing runs
- [ ] **Generated PNGs look identical to pre-Phase-2 output** — pick one run, regenerate slide 1 via the Phase-1 canvas save flow, compare byte size and visual diff with the pre-Phase-2 PNG (should be within noise — same builder, same tokens)
- [ ] **`grep "extended" frontend/utils/canvasTemplates/index.ts | wc -l`** → ≥ 14 (14 new REGISTRY aliases)

## Real Data Testing (Loop 3)

### Scenario A — Full pipeline run with FACTS-triggering topic
1. `curl -X POST http://localhost:8000/api/v1/pipeline/run -H "Content-Type: application/json" -d '{"topic":"Surprising facts about Indian street food history","mode":"quick"}'`
2. Wait for the pipeline to complete (`/pipeline/status` polling or the SSE stream)
3. **Verify:** `cat backend/outputs/runs/<new_run_id>/format_selection.json` shows `"recommended": "FACTS"` (or a plausible alternative like "EXPLAINER" — LLM may vary; log both for later analysis)
4. **Verify:** `cat backend/outputs/runs/<new_run_id>/angles/selection.json | jq '.angles[0].post_format'` returns `"FACTS"` (or matches recommended)
5. **Verify:** The generated PNGs still use `aurora-extended-*` templates (visible in each slide's `canvas_template` field in `slides.json`) — proves Phase 2 doesn't change visuals

### Scenario B — Backfill on existing runs
1. `cd backend && PYTHONPATH=. uv run python scripts/backfill_post_format.py`
2. **Verify:** Each existing run under `outputs/runs/` now has a `format_selection.json`
3. **Verify:** `outputs/runs/*/angles/selection.json` files have `post_format` on every angle
4. Open the editor for one of those runs → the editor still works exactly as before (Phase 2 doesn't touch UI)

### Scenario C — Backward-compat: pre-Phase-2 request body
1. Craft a `ContentRequest` payload that lacks `format_selection` in state (as if generated by pre-Phase-2 code)
2. POST to `/content/run`
3. **Verify:** The pipeline still completes successfully — the orchestrator falls back to OPINION/extended
4. **Verify:** Generated angles have `post_format: OPINION` (default)

### Fix loop
If any step fails: fix the issue, re-run `pytest` + `tsc --noEmit`, re-run the failing scenario. All scenarios must pass before Phase 2 is marked COMPLETE.

## Known Constraints / Gotchas

- **`load_prompt` uses `str.format`** — any placeholder in an existing prompt template that isn't provided as a kwarg will raise `KeyError`. Every generator that loads a prompt with the new `{format_block}` must pass `format_block=...` — verified by unit test.
- **`get_client_with_retry`** already handles JWT expiry (Phase 1 canonical pattern) — `format_selection_node` uses it, not the singleton `LLMFactory.get_client()` directly.
- **The LLM's `recommended` value must exactly match a `PostFormat` enum value** — Pydantic will reject any deviation. `generate_structured` auto-retries up to 3 times on validation failure (repo-wide pattern).
- **`aurora-extended-*` aliases don't remove old IDs** — every existing `slides.json` with `canvas_template: "aurora-content-2"` continues to render exactly as before.
- **The `inferTemplate()` fallback (`index.ts:57`)** stays on the current default (`${theme}-${type}`) — it's only hit by legacy runs without `canvas_template` set. Compact templates are only reached when the Python pipeline sets `canvas_template` explicitly.
- **HAI Proxy / SAP AI Core** — this phase adds one extra LLM call per pipeline run (format selection). Cost impact: < $0.001 per run (small prompt, small structured output).
- **Turbopack** — no tsconfig path changes; no cache clear needed.
- **`format_selection.json` schema is stable** — future phases (5) will consume it via `GET /content/{run_id}/format-selection`; the schema is documented in `contracts.py :: FormatSelectionOutput`.

## Rollback Plan

If Phase 2 must be reverted:

1. Revert the 12 modified files + delete the 6 new files
2. Delete every `outputs/runs/*/format_selection.json` (safe — no other file references it)
3. Remove `post_format` fields from `outputs/runs/*/angles/selection.json` (or leave them — the pre-Phase-2 code ignores extra fields)
4. Rebuild the renderer bundle: `cd backend && node renderer/build.mjs`
5. No env vars introduced, no dependency changes

## Loop 1 Passes Log

### Pass 1 — 2026-08-22
- Read strategy doc + master plan + REVIEW_PROTOCOL
- Traced full save/prompt/generator call chain by grep — confirmed 18-file scope
- Verified 9 external claims (see External Verification Log)
- **Issues found:** (a) initial draft made `format_selection_node` a LangGraph node inside `content_graph.py` — but the real content pipeline is orchestrated imperatively in `ContentOrchestrator.run()`; corrected to call as plain async function; (b) missing fallback for LLM failure would crash pipeline — added try/except with OPINION default; (c) missing frontend types — added Step 2.12; (d) backward-compat behaviour for pre-Phase-2 request bodies not documented — added Scenario C; (e) forgot to state that `hook/engage/cta` types are family-agnostic — clarified in Step 2.8.
- **Fixes applied:** all 5 issues resolved

### Pass 2 — 2026-08-22 (mandatory re-read cold)
- Re-read every step from scratch, ignoring pass-1 memory
- Confirmed every step has: file path, code to write, test command, expected output
- Confirmed every External Verification Log entry has a source + date
- Confirmed each done-criterion is objectively testable
- Confirmed all 3 Loop 3 scenarios cover the user-visible flow + backward compat
- Confirmed 8 gotchas capture the non-obvious things a new dev would trip on
- **Issues found:** none
- **"Handed to unknown developer" test:** PASS — a new dev could implement this in one sitting with zero clarifying questions
- **Status:** APPROVED