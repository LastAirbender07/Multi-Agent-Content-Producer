from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    system: Optional[str] = Field(
        default="You are a helpful AI assistant. Be concise, clear, and accurate.",
        description="System prompt"
    )


class ChatResponse(BaseModel):
    reply: str
    error: Optional[str] = None


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        llm = get_langchain_llm()
        lc_messages = []
        if request.system:
            lc_messages.append(SystemMessage(content=request.system))
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
