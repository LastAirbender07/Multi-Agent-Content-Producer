# PHASE 3.6 — Aurora-Lite Visual Polish

## Status
APPROVED — Loop 1 complete 2026-09-08. Ready to implement.

## Problem Statement

The template audit (Sept 8 2026) found that aurora-lite reuses aurora-extended builders for hook, stat, cta, engage — but those builders were designed for a different density context and use font sizes optimised for 40–70 word slides. Aurora-lite slides carry ≤15 words, which means the same font sizes produce slides with too much dead space and type that feels undersized relative to how much breathing room there is.

Specific findings from visual audit:

| Template | Issue | Evidence |
|----------|-------|---------|
| aurora-lite-hook | Body text 24pt — too small for 15-word lite slide | "body slightly small" audit finding |
| aurora-lite-stat | Body 20pt + meta title 15pt — undersized | "Body text too small for mobile" |
| aurora-lite-quote | Attribution 26pt — slightly small | "attribution text small" |
| aurora-lite-content-text | Title 48pt / body 23pt — too small for text-only slide | "dead space lower 40%, undersized" |
| aurora-lite-engage | Copy is self-promotional with no value | Pipeline/prompt issue — NOT template |
| aurora-lite-cta | Fine — 64pt / 26pt | ✅ No change needed |
| aurora-lite-content-0/-1/-2/-3 | Awkward photo crop on some images | `loadPanelImage` issue — separate fix |

## What We Are Building

**Four dedicated aurora-lite builders** replacing the current reuse-of-extended approach for hook, stat, and one layout enhancement:

### A — `aurora_lite_hook.ts` (NEW builder, replaces reuse of `buildAuroraHook`)
- BODY_FONT_SZ: 24 → **30pt** (bigger body for the breathing room available)
- CARD_W: 880 → **940px** (wider card, less margin, more bold)
- HEAD_FONT_SZ: stays 72pt (already correct)
- Fix pencil emoji z-order: render swipe hint AFTER glass card, not before
- Label: change "THREAD" → read from `slide.eyebrow` if present, else "OPINION" (more meaningful)

### B — `aurora_lite_stat.ts` (NEW builder, replaces reuse of `buildAuroraStat`)
- BODY_FS: 20 → **24pt** (was audit finding: "too small for mobile")  
- Meta title (context line): 15 → **18pt**
- Meta label (stat_label): stays 24pt
- Stat number: stays at auto-sized 52–116pt (already scales correctly)
- Body left-bar accent: keep (good visual detail)
- Chart: keep as-is (works well)
- No-chart glow: keep (good fallback)

### C — `aurora_lite_quote.ts` (MODIFY existing)
- Attribution fontSize: 26 → **28pt**
- Attribution lineHeight: 1.4 → **1.45**
- Deco quote mark: stays 90pt

### D — `aurora-lite-content-text` routing (NEW override in index.ts)
Currently routes to `buildAuroraContent(s,i,t,m,-1)` which calls `textOnly.ts` with 48pt/23pt.
Instead route to a new `buildAuroraLiteContentText` that uses:
- Title: **68pt** Syne (vs 48pt) — dominant, fills the vertical space
- Body: **28pt** (vs 23pt)
- No image needed
- Vertical centering already in textOnly.ts — keep

Actually: rather than a separate builder, override the layout params by creating
`aurora_lite_text_only.ts` (~40 lines) that simply calls `buildLayoutTextOnly` style
but with bigger fonts and adds a thin accent line.

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `frontend/utils/canvasTemplates/aurora_lite_hook.ts` | CREATE | New hook builder with 30pt body, 940px card |
| `frontend/utils/canvasTemplates/aurora_lite_stat.ts` | CREATE | New stat builder with 24pt body, 18pt meta title |
| `frontend/utils/canvasTemplates/aurora_lite_quote.ts` | MODIFY | Attribution 26→28pt |
| `frontend/utils/canvasTemplates/aurora_lite_text_only.ts` | CREATE | Text-only content variant, 68pt/28pt |
| `frontend/utils/canvasTemplates/index.ts` | MODIFY | Wire aurora-lite-hook, aurora-lite-stat, aurora-lite-content-text to new builders |
| `backend/renderer/renderer.bundle.js` | REBUILD | `node backend/renderer/build.mjs` |

## Entry Conditions (verify before implementing)

- [x] `frontend/utils/canvasTemplates/aurora_hook.ts` — read and understood (135 lines)
- [x] `frontend/utils/canvasTemplates/aurora_stat.ts` — read and understood (183 lines)  
- [x] `frontend/utils/canvasTemplates/aurora_lite_quote.ts` — read and understood (128 lines)
- [x] `frontend/utils/canvasTemplates/index.ts` — read and understood
- [x] Audit findings confirmed via `scripts/see_slide.py` on real PNG files
- [x] Aurora token set: bg=#090909, primary=#7C6EFA, secondary=#2DD4BF, fontTitle=Syne, fontBody=Plus Jakarta Sans

## External Verification

| Claim | Verified |
|-------|---------|
| aurora-lite templates use AURORA tokens | `getTokens("aurora-lite-*")` returns AURORA — confirmed in canvasTokens.ts |
| `calcTextHeight()` works after object creation | Used in aurora_hook.ts line 71, aurora_stat.ts line 98 — confirmed works |
| Instagram standard: 26–30pt body font | Strategy doc `MULTI_FORMAT_CONTENT_STRATEGY.md` + instacarousel.com 2026 guide cited |
| Existing two-pass layout pattern works | Proven in aurora_hook.ts, aurora_stat.ts, aurora_cta.ts |

## Implementation Steps

### Step 3.6.1 — `aurora_lite_hook.ts`

Copy `aurora_hook.ts` as base. Change only:
```typescript
const CARD_W        = 940;   // was 880 — wider card, more dominant
const BODY_FONT_SZ  = 30;    // was 24 — bigger body for lite density (≤15w)
const HEAD_FONT_SZ  = 72;    // unchanged
```
Change `"THREAD"` label to use `slide.eyebrow || "OPINION"` — more meaningful for different formats.

### Step 3.6.2 — `aurora_lite_stat.ts`

Copy `aurora_stat.ts` as base. Change only:
```typescript
// Body text section (line ~132):
const BODY_FS = 24;    // was 20

// Meta title (context line below stat label, line ~103):
fontSize: 18,          // was 15
```
Everything else identical.

### Step 3.6.3 — `aurora_lite_quote.ts` (modify)

One line change:
```typescript
fontSize: 28,   // was 26 (attribution line)
lineHeight: 1.45,  // was 1.4
```

### Step 3.6.4 — `aurora_lite_text_only.ts`

New file ~60 lines. Dark bg, no image. Larger type fills the canvas.

```typescript
// Constants
const TITLE_FS = 68;  // vs textOnly.ts's 48pt
const BODY_FS  = 28;  // vs textOnly.ts's 23pt
const PAD_X    = 72;
const INNER_W  = 1080 - PAD_X * 2;

// Layout: same two-pass as textOnly.ts but with accent line top-left
// Vertical centering: same as textOnly.ts
// Accent line: 56px wide, 3px tall, gradient primary→secondary (same as aurora_stat.ts)
```

### Step 3.6.5 — `index.ts` registry updates

```typescript
import { buildAuroraLiteHook }       from "./aurora_lite_hook";
import { buildAuroraLiteStat }       from "./aurora_lite_stat";
import { buildAuroraLiteTextOnly }   from "./aurora_lite_text_only";

// In REGISTRY:
"aurora-lite-hook":          buildAuroraLiteHook,     // was buildAuroraHook
"aurora-lite-stat":          buildAuroraLiteStat,     // was buildAuroraStat
"aurora-lite-content-text":  (s,i,t,m) => buildAuroraLiteTextOnly(s,i,t,m),  // was buildAuroraContent(s,i,t,m,-1)
```

### Step 3.6.6 — Rebuild bundle

```bash
node backend/renderer/build.mjs
```
Expected output: `renderer.bundle.js  ~650kb`

### Step 3.6.7 — Visual verification

Run `see_slide.py` on the existing OPINION run after re-rendering slides 1, 3, 6, 11:

```bash
cd backend
.venv/bin/python ../scripts/see_slide.py \
  outputs/runs/9e8f47d7-c4ae-45a4-9ca5-dec21a701088/content/angle_0/png/slide_01.png \
  --question "How large is the body text relative to the headline? Is it clearly readable on a phone? Quote both exactly."
```

Then re-render the test slides:
```bash
.venv/bin/python -c "
import asyncio, sys
sys.path.insert(0, '.')
from core.orchestrators.content.renderer import SlideRenderTask, render_slides_fabric
from pathlib import Path

# Re-render with new bundle
async def test():
    slides = [
        {'slide_number':1,'type':'hook','canvas_template':'aurora-lite-hook','_theme':'aurora',
         'title':'Hustle culture was engineered, not organic.',
         'body':'Silicon Valley packaged overwork as identity.','bullets':[]},
        {'slide_number':2,'type':'stat','canvas_template':'aurora-lite-stat','_theme':'aurora',
         'title':'Gen Z is America most stressed generation by a wide margin.',
         'body':'APA Stress in America 2019 — highest reported stress of any generation.',
         'stat_value':'91%','stat_label':'of Gen Z report chronic stress symptoms'},
        {'slide_number':3,'type':'quote','canvas_template':'aurora-lite-quote','_theme':'aurora',
         'title':'Burnout is not a personal failing. It is a logical consequence.',
         'body':'Anne Helen Petersen, Can t Even, 2020','bullets':[]},
        {'slide_number':4,'type':'content','canvas_template':'aurora-lite-content-text','_theme':'aurora',
         'title':'Achievement anxiety is the underdiagnosed epidemic.',
         'body':'Nobody talks about the pressure Gen Z puts on itself.','bullets':[]},
    ]
    tasks = [SlideRenderTask(s, None, Path(f'/tmp/lite_polish_{s[\"slide_number\"]}.png')) for s in slides]
    paths = await render_slides_fabric(tasks)
    for p in paths: print(p)

asyncio.run(test())
"
```

Then inspect each with see_slide.py and write findings before declaring done.

## Done Criteria

- [ ] `aurora-lite-hook`: body text visually larger (30pt), card wider, readable on phone
- [ ] `aurora-lite-stat`: body paragraph clearly legible at 24pt, meta title readable at 18pt
- [ ] `aurora-lite-quote`: attribution slightly larger, no overflow  
- [ ] `aurora-lite-content-text`: title fills canvas at 68pt, body at 28pt — no empty lower 40%
- [ ] Bundle rebuilt successfully
- [ ] Visual verification run with see_slide.py — findings written down
- [ ] No regression on aurora-extended (those builders NOT touched)

## What We Are NOT Changing

- `aurora_hook.ts`, `aurora_stat.ts`, `aurora_quote.ts`, `aurora_cta.ts`, `aurora_engage.ts` — untouched
- `aurora_content.ts` + `contentLayouts/` — untouched  
- aurora-lite-content-0/-1/-2/-3 routing — untouched (layouts are correct, word counts correct)
- aurora-lite-cta, aurora-lite-engage routing — untouched (4/5 rating, fine as-is)
- Any backend Python files
- Any routing tables

## Rollback Plan

Revert `index.ts` changes (3 lines). Builders are new files — just stop importing them.
