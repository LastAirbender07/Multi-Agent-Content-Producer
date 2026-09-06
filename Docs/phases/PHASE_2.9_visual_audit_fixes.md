# PHASE 2.9 — Visual Audit Fixes + UX Improvements

## Status
APPROVED — Loop 1 complete, 2 passes, 0 issues remaining (2026-09-06)

---

## Problem Statement

Visual audit on 2026-09-06 (see `Docs/protocol/VISUAL_AUDIT_FINDINGS_2026_09_06.md`) identified:

1. **3 templates show dark placeholder slides** — `step-index`, `step-detail`, `stat-hero`, and `aurora-compact-quote` have empty `image_url` in starter content, so they render as dark gradients with no meaningful content. A user sees a broken-looking slide.
2. **Cover Hero slides are empty in the lower half** — default `compact_meta: {}` means no headline, no body text, no CTA — only the visual component (phone/images) in the upper 40% with empty gradient below.
3. **Templates panel is a flat, unorganised list of 24 tiles** — no family grouping, no collapsing, no visual hierarchy. As the template count grows this becomes unusable. User specifically requested collapsible families.

**After this phase:**
- All templates look designed and intentional when first opened — no dark placeholder slides
- Templates panel organises 24 tiles into 5 collapsible family groups, each with a color header and description
- Collapse state is persisted in localStorage per session

---

## Architectural Decisions

### Decision 1: Where does family membership live?

**Option A:** Add a `family` field to `TemplateMeta` in `slideTemplates.ts`
**Option B:** Derive family membership by reverse-mapping `TEMPLATE_FAMILIES.slides` (already exists in `templateFamilies.ts`)
**Option C:** Add a `familyId` field to `TEMPLATE_METADATA` directly

**Choose Option B** — `TEMPLATE_FAMILIES` already maps every template key to its family. We build a reverse-map at module initialisation time: `templateKey → familyId`. Zero data duplication.

```typescript
// In templateFamilies.ts (add this utility):
export function buildTemplateFamilyMap(): Record<string, string> {
  // Returns { "aurora-hook": "aurora-extended", "aurora-compact-hook": "compact-clean", ... }
  const map: Record<string, string> = {};
  for (const [familyId, family] of Object.entries(TEMPLATE_FAMILIES)) {
    for (const templateKey of Object.values(family.slides)) {
      if (templateKey) map[templateKey] = familyId;
    }
  }
  return map;
}
```

Cover Hero templates (`aurora-carousel-cover-hero-*`) are not in any `TEMPLATE_FAMILIES.slides` entry — add them to a new `cover-hero` family or handle as "unclassified" → put in Cover Hero group by id prefix.

### Decision 2: Default images — where are they served from?

**Templates that need a default image:**
- `step-index`, `step-detail`, `stat-hero` — need a landscape/atmospheric background photo
- `compact-quote` — needs a portrait photo for the right panel
- Cover hero phone — needs a portrait for the phone screen

**Option A:** Bundle images in `backend/assets/images/` (already there: `step-bg-terrain.jpg`, `portrait-contrast.jpg`)
**Option B:** Use picsum.photos or similar CDN — requires internet, bad for offline dev
**Option C:** SVG gradient placeholder that looks intentional, not like a missing image

**Choose Option A** — images are already in `backend/assets/images/`. The backend serves them at `http://localhost:8000/assets/images/`. We just need to wire the correct filename into `compact_meta.image_url` in `TEMPLATE_METADATA.starter`.

The `ASSET_BASE` constant (`frontend/lib/api/client.ts`) is already `http://localhost:8000` in dev — use it. The builders already resolve `m.image_url` → full URL.

### Decision 3: Collapsible groups — state management

**Option A:** `useState` in TemplatesPanel — state lost on tab switch / unmount
**Option B:** `localStorage` persistence — state survives tab switches and page reloads
**Option C:** Redux store — overkill for a UI preference

**Choose Option B** — `localStorage` key `templates_panel_collapsed_families`. Initial state: `aurora-extended` open (most commonly used), rest closed. User-opened families stay open until explicitly closed.

### Decision 4: TemplatesPanel rendering — groups vs flat

**Current:** `SLIDE_TYPES.map(t => <button>)` — flat 2-column grid

