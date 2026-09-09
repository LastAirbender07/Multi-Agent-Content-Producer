# Visual Verification Methods for Claude

> **Created:** 2026-09-08  
> **Purpose:** Documents every method tested for Claude to "see" rendered PNG slides,  
> with actual test results, root cause of failures, and the step-by-step protocol to follow.  
> **Status:** Tested and verified on real slides from run `a9b353d1`. Root cause confirmed via official docs.

---

## Root Cause: WHY the Read Tool Fails on Images Here

**Official answer from `https://code.claude.com/docs/en/tools-reference.md`:**
> "Images: PNG, JPG, and other image formats are returned as visual content that Claude can see, not as raw bytes."

The Read tool DOES support images — it is documented to work. But this environment has:

```
CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1    ← disables beta features
LLM_PROVIDER=sap_ai_core_orch               ← SAP AI Core gateway (not direct Anthropic API)
CLAUDE_CODE_ENTRYPOINT=claude-vscode        ← VS Code extension
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
```

From `https://code.claude.com/docs/en/llm-gateway-protocol.md`:
> "Whenever `ANTHROPIC_BASE_URL` points at a host other than `api.anthropic.com`, Claude Code turns off features..."
> "A gateway that rewrites or redacts request bodies for content inspection breaks the pairing..."

**The SAP AI Core gateway likely strips multimodal (image) content from requests** before forwarding to the Claude model. Image content is sent as base64-encoded blocks in the messages API — if the gateway removes those blocks or doesn't forward them, Claude receives no image data and the Read tool returns empty.

Additionally, `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1` is set, which disables pre-release capabilities. Some vision-related beta features may be part of this.

**This is a gateway/provider limitation, not a Claude limitation.** On a direct claude.ai connection (Pro/Max plan), Read tool image support works as documented.

---

## Potential Fixes (Investigated)

### Fix 1: Computer Use (macOS — could enable screen capture)
From docs: `computer-use` MCP server enables Claude to take screenshots and see the screen.  
**Requirements:** Pro or Max claude.ai plan. NOT available on third-party providers (SAP AI Core).  
**Status: NOT available in this environment** (uses SAP AI Core, not claude.ai subscription).

### Fix 2: Direct Anthropic API connection  
Switch from SAP AI Core to direct `api.anthropic.com` with an Anthropic API key.  
This would restore Read tool image support immediately.  
**Status: Not set up — would need ANTHROPIC_API_KEY configured.**

### Fix 3: Chrome extension
From docs: Claude Code Chrome extension lets Claude see browser content.  
**Requirements:** claude.ai subscription. NOT available on third-party providers.  
**Status: NOT available.**

### Fix 4: ngrok tunnel + WebFetch
ngrok is installed (`/opt/homebrew/bin/ngrok`). Could serve images via public URL.  
WebFetch with a public URL would work.  
**Status: POSSIBLE but requires ngrok auth + setup each session. Not automated.**

### Fix 5: MCP image server
Could build a custom MCP server that serves images as base64 via a tool.  
**Status: POSSIBLE but requires development work.**

---

---

## The Exact Root Cause (Confirmed by Testing)

**The architecture:**
```
Claude Code → ANTHROPIC_BASE_URL=http://localhost:6657 → LiteLLM proxy → SAP AI Core → Claude model
```

**What works:** Image sent as **user message content block**
```json
{"role": "user", "content": [{"type": "image", ...}, {"type": "text", ...}]}
```
→ LiteLLM forwards it → SAP AI Core accepts it → Claude sees the image ✅

**What fails:** Image sent as **tool result content block** (how the Read tool works)
```json
{"role": "user", "content": [{"type": "tool_result", "content": [{"type": "image", ...}]}]}
```
→ LiteLLM forwards it → SAP AI Core **silently drops the image content** → Claude sees nothing ❌

**Confirmed by direct API tests on 2026-09-08:**
- User message with image → Claude responded "I CAN SEE IMAGE" ✅
- Tool result with image → Claude said "returned no output, file may be empty" ❌

**Why IDE attachment works:** The VS Code extension sends attached images as USER MESSAGE content (not via the Read tool). Same path as the direct API call. SAP AI Core accepts it.

