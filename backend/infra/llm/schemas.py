from pydantic import BaseModel
from typing import Any, Dict, Optional


class LLMResponse(BaseModel):
    content: str
    usage: Dict[str, int]
    model: str
    raw_response: Optional[Any] = None