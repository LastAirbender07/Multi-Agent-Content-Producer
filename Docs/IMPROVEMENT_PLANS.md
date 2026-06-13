# Implementation Plans — Active Items

Items completed: **1** (Image Dedup), **3** (Angle Re-generation), **4** (Research Progress Bar), **7** (Blog Post Export).
Item **2** (Hashtag Quality Control) deliberately skipped.
Item **5** (Multi-Topic Batch Mode) deferred — needs auth layer first.
Item **10** (Instagram Publisher) moved to `Docs/INSTAGRAM_PUBLISHER_PLAN.md`.

Active items in execution order (see `Docs/MASTER_PLANNING.md`):
**8 → 7 → 9 → 6**

---



### Problem

The API and CLI accept one topic per call. Producing a 10-post content calendar requires 10 sequential invocations (5–15 minutes total). There is no way to submit a batch and have them run concurrently.

### Solution

**Add `POST /api/v1/pipeline/batch`** with a bounded async worker pool.

**Backend — `apps/api/v1/pipeline.py`:**

```python
class BatchPipelineRequest(BaseModel):
    topics: list[str] = Field(..., min_length=1, max_length=20)
    mode: str = "standard"
    freshness: str = "recent"
    angle_mode: str = "auto"
    image_source: str = "auto"
    max_concurrent: int = Field(default=3, ge=1, le=5)

class BatchTopicResult(BaseModel):
    topic: str
    run_id: str
    status: str         # "complete" | "failed"
    output_path: str
    errors: list[str]

class BatchPipelineResponse(BaseModel):
    batch_id: str
    total: int
    completed: int
    failed: int
    results: list[BatchTopicResult]

@router.post("/batch", response_model=BatchPipelineResponse)
async def run_pipeline_batch(request: BatchPipelineRequest) -> BatchPipelineResponse:
    semaphore = asyncio.Semaphore(request.max_concurrent)

    async def run_one(topic: str) -> BatchTopicResult:
        async with semaphore:
            try:
                result = await run_pipeline(PipelineRequest(topic=topic, mode=request.mode, ...))
                return BatchTopicResult(topic=topic, run_id=result.run_id, status=result.status, ...)
            except Exception as e:
                return BatchTopicResult(topic=topic, run_id="", status="failed", errors=[str(e)])

    batch_id = str(uuid.uuid4())
    results = await asyncio.gather(*[run_one(t) for t in request.topics])
    return BatchPipelineResponse(batch_id=batch_id, total=len(results), ...)
```

Move `BatchPipelineRequest`, `BatchTopicResult`, `BatchPipelineResponse` to `schemas.py`.
Also move inline `PipelineRequest`/`PipelineResponse` from `pipeline.py` to `schemas.py` (known tech debt).

**Frontend — `/pipeline/batch` page:**

- Textarea: one topic per line
- Mode / freshness / angle-mode selectors (same as single pipeline)
- "Run Batch" button → calls `api.runBatch()`
- Results table: topic, status badge (✅/❌), output path link

**`lib/api.ts`:**
```ts
runBatch: (body: BatchPipelineBody) => post<BatchPipelineResponse>("/pipeline/batch", body),
```

**Files changed:**

| File | Change |
|---|---|
| `backend/apps/api/v1/pipeline.py` | Add `/batch` endpoint |
| `backend/apps/api/v1/schemas.py` | Add 3 batch models + move `PipelineRequest/Response` |
| `frontend/lib/api.ts` | Add `runBatch` |
| `frontend/app/pipeline/batch/page.tsx` | New batch input page |

**Verification:** Submit 3 topics with `max_concurrent=2`. Confirm logs show ≤2 simultaneous `content_orchestrator_started`. Confirm all 3 produce output in `outputs/<run_id>/`.

---

## 6. Slide Editor UI

### Status: REVISED — now part of the Standalone Editor Page (Plan 6R)

