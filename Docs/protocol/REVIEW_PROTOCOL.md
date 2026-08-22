# Multi-Agent Content Producer — Review Protocol

> **This document is referenced at the start of every phase and after every phase completes.**
> It defines three loops: the **Architect Review Loop** (before coding), the **Test Loop** (after coding), and the **Real Data Loop** (browser + real backend).
> Never start coding a phase without completing Loop 1. Never declare a phase done without completing Loop 2 and Loop 3.

---

## Repository Context

This protocol applies to the **Multi-Agent Content Producer** — a LangGraph-based pipeline that produces Instagram carousels + blog posts from a topic. Key components:

| Area | Stack | Key files |
|---|---|---|
| Backend | Python 3.12, FastAPI, LangGraph, uv | `backend/`, `pyproject.toml`, `uv.lock` |
| LLM layer | HAI Proxy (Claude) or SAP AI Core Orchestration | `backend/infra/llm/`, `.env` |
| Renderer | Fabric.js + Playwright (bundled) | `backend/renderer/`, `frontend/utils/canvasTemplates/` |
| Frontend | Next.js 15, Turbopack, Redux Toolkit, Tailwind v4, pnpm | `frontend/` |
| Editor | Fabric.js canvas + right-panel property editors | `frontend/components/editor/`, `frontend/app/editor/` |
| Outputs | Per-run directories on disk | `backend/outputs/runs/{run_id}/` |
| E2E tests | Playwright | `frontend/e2e/`, `backend/tests/` |

## When to Use This Document

| Trigger | Which Loop |
|---------|-----------|
| About to start a new phase / feature | Loop 1 — Architect Review |
| Phase coding is complete | Loop 2 — Test Protocol |
| UI-visible changes shipped | Loop 3 — Real Data Testing |
| A test fails during Loop 2 or Loop 3 | Back to Loop 1 for the failing component |
| A new issue is found during review | Fix it, restart Loop 1 for that phase |

---

## Loop 1 — Architect Review (Before Coding)

**Purpose:** Generate a targeted, conflict-free `Docs/phases/PHASE_<N>_<slug>.md` implementation plan before writing any code. This loop has a **minimum** of 2 passes but is **not capped at 2**. It continues until every review pass finds zero issues AND external verification (web search, official docs, source code inspection) confirms the plan is technically feasible on the exact library versions this repo uses.

### The Hard Rule

> **Minimum 2 passes. No maximum.**
>
> A single clean pass after fixes is **never** sufficient. The moment any pass finds a new issue — whether it's your first pass or your fifth — the counter resets: apply the fix, then run at least one more full clean pass on top of that.
>
> The loop exits **only** when:
> 1. At least 2 total review passes have completed
> 2. The **most recent** pass found zero issues
> 3. Every non-obvious technical claim in the plan has been verified against an authoritative source (web docs, source code, an actually-run command)
> 4. The "handed to unknown developer" test passes

If your pass 3 finds an issue, you need pass 4 clean. If pass 5 finds an issue, you need pass 6 clean. There is no shortcut and no "close enough".

```
PASS 1
  → Read all inputs fresh
  → Audit against every checklist
  → Document every issue (ISSUE-N format)
  → Apply all fixes to draft PHASE_<N>.md
      ↓
PASS 2 (mandatory)
  → Re-read the FIXED document cold — as if you have never seen it
  → Run every checklist item again from scratch
  → Web-search-verify every version claim, API signature, and library capability
  → Did any fix introduce a contradiction or gap?
  → Does the "handed to unknown developer" test pass?
      ↓
  If ANY issue found (however minor) → apply fix → go to PASS N+1
  If clean AND external verification complete → APPROVED
```

### Step 1 — Read the Inputs

Before reviewing, read ALL of the following. Do not skip any:

```
REQUIRED READS FOR EVERY PHASE:
□ README.md                                  — repo overview and how to run
□ AI_CHANGELOG.md                            — recent architectural decisions (newest first)
□ Docs/frontend/FRONTEND.md                  — frontend structure and conventions
□ Docs/renderer/RENDERING_ENGINE_OVERVIEW.md — Fabric.js renderer architecture
□ Docs/renderer/RENDERER_CODEBASE_GUIDE.md   — folder map, theme tokens, data flow
□ Docs/protocol/REVIEW_PROTOCOL.md           — THIS document

FOR PHASES TOUCHING SPECIFIC AREAS — also read the relevant folder:
□ Docs/backend/orchestrators/                — for pipeline / graph changes
□ Docs/backend/llm-abstraction/              — for LLM provider changes
□ Docs/backend/publishing/                   — for Blogger/Medium/Instagram publisher
□ Docs/frontend/editor/                      — for slide editor changes
□ Docs/renderer/ADDING_A_SLIDE_TYPE.md       — for new slide templates
□ Docs/pending-works/                        — pending initiatives that may collide

FOR PHASE N > 1 — also read:
□ Docs/phases/PHASE_{N-1}_*.md               — previous plan (contracts you must not break)
□ Every file changed in previous phases (git log --stat)
```

### Step 2 — Act as Senior Architect

You are a **senior software architect with 10+ years of Python + TypeScript + browser rendering experience**. You have shipped LangGraph pipelines, Fabric.js editors, and Playwright test suites. You have seen projects fail because of vague specs, undeclared dependencies, wrong library versions, and mixed I/O with business logic. Your job is to find every gap **before** a single line of code is written.

Review the phase draft against every checklist below. Any single unchecked box blocks approval.

#### Architecture Checks
- [ ] **No ambiguous "etc."** — every function, file, endpoint, prompt, and API call is named explicitly
- [ ] **Entry conditions are verifiable** — for every precondition, list the exact shell command that proves it
- [ ] **All external dependencies are listed** — Python packages (with `pyproject.toml` version constraints), npm packages (with `package.json` version constraints), fonts, MCPs, and any files created by previous phases
- [ ] **No circular dependencies** — files written in this phase don't depend on files scheduled for later phases
- [ ] **Config usage is consistent** — every new setting is added to `backend/configs/settings.py` AND `.env.example`. No hardcoded values that should be settings.
- [ ] **Settings vs env vars** — `CHRONICLE_*` / `PRODUCER_*` prefixed vars go through `pydantic-settings`; third-party env vars (like `AICORE_*`) read directly by their SDKs
- [ ] **API contract stability** — no breaking change to any existing endpoint schema without a documented migration or backward-compat alias
- [ ] **Redux slice compatibility** — new state fields survive `resetPipeline` where intended; type interfaces updated in the API layer AND the slice
- [ ] **Renderer boundary respected** — visual layout logic lives **only** inside `frontend/utils/canvasTemplates/` (or `shared/renderer/`). No layout code in Python. Backend never bypasses `window.Renderer`.

#### Code Quality Checks
Every file specified in the phase plan must pass all of these before the plan is approved.

- [ ] **Single Responsibility Principle** — each function/method does exactly one thing. A function that fetches data, transforms it, writes it to disk, AND emits progress is doing four things. Split.
- [ ] **Separation of concerns** — I/O, business logic, and presentation must not be mixed:
  - HTTP/browser calls live in service classes, not in route handlers or scripts
  - Data transformation (parsing responses into clean dicts) is a separate step from fetching
  - Progress emission (`progress_store.update()`, log lines) is the caller's responsibility, not the inner library's
  - Settings loading is never inlined — always import `get_settings()` from `backend/configs/settings.py`
- [ ] **Modularization** — each file has a clear boundary and contract:
  - `backend/apps/api/v1/*.py` — thin route handlers only: validate → delegate → respond (< ~15 lines per handler)
  - `backend/core/services/*.py` — business logic; no FastAPI imports, no Pydantic request models (accept plain args)
  - `backend/core/orchestrators/*/*.py` — LangGraph node functions; each async, each does one thing
  - `backend/core/persistence/*.py` — file I/O helpers; no LLM calls, no business logic
  - `frontend/lib/api/*.ts` — thin fetch wrappers; one file per domain; barrel re-export from `index.ts`
  - `frontend/hooks/use*.ts` — logic decoupling only; no JSX
  - Violation: a route handler that opens files, or a service that constructs `HTTPException` at multiple call sites
- [ ] **No god functions** — any function longer than ~40 lines is a signal that it does too much. If it can be named with "and" (e.g. "fetch and transform and write"), split it.
- [ ] **Private helpers are genuinely private** — `_method()` on a class or module exists to serve that class/module's public interface, not as a dumping ground
- [ ] **No hidden coupling** — a module must not reach across the same layer. Example violation: `slide_editor_service.py` importing directly from `blog_post_generator.py`. Route through a shared persistence or utility module.
- [ ] **Barrel re-exports for split modules** — when a file is split (e.g. `lib/api.ts` → `lib/api/*`), an `index.ts` must re-export everything so callers don't break

#### External Verification Checks
Every non-obvious technical claim in the plan must be verified against an authoritative source. Verification means one of:
- A web search citing official docs (React, Next.js, Fabric.js, LangGraph, FastAPI, Playwright, Chart.js)
- A direct read of the library source in `node_modules/` or `.venv/site-packages/`
- An actually-executed command whose output confirms the claim

For each of the following, note in the plan HOW you verified:
- [ ] **Every third-party API signature** (e.g. `fabric.Canvas.loadFromJSON()`, `Playwright.page.screenshot()`, `Chart.js` plugin registration) — verified against the version pinned in `pyproject.toml` / `package.json`
- [ ] **Every library version claim** ("Fabric.js v7 supports X") — verified against the exact minor version in the lockfile
- [ ] **Every browser/runtime behaviour** ("Playwright headless can load base64 images") — verified with a smoke test or docs link
- [ ] **Every LLM provider capability** ("SAP AI Core Orchestration supports Anthropic models") — verified against SDK docs
- [ ] **Every Next.js / Turbopack constraint** (path aliases outside project root, static imports, `use client` boundaries) — verified against Turbopack docs or repo issues

#### Reliability Checks
- [ ] **Every long-running operation prints progress** — either through `progress_store` (backend SSE), stage timers (frontend), or explicit logs
- [ ] **Error paths are explicit** — what happens when the LLM 401s (JWT expiry)? When Playwright times out? When Pexels returns 0 results? When a file is missing from a previous phase's run dir?
- [ ] **Partial failures are handled** — if one angle out of three fails to render, do the other two still complete? Does the blog post still generate?
- [ ] **Files are never silently overwritten** — timestamped run directories, `_v<n>` suffixes, or explicit backup rules
- [ ] **JWT / OAuth token expiry** — all LLM calls use `get_client_with_retry()` (backend) so a stale token auto-refreshes once

#### Frontend-Specific Checks
- [ ] **No horizontal scroll** on any page at 1440×900
- [ ] **Dark theme** — every new component tested in dark mode
- [ ] **Empty / loading / error states** for every async fetch — no bare spinners with no context
- [ ] **Cache-busting** for images that change during a session (e.g. `?v=<timestamp>` on regenerated PNGs)
- [ ] **Redux state persists correctly** through `resetPipeline` — flags that should survive (e.g. `llmResearchMode`) are explicitly preserved
- [ ] **Component decomposition** — pages must be pure layout wiring; components live in `components/<feature>/` and hooks in `hooks/`

#### Backend-Specific Checks
- [ ] **New LangGraph nodes wired** — added to the graph, referenced in `progress_store` labels, emit SSE events if the stage takes > 2s
- [ ] **New endpoints added to `main.py`** if a new router file is created
- [ ] **CORS** — origins list in `settings.cors_origins` still covers the frontend dev + prod hosts
- [ ] **Static file mount** — new output directories reachable via `/outputs/runs/...` if the frontend needs to fetch them
- [ ] **Test file exists** — for every new service module, a `backend/tests/test_<module>.py` exists with at least one happy-path test

### Step 3 — List Issues Found

For each issue found, write it in the phase plan under an "Issues Found" section:

```
ISSUE-<N> [SEVERITY: HIGH/MEDIUM/LOW]
Location: <section name or line in the draft PHASE_<N>.md>
Problem: <what is wrong or missing>
Fix: <exactly what to add or change>
Verified via: <web search URL / file read / command output>
```

### Step 4 — Fix Issues and Regenerate

Apply ALL fixes to the draft `Docs/phases/PHASE_<N>_<slug>.md`. Then re-read it fully. Ask yourself:

> *"If I handed this document to a developer who has never seen this project before, could they implement it correctly with zero clarifying questions?"*

If the answer is NO — go back to Step 3.
If the answer is YES BUT you haven't done at least 2 clean passes yet — start another pass.
If YES AND ≥ 2 clean passes AND all external verifications documented — proceed to Step 5.

### Step 5 — Write the Approved `Docs/phases/PHASE_<N>_<slug>.md`

The final approved plan must contain exactly these sections:

```markdown
# PHASE <N> — <Name>

## Status
APPROVED — ready to implement

## Problem Statement
[Concrete user pain, in 2-4 sentences. What is broken today? What will be true after this phase ships?]

## Requirements
- Functional: [what the user can do after]
- Non-functional: [performance, backward compatibility, error handling]

## External Verification Log
| Claim | Verified against | Verified on |
|-------|------------------|-------------|
| e.g. "Fabric.js v7 supports Canvas.loadFromJSON with reviver" | node_modules/fabric/dist/fabric.d.ts line 4321 | 2026-08-22 |
| e.g. "Playwright page.evaluate returns awaited promises" | https://playwright.dev/docs/api/class-page#page-evaluate | 2026-08-22 |
| … | … | … |

## Entry Conditions (verify before starting)
- [ ] `condition 1` — verify with: `<exact command>`
- [ ] `condition 2` — verify with: `<exact command>`

## Files to Create or Modify
| File | Action | Description |
|------|--------|-------------|
| backend/core/services/foo.py | CREATE | ... |
| frontend/components/editor/Bar.tsx | MODIFY | ... |

## Implementation Steps (ordered, no step skipped)

### Step N.1 — <name>
**File:** `<exact path>`
**What to implement:**
[exact specification — function signatures, inputs, outputs, error cases, imports]

**Test command:**
```bash
<exact command>
```
**Expected output:**
```
<exact expected>
```

### Step N.2 — <name>
...

## Done Criteria
All of the following must be TRUE before Loop 2 exits:
- [ ] criterion 1 — test: `<command>` → `<expected>`
- [ ] criterion 2 — test: `<command>` → `<expected>`

## Real Data Testing (Loop 3 scenarios)
See Loop 3 in REVIEW_PROTOCOL.md. Specific scenarios for this phase:

### Scenario A — <feature name>
1. Open `http://localhost:3000/<path>`
2. <action>
3. **Verify:** <exact expected value from real data>

## Known Constraints / Gotchas
- Fabric.js custom properties require `FabricObject.customProperties.push("data")` at init
- Turbopack cannot follow tsconfig paths pointing outside the project root
- HAI Proxy JWT expires — all callers must use `get_client_with_retry()`
- SAP AI Core reads AICORE_* directly from os.environ — load_dotenv() required in provider init
- [phase-specific gotchas]

## Rollback Plan
If this phase must be reverted after merge, describe:
1. Which files to revert
2. Which env vars to unset
3. Whether any output-directory migrations are needed (usually: none — outputs are append-only)
```

### Loop 1 Exit Condition
Loop 1 is complete when ALL of the following are true:
1. **≥ 2 full review passes completed**
2. **The most recent pass found zero issues**
3. **Every non-obvious technical claim has been externally verified** (with URLs / file paths / command outputs recorded in the External Verification Log)
4. **`Docs/phases/PHASE_<N>_<slug>.md` has been written** with all the required sections above
5. **The "handed to unknown developer" test passes** on the final version

If any of these five is false, run another pass.

---

## Loop 2 — Test Protocol (After Coding)

**Purpose:** Verify that what was built matches what was specified. Every done-criterion from `Docs/phases/PHASE_<N>_<slug>.md` must pass. This loop runs until all criteria pass or a blocker is identified.

### Step 1 — Verify Entry Conditions Still Hold

Before testing, confirm nothing broke since the previous phase:

```bash
# Backend health
cd backend && uv run python -c "from configs.settings import get_settings; print(get_settings().llm_provider)"
uv run pytest tests/ -q

# Frontend TypeScript compile
cd frontend && npx tsc --noEmit

# Frontend lint
pnpm lint
```

### Step 2 — Run Phase Tests

For each done-criterion in `PHASE_<N>_<slug>.md`, run the corresponding test command and verify the expected output. Use this format:

```
CRITERION: "PUT /content/{run_id}/slides/{ai}/{sn}/canvas re-renders PNG"
COMMAND:   curl -X PUT http://localhost:8000/api/v1/content/<real_run_id>/slides/0/1/canvas -d '{"fabric_json": {...}}'
EXPECTED:  200 with {"saved": true, "png_url": "/outputs/runs/.../slide_01.png?v=<ts>"}
RESULT:    [ PASS / FAIL ]
NOTES:     (if FAIL: exact error message + first line of stack)
```

Document every result. **Do not mark a criterion as passing unless the exact expected output was observed.**

### Step 3 — Integration Test

After all unit-level criteria pass, run the full integration test for the phase — an end-to-end run against real backend + real frontend:

**Backend-only integration:**
```bash
cd backend && uv run pytest tests/ -q
```

**Full stack integration (typical):**
```bash
# Terminal 1: backend
cd backend && uv run uvicorn main:app --port 8000 --reload

# Terminal 2: frontend
cd frontend && pnpm dev

# Terminal 3: Playwright suite
cd frontend && npx playwright test <relevant_spec>
```

### Step 4 — Document Failures

For every FAIL result:

```
FAILURE REPORT
Criterion: <which>
Command: <exact>
Expected: <>
Actual: <>
Root cause: <diagnosis>
Fix required: <what changes>
```

### Step 5 — Fix and Re-test

Apply the fix. Re-run ONLY the failed tests (not the entire suite). If the fix touches code other criteria depend on, re-run those too.

**If a fix reveals a deeper architectural issue** (new service needed, contract broken, wrong library version pinned): stop Loop 2, return to Loop 1 for the affected component, update the phase plan, restart Loop 2 from Step 2.

### Loop 2 Exit Condition
1. ALL done-criteria show PASS
2. Full integration test completes without errors
3. No FAILURE REPORT items remain open

Then update the phase plan header:
```markdown
## Status
COMPLETE — Loop 2 verified on <date>
```

Proceed to Loop 3 if the phase produces UI-visible changes.

---

## Loop 3 — Real Data Testing (Browser + Real Backend)

**Purpose:** Verify the feature works end-to-end in a real browser using real backend data. TypeScript compile passing and API responses being correct are necessary but not sufficient. Real-data testing catches rendering bugs, dark mode issues, empty-state guards, and UX problems that only appear live.

> **This loop cannot be skipped** for any phase that produces a UI component, page, or user-facing workflow.

### When to Run

Run Loop 3 after Loop 2 exits clean. If Loop 3 finds bugs, fix them, re-run `npx tsc --noEmit` and `pnpm lint`, then re-run the failing scenario. Do not declare a phase complete until all Loop 3 scenarios pass.

### Step 1 — Start the servers

```bash
# Backend
cd backend && uv run uvicorn main:app --port 8000 --reload

# Frontend
cd frontend && pnpm dev

# Health probes
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/v1/analytics/summary
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
```

### Step 2 — Execute each scenario in a browser

For every UI component or page added/changed:

1. **Navigate** to the relevant page/component
2. **Execute** the feature — click the button, submit the form, trigger the action
3. **Wait** for loading states to resolve; do not check mid-flight
4. **Verify** — check that the expected data/output appears, with exact values you predicted from real data
5. **Review the UI** — modern, sleek, aesthetically consistent? Check: spacing, typography, dark mode, empty states, error states
6. **Test edge cases** — empty data, dark mode tooltip visibility, missing images, network errors

### Step 3 — Fix-and-retest loop

If any step fails:

```
SCENARIO FAILURE
Scenario: <letter/name>
Step: <number>
Expected: <what should have appeared>
Actual: <what actually appeared>
Root cause: <diagnosis>
Fix applied: <what was changed>
```

Apply the fix. Run `npx tsc --noEmit`. Re-run only the failing scenario. Repeat until pass.

### Step 4 — Regression check

After all scenarios pass, reload pages NOT touched by this phase and confirm they still work. Most likely to regress: pipeline, editor, analytics, settings.

### Loop 3 Exit Condition
1. All scenarios in `PHASE_<N>_<slug>.md → Real Data Testing` pass
2. No regressions on unchanged pages
3. UI aesthetics pass: consistent spacing, readable text in dark mode, no raw JSON / stack traces visible

---

## Terminal Command Discipline (mandatory)

**Long or multi-line shell blocks — especially anything with a heredoc, a Python `-c "…"` payload with embedded newlines, or a `for … done` with quoted strings — MUST be written to a file first and then executed as that file.** The terminal channel in this environment reliably corrupts heredocs, mangles multi-line `-c` payloads, and leaves the shell stuck at a `heredoc>` / `for>` prompt. Every time that happens, the polling loop or verification script has to be redone.

Rules:

1. **Never** run `cat > /tmp/foo.sh << 'EOF' … EOF` inline. Use `write_to_file` to create `/tmp/foo.sh` (or a project-local `scripts/…` path) and then run `bash /tmp/foo.sh` as a single command.
2. **Never** run `python3 -c "$'multiline\\npayload'"` for anything longer than one physical line. Use `write_to_file` to create `/tmp/foo.py` and then run `.venv/bin/python /tmp/foo.py`.
3. `for … done` loops that poll an HTTP endpoint and pipe through `jq` must live in a script file. Inline them only when they fit on a single physical line with no embedded quotes.
4. If a command output is not captured (tool result says "output could not be captured" or shows a stuck `heredoc>` / `for>` prompt), do NOT retry the same inline construction. Fall back to the script-file pattern before the next attempt.
5. When executing scripts, prefer explicit interpreters: `bash /tmp/foo.sh`, `.venv/bin/python /tmp/foo.py`. Do not rely on shebangs.
6. `jq` parse errors during a live-poll loop (partial response captured) are a signal to switch the poll to Python with `json.JSONDecodeError` handling — not to keep retrying `jq`.

Rationale: the script-file discipline costs one extra `write_to_file` call and eliminates an entire class of preventable failure.

---

## Quick Reference — Common Failure Patterns

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `RuntimeError: CHRONICLE_HAI_API_KEY is not set` | HAI Proxy token expired or missing | Run `hai proxy start`, paste into `.env`, restart backend |
| `Value error, No credentials found in any source` | SAP AI Core AICORE_* vars missing from environment | Add to `.env`; provider's `__init__` calls `load_dotenv()` — restart backend |
| LLM call returns 401 mid-run | JWT / OAuth token expired | Wrap the call in `get_client_with_retry()` (backend/infra/llm/factory.py) |
| Playwright screenshot is blank/black | Fonts not loaded before render | `await document.fonts.ready` + 300ms buffer in the render page |
| Playwright renders wrong slide count | `enableRetinaScaling=false` missing on Fabric canvas | Add to constructor options |
| Chart.js only renders half the chart | Chart.js reading `window.devicePixelRatio > 1` | Set `options.devicePixelRatio = 1` in chart config |
| Turbopack silently hangs after tsconfig change | Stale `.next/` cache | `rm -rf frontend/.next` and restart |
| tsconfig paths pointing outside project root fail | Turbopack security restriction | Use symlinks or move source inside project root; document the constraint |
| Redux state lost after `resetPipeline` | Field not in the reducer's preservation list | Add `field: state.field` to the reset return |
| Image on carousel is broken URL | Slide `processed_path` is absolute filesystem path | Use `static_image_url()` helper to convert to `/outputs/runs/...` |
| `frontend/lib/api/*` untracked by git | Root `.gitignore` has bare `lib/` pattern | Scope to `backend/lib/` |
| `uv.lock` re-appears in git status | Not gitignored | Add `backend/uv.lock` and `uv.lock` to root `.gitignore`, then `git rm --cached` |
| Analytics count wrong | Loader path mismatch with pipeline write path | Read `AI_CHANGELOG.md` entries for "analytics bugs" — 10 fixed patterns |
| Slide `canvas_template: null` legacy runs | Field added after those runs; editor should show view-only banner | Guard in `SlidePngPreview.tsx` |

---

## `Docs/phases/PHASE_<N>_<slug>.md` Template

Copy when creating a new phase plan:

```markdown
# PHASE <N> — <Name>

## Status
IN REVIEW — not yet approved for implementation

## Problem Statement
[Concrete pain in 2-4 sentences]

## Requirements
- Functional:
- Non-functional:

## External Verification Log
| Claim | Verified against | Verified on |
|-------|------------------|-------------|
| | | |

## Entry Conditions (verify ALL before writing code)
- [ ] <condition> — verify: `<command>`

## Files to Create or Modify
| File | Action | Description |
|------|--------|-------------|

## Implementation Steps

### Step N.1 — <name>
**File:** ``
**Inputs / Outputs:**
**What to implement:**

**Test command:**
```bash
```
**Expected output:**
```
```

## Done Criteria
- [ ]

## Real Data Testing (Loop 3)

### Scenario A —

## Known Constraints / Gotchas
-

## Rollback Plan
1.
```

---

*Review Protocol — refactored for Multi-Agent Content Producer on 2026-08-22*
*Loop 1 must complete before coding. Loop 2 before shipping. Loop 3 before declaring done.*
*Minimum 2 passes on Loop 1 — no maximum.*