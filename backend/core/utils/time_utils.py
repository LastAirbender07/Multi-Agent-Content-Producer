"""Time/date formatting utilities shared across tools and orchestrators."""
from datetime import datetime, timezone as _tz


def age_label(published_at: object | None) -> str:
    """Return a human-readable age string for a published_at value (datetime or ISO string)."""
    if not published_at:
        return "Recent"
    try:
        if isinstance(published_at, str):
            dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        else:
            dt = published_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=_tz.utc)
        delta = datetime.now(_tz.utc) - dt
        secs = delta.total_seconds()
        if secs < 3600:
            return f"{int(secs // 60)}m ago"
        if secs < 86400:
            return f"{int(secs // 3600)}h ago"
        if secs < 172800:
            return "Yesterday"
        return f"{int(secs // 86400)}d ago"
    except Exception:
        return "Recent"
