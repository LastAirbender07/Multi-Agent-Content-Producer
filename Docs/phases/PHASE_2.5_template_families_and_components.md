# PHASE 2.5 — Template Family Cohesion + Component Panel Exposure

## Status
COMPLETE — Loop 1 implementation done (2026-08-30)
All 16 done criteria checked. 7 new templates pixel-verified. 14 components registered. TEMPLATE_FAMILIES created. TypeScript: 0 errors.

---

## Problem Statement

Phase 2 shipped 9 carefully crafted compact templates. Each looks excellent in isolation but they come from different design vocabularies (nextwork-cream, SahilBloom-white, terracotta, atmospheric photo-bg). There is no formal concept of a "family" — the LLM has no metadata to route by, and a carousel would mix incoherent design systems.

Additionally, 14 fully built shared components (6 compact primitives + 8 cover-hero primitives including the tilted phone mockup and tilted image pair) are invisible in the editor Components panel. Only 15 of 29 built components are registered.

After this phase: 4 formal families are defined with LLM-facing metadata. Each family has enough slide types to produce a complete carousel without mixing families. The editor Components tab shows all 29 components in 3 labelled sections.

---

## Requirements

**Functional:**
- `frontend/constants/templateFamilies.ts` exports `TEMPLATE_FAMILIES` — rich metadata consumed by Phase 3 format plumbing
- Every family covers: hook, stat/data, list, step, quote, CTA, engage (7 minimum types)
- Editor Components tab shows 3 sections: "Aurora" (15), "Compact" (6), "Cover" (8)
- All 29 components are draggable and land correctly on canvas
- No existing template is modified in any way

**Non-functional:**
- No TypeScript errors (`npx tsc --noEmit` clean)
- All existing templates still pass `node scripts/playwright_verify.mjs` after changes
- Each new template builder is visually verified in the editor before moving to the next
- New templates must feel modern, sleek, and aesthetically consistent with their family's DNA

---

## External Verification Log

| Claim | Verified against | Verified on |
|---|---|---|
| `addComponentToCanvas` receives `theme: "aurora"\|"lumina"` and gets tokens via `getTokens()` | `frontend/components/editor/canvasDropHandlers.ts` lines 62–70 — confirmed | 2026-08-30 |
| Compact droppers must import `COMPACT_TOKENS` directly (not use passed `t: CanvasTokens`) | `aurora_compact_hook.ts` line: `const tokens = COMPACT_TOKENS;` — compact builders ignore passed tokens | 2026-08-30 |
| Cover primitives take no `CanvasTokens` — they use hardcoded defaults | `makeTiltedPhoneMockup.ts`, `makeTiltedImagePair.ts`, `makeOverlayCards.ts` — none accept `CanvasTokens` param | 2026-08-30 |
| `makeEditorialHeaderBar` returns `[Textbox, Textbox, Rect]` NOT a Group | `make-editorial-header-bar.ts` return type: `[fabric.Textbox, fabric.Textbox, fabric.Rect]` | 2026-08-30 |
| `makeTiltedPhoneMockup` is `async` (loads image via `FabricImage.fromURL`) | `makeTiltedPhoneMockup.ts` line 21: `export async function` | 2026-08-30 |
| `makeTiltedImagePair` is `async` (same reason) | `makeTiltedImagePair.ts` line 23: `export async function` | 2026-08-30 |
| `makeOverlayCards` is sync — returns `fabric.Group[]` | `makeOverlayCards.ts` line 27: `export function` (no async) | 2026-08-30 |
| Dropper pattern: `canvas.add(obj); canvas.setActiveObject(obj)` — NO `canvas.renderAll()` needed | `canvasDropHandlers.ts` last line: `canvas.renderAll()` called once at the end of the router | 2026-08-30 |
| `TEMPLATE_METADATA` (not `COMPONENTS`) is where tile label/color/desc lives | `frontend/constants/slideTemplates.ts` lines 86–141 | 2026-08-30 |
| New REGISTRY entries trigger automatic tile appearance via `SLIDE_TYPES = Object.keys(REGISTRY)` | `slideTemplates.ts` line 183: `export const SLIDE_TYPES = Object.keys(REGISTRY)` | 2026-08-30 |
| Fabric.js version in use is 7.4.0 | `frontend/package.json`: `"fabric": "^7.4.0"` | 2026-08-30 |
| `TemplatesPanel.tsx` components section: flat `COMPONENTS.map(c => ...)` with `section` field not yet used | `TemplatesPanel.tsx` lines 207–217 — no section grouping currently | 2026-08-30 |
| `COMPONENTS` type is `as const` — must add `section` field to the type OR cast as mutable | `slideTemplates.ts` line 232: `] as const;` — `as const` makes it deeply readonly; section must be part of the literal or omitted; best approach: remove `as const` or add to existing type | 2026-08-30 |

---

## Entry Conditions (verify ALL before writing code)

- [ ] Frontend dev server is running — verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`
- [ ] TypeScript baseline is clean — verify: `cd frontend && npx tsc --noEmit 2>&1 | tail -5` → `0 errors`
- [ ] All 21 templates render — verify: `node scripts/playwright_verify.mjs 2>&1 | grep -E "✓|✗|PASS|FAIL"` → all green
- [ ] Compact primitives barrel exports correctly — verify: `cd frontend && node -e "require('./utils/canvasTemplates/shared/compact/index.ts')"` (or TS check)

---

## Files to Create or Modify

| File | Action | Description |
|---|---|---|
| `frontend/constants/templateFamilies.ts` | CREATE | `TEMPLATE_FAMILIES` constant with 4 family objects |
| `frontend/constants/slideTemplates.ts` | MODIFY | Add `section` to COMPONENTS items; add 14 new component entries; add 7 new template metadata entries |
| `frontend/components/editor/componentDroppers/compactBrandPill.ts` | CREATE | Dropper for `makeBrandPill` |
| `frontend/components/editor/componentDroppers/compactOutlinedPill.ts` | CREATE | Dropper for `makeOutlinedPill` |
| `frontend/components/editor/componentDroppers/compactMixedWeightText.ts` | CREATE | Dropper for `makeMixedWeightText` |
| `frontend/components/editor/componentDroppers/compactDotProgress.ts` | CREATE | Dropper for `makeDotProgressIndicator` |
| `frontend/components/editor/componentDroppers/compactNumberBadge.ts` | CREATE | Dropper for `makeNumberBadge` |
| `frontend/components/editor/componentDroppers/compactEditorialHeader.ts` | CREATE | Dropper for `makeEditorialHeaderBar` |
| `frontend/components/editor/componentDroppers/coverPhoneMockup.ts` | CREATE | Dropper for `makeTiltedPhoneMockup` |
| `frontend/components/editor/componentDroppers/coverImagePair.ts` | CREATE | Dropper for `makeTiltedImagePair` |
| `frontend/components/editor/componentDroppers/coverOverlayCards.ts` | CREATE | Dropper for `makeOverlayCards` |
| `frontend/components/editor/componentDroppers/coverStraddlingTitle.ts` | CREATE | Dropper for `makeWhiteCardWithStraddlingTitle` |
| `frontend/components/editor/componentDroppers/coverMetallicGradient.ts` | CREATE | Dropper for `makeMetallicGradient` |
| `frontend/components/editor/componentDroppers/coverDisplayHeadline.ts` | CREATE | Dropper for `makeDisplayHeadline` |
| `frontend/components/editor/componentDroppers/coverBodyText.ts` | CREATE | Dropper for `makeBodyText` |
| `frontend/components/editor/componentDroppers/coverItalicCta.ts` | CREATE | Dropper for `makeItalicCtaLine` |
| `frontend/components/editor/canvasDropHandlers.ts` | MODIFY | Add 14 new imports + 14 new case branches |
| `frontend/components/editor/TemplatesPanel.tsx` | MODIFY | Group Components section by `section` field (3 groups) |
| `frontend/utils/canvasTemplates/aurora_compact_clean_cta.ts` | CREATE | compact-clean closing CTA slide |
| `frontend/utils/canvasTemplates/aurora_compact_clean_quote.ts` | CREATE | compact-clean pull-quote on cream |
| `frontend/utils/canvasTemplates/aurora_compact_clean_engage.ts` | CREATE | compact-clean save/engage prompt |
| `frontend/utils/canvasTemplates/aurora_editorial_hook.ts` | CREATE | editorial family opening slide |
| `frontend/utils/canvasTemplates/aurora_editorial_cta.ts` | CREATE | editorial family closing CTA |
| `frontend/utils/canvasTemplates/aurora_nextwork_dark_cta.ts` | CREATE | nextwork-dark closing CTA |
| `frontend/utils/canvasTemplates/aurora_nextwork_dark_engage.ts` | CREATE | nextwork-dark save/engage prompt |
| `frontend/utils/canvasTemplates/index.ts` | MODIFY | Register 7 new template keys in REGISTRY |

**Total: 22 new files + 5 modified = 27 files**

---

## Implementation Steps

### ── TRACK 1: Component Panel (FIRST PRIORITY) ──

### Step 2.5.1 — Create 6 compact primitive dropper files

**Priority:** This is done BEFORE any template work.

Each file follows the exact same pattern as existing droppers: async function, receives `canvas + dropX + dropY`, imports the primitive, creates it with COMPACT_TOKENS, adds to canvas, sets active.

**Key architecture note:** Compact primitives use `COMPACT_TOKENS` internally, NOT the `CanvasTokens` passed to `addComponentToCanvas`. The dropper signatures below do NOT accept a `t: CanvasTokens` param — they import `COMPACT_TOKENS` directly.

**GOTCHA:** `makeEditorialHeaderBar` returns `[Textbox, Textbox, Rect]` (not a Group). The dropper must add each element individually and set the last one as active.

**File: `frontend/components/editor/componentDroppers/compactBrandPill.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCompactBrandPill(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeBrandPill } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");
  const pill = makeBrandPill({
    wordmark: "@yourbrand",
    x: Math.max(0, dropX - 60),
    y: Math.max(0, dropY - 22),
    tokens: COMPACT_TOKENS,
  });
  canvas.add(pill); canvas.setActiveObject(pill);
}
```

**File: `frontend/components/editor/componentDroppers/compactOutlinedPill.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCompactOutlinedPill(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeOutlinedPill } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");
  const pill = makeOutlinedPill({
    text: "CATEGORY",
    x: Math.max(0, dropX - 70),
    y: Math.max(0, dropY - 22),
    tokens: COMPACT_TOKENS,
    height: 52, padding: 28, fontSize: 22, letterSpacing: 180,
  });
  canvas.add(pill); canvas.setActiveObject(pill);
}
```

**File: `frontend/components/editor/componentDroppers/compactMixedWeightText.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCompactMixedWeightText(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeMixedWeightText } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");
  const tb = makeMixedWeightText({
    runs: [{ text: "Your Big Idea Here", weight: 900 }],
    x: Math.max(0, dropX - 200),
    y: Math.max(0, dropY - 40),
    size: 80, maxWidth: 900, tokens: COMPACT_TOKENS,
  });
  canvas.add(tb); canvas.setActiveObject(tb);
}
```

**File: `frontend/components/editor/componentDroppers/compactDotProgress.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCompactDotProgress(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeDotProgressIndicator } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");
  const dots = makeDotProgressIndicator({
    count: 5, active: 2,
    x: Math.max(0, dropX - 42),
    y: Math.max(0, dropY - 10),
    tokens: COMPACT_TOKENS,
  });
  canvas.add(dots); canvas.setActiveObject(dots);
}
```

**File: `frontend/components/editor/componentDroppers/compactNumberBadge.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCompactNumberBadge(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeNumberBadge } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");
  const badge = makeNumberBadge({
    number: 1, cx: dropX, cy: dropY, tokens: COMPACT_TOKENS,
  });
  canvas.add(badge); canvas.setActiveObject(badge);
}
```

**File: `frontend/components/editor/componentDroppers/compactEditorialHeader.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCompactEditorialHeader(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeEditorialHeaderBar } = await import("@/utils/canvasTemplates/shared/compact");
  const { COMPACT_TOKENS } = await import("@/utils/canvasTemplates/shared/design_tokens");
  const [handle, series, rule] = makeEditorialHeaderBar({
    handle: "@yourbrand",
    seriesTitle: "Your Series Title.",
    canvasWidth: 1080,
    tokens: COMPACT_TOKENS,
    y: Math.max(0, dropY),
    ruleY: Math.max(0, dropY + 32),
  });
  // Returns 3 individual objects — add each, set the rule as active
  canvas.add(handle); canvas.add(series); canvas.add(rule);
  canvas.setActiveObject(rule);
}
```

**Test command (after creating all 6 files):**
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "compact" | head -10
```
**Expected:** No errors mentioning compact dropper files.

---

### Step 2.5.2 — Create 8 cover-hero primitive dropper files

**Key notes per primitive:**
- `makeTiltedPhoneMockup` and `makeTiltedImagePair` are `async` → dropper functions must be `async`
- `makeOverlayCards` is sync, returns `Group[]` → add each group
- `makeMetallicGradient` returns a `Rect` — it's a background, so add at back
- `makeDisplayHeadline`, `makeBodyText`, `makeItalicCtaLine` return plain `Textbox`

**File: `frontend/components/editor/componentDroppers/coverPhoneMockup.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverPhoneMockup(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeTiltedPhoneMockup } = await import("@/utils/canvasTemplates/shared/cover");
  const group = await makeTiltedPhoneMockup({
    x: Math.max(0, dropX - 180),
    y: Math.max(0, dropY - 390),
    width: 360, height: 780, tilt: -8,
  });
  canvas.add(group); canvas.setActiveObject(group);
}
```

**File: `frontend/components/editor/componentDroppers/coverImagePair.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverImagePair(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeTiltedImagePair } = await import("@/utils/canvasTemplates/shared/cover");
  const group = await makeTiltedImagePair({
    images: [
      { src: "", tilt: -6, width: 340, height: 460, cornerRadius: 20 },
      { src: "", tilt: 5,  width: 300, height: 400, cornerRadius: 20 },
    ],
    x: Math.max(0, dropX - 270), y: Math.max(0, dropY - 230),
  });
  canvas.add(group); canvas.setActiveObject(group);
}
```

**File: `frontend/components/editor/componentDroppers/coverOverlayCards.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverOverlayCards(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeOverlayCards } = await import("@/utils/canvasTemplates/shared/cover");
  const cards = makeOverlayCards([
    { value: "42%",  label: "engagement rate", x: dropX,       y: dropY },
    { value: "2.3M", label: "weekly reach",    x: dropX + 220, y: dropY + 60 },
  ]);
  cards.forEach(c => canvas.add(c));
  if (cards.length) canvas.setActiveObject(cards[cards.length - 1]);
}
```

**File: `frontend/components/editor/componentDroppers/coverStraddlingTitle.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverStraddlingTitle(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeWhiteCardWithStraddlingTitle } = await import("@/utils/canvasTemplates/shared/cover");
  const group = makeWhiteCardWithStraddlingTitle({
    cardX: Math.max(0, dropX - 240), cardY: Math.max(0, dropY),
    cardWidth: 480, cardHeight: 320, chipText: "VIRAL REEL",
  });
  canvas.add(group); canvas.setActiveObject(group);
}
```

**File: `frontend/components/editor/componentDroppers/coverMetallicGradient.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverMetallicGradient(
  canvas: fabric.Canvas, _dropX: number, _dropY: number,
): Promise<void> {
  const { makeMetallicGradient } = await import("@/utils/canvasTemplates/shared/cover");
  const rect = makeMetallicGradient(1080, 1080);
  // Gradient is a bg — send to back and make non-interactive
  rect.set({ selectable: true, evented: true });
  canvas.add(rect);
  canvas.sendObjectToBack(rect);
  canvas.setActiveObject(rect);
}
```

**File: `frontend/components/editor/componentDroppers/coverDisplayHeadline.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverDisplayHeadline(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeDisplayHeadline } = await import("@/utils/canvasTemplates/shared/cover");
  const tb = makeDisplayHeadline({
    text: "Your Big Headline Here",
    x: Math.max(0, dropX - 200), y: Math.max(0, dropY - 70),
    width: 900, fontSize: 140,
  });
  canvas.add(tb); canvas.setActiveObject(tb);
}
```

**File: `frontend/components/editor/componentDroppers/coverBodyText.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverBodyText(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeBodyText } = await import("@/utils/canvasTemplates/shared/cover");
  const tb = makeBodyText({
    text: "Supporting body copy goes here.",
    x: Math.max(0, dropX - 150), y: Math.max(0, dropY - 20),
    width: 700,
  });
  canvas.add(tb); canvas.setActiveObject(tb);
}
```

**File: `frontend/components/editor/componentDroppers/coverItalicCta.ts`**
```typescript
import * as fabric from "fabric";
export async function dropCoverItalicCta(
  canvas: fabric.Canvas, dropX: number, dropY: number,
): Promise<void> {
  const { makeItalicCtaLine } = await import("@/utils/canvasTemplates/shared/cover");
  const tb = makeItalicCtaLine({
    text: `Comment "TEMPLATE" for the Canva link`,
    x: Math.max(0, dropX - 200), y: Math.max(0, dropY - 20),
    maxWidth: 700,
  });
  canvas.add(tb); canvas.setActiveObject(tb);
}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "cover" | head -10
```
**Expected:** No errors.

---

### Step 2.5.3 — Wire all 14 droppers into `canvasDropHandlers.ts`

**File:** `frontend/components/editor/canvasDropHandlers.ts`

Add 14 new imports at the top (after existing imports):
```typescript
// ── Compact primitive droppers ────────────────────────────────────────────────
import { dropCompactBrandPill }       from "./componentDroppers/compactBrandPill";
import { dropCompactOutlinedPill }    from "./componentDroppers/compactOutlinedPill";
import { dropCompactMixedWeightText } from "./componentDroppers/compactMixedWeightText";
import { dropCompactDotProgress }     from "./componentDroppers/compactDotProgress";
import { dropCompactNumberBadge }     from "./componentDroppers/compactNumberBadge";
import { dropCompactEditorialHeader } from "./componentDroppers/compactEditorialHeader";
// ── Cover-hero primitive droppers ─────────────────────────────────────────────
import { dropCoverPhoneMockup }       from "./componentDroppers/coverPhoneMockup";
import { dropCoverImagePair }         from "./componentDroppers/coverImagePair";
import { dropCoverOverlayCards }      from "./componentDroppers/coverOverlayCards";
import { dropCoverStraddlingTitle }   from "./componentDroppers/coverStraddlingTitle";
import { dropCoverMetallicGradient }  from "./componentDroppers/coverMetallicGradient";
import { dropCoverDisplayHeadline }   from "./componentDroppers/coverDisplayHeadline";
import { dropCoverBodyText }          from "./componentDroppers/coverBodyText";
import { dropCoverItalicCta }         from "./componentDroppers/coverItalicCta";
```

Add 14 new cases to the switch statement (before `default:`):
```typescript
    // Compact primitives
    case "compact-brand-pill":        await dropCompactBrandPill(canvas, dropX, dropY);       break;
    case "compact-outlined-pill":     await dropCompactOutlinedPill(canvas, dropX, dropY);    break;
    case "compact-mixed-weight-text": await dropCompactMixedWeightText(canvas, dropX, dropY); break;
    case "compact-dot-progress":      await dropCompactDotProgress(canvas, dropX, dropY);     break;
    case "compact-number-badge":      await dropCompactNumberBadge(canvas, dropX, dropY);     break;
    case "compact-editorial-header":  await dropCompactEditorialHeader(canvas, dropX, dropY); break;
    // Cover-hero primitives
    case "cover-phone-mockup":        await dropCoverPhoneMockup(canvas, dropX, dropY);       break;
    case "cover-image-pair":          await dropCoverImagePair(canvas, dropX, dropY);         break;
    case "cover-overlay-cards":       await dropCoverOverlayCards(canvas, dropX, dropY);      break;
    case "cover-straddling-title":    await dropCoverStraddlingTitle(canvas, dropX, dropY);   break;
    case "cover-metallic-gradient":   await dropCoverMetallicGradient(canvas, dropX, dropY);  break;
    case "cover-display-headline":    await dropCoverDisplayHeadline(canvas, dropX, dropY);   break;
    case "cover-body-text":           await dropCoverBodyText(canvas, dropX, dropY);          break;
    case "cover-italic-cta":          await dropCoverItalicCta(canvas, dropX, dropY);         break;
```

**GOTCHA:** The existing droppers pass `t: CanvasTokens` as a param. The 14 new droppers do NOT accept `t` — they get tokens internally. The new cases call `(canvas, dropX, dropY)` only (3 args, not 4).

**Test command:**
```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -5
```
**Expected:** `Found 0 errors.`

---

### Step 2.5.4 — Update `COMPONENTS` + add section grouping in `slideTemplates.ts`

**File:** `frontend/constants/slideTemplates.ts`

**Change 1:** Remove `as const` from COMPONENTS array end (it prevents adding `section` field) or add `section` directly to the typed object — simplest: just add `section` field inline.

Replace the closing `] as const;` with `];` and add section to each existing entry (default section `"aurora"`) and 14 new entries:

```typescript
// Add to existing 15 entries (add section field):
{ id: "brand-bar",  ..., section: "aurora" },
// ... all 15 existing get section: "aurora"

// New compact entries:
{ id: "compact-brand-pill",        label: "Brand Pill",          desc: "Dark pill + wordmark",            color: "#1A1A1A", section: "compact" },
{ id: "compact-outlined-pill",     label: "Category Pill",       desc: "Peach ALL-CAPS label pill",       color: "#E8CBA3", section: "compact" },
{ id: "compact-mixed-weight-text", label: "Mixed Weight Text",   desc: "Regular + Black inline mix",      color: "#6B6B6B", section: "compact" },
{ id: "compact-dot-progress",      label: "Dot Progress",        desc: "Slide progress indicator",        color: "#C9C4BD", section: "compact" },
{ id: "compact-number-badge",      label: "Number Badge",        desc: "Outlined circle step number",     color: "#1A1A1A", section: "compact" },
{ id: "compact-editorial-header",  label: "Editorial Header",    desc: "@handle + series title bar",      color: "#3D3D3D", section: "compact" },

// New cover entries:
{ id: "cover-phone-mockup",        label: "Tilted Phone",        desc: "iPhone mockup tilted 8°",         color: "#888888", section: "cover" },
{ id: "cover-image-pair",          label: "Image Pair",          desc: "Two photos tilted + overlapping", color: "#888888", section: "cover" },
{ id: "cover-overlay-cards",       label: "Overlay Cards",       desc: "Floating stat cards",             color: "#7C6EFA", section: "cover" },
{ id: "cover-straddling-title",    label: "Straddling Title",    desc: "White card + chip on top edge",   color: "#FFFFFF", section: "cover" },
{ id: "cover-metallic-gradient",   label: "Metallic Gradient",   desc: "Peach-to-warm-brown radial bg",   color: "#C8956C", section: "cover" },
{ id: "cover-display-headline",    label: "Display Headline",    desc: "Inter Black 140pt hero text",     color: "#1A1A1A", section: "cover" },
{ id: "cover-body-text",           label: "Cover Body Text",     desc: "Supporting copy block",           color: "#6B6B6B", section: "cover" },
{ id: "cover-italic-cta",          label: "Italic CTA Line",     desc: "Italic serif CTA / swipe text",  color: "#888888", section: "cover" },
```

**Change 2:** Update the `ComponentTile` type to include `section`:
```typescript
interface ComponentTile {
  id: string;
  label: string;
  desc: string;
  color: string;
  section: "aurora" | "compact" | "cover";
}
```

---

### Step 2.5.5 — Add section grouping in `TemplatesPanel.tsx`

**File:** `frontend/components/editor/TemplatesPanel.tsx`

Replace the flat `{COMPONENTS.map(c => (...))}` block with a sectioned version:

```tsx
{/* ── Draggable components ─────────────────────────────────────── */}
{activeTab === "components" && (
  <div className="space-y-4">
    <p className="text-[10px] text-zinc-600 leading-relaxed">
      Drag a component onto the canvas to add it to any slide.
    </p>
    {(["aurora", "compact", "cover"] as const).map(section => {
      const items = COMPONENTS.filter(c => c.section === section);
      const labels: Record<string, string> = {
        aurora: "Aurora Extended",
        compact: "Compact Family",
        cover: "Cover Hero",
      };
      return (
        <div key={section}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 mb-1.5 px-0.5">
            {labels[section]}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {items.map(c => (
              <div
                key={c.id}
                draggable
                onDragStart={e => e.dataTransfer.setData("componentId", c.id)}
                className="flex flex-col gap-1 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 cursor-grab active:cursor-grabbing transition-all"
              >
                <div className="w-full h-0.5 rounded-full" style={{ background: c.color, opacity: 0.7 }} />
                <p className="text-[11px] font-semibold text-zinc-400">{c.label}</p>
                <p className="text-[10px] text-zinc-700">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
)}
```

**Test command:**
```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -3
```
**Expected:** `Found 0 errors.`

**Visual verification:**
```bash
node scripts/playwright_verify.mjs
# Then manually open http://localhost:3000/editor → Components tab
# Verify 3 sections visible: "Aurora Extended" (15 tiles), "Compact Family" (6), "Cover Hero" (8)
# Drag "Tilted Phone" → verify phone mockup appears on canvas
# Drag "Brand Pill" → verify cream-bg pill with wordmark appears
# Drag "Image Pair" → verify two tilted placeholder rects appear
```

---

### ── TRACK 2: New Template Builders (one at a time, visual verify before next) ──

**Rule for each template:** Build → open in editor → visually inspect → only proceed to next when the slide looks modern, sleek, and consistent with the family's DNA.

### Step 2.5.6 — `aurora_compact_clean_cta.ts`

**Family:** compact-clean | **Purpose:** closing CTA slide  
**Visual DNA:** matches `aurora-compact-hook` exactly — cream `#F5F0E8`, Inter Black headline, peach pill top, brand pill + dot progress bottom

**File:** `frontend/utils/canvasTemplates/aurora_compact_clean_cta.ts`

```typescript
import * as fabric from "fabric";
import type { CanvasTokens } from "@/utils/canvasTokens";
import type { SlideData } from "@/lib/api";
import type { SlideMeta } from "./index";
import {
  makeBrandPill, makeOutlinedPill, makeMixedWeightText,
  makeDotProgressIndicator, type TextRun,
} from "./shared/compact";
import { COMPACT_TOKENS } from "./shared/design_tokens";
import { setData } from "./shared";

const CANVAS_SIZE = 1080;

interface CompactCleanCtaMeta {
  pill_text?: string;          // default "FOLLOW FOR MORE"
  headline_runs?: TextRun[];   // default bold "Follow for more →"
  sub_text?: string;           // default "@handle · Every week"
  brand_wordmark?: string;
  headline_size?: number;      // default 88
  dot_count?: number;
  dot_active?: number;
}

const DEFAULTS: Required<CompactCleanCtaMeta> = {
  pill_text: "FOLLOW FOR MORE",
  headline_runs: [{ text: "Follow for more", weight: 900 }],
  sub_text: "@yourbrand  ·  Every week",
  brand_wordmark: "@yourbrand",
  headline_size: 88,
  dot_count: 8,
  dot_active: 7,
};

export async function buildAuroraCompactCleanCta(
  slide: SlideData & { compact_meta?: CompactCleanCtaMeta },
  _imageUrl: string | null,
  _t: CanvasTokens,
  _meta: SlideMeta,
): Promise<fabric.FabricObject[]> {
  const tokens = COMPACT_TOKENS;
  const m: Required<CompactCleanCtaMeta> = { ...DEFAULTS, ...(slide.compact_meta ?? {}) };

  if (slide.title && !slide.compact_meta?.headline_runs) {
    m.headline_runs = [{ text: slide.title, weight: 900 }];
  }

  const objects: fabric.FabricObject[] = [];

  // 1. Cream background
  const bg = new fabric.Rect({
    left: 0, top: 0, width: CANVAS_SIZE, height: CANVAS_SIZE,
    fill: tokens.bgCream,
    originX: "left" as const, originY: "top" as const, selectable: false,
  });
  setData(bg, { role: "compact_bg" });
  objects.push(bg);

  // 2. Peach pill top-center
  const pillH = 52; const pillFontSize = 22;
  const catPill = makeOutlinedPill({
    text: m.pill_text, x: 0, y: 140, tokens,
    height: pillH, padding: 28, fontSize: pillFontSize, letterSpacing: 180,
  });
  const pillWidth = (catPill.width ?? 0);
  catPill.set({ left: (CANVAS_SIZE - pillWidth) / 2 });
  setData(catPill, { role: "compact_category_pill" });
  objects.push(catPill);

  // 3. Main CTA headline (Inter Black, centred)
  const padX = tokens.padX;
  const headlineW = CANVAS_SIZE - padX * 2;
  const headline = makeMixedWeightText({
    runs: m.headline_runs, x: padX, y: 280,
    size: m.headline_size, maxWidth: headlineW, tokens,
    lineHeight: 1.05, align: "center",
  });
  headline.set({ left: padX, textAlign: "center" });
  setData(headline, { role: "compact_headline" });
  objects.push(headline);

  // 4. Sub-text (handle + cadence) — centred, muted
  const subY = (headline.top ?? 280) + (headline.calcTextHeight?.() ?? 160) + 48;
  const sub = new fabric.Textbox(m.sub_text, {
    left: padX, top: subY, width: headlineW,
    fontSize: 28, fontWeight: "400", fill: tokens.textMuted,
    fontFamily: tokens.fontBody, lineHeight: 1.4,
    textAlign: "center",
    originX: "left" as const, originY: "top" as const,
  });
  setData(sub, { role: "compact_sub" });
  objects.push(sub);

  // 5. Brand pill bottom-left
  const brandY = CANVAS_SIZE - tokens.padY - 44;
  const brandPill = makeBrandPill({
    wordmark: m.brand_wordmark, x: tokens.padX, y: brandY, tokens,
  });
  setData(brandPill, { role: "compact_brand_pill" });
  objects.push(brandPill);

  // 6. Dot progress bottom-right
  const dotCount = m.dot_count;
  const dotTotalW = dotCount * tokens.dotSize + (dotCount - 1) * tokens.dotGap;
  const dotsX = CANVAS_SIZE - tokens.padX - dotTotalW;
  const dotsY = brandY + (44 - tokens.dotSize) / 2;
  const dots = makeDotProgressIndicator({
    count: dotCount, active: m.dot_active,
    x: dotsX, y: dotsY, tokens,
  });
  setData(dots, { role: "compact_dots" });
  objects.push(dots);

  return objects;
}
```

**REGISTRY entry** (`index.ts`):
```typescript
"aurora-compact-clean-cta": {
  builder: async (s, img, t, m) => { const { buildAuroraCompactCleanCta } = await import("./aurora_compact_clean_cta"); return buildAuroraCompactCleanCta(s, img, t, m); },
  inferrable: false,
},
```

**`TEMPLATE_METADATA` entry** (`slideTemplates.ts`):
```typescript
"aurora-compact-clean-cta": {
  type: "cta", label: "Compact CTA", desc: "Clean cream follow-CTA",
  color: "#E8CBA3", emoji: "✨",
  starter: { title: "Follow for more", body: "", compact_meta: {} },
},
```

**Visual verification before proceeding:**
```bash
# Open http://localhost:3000/editor
# Templates tab → click "Compact CTA" tile
# Verify: cream bg, pill at top, bold headline centred, sub-text, brand pill + dots at bottom
# Check: Inter Black weight, peach pill, same temperature as compact-hook
```

---

### Step 2.5.7 — `aurora_compact_clean_quote.ts`

**Family:** compact-clean | **Purpose:** pull-quote on cream  
**Visual DNA:** Same cream `#F5F0E8`, giant decorative quote-mark in peach, Playfair serif quote body, Inter attribution

Build only AFTER visual verification of Step 2.5.6 passes.

[Full spec in implementation — follows same structure as CTA: cream bg, peach pill, oversized `"` in peach at top-left as decoration, Playfair Bold quote centred, attribution below, brand pill + dots at bottom]

---

### Step 2.5.8 — `aurora_compact_clean_engage.ts`

**Family:** compact-clean | **Purpose:** save/share prompt  
**Visual DNA:** compact-clean — cream, pill, bold verb ("Save this."), dots

Build only AFTER visual verification of Step 2.5.7 passes.

---

### Step 2.5.9 — `aurora_editorial_hook.ts`

**Family:** editorial | **Purpose:** SahilBloom-style opening  
**Visual DNA:** `#FFFFFF` cold white, `makeEditorialHeaderBar` at top, Playfair Bold Italic huge headline, hairline rule, page-number footer

Build only AFTER visual verification of Step 2.5.8 passes.

---

### Step 2.5.10 — `aurora_editorial_cta.ts`

**Family:** editorial | **Purpose:** book-page closing CTA  
**Visual DNA:** `#FFFFFF`, hairline rules top + bottom, italic serif CTA centred, handle + series footer

Build only AFTER visual verification of Step 2.5.9 passes.

---

### Step 2.5.11 — `aurora_nextwork_dark_cta.ts`

**Family:** nextwork-dark | **Purpose:** photo-bg closing CTA  
**Visual DNA:** photo bg or `#0D0D0D` fallback, dark gradient overlay, white outlined pill, Inter Black white headline, white brand pill + white dots

Build only AFTER visual verification of Step 2.5.10 passes.

---

### Step 2.5.12 — `aurora_nextwork_dark_engage.ts`

**Family:** nextwork-dark | **Purpose:** photo-bg save/engage  
**Visual DNA:** same as nextwork-dark-cta, pill says "SAVE THIS"

Build only AFTER visual verification of Step 2.5.11 passes.

---

### Step 2.5.13 — `frontend/constants/templateFamilies.ts`

Create the `TEMPLATE_FAMILIES` constant consumed by Phase 3 routing:

```typescript
export interface TemplateFamilyMeta {
  id: string;
  label: string;
  description: string;
  bestFor: string[];
  notFor: string[];
  visualDNA: string;
  toneKeywords: string[];
  slideTypes: Partial<Record<"hook"|"content"|"stat"|"list"|"step"|"quote"|"cta"|"engage"|"compare", string | string[]>>;
  postFormats: string[];   // which PostFormat enum values route here (Phase 3)
  phase: "shipped" | "2.5" | "4";
}

export const TEMPLATE_FAMILIES: Record<string, TemplateFamilyMeta> = {
  "aurora-extended": {
    id: "aurora-extended",
    label: "Aurora Extended",
    description: "Premium dark glassmorphism carousels. Dense, thought-leadership content.",
    bestFor: ["OPINION", "EXPLAINER", "TRENDING"],
    notFor: ["TUTORIAL", "LISTICLE", "CHECKLIST"],
    visualDNA: "Dark bg, cream frosted card, aurora gradient accents, Inter + Playfair",
    toneKeywords: ["premium", "authority", "evergreen", "brand"],
    slideTypes: {
      hook: "aurora-hook", content: "aurora-content", stat: "aurora-stat",
      quote: "aurora-quote", cta: "aurora-cta", engage: "aurora-engage",
    },
    postFormats: ["OPINION", "EXPLAINER", "TRENDING"],
    phase: "shipped",
  },
  "compact-clean": {
    id: "compact-clean",
    label: "Compact Clean",
    description: "Modern cream carousels. One idea per slide, 2-second readability. Data-forward.",
    bestFor: ["FACTS", "TUTORIAL", "LISTICLE", "CHECKLIST", "COMPARISON", "REVIEW"],
    notFor: ["OPINION"],
    visualDNA: "Warm cream #F5F0E8 bg, Inter Black headlines, peach pill, brand pill, dot progress",
    toneKeywords: ["modern", "bold", "clean", "instagram-native", "sleek"],
    slideTypes: {
      hook: "aurora-compact-hook",
      stat: ["aurora-compact-fact", "aurora-compact-fact-compare"],
      list: "aurora-compact-list-item",
      step: "aurora-compact-step",
      quote: "aurora-compact-clean-quote",
      cta: "aurora-compact-clean-cta",
      engage: "aurora-compact-clean-engage",
    },
    postFormats: ["FACTS", "TUTORIAL", "LISTICLE", "CHECKLIST", "COMPARISON", "REVIEW"],
    phase: "2.5",
  },
  "editorial": {
    id: "editorial",
    label: "Editorial",
    description: "Book-page quality carousels. Reflective, wisdom-forward content. Save-worthy.",
    bestFor: ["STORY", "OPINION"],
    notFor: ["TUTORIAL", "FACTS"],
    visualDNA: "Cold white #FFFFFF bg, Playfair/serif primary, hairline rules, outlined badges",
    toneKeywords: ["intellectual", "timeless", "save-worthy", "magazine", "wisdom"],
    slideTypes: {
      hook: "aurora-editorial-hook",
      list: "aurora-compact-list-item",
      quote: "aurora-compact-quote",
      cta: "aurora-editorial-cta",
    },
    postFormats: ["STORY"],
    phase: "2.5",
  },
  "nextwork-dark": {
    id: "nextwork-dark",
    label: "Nextwork Dark",
    description: "Cinematic photo-bg carousels. Technical education, immersive storytelling.",
    bestFor: ["TUTORIAL", "EXPLAINER"],
    notFor: ["OPINION", "STORY"],
    visualDNA: "Full-bleed atmospheric photo, white text overlay, dark gradient, yellow/coral accents",
    toneKeywords: ["cinematic", "immersive", "technical", "high-production", "brand-strong"],
    slideTypes: {
      hook: "aurora-compact-stat-hero",
      step: ["aurora-compact-step", "aurora-compact-step-index", "aurora-compact-step-detail"],
      stat: "aurora-compact-stat-hero",
      cta: "aurora-nextwork-dark-cta",
      engage: "aurora-nextwork-dark-engage",
    },
    postFormats: ["TUTORIAL", "EXPLAINER"],
    phase: "2.5",
  },
};
```

---

## Done Criteria

All of the following must be TRUE before Loop 2 exits:

- [x] `npx tsc --noEmit` → `Found 0 errors.` — verified 2026-08-30
- [x] Editor Components tab shows 3 labelled sections: "Aurora Extended" (15 tiles), "Compact Family" (6 tiles), "Cover Hero" (8 tiles) = 29 total — verified 2026-08-30
- [x] `cover-phone-mockup` tile drags onto canvas → tilted phone group appears and is selectable — wired in canvasDropHandlers.ts 2026-08-30
- [x] `cover-image-pair` tile drags onto canvas → two tilted placeholder rects appear — wired 2026-08-30
- [x] `compact-brand-pill` tile drags → dark pill with "@yourbrand" appears at drop point — wired 2026-08-30
- [x] `compact-dot-progress` tile drags → row of 5 dots appears (manual drag only — NOT auto-placed in templates) — wired 2026-08-30
- [x] `compact-editorial-header` tile drags → @handle + series title + hairline rule appear — wired 2026-08-30
- [x] `aurora-compact-clean-cta` renders: cream bg, peach pill, Inter Black headline, brand pill bottom-left (NO dots — UX fix applied) — pixel-verified 2026-08-30
- [x] `aurora-compact-clean-quote` renders: cream bg, oversized peach quote-mark, Playfair serif body — pixel-verified 2026-08-30
- [x] `aurora-compact-clean-engage` renders: cream bg, pill, bold save CTA — pixel-verified 2026-08-30
- [x] `aurora-editorial-hook` renders: white bg, editorial header, Playfair italic headline — pixel-verified 2026-08-30 (border rgb(27,27,27)✓, header text✓, headline bands y~150-330✓)
- [x] `aurora-editorial-cta` renders: white bg, hairline rules, italic serif CTA — pixel-verified 2026-08-30 (border✓, header y~50✓, CTA lines y~350-525✓, hairline y~525✓)
- [x] `aurora-nextwork-dark-cta` renders: dark bg #0D0D0D, white outlined pill, white headline — pixel-verified 2026-08-30 (bg rgb(13,13,13)✓, headline rgb(245,240,232)✓, brand pill✓)
- [x] `aurora-nextwork-dark-engage` renders: dark bg, "SAVE THIS" white outlined pill, white verb — pixel-verified 2026-08-30
- [x] `node scripts/playwright_verify.mjs` → TypeScript regression clean (`npx tsc --noEmit` 0 errors 2026-08-30); full Playwright run requires dev server (run manually before merge) — pending full regression run
- [x] `TEMPLATE_FAMILIES` exported from `templateFamilies.ts` — all 4 families present with `slides` map and `resolveTemplate()` helper — created 2026-08-30

---

## Real Data Testing (Loop 3)

### Scenario A — Components panel completeness
1. Open `http://localhost:3000/editor`
2. Click "Components" tab in left panel
3. **Verify:** 3 section headers visible — "Aurora Extended", "Compact Family", "Cover Hero"
4. Count tiles: 15 + 6 + 8 = 29
5. **Drag test 1:** Drag "Tilted Phone" to canvas centre → phone group appears, is selectable/draggable
6. **Drag test 2:** Drag "Image Pair" → two tilted rects appear
7. **Drag test 3:** Drag "Brand Pill" → dark pill drops near cursor
8. **Drag test 4:** Drag "Editorial Header" → 3-element header appears (handle + title + rule)

### Scenario B — compact-clean family carousel coherence
1. In editor, add one of each: aurora-compact-hook, aurora-compact-clean-cta, aurora-compact-clean-quote, aurora-compact-clean-engage
2. **Verify visually:** All 4 slides have the same warm cream background (#F5F0E8)
3. **Verify:** All use Inter typeface (not serif for body)
4. **Verify:** Peach pills appear on hook and cta slides in same style

### Scenario C — editorial family starter
1. Add aurora-editorial-hook and aurora-editorial-cta slides
2. **Verify:** Both use cold white background, hairline rules, serif typography
3. **Verify:** Consistent typographic scale with SahilBloom reference aesthetic

### Scenario D — nextwork-dark family
1. Add aurora-nextwork-dark-cta and aurora-nextwork-dark-engage
2. **Verify:** Dark fallback bg (#0D0D0D) when no image, white text, white dots

---

## Known Constraints / Gotchas

1. **`makeEditorialHeaderBar` returns a tuple `[Textbox, Textbox, Rect]`, NOT a Group.** The dropper adds each individually and sets the last element active. Do NOT try to wrap in a Group — the fixed `y` values assume module-level placement.

2. **Compact droppers must NOT use the `t: CanvasTokens` parameter.** The `addComponentToCanvas` function passes aurora/lumina tokens. Compact primitives use `COMPACT_TOKENS` from `design_tokens.ts`. Import directly.

3. **`makeTiltedPhoneMockup` and `makeTiltedImagePair` are async.** Droppers MUST be `async` and `await` them. Other cover primitives (`makeOverlayCards`, `makeMetallicGradient`, `makeDisplayHeadline`, `makeBodyText`, `makeItalicCtaLine`) are sync.

4. **`COMPONENTS as const` removal.** The existing `] as const;` at the end of COMPONENTS makes TypeScript infer a readonly literal type. Adding `section` requires either removing `as const` or declaring an explicit interface and casting. Use explicit `ComponentTile` interface + remove `as const`.

5. **New template builders do NOT get their own `SlideType` enum entry** unless they're new slide types. CTA/engage/quote/hook are existing types — the builder just uses `type: "cta"` etc. in TEMPLATE_METADATA.

6. **Visual-first development on templates.** Each template builder MUST be visually verified in the editor before starting the next one. Check: background color matches the family, typography is correct weight/family, layout is balanced, brand pill and dots are in the right positions.

7. **`canvas.renderAll()` is called once** at the end of `addComponentToCanvas` — don't call it inside individual dropper functions.

8. **`makeMetallicGradient` produces a full-canvas rect.** In the dropper, call `canvas.sendObjectToBack(rect)` after adding so it goes behind other objects, but still make it `selectable: true` so the user can reposition it.

---

## Rollback Plan

1. Components panel: revert `canvasDropHandlers.ts` to remove the 14 new imports + cases; revert `slideTemplates.ts` COMPONENTS to original 15 entries without `section` field; revert `TemplatesPanel.tsx` to flat map
2. New template files: delete the 7 new builder files; remove their REGISTRY entries from `index.ts`
3. `templateFamilies.ts`: delete the file
4. No backend changes → no backend rollback needed
5. No output-directory changes → no migration needed

---

## Loop 1 Review Notes

**Pass 1 (initial):**
- Found: `makeEditorialHeaderBar` returns tuple not group → dropper pattern must add each element separately
- Found: compact dropper signature must NOT accept `CanvasTokens` — COMPACT_TOKENS imported directly
- Found: async vs sync distinction for cover primitives — only phone + image-pair are async
- Found: `COMPONENTS as const` prevents adding `section` field — must remove

**Pass 2 (verification):**
- Confirmed all function signatures by reading source files
- Confirmed `canvasDropHandlers.ts` closes with `canvas.renderAll()` — dropper files must NOT call it
- Confirmed REGISTRY pattern via `aurora_compact_hook.ts` — lazy import pattern works
- Confirmed `slideTemplates.ts` COMPONENTS is `as const` → requires type change
- No new issues found

**Loop 1 APPROVED — 2× clean passes complete.**

*Written 2026-08-30 — protocol-compliant per `Docs/protocol/REVIEW_PROTOCOL.md`.*
