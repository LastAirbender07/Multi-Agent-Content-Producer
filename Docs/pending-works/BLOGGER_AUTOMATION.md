# Google Blogger Automation Plan

> **Blog:** https://theopinionboard07.blogspot.com/
> **API:** Google Blogger API v3
> **Goal:** Automatically publish HTML blog posts from the pipeline to Blogger
> **Created:** 2026-06-27

---

## Table of Contents

1. [What You Need (Prerequisites)](#1-what-you-need)
2. [One-Time Setup — Google Cloud](#2-one-time-setup--google-cloud)
3. [Authentication — How It Works](#3-authentication--how-it-works)
4. [Finding Your Blog ID](#4-finding-your-blog-id)
5. [API Reference](#5-api-reference)
6. [Backend Implementation Plan](#6-backend-implementation-plan)
7. [Credentials Storage](#7-credentials-storage)
8. [Step-by-Step Checklist](#8-step-by-step-checklist)
9. [Limitations & Caveats](#9-limitations--caveats)

---

## 1. What You Need

| Item | Where to get it | Required? |
|---|---|---|
| Google account owning the blog | You already have it | ✅ Yes |
| Google Cloud project | console.cloud.google.com | ✅ Yes |
| Blogger API enabled | Cloud Console → APIs | ✅ Yes |
| OAuth 2.0 Client ID (Desktop type) | Cloud Console → Credentials | ✅ Yes |
| `client_secret.json` file | Downloaded from Credentials page | ✅ Yes |
| `token.json` file (auto-generated) | Generated on first run | ✅ Yes (auto) |
| Blog ID of your blogspot | From API or Blogger settings | ✅ Yes |
| `google-auth-oauthlib` Python package | `pip install` | ✅ Yes |
| `google-api-python-client` package | `pip install` | ✅ Yes |

**Important note on service accounts:** The Blogger API does **not** support service accounts for personal blogs. Service accounts are for Google Workspace domains. For a personal blogspot account you must use **OAuth 2.0 with a real Google user login**. This means a one-time manual browser login is required, after which a `token.json` refresh token keeps things running automatically.

---

## 2. One-Time Setup — Google Cloud

### Step 1 — Create / select a project

1. Go to https://console.cloud.google.com/
2. Click the project selector at the top → **New Project**
3. Name it e.g. `content-studio-ai`
4. Click **Create**

### Step 2 — Enable the Blogger API

1. In the Cloud Console, go to **APIs & Services → Library**
2. Search for **"Blogger API v3"**
3. Click it → **Enable**

### Step 3 — Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** (for personal Google accounts)
3. Fill in:
   - App name: `Content Studio AI`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. On **Scopes** page: click **Add or Remove Scopes**
   - Search for `blogger`
   - Add: `https://www.googleapis.com/auth/blogger`
6. Click **Save and Continue**
7. On **Test Users** page: add your Google account email
   - **This is critical** — while the app is in "Testing" mode, only listed users can authenticate
8. Click **Save and Continue** → **Back to Dashboard**

> **Publishing the app:** You do NOT need to publish the app to production. Keeping it in "Testing" mode is fine for personal automation. Published apps require Google verification (weeks-long process). In testing mode, tokens expire after 7 days — see §9 for the workaround.

### Step 4 — Create OAuth 2.0 credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Desktop app**
4. Name: `Content Studio CLI`
5. Click **Create**
6. **Download the JSON file** → rename it `client_secret.json`
7. Store it at `backend/credentials/blogger_client_secret.json`

---

## 3. Authentication — How It Works

```
First run (one-time, manual):
  1. Backend calls google-auth-oauthlib → opens browser URL
  2. You log in with your Google account
  3. You click "Allow" on the consent screen
  4. Google redirects with an authorization code
  5. Library exchanges code for access_token + refresh_token
  6. Library saves both to token.json

All subsequent runs (fully automatic):
  1. Backend loads token.json
  2. If access_token is expired (1 hour TTL) → library auto-refreshes using refresh_token
  3. refresh_token never expires (unless app is in Testing mode — see §9)
  4. No human interaction needed
```

### Token files

| File | Contents | Lifetime | Security |
|---|---|---|---|
| `client_secret.json` | Client ID + client secret (not a user secret) | Permanent | Store in repo if needed |
| `token.json` | Access token + **refresh token** | Access: 1h, Refresh: permanent* | **Never commit to git** |

*Refresh tokens in "Testing" mode expire after 7 days. See §9 for the fix.

---

## 4. Finding Your Blog ID

Your blog URL is `https://theopinionboard07.blogspot.com/`.

**Method A — Blogger Settings (easiest):**
1. Go to https://www.blogger.com/
2. Click your blog → Settings
3. Under "Basic", the **Blog ID** is shown at the bottom of the page (a long number like `1234567890123456789`)

**Method B — Via the API (once credentials are set up):**
```python
service = build("blogger", "v3", credentials=creds)
blog = service.blogs().getByUrl(url="https://theopinionboard07.blogspot.com/").execute()
blog_id = blog["id"]
print(blog_id)  # → "1234567890123456789"
```

**Method C — From the URL in Blogger dashboard:**
When editing your blog, the URL looks like:
`https://www.blogger.com/blog/posts/1234567890123456789`
The number is your Blog ID.

---

## 5. API Reference

### Base URL
```
https://www.googleapis.com/blogger/v3
```

### Insert (create) a post

```
POST /blogs/{blogId}/posts
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request body:**
```json
{
  "kind": "blogger#post",
  "title": "Post Title Here",
  "content": "<h1>Hello</h1><p>Full HTML content here</p>",
  "labels": ["tag1", "tag2"]
}
```

**Optional query parameters:**
| Parameter | Type | Description |
|---|---|---|
| `isDraft` | boolean | If `true`, saves as draft instead of publishing immediately |
| `fetchBody` | boolean | Whether to include full content in response (default: true) |
| `fetchImages` | boolean | Whether to include image info in response |

**Successful response (HTTP 200):**
```json
{
  "kind": "blogger#post",
  "id": "3231065987572556728",
  "blog": { "id": "YOUR_BLOG_ID" },
  "published": "2026-06-27T10:00:00+05:30",
  "updated": "2026-06-27T10:00:00+05:30",
  "url": "https://theopinionboard07.blogspot.com/2026/06/post-title-here.html",
  "selfLink": "https://www.googleapis.com/blogger/v3/blogs/.../posts/...",
  "title": "Post Title Here",
  "content": "<h1>Hello</h1>...",
  "author": { "id": "...", "displayName": "...", "url": "...", "image": {...} },
  "status": "LIVE"
}
```

### Other useful endpoints

| Operation | Method | Path |
|---|---|---|
| List all posts | GET | `/blogs/{blogId}/posts` |
| Get one post | GET | `/blogs/{blogId}/posts/{postId}` |
| Update post | PUT | `/blogs/{blogId}/posts/{postId}` |
| Delete post | DELETE | `/blogs/{blogId}/posts/{postId}` |
| Get blog info | GET | `/blogs/{blogId}` |
| Find blog by URL | GET | `/blogs/byurl?url={blogUrl}` |

### Quota
- **Free tier:** 10,000 requests per day (per project)
- **Per-user rate limit:** 1 request per second
- No paid quota increase available — Blogger API is free-only

---

## 6. Backend Implementation Plan

### New files to create

```
backend/
  credentials/
    blogger_client_secret.json    ← downloaded from Google Cloud
    blogger_token.json            ← auto-generated on first auth (gitignored)
  core/services/
    blogger_service.py            ← main service
  apps/api/v1/
    publishing.py                 ← FastAPI router
```

### `blogger_service.py` — skeleton

```python
"""
Blogger publishing service.

First-run authentication opens a browser for one-time OAuth consent.
Subsequent runs use the cached refresh token in blogger_token.json.
"""
import json
from pathlib import Path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

SCOPES = ["https://www.googleapis.com/auth/blogger"]
_BACKEND_ROOT    = Path(__file__).parents[2]
_CLIENT_SECRET   = _BACKEND_ROOT / "credentials" / "blogger_client_secret.json"
_TOKEN_FILE      = _BACKEND_ROOT / "credentials" / "blogger_token.json"
_BLOG_ID         = "YOUR_BLOG_ID_HERE"  # from §4


def _get_credentials() -> Credentials:
    """Load credentials from token file, refresh if expired, run OAuth flow if absent."""
    creds = None
    if _TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(_TOKEN_FILE), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # First run: opens browser for OAuth consent
            flow = InstalledAppFlow.from_client_secrets_file(str(_CLIENT_SECRET), SCOPES)
            creds = flow.run_local_server(port=0)
        _TOKEN_FILE.write_text(creds.to_json())
    return creds


def publish_post(
    title: str,
    html_content: str,
    labels: list[str] | None = None,
    is_draft: bool = False,
) -> dict:
    """
    Publish an HTML post to Blogger.

    Returns the full post object including the live URL.
    """
    creds   = _get_credentials()
    service = build("blogger", "v3", credentials=creds)

    body = {
        "kind":    "blogger#post",
        "title":   title,
        "content": html_content,
    }
    if labels:
        body["labels"] = labels

    result = (
        service.posts()
        .insert(blogId=_BLOG_ID, body=body, isDraft=is_draft)
        .execute()
    )
    return {
        "post_id":   result["id"],
        "url":       result.get("url"),
        "title":     result["title"],
        "status":    result.get("status", "LIVE"),
        "published": result.get("published"),
    }
```

### `publishing.py` — FastAPI router

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.services.blogger_service import publish_post

router = APIRouter(prefix="/publishing", tags=["publishing"])


class BloggerPostRequest(BaseModel):
    title: str
    html_content: str
    labels: list[str] = []
    is_draft: bool = False


@router.post("/blogger")
async def publish_to_blogger(body: BloggerPostRequest) -> dict:
    """Publish an HTML post to Google Blogger."""
    try:
        result = publish_post(
            title=body.title,
            html_content=body.html_content,
            labels=body.labels,
            is_draft=body.is_draft,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Python packages needed

```bash
pip install google-api-python-client google-auth-oauthlib google-auth-httplib2
```

Add to `backend/pyproject.toml`:
```toml
"google-api-python-client>=2.0",
"google-auth-oauthlib>=1.0",
"google-auth-httplib2>=0.2",
```

### Wiring into main.py

```python
from apps.api.v1.publishing import router as publishing_router
app.include_router(publishing_router, prefix="/api/v1")
```

---

## 7. Credentials Storage

```
backend/credentials/           ← gitignored directory
  blogger_client_secret.json   ← safe to commit (it's just an app ID, not a user secret)
  blogger_token.json            ← NEVER commit — contains your refresh token
```

Add to `.gitignore`:
```
backend/credentials/blogger_token.json
```

Add to `backend/configs/settings.py`:
```python
blogger_blog_id: str = ""      # set in .env: BLOGGER_BLOG_ID=12345...
blogger_enabled: bool = False  # set to True when credentials are configured
```

---

## 8. Step-by-Step Checklist

```
□ 1. Go to console.cloud.google.com → create project "content-studio-ai"
□ 2. Enable "Blogger API v3" in APIs & Services → Library
□ 3. Configure OAuth consent screen:
     - External user type
     - Add scope: https://www.googleapis.com/auth/blogger
     - Add your Google account as test user
□ 4. Create OAuth 2.0 credential (Desktop app type)
     - Download client_secret.json
     - Save to backend/credentials/blogger_client_secret.json
□ 5. Find your Blog ID from Blogger settings
     - Set BLOGGER_BLOG_ID in backend/.env
□ 6. Install Python packages:
     pip install google-api-python-client google-auth-oauthlib
□ 7. Create backend/core/services/blogger_service.py
□ 8. Create backend/apps/api/v1/publishing.py
□ 9. Wire router into main.py
□ 10. Run backend → call POST /api/v1/publishing/blogger once with any test payload
      → browser opens → log in with Google → click Allow
      → token.json is saved → automation is now fully headless
□ 11. Test end-to-end: run pipeline → call publish endpoint → verify post on blogspot
```

---

## 9. Limitations & Caveats

### Token expiry in "Testing" mode (most important caveat)

When the OAuth consent screen is in **Testing** mode, Google expires refresh tokens after **7 days**. After that, the next automated run fails with an "invalid_grant" error and requires another manual browser login.

**Solutions (pick one):**

| Option | Description | Effort |
|---|---|---|
| **Recommended:** Re-auth every 7 days | Run a script locally that triggers the OAuth flow, takes 30 seconds | Minimal |
| Publish the OAuth app | Go through Google's app verification process (weeks, requires privacy policy URL) | High |
| Use a scheduled re-auth | Add a cron job that runs the auth script every 6 days | Medium |

The simplest approach for a personal tool: keep a `re_auth.py` script at the backend root:
```python
# re_auth.py — run this every ~7 days if token.json expires
from core.services.blogger_service import _get_credentials
_get_credentials()  # opens browser if needed
print("Token refreshed.")
```

### HTML content notes

- Blogger accepts raw HTML in the `content` field
- External images must be publicly accessible URLs (Blogger won't host them)
- Blogger strips `<script>` tags and some CSS for security
- The blog post HTML from the pipeline (`blog_post.html`) can be posted directly, but strip the full `<html>/<head>/<body>` wrapper — send only the inner body content

### Blogger API does not support

- Uploading images (use the Picasa/Photos API separately, or link to existing hosted images)
- Custom post slugs (Blogger auto-generates from title)
- Scheduling posts for a future time (not exposed in v3 API)
- Multiple blogs in one request

---

## 10. Frontend Integration (Future)

Once the backend endpoint is live, a "Publish to Blogger" button can be added to:

- `CarouselViewer` (pipeline page) — below the Download/Caption row
- `BlogExportBar` (pipeline page, Stage 3) — alongside the existing Preview/Markdown/HTML buttons

The API call from the frontend:
```typescript
await fetch("/api/v1/publishing/blogger", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: topic,
    html_content: blogPostHtml,   // from api.getBlogPostHtml(runId)
    labels: ["AI", "Content"],
    is_draft: false,
  }),
});
```
