from datetime import datetime, timezone


def get_llm_metadata_block() -> str:
    """Returns a formatted metadata block to prepend to every LLM system prompt."""
    now = datetime.now(timezone.utc)
    quarter = f"Q{(now.month - 1) // 3 + 1} {now.year}"
    return (
        "=== CONTEXT METADATA ===\n"
        f"Date: {now.strftime('%d %B %Y')} | Time: {now.strftime('%H:%M')} UTC"
        f" | {now.strftime('%A')} | {quarter}\n"
        "Classify events as past/present/future using this date. "
        "Prefer the most recent data available up to today.\n"
        "========================\n"
    )
