"""
Settings service — user-editable configuration layer on top of the .env-based Settings.

Writes to settings_overrides.json at the backend root. Values here take precedence
over .env defaults when exposed via the API but do NOT affect the pydantic Settings
object directly (which is process-scoped). A process restart picks them up if they
are also written to .env, but for UI-facing changes the service returns the merged view.
"""

import json
import re
from pathlib import Path
from typing import Any

from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings  = get_settings()
_BACKEND_ROOT   = Path(__file__).parents[2]
_OVERRIDES_FILE = _BACKEND_ROOT / "settings_overrides.json"

# Fields the user is allowed to edit via the API (no secrets in plain text except masked keys)
_EDITABLE_FIELDS = {
    # Brand
    "brand_name", "instagram_url", "instagram_handle", "medium_url", "blogger_url",
    # Content defaults
    "content_max_slides", "content_min_slides",
    "research_default_mode", "research_default_freshness",
    # API keys (stored in overrides, never returned unmasked)
    "pexels_api_key", "newsapi_api_key",
}


def _load_overrides() -> dict:
    if _OVERRIDES_FILE.exists():
        try:
            return json.loads(_OVERRIDES_FILE.read_text()) or {}
        except Exception:
            pass
    return {}


def _save_overrides(data: dict) -> None:
    _OVERRIDES_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _mask(value: str | None) -> str:
    """Show first 6 chars and last 4, mask the rest. Returns '' if None/empty."""
    if not value:
        return ""
    if len(value) <= 10:
        return "•" * len(value)
    return value[:6] + "•" * (len(value) - 10) + value[-4:]


def get_user_settings() -> dict:
    """Return the current effective settings, merging overrides over defaults.
    API keys are always masked in the response.
    """
    overrides = _load_overrides()

    def _val(field: str) -> Any:
        return overrides.get(field, getattr(_settings, field, None))

    return {
        "brand": {
            "brand_name":        _val("brand_name"),
            "instagram_url":     _val("instagram_url"),
            "instagram_handle":  _val("instagram_handle"),
            "medium_url":        _val("medium_url"),
            "blogger_url":       _val("blogger_url"),
        },
        "content_defaults": {
            "max_slides":            _val("content_max_slides"),
            "min_slides":            _val("content_min_slides"),
            "research_mode":         _val("research_default_mode"),
            "research_freshness":    _val("research_default_freshness"),
        },
        "api_keys": {
            "pexels_api_key":   _mask(_val("pexels_api_key")),
            "newsapi_api_key":  _mask(_val("newsapi_api_key")),
        },
        "api_keys_configured": {
            "pexels":  bool(_val("pexels_api_key")),
            "newsapi": bool(_val("newsapi_api_key")),
        },
    }


def update_user_settings(patch: dict) -> dict:
    """Merge patch into overrides file. Returns updated settings view."""
    overrides = _load_overrides()

    for key, value in patch.items():
        if key not in _EDITABLE_FIELDS:
            logger.warning("settings_unknown_field", field=key)
            continue
        if value is None or value == "":
            overrides.pop(key, None)  # clear override → fall back to default
        else:
            overrides[key] = value

    _save_overrides(overrides)
    logger.info("settings_updated", fields=list(patch.keys()))
    return get_user_settings()