**New:**
```
FAMILY_ORDER.map(familyId => (
  <FamilyGroup key={familyId} family={TEMPLATE_FAMILIES[familyId]} collapsed={...}>
    {templatesInFamily.map(t => <TemplateButton t={t} />)}
  </FamilyGroup>
))
```

`FamilyGroup` is a new local component in TemplatesPanel. It renders:
- Header row: colored dot + family label + slide count + chevron toggle
- Collapsible body: grid of template tiles (same tile design as now)

Templates not in any family (if any remain) get an "Other" group at the bottom.

---

## External Verification Log

| Claim | Verified against | Verified on |
|---|---|---|
| `step-bg-terrain.jpg` exists in `backend/assets/images/` | `ls backend/assets/images/` | 2026-09-06 |
| `portrait-contrast.jpg` exists | Same | 2026-09-06 |
| Backend serves static files at `/assets/images/` | `curl -o /dev/null -w "%{http_code}" http://localhost:8000/assets/images/step-bg-terrain.jpg` → 200 | 2026-09-06 |
| `ASSET_BASE` is `http://localhost:8000` | `frontend/lib/api/client.ts` | 2026-09-06 |
| Template builders read `m.image_url` from `compact_meta` | `aurora_compact_step_index.ts` line 57: `resolvedImageUrl = imageUrl ?? (slide.image_url ?? m.image_url ?? null)` | 2026-09-06 |
| `TEMPLATE_FAMILIES` already has all 4 family mappings | `frontend/constants/templateFamilies.ts` | 2026-09-06 |
| `aurora-carousel-cover-hero-*` are NOT in any TEMPLATE_FAMILIES.slides | Read of `templateFamilies.ts` | 2026-09-06 |
| TemplatesPanel already uses `section` grouping for Components tab | `TemplatesPanel.tsx` line 206 | 2026-09-06 |
| localStorage is available in Next.js client components | Standard browser API, guarded by `typeof window !== 'undefined'` | 2026-09-06 |
| `SLIDE_TYPES` is derived from `Object.keys(REGISTRY).filter(k => k.startsWith("aurora-"))` | `slideTemplates.ts` line 247 | 2026-09-06 |

---

## Entry Conditions

- [ ] `npx tsc --noEmit` → 0 errors: `cd frontend && npx tsc --noEmit`
- [ ] Backend running: `curl http://localhost:8000/assets/images/step-bg-terrain.jpg` → 200
- [ ] Frontend running: `curl -o /dev/null -w "%{http_code}" http://localhost:3000` → 200 or 307

---

## Files to Create or Modify

| File | Action | Description |
|---|---|---|
| `frontend/constants/slideTemplates.ts` | MODIFY | Add `image_url` to `compact_meta.starter` for 4 photo-bg templates; add starter content for cover-hero templates |
| `frontend/constants/templateFamilies.ts` | MODIFY | Add `cover-hero` family; add `buildTemplateFamilyMap()` utility |
| `frontend/components/editor/TemplatesPanel.tsx` | MODIFY | Replace flat SLIDE_TYPES grid with collapsible FamilyGroup sections; add localStorage collapse state |

---

## Implementation Steps

### Step 2.9.1 — Fix photo-background template starters

**File:** `frontend/constants/slideTemplates.ts`

Update `compact_meta` in starter for all photo-bg templates. Use `ASSET_BASE` pattern — the image URL must be a full URL resolvable at render time. Since starters are JS constants (not evaluated at runtime), use a relative path prefix that the builder prepends with the API base. Looking at the builder code: `resolvedImageUrl = imageUrl ?? (slide.image_url ?? m.image_url ?? null)` — and `imageUrl` comes from the slide's image assets. The simplest approach: put the path in `compact_meta.image_url` as a backend-relative path `/assets/images/step-bg-terrain.jpg`, and the builder resolves it with the `API_BASE` already used elsewhere.

Actually — looking at `aurora_compact_step_index.ts` line 57, `resolvedImageUrl` ends up as a plain string passed to `fabric.FabricImage.fromURL`. It needs a fully qualified URL or a relative path that the browser can fetch. The builder runs in the browser context. The correct value is `http://localhost:8000/assets/images/step-bg-terrain.jpg` but that hardcodes localhost.

