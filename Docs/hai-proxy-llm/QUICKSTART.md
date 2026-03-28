# Quick Start: HAI Proxy + Python Integration

## 🚀 Setup (5 minutes)

### 1. Install Dependencies
```bash
pip install -r requirements-llm.txt
```

### 2. Start HAI Proxy
```bash
hai proxy start
```

**Copy the API key from the output!** You'll see something like:
```
API Key: 514e25ac-1227-41b2-a09c-772a1b547532
```

### 3. Set Environment Variable
```bash
# Recommended: Set in your shell profile (~/.zshrc or ~/.bashrc)
export HAI_PROXY_API_KEY="your-api-key-here"
export HAI_PROXY_URL="http://localhost:6655/v1"
```

## ✅ Test the Integration

### Option 1: Simple Test Script
```bash
python test_hai_integration.py
```

**Before running**: Update the API key on line 18!

### Option 2: Quick Python Test
```python
import asyncio
from llm_abstraction import LLMFactory, LLMConfig, LLMProvider

async def quick_test():
    config = LLMConfig(
        provider=LLMProvider.HAI_PROXY,
        api_key="YOUR-API-KEY-HERE"  # From hai proxy start
    )
    llm = LLMFactory.create(config)

    response = await llm.generate("Say hello!")
    print(response.content)

    await llm.close()

asyncio.run(quick_test())
```

## 🎯 Usage Examples

### 1. Simple Text Generation
```python
from llm_abstraction import LLMFactory

async def main():
    llm = LLMFactory.from_env()  # Uses HAI_PROXY_API_KEY

    response = await llm.generate(
        prompt="Explain Docker in simple terms",
        system_prompt="You are a DevOps educator"
    )

    print(response.content)
    print(f"Tokens: {response.usage}")

    await llm.close()
```

### 2. Structured JSON Output
```python
from llm_abstraction import StructuredOutput
from typing import List

class TaskList(StructuredOutput):
    title: str
    tasks: List[str]
    priority: str

async def main():
    llm = LLMFactory.from_env()

    result = await llm.generate_structured(
        prompt="Create a task list for deploying a microservice",
        output_schema=TaskList
    )

    print(f"Title: {result.title}")
    for task in result.tasks:
        print(f"- {task}")

    await llm.close()
```

### 3. FastAPI Server
```bash
python fastapi_integration.py
```

Then open: http://localhost:8000/docs

Try the endpoints:
- `POST /agent/generate` - Simple text generation
- `POST /agent/generate-structured/outline` - Structured outline
- `POST /agent/batch-generate` - Parallel requests

### 4. Multi-Agent System
```bash
python multi_agent_example.py
```

See a complete workflow: Research → Strategy → Writing → Review

## 📚 What You Get

### Core Files
- **`llm_abstraction.py`** - Main abstraction layer (HAI Proxy integration)
- **`fastapi_integration.py`** - Production FastAPI server
- **`multi_agent_example.py`** - Advanced multi-agent orchestration
- **`test_hai_integration.py`** - Simple connectivity test

### Features
✅ OpenAI-compatible API calls via HAI Proxy
✅ Structured JSON outputs with validation
✅ Automatic retry on malformed JSON
✅ Async/concurrent request support
✅ Type-safe with Pydantic models
✅ Easy provider swapping (HAI → official API)
✅ FastAPI integration ready
✅ Multi-agent orchestration patterns

## 🔧 Configuration Options

### LLMConfig Parameters
```python
config = LLMConfig(
    provider=LLMProvider.HAI_PROXY,
    base_url="http://localhost:6655/v1",  # HAI proxy endpoint
    api_key="...",                        # From hai proxy start
    model="claude-sonnet-4-6",            # Claude model
    max_tokens=8192,                      # Max output tokens
    temperature=1.0,                      # 0.0-1.0 (deterministic to creative)
    timeout=300.0,                        # Request timeout (seconds)
    max_retries=3                         # Retry count for failures
)
```

### Environment Variables (Recommended)
```bash
export HAI_PROXY_URL="http://localhost:6655/v1"
export HAI_PROXY_API_KEY="your-key"
```

Then use:
```python
llm = LLMFactory.from_env()  # Auto-loads from env
```

## 🐛 Troubleshooting

### "Cannot connect to HAI proxy"
**Solution**: Run `hai proxy start` in a separate terminal

### "Invalid API key"
**Solution**: Copy the exact key from `hai proxy start` output

### "Structured output validation failed"
**Solutions**:
- Check your Pydantic model is valid
- Increase `max_retries` parameter
- Simplify the schema
- Add more examples in your prompt

### "Request timeout"
**Solutions**:
- Increase `timeout` in LLMConfig
- Reduce `max_tokens` for faster responses
- Check HAI proxy status

## 📖 Next Steps

1. **Read the docs**: See `HAI_INTEGRATION_GUIDE.md` for detailed info
2. **Try examples**: Run the example scripts
3. **Build agents**: Extend `multi_agent_example.py` for your use case
4. **Production deploy**: Use `fastapi_integration.py` as a template
5. **Custom schemas**: Create your own `StructuredOutput` subclasses

## 💡 Best Practices

### DO ✅
- Use environment variables for API keys
- Close connections with `await llm.close()`
- Handle `LLMError` exceptions
- Keep structured schemas simple
- Use parallel requests when possible

### DON'T ❌
- Hardcode API keys in source code
- Forget to start HAI proxy first
- Make overly complex structured schemas
- Block on sequential requests that could run in parallel
- Ignore timeout settings in production

## 🔄 Migration to Official API

When you're ready to switch to Anthropic's official API:

```bash
pip install anthropic
```

Then just change:
```python
config = LLMConfig(
    provider=LLMProvider.CLAUDE_API,  # Change this
    api_key=os.getenv("ANTHROPIC_API_KEY")  # Official key
)
```

No other code changes needed! 🎉

## 📞 Support

- **HAI Proxy Issues**: Check Hyperspace AI docs
- **Integration Issues**: See `HAI_INTEGRATION_GUIDE.md`
- **Examples**: Check example scripts in this repo
