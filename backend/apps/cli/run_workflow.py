import asyncio
from infra.llm.factory import LLMFactory
from infra.logging import get_logger

logger = get_logger(__name__)


async def main():
    llm = await LLMFactory.get_client()

    # Make a simple call
    response = await llm.generate("Say hello in a creative way!")

    logger.info(f"\n✅ Response: {response.content}\n")
    logger.debug(f"🤖 Model: {response.model}\n📊 Usage: {response.usage}")


if __name__ == "__main__":
    asyncio.run(main())