"""
Persistence layer for pipeline run metadata.

Provides access to run topics, directory listings, and static URL resolution.
"""
import json as _json
from pathlib import Path

from configs.settings import get_settings

_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


def read_topic(run_id: str) -> str:
    """Read the topic string for a given run from research_result.json."""
    rr = _OUTPUTS_ROOT / run_id / "research" / "research_result.json"
    if rr.exists():
        try:
            return (_json.loads(rr.read_text()).get("topic") or "")[:80]
        except Exception:
            pass
    return "Unknown topic"


def static_image_url(raw_path: str) -> str:
    """
    Convert an absolute filesystem path to a backend-served URL.

    Handles two storage formats:
    - New:    .../outputs/runs/{run_id}/...  → /outputs/runs/{run_id}/...
    - Legacy: .../outputs/{run_id}/...       → /outputs/runs/{run_id}/...
    """
    try:
        rel = "/" + str(Path(raw_path).relative_to(_BACKEND_ROOT)).replace("\\", "/")
    except ValueError:
        return raw_path  # path not under BACKEND_ROOT — return as-is

    if rel.startswith("/outputs/") and not rel.startswith("/outputs/runs/"):
        rel = "/outputs/runs/" + rel[len("/outputs/"):]
    return rel
