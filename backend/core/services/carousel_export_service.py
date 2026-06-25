import io
import json
import zipfile
from pathlib import Path

from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]  # backend/core/services → backend
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


def build_carousel_zip(run_id: str, angle_index: int) -> tuple[bytes, str]:
    """Build and return (zip_bytes, filename) for the requested carousel angle."""
    angle_dir = _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"
    png_dir = angle_dir / "png"
    carousel_json_path = angle_dir / "carousel.json"

    if not png_dir.exists():
        raise FileNotFoundError(f"No PNG directory for run {run_id} angle {angle_index}")

    pngs = sorted(png_dir.glob("slide_*.png"))
    if not pngs:
        raise FileNotFoundError(f"No slide PNGs found for run {run_id} angle {angle_index}")

    caption, hashtags, angle_statement = _read_carousel_meta(carousel_json_path)

    folder_name = f"carousel_{run_id[:8]}_angle_{angle_index}"
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for png in pngs:
            zf.write(png, f"{folder_name}/{png.name}")

        if caption:
            zf.writestr(f"{folder_name}/caption.txt", caption)
        if hashtags:
            zf.writestr(
                f"{folder_name}/hashtags.txt",
                "\n".join(f"#{h.lstrip('#')}" for h in hashtags),
            )

        readme = _build_readme(angle_statement, run_id, angle_index, len(pngs))
        zf.writestr(f"{folder_name}/README.txt", readme)

    return buf.getvalue(), f"{folder_name}.zip"


def _read_carousel_meta(path: Path) -> tuple[str, list[str], str]:
    """Read caption/hashtags/angle from carousel.json. Returns safe defaults on error."""
    if not path.exists():
        return "", [], ""
    try:
        data = json.loads(path.read_text())
        return (
            data.get("caption", ""),
            data.get("hashtags", []),
            data.get("angle_statement", ""),
        )
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("carousel_export_meta_read_error", path=str(path), error=str(e))
        return "", [], ""


def _build_readme(angle_statement: str, run_id: str, angle_index: int, slide_count: int) -> str:
    lines = ["Carousel export", "=" * 40]
    if angle_statement:
        lines += ["", "Angle:", angle_statement]
    lines += ["", f"Run ID:  {run_id}", f"Angle:   {angle_index}", f"Slides:  {slide_count}"]
    return "\n".join(lines)
