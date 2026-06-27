"""
cache.py — Thread-safe TTL cache for analytics results.

Import `analytics_cache` and call:
  analytics_cache.invalidate()   # from pipeline finalizers after each run
"""

import threading
import time as _time
from dataclasses import dataclass
from typing import Any

_CACHE_TTL_S: int = 300  # 5 minutes


@dataclass
class _CacheEntry:
    data: Any
    expires_at: float


class _AnalyticsCache:
    def __init__(self) -> None:
        self._entry: _CacheEntry | None = None
        self._lock = threading.Lock()

    def get(self) -> Any | None:
        with self._lock:
            if self._entry and _time.monotonic() < self._entry.expires_at:
                return self._entry.data
            return None

    def set(self, data: Any) -> None:
        with self._lock:
            self._entry = _CacheEntry(
                data=data,
                expires_at=_time.monotonic() + _CACHE_TTL_S,
            )

    def invalidate(self) -> None:
        """Call whenever a new run completes to force a fresh scan on next request."""
        with self._lock:
            self._entry = None


analytics_cache = _AnalyticsCache()
