"""
Simple test to verify HAI Proxy integration is working.
"""

import asyncio
from backend.infra.llm.cluade.llm_abstraction import LLMFactory, LLMConfig, LLMProvider, LLMError, StructuredOutput
from typing import List


# Test 1: Simple text generation
async def test_simple_generation():
    """Test basic text generation."""
    print("\n" + "="*60)
    print("Test 1: Simple Text Generation")
    print("="*60)

    try:
        # Your HAI proxy API key
        config = LLMConfig(
            provider=LLMProvider.HAI_PROXY,
            base_url="http://localhost:6655/anthropic",
            api_key="514e25ac-1227-41b2-a09c-772a1b547532",
            model="anthropic--claude-4.5-sonnet",
            max_tokens=100  # Keep it short for testing
        )

        llm = LLMFactory.create(config)

        response = await llm.generate(
            prompt="Say 'Hello! HAI Proxy is working!' and nothing else.",
            system_prompt="You are a helpful assistant."
        )

        print(f"✅ Response: {response.content}")
        print(f"✅ Tokens used: {response.usage}")
        print(f"✅ Model: {response.model}")

        await llm.close()
        return True

    except LLMError as e:
        print(f"❌ Error: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Make sure HAI proxy is running: hai proxy start")
        print("2. Update the API key in this file (line 19)")
        print("3. Check the proxy URL is correct")
        return False


# Test 2: Structured output
class SimpleTask(StructuredOutput):
    """Simple structured output for testing."""
    title: str
    steps: List[str]
    priority: str


async def test_structured_output():
    """Test structured JSON output."""
    print("\n" + "="*60)
    print("Test 2: Structured Output (JSON)")
    print("="*60)

    try:
        config = LLMConfig(
            provider=LLMProvider.HAI_PROXY,
            base_url="http://localhost:6655/anthropic",
            api_key="514e25ac-1227-41b2-a09c-772a1b547532",
            model="anthropic--claude-4.5-sonnet",
            max_tokens=300
        )

        llm = LLMFactory.create(config)

        result = await llm.generate_structured(
            prompt="Create a simple task: 'Deploy application to production'",
            output_schema=SimpleTask,
            system_prompt="You are a project manager."
        )

        print(f"✅ Title: {result.title}")
        print(f"✅ Steps: {len(result.steps)} steps")
        print(f"   {result.steps}")
        print(f"✅ Priority: {result.priority}")

        await llm.close()
        return True

    except LLMError as e:
        print(f"❌ Error: {e}")
        return False


# Test 3: Error handling
async def test_error_handling():
    """Test error handling with wrong configuration."""
    print("\n" + "="*60)
    print("Test 3: Error Handling")
    print("="*60)

    try:
        # Intentionally wrong API key to test error handling
        config = LLMConfig(
            provider=LLMProvider.HAI_PROXY,
            base_url="http://localhost:6655/v1",
            api_key="wrong-key-for-testing",
            timeout=5.0  # Short timeout for testing
        )

        llm = LLMFactory.create(config)

        response = await llm.generate(prompt="Test")

        # Shouldn't reach here
        print("❌ Error handling not working properly")
        await llm.close()
        return False

    except LLMError as e:
        print(f"✅ Error correctly caught: {type(e).__name__}")
        print(f"   Message: {str(e)[:100]}")
        return True


# Run all tests
async def run_all_tests():
    """Run all tests."""
    print("\n" + "#"*60)
    print("# HAI Proxy Integration Tests")
    print("#"*60)
    print("\nIMPORTANT: Before running:")
    print("1. Start HAI proxy: hai proxy start")
    print("2. Copy the API key from the output")
    print("3. Update lines 19 and 60 in this file with your API key")
    print()

    results = []

    # Test 1: Simple generation
    result1 = await test_simple_generation()
    results.append(("Simple Generation", result1))

    # Test 2: Structured output (only if test 1 passed)
    if result1:
        result2 = await test_structured_output()
        results.append(("Structured Output", result2))
    else:
        print("\n⏭️  Skipping Test 2 (Test 1 failed)")

    # Test 3: Error handling
    result3 = await test_error_handling()
    results.append(("Error Handling", result3))

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    passed = sum(1 for _, r in results if r)
    total = len(results)

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! Your HAI Proxy integration is working!")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")

    return passed == total


if __name__ == "__main__":
    asyncio.run(run_all_tests())
