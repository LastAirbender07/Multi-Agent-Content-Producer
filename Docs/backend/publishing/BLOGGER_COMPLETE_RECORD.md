# Blogger Auto-Publishing — Complete Record

> **Status:** Live ✅
> **Blog:** https://theopinionboard07.blogspot.com/
> **Created:** 2026-06-27
> **Related:** `Docs/publishing/`

---

## What It Does

Every time the pipeline completes a content run, the blog post that is auto-generated from the research and carousel content can be published directly to **The Opinion Board** on Blogspot with one click. No copy-paste, no browser tab switching, no logging into Blogger — the "Publish to Blogger" button in Stage 3 of the pipeline sends the full HTML post live.

---

## How It Works (End to End)

```
Pipeline completes Stage 3
  └─ Blog post HTML is generated at outputs/runs/{run_id}/blog_post.html
        └─ User clicks "Publish to Blogger" in BlogExportBar
              └─ Frontend: fetches blog_post.html → strips <html>/<head>/<body> wrapper → sends to backend
                    └─ POST /api/v1/publishing/blogger
                          └─ blogger_service.py loads OAuth token → calls Blogger API v3
                                └─ Post goes LIVE at theopinionboard07.blogspot.com
                                      └─ "Published! View post ↗" link appears in the UI
```

---

## What You Need (Already Set Up)

| Item | Location | Status |
|---|---|---|
| OAuth Desktop app credentials | `backend/credentials.json` | ✅ Present |
| Auth token (auto-generated) | `backend/blogger_token.json` | ✅ Auto-created |
| Blog ID | `backend/configs/settings.py` → `blogger_blog_id` | ✅ Set (`6023278394905228473`) |
| Client ID + Secret | `backend/.env` | ✅ Set |
| Python packages | `pyproject.toml` | ✅ Installed |

---

## Authentication — The One Thing to Know

Google requires OAuth 2.0 for write operations (API keys only work for reading). The auth flow:

- **First time ever:** Opens a browser tab → you log in → click Allow → `blogger_token.json` is saved
- **Every time after that:** Fully automatic. The library silently refreshes the token in the background

**Token expiry:** Because the OAuth app is in "Testing" mode (not published to production), refresh tokens expire after **7 days**. When that happens, the publish button will show an error saying to run `re_auth.py`. Just run it from the backend directory — it opens a browser tab, you click Allow, done in 30 seconds.

```bash
# Run this if you see a "token expired" error
cd backend && python re_auth.py
```

---

## Error Messages & What They Mean

The publish button shows a clear error banner if anything goes wrong:

| Error shown | What actually happened |
|---|---|
| "OAuth credentials file missing" | `credentials.json` was deleted from backend root |
| "Your Google auth token has expired" | 7-day Testing mode limit hit — run `re_auth.py` |
| "Blog ID not configured" | `BLOGGER_BLOG_ID` missing from `.env` |
| "Permission denied (403)" | Your Google account not added as Test User in Cloud Console |
| "Authentication failed (401)" | Token is invalid — restart the backend |
| "Blog post HTML not found" | Blog wasn't generated yet for this run |
| "Cannot reach the backend" | Backend server not running |

All errors have a **Retry** button. No page reload needed.

---

## Files Involved

| File | Purpose |
|---|---|
| `backend/core/services/blogger_service.py` | OAuth auth, token management, Blogger API v3 calls |
| `backend/apps/api/v1/publishing.py` | FastAPI endpoints: `POST /publishing/blogger`, `GET /publishing/blogger/status` |
| `backend/credentials.json` | OAuth Desktop app client secret (from Google Cloud Console) |
| `backend/blogger_token.json` | Auto-generated OAuth token — **gitignored, never commit** |
| `backend/re_auth.py` | One-liner to refresh the token when it expires |
| `frontend/components/pipeline/BlogExportBar.tsx` | UI: Publish button, loading state, success link, error banner |
| `frontend/lib/api/content.ts` | `publishToBlogger()` and `getBloggerStatus()` API methods |

---

## API Endpoints

```
GET  /api/v1/publishing/blogger/status
     → { configured, blog: { name, url, posts } }
     → use to verify credentials are working

POST /api/v1/publishing/blogger
     Body: { title, html_content, labels[], is_draft }
     → { post_id, url, title, status, published }
```

---

## Limitations

- **Images in the post** must be publicly accessible URLs — Blogger won't upload images, it just embeds them. The blog post generator uses CDN URLs from Pexels/DDGS which are public, so this works automatically.
- **No scheduled publishing** — Blogger API v3 doesn't expose a publish-at-time option. Posts go live immediately when `is_draft: false`.
- **No custom URL slug** — Blogger auto-generates the post URL from the title.
- **7-day token refresh** while the OAuth app is in Testing mode. Running `re_auth.py` once a week takes 30 seconds.

---

## re_auth.py (token refresh script)

Located at `backend/re_auth.py`. Run this if you see a token expiry error:

```python
# re_auth.py
import sys
sys.path.insert(0, ".")
from core.services.blogger_service import _get_credentials
creds = _get_credentials()
print("Token refreshed successfully.")
```
