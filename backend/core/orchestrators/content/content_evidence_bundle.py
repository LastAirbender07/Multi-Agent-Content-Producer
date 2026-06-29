"""
content_evidence_bundle.py

Filters and prepares research output for content generation.
The content pipeline (slides, captions) must never receive research meta-commentary
such as gaps, contradictions, limitations, or evaluation notes. Those exist for
internal quality control only and must not leak into published carousels.

Also classifies LLM knowledge claims by type so that historical facts
(high-confidence from training data) are kept distinct from causal inferences
and recent statistics (which need web corroboration).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field


# ── LLM claim type → credibility score ───────────────────────────────────────
# Historical facts and published works are well-represented in Claude's
# training corpus. Recent stats and causal inferences require web verification.

CLAIM_TYPE_CREDIBILITY: dict[str, float] = {
    "HISTORICAL_FACT":   0.85,   # documented event, established biography (pre-2021)
    "PUBLISHED_WORK":    0.80,   # content of a specific book, article, document
    "DIRECT_QUOTE":      0.60,   # verbatim attribution — quote text should be confirmed
    "RECENT_STATISTIC":  0.30,   # current data, trends — training data may be stale
    "CAUSAL_INFERENCE":  0.25,   # "X leads to Y" — always needs independent verification
}

# Claims in these categories are high-confidence from LLM training data
# and do not require web corroboration to be usable in content
HIGH_CONFIDENCE_CLAIM_TYPES = {"HISTORICAL_FACT", "PUBLISHED_WORK"}

# Claims in these categories MUST be corroborated by web search to be usable
REQUIRES_CORROBORATION_TYPES = {"RECENT_STATISTIC", "CAUSAL_INFERENCE"}


# ── Meta-commentary patterns to strip from research summaries ────────────────
# These patterns indicate research-process commentary that should never
# appear in slides, captions, or blog content.
# Patterns are phrase-level (not word-level) to avoid false positives on
# legitimate content like "generation gap", "India lacks infrastructure", etc.

_META_PATTERNS = [
    # Research-process commentary
    r"(?i)the (original |initial )?angle (claimed|stated|asserted|said)",
    r"(?i)the research (reveals?|shows?|found|indicates?|identified|noted)",
    r"(?i)\bresearch reveals?\b",
    r"(?i)\bfindings? (reveal|show|indicate|suggest)\b",

    # Evidence gap language — phrase-level, not bare word "gap"
    r"(?i)\bCOMPLETE ABSENCE (of|in)\b",
    r"(?i)\bcritical gap[s]?\b.{0,20}\b(in research|in evidence|in documentation|in sources?)\b",
    r"(?i)\bgap[s]?\b.{0,20}\b(in research|in evidence|in the evidence|in available)\b",
    r"(?i)\bresearch\b.{0,30}\bgap[s]?\b",

    # Documentation/verification meta-language — phrase-level
    r"(?i)\bonly .{0,40} (is|are) (substantively |fully |well )?documented\b",
    r"(?i)\b(lack|lacks?|lacking) (substantive |sufficient |adequate )?documentation\b",
    r"(?i)\bevidence (for|of|about|regarding) .{0,60} (is )?(missing|absent|lacking|unavailable)\b",
    r"(?i)\bno (evidence|documentation|sources?) (was |were |is |are )?(found|available|provided)\b",

    # Verification status meta-language
    r"(?i)\b(unverified|unsubstantiated|undocumented) (claims?|quotes?|statements?)\b",
    r"(?i)\bclaims? (about|regarding|for|from) .{0,60} (remain|are) (unverified|undocumented|unsubstantiated)\b",

    # Process commentary
    r"(?i)\bwhat (we )?(could|couldn.t|can|can.t) (not )?find\b",
    r"(?i)\boriginal (angle|claim|topic) (stated|claimed|said|asserted)\b",
]

_META_RE = [re.compile(p) for p in _META_PATTERNS]


def _extract_claim_type_from_source_name(source_name: str | None) -> str | None:
    """
    Extract claim type from source_name encoding: "llm:{TYPE}[:{PERIOD}]"
    e.g. "llm:HISTORICAL_FACT:1891" → "HISTORICAL_FACT"
         "llm:CAUSAL_INFERENCE"     → "CAUSAL_INFERENCE"
    Returns None if source_name is not an LLM claim-type string.
    """
    if not source_name or not source_name.startswith("llm:"):
        return None
    parts = source_name.split(":")
    return parts[1].upper() if len(parts) > 1 else None


@dataclass
class ContentEvidenceBundle:
    """
    A filtered, presentation-ready view of research output.

    Only contains claims appropriate for public presentation.
    Strips all research meta-commentary, gaps, contradictions, and
    evaluation notes before handing to slide/caption generators.
    """
    # Web-corroborated facts (from web_search, news, crawl sources)
    verified_claims: list[str] = field(default_factory=list)

    # High-confidence LLM historical facts (HISTORICAL_FACT, PUBLISHED_WORK)
    # These are trusted from training data and usable without web corroboration
    llm_historical_facts: list[str] = field(default_factory=list)

    # Key statistics with specific numbers/dates
    key_statistics: list[str] = field(default_factory=list)

    # Presentation-ready summary (meta-commentary stripped)
    clean_summary: str = ""

    # Presentation-ready key points (meta-commentary stripped)
    clean_key_points: list[str] = field(default_factory=list)


def _is_meta_commentary(text: str) -> bool:
    """Return True if the text contains research-process commentary."""
    return any(pattern.search(text) for pattern in _META_RE)


def _strip_meta_sentences(text: str) -> str:
    """
    Remove sentences containing meta-commentary patterns from a text block.
    Operates sentence-by-sentence; preserves paragraph structure.
    """
    if not text:
        return text

    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    clean = [s for s in sentences if not _is_meta_commentary(s)]
    return " ".join(clean).strip()


def build_content_evidence_bundle(
    research_summary: str,
    key_points: list[str],
    evidence: list,  # list of Evidence objects or dicts
) -> ContentEvidenceBundle:
    """
    Build a ContentEvidenceBundle from raw research output.

    Strips all meta-commentary from the summary and key points.
    Classifies LLM evidence items by claim type extracted from source_name.
    Separates web-corroborated facts from LLM historical knowledge.
    """
    clean_summary = _strip_meta_sentences(research_summary)
    clean_key_points = [
        kp for kp in (key_points or [])
        if kp and not _is_meta_commentary(kp)
    ]

    verified_claims: list[str] = []
    llm_historical_facts: list[str] = []
    key_statistics: list[str] = []

    for item in (evidence or []):
        # Handle both Evidence objects and dicts uniformly
        def _get(attr: str, default=None):
            return (
                getattr(item, attr, default)
                if not isinstance(item, dict)
                else item.get(attr, default)
            )

        source_type  = _get("source_type")
        evidence_text = _get("evidence", "")
        snippet      = _get("snippet", "")
        source_name  = _get("source_name", "")
        credibility  = _get("credibility_score", 0) or 0

        display_text = (snippet or evidence_text or "")[:300].strip()
        if not display_text:
            continue

        if source_type == "llm_knowledge":
            # Primary: extract claim type from source_name encoding (e.g. "llm:HISTORICAL_FACT:1891")
            claim_type = _extract_claim_type_from_source_name(source_name)

            if claim_type in HIGH_CONFIDENCE_CLAIM_TYPES:
                llm_historical_facts.append(display_text)
            elif claim_type in REQUIRES_CORROBORATION_TYPES:
                pass  # exclude — needs web corroboration before use in content
            elif claim_type == "DIRECT_QUOTE":
                # Quotes are medium confidence — include but de-prioritise
                llm_historical_facts.append(display_text)
            else:
                # No claim_type in source_name (legacy item or fallback mode).
                # Use credibility score as proxy:
                # 0.75+ = set by llm_drafter (LLM-only mode, self-assigned high score) → keep
                # 0.5   = old flat score from pre-classification llm_knowledge_node → skip
                if credibility >= 0.75:
                    llm_historical_facts.append(display_text)
        else:
            # Web-sourced evidence — include if not meta-commentary
            if not _is_meta_commentary(display_text):
                verified_claims.append(display_text)
                # Flag items containing specific statistics for the key_statistics slot
                if re.search(
                    r"\d+[\d,.]*\s*(%|₹|\$|billion|million|crore|lakh|years?|months?)",
                    display_text,
                ):
                    key_statistics.append(display_text)

    return ContentEvidenceBundle(
        verified_claims=verified_claims[:20],
        llm_historical_facts=llm_historical_facts[:10],
        key_statistics=key_statistics[:8],
        clean_summary=clean_summary,
        clean_key_points=clean_key_points,
    )


def filtered_research_summary(research_summary: str, key_points: list[str]) -> tuple[str, list[str]]:
    """
    Convenience function: strip meta-commentary from research_summary and key_points.
    Returns (clean_summary, clean_key_points).

    This is the minimal entry point used by slide_generator and caption_generator.
    """
    clean_summary = _strip_meta_sentences(research_summary)
    clean_kp = [kp for kp in (key_points or []) if kp and not _is_meta_commentary(kp)]
    return clean_summary, clean_kp