See `Docs/MASTER_PLANNING.md` Part 5 for the full revised plan.

**Key change:** The editor is no longer inline within the carousel preview on the pipeline page. It is now a standalone `/editor` page with a file browser. The user opens any run from their history, browses the output files (PNGs + blog_post.md), and edits them there.

**Architecture:**
- `/editor?run={run_id}` — standalone editor page
- Left panel: file browser (angles → slides, blog_post.md)
- Right panel: Slide Editor (Text / Chart / Image tabs) OR Markdown Editor (with LLM assistant)
- Entry point: "Open in Editor" button in Stage 3 of pipeline page

**Backend endpoints (same as original plan, unchanged):**
- `GET /{run_id}/manifest` — file tree (NEW)
- `POST /{run_id}/slides/{n}/edit` — text + chart field edits
- `POST /{run_id}/slides/{n}/ai-rewrite` — AI regen with feedback
- `POST /{run_id}/slides/{n}/swap-image` — image search + swap
- `PUT /{run_id}/blog-post` — save updated Markdown

**Required backend refactors before building:**
1. `carousel_generator.py` → extract `render_and_screenshot_single_slide()`
2. `image_fetcher.py` → extract `fetch_and_download_single_image()`
3. `slide_validator.py` → `_regen_single_slide` → public

**Blockers before coding:** single-slide render helper POC + Chart.js visual match POC.

---

## 7. Smart Topic Input — News Discovery + Query Refinement (Inline on Pipeline Page)

### Status: REVISED from original Plan 7

**Original design:** Separate `/discover` page that redirected to pipeline.
**Revised design:** Everything stays on `/pipeline`. The discovery feed is an expandable panel inside the Pipeline config sidebar. Browsing, refining, and launching are one continuous experience.

### Full detailed plan: see `Docs/MASTER_PLANNING.md` Part 4

### Summary of the flow

1. User expands the "Discover Topics" panel inside the Pipeline left sidebar
2. News feed loads across 8 categories (Google News + DDGS, cached 30 min)
3. Each card shows: category chip, age, **headline**, **summary snippet**, source
4. User clicks `[→ Use this]` on a card
5. Article title + snippet pre-fill the Target Topic textarea
6. `POST /tools/query-refine` fires automatically → refined queries appear in a new "Refined Queries" section
7. User sees: cleaned topic (editable), entity chips, 6-10 search query rows (each editable)
8. Optional: user types refinement feedback → clicks `[Refine further]` → queries update (multi-round)
9. When satisfied → `[✓ Use these queries]` → queries locked, config still editable
10. User adjusts depth/freshness/angle mode as needed → clicks `[Produce Content]`

### Multi-round refinement API change

`POST /tools/query-refine` extended with optional fields (backward-compatible):
```python
class QueryRefineRequest(BaseModel):
    topic: str = Field(..., min_length=2)
    previous_queries: list[str] = Field(default_factory=list)
    feedback: str = ""
    original_article_title: str = ""
    original_article_snippet: str = ""
```

`query_preprocessing.txt` updated with `{feedback_block}` conditional for multi-round context.

### New Redux state
```ts
preprocessedQueries: string[]
refinedTopic: string
discoveryArticle: { title, snippet, url, category } | null
```
All cleared on `resetPipeline()`.



---

## 8. Collapsible Sidebar Navigation

### Problem

The left sidebar is always expanded (`w-64`) and cannot be hidden. On smaller screens and while working inside the Pipeline (which has its own left panel), the sidebar takes up horizontal real estate that could show more content. Users who know the navigation don't need labels visible at all times.

### Design

A hamburger / collapse toggle that shrinks the sidebar to icon-only mode (`w-20`) and expands back to full mode (`w-64`). State persists to `localStorage` so the preference survives page reloads. The toggle is a single `Menu` (hamburger) icon in the header area — clicking it toggles expanded/collapsed.

---

### Implementation

**State:** `sidebarExpanded: boolean` stored in `localStorage` key `sidebar_expanded` (default: `true`). Read on mount, write on toggle. No Redux needed — it's a UI preference, not app state.

**`frontend/components/layout/Sidebar.tsx`** — full rewrite:

```tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, FlaskConical, Image as ImageIcon, Newspaper,
         MessageSquare, Menu, ChevronRight, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const nav = [
  { href: "/pipeline",  icon: Zap,          label: "Pipeline"  },
  { href: "/discover",  icon: Compass,       label: "Discover"  },
  { href: "/research",  icon: FlaskConical,  label: "Research"  },
  { href: "/images",    icon: ImageIcon,     label: "Images"    },
  { href: "/news",      icon: Newspaper,     label: "News"      },
  { href: "/chat",      icon: MessageSquare, label: "Chat"      },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  // Persist to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_expanded");
    if (saved !== null) setExpanded(saved === "true");
  }, []);

  function toggle() {
    setExpanded(v => {
      localStorage.setItem("sidebar_expanded", String(!v));
      return !v;
    });
  }

  return (
    <motion.aside
      animate={{ width: expanded ? 256 : 80 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="shrink-0 flex flex-col bg-black border-r border-zinc-900/50 h-screen sticky top-0 z-40 overflow-hidden"
    >
      {/* Header — logo + hamburger */}
      <div className="p-4 flex items-center justify-between min-h-[72px]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600
                          flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <Zap size={22} className="text-white fill-white" />
          </div>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="label"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="min-w-0"
              >
                <h1 className="text-sm font-black text-white tracking-tighter leading-none">CONTENT</h1>
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mt-0.5">Studio AI</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={toggle}
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                     text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu size={16} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-bold
                         transition-all duration-200 group overflow-hidden
                         ${active ? "text-white" : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50"}`}
            >
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-violet-500 -z-10 shadow-lg shadow-violet-500/20"
                />
              )}
              <Icon size={20} className={`shrink-0 transition-transform group-hover:scale-110
                                          ${active ? "text-white" : "text-zinc-500"}`} />
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.12 }}
                    className="flex-1 truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && expanded && <ChevronRight size={14} className="shrink-0 text-white/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-zinc-900/50">
        <div className={`rounded-2xl bg-zinc-900/30 border border-zinc-800/30 p-3`}>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.p
                key="version"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest"
              >
                v1.0.0 Standard
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.p
                  key="status"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest"
                >
                  Active Session
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
```

**No other files need to change** — the sidebar width is driven by Framer Motion's `animate` on the `<aside>`. The rest of the layout uses `flex` so it reflows automatically.

---

### UI design notes

- The hamburger icon (`Menu`) lives in the top-right of the header area — always visible and clickable regardless of expanded state
- Collapsed state (`w-20`): icon only + hamburger. Hovering a nav item shows a `title` tooltip with the label (native browser tooltip, no JS needed)
- Transitions: `duration: 0.2s easeInOut` for the width; `duration: 0.12-0.15s` for label fade — fast enough to feel snappy, slow enough to feel intentional
- `AnimatePresence` on text elements prevents layout shift during collapse (text fades out before width shrinks)
- `layoutId="active-nav"` still works — the gradient pill still animates between items in both states

---

### Verification

1. Sidebar renders collapsed and expanded correctly — icon-only and full-width
2. Clicking the hamburger icon collapses/expands with smooth animation
3. State persists after page reload (localStorage)
4. Active nav item highlight still animates between pages in both states
5. Discover nav item appears and routes correctly
6. Tooltips show in collapsed mode on hover

---

## 9. Blog Post Editor with Inline LLM Assistant

### Problem

The blog preview is read-only. Once generated, if the user wants to change a section heading, remove an image, rewrite a paragraph, or add new content, there is no way to do it inside the app — they have to download the file and edit it externally in VS Code or a text editor, then re-upload.

### Design Philosophy

Think: **Notion meets Medium's editor**, but embedded inside the Studio. The editor is a full-page experience (`/blog-editor/{run_id}`) with:

1. **Left: the blog document** — fully editable, WYSIWYG-style (but Markdown-backed)
2. **Right: an LLM assistant sidebar** — always has the full document in context, can rewrite sections, suggest improvements, add citations

The LLM sidebar is the core differentiator. The user doesn't need to copy-paste anything — the assistant sees the live document as-is.

---

### Frontend — `/blog-editor/{run_id}` page

**Editor area (left, ~65% width):**

Uses **`@uiw/react-md-editor`** or **`@toast-ui/editor`** — both are open source Markdown editors with:
- WYSIWYG + raw Markdown toggle
- Toolbar: Bold, Italic, Heading, Link, Image, Blockquote, Code, Table
- Image drag-and-drop support
- Live preview pane (split or toggle)

Recommended: `@uiw/react-md-editor` — lightweight (50kb), no external dependencies, supports dark theme out of the box, actively maintained.

```tsx
import MDEditor from "@uiw/react-md-editor";

