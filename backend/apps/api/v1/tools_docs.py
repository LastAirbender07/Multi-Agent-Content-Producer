import json as _json
import os
import pathlib
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

from apps.api.v1.schemas import ParseDocResponse
from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

_settings = get_settings()


@router.post("/parse-doc", response_model=ParseDocResponse)
async def parse_document(file: UploadFile = File(...)) -> ParseDocResponse:
    """
    Parse an uploaded document and return its content as clean Markdown text.
    Supports PDF, DOCX, TXT, MD, JSON, CSV, PPTX, XLSX and more. Max 10 MB.
    Uses markitdown for binary formats; plain text types are read directly.
    """
    content = await file.read()
    if len(content) > _settings.document_max_upload_bytes:
        raise HTTPException(status_code=413, detail="File too large — maximum 10 MB")

    filename = file.filename or "document"
    ext = pathlib.Path(filename).suffix.lstrip(".").lower()
    title = pathlib.Path(filename).stem

    supported = set(_settings.document_supported_formats)
    if ext not in supported:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '.{ext}'. Supported: {', '.join(sorted(supported))}",
        )

    # Fast-path: plain text — read directly, no conversion needed
    if ext in {"txt", "md", "markdown"}:
        try:
            text = content.decode("utf-8", errors="replace").strip()
            return ParseDocResponse(title=title, text=text, char_count=len(text), file_type=ext)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not read text file: {e}")

    # Fast-path: JSON — pretty-print for readability
    if ext == "json":
        try:
            parsed = _json.loads(content.decode("utf-8"))
            text = _json.dumps(parsed, indent=2, ensure_ascii=False)
            return ParseDocResponse(title=title, text=text, char_count=len(text), file_type="json")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Invalid JSON: {e}")

    # All binary formats (PDF, DOCX, PPTX, XLSX, …) → markitdown
    try:
        from markitdown import MarkItDown
        converter = MarkItDown()

        # Write to a named temp file so markitdown detects format from the extension
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            result = converter.convert(tmp_path)
            text = (result.text_content or "").strip()
        finally:
            os.unlink(tmp_path)

        if not text:
            raise HTTPException(status_code=422, detail="Document appears empty after parsing")

        return ParseDocResponse(title=title, text=text, char_count=len(text), file_type=ext)

    except HTTPException:
        raise
    except Exception as e:
        logger.warning("parse_doc_failed", filename=filename, error=str(e)[:120])
        raise HTTPException(status_code=422, detail=f"Could not parse document: {e}")
