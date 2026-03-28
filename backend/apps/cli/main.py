import asyncio
from infra.llm.factory import LLMFactory
from infra.llm.bootstrap.env_setup import setup_hai_env
from infra.logging import get_logger

logger = get_logger(__name__)


async def main():
    setup_hai_env()

    llm = LLMFactory.create()
    response = await llm.generate("Say hello")

    logger.info(f"Response: {response.content}")
    logger.info(f"Model: {response.model}\nUsage: {response.usage}")

    await llm.close()

asyncio.run(main())