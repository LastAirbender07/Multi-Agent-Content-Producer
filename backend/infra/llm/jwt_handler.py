"""Shared auth error detection used by LLMFactory and the LangChain adapter."""

_AUTH_ERROR_TOKENS: frozenset[str] = frozenset({
    "jwt",
    "expired",
    "401",
    "unauthorized",
    "403",
    "forbidden",
    "invalid_token",
    "token_expired",
    "authentication",
})


def is_jwt_error(exc: Exception) -> bool:
    """
    Return True if the exception indicates a token expiry or auth failure.

    Covers both HAI Proxy JWT errors and SAP AI Core XSUAA token errors.
    Conservative: triggers singleton reset, not error suppression.
    """
    msg = str(exc).lower()
    return any(token in msg for token in _AUTH_ERROR_TOKENS)
