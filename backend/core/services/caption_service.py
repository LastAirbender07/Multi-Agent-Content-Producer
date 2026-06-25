"""
Caption service — read and write caption + hashtags for a carousel angle.

carousel.json lives at:
  outputs/runs/{run_id}/content/angle_{angle_index}/carousel.json
"""

import json
from pathlib import Path

from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir

# Instagram platform limits (same as caption_validator constants)
IG_CAPTION_MAX = 2200
IG_HASHTAG_MAX = 30


def _carousel_path(run_id: str, angle_index: int) -> Path:
    return _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}" / "carousel.json"


def get_caption(run_id: str, angle_index: int) -> dict:
    """Return caption, hashtags and validation counts for an angle."""
    path = _carousel_path(run_id, angle_index)
    if not path.exists():
        raise FileNotFoundError(f"carousel.json not found for run {run_id} angle {angle_index}")

    data = json.loads(path.read_text())
    caption: str = data.get("caption", "")
    hashtags: list[str] = data.get("hashtags", [])

    return {
        "caption": caption,
        "hashtags": hashtags,
        "char_count": len(caption),
        "char_limit": IG_CAPTION_MAX,
        "hashtag_count": len(hashtags),
        "hashtag_limit": IG_HASHTAG_MAX,
        "angle_statement": data.get("angle_statement", ""),
    }


def update_caption(run_id: str, angle_index: int, caption: str, hashtags: list[str]) -> dict:
    """Overwrite caption + hashtags in carousel.json. Returns updated counts."""
    path = _carousel_path(run_id, angle_index)
    if not path.exists():
        raise FileNotFoundError(f"carousel.json not found for run {run_id} angle {angle_index}")

    data = json.loads(path.read_text())
    data["caption"] = caption
    data["hashtags"] = hashtags
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))

    logger.info("caption_updated", run_id=run_id, angle_index=angle_index,
                char_count=len(caption), hashtag_count=len(hashtags))

    return {
        "saved": True,
        "char_count": len(caption),
        "hashtag_count": len(hashtags),
    }