<MDEditor
  value={content}
  onChange={(val) => setContent(val || "")}
  height={700}
  data-color-mode="dark"
/>
```

**Toolbar additions beyond default:**
- **Insert Image** button: opens the existing Images page search as a modal, inserts `![alt](url)` at cursor
- **Save** button: `PUT /api/v1/content/{run_id}/blog-post` — writes updated Markdown + regenerates HTML
- **Export** buttons: same as pipeline page (Download .md, Download .html)

**LLM assistant sidebar (right, ~35% width):**

Persistent chat panel. On every message, the full current document content is injected into the system prompt:

```
You are an expert content editor and journalist.
The user is editing this blog post. You have access to the full current document below.
Help them improve it — rewrite sections, add citations, adjust tone, or suggest structure changes.
When rewriting a section, output ONLY the replacement text (no preamble).

CURRENT DOCUMENT:
---
{full_markdown_content}
---
```

This context injection happens client-side before every API call — no special backend needed. The `api.chat()` endpoint already exists and takes arbitrary messages.

**Interaction patterns:**
- User selects text in the editor → "Edit selection" button appears → opens assistant with pre-filled prompt "Rewrite this: {selected_text}"
- User types freely: "Make the intro more provocative", "Add a section about the economic impact", "Remove the second image"
- When assistant responds with new text: **"Apply"** button appears next to the response — clicking it replaces the selected text in the editor with the assistant's output
- Assistant responses are streamed (future — for now, wait for full response)

**State:**
```ts
const [content, setContent] = useState<string>("");         // live Markdown
const [chatMessages, setChatMessages] = useState<...[]>([]);
const [selection, setSelection] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
```

---

### Backend — new endpoint

**`PUT /api/v1/content/{run_id}/blog-post`**

Accepts updated Markdown, regenerates HTML, saves both.

```python
class BlogPostUpdateRequest(BaseModel):
    markdown: str

@router.put("/{run_id}/blog-post")
async def update_blog_post(run_id: str, request: BlogPostUpdateRequest) -> dict:
    # Save markdown
    md_path = Path("outputs") / run_id / "blog_post.md"
    md_path.write_text(request.markdown, encoding="utf-8")
    # Regenerate HTML from updated markdown
    from core.orchestrators.content.blog_post_generator import _markdown_to_html
    tags = []  # reload from carousel.json if needed
    html = _markdown_to_html(request.markdown, run_id, tags)
    html_path = Path("outputs") / run_id / "blog_post.html"
    html_path.write_text(html, encoding="utf-8")
    return {"status": "saved", "md_chars": len(request.markdown)}
```

---

### Entry point from the pipeline

In Stage 3 of the pipeline page, add an **"Open Editor"** button alongside the existing Preview/Download buttons:

```tsx
<button onClick={() => router.push(`/blog-editor/${runId}`)}>
  <Edit3 size={12} /> Edit
