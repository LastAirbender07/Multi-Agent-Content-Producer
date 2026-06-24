from typing import Optional
from fastapi import APIRouter
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from infra.llm.langchain_adapter import get_langchain_llm_with_retry
from infra.logging import get_logger
from core.tools.metadata_helper import get_llm_metadata_block
from apps.api.v1.schemas import ChatMessage, ChatRequest, ChatResponse

logger = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        lc_messages = [SystemMessage(content=get_llm_metadata_block())]
        for m in request.messages:
            if m.role == "user":
                lc_messages.append(HumanMessage(content=m.content))
            else:
                lc_messages.append(AIMessage(content=m.content))
        result = await get_langchain_llm_with_retry(lambda llm: llm.ainvoke(lc_messages))
        return ChatResponse(reply=result.content)
    except Exception as e:
        logger.error("chat_error", error=str(e))
        return ChatResponse(reply=f"Sorry, something went wrong: {e}", error=str(e))
