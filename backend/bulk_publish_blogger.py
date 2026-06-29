"""
bulk_publish_blogger.py — Publish all existing blog_post.html files to Blogger.

Usage:
    cd backend
    python bulk_publish_blogger.py [--dry-run]

Safe to re-run: published_runs.json tracks what's already live — no duplicates.
"""

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from googleapiclient.errors import HttpError
from core.services.blogger_service import publish_post, extract_blog_title
from configs.settings import get_settings

_settings     = get_settings()
_OUTPUTS_ROOT = Path(__file__).parent / _settings.content_output_dir
_BLOG_ID      = _settings.blogger_blog_id

SKIP_PREFIXES        = ["83d29269"]
PUBLISHED_LOG        = Path(__file__).parent / "published_runs.json"
DELAY_BETWEEN_POSTS  = 6      # seconds — safe within Blogger's ~10 req/min burst
MAX_RETRIES          = 4
RETRY_BASE_WAIT      = 10     # seconds — doubles each retry: 10→20→40→80

DRY_RUN = "--dry-run" in sys.argv


def _load_published() -> dict:
    if PUBLISHED_LOG.exists():
        try:
            return json.loads(PUBLISHED_LOG.read_text())
        except Exception:
            pass
    return {}


def _save_published(log: dict) -> None:
    PUBLISHED_LOG.write_text(json.dumps(log, indent=2), encoding="utf-8")


def _get_hashtags(run_dir: Path, angle_index: int = 0) -> list[str]:
    carousel_path = run_dir / "content" / f"angle_{angle_index}" / "carousel.json"
    if not carousel_path.exists():
        return []
    try:
        data = json.loads(carousel_path.read_text())
        return [t.lstrip("#") for t in data.get("hashtags", []) if t][:20]
    except Exception:
        return []


def _get_topic(run_dir: Path) -> str:
    """Raw user query — used only as fallback title."""
    rr = run_dir / "research" / "research_result.json"
    if rr.exists():
        try:
            return json.loads(rr.read_text()).get("topic", "") or run_dir.name
        except Exception:
            pass
    return run_dir.name


def _should_skip(run_id: str) -> bool:
    return any(run_id.startswith(p) for p in SKIP_PREFIXES)


def _publish_with_retry(title: str, body_html: str, labels: list[str]) -> dict:
    wait = RETRY_BASE_WAIT
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return publish_post(title=title, html_content=body_html,
                                labels=labels, is_draft=False, blog_id=_BLOG_ID)
        except HttpError as e:
            if e.status_code == 429 and attempt < MAX_RETRIES:
                print(f"         ⏳ Rate limited. Waiting {wait}s (retry {attempt}/{MAX_RETRIES - 1})…")
                time.sleep(wait)
                wait *= 2
            else:
                raise
    raise RuntimeError("Max retries exceeded")


def main() -> None:
    if not _OUTPUTS_ROOT.exists():
        print(f"ERROR: outputs directory not found at {_OUTPUTS_ROOT}")
        sys.exit(1)

    published_log = _load_published()
    candidates    = [d for d in sorted(_OUTPUTS_ROOT.iterdir())
                     if d.is_dir() and (d / "blog_post.html").exists()]

    to_skip_manual  = [d for d in candidates if _should_skip(d.name)]
    to_skip_already = [d for d in candidates if not _should_skip(d.name) and d.name in published_log]
    to_publish      = [d for d in candidates if not _should_skip(d.name) and d.name not in published_log]

    print(f"\nBlogger bulk publish {'(DRY RUN)' if DRY_RUN else ''}")
    print(f"  Blog ID          : {_BLOG_ID}")
    print(f"  Found            : {len(candidates)} runs with blog_post.html")
    print(f"  To publish       : {len(to_publish)}")
    print(f"  Already published: {len(to_skip_already)}")
    print(f"  Manual skip      : {len(to_skip_manual)} ({', '.join(d.name[:8] for d in to_skip_manual)})")
    print()

    if not to_publish:
        print("Nothing left to publish. All done!")
        return

    ok = failed = 0

    for i, run_dir in enumerate(to_publish, 1):
        html_raw  = (run_dir / "blog_post.html").read_text(encoding="utf-8")
        body_html = (lambda m: m.group(1).strip() if m else html_raw)(
            __import__("re").search(r"<body[^>]*>([\s\S]*?)</body>", html_raw, 8)
        )
        # Title from h1 / <title> — NOT the raw user query
        title  = extract_blog_title(html_raw, fallback=_get_topic(run_dir))
        labels = _get_hashtags(run_dir)

        label_preview = ", ".join(labels[:5]) + ("…" if len(labels) > 5 else "") if labels else "(none)"
        print(f"[{i:02d}/{len(to_publish)}] {run_dir.name[:8]}")
        print(f"         title  : {title[:80]}")
        print(f"         labels : {label_preview}")

        if DRY_RUN:
            print(f"         → DRY RUN: {len(body_html):,} chars"); ok += 1; continue

        try:
            result = _publish_with_retry(title, body_html, labels)
            print(f"         ✓ LIVE  → {result['url']}")
            published_log[run_dir.name] = {"post_id": result["post_id"], "url": result["url"], "title": title}
            _save_published(published_log)
            ok += 1
        except HttpError as e:
            msgs = {429: "Rate limit — all retries exhausted. Wait a few minutes then re-run.",
                    403: "Forbidden — add your Google account as a Test User in Cloud Console.",
                    401: "Unauthorized — token invalid, restart backend or run re_auth.py."}
            print(f"         ✗ FAILED (HTTP {e.status_code}): {msgs.get(e.status_code, str(e)[:100])}")
            failed += 1
        except Exception as e:
            print(f"         ✗ FAILED: {str(e)[:120]}"); failed += 1

        if i < len(to_publish):
            time.sleep(DELAY_BETWEEN_POSTS)

    print(f"\nDone.  Published: {ok}  Failed: {failed}  Skipped: {len(to_skip_already) + len(to_skip_manual)}")
    if failed:
        print("Re-run to retry — published_runs.json prevents duplicates.")


if __name__ == "__main__":
    main()
