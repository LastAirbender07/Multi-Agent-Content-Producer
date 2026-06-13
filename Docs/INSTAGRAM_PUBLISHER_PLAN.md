# Instagram Auto-Publisher — Dedicated Analysis & Implementation Plan

> Status: DEFERRED — build this when ready. All analysis and prerequisites documented here.
> Last updated: 2026-06-08

---

## 1. Is This Worth Building?

### What it solves
Currently: generate carousel → manually download PNGs → open Instagram → upload → write caption → paste hashtags → post. That's ~10 manual steps per carousel. With 3 angles per run, that's 30 steps.

With the publisher: select carousel → click Publish → done. 2 steps.

### The blockers (honest assessment)

**Blocker 1 — 10-slide limit (hard)**
Instagram allows maximum 10 items per carousel. Our carousels have 12 slides. There's no workaround — the API enforces this at the container creation step. Options:
- Pick the best 10 slides (user selects via a picker UI)
- Split into two posts (messy, breaks narrative arc)
- Reduce carousel length to 10 max in the pipeline (permanent change to all carousels)

**Recommended:** Keep 12-slide carousels (they work great for manual posting and the blog). For API publishing, show a 10-slide picker in the confirmation modal.

**Blocker 2 — Public image hosting (required)**
Meta's API fetches images from a public URL at publish time. `localhost:8000` does not work. Options evaluated:

| Option | Free? | Effort | Notes |
|---|---|---|---|
| **Cloudinary** | ✅ Free tier (25GB storage, 25GB BW/mo) | Low — Python SDK | Best option. Auto-converts PNG→JPEG, CDN-served, built for this |
| **GitHub raw URLs** | ✅ Free | Medium — must commit PNGs to git | Works technically. `raw.githubusercontent.com/user/repo/main/path.png` returns the file. BUT: not designed for CDN use, binary files in git repo is bad practice, rate-limited by GitHub for heavy use. **OK for testing, not production** |
| **Cloudflare R2** | ✅ Free tier (10GB, 0 egress) | Medium — needs account + SDK | Good alternative to Cloudinary, no egress fees |
| **ngrok** | ✅ Free (with limits) | Low — just run `ngrok http 8000` | Exposes localhost temporarily. Perfect for testing but session dies after 8 hours. Never for production |
| **AWS S3** | 💰 Free 12mo then paid | Medium | Overkill |

**Verdict:** Cloudinary for production. GitHub raw URLs for initial testing only (commit the 10 selected PNGs to a private repo temporarily, get URLs, post, delete).

**Blocker 3 — Account type**
Regular personal Instagram account → API not supported. You need:
- **Instagram Professional account** (Business or Creator) — free, 2-minute switch in settings
- Creator account **works** — the API explicitly supports Creator accounts

**Your `@TheOpinionBoard` account**: if it's currently a Creator or Business professional account, you're ready. If it's personal, switch it first.

---

## 2. Full Technical Prerequisites (Manual Steps — One-Time)

These cannot be automated. Do them in order.

### Step 1 — Switch Instagram to Professional (if not already)
Instagram app → Settings → Account → Switch to Professional Account → Creator → Choose category (e.g. "Media/News") → Done.
Cost: Free. Time: 2 minutes.

### Step 2 — Create a Meta Developer App
1. Go to https://developers.facebook.com → Log in with Facebook
2. My Apps → Create App
3. App type: **Business**
4. App name: "TheOpinionBoard Publisher" (anything)
5. Add product: **Instagram**
6. Note your `App ID` and `App Secret`

### Step 3 — Configure Instagram Login
In the App Dashboard:
1. Products → Instagram → Settings
2. Valid OAuth Redirect URIs: add `http://localhost:8000/auth/instagram/callback`
3. Required permissions to add:
   - `instagram_business_basic`
   - `instagram_business_content_publish`
4. Save

### Step 4 — Get your Instagram User ID and Access Token
This is a one-time browser flow:

**a) Build the auth URL:**
```
https://api.instagram.com/oauth/authorize
  ?client_id={APP_ID}
  &redirect_uri=http://localhost:8000/auth/instagram/callback
  &scope=instagram_business_basic,instagram_business_content_publish
  &response_type=code
```

**b) Open it in a browser** → authorize → you get redirected to localhost with `?code=ABC123`

**c) Exchange code for short-lived token:**
```bash
curl -X POST https://api.instagram.com/oauth/access_token \
  -F client_id={APP_ID} \
  -F client_secret={APP_SECRET} \
  -F grant_type=authorization_code \
  -F redirect_uri=http://localhost:8000/auth/instagram/callback \
  -F code={CODE_FROM_URL}
```
Returns: `{"access_token": "...", "user_id": 123456789}`

**d) Exchange for long-lived token (valid 60 days):**
```bash
curl "https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret={APP_SECRET}&access_token={SHORT_TOKEN}"
```
Returns: `{"access_token": "...", "token_type": "bearer", "expires_in": 5183944}`

**e) Note down:**
- `INSTAGRAM_USER_ID` (the numeric user_id from step c)
- `INSTAGRAM_ACCESS_TOKEN` (the long-lived token from step d)

### Step 5 — Set up Cloudinary
1. Sign up at https://cloudinary.com (free tier — no credit card needed)
2. Dashboard → Settings → API Keys → copy `Cloud Name`, `API Key`, `API Secret`

### Step 6 — Add to `.env`
```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
INSTAGRAM_USER_ID=123456789
INSTAGRAM_ACCESS_TOKEN=IGQVJxxxxxx...
```

---

## 3. How the Publish Flow Works

```
User selects a carousel in Stage 3 of Pipeline page
             ↓
"Publish to Instagram" button → opens confirmation modal
             ↓
Modal shows:
  - 12 slide thumbnails with checkboxes (max 10 selectable)
  - Caption (pre-filled from carousel.json, editable)
  - Hashtags (pre-filled, editable)
  - "Confirm & Publish" button
             ↓
Backend: POST /api/v1/content/{run_id}/publish
  1. Read selected slide PNGs from disk
  2. Upload each to Cloudinary (auto-converts PNG → JPEG, returns CDN URL)
  3. For each CDN URL:
       POST /{ig_user_id}/media
         { image_url: url, is_carousel_item: true }
       → returns container_id
  4. POST /{ig_user_id}/media
       { media_type: "CAROUSEL",
         children: [id1, id2, ..., id10],
         caption: "caption\n\nhashtag1 hashtag2..." }
       → returns carousel_container_id
  5. POST /{ig_user_id}/media_publish
       { creation_id: carousel_container_id }
       → returns media_id (post is live!)
             ↓
Response: { post_id, permalink }
Frontend shows: "✅ Posted! View on Instagram →"
```

---

## 4. Token Auto-Refresh

Long-lived tokens expire after 60 days. The backend checks before each publish:

```python
# backend/core/tools/Instagram/token_manager.py

import json, time
from pathlib import Path

TOKEN_FILE = Path(__file__).parents[3] / ".instagram_token"

def load_token() -> dict:
    if TOKEN_FILE.exists():
        return json.loads(TOKEN_FILE.read_text())
    return {}

def save_token(access_token: str, expires_in_seconds: int):
    TOKEN_FILE.write_text(json.dumps({
        "access_token": access_token,
        "expires_at": time.time() + expires_in_seconds
    }))

async def get_valid_token(settings) -> str:
    data = load_token()
    # If token expires within 7 days, refresh it
    if data and data.get("expires_at", 0) - time.time() < 7 * 86400:
        import httpx
        resp = await httpx.AsyncClient().get(
            "https://graph.instagram.com/refresh_access_token",
            params={
                "grant_type": "ig_refresh_token",
                "access_token": data["access_token"]
            }
        )
        new = resp.json()
        save_token(new["access_token"], new["expires_in"])
        return new["access_token"]
    return data.get("access_token") or settings.instagram_access_token
```

---

## 5. Implementation Plan (when ready to build)

### New files
| File | Purpose |
|---|---|
| `backend/core/tools/Instagram/__init__.py` | Package init |
| `backend/core/tools/Instagram/instagram_publisher.py` | Cloudinary upload + Meta API calls |
| `backend/core/tools/Instagram/token_manager.py` | Token load/save/refresh |

### Modified files
| File | Change |
|---|---|
| `backend/apps/api/v1/content.py` | Add `POST /{run_id}/publish` endpoint |
| `backend/apps/api/v1/schemas.py` | Add `PublishRequest`, `PublishResponse`, `SlideSelection` |
| `backend/configs/settings.py` | Add `instagram_user_id`, `instagram_access_token`, Cloudinary fields |
| `backend/pyproject.toml` | Add `cloudinary>=1.36` |
| `frontend/app/pipeline/page.tsx` | Add Publish button + confirmation modal |
| `frontend/lib/api.ts` | Add `publishCarousel()` |

### New `PublishRequest` schema
```python
class SlideSelection(BaseModel):
    slide_number: int
    png_path: str

class PublishRequest(BaseModel):
    angle_index: int
    selected_slides: list[SlideSelection]  # exactly 1-10 items
    caption: str
    hashtags: list[str]

class PublishResponse(BaseModel):
    post_id: str
    permalink: str
    error: str | None = None
```

### Confirmation modal (frontend)
```
┌─────────────────────────────────────────────────┐
│  Publish to Instagram              [✕ Close]     │
│  ───────────────────────────────────────────     │
│  Select up to 10 slides:                        │
│  [✓][✓][✓][✓][✓][✓][✓][✓][✓][✓][ ][ ]         │
│   1  2  3  4  5  6  7  8  9 10 11 12           │
│  10/10 selected                                 │
│  ───────────────────────────────────────────     │
│  Caption:                                        │
│  [textarea — editable, pre-filled]               │
│  ───────────────────────────────────────────     │
│  Hashtags:                                       │
│  #AgenticAI #SAP #EnterpriseAI [+ add]           │
│  ───────────────────────────────────────────     │
│                    [Confirm & Publish →]          │
└─────────────────────────────────────────────────┘
```

---

## 6. Rate Limits & Constraints

| Constraint | Value | Impact |
|---|---|---|
| Posts per 24 hours | 100 | Not a concern for personal brand |
| Slides per carousel | 10 max | Need slide picker (our carousels have 12) |
| Image format | JPEG only | Cloudinary auto-converts PNG → JPEG |
| Image aspect ratio | Locked to first slide (1:1) | No issue — all our slides are 1080×1080 |
| Token expiry | 60 days | Auto-refresh implemented |
| App Review | Not needed for own account | Personal use = Development Mode only |

---

## 7. Testing Strategy

### Phase 1 — Test with GitHub raw URLs (no Cloudinary setup needed)
1. Run a pipeline, get PNGs in `outputs/{run_id}/content/angle_0/png/`
2. Commit 10 of them to a public GitHub repo temporarily
3. Use `https://raw.githubusercontent.com/{user}/{repo}/main/{filename}.png` as image URLs
4. Manually call the Meta API via curl to create containers and publish
5. Confirm the post appears on Instagram

This validates the entire API flow before any code is written.

### Phase 2 — Integrate Cloudinary
Set up account, test upload via Python `cloudinary.uploader.upload()`, confirm URLs are accessible.

### Phase 3 — Build the endpoint and UI

---

## 8. Decision Checklist (Before Starting Implementation)

- [ ] Instagram account switched to Professional (Creator)
- [ ] Meta Developer App created and configured
- [ ] Long-lived access token obtained and in `.env`
- [ ] Instagram User ID noted and in `.env`
- [ ] Cloudinary account created and credentials in `.env`
- [ ] Manual curl test with GitHub raw URLs confirmed working
- [ ] Decision made: reduce carousel to 10 slides permanently, OR use slide picker
