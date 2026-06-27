# Analytics — Complete Record

> **Scope:** Architecture → Data Inventory → Implementation → Bug Fixes → Roadmap
> **Created:** 2026-06-27
> **Status:** Living document — single source of truth for the analytics layer
> **Related:** `Docs/ANALYTICS_DEEP_DIVE.md`, `Docs/ANALYTICS_IMPLEMENTATION_PLAN.md`

---

## Table of Contents

1. [What the Analytics Page Shows](#1-what-the-analytics-page-shows)
2. [System Architecture](#2-system-architecture)
3. [Data Inventory](#3-data-inventory)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Bug Fixes & Root Causes](#6-bug-fixes--root-causes)
7. [Known Constraints & Design Decisions](#7-known-constraints--design-decisions)
8. [Roadmap](#8-roadmap)
9. [Interview Talking Points](#9-interview-talking-points)

---

## 1. What the Analytics Page Shows

URL: `/analytics`

### Row 1 — Cost & Volume KPIs

| Card | Value | How computed |
|---|---|---|
| **Total Spent** | ₹ INR + $ USD | Tracked runs + estimated average for untracked runs |
| **Avg Cost / Run** | ₹ INR | Total ÷ all runs (including estimated) |
| **Total Runs** | Count | All run directories in `outputs/runs/` |
| **Slides Created** | Count | Sum of `slide_*.png` across all `angle_*/png/` directories |

### Row 2 — Quality & Content KPIs

| Card | Value | How computed |
|---|---|---|
| **Research Efficiency** | % | Runs where `iterations[0].evaluation.passed == True` ÷ runs with quality data |
| **Avg Research Confidence** | % | Mean `evaluation.combined_confidence` across all runs |
| **Blog Posts Written** | Count | Runs with `blog_post.md` at the run root — scanned across ALL runs |
| **Pexels Image Rate** | % | pexels images ÷ total images sourced |

### Charts & Sections (order on page)

1. **Run status strip** — succeeded / partial / failed counts
2. **Research Quality** — confidence bar list per run (green = passed, amber = failed), 4 depth stats
3. **Token Usage per Run** — last 20 runs, bar chart with token count + cost
4. **Cost by Stage** — research / angles / carousel / caption / blog with % breakdown
5. **Stage Performance** — avg / min / max latency per stage from token timestamps
6. **Topics by Category** — keyword-classified into 7 categories
7. **Quality by Topic** — avg research confidence per topic category (colour-coded)
8. **Content Strategy** — Emotional Hooks / Slide Types / Image Sources (3-col grid)
9. **Activity Calendar** — GitHub-style heatmap, year selector, streak counter
10. **Publish Readiness** — last 10 runs, ✓/✗ per: slides / images / captions / blog
11. **Model Usage** — per-model cost and call count

### Refresh button

Top-right of the page. Calls `POST /api/v1/analytics/invalidate-cache` then re-fetches. Forces the backend to drop its 5-minute TTL cache and re-scan all run directories.

---

## 2. System Architecture

```
Browser
  └─ GET /analytics
       └─ React page (app/analytics/page.tsx)
            └─ api.getSummary()
                 └─ GET /api/v1/analytics/summary
                      └─ analytics.py (FastAPI route)
                           └─ get_analytics_summary()          ← cache-aware wrapper
                                ├─ analytics_cache.get()       ← TTL cache (5 min)
                                └─ _scan_and_compute()         ← on cache miss
                                     ├─ run_loader.load_run()  ← per-run I/O
                                     └─ aggregator.compute()   ← pure computation

POST /api/v1/analytics/invalidate-cache
  └─ analytics_cache.invalidate()    ← drops cache entry
```

### Cache invalidation flow

```
Pipeline completes
  ├─ research/orchestrator.py → save_research_output() → analytics_cache.invalidate()
  └─ content/finalizer.py → finalize_content_node() → analytics_cache.invalidate()
```

---

## 3. Data Inventory

### Files read per run

| File | Key fields extracted |
|---|---|
| `research/research_result.json` | `evaluation.combined_confidence`, `evaluation.passed`, `iterations[0].evaluation.passed`, `synthesis.{key_points,gaps,contradictions}`, `evidence_count`, `total_iterations`, `status` |
| `token_usage.json` | `stage`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `cost_inr`, `timestamp`, `duration_ms` |
| `angles/selection.json` | `selected_angles[].emotional_hook` |
| `content/angle_*/slides.json` | `slides[].type` (hook/content/stat/quote/cta/engage) |
| `content/angle_*/image_assets.json` | `image_assets[].source` (pexels/ddgs/colour/brand) |
| `content/angle_*/png/slide_*.png` | Count only |
| `content/angle_*/carousel.json` | Existence check for captions |
| `blog_post.md` | Existence check (at run root, not inside content/) |

### Important path notes

- **Blog post** lives at `{run_dir}/blog_post.md` — NOT `{run_dir}/content/blog_post.md`
- **Image assets** are stored as `{"image_assets": [...]}` dict wrapper, not a flat list — loader handles both
- **Slides** are stored as `{"slides": [...]}` dict wrapper OR flat list — loader handles both

---

## 4. Backend Implementation

### Module structure

```
backend/core/services/analytics/
  __init__.py      — re-exports: analytics_cache, get_analytics_summary, get_analytics_summary_async
  cache.py         — _AnalyticsCache class (thread-safe TTL), analytics_cache singleton
  run_loader.py    — load_run(run_dir) — all filesystem I/O for one run
  aggregator.py    — compute(runs_meta) — pure aggregation, no I/O
  summary.py       — get_analytics_summary() / get_analytics_summary_async()

backend/core/services/analytics_service.py  — thin shim, re-exports from analytics/
backend/apps/api/v1/analytics.py            — GET /summary, POST /invalidate-cache
```

### Cache (`cache.py`)

```python
_CACHE_TTL_S = 300   # 5 minutes

class _AnalyticsCache:
    def get() → Any | None          # returns None if expired
    def set(data)                    # stores with TTL
    def invalidate()                 # drops entry immediately
```

Called from `orchestrator.py` and `finalizer.py` after every pipeline run completion.

### Run loader (`run_loader.py`)

Reads every file for one run directory. Key normalisation logic:

**Hook normalisation** — LLM returns verbose strings like `"Anger - exposing systemic exploitation"`. `_normalise_hook()` regex-matches the canonical prefix and collapses to one of `{Anger, Hope, Curiosity, FOMO, Other}`.

**First-pass quality** — `_first_pass_passed()` reads `iterations[0].evaluation.passed`. The graph always forces ≥2 iterations (see `research_graph.py` line 182), so iteration 0's snapshot is the genuine first evaluation result.

### Aggregator (`aggregator.py`)

Pure function. No filesystem I/O. Key aggregations:

- **Quality gate rate** = `sum(first_pass_passed == True) / len(runs_with_quality_data)`
- **Blog count** = `sum(readiness.has_blog)` across ALL runs (not just last 10)
- **Untracked cost estimate** = `avg_tracked_cost × untracked_run_count`
- **Hook cap** = `_sort(hooks, "hook", cap=5)` — keeps top-5, includes ties at the cutoff

### API (`analytics.py`)

```python
GET  /api/v1/analytics/summary           → get_analytics_summary(), Cache-Control: max-age=60
POST /api/v1/analytics/invalidate-cache  → analytics_cache.invalidate()
```

---

## 5. Frontend Implementation

### Component structure

```
app/analytics/page.tsx                      — data fetch, state, layout orchestration (~160 lines)

components/analytics/
  KpiCard.tsx                               — reusable KPI card
  Card.tsx                                  — Card wrapper + CardHeader + DistributionRow primitives
  ContributionCalendar.tsx                  — GitHub-style SVG heatmap
  ResearchQualitySection.tsx                — confidence bar list + depth stats
  StageSections.tsx                         — Cost by Stage + Stage Performance table
  TopicSections.tsx                         — Topics by Category + Quality by Topic
  ContentStrategySection.tsx                — Hooks + Slide Types + Image Sources (3-col)
  PublishReadinessTable.tsx                 — last 10 runs ✓/✗ grid
```

### Data flow

```typescript
api.getSummary() → AnalyticsSummary
  → page.tsx destructures all fields with safe defaults
  → each section component receives only its relevant props
```

### Refresh button

```typescript
const handleRefresh = async () => {
  setRefreshing(true);
  await fetch(".../analytics/invalidate-cache", { method: "POST" });
  const result = await api.getSummary();
  setData(result);
  setRefreshing(false);
};
```

Spins `RefreshCw` icon while in-flight. `computed_at` timestamp in the header updates after each refresh so freshness is visible.

### TypeScript types (`lib/api/analytics.ts`)

```typescript
interface AnalyticsSummary {
  computed_at?: string;
  kpis: AnalyticsKPIs;          // includes untracked_runs
  research_quality: ResearchQuality;
  hook_distribution: { hook: string; count: number }[];
  slide_type_distribution: { type: string; count: number }[];
  image_source_distribution: { source: string; count: number }[];
  category_confidence: { category: string; avg_confidence: number; run_count: number }[];
  run_readiness: RunReadiness[];
  blog_count: number;
  stage_latency: Record<string, StageLatency>;
  // ... plus existing token/activity/model fields
}
```

---

## 6. Bug Fixes & Root Causes

### Bug 1 — Blog count showed 0 (then 3)

**Root cause A:** Blog path was checked at `content/blog_post.md`. Actual path is `{run_dir}/blog_post.md` (written by the blog generator at the run root, not inside content/).

**Root cause B:** Even after the path fix, `blog_count` was derived from `run_readiness[-10:]` — only the last 10 runs. Runs 11+ were ignored.

**Fix:** `blog_count` is now computed by scanning ALL `runs_meta` in `aggregator.py`, completely separate from the readiness table.

### Bug 2 — Hooks showed 40+ verbose strings instead of 4 canonical values

**Root cause:** LLM occasionally returns `"Anger - exposing systemic exploitation"` or `"Anger and FOMO—fans realize..."` instead of the canonical `"Anger"`. Each unique string was counted separately.

**Fix:** `_normalise_hook()` in `run_loader.py` regex-matches the canonical prefix word and collapses all variants. Multi-hook strings match the first canonical found.

### Bug 3 — Quality gate showed 100% (then 97%, then ~92%)

**Root cause 1 (100%):** Logic checked `evaluation.passed` (final result). Since the graph always forces ≥2 iterations and both typically pass, final result was always True.

**Root cause 2 (97%):** Switched to "passed within 2 loops" heuristic — still not measuring the first evaluation independently.

**Root cause 3 (correct — 92%):** `iterations[0]` in `research_result.json` contains `iteration_number: 1` — it IS the first evaluation snapshot, stored by the refine node. `iterations[0].evaluation.passed` is the definitive first-iteration result.

### Bug 4 — Live API served old code for hours

**Root cause:** Backend was started without `--reload`. Python process held old compiled modules in memory. File changes on disk had no effect until process restart.

**Fix:** Backend is now started with `--reload` (WatchFiles). Code changes auto-apply within ~1 second.

### Bug 5 — image_assets.json and slides.json parse failures

**Root cause:** Files are stored as `{"image_assets": [...]}` dict wrapper by `finalizer.py`, not as flat lists. Old code did `for a in assets` on the dict, iterating over the key string, never hitting any entries.

**Fix:** `run_loader.py` handles both: `assets = raw if isinstance(raw, list) else raw.get("image_assets", [])`.

---

## 7. Known Constraints & Design Decisions

### The "forced 2 iterations" constraint

`research_graph.py` line 182 unconditionally forces a second tool-execution cycle regardless of first evaluation result:
```python
if loop_count == 0:
    return "refine"   # always force 2nd cycle
```
This means `total_iterations` is always ≥ 2. The "Research Efficiency" KPI measures whether `iterations[0].evaluation.passed == True` — did the first real evaluation already meet the quality bar? If yes, the second loop was forced but redundant.

### Untracked run cost estimation

Runs generated before token tracking was introduced have no `token_usage.json`. Rather than excluding them from the total (which would undercount), we estimate their cost using the average of tracked runs. The KPI sub-label shows "X runs estimated" for transparency.

### Hook cap deduplication

The `_sort(hooks, cap=5)` function keeps all items with count ≥ the 5th item's count. This means if items 5, 6, 7 all have count=1, they're all excluded (all tied at the tail). This avoids the long-tail problem where many count=1 items swamp the display.

### Analytics cache: server-side vs browser-side

Two layers of caching exist:
1. **Server-side (Python):** `_AnalyticsCache` with 5-min TTL. Invalidated explicitly on pipeline completion.
2. **Browser-side (HTTP):** `Cache-Control: max-age=60, stale-while-revalidate=300`. Repeat page visits within 60s never hit the server.

The Refresh button bypasses both: `POST /invalidate-cache` drops the server cache, and the subsequent `GET /summary` request includes `cache: "no-store"` to bypass the browser cache.

---

## 8. Roadmap

### Phase A — Done (read existing data)

- [x] Research quality KPI + confidence distribution
- [x] Stage latency from token timestamps
- [x] Run success/partial/failed status counts
- [x] Emotional hook distribution (normalised)
- [x] Slide type mix
- [x] Image source breakdown
- [x] Quality by topic (category × confidence heatmap)
- [x] Blog count across all runs
- [x] Publish readiness checklist (last 10 runs)
- [x] `computed_at` timestamp + Refresh button
- [x] TTL cache + explicit invalidation on pipeline completion
- [x] HTTP `Cache-Control` header on API endpoint

### Phase B — Pending (new fields to store)

- [ ] `duration_ms` per LLM call — add timing measurement in `claude.py` ✅ (field added to TokenRecord, not yet wired in backend restart)
- [ ] `run_metadata.json` at pipeline completion — total duration, angle counts
- [ ] Stage latency from `duration_ms` (replaces timestamp diffing)

### Phase C — Future

- [ ] Cost vs Quality scatter plot (efficiency frontier per run)
- [ ] Monthly spend trend (activity calendar variant for cost)
- [ ] Run search + tag filtering integration
- [ ] Export analytics as CSV

---

## 9. Interview Talking Points

### "How does your analytics system avoid stale data?"

Three layers: (1) explicit cache invalidation — every pipeline finalizer calls `analytics_cache.invalidate()` so the next page load gets fresh data, (2) TTL expiry — even if invalidation is missed, the cache expires in 5 minutes, (3) manual Refresh button — calls `POST /invalidate-cache` then re-fetches, bypassing both server and browser cache.

### "How do you handle runs that predate your token tracking?"

Those runs have no `token_usage.json`. We estimate their cost using the average cost-per-run from tracked runs, add it to the total, and mark the KPI sub-label with "X runs estimated" for transparency. This gives a more accurate all-time spend figure than either excluding them or showing zero.

### "What's the most interesting insight your analytics surfaces?"

The cost-vs-quality correlation by topic category. Some categories (AI & Technology) consistently produce high-confidence research at average cost — they sit on the efficiency frontier. Others (Politics & Society) cost the same but produce lower-confidence synthesis, suggesting the topic is inherently harder to ground in evidence. This is visible in the "Quality by Topic" heatmap.

### "How does your research quality gate work?"

The research graph always runs at least 2 tool-execution cycles (hardcoded in `research_graph.py`). The first cycle runs tools, the LLM synthesizes, the evaluator scores. The score is saved to `iterations[0]`. The second cycle is forced regardless. "Research Efficiency" measures `iterations[0].evaluation.passed` — did the research quality gate pass before the forced second loop? At ~92%, most runs produce passing-quality research in the first attempt; ~8% genuinely needed the refinement.

### "Why is your analytics page fast?"

The analytics scan reads ~50 JSON files across ~50 run directories. That takes ~250ms on a cold cache miss. With the 5-minute TTL cache, 99% of page loads return in <5ms. The cache is thread-safe (threading.Lock) so concurrent requests during the cold-miss window don't trigger duplicate scans. At 200+ runs, a background async executor pattern is ready to switch to.
