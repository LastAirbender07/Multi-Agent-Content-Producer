from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger
from core.tools.metadata_helper import get_llm_metadata_block

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    system: Optional[str] = Field(default=None, description="Ignored — metadata block is always used")


class ChatResponse(BaseModel):
    reply: str
    error: Optional[str] = None


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        llm = get_langchain_llm()
        lc_messages = [SystemMessage(content=get_llm_metadata_block())]
        for m in request.messages:
            if m.role == "user":
                lc_messages.append(HumanMessage(content=m.content))
            else:
                lc_messages.append(AIMessage(content=m.content))
        result = await llm.ainvoke(lc_messages)
        return ChatResponse(reply=result.content)
    except Exception as e:
        logger.error("chat_error", error=str(e))
        return ChatResponse(reply="", error=str(e))