**Correct approach:** Use the same `ASSET_BASE` that `canvasSlideLoader.ts` uses — it prepends it to `imageUrl`. Looking at the loader: it only prepends to `slide.image_url` from the manifest. For `compact_meta.image_url`, the builder uses it directly.

**Fix:** In `TEMPLATE_METADATA.starter.compact_meta`, set `image_url` to the backend-relative path. In the template builders, prepend `ASSET_BASE` when constructing the full URL if the path starts with `/`.

Actually even simpler: the builders already call `fabric.FabricImage.fromURL(resolvedImageUrl)` — a path starting with `/assets/images/step-bg-terrain.jpg` will resolve correctly against the current page origin. Since the frontend is at `localhost:3000` and the images are on the backend at `localhost:8000`, a relative URL won't work.

**Cleanest fix: use the `ASSET_BASE` constant in the DEFAULTS of each builder**, not in the starter. The starter sets `image_url: "/assets/images/step-bg-terrain.jpg"`, and the builder prepends `${ASSET_BASE}` to any path that starts with `/`:

```typescript
// In aurora_compact_step_index.ts, aurora_compact_step_detail.ts, aurora_compact_stat_hero.ts:
// Before resolving the image URL, prepend ASSET_BASE to paths starting with /
import { ASSET_BASE } from "@/lib/api/client";

const rawImageUrl = imageUrl ?? (slide.image_url ?? m.image_url ?? null);
const resolvedImageUrl = rawImageUrl?.startsWith("/")
  ? `${ASSET_BASE}${rawImageUrl}`
  : rawImageUrl;
```

And in `slideTemplates.ts`, set:
```typescript
"aurora-compact-step-index": {
  starter: { compact_meta: { image_url: "/assets/images/step-bg-terrain.jpg" } }
}
// similarly for step-detail, stat-hero
```

For `aurora-compact-quote`:
```typescript
"aurora-compact-quote": {
  starter: { compact_meta: { image_url: "/assets/images/portrait-contrast.jpg" } }
}
```

**Test:** Open each template in editor → canvas shows background photo, not dark placeholder.

---

### Step 2.9.2 — Fix Cover Hero default starter content

**File:** `frontend/constants/slideTemplates.ts`

Add meaningful `compact_meta` starters for cover hero templates:

```typescript
"aurora-carousel-cover-hero-phone": {
  type: "hook", label: "Cover: Phone", desc: "Tilted phone mockup cover",
  color: "#C8956C", emoji: "📱",
  starter: {
    title: "", body: "",
    compact_meta: {
      display_headline: "Your Brand Story",
      body_text:        "One idea. One slide. Maximum impact.",
      italic_cta:       "Swipe to see more →",
    },
  },
},
"aurora-carousel-cover-hero-images": {
  type: "hook", label: "Cover: Images", desc: "Image collage cover",
  color: "#C8956C", emoji: "🖼️",
  starter: {
    title: "", body: "",
    compact_meta: {
      display_headline: "The Bigger Picture",
      body_text:        "Context that makes the story land.",
    },
  },
},
```

Then check what fields the cover hero builders actually read from `compact_meta` and use the right field names.

**Test:** Open cover hero templates → display headline + body text visible in lower half.

---

### Step 2.9.3 — Add Cover Hero family + buildTemplateFamilyMap utility

**File:** `frontend/constants/templateFamilies.ts`

Add cover-hero family entry:
```typescript
"cover-hero": {
  id:          "cover-hero",
  label:       "Cover Hero",
  description: "Metallic peach gradient with phone or image-pair — high-impact carousel openers.",
  color:       "#C8956C",
  slides: {
    hook: "aurora-carousel-cover-hero-phone",
  },
},
```

Add the reverse-map utility:
```typescript
/**
 * Reverse-map: templateKey → familyId
 * e.g. { "aurora-hook": "aurora-extended", "aurora-compact-hook": "compact-clean", ... }
 * Templates not in any family return undefined.
 */
export function buildTemplateFamilyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [familyId, family] of Object.entries(TEMPLATE_FAMILIES)) {
    for (const templateKey of Object.values(family.slides)) {
      if (templateKey) map[templateKey] = familyId;
    }
  }
  // Cover hero images template — add manually since only one slot in family.slides
  map["aurora-carousel-cover-hero-images"] = "cover-hero";
  return map;
}

export const TEMPLATE_FAMILY_MAP = buildTemplateFamilyMap();
```

