from dataclasses import dataclass


# Instagram platform limits
IG_CAPTION_MAX = 2200   # max caption characters
IG_HASHTAG_MAX = 30     # max hashtags (more causes shadowban)
IG_HOOK_CHARS = 125     # characters visible before the "more" tap


@dataclass
class CaptionValidation:
    char_count: int
    is_over_limit: bool
    hashtag_count: int
    hashtags_over_limit: bool
    hook_ends_cleanly: bool  # first 125 chars end at a sentence/word boundary
    warnings: list[str]


def validate_caption(caption: str, hashtags: list[str]) -> CaptionValidation:
    char_count = len(caption)
    hashtag_count = len(hashtags)
    warnings: list[str] = []

    is_over_limit = char_count > IG_CAPTION_MAX
    hashtags_over_limit = hashtag_count > IG_HASHTAG_MAX

    # Check whether the hook ends cleanly — only meaningful if caption is long enough
    if char_count >= IG_HOOK_CHARS:
        hook = caption[:IG_HOOK_CHARS]
        hook_ends_cleanly = (
            hook.endswith((".", "!", "?", "\n"))
            or caption[IG_HOOK_CHARS - 1] == " "
        )
    else:
        hook_ends_cleanly = True  # short captions are fully visible, no fold needed

    if is_over_limit:
        warnings.append(f"Caption is {char_count} chars — Instagram limit is {IG_CAPTION_MAX}")
    if hashtags_over_limit:
        warnings.append(
            f"{hashtag_count} hashtags — Instagram limit is {IG_HASHTAG_MAX} (excess may cause shadowban)"
        )
    if char_count >= IG_HOOK_CHARS and not hook_ends_cleanly:
        warnings.append("First 125 chars don't end at a sentence — hook may be cut off awkwardly")

    return CaptionValidation(
        char_count=char_count,
        is_over_limit=is_over_limit,
        hashtag_count=hashtag_count,
        hashtags_over_limit=hashtags_over_limit,
        hook_ends_cleanly=hook_ends_cleanly,
        warnings=warnings,
    )


def enforce_caption_limits(caption: str, hashtags: list[str]) -> tuple[str, list[str]]:
    """Trim caption and hashtags to Instagram limits. Returns (caption, hashtags)."""
    if len(caption) > IG_CAPTION_MAX:
        caption = caption[: IG_CAPTION_MAX - 1].rstrip() + "…"
    return caption, hashtags[:IG_HASHTAG_MAX]
