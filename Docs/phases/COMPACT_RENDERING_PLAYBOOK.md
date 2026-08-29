# Compact Template Rendering Playbook

> **Purpose:** Exact expectations for every component + family build cycle in Phase 2 (and beyond).
> For each unit of work — component OR family — this playbook defines what "done" looks like.

---

## The Quality Bar (Non-Negotiable)

Before any component or template is marked done, it must clear the **aesthetic gate** — not just the GAN diff number:

1. **Would a non-designer assume this was made in Canva Pro by a real creator?** If you hesitate, keep going.
2. **One focal point.** If you can name two "main things", the slide is too busy.
3. **3-level type hierarchy visible at a glance.** Display → subtitle → body — jump is dramatic, not gradual.
4. **Breathing room.** No element closer than 40px to another unless intentionally grouped.
5. **2-color max** (plus white/black). Background + one accent. Never three competing fills.
6. **The restraint check.** What's missing that you'd normally expect? Often the absence IS the design decision.

---

## Critical Process Rules (learned from aurora-compact-quote, 2026-08-29)

These are non-obvious failure modes that will silently waste hours if not followed.

### Rule 1 — Always rebuild the bundle before running GAN
```bash
node backend/renderer/build.mjs && node scripts/gan_reference.js --template <key>
```
`gan_reference.js` uses the **pre-built static bundle** at `backend/renderer/renderer.bundle.js`. It does NOT auto-rebuild. If you edited the template TS and forget to rebuild, GAN renders stale code. The scores look plausible and no error is thrown.

**Sign of this bug:** Multiple fixture variants produce pixel-identical renders with suspiciously similar GAN scores (~50% each).

### Rule 2 — Scan new TypeScript files for curly quotes before building
```bash
python3 -c "
data = open('frontend/utils/canvasTemplates/YOUR_TEMPLATE.ts', 'rb').read()
for i, line in enumerate(data.split(b'\n'), 1):
    if b'\xe2\x80\x9c' in line or b'\xe2\x80\x9d' in line:
        print(f'line {i}: {repr(line[:80])}')
"
```
Curly quotes (U+201C/U+201D) as **TypeScript type string literal delimiters** crash esbuild with `Unexpected """`. Content inside backtick template literals is fine. Type annotations like `"fade" | "hard"` must be ASCII double quotes.

### Rule 3 — DEFAULTS block: always use backtick template literals
```typescript
// CORRECT — backtick literals survive esbuild regardless of curly quote content
portrait_edge: `hard`,

// WRONG — esbuild fails if curly quotes snuck in
portrait_edge: "hard",
```

### Rule 4 — Edge treatment comparison: use high-contrast (dark background) portraits
Light grey studio portraits go near-white after B&W filter → adjacent to terracotta card, fade vs hard vs rule are indistinguishable. Use `backend/assets/images/portrait-contrast.jpg` (black background) for comparison fixtures.

### Rule 5 — JSON fixtures with curly quotes: use `“` / `”` escape sequences
The Write tool normalizes literal curly quotes to ASCII `"` — breaking JSON string values that intentionally contain curly quotes (e.g. opening `"` of a pull quote).

---

## Build Cycle — Components

For **each component** (`make-*`), the contract is:

### Step 1 — Look
- Find the reference PNG in `backend/outputs/slide-references/` that most clearly shows this component in isolation.
- Write down: exact visual properties — fill color, stroke width, font family + weight + size, padding, corner radius, letter spacing. No guessing. Sample the PNG if needed.
- Identify the one property that makes this component feel "premium" (e.g., the stroke-only badge with no fill, the auto-sizing pill, the tight 1.05 line-height).

### Step 2 — Isolate the reference crop
- Crop the component out of the full-slide reference PNG.
- Save to `scripts/gan_refs/components/make-<name>.png`.
- The crop must contain ONLY the component — no surrounding context.

### Step 3 — Write the TypeScript
- File: `frontend/utils/canvasTemplates/shared/compact/make-<name>.ts`
- Signature: `(opts: {…, tokens: CompactTokens}) => fabric.FabricObject | fabric.Group`
- Props typed explicitly — no `any`. All sizing from tokens where applicable.
- Zero hardcoded canvas dimensions inside the factory. x/y always come from opts.

### Step 4 — Export
- Add named export to `frontend/utils/canvasTemplates/shared/compact/index.ts`.

### Step 5 — GAN snapshot
```bash
node scripts/gan_component_snapshots.js --component make-<name>
```
- Target: ≤ 5% diff vs the reference crop.
- If ≥ 5%: examine the composite (ref | generated | diff) — identify the single biggest discrepancy, fix it, re-run. Repeat up to 5 iterations.
- **Do NOT move to the next component until this passes.**

---

## Build Cycle — Families

For **each family** (`aurora-compact-*`), the contract is:

### Step 1 — Understand the reference images
Open EVERY reference PNG listed in the family MD. For each one:
1. Identify the bg (hex, photo, gradient).
2. List every visual element top-to-bottom, left-to-right.
3. For each: font, size, color, x/y position estimate (as % of 1080).
4. Name the **anchor element** — the one thing that makes this design instantly recognizable.
5. Name the **restraint** — what's absent that you'd expect?

### Step 2 — Decompose into components
Map every element to a shared factory:
```
bg     → Rect fill / FabricImage + LinearGradient
chrome → make-brand-pill / make-dot-progress-indicator / make-editorial-header-bar
hero   → make-mixed-weight-text / make-outlined-pill
body   → Textbox (with calcTextHeight pre-measure)
visual → make-number-badge / FabricImage / make-topic-badge
```
If any required factory doesn't exist yet, write it first (component build cycle above).

### Step 3 — Build the template
- File: `frontend/utils/canvasTemplates/aurora_compact_<name>.ts`
- Signature: `(slide, imageUrl, tokens: CompactTokens, meta) => Promise<fabric.FabricObject[]>`
- Canvas: **1080 × 1350** (4:5 portrait — all compact family templates use this size).
- Two-pass layout rule: **always** `calcTextHeight()` variable elements in Pass 1, position in Pass 2. Never estimate.
- No magic numbers. Every Y position either comes from tokens or is computed relative to a measured element.

### Step 4 — Write the fixture
- File: `scripts/gan_fixtures/<family-key>/<descriptive-name>.json`
- Content must match the reference image as closely as possible — same copy, same structure.
- This is what the GAN runs against. If the copy is wildly different, the GAN diff will be misleading.

### Step 5 — GAN iteration loop
```bash
node scripts/gan_reference.js --template aurora-compact-<name> --llm
```
- Target: ≤ 5% content-zone diff (bottom 55% of canvas) vs ALL reference PNGs in the family MD.
- On failure: LLM analysis identifies the delta. Apply the top fix. Re-run. Up to 5 iterations.
- If diff doesn't converge after 5 iterations: stop, escalate the specific delta for human review.

### Step 6 — Aesthetic gate
After the GAN target is hit, do a final human-eye check on the rendered PNG:
- [ ] Bg matches reference character (not just pixel diff — does it have the same *mood*?)
- [ ] Typography creates a clear 3-level hierarchy visible at arm's length
- [ ] Anchor element is identifiable in < 1 second
- [ ] No element is touching another (40px minimum gap respected)
- [ ] Would this slide appear in a real creator's carousel without embarrassment?

If YES to all 5: **ship it**. If NO to any: one more iteration, addressing the failing check specifically.

**Do NOT move to the next family until both GAN gate AND aesthetic gate pass.**

---

## Canvas Size

All compact templates use **1080 × 1080** — same as the existing cover-hero family. This is fixed and was confirmed during POC v2.

| Family | Canvas |
|---|---|
| aurora-carousel-cover-hero | 1080 × 1080 (built) |
| aurora-compact-* | **1080 × 1080** |

---

## Sequential Build Order

Strict. No parallel work. Each item must fully clear its gate before the next starts.

### Stage B — Components (6)

| # | Component | Key aesthetic signal | Reference crop |
|---|---|---|---|
| 1 | `make-brand-pill` | Rounded wordmark pill, bottom-left chrome | `nextwork/image.png` bottom-left |
| 2 | `make-dot-progress-indicator` | Tiny dot row, centred, 1 active dot larger | `others/image copy 3.png` bottom-centre |
| 3 | `make-outlined-pill` | Stroke-only pill, zero fill OR filled peach pill — depends on opts | `others/image copy 3.png` `VIRAL REEL` |
| 4 | `make-mixed-weight-text` | Inter Black + Playfair Italic runs in same headline | `others/image copy 3.png` headline zone |
| 5 | `make-number-badge` | Stroke-only circle, no fill — the outline IS the design | `SahilBloom/image copy.png` badge zone |
| 6 | `make-editorial-header-bar` | 3 objects: handle left + series title right + hairline rule | `SahilBloom/image copy.png` top bar |

### Stage C — Families (5)

| # | Family | Primary reference | Core challenge |
|---|---|---|---|
| 1 | `aurora-compact-hook` | `others/image copy 3.png` | Auto-sizing pill + 3-tier font-size logic |
| 2 | `aurora-compact-fact` | `others/` stat slides | Big number focal point + context framing |
| 3 | `aurora-compact-step` | `nextwork/image copy 2.png`, `nextwork/image copy 3.png` | Full-bleed photo + gradient overlay + two layout variants |
| 4 | `aurora-compact-list-item` | `SahilBloom/image copy.png` | Two-pass row layout + inline bold spans + stroke-only badge |
| 5 | `aurora-compact-quote` | `others/` terracotta quote slides | Terracotta fill + large serif quotation mark |

---

## Design Correction Log

These were wrong in earlier MDs — corrected 2026-08-29. Do NOT revert:

| Template | Was | Now |
|---|---|---|
| `aurora-compact-list-item` | bg `#F3ECD8` warm sandy cream | bg `#F9F9F7` near-white (SahilBloom actual) |
| `aurora-compact-list-item` | Editorial header at bottom | Editorial header at TOP (y=50–82) |
| `aurora-compact-step` | Flat cream bg `#F5F0E8`, dark text | Full-bleed warm photo + gradient overlay, white text |
| `aurora-compact-step` | Giant isolated 240pt digit | Colour dot (18px) + 110pt Inter Bold topic name |

---

## The "Why" (Problem This Solves)

See `Docs/pending-works/MULTI_FORMAT_CONTENT_STRATEGY.md`.

TL;DR: Our pipeline produces one format (opinion), slides too dense (40–70 words), 20px text, 3–5 bullets. Target: ≤ 20 words, one idea per slide, huge type, 2-second readability. Each compact template is a direct answer to one format type a real creator uses.
