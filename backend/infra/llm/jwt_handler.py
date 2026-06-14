"""Shared JWT error detection used by both LLMFactory and the LangChain adapter."""


def is_jwt_error(exc: Exception) -> bool:
    """Return True if the exception indicates a JWT expiry or auth failure."""
    msg = str(exc).lower()
    return "jwt" in msg or "expired" in msg or "401" in msg
