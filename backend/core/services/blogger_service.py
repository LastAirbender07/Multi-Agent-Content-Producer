"""
Blogger publishing service.

Authentication flow:
  First run  → opens browser for one-time OAuth consent → saves blogger_token.json
  All subsequent runs → auto-refreshes the token silently (no browser needed)

The credentials.json file (Desktop app OAuth client) lives at the backend root.
The blogger_token.json is generated automatically and must never be committed to git.
"""

import re
from pathlib import Path
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]

_SCOPES = ["https://www.googleapis.com/auth/blogger"]
_CREDENTIALS_FILE = _BACKEND_ROOT / _settings.blogger_credentials_file
_TOKEN_FILE       = _BACKEND_ROOT / _settings.blogger_token_file


# ── Title extraction ──────────────────────────────────────────────────────────

def extract_blog_title(html: str, fallback: str = "") -> str:
    """Extract a clean title from blog HTML.

    Priority:
    1. First <h1> tag content (the crafted blog headline)
    2. <title> tag in <head>
    3. fallback (raw topic / run ID)
    """
    # First <h1> — strip any inner HTML tags (e.g. <span>, <strong>)
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    if h1:
        text = re.sub(r"<[^>]+>", "", h1.group(1)).strip()
        if text:
            return text

    # <title> tag fallback
    title = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if title:
        text = title.group(1).strip()
        if text:
            return text

    return fallback

def _get_credentials() -> Credentials:
    """Load credentials from token file. Auto-refresh if expired. Run OAuth flow if absent.

    On first call: opens a browser tab for Google OAuth consent (one-time, ~30 seconds).
    On all subsequent calls: silently refreshes the access token using the stored refresh token.
    """
    creds: Optional[Credentials] = None

    if _TOKEN_FILE.exists():
        try:
            creds = Credentials.from_authorized_user_file(str(_TOKEN_FILE), _SCOPES)
        except Exception as e:
            logger.warning("blogger_token_load_failed", error=str(e))

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("blogger_token_refresh")
            creds.refresh(Request())
        else:
            if not _CREDENTIALS_FILE.exists():
                raise FileNotFoundError(
                    f"OAuth client secret not found at {_CREDENTIALS_FILE}. "
                    "Download the Desktop app credentials from Google Cloud Console and save as credentials.json."
                )
            logger.info("blogger_oauth_flow_starting", credentials_file=str(_CREDENTIALS_FILE))
            flow  = InstalledAppFlow.from_client_secrets_file(str(_CREDENTIALS_FILE), _SCOPES)
            creds = flow.run_local_server(port=0)
            logger.info("blogger_oauth_flow_complete")

        _TOKEN_FILE.write_text(creds.to_json(), encoding="utf-8")
        logger.info("blogger_token_saved", path=str(_TOKEN_FILE))

    return creds


# ── Core publish function ─────────────────────────────────────────────────────

def publish_post(
    title: str,
    html_content: str,
    labels: list[str] | None = None,
    is_draft: bool = False,
    blog_id: str | None = None,
) -> dict:
    """Publish an HTML post to Google Blogger.

    Args:
        title:        Post title.
        html_content: Full HTML body of the post (inner body content, no <html>/<head> wrapper).
        labels:       List of tag labels (optional).
        is_draft:     If True, saves as draft instead of publishing immediately.
        blog_id:      Override the default blog ID from settings.

    Returns:
        {
            "post_id":   str,
            "url":       str,   # live URL of the published post
            "title":     str,
            "status":    "LIVE" | "DRAFT",
            "published": str,   # ISO 8601 timestamp
        }
    """
    target_blog_id = blog_id or _settings.blogger_blog_id
    if not target_blog_id:
        raise ValueError("blogger_blog_id not configured. Set BLOGGER_BLOG_ID in .env.")

    creds   = _get_credentials()
    service = build("blogger", "v3", credentials=creds)

    body: dict = {
        "kind":    "blogger#post",
        "title":   title,
        "content": html_content,
    }
    if labels:
        body["labels"] = labels

    try:
        result = (
            service.posts()
            .insert(blogId=target_blog_id, body=body, isDraft=is_draft)
            .execute()
        )
    except HttpError as e:
        logger.error("blogger_publish_failed", status=e.status_code, error=str(e))
        raise

    logger.info(
        "blogger_post_published",
        post_id=result["id"],
        url=result.get("url"),
        is_draft=is_draft,
    )
    return {
        "post_id":   result["id"],
        "url":       result.get("url", ""),
        "title":     result["title"],
        "status":    result.get("status", "LIVE"),
        "published": result.get("published", ""),
    }


def get_blog_info(blog_id: str | None = None) -> dict:
    """Fetch metadata for the configured blog. Useful for verifying credentials."""
    target_blog_id = blog_id or _settings.blogger_blog_id
    creds   = _get_credentials()
    service = build("blogger", "v3", credentials=creds)
    result  = service.blogs().get(blogId=target_blog_id).execute()
    return {
        "blog_id":  result["id"],
        "name":     result.get("name"),
        "url":      result.get("url"),
        "posts":    result.get("posts", {}).get("totalItems", 0),
    }


def is_configured() -> bool:
    """Return True if the OAuth credentials file exists (not whether the token is valid)."""
    return _CREDENTIALS_FILE.exists()
