"""
Demo script showing multi-provider LLM support.

This demonstrates:
1. Custom ClaudeLLM via singleton (provider-agnostic)
2. LangChain integration (provider-agnostic)
3. Switching providers dynamically
"""

import asyncio
from infra.llm.factory import LLMFactory
from infra.llm.langchain_adapter import get_langchain_llm, create_langchain_llm
from infra.logging import get_logger
from configs.settings import get_settings

logger = get_logger(__name__)


async def test_custom_llm():
    """Test custom LLM with singleton pattern."""
    print("\n" + "="*60)
    print("1️⃣  Testing Custom LLM (Singleton)")
    print("="*60 + "\n")

    settings = get_settings()
    print(f"🔧 Provider: {settings.llm_provider}")
    print(f"🤖 Model: {settings.llm_model}\n")

    # Get singleton instance
    llm = await LLMFactory.get_client()

    # Make a simple call
    response = await llm.generate(
        prompt="Explain what a singleton pattern is in one sentence.",
        system_prompt="You are a helpful programming tutor."
    )

    print(f"✅ Response: {response.content}\n")
    print(f"📊 Usage: {response.usage}")
    print(f"🤖 Model: {response.model}\n")


def test_langchain_llm():
    """Test LangChain integration (auto-detects provider)."""
    print("\n" + "="*60)
    print("2️⃣  Testing LangChain (Auto-detect Provider)")
    print("="*60 + "\n")

    settings = get_settings()
    print(f"🔧 Provider: {settings.llm_provider}")
    print(f"🤖 Model: {settings.llm_model}\n")

    # Get LangChain LLM (auto-selects provider)
    llm = get_langchain_llm()

    # Make a call using LangChain's invoke
    response = llm.invoke("What is LangGraph in one sentence?")

    print(f"✅ Response: {response.content}\n")


def test_langchain_multi_provider():
    """Test switching providers dynamically (requires API keys)."""
    print("\n" + "="*60)
    print("3️⃣  Testing Multi-Provider Support (Optional)")
    print("="*60 + "\n")

    settings = get_settings()

    # Example 1: Use default provider
    print(f"📌 Using default provider: {settings.llm_provider}")
    llm_default = get_langchain_llm()
    print(f"✅ Created {type(llm_default).__name__}\n")

    # Example 2: Override to use different provider (if API keys available)
    # Uncomment to test:

    # print("📌 Creating OpenAI client...")
    # try:
    #     llm_openai = create_langchain_llm(
    #         provider="openai",
    #         model="gpt-4",
    #         temperature=0.7
    #     )
    #     print(f"✅ Created {type(llm_openai).__name__}\n")
    # except Exception as e:
    #     print(f"⚠️  OpenAI not configured: {e}\n")

    # print("📌 Creating Gemini client...")
    # try:
    #     llm_gemini = create_langchain_llm(
    #         provider="gemini",
    #         model="gemini-pro",
    #         temperature=0.7
    #     )
    #     print(f"✅ Created {type(llm_gemini).__name__}\n")
    # except Exception as e:
    #     print(f"⚠️  Gemini not configured: {e}\n")


async def main():
    """Run all tests."""
    print("\n🚀 Multi-Provider LLM Integration Demo")
    print("Testing both custom LLM and LangChain adapters...\n")

    # Test 1: Custom LLM with singleton
    await test_custom_llm()

    # Test 2: LangChain integration (auto-detect provider)
    test_langchain_llm()

    # Test 3: Multi-provider support
    test_langchain_multi_provider()

    print("\n" + "="*60)
    print("✅ All tests completed!")
    print("="*60)
    print("\n💡 To test other providers:")
    print("   1. Set LLM_PROVIDER in .env (openai, gemini)")
    print("   2. Add corresponding API key")
    print("   3. Re-run this script\n")

    # Cleanup
    await LLMFactory.close_client()


if __name__ == "__main__":
    asyncio.run(main())
