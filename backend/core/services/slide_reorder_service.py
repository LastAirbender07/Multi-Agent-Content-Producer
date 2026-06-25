"""
Slide reorder and delete operations.

Reorder: permutes slides.json into a new order, renames PNG files to match.
Delete:  removes a slide from slides.json and deletes its PNG.

Both operations renumber all remaining slides 1..N to keep numbering sequential.
"""

import shutil
from pathlib import Path

from configs.settings import get_settings
from core.persistence.slide_repository import read_slides, write_slides
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir


def _angle_dir(run_id: str, angle_index: int) -> Path:
    return _OUTPUTS_ROOT / run_id / "content" / f"angle_{angle_index}"


def _slides_path(run_id: str, angle_index: int) -> Path:
    p = _angle_dir(run_id, angle_index) / "slides.json"
    if not p.exists():
        raise FileNotFoundError(f"slides.json not found for run {run_id} angle {angle_index}")
    return p


def _png_dir(run_id: str, angle_index: int) -> Path:
    return _angle_dir(run_id, angle_index) / "png"


def _renumber_pngs(png_dir: Path, old_numbers: list[int]) -> None:
    """
    Rename PNGs from their old slide_numbers to sequential 1..N.
    Uses tmp- prefixed names as a swap buffer so renames don't collide.
    """
    if not png_dir.exists():
        return

    # Step 1: rename each old PNG to a tmp name
    for old_num in old_numbers:
        src = png_dir / f"slide_{old_num:02d}.png"
        if src.exists():
            src.rename(png_dir / f"tmp_{old_num:02d}.png")

    # Step 2: rename each tmp name to new sequential number
    for new_num, old_num in enumerate(old_numbers, start=1):
        tmp = png_dir / f"tmp_{old_num:02d}.png"
        if tmp.exists():
            tmp.rename(png_dir / f"slide_{new_num:02d}.png")


def reorder_slides(run_id: str, angle_index: int, new_order: list[int]) -> dict:
    """
    Reorder slides according to new_order (1-based slide numbers).
    new_order must contain every existing slide number exactly once.
    """
    path = _slides_path(run_id, angle_index)
    slides = read_slides(path)

    slide_map = {s["slide_number"]: s for s in slides}
    if set(new_order) != set(slide_map.keys()):
        raise ValueError(f"new_order {new_order} doesn't match existing slide numbers {sorted(slide_map.keys())}")

    reordered = [slide_map[n] for n in new_order]

    # Renumber slides sequentially
    for i, slide in enumerate(reordered, start=1):
        slide["slide_number"] = i

    write_slides(path, reordered)
    _renumber_pngs(_png_dir(run_id, angle_index), new_order)

    logger.info("slides_reordered", run_id=run_id, angle_index=angle_index, count=len(reordered))
    return {"reordered": True, "slide_count": len(reordered)}


def delete_slide(run_id: str, angle_index: int, slide_number: int) -> dict:
    """
    Delete a slide and its PNG. Renumbers remaining slides 1..N-1.
    """
    path = _slides_path(run_id, angle_index)
    slides = read_slides(path)

    original_numbers = [s["slide_number"] for s in slides]
    if slide_number not in original_numbers:
        raise ValueError(f"Slide {slide_number} not found")

    # Remove the deleted slide's PNG first (before renumbering)
    png = _png_dir(run_id, angle_index) / f"slide_{slide_number:02d}.png"
    if png.exists():
        png.unlink()

    # Filter out the deleted slide
    remaining = [s for s in slides if s["slide_number"] != slide_number]
    remaining_old_numbers = [s["slide_number"] for s in remaining]

    # Renumber remaining slides 1..N
    for i, slide in enumerate(remaining, start=1):
        slide["slide_number"] = i

    write_slides(path, remaining)
    _renumber_pngs(_png_dir(run_id, angle_index), remaining_old_numbers)

    logger.info("slide_deleted", run_id=run_id, angle_index=angle_index,
                deleted=slide_number, remaining=len(remaining))
    return {"deleted": True, "slide_number": slide_number, "remaining": len(remaining)}
