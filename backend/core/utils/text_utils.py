"""Shared text utilities used across orchestrators."""
from __future__ import annotations

import re


# ── Markdown fence stripping ──────────────────────────────────────────────────

def strip_fences(text: str) -> str:
    """Remove leading/trailing markdown code fences from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-z]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.rstrip())
    return text.strip()


# ── CJK character detection ───────────────────────────────────────────────────

def has_cjk(text: str) -> bool:
    """
    Return True if text contains any CJK (Chinese/Japanese/Korean) characters.
    Used to filter out images or content unlikely relevant to English-language carousels.
    """
    for ch in text:
        cp = ord(ch)
        if (
            0x4E00 <= cp <= 0x9FFF    # CJK Unified Ideographs
            or 0x3040 <= cp <= 0x30FF # Hiragana + Katakana
            or 0xAC00 <= cp <= 0xD7A3 # Hangul Syllables
        ):
            return True
    return False


# ── Evidence block formatting ─────────────────────────────────────────────────

def format_evidence_block(
    evidence: list,
    max_items: int = 12,
    include_snippet: bool = True,
    compact: bool = False,
) -> str:
    """
    Format a list of Evidence objects into a numbered text block for LLM prompts.

    Args:
        evidence: List of Evidence model instances.
        max_items: Maximum number of items to include.
        include_snippet: Include snippet/extracted content lines.
        compact: Use compact single-line format (source + URL on one line).
    """
    lines: list[str] = []
    for idx, e in enumerate(evidence[:max_items], start=1):
        lines.append(f"[{idx}] {e.title}")
        if compact:
            lines.append(f"    Source: {e.source_name or e.source_type} | URL: {e.url}")
            if include_snippet:
                text = e.snippet or (e.extracted_content[:300] if e.extracted_content else "")
                if text:
                    lines.append(f"    Excerpt: {text[:300]}")
        else:
            lines.append(f"Source: {e.source_name or e.source_type}")
            lines.append(f"URL: {e.url}")
            if include_snippet:
                if e.snippet:
                    lines.append(f"Snippet: {e.snippet[:400]}")
                if e.extracted_content:
                    lines.append(f"Extracted Content: {e.extracted_content[:600]}")
        lines.append("")
    return "\n".join(lines)


# ── LLM synthetic URL helpers ─────────────────────────────────────────────────

LLM_EVIDENCE_URL_PREFIX = "llm://knowledge"


def make_llm_url(slug: str, index: int = 0) -> str:
    """Generate a synthetic URL for LLM-sourced evidence items."""
    safe_slug = slug.replace(" ", "_")
    return f"{LLM_EVIDENCE_URL_PREFIX}/{safe_slug}/{index}"


# ── URL utilities ─────────────────────────────────────────────────────────────

def domain_from_url(url: str) -> str:
    """Extract the bare domain from an HTTP URL (strips www. prefix)."""
    match = re.search(r'https?://(?:www\.)?([^/]+)', url or "")
    return match.group(1) if match else ""
