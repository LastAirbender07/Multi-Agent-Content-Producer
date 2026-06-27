"""
summary.py — Cache-aware public entry points.

Orchestrators call analytics_cache.invalidate() (from cache.py) after each run.
The API endpoint calls get_analytics_summary() (sync) or get_analytics_summary_async() (200+ runs).
"""

import asyncio
from pathlib import Path

from configs.settings import get_settings
from infra.logging import get_logger

from .cache      import analytics_cache
from .run_loader import load_run
from .aggregator import compute, _empty

logger = get_logger(__name__)
_settings  = get_settings()
_OUTPUTS   = Path(__file__).parents[3] / _settings.content_output_dir  # analytics→services→core→backend


def _scan_and_compute() -> dict:
    if not _OUTPUTS.exists():
        return _empty()

    runs_meta = []
    for run_dir in _OUTPUTS.iterdir():
        if not run_dir.is_dir():
            continue
        try:
            runs_meta.append(load_run(run_dir))
        except Exception as e:
            logger.warning("analytics_run_load_failed", run_dir=run_dir.name, error=str(e))

    if not runs_meta:
        return _empty()

    if len(runs_meta) > 200:
        logger.warning("analytics_scale_threshold", runs=len(runs_meta),
                       note="Switch API to get_analytics_summary_async()")

    result = compute(runs_meta)
    logger.debug("analytics_computed", total_runs=result["kpis"]["total_runs"])
    return result


def get_analytics_summary() -> dict:
    """Return analytics summary, using in-memory TTL cache when warm."""
    cached = analytics_cache.get()
    if cached is not None:
        logger.debug("analytics_cache_hit")
        return cached

    result = _scan_and_compute()
    analytics_cache.set(result)
    logger.debug("analytics_cache_miss")
    return result


async def get_analytics_summary_async() -> dict:
    """Async version: returns cached immediately, spawns background refresh on cold miss."""
    cached = analytics_cache.get()
    if cached is not None:
        return cached

    loop   = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _scan_and_compute)
    analytics_cache.set(result)

    async def _bg_refresh() -> None:
        try:
            fresh = await loop.run_in_executor(None, _scan_and_compute)
            analytics_cache.set(fresh)
            logger.info("analytics_bg_refresh_complete")
        except Exception as e:
            logger.warning("analytics_bg_refresh_failed", error=str(e))

    asyncio.create_task(_bg_refresh())
    return result
