import asyncio
from infra.llm.factory import LLMFactory
from infra.llm.bootstrap.hai_proxy import ensure_hai_proxy
from infra.logging import get_logger

logger = get_logger(__name__)


async def main():
    ensure_hai_proxy()

    llm = LLMFactory.create()
    response = await llm.generate("Say hello")

    logger.info("llm_response", content=response.content, model=response.model)
    await llm.close()

asyncio.run(main())