</button>
```

---

### Files changed

| File | Change |
|---|---|
| `frontend/app/blog-editor/[run_id]/page.tsx` | NEW — full editor page |
| `backend/apps/api/v1/content.py` | ADD `PUT /{run_id}/blog-post` endpoint |
| `backend/apps/api/v1/schemas.py` | ADD `BlogPostUpdateRequest` |
| `frontend/lib/api.ts` | ADD `updateBlogPost`, `getBlogPostMd` already exists |
| `frontend/app/pipeline/page.tsx` | ADD "Open Editor" button in Stage 3 |

**New dependency:**
```bash
pnpm add @uiw/react-md-editor
```

---

### Verification

1. Navigate to `/blog-editor/{run_id}` — full Markdown loads into editor
2. Edit a heading → Save → Download HTML — new heading appears
3. Type in assistant: "Make the conclusion more memorable" — response appears
4. Select text in editor → "Edit selection" → assistant pre-fills with selection
5. Click "Apply" on assistant response → text replaced in editor

---

## 10. Instagram Auto-Publisher

### Research Summary

**API used:** Instagram Content Publishing API (part of Meta's Instagram Platform)

**The critical finding:** The API supports both **Business and Creator** professional accounts. A free Instagram Creator account qualifies. No payment to Meta is required — the API itself is free. However, there are significant setup prerequisites.

**Rate limit:** 100 API-published posts per 24-hour period per account. Carousels count as 1 post.

**Image requirement:** JPEG only. Our pipeline already outputs JPEG images (`slide_XX.jpg`). The PNG carousel slides are NOT the right format — we'd use the downloaded `images/slide_XX.jpg` files OR convert the PNGs to JPEG.

**Media hosting requirement:** Images must be on a **publicly accessible URL** at publish time. `localhost:8000` does not work. This is the single biggest constraint.

---

### Prerequisites (what you must do BEFORE any code is written)

**Step 1 — Convert your Instagram account to Professional (Creator)**
Settings → Account → Switch to Professional Account → Creator. Free, takes 2 minutes. You appear to already have this given the handle `@TheOpinionBoard`.

**Step 2 — Create a Meta Developer App**
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create an App → type: "Business"
3. Add "Instagram" product to the app
4. Note your `App ID` and `App Secret`

**Step 3 — Instagram Login setup**
In the app dashboard, configure Instagram Login with redirect URI pointing to your local server (or a hosted callback URL). Add permission: `instagram_business_content_publish` and `instagram_business_basic`.

**Step 4 — Get your Instagram User ID and Access Token**
Use the Instagram Login flow to get a long-lived User Access Token (valid 60 days). Get your Instagram User ID via `GET /me?fields=id,username`.

**Step 5 — Image hosting solution (the hardest part)**
Options:
- **Cloudflare R2** (free tier: 10GB storage, 0 egress fees) — upload PNGs, get public URLs
- **AWS S3** (free tier: 5GB for 12 months)
- **Cloudinary** (free tier: 25GB storage, 25GB bandwidth/month) — best option, also handles JPEG conversion
- **ngrok** for local testing only — exposes localhost temporarily

**Recommended: Cloudinary** — free tier is generous, has a Python SDK, handles JPEG conversion automatically, and images are CDN-served globally.

**Step 6 — App Review (for public use)**
If you only publish to your own account, App Review is NOT required. You can use Development Mode. This is sufficient for personal/brand use.

---

### Is it free? ✅ YES

- Meta's Instagram API: **Free**
- Cloudinary free tier: **Free** (25GB storage + 25GB bandwidth/month — enough for thousands of posts)
- The pipeline already runs locally — no server cost

The only ongoing cost would be image hosting if you exceed Cloudinary's free tier (unlikely for a personal brand).

---

### How publishing would work (full flow)

```
User selects carousel(s) to publish
         ↓
