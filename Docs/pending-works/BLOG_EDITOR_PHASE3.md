# Blog Editor Phase 3 — Structured Field Editing

> **Depends on:** `fix-blogger` branch merged  
> **Background:** `Docs/backend/BLOG_POST_GENERATION.md`

---

## What This Is

Currently (Phase 2) the blog editor is a markdown textarea. The user edits raw text, saves, and `blog_post.json` is frozen as a read-only generation record with `_user_edited: true`.

Phase 3 makes the JSON the live source of truth through edits too — by giving each field its own input in the UI rather than one big text area.

---

## What Needs Building

### Backend — one new endpoint

```python
PUT /content/{run_id}/blog-post/fields

# Body: partial BlogPostDocument fields
{
  "title": "...",           # optional — only include fields being changed
  "sections": [...],
  "key_findings": [...],
  "tags": [...]
}
```

Handler: load `blog_post.json` → merge update → re-render `.md` and `.html` → save all three. JSON stays current. No `_user_edited` flag needed.

Remove `_user_edited` flag and the orchestrator skip-if-edited logic once this ships — the JSON will always be up to date.

### Frontend — replace MarkdownEditor with structured form

`MarkdownEditor.tsx` currently loads the raw `.md` file and shows a textarea. Replace with (or add alongside) a structured editor:

- Title + subtitle inputs
- Intro textarea
- Sections: each rendered as `heading` input + `paragraphs` textarea(s) + optional pull quote
- Key findings: list of text inputs
- CTA text input
- Tags input

On save → `PUT /blog-post/fields`. Both `.md` and `.html` regenerate automatically on the backend.

---

## Why Deferred

Requires rebuilding the editor UI. The backend contract (`BlogPostDocument`) is already in place — this is purely a frontend effort plus one endpoint.
