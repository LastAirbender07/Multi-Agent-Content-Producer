from pydantic import BaseModel
from typing import Any, Dict, Optional, Union


class LLMResponse(BaseModel):
    content: str
    usage: Dict[str, Union[int, Dict[str, int]]]
    model: str
    raw_response: Optional[Any] = None