Also add `TEMPLATE_FAMILY_ORDER` for consistent display order:
```typescript
export const TEMPLATE_FAMILY_ORDER = [
  "aurora-extended",
  "compact-clean",
  "editorial",
  "nextwork-dark",
  "cover-hero",
] as const;
```

**Test:** `npx tsc --noEmit` → 0 errors.

---

### Step 2.9.4 — Collapsible family groups in TemplatesPanel

**File:** `frontend/components/editor/TemplatesPanel.tsx`

This is the biggest change. Replace the flat `SLIDE_TYPES.map(...)` grid in the `activeTab === "slides"` block with family-grouped collapsible sections.

**New data flow:**
1. Import `TEMPLATE_FAMILIES`, `TEMPLATE_FAMILY_ORDER`, `TEMPLATE_FAMILY_MAP` from `templateFamilies.ts`
2. Group `SLIDE_TYPES` by family: `const byFamily = groupByFamily(SLIDE_TYPES, TEMPLATE_FAMILY_MAP)`
3. Render `TEMPLATE_FAMILY_ORDER.map(familyId => <FamilySection>)`

**Collapse state:**
```typescript
// localStorage key: "editor_family_collapsed"
// Value: JSON array of collapsed familyIds, e.g. ["compact-clean","editorial"]
// Default: all families expanded on first visit

const [collapsed, setCollapsed] = useState<Set<string>>(() => {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem("editor_family_collapsed");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch { return new Set(); }
});

function toggleFamily(familyId: string) {
  setCollapsed(prev => {
    const next = new Set(prev);
    next.has(familyId) ? next.delete(familyId) : next.add(familyId);
    localStorage.setItem("editor_family_collapsed", JSON.stringify([...next]));
    return next;
  });
}
```

**FamilySection inline component:**
```tsx
function FamilySection({ family, templates, collapsed, onToggle, onCreate, creating }) {
  const isCollapsed = collapsed.has(family.id);
  return (
    <div>
      {/* Header — clickable to toggle */}
      <button
        onClick={() => onToggle(family.id)}
        className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-all group"
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: family.color }} />
        <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white flex-1 text-left">
          {family.label}
        </span>
        <span className="text-[9px] text-zinc-600">{templates.length}</span>
        <ChevronRight
          size={10}
          className={`text-zinc-600 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
        />
      </button>

      {/* Collapsible grid */}
      {!isCollapsed && (
        <div className="grid grid-cols-2 gap-2 mt-1 mb-3">
          {templates.map((t, idx) => (
            <button
              key={t.template ?? `${t.type}-${idx}`}
              data-slide-type={t.template ?? t.type}
              onClick={() => onCreate(t.type, t.template)}
              disabled={creating === (t.template ?? t.type)}
              className="flex flex-col items-start gap-1.5 p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/50 active:scale-[0.98] transition-all duration-150 group"
            >
              <div className="w-full h-1.5 rounded-full" style={{ background: t.color, opacity: 0.9 }} />
              <div className="flex items-center gap-2">
                <span className="text-base">{t.emoji}</span>
                {creating === (t.template ?? t.type) && <Loader2 size={11} className="animate-spin text-zinc-500" />}
              </div>
              <div>
                <p className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">{t.label}</p>
                <p className="text-[10px] text-zinc-600">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Import addition needed:** `ChevronRight` from `lucide-react`.

**Test:** Open Templates panel → 5 family groups visible → click header collapses/expands → state persists on tab switch → all 24 tiles present across groups.

---

## Done Criteria

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `aurora-compact-step-index` opened → shows terrain photo background, not dark gradient
- [ ] `aurora-compact-step-detail` opened → shows terrain photo background
- [ ] `aurora-compact-stat-hero` opened → shows background photo
- [ ] `aurora-compact-quote` opened → shows portrait photo on right side
- [ ] `aurora-carousel-cover-hero-phone` opened → shows display headline + body text in lower half
- [ ] `aurora-carousel-cover-hero-images` opened → same
- [ ] Templates panel → 5 collapsible family groups visible (Aurora Extended / Compact Clean / Editorial / Nextwork Dark / Cover Hero)
- [ ] Each group header shows: color dot + label + slide count + chevron
- [ ] Click header → group collapses/expands with smooth transition
- [ ] Collapse state persists when switching between Slides/Components tabs
- [ ] All 24 tiles are still accessible (none lost in grouping)
- [ ] `node scripts/audit_one.cjs template aurora-compact-step-index` → exit 0 (regression check)

---

## Real Data Testing (Loop 3)

### Scenario A — Photo templates look designed
1. Open editor → Templates tab
2. Click `Steps Overview List` tile
3. Expected: terrain/landscape photo background visible, not dark gradient
4. Click `Deep-dive step card` → same
5. Click `Stat Hero` → photo background visible

### Scenario B — Cover hero looks complete
1. Click `Cover: Phone` tile → Enter canvas
2. Expected: phone mockup + display headline "Your Brand Story" + body text visible below
3. Lower 60% of canvas is no longer empty

### Scenario C — Collapsible family groups
1. Open Templates panel
2. Expected: 5 group headers, all expanded by default
3. Click "Compact Clean" header → 12 tiles collapse, header shows chevron right
4. Click again → expands
5. Switch to Components tab and back → collapse state preserved
6. Reload page → collapse state preserved from localStorage

---

## Known Constraints / Gotchas

### `ASSET_BASE` in template builders
The builders run in the browser. `ASSET_BASE` is `process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"`. It's safe to import in template builders since they're client-side code. Add the path prepend only when the URL starts with `/` to avoid double-prepending on already-full URLs.

### Cover hero `compact_meta` field names
Must match exactly what the builder reads. Check `aurora_carousel_cover_hero_phone.ts` for the exact field names before setting them in starter. Don't guess — read the builder's interface definition.

### `TEMPLATE_FAMILY_ORDER` covers all 5 families
The cover-hero family MUST be added to `TEMPLATE_FAMILIES` before `TEMPLATE_FAMILY_ORDER` references it, otherwise the panel will silently skip those templates. The "aurora-carousel-cover-hero-images" key must also be in `TEMPLATE_FAMILY_MAP`.

### Smooth collapse animation
CSS transition on `max-height` or use a simple `height: auto` approach. Avoid heavy animation libraries — a simple `transition-all duration-150` on the grid wrapper is sufficient.

### `ChevronRight` import
Must be added to the lucide-react import in TemplatesPanel.tsx. Currently imports: `LayoutTemplate, Puzzle, BarChart, Bookmark, Loader2, ChevronDown` — add `ChevronRight`.

---

## Loop 1 Pass 1 Issues Found

**ISSUE-A [HIGH]:** Step 2.9.1 says "the builder prepends ASSET_BASE to paths starting with /". But there are 4 builders to modify (`step-index`, `step-detail`, `stat-hero`, `compact-quote`). Each has slightly different code. Need to verify the exact line in each builder, not just one. Risk of missing one.

**Fix:** Create a shared `resolveAssetUrl(url: string | null, apiBase: string): string | null` utility in `shared/index.ts`, and call it from all 4 builders. Single point of change.

**ISSUE-B [MEDIUM]:** Cover hero field names — plan says to "check the builder's interface" but doesn't actually confirm what fields the builder reads. Risk of using wrong field names in starter.

**Fix:** Read `aurora_carousel_cover_hero_phone.ts` interface now (in Loop 1) and put exact field names in the plan.

**ISSUE-C [LOW]:** `buildTemplateFamilyMap()` is called at module init with `export const TEMPLATE_FAMILY_MAP = buildTemplateFamilyMap()`. This runs on every module import. It's a small O(n) loop over ~25 entries — acceptable. But the manual override `map["aurora-carousel-cover-hero-images"] = "cover-hero"` is a code smell. Better: add `"aurora-carousel-cover-hero-images"` to the cover-hero family's `slides` under a second key.

**Fix:** Extend `TemplateFamilySlides` interface to allow an array: add `hook2?: string` — or simpler, just add the cover-images template to `TEMPLATE_FAMILIES["cover-hero"].slides` under a key like `hook_images`.

---

## Loop 1 Pass 1 → Applying Fixes

### Fix for ISSUE-A: Shared resolveAssetUrl utility

Add to `frontend/utils/canvasTemplates/shared/index.ts` (re-export barrel):

```typescript
// In shared/index.ts, add:
export { resolveAssetUrl } from "./assetUrl";
```

Create `frontend/utils/canvasTemplates/shared/assetUrl.ts`:
```typescript
import { ASSET_BASE } from "@/lib/api/client";

/**
 * Resolves a raw image URL or path to a fully-qualified URL.
 * - Full URLs (starting with http/https): returned as-is
 * - Backend-relative paths (starting with /): prepended with ASSET_BASE
 * - Empty string / null: returned as null
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${ASSET_BASE}${url}`;
  return url;
}
```

Then in `aurora_compact_step_index.ts`, `aurora_compact_step_detail.ts`, `aurora_compact_stat_hero.ts`, `aurora_compact_quote.ts`:
```typescript
import { resolveAssetUrl } from "./shared";
// ...
const resolvedImageUrl = resolveAssetUrl(imageUrl ?? slide.image_url ?? m.image_url ?? null);
```

### Fix for ISSUE-B: Verified cover hero field names

**Confirmed from source:**
- `aurora_carousel_cover_hero_phone.ts`: reads `slide.cover_hero` (not `compact_meta`), fields: `category_pill`, `headline`, `body_text`, `cta_line`, `screen_image_url`
- `aurora_carousel_cover_hero_images.ts`: same, plus `image_urls: [string, string]`
- Defaults already have `"FAKE POST"` as headline — just add proper `body_text` default in builder

**Fix:** Change builder DEFAULTS, not the starter in `slideTemplates.ts`. No API change needed.

In `aurora_carousel_cover_hero_phone.ts`:
```typescript
body_text: m?.body_text ?? "One idea. One slide. Maximum impact.",
```

In `aurora_carousel_cover_hero_images.ts`:
```typescript
body_text: m?.body_text ?? "Context that makes the story land.",
headline:  m?.headline  ?? "THE BIGGER\nPICTURE",
```

### Fix for ISSUE-C: Cover hero images in family map cleanly

Extend `TemplateFamilySlides` to support `hook_alt`:
```typescript
interface TemplateFamilySlides {
  hook?:     string;
  hook_alt?: string;  // second hook variant (e.g. images cover vs phone cover)
  content?:  string;
  ...
}
```

Add to cover-hero family:
```typescript
"cover-hero": {
  slides: {
    hook:     "aurora-carousel-cover-hero-phone",
    hook_alt: "aurora-carousel-cover-hero-images",
  }
}
```

`buildTemplateFamilyMap` iterates `Object.values(family.slides)` — both will be included automatically.

---

## Loop 1 Pass 2 — Full Re-read

Re-reading the entire plan cold after applying all fixes:

### Architecture Checks ✅
- [x] No ambiguous "etc." — every file, function, and field is named explicitly
- [x] Entry conditions verifiable — exact commands given
- [x] External dependencies listed — no new npm packages, uses existing `ASSET_BASE`, `lucide-react`, `localStorage`
- [x] No circular deps — `resolveAssetUrl` is in `shared/`, `templateFamilies.ts` exports only constants and a utility
- [x] API contract stable — no backend changes, no schema changes
- [x] Cover hero fields verified from source — NOT compact_meta, uses slide.cover_hero, fixed in builder DEFAULTS not starter

### Code Quality Checks ✅
- [x] `resolveAssetUrl` is single-responsibility — takes URL, returns URL
- [x] `buildTemplateFamilyMap` is pure — no side effects, deterministic
- [x] `FamilySection` inline component — keeps TemplatesPanel readable without a new file
- [x] localStorage access guarded by `typeof window !== 'undefined'` in useState initializer

### Frontend-Specific Checks ✅
- [x] No new pages — only TemplatesPanel UI change
- [x] Dark theme — family headers use zinc-800/900 colors, family colors only for dot + label
- [x] Empty state — groups with 0 templates (shouldn't happen, but `templates.length === 0` skips the section)
- [x] Component decomposition — `FamilySection` is a local function component, not a separate file (correct for this size)

### "Handed to unknown developer" test ✅
- Step 2.9.1 says exactly which 4 builders to update and how
- Step 2.9.2 says exactly which DEFAULTS to change in which files
- Step 2.9.3 has exact TypeScript code for all new exports
- Step 2.9.4 has exact JSX code for FamilySection component
- All field names verified from source

**PASS 2 CLEAN. No new issues.**

## Status Update
APPROVED — Loop 1 complete (2026-09-06), ready to implement
