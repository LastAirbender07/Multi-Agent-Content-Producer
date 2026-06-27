"""
analytics/  — Public surface.

Import from here, not from submodules:
    from core.services.analytics_service import get_analytics_summary, analytics_cache
"""

from .cache   import analytics_cache                                          # noqa: F401
from .summary import get_analytics_summary, get_analytics_summary_async      # noqa: F401

__all__ = ["analytics_cache", "get_analytics_summary", "get_analytics_summary_async"]
