"""
analytics_service.py — Thin compatibility shim.

All logic has moved to core/services/analytics/ (4 focused modules).
This file re-exports the public surface so existing imports are unchanged:

    from core.services.analytics_service import get_analytics_summary, analytics_cache
"""

from core.services.analytics import (          # noqa: F401
    analytics_cache,
    get_analytics_summary,
    get_analytics_summary_async,
)

__all__ = ["analytics_cache", "get_analytics_summary", "get_analytics_summary_async"]
