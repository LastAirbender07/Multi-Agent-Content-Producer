class LLMError(Exception):
    pass


class LLMTimeoutError(LLMError):
    pass


class LLMValidationError(LLMError):
    pass