**The fix:** A script (`scripts/see_slide.py`) that bypasses the Read tool entirely and sends images directly as user message content via the LiteLLM bridge.

---

## Summary: What Works vs What Doesn't

---

## Method Test Results

Each method was tested on real slide PNGs from run `a9b353d1-08d9-4678-9d5f-f1692a1a0ff5`.

### ❌ FAIL — Methods That Do NOT Work

| Method | What was tried | Result |
|--------|---------------|--------|
| `Read` tool on PNG (OneDrive path) | `Read("/Users/.../slide_04.png")` | Silent empty — no error, no content |
| `Read` tool on PNG (`/tmp` path) | Copied to `/tmp`, same Read call | Silent empty |
| `Read` tool on JPEG | Converted PNG→JPEG, Read tool | Silent empty |
| `Read` tool via sub-Agent | Spawned Agent, asked it to Read | Sub-agent also gets silent empty |
| `WebFetch` on localhost | `http://localhost:8000/outputs/...` | "Invalid URL" — localhost blocked |
| `WebFetch` on 127.0.0.1 | `http://127.0.0.1:8000/outputs/...` | SSL error — loopback blocked |
| Playwright screenshot → Read | Playwright screenshots PNG, Read on result | Read still returns empty |
| Base64 HTML → Read | PNG embedded in HTML as data URI | File too large (187K tokens) |
| Tesseract OCR on dark slides | White text on dark bg, inverted | Empty output — contrast insufficient |

**Root cause of `Read` tool failure:** The multimodal image rendering pipeline is not active in this Claude environment. The tool exists and is documented to work, but produces no output here. This affects PNG, JPEG, and Playwright-generated screenshots equally.

---

### ✅ WORKS — Methods That DO Work

#### Method A: `scripts/see_slide.py` — Direct API Vision Call (BEST — autonomous, full visual)
**Reliability: 100% | Detail: Full visual understanding | Autonomous: YES**

The script (`scripts/see_slide.py`) sends images directly as user message content via the LiteLLM bridge — bypassing the Read tool's tool_result path that SAP AI Core drops.

```bash
# Single slide
cd backend && ../.venv/bin/python ../scripts/see_slide.py \
  outputs/runs/{RUN_ID}/content/angle_0/png/slide_04.png

# All slides in a run  
cd backend && ../.venv/bin/python ../scripts/see_slide.py \
  --run {RUN_ID} --angle 0

# Custom question
cd backend && ../.venv/bin/python ../scripts/see_slide.py \
  outputs/runs/{RUN_ID}/content/angle_0/png/slide_04.png \
  --question "Is any text overlapping? Is the top half empty?"
```

**Confirmed working on 2026-09-08:** Claude correctly described slide_04 (stat-hero with "3×" in yellow, two-zone layout, no overlap) and slide_06 (engage with "If this is making you rethink" headline).

**Requirements:** LiteLLM bridge must be running on localhost:6657 (it starts automatically with the VS Code Claude Code extension).

---

#### Method B: User attaches image in IDE (full visual)
**Reliability: 100% | Detail: Full visual understanding**

When the user shares a screenshot or image file directly in the conversation (via IDE attachment), Claude receives the full visual rendering and can describe exactly what is on screen — colors, text content, layout, overlaps, etc.

**Evidence from this session:**  
User shared `slide_02.png`, `slide_04.png`, `slide_05.png`, `slide_06.png` as attachments. Claude correctly identified:
- "Body ends abruptly: …Silicon Valley figures like Gary Vaynerchuk didn't just model overwork —"
- "Top 50% of slide is blank, content squeezed to bottom"
- "Text overlap: stat number covered by body text"

**Limitation:** Requires user action. Claude cannot trigger this independently.

---

#### Method B: Pillow Zone Analysis (GOOD — structural verification)
**Reliability: High | Detail: Layout zones, element positions, color detection**

Uses Python Pillow to scan horizontal bands of the image and detect:
- Background color (cream vs dark)
- White text presence (pixels > 220,220,220)
- Yellow/coral accent presence (stat numbers)
- Activity/contrast (deviation from background)

```bash
.venv/bin/python -c "
from PIL import Image
import numpy as np

def verify_slide(path, label):
    arr = np.array(Image.open(path).convert('RGB'))
    bg = arr[0:20, 0:20].mean(axis=(0,1))
    bg_type = 'DARK' if bg[0] < 80 else 'CREAM'
    
    print(f'{label} — bg={bg_type} ({bg[0]:.0f},{bg[1]:.0f},{bg[2]:.0f})')
    
    for y in range(0, 1080, 80):
        band = arr[y:y+80, 60:1020]
        white  = ((band[:,:,0]>220) & (band[:,:,1]>220) & (band[:,:,2]>220)).sum()
        yellow = ((band[:,:,0]>200) & (band[:,:,1]>150) & (band[:,:,2]<80)).sum()
        coral  = ((band[:,:,0]>180) & (band[:,:,1]<140) & (band[:,:,2]<130)).sum()
        
        markers = []
        if white > 300:  markers.append(f'TEXT({white}px)')
        if yellow > 100: markers.append(f'YELLOW_STAT({yellow}px)')
        if coral > 100:  markers.append(f'CORAL_STAT({coral}px)')
        if markers:
            print(f'  y={y:4d}: {\" | \".join(markers)}')

verify_slide('PATH_TO_SLIDE.png', 'LABEL')
"
```

**What this can detect:**
- ✅ Correct: text in top AND bottom half of slide (not bottom-only)
- ✅ Overlap: text at y=300 AND stat number at y=320 (overlapping zones)
- ✅ Template family: dark bg = aurora/compact-content; cream = compact-hook/cta
- ✅ Placeholder defaults: no yellow/coral stat when stat_value=None expected
- ❌ Cannot: read the actual text content, check for mid-sentence truncation

---

#### Method C: Tesseract OCR (GOOD for cream-bg slides, LIMITED for dark)
**Reliability: Medium (cream bg) / Low (dark bg) | Detail: Actual text content**

```bash
# Cream background slides (hook, cta, engage, quote) — works well
tesseract PATH_TO_SLIDE.png /tmp/ocr_output --psm 3 2>/dev/null
cat /tmp/ocr_output.txt

# Dark background slides — preprocess first
.venv/bin/python -c "
from PIL import Image, ImageOps, ImageEnhance
img = Image.open('PATH').convert('RGB')
inv = ImageOps.invert(img)
enh = ImageEnhance.Contrast(inv).enhance(3.0)
enh.save('/tmp/ocr_input.png')
"
tesseract /tmp/ocr_input.png /tmp/ocr_output --psm 3 2>/dev/null
cat /tmp/ocr_output.txt
```

**Test results on `a9b353d1` angle_0:**
| Slide | Type | BG | Words read | Quality |
|-------|------|----|-----------|---------|
| slide_01 | hook | cream | 9 | ✅ "VIRAL REEL Your school schedule is a brain damage program" |
| slide_03 | stat-hero | dark | 50 | ⚠️ Garbled but "Six hours of sleep" legible |
| slide_06 | engage | cream | 25 | ✅ "If this is making you rethink" |
| slide_12 | cta | cream | 31 | ✅ "FOLLOW FOR MORE Follow now — your" |

---

#### Method D: Screencapture + ngrok tunnel (NOT YET TESTED — future option)
Both `screencapture` and `ngrok` are installed. A future workflow could:
1. Run `screencapture` on the PNG opened in Preview
2. Tunnel via ngrok to get a public URL
3. Use `WebFetch` on the public URL

Not implemented yet — requires ngrok auth token setup.

---

## Step-by-Step Protocol for Visual Verification

**THIS IS NOW FULLY AUTONOMOUS.** Use `scripts/see_slide.py` — it works without user involvement.

### Step 1 — see_slide.py (autonomous full visual — always run first)

```bash
# Inspect all slides in a run (autonomous — no user involvement needed)
cd backend
../.venv/bin/python ../scripts/see_slide.py --run {RUN_ID} --angle 0

# Or specific slides
../.venv/bin/python ../scripts/see_slide.py \
  outputs/runs/{RUN_ID}/content/angle_0/png/slide_02.png
```

Claude receives a full visual description and can detect: text overlap, empty regions, placeholder defaults, wrong template, content quality. **This is the primary verification method — it is autonomous.**

---

### Step 2 — Pillow zone analysis (fast structural sanity check)

Run for every content slide (type=content) and every new template:

```bash
cd backend && .venv/bin/python -c "
from PIL import Image
import numpy as np

RUN='YOUR_RUN_ID'
ANGLE=0

import os
png_dir = f'outputs/runs/{RUN}/content/angle_{ANGLE}/png'
for fname in sorted(os.listdir(png_dir)):
    if not fname.endswith('.png'): continue
    path = os.path.join(png_dir, fname)
    arr = np.array(Image.open(path).convert('RGB'))
    bg = arr[0:20,0:20].mean(axis=(0,1))
    bg_type = 'DARK' if bg[0] < 80 else 'CREAM'
    top_text  = ((arr[50:540,  60:1020, 0]>220) & (arr[50:540,  60:1020, 1]>220) & (arr[50:540,  60:1020, 2]>220)).sum()
    bot_text  = ((arr[540:1000,60:1020, 0]>220) & (arr[540:1000,60:1020, 1]>220) & (arr[540:1000,60:1020, 2]>220)).sum()
    yellow    = ((arr[:,:,0]>200) & (arr[:,:,1]>150) & (arr[:,:,2]<80)).sum()
    spread    = 'SPREAD' if top_text>500 and bot_text>500 else 'BOTTOM-ONLY' if top_text<500 else 'TOP-ONLY'
    print(f'{fname}: bg={bg_type} spread={spread} top={top_text} bot={bot_text} yellow={yellow}')
"
```

**Pass criteria:**
- Content slides: `spread=SPREAD` (text in both halves, not bottom-only)
- Dark bg templates: `bg=DARK`
- Cream bg templates: `bg=CREAM`
- Stat slides: `yellow > 500` (stat number rendered in accent color)
- No slide: `top=0 bot=0` (completely blank)

---

### Step 3 — Tesseract OCR on cream-bg slides

For hook, cta, engage, quote slides (cream background):

```bash
SLIDE="outputs/runs/{RUN_ID}/content/angle_0/png/slide_01.png"
tesseract "$SLIDE" /tmp/ocr_out --psm 3 2>/dev/null && cat /tmp/ocr_out.txt
```

**Pass criteria:**
- Output contains words from the actual topic (e.g. "sleep", "hustle", "Gen Z")
- Does NOT contain "@nextwork", "+47%", "Into the lab", "Anthropic Research Report" (placeholder defaults)
- Title words are legible

---

### Step 4 — State findings explicitly

After running the above, write in the response:

```
VISUAL CHECK FINDINGS — run {run_id}, angle_0:
- Pillow zone analysis: [paste actual output]
- OCR on slide_01: [paste text]
- OCR on slide_06: [paste text]

PASS/FAIL per criterion:
- [ ] bg=DARK on aurora-lite/compact-content slides
- [ ] bg=CREAM on compact-hook/cta/engage slides  
- [ ] text SPREAD on content slides (not bottom-only)
- [ ] yellow accent on stat slides
- [ ] no placeholder defaults in OCR output
- [ ] topic words appear in OCR (confirms real content)

REMAINING: user must open and visually confirm before committing.
```

**Never say "verified" or "looks correct" without having completed Steps 2-4 and written the findings.**

---

## What Claude Still Cannot Do Alone

| What | Why |
|------|-----|
| Read mid-sentence truncation | Pillow/OCR can detect text presence but not grammar |
| Confirm visual aesthetic quality | "Does this look Instagram-native?" requires human judgment |
| Detect subtle layout issues | e.g. slight misalignment, wrong font weight, colour off by 10% |
| See dark-background slides accurately | OCR fails on inverted dark slides in practice |

**These always require the user to open the PNG and confirm.**

---

## Adding to CLAUDE.md

The following was added to `CLAUDE.md` as a permanent rule:

> For any visual check of rendered slides:
> 1. Always run Pillow zone analysis (Step 2 above)  
> 2. Always run Tesseract OCR on cream-bg slides (Step 3)
> 3. Always write explicit findings (Step 4)  
> 4. Always tell the user which specific slides to open and what to check
> 5. Never declare "verified" without user confirmation
