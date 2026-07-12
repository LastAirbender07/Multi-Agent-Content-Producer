# Blog Post Generation — Technical Record

> **Branch shipped:** `fix-blogger`  
> **Status:** Complete — Phases 1 & 2 done. Phase 3 documented separately in `Docs/pending-works/`.

---

## What Was Built

### 1. Structured LLM Output (`BlogPostDocument`)

The LLM now returns a validated JSON object instead of free-form markdown prose. No regex parsing, no `[MARKER]` bracket stripping, no `[IMAGE_HERE]` token replacement.

**Schema** (`backend/core/orchestration/blog_post_schema.py`):
- `title` — SEO headline (first-class field, never extracted from HTML)
- `subtitle` — urgency sentence
- `intro` — opening hook paragraph
- `sections[]` — each with `heading`, `paragraphs[]`, `pull_quote`, `image` slot
- `key_findings[]` — 3–5 takeaways
- `cta_text` — call to action
- `tags[]` — topic tags (no `#` prefix)

Image slots declared by the LLM; URLs injected by the pipeline after URL validation.

### 2. Deterministic Rendering (`blog_post_renderer.py`)

Two pure functions — no LLM, no parsing:
- `to_markdown(doc)` → clean markdown, always derived from JSON
- `to_html(doc)` → full HTML page via `blog_post.html.j2`, `<title>` set directly from `doc.title`
- `inject_images(doc, pool)` → fills `image.url` fields from the image pool

### 3. File Layout

All blog files under `runs/{run_id}/blog/`:
```
runs/{run_id}/
└── blog/
    ├── blog_post.json    ← source contract (BlogPostDocument)
    ├── blog_post.md      ← rendered markdown
    └── blog_post.html    ← rendered HTML page
```

One-time migration ran via `scripts/migrate_blog_to_subdir.py` — moved all 28 existing runs from root into `blog/`. No dual-path fallback needed.

### 4. Title Flow

```
LLM → BlogPostDocument.title (typed field)
  → to_html() sets <title> and <h1> directly
  → ContentResponse.blog_post_title carries it in Redux state
  → BlogExportBar uses blogPostTitle prop (no HTML parsing)
  → PUT /blog-post preserves title from JSON on editor saves
```

`extract_blog_title()` in `blogger_service.py` kept only for `bulk_publish_blogger.py` (reads HTML files for older pre-refactor runs).

### 5. Editor Save — Option D

`PUT /blog-post` (markdown editor save):
1. Writes new markdown to `blog/blog_post.md`
2. Re-renders `blog/blog_post.html` using title from `blog_post.json` (not raw topic)
3. Sets `_user_edited: true` on `blog_post.json`

The orchestrator skips blog regeneration on subsequent pipeline re-runs if `_user_edited` is set — preserving manual edits.

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/core/orchestration/blog_post_schema.py` | `BlogPostDocument`, `Section`, `ImageSlot` Pydantic models |
| `backend/core/services/blog_post_renderer.py` | `to_markdown()`, `to_html()`, `inject_images()` |
| `backend/core/orchestrators/content/blog_post_generator.py` | LLM call → validated `BlogPostDocument` |
| `backend/core/prompts/templates/blog_post.txt` | Prompt — instructs LLM to return JSON |
| `backend/apps/api/v1/content.py` | GET/PUT blog endpoints — all paths → `blog/` |
| `scripts/migrate_blog_to_subdir.py` | One-time migration script (already run) |

---

## What's Still Pending

See `Docs/pending-works/BLOG_EDITOR_PHASE3.md` — structured field editing where JSON stays the live source of truth through edits.
