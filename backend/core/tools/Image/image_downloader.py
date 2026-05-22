import os
import re
from pathlib import Path
import httpx
from configs.settings import get_settings

_settings = get_settings()


def _backend_root() -> Path:
    # core/tools/Image/ -> core/tools/ -> core/ -> backend/
    return Path(__file__).parents[3]


def resolve_download_dir(save_dir: str = "") -> Path:
    if save_dir:
        p = Path(save_dir)
        return p if p.is_absolute() else _backend_root() / p
    return _backend_root() / _settings.image_download_path


def sanitize_filename(url: str, index: int) -> str:
    name = url.split("?")[0].split("/")[-1]
    name = re.sub(r"[^\w.\-]", "_", name)
    if not name or "." not in name:
        name = f"image_{index:03d}.jpg"
    return name


async def download_images(urls: list[str], save_dir: str = "") -> dict:
    """
    Download images from URLs and save to disk.

    Returns a dict with keys:
      - saved_paths: list of absolute paths to saved files
      - errors: list of {url, error} dicts
      - save_dir: absolute path of the destination directory
    """
    dest = resolve_download_dir(save_dir)
    dest.mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    errors: list[dict] = []

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        for i, url in enumerate(urls):
            try:
                resp = await client.get(url)
                resp.raise_for_status()
                filename = sanitize_filename(url, i)
                target = dest / filename
                if target.exists():
                    stem, suffix = os.path.splitext(filename)
                    target = dest / f"{stem}_{i:03d}{suffix}"
                target.write_bytes(resp.content)
                saved_paths.append(str(target.resolve()))
            except Exception as e:
                errors.append({"url": url, "error": str(e)})

    return {
        "saved_paths": saved_paths,
        "errors": errors,
        "save_dir": str(dest.resolve()),
    }
