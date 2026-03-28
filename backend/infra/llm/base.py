from abc import ABC, abstractmethod
from typing import Optional, Type
from pydantic import BaseModel


class BaseLLM(ABC):

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ):
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        output_schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        **kwargs
    ):
        pass

    @abstractmethod
    async def close(self):
        pass