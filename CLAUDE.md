# CLAUDE.md — Rules for this project

> This file is read by Claude at the start of every session.
> These rules are NOT suggestions. Violating any of them is unacceptable.

---

## 1. NEVER commit without explicit user instruction

**Do not run `git commit`, `git add`, or `git push` under any circumstances unless the user says one of:**
- "commit this"
- "commit"
- "go ahead and commit"
- or any other direct, explicit instruction to commit

**What to do instead after making code changes:**
1. Show the user what files changed and what was changed
2. Show the relevant output (run IDs, pixel checks, whatever is verifiable)
3. STOP. Wait for the user to review.
4. Only commit if the user explicitly asks.

**Why this rule exists:**
Claude was autonomously committing changes and declaring them "100% working" or "done" without the user ever seeing the actual output. The user discovered broken slides only after commits were already made. This is unacceptable.

---

## 2. NEVER declare work "done", "verified", or "working" without actual visual proof

> Full tested protocol: `docs/protocol/VISUAL_VERIFICATION_METHODS.md`

**The `Read` tool silently returns empty for PNG files in this environment.**

**Root cause (confirmed 2026-09-08):** SAP AI Core (the LLM gateway used here) accepts images in user message content blocks but **silently drops images inside `tool_result` content blocks**. The Read tool sends images as tool results → they never reach Claude.

**The fix: `scripts/see_slide.py`** sends images as user message content — the path SAP AI Core accepts. Fully autonomous. Full visual understanding. Works in this environment.

**Before calling any rendered slide "verified", ALWAYS run this:**

```bash
# PRIMARY — full autonomous visual inspection
cd backend
.venv/bin/python ../scripts/see_slide.py --run {RUN_ID} --angle 0

# SECONDARY — structural sanity check (fast, catches bg color + text spread)
.venv/bin/python -c "
from PIL import Image; import numpy as np, os
png_dir = 'outputs/runs/{RUN_ID}/content/angle_0/png'
for f in sorted(os.listdir(png_dir)):
    if not f.endswith('.png'): continue
    arr = np.array(Image.open(f'{png_dir}/{f}').convert('RGB'))
    bg = arr[0:20,0:20].mean(axis=(0,1))
    top = ((arr[50:540,60:1020,0]>220)&(arr[50:540,60:1020,1]>220)&(arr[50:540,60:1020,2]>220)).sum()
    bot = ((arr[540:1000,60:1020,0]>220)&(arr[540:1000,60:1020,1]>220)&(arr[540:1000,60:1020,2]>220)).sum()
    yellow = ((arr[:,:,0]>200)&(arr[:,:,1]>150)&(arr[:,:,2]<80)).sum()
    print(f'{f}: bg={\"DARK\" if bg[0]<80 else \"CREAM\"} {\"SPREAD\" if top>500 and bot>500 else \"BOTTOM-ONLY\"} yellow={yellow}')
"

# TERTIARY — OCR to catch placeholder defaults on cream slides
tesseract outputs/runs/{RUN_ID}/content/angle_0/png/slide_01.png /tmp/ocr_out --psm 3 2>/dev/null
cat /tmp/ocr_out.txt
```

**Then write exactly what `see_slide.py` described for slides 02, 03, 07 before calling anything verified.**

**Do not say "100% working", "verified", "all slides look correct", or "everything is good"** unless `see_slide.py` has been run and its output has been quoted in the findings.

**Why this rule exists:** Claude repeatedly declared visual verification "complete" based on pixel-sampling heuristics. Broken slides (empty top halves, overlapping text, placeholder defaults) were shipped as "verified" multiple times.

---

## 3. NEVER skip the Loop 1 architect review before implementing

Before writing a single line of implementation code for any non-trivial change:
1. Read `docs/protocol/REVIEW_PROTOCOL.md`
2. Read the relevant renderer/backend docs
3. Write a plan doc in `docs/phases/` or `docs/rca/`
4. Get explicit user approval before implementing

**Why this rule exists:**
`aurora-lite-content.ts` was built from scratch as a custom glass-card template instead of reusing `buildAuroraContent()`. The fix was 5 lines. Three sessions were wasted because the plan was never reviewed against the existing architecture.

---

## 4. For renderer / template changes — read the reference implementation first

Before writing any new template builder:
1. Read `frontend/utils/canvasTemplates/aurora_content.ts` — the reference
2. Read `docs/renderer/RENDERER_CODEBASE_GUIDE.md` — Template Family Design Contract
3. Read `docs/renderer/ADDING_A_SLIDE_TYPE.md` — Adding a Family section

**The key rule:** A new template family = new tokens + existing `buildAuroraContent()` layout engine. It is almost never correct to write a new layout from scratch.

---

## 5. Do not use web search as an afterthought — use it proactively

Before implementing anything involving a library (Fabric.js, LangGraph, FastAPI, Playwright):
- Search for existing APIs: `grep -rn "keyword" frontend/node_modules/fabric/`
- Search GitHub for reference implementations
- Check official docs

**Why this rule exists:**
Phase 2.6 built a custom crop/pan system. Fabric.js already had `enterCropMode()` built-in. Weeks wasted.

---

## 6. Keep a clear list of what is actually done vs claimed done

After any change, state explicitly:
- What files were changed (exact paths)
- What the user needs to check manually before this can be called done
- What run IDs or file paths to look at
- What KNOWN remaining issues still exist

Do not use vague summaries. Be specific about what is incomplete.
