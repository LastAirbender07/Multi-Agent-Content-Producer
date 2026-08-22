"""
Unit tests for asset_library_service.save_canvas and _persist_inline_images.

Renderer is mocked to keep tests fast (no Playwright / no browser). The
render_from_canvas_json integration is covered by the frontend Playwright
E2E test and the direct smoke test at Step 1.3.
"""
import base64
import json
import pytest
from pathlib import Path
from unittest.mock import patch, AsyncMock

from fastapi import HTTPException

from core.services import asset_library_service


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def tmp_angle_dir(tmp_path, monkeypatch):
    """Set up an isolated outputs/runs tree and point the service at it."""
    outputs_root = tmp_path / "outputs" / "runs"
    monkeypatch.setattr(asset_library_service, "_OUTPUTS_ROOT", outputs_root)
    angle_dir = outputs_root / "test-run" / "content" / "angle_0"
    angle_dir.mkdir(parents=True)
    return angle_dir, outputs_root


# Minimal 1×1 red PNG, base64-encoded — from Python png standard test image.
_ONE_PIXEL_PNG_B64 = base64.b64encode(bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108020000009077"
    "3dde000000097048597300000b1300000b1301009a9c1800000010494441"
    "5478da62fcffff3f0300050001008a1a5a0e0000000049454e44ae426082"
)).decode()


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_save_canvas_persists_json_and_calls_renderer(tmp_angle_dir):
    """No inline images — canvas JSON is written verbatim and renderer is invoked."""
    angle_dir, _ = tmp_angle_dir
    fabric_json = {
        "version": "7.4.0",
        "objects": [
            {"type": "textbox", "text": "Hello", "left": 100, "top": 100},
        ],
    }

    with patch(
        "core.services.asset_library_service.render_from_canvas_json",
        new_callable=AsyncMock,
    ) as mock_render:
        mock_render.return_value = str(angle_dir / "png" / "slide_01.png")
        result = await asset_library_service.save_canvas(
            "test-run", 0, 1, fabric_json,
        )

    canvas_file = angle_dir / "canvas_01.json"
    assert canvas_file.exists(), "canvas_01.json was not written"

    saved = json.loads(canvas_file.read_text())
    assert saved["objects"][0]["text"] == "Hello", "text was mangled during save"

    assert result["saved"] is True
    assert "png_url" in result
    assert "?v=" in result["png_url"], "cache-bust query missing from png_url"
    assert result["version_query"], "version_query is empty"
    assert result["canvas_json"] == saved, "returned canvas_json differs from what was written"

    mock_render.assert_called_once()
    # First positional arg is the fabric_json — verify it matches what we saved.
    args, _kwargs = mock_render.call_args
    assert args[0] == saved


@pytest.mark.asyncio
async def test_save_canvas_extracts_base64_images(tmp_angle_dir):
    """Inline data URL → JPG persisted, src rewritten to /outputs/... static URL."""
    angle_dir, _ = tmp_angle_dir
    fabric_json = {
        "version": "7.4.0",
        "objects": [
            {
                "type": "image",
                "src": f"data:image/png;base64,{_ONE_PIXEL_PNG_B64}",
                "left": 0, "top": 0,
            },
        ],
    }

    with patch(
        "core.services.asset_library_service.render_from_canvas_json",
        new_callable=AsyncMock,
    ) as mock_render:
        mock_render.return_value = str(angle_dir / "png" / "slide_01.png")
        await asset_library_service.save_canvas("test-run", 0, 1, fabric_json)

    # Image was extracted to disk
    extracted = angle_dir / "images" / "slide_01_canvas_0.png"
    assert extracted.exists(), "inline image was not persisted to disk"
    assert extracted.stat().st_size > 0, "persisted image is empty"

    # Saved JSON references the static URL, not the data URL
    saved = json.loads((angle_dir / "canvas_01.json").read_text())
    src = saved["objects"][0]["src"]
    assert src.startswith("/outputs/runs/test-run/content/angle_0/images/"), (
        f"src not rewritten to static URL — got: {src[:80]}"
    )
    assert "data:image" not in src, "src still contains data URL"

    # Caller's original object must NOT have been mutated
    assert fabric_json["objects"][0]["src"].startswith("data:image/png;base64,"), (
        "caller's fabric_json was mutated in place"
    )


@pytest.mark.asyncio
async def test_save_canvas_extracts_nested_group_images(tmp_angle_dir):
    """Images inside groups are also extracted (recursive walk)."""
    angle_dir, _ = tmp_angle_dir
    fabric_json = {
        "version": "7.4.0",
        "objects": [
            {
                "type": "group",
                "objects": [
                    {"type": "textbox", "text": "In group"},
                    {
                        "type": "image",
                        "src": f"data:image/png;base64,{_ONE_PIXEL_PNG_B64}",
                    },
                ],
            },
        ],
    }

    with patch(
        "core.services.asset_library_service.render_from_canvas_json",
        new_callable=AsyncMock,
    ) as mock_render:
        mock_render.return_value = str(angle_dir / "png" / "slide_02.png")
        await asset_library_service.save_canvas("test-run", 0, 2, fabric_json)

    extracted = angle_dir / "images" / "slide_02_canvas_0.png"
    assert extracted.exists(), "nested inline image inside a group was not persisted"

    saved = json.loads((angle_dir / "canvas_02.json").read_text())
    nested_src = saved["objects"][0]["objects"][1]["src"]
    assert nested_src.startswith("/outputs/runs/"), "nested src not rewritten"


@pytest.mark.asyncio
async def test_save_canvas_missing_angle_dir_returns_404(tmp_path, monkeypatch):
    """Nonexistent run/angle → HTTPException 404."""
    monkeypatch.setattr(
        asset_library_service,
        "_OUTPUTS_ROOT",
        tmp_path / "outputs" / "runs",
    )
    with pytest.raises(HTTPException) as exc:
        await asset_library_service.save_canvas(
            "nonexistent-run", 0, 1, {"objects": []},
        )
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_save_canvas_leaves_http_srcs_untouched(tmp_angle_dir):
    """Images referenced by http URL pass through unchanged — only base64 is extracted."""
    angle_dir, _ = tmp_angle_dir
    fabric_json = {
        "version": "7.4.0",
        "objects": [
            {"type": "image", "src": "https://cdn.example.com/photo.jpg"},
        ],
    }

    with patch(
        "core.services.asset_library_service.render_from_canvas_json",
        new_callable=AsyncMock,
    ) as mock_render:
        mock_render.return_value = str(angle_dir / "png" / "slide_01.png")
        await asset_library_service.save_canvas("test-run", 0, 1, fabric_json)

    saved = json.loads((angle_dir / "canvas_01.json").read_text())
    assert saved["objects"][0]["src"] == "https://cdn.example.com/photo.jpg"
    # No image files should have been created
    images_dir = angle_dir / "images"
    if images_dir.exists():
        assert not any(images_dir.iterdir()), "unexpected file in images/ dir"