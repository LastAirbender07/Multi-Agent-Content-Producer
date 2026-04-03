# LLM Infrastructure

Provider-agnostic LLM integration supporting multiple providers: Claude, OpenAI, Gemini.

## Architecture Overview

```
infra/llm/
├── base.py                  # Abstract BaseLLM interface
├── factory.py               # Singleton factory for custom clients
├── langchain_adapter.py     # LangChain/LangGraph integration
├── providers/
│   └── claude.py            # Custom Claude implementation
├── schemas.py               # Response models
└── exceptions.py            # Custom errors
```

---

## When to Use What?

### 1. **Custom LLM Client** (via `LLMFactory`)

**Use for:**
- ✅ Simple prompt → response calls
- ✅ Structured output with custom validation/retries
- ✅ Fine-grained cost/usage tracking
- ✅ Direct API control without framework overhead

**Example:**
```python
from infra.llm.factory import LLMFactory

# Get singleton client (reuses connection pool)
llm = await LLMFactory.get_client()

# Simple call
response = await llm.generate("What is AI?")
print(response.content)

# Structured output
from pydantic import BaseModel

class Summary(BaseModel):
    title: str
    points: list[str]

summary = await llm.generate_structured(
    prompt="Summarize this article...",
    output_schema=Summary
)
```

---

### 2. **LangChain Adapter** (via `get_langchain_llm`)

**Use for:**
- ✅ Multi-agent orchestration (LangGraph)
- ✅ RAG pipelines (retrievers + chains)
- ✅ Tool-calling agents
- ✅ Complex workflows with branches/loops
- ✅ LangChain ecosystem integrations

**Example:**
```python
from infra.llm.langchain_adapter import get_langchain_llm

# Auto-selects provider from settings
llm = get_langchain_llm()

# Use with LangChain
response = llm.invoke("What is LangGraph?")

# Use with LangGraph (state machines)
from langgraph.graph import StateGraph

class State(TypedDict):
    messages: list[str]

graph = StateGraph(State)
# ... build workflow with llm
```

---

## Supported Providers

### **Claude** (via HAI Proxy)
```bash
# .env
LLM_PROVIDER=claude
HAI_PROXY_URL=http://localhost:6655/anthropic
HAI_PROXY_API_KEY=your-key-here
LLM_MODEL=anthropic--claude-4.5-sonnet
```

### **OpenAI**
```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4
```

### **Google Gemini**
```bash
# .env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
LLM_MODEL=gemini-pro
```

---

## Switching Providers

### Option 1: Change Environment Variable
```bash
# In .env, change:
LLM_PROVIDER=openai  # or "gemini"
LLM_MODEL=gpt-4
OPENAI_API_KEY=sk-...
```

Both `LLMFactory` and `get_langchain_llm()` will automatically use the new provider.

### Option 2: Dynamic Override (LangChain only)
```python
from infra.llm.langchain_adapter import create_langchain_llm

# Use different provider temporarily
llm = create_langchain_llm(
    provider="openai",
    model="gpt-4",
    temperature=0.0
)
```

---

## Design Principles

### 1. **Singleton Pattern**
Both factories use singleton/caching to reuse HTTP clients:
- `LLMFactory.get_client()` → Singleton with async lock
- `get_langchain_llm()` → Cached with `@lru_cache()`

**Benefits:**
- ✅ Connection pooling
- ✅ Lower latency (no repeated TLS handshakes)
- ✅ Resource efficiency

### 2. **Provider Abstraction**
All provider-specific logic is isolated:
- Custom client: `providers/claude.py` implements `BaseLLM`
- LangChain: `_create_claude_client()` in `langchain_adapter.py`

**Adding a new provider:**
1. Implement `BaseLLM` in `providers/your_provider.py`
2. Update `LLMFactory.get_client()` to handle new provider
3. Add `_create_your_provider_client()` in `langchain_adapter.py`
4. Update settings to include new API keys

### 3. **Configuration-Driven**
All settings come from `configs/settings.py` (loaded from `.env`):
- No hardcoded API keys
- Single source of truth
- Type-safe with Pydantic

---

## Advanced Usage

### Structured Output with Retries
```python
llm = await LLMFactory.get_client()

class ProductReview(BaseModel):
    rating: int
    pros: list[str]
    cons: list[str]

# Automatically retries on validation errors
review = await llm.generate_structured(
    prompt="Review this product: ...",
    output_schema=ProductReview
)
```

### Cost Tracking
```python
response = await llm.generate("Hello")

# Access token usage
print(response.usage)  # {"input_tokens": 10, "output_tokens": 20}

# Calculate cost (example for Claude)
input_cost = response.usage["input_tokens"] * 0.003 / 1000
output_cost = response.usage["output_tokens"] * 0.015 / 1000
total = input_cost + output_cost
```

### Multiple Models in Parallel
```python
# Use different models for different tasks
fast_llm = create_langchain_llm(model="claude-haiku-4.5")
smart_llm = create_langchain_llm(model="claude-opus-4.6")

# Fast model for simple tasks
summary = fast_llm.invoke("Summarize: ...")

# Smart model for complex reasoning
analysis = smart_llm.invoke("Analyze: ...")
```

---

## Testing

Run the demo script to test both integrations:
```bash
cd backend
python scripts/demo_llm.py
```

---

## Migration Guide

### From Old Code
```python
# ❌ Old way (hardcoded, no singleton)
from infra.llm.bootstrap.env_setup import setup_hai_env
setup_hai_env()
llm = LLMFactory.create()
await llm.generate("...")
await llm.close()  # Manual cleanup
```

```python
# ✅ New way (automatic, singleton)
llm = await LLMFactory.get_client()
await llm.generate("...")
# No close needed - singleton stays alive
```

---

## Troubleshooting

### Import Errors for LangChain Providers
```bash
# Install missing provider packages
uv add langchain-anthropic  # For Claude
uv add langchain-openai     # For OpenAI
uv add langchain-google-genai  # For Gemini
```

### "Unsupported provider" Error
Check `.env`:
```bash
# Must be one of: claude, openai, gemini
LLM_PROVIDER=claude
```

### API Key Not Found
Ensure provider-specific keys are set:
```bash
# For Claude
HAI_PROXY_API_KEY=xxx

# For OpenAI
OPENAI_API_KEY=sk-xxx

# For Gemini
GEMINI_API_KEY=xxx
```

---

## Future Enhancements

- [ ] Add Azure OpenAI support
- [ ] Add Ollama (local models) support
- [ ] Implement automatic fallback (try provider B if A fails)
- [ ] Add streaming response support
- [ ] Implement rate limiting across providers
- [ ] Add caching layer for repeated prompts

---

_Last updated: 2026-04-03_