Backend: Read slide PNGs from outputs/{run_id}/content/angle_N/png/
         ↓
Upload PNGs to Cloudinary → get public HTTPS URLs (JPEG auto-converted)
         ↓
For each image URL:
  POST /{ig_user_id}/media → { image_url, is_carousel_item: true }
  → returns container_id
         ↓
POST /{ig_user_id}/media → {
  media_type: "CAROUSEL",
  children: [container_id_1, ..., container_id_12],
  caption: "{caption}\n\n{hashtags}"
}
→ returns carousel_container_id
         ↓
POST /{ig_user_id}/media_publish → { creation_id: carousel_container_id }
→ returns media_id (post is live!)
```

---

### Plan for implementation

**Phase A — Infrastructure setup (manual, one-time)**
1. Create Meta Developer App + configure Instagram Login
2. Set up Cloudinary account + get API credentials
3. Add to `.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `INSTAGRAM_USER_ID`, `INSTAGRAM_ACCESS_TOKEN`

**Phase B — Backend**

New file: `backend/core/tools/Instagram/instagram_publisher.py`

```python
import cloudinary
import cloudinary.uploader
import httpx

async def upload_image_to_cloudinary(local_path: str) -> str:
    """Upload PNG to Cloudinary, return public HTTPS URL (auto-JPEG conversion)."""
    result = cloudinary.uploader.upload(
        local_path,
        folder="content_studio",
        format="jpg",          # auto-convert PNG → JPEG
        quality="auto:good",
    )
    return result["secure_url"]

async def publish_carousel(
    run_id: str,
    angle_index: int,
    caption: str,
    hashtags: list[str],
    ig_user_id: str,
    access_token: str,
) -> dict:
    """Upload slides and publish as Instagram carousel. Returns post ID."""
    ...
```

New API endpoint: `POST /api/v1/content/{run_id}/publish`

```python
class PublishRequest(BaseModel):
    angle_index: int
    # ig_user_id and access_token loaded from settings (not passed by user)
```

**Phase C — Frontend**

In Stage 3 of the pipeline page, add a "Publish to Instagram" button per carousel:

```tsx
<button onClick={() => handlePublish(angleIdx)}>
  <Instagram size={14} /> Publish to Instagram
</button>
```

Shows a confirmation modal with:
- Carousel thumbnail strip (all 12 slides)
- Caption preview (editable before publishing)
- Hashtag list (editable)
- "Confirm & Publish" → calls `api.publishCarousel()`
- Post-publish: shows the Instagram post URL

---

### Files to create/modify

| File | Change |
|---|---|
| `backend/core/tools/Instagram/instagram_publisher.py` | NEW |
| `backend/apps/api/v1/content.py` | ADD `POST /{run_id}/publish` |
| `backend/configs/settings.py` | ADD Instagram + Cloudinary config fields |
| `backend/pyproject.toml` | ADD `cloudinary>=1.36` |
| `frontend/app/pipeline/page.tsx` | ADD Publish button + confirmation modal |
| `frontend/lib/api.ts` | ADD `publishCarousel()` |

---

### Limitations & risks

| Risk | Mitigation |
|---|---|
| Access token expires after 60 days | Backend auto-refresh using long-lived token refresh endpoint |
| Images must be publicly accessible | Cloudinary hosting; ngrok for local testing |
| 10 slides max per carousel | Our carousels are 12 slides — need to truncate to 10 or split into 2 posts |
| Carousel aspect ratio locked to first image | We use 1:1 (1080×1080) throughout — no issue |
| App review not needed for own account | Development Mode is sufficient |

**The 12-slide limit is the key constraint.** Instagram only allows 10 items per carousel. Options:
1. Publish slides 1-10, drop 11-12
2. Let user select which 10 slides to include
3. Publish as two separate posts (1-10 and 11-12)

Recommended: Option 2 — show a slide picker in the confirmation modal.

---

*Last updated: 2026-06-08*
