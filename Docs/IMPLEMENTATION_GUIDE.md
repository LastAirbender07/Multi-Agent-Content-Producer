# Implementation Guide: LangGraph + FastMCP Multi-Agent Workflow

**Date:** 2026-04-03
**Purpose:** Build content creation workflow using LangGraph, LangChain, and FastMCP (NO custom BaseAgent)

---

## 🎯 Architecture Overview

### **Key Principle: Use Framework Primitives, Don't Reinvent**

- ✅ **LangGraph** handles state management and orchestration
- ✅ **FastMCP** provides tool abstractions
- ✅ **LangChain** offers LLM integrations
- ❌ **NO custom BaseAgent class** (framework handles this)

---

## 📁 File Structure

```
backend/core/
├── nodes/                      # LangGraph node functions
│   ├── __init__.py
│   ├── research.py             # Research node
│   ├── angle.py                # Angle generation node
│   ├── content.py              # Content creation node
│   └── approval.py             # Human approval node
│
├── graphs/                     # Workflow definitions
│   ├── __init__.py
│   └── content_workflow.py     # Main content creation graph
│
├── schemas/                    # State and data models
│   ├── __init__.py
│   ├── workflow_state.py       # LangGraph state definition
│   └── content_models.py       # Content-specific models
│
└── tools/                      # FastMCP tools (optional)
    ├── __init__.py
    └── research_tools.py       # External research tools
```

---

## 📝 Step-by-Step Implementation

---

## **Step 1: Define Workflow State**

**File:** `backend/core/schemas/workflow_state.py`

```python
"""
State schemas for LangGraph workflows.

Use TypedDict for LangGraph state (required by LangGraph).
Use Pydantic for validation and structured data.
"""

from typing import TypedDict, Optional, Annotated
from pydantic import BaseModel, Field
import operator


# === LangGraph State (TypedDict) ===

class ContentWorkflowState(TypedDict):
    """
    State for content creation workflow.

    This is passed between nodes in the graph.
    Each node reads from state and returns updates.
    """
    # Input
    topic: str

    # Research phase
    research_data: Optional[dict]
    research_summary: Optional[str]

    # Angle generation phase
    generated_angles: Optional[list[str]]
    selected_angle: Optional[str]

    # Content creation phase
    content_slides: Optional[list[dict]]
    content_hook: Optional[str]
    content_caption: Optional[str]
    content_hashtags: Optional[list[str]]

    # Metadata
    messages: Annotated[list[str], operator.add]  # Append-only log
    errors: Optional[list[str]]


# === Pydantic Models for Structured Output ===

class ResearchOutput(BaseModel):
    """Structured output from research node."""
    summary: str = Field(description="2-3 sentence summary")
    key_points: list[str] = Field(description="3-5 key findings")
    sources: list[str] = Field(description="Source URLs or references")
    relevance_score: float = Field(ge=0.0, le=1.0)


class AngleOutput(BaseModel):
    """Structured output from angle generation node."""
    angles: list[str] = Field(description="3-5 unique angles/perspectives")
    reasoning: str = Field(description="Why these angles work")


class ContentSlide(BaseModel):
    """Single carousel slide."""
    slide_number: int
    title: str = Field(max_length=60)
    content: str = Field(max_length=200)
    design_notes: Optional[str] = None


class ContentOutput(BaseModel):
    """Structured output from content creation node."""
    slides: list[ContentSlide] = Field(min_items=5, max_items=10)
    hook: str = Field(max_length=100, description="Attention-grabbing first line")
    caption: str = Field(max_length=2200, description="Instagram caption")
    hashtags: list[str] = Field(max_items=30)
```

---

## **Step 2: Create Node Functions**

### **File:** `backend/core/nodes/research.py`

```python
"""
Research node: Gather information on a topic.

This is a simple function, NOT a class.
LangGraph calls this function and passes the current state.
"""

import asyncio
from infra.llm.factory import LLMFactory
from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState, ResearchOutput

logger = get_logger(__name__)


async def research_node(state: ContentWorkflowState) -> dict:
    """
    Research a topic using LLM.

    Args:
        state: Current workflow state (LangGraph passes this)

    Returns:
        dict: Updates to merge into state
    """
    topic = state["topic"]

    logger.info("research_node_start", topic=topic)

    try:
        # Get LLM client (singleton)
        llm = await LLMFactory.get_client()

        # Build research prompt
        prompt = f"""
        Research the following topic and provide a comprehensive summary:

        Topic: {topic}

        Include:
        - Current state/trends
        - Key statistics or data points
        - Notable examples or case studies
        - Controversies or debates (if any)

        Focus on information from 2024-2026.
        """

        # Get structured output
        research = await llm.generate_structured(
            prompt=prompt,
            output_schema=ResearchOutput,
            system_prompt="You are a research analyst with expertise in tech, economics, and social trends."
        )

        logger.info(
            "research_node_complete",
            topic=topic,
            key_points_count=len(research.key_points),
            relevance=research.relevance_score
        )

        # Return state updates
        return {
            "research_data": research.model_dump(),
            "research_summary": research.summary,
            "messages": [f"✅ Research completed: {research.summary[:50]}..."]
        }

    except Exception as e:
        logger.error("research_node_error", topic=topic, error=str(e))

        return {
            "errors": [f"Research failed: {str(e)}"],
            "messages": [f"❌ Research error: {str(e)}"]
        }


# Optional: Add validation function
def should_retry_research(state: ContentWorkflowState) -> bool:
    """
    Conditional edge: Should we retry research?

    LangGraph can use this to decide next step.
    """
    research_data = state.get("research_data")

    if not research_data:
        return True

    # Check relevance score
    relevance = research_data.get("relevance_score", 0)
    return relevance < 0.5
```

---

### **File:** `backend/core/nodes/angle.py`

```python
"""
Angle generation node: Create multiple perspectives on researched topic.
"""

from infra.llm.langchain_adapter import get_langchain_llm
from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState, AngleOutput

logger = get_logger(__name__)


def angle_node(state: ContentWorkflowState) -> dict:
    """
    Generate multiple content angles/perspectives.

    Uses LangChain client (demonstrates using different client types).

    Args:
        state: Current workflow state

    Returns:
        dict: State updates
    """
    research_summary = state["research_summary"]
    topic = state["topic"]

    logger.info("angle_node_start", topic=topic)

    try:
        # Get LangChain LLM
        llm = get_langchain_llm()

        # Build prompt
        prompt = f"""
        Based on this research about "{topic}":

        {research_summary}

        Generate 5 unique angles or perspectives for social media content.
        Each angle should:
        - Be opinionated and thought-provoking
        - Appeal to a specific emotion (curiosity, anger, hope, etc.)
        - Have viral potential
        - Be different from the others

        Return as JSON matching the AngleOutput schema.
        """

        # Use LangChain's structured output
        from langchain_core.output_parsers import PydanticOutputParser

        parser = PydanticOutputParser(pydantic_object=AngleOutput)

        # Format prompt with parser instructions
        formatted_prompt = f"{prompt}\n\n{parser.get_format_instructions()}"

        # Get response
        response = llm.invoke(formatted_prompt)
        angles = parser.parse(response.content)

        logger.info(
            "angle_node_complete",
            topic=topic,
            angles_count=len(angles.angles)
        )

        return {
            "generated_angles": angles.angles,
            "messages": [f"✅ Generated {len(angles.angles)} angles"]
        }

    except Exception as e:
        logger.error("angle_node_error", topic=topic, error=str(e))

        return {
            "errors": [f"Angle generation failed: {str(e)}"],
            "messages": [f"❌ Angle error: {str(e)}"]
        }
```

---

### **File:** `backend/core/nodes/approval.py`

```python
"""
Human approval node: Human-in-the-loop for angle selection.

This demonstrates how to add manual checkpoints in LangGraph.
"""

from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState

logger = get_logger(__name__)


def approval_node(state: ContentWorkflowState) -> dict:
    """
    Wait for human to select an angle.

    In production, this would:
    - Pause the graph execution
    - Send notification (email, Slack, etc.)
    - Wait for user input via API/UI
    - Resume graph with selected angle

    For now, this is a CLI prompt (for development).

    Args:
        state: Current workflow state

    Returns:
        dict: State updates with selected angle
    """
    angles = state["generated_angles"]
    topic = state["topic"]

    logger.info("approval_node_start", topic=topic)

    print("\n" + "="*60)
    print("🎯 HUMAN APPROVAL REQUIRED")
    print("="*60)
    print(f"\nTopic: {topic}\n")
    print("Generated Angles:")

    for i, angle in enumerate(angles, 1):
        print(f"\n{i}. {angle}")

    print("\n" + "="*60)

    # Get user input
    while True:
        try:
            choice = input(f"\nSelect angle (1-{len(angles)}) or 'r' to regenerate: ").strip()

            if choice.lower() == 'r':
                logger.info("approval_node_regenerate_requested")
                return {
                    "selected_angle": None,
                    "messages": ["🔄 Regenerating angles..."]
                }

            choice_num = int(choice)
            if 1 <= choice_num <= len(angles):
                selected = angles[choice_num - 1]

                logger.info(
                    "approval_node_complete",
                    selected_angle=selected[:50]
                )

                return {
                    "selected_angle": selected,
                    "messages": [f"✅ Angle selected: {selected[:50]}..."]
                }
            else:
                print(f"❌ Please enter 1-{len(angles)} or 'r'")

        except ValueError:
            print("❌ Invalid input. Enter a number or 'r'")
        except KeyboardInterrupt:
            print("\n\n❌ Workflow cancelled by user")
            return {
                "errors": ["User cancelled workflow"],
                "messages": ["❌ Cancelled by user"]
            }


# Conditional edge function
def should_regenerate_angles(state: ContentWorkflowState) -> str:
    """
    Decide next step after approval.

    Returns:
        "regenerate" if user wants new angles
        "content" if angle selected
    """
    if state.get("selected_angle"):
        return "content"
    else:
        return "regenerate"
```

---

### **File:** `backend/core/nodes/content.py`

```python
"""
Content creation node: Generate carousel, hook, caption, hashtags.
"""

import asyncio
from infra.llm.factory import LLMFactory
from infra.logging import get_logger
from core.schemas.workflow_state import ContentWorkflowState, ContentOutput

logger = get_logger(__name__)


async def content_node(state: ContentWorkflowState) -> dict:
    """
    Generate final content: slides, hook, caption, hashtags.

    Args:
        state: Current workflow state

    Returns:
        dict: State updates with content
    """
    topic = state["topic"]
    angle = state["selected_angle"]
    research = state["research_summary"]

    logger.info("content_node_start", topic=topic)

    try:
        llm = await LLMFactory.get_client()

        prompt = f"""
        Create Instagram carousel content:

        Topic: {topic}
        Angle: {angle}
        Research: {research}

        Generate:
        1. 7 carousel slides (each with title and content)
        2. Attention-grabbing hook (first line of caption)
        3. Full caption (engaging, storytelling style)
        4. 20-30 relevant hashtags

        Style: Opinionated, analytical, thought-provoking
        Tone: Professional but conversational
        """

        content = await llm.generate_structured(
            prompt=prompt,
            output_schema=ContentOutput,
            system_prompt="You are a viral content strategist specializing in tech/business content."
        )

        logger.info(
            "content_node_complete",
            topic=topic,
            slides_count=len(content.slides),
            hashtags_count=len(content.hashtags)
        )

        return {
            "content_slides": [s.model_dump() for s in content.slides],
            "content_hook": content.hook,
            "content_caption": content.caption,
            "content_hashtags": content.hashtags,
            "messages": [f"✅ Content created: {len(content.slides)} slides"]
        }

    except Exception as e:
        logger.error("content_node_error", topic=topic, error=str(e))

        return {
            "errors": [f"Content creation failed: {str(e)}"],
            "messages": [f"❌ Content error: {str(e)}"]
        }
```

---

## **Step 3: Build LangGraph Workflow**

### **File:** `backend/core/graphs/content_workflow.py`

```python
"""
Content creation workflow using LangGraph.

This is the main orchestration layer.
"""

from langgraph.graph import StateGraph, END
from core.schemas.workflow_state import ContentWorkflowState
from core.nodes.research import research_node, should_retry_research
from core.nodes.angle import angle_node
from core.nodes.approval import approval_node, should_regenerate_angles
from core.nodes.content import content_node
from infra.logging import get_logger

logger = get_logger(__name__)


def create_content_workflow() -> StateGraph:
    """
    Create the content creation workflow graph.

    Flow:
    1. Research → 2. Generate Angles → 3. Human Approval → 4. Create Content

    With conditional edges for:
    - Retry research if low quality
    - Regenerate angles if user rejects

    Returns:
        Compiled LangGraph workflow
    """

    # Initialize graph
    graph = StateGraph(ContentWorkflowState)

    # Add nodes
    graph.add_node("research", research_node)
    graph.add_node("angle", angle_node)
    graph.add_node("approval", approval_node)
    graph.add_node("content", content_node)

    # Define edges

    # Start → Research
    graph.set_entry_point("research")

    # Research → Angle (conditional: retry if low quality)
    graph.add_conditional_edges(
        "research",
        should_retry_research,
        {
            True: "research",   # Retry research
            False: "angle"      # Proceed to angle
        }
    )

    # Angle → Approval
    graph.add_edge("angle", "approval")

    # Approval → Content or Regenerate Angles (conditional)
    graph.add_conditional_edges(
        "approval",
        should_regenerate_angles,
        {
            "regenerate": "angle",  # Back to angle generation
            "content": "content"     # Proceed to content
        }
    )

    # Content → END
    graph.add_edge("content", END)

    # Compile graph
    return graph.compile()


# === Usage Functions ===

async def run_content_workflow(topic: str) -> ContentWorkflowState:
    """
    Execute the content creation workflow.

    Args:
        topic: Content topic to research and create content about

    Returns:
        Final state with all generated content

    Example:
        result = await run_content_workflow("AI coding assistants impact on developer productivity")
        print(result["content_hook"])
        print(result["content_slides"])
    """
    logger.info("workflow_start", topic=topic)

    # Create workflow
    workflow = create_content_workflow()

    # Initial state
    initial_state: ContentWorkflowState = {
        "topic": topic,
        "research_data": None,
        "research_summary": None,
        "generated_angles": None,
        "selected_angle": None,
        "content_slides": None,
        "content_hook": None,
        "content_caption": None,
        "content_hashtags": None,
        "messages": [],
        "errors": None
    }

    # Run workflow
    final_state = await workflow.ainvoke(initial_state)

    logger.info("workflow_complete", topic=topic)

    return final_state


async def run_workflow_with_checkpoints(topic: str, checkpoint_dir: str = "./.checkpoints"):
    """
    Run workflow with checkpointing (can resume if interrupted).

    LangGraph supports persistence to SQLite/Postgres.
    Use this for production where workflows might be long-running.

    Args:
        topic: Content topic
        checkpoint_dir: Where to save checkpoints
    """
    from langgraph.checkpoint.sqlite import SqliteSaver

    # Create workflow with checkpointing
    workflow = create_content_workflow()

    # Add persistence
    with SqliteSaver.from_conn_string(f"{checkpoint_dir}/workflow.db") as checkpointer:
        workflow_with_persistence = workflow.with_checkpointer(checkpointer)

        # Run with thread ID (allows resuming)
        config = {"configurable": {"thread_id": topic[:50]}}

        final_state = await workflow_with_persistence.ainvoke(
            {"topic": topic, "messages": []},
            config=config
        )

        return final_state
```

---

## **Step 4: Create CLI Runner**

### **File:** `backend/apps/cli/workflow_runner.py`

```python
"""
CLI runner for content workflow.

Usage:
    python apps/cli/workflow_runner.py "Your topic here"
"""

import asyncio
import sys
import json
from core.graphs.content_workflow import run_content_workflow
from infra.logging import get_logger

logger = get_logger(__name__)


async def main():
    """Run workflow from CLI."""

    if len(sys.argv) < 2:
        print("Usage: python apps/cli/workflow_runner.py \"Topic here\"")
        sys.exit(1)

    topic = sys.argv[1]

    print(f"\n🚀 Starting content workflow for: {topic}\n")

    try:
        # Run workflow
        result = await run_content_workflow(topic)

        # Display results
        print("\n" + "="*60)
        print("✅ WORKFLOW COMPLETE")
        print("="*60)

        print(f"\n📝 Hook:\n{result['content_hook']}")

        print(f"\n📊 Slides ({len(result['content_slides'])}):")
        for slide in result['content_slides']:
            print(f"\n  Slide {slide['slide_number']}: {slide['title']}")
            print(f"  {slide['content'][:100]}...")

        print(f"\n💬 Caption:\n{result['content_caption'][:200]}...")

        print(f"\n#️⃣ Hashtags ({len(result['content_hashtags'])}):")
        print("  " + " ".join(result['content_hashtags'][:10]))

        # Save to file
        output_file = f"output_{topic[:30].replace(' ', '_')}.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)

        print(f"\n💾 Full output saved to: {output_file}\n")

    except KeyboardInterrupt:
        print("\n\n❌ Workflow cancelled\n")
        sys.exit(1)
    except Exception as e:
        logger.error("workflow_error", error=str(e))
        print(f"\n❌ Error: {e}\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
```

---

## **Step 5: FastMCP Integration (Optional)**

### **File:** `backend/apps/mcp/content_server.py`

```python
"""
FastMCP server exposing content workflow as MCP tools.

This allows external systems (Claude Desktop, other MCP clients)
to trigger content creation workflows.
"""

from fastmcp import FastMCP
from core.graphs.content_workflow import run_content_workflow
import asyncio

mcp = FastMCP("Content Creator")


@mcp.tool()
async def create_content(topic: str) -> dict:
    """
    Create social media content about a topic.

    Args:
        topic: The topic to create content about

    Returns:
        dict with slides, hook, caption, hashtags
    """
    result = await run_content_workflow(topic)

    return {
        "hook": result["content_hook"],
        "slides": result["content_slides"],
        "caption": result["content_caption"],
        "hashtags": result["content_hashtags"]
    }


@mcp.tool()
async def research_only(topic: str) -> dict:
    """
    Just research a topic without creating content.

    Args:
        topic: The topic to research

    Returns:
        Research summary and key points
    """
    from core.nodes.research import research_node

    result = await research_node({"topic": topic})
    return result["research_data"]


# Run server
if __name__ == "__main__":
    mcp.run()
```

---

## **Step 6: Testing**

### **File:** `backend/tests/test_workflow.py`

```python
"""
Tests for content workflow.
"""

import pytest
from core.graphs.content_workflow import run_content_workflow
from core.nodes.research import research_node
from core.schemas.workflow_state import ContentWorkflowState


@pytest.mark.asyncio
async def test_research_node():
    """Test research node in isolation."""
    state: ContentWorkflowState = {
        "topic": "Test topic",
        "messages": [],
        "research_data": None,
        "research_summary": None,
        "generated_angles": None,
        "selected_angle": None,
        "content_slides": None,
        "content_hook": None,
        "content_caption": None,
        "content_hashtags": None,
        "errors": None
    }

    result = await research_node(state)

    assert "research_summary" in result
    assert "research_data" in result
    assert len(result["messages"]) > 0


@pytest.mark.asyncio
@pytest.mark.integration
async def test_full_workflow():
    """
    Test full workflow (integration test).

    Note: This requires human input for angle selection.
    Skip in CI/CD pipelines.
    """
    result = await run_content_workflow("AI coding assistants")

    assert result["content_hook"] is not None
    assert len(result["content_slides"]) >= 5
    assert len(result["content_hashtags"]) >= 10
```

---

## **📦 Dependencies to Add**

```bash
# Add to pyproject.toml or install with uv
uv add langgraph
uv add langchain-core
uv add fastmcp

# Optional (for advanced features)
uv add langgraph-checkpoint-sqlite  # For workflow persistence
```

---

## **🚀 Usage Examples**

### **1. Run from CLI**

```bash
cd backend

# Run workflow
python apps/cli/workflow_runner.py "Impact of AI on developer jobs 2026"
```

### **2. Run from Python**

```python
import asyncio
from core.graphs.content_workflow import run_content_workflow

async def main():
    result = await run_content_workflow("Tech layoffs 2026")
    print(result["content_hook"])

asyncio.run(main())
```

### **3. Use as MCP Server**

```bash
# Start MCP server
python apps/mcp/content_server.py

# Use from Claude Desktop or other MCP client
```

---

## **🎯 Key Takeaways**

### **1. No Custom BaseAgent Needed**
- ✅ LangGraph uses **simple functions** as nodes
- ✅ State is managed by **TypedDict**
- ✅ No need for class inheritance

### **2. Two Client Types, Different Uses**
- **Custom LLM Client** (`LLMFactory`): Structured output, cost tracking
- **LangChain Client** (`get_langchain_llm()`): Chains, tools, integrations

### **3. LangGraph Benefits**
- ✅ Built-in state management
- ✅ Conditional edges (branching logic)
- ✅ Human-in-the-loop checkpoints
- ✅ Persistence/checkpointing
- ✅ Easy to visualize and debug

### **4. FastMCP is Optional**
- Only needed if exposing to external MCP clients
- For internal use, just call workflow functions directly

---

## **🔄 Migration from Architecture Analysis Doc**

### **❌ Old Way (Custom BaseAgent)**
```python
class BaseAgent(ABC):
    async def execute(self, input, output):
        pass

class ResearchAgent(BaseAgent):
    async def execute(self):
        # Complex class hierarchy
        pass
```

### **✅ New Way (LangGraph Nodes)**
```python
async def research_node(state):
    # Simple function
    return {"research_data": result}
```

**Why the new way is better:**
- Less code to maintain
- Framework handles orchestration
- Easier to test (pure functions)
- Better error handling (built-in)
- Visualization tools (LangGraph Studio)

---

## **📊 Next Steps**

1. **Implement schemas** (`workflow_state.py`) - Start here
2. **Build research node** - Test in isolation
3. **Build angle node** - Test in isolation
4. **Create graph** - Wire nodes together
5. **Add approval node** - Test human-in-the-loop
6. **Build content node** - Complete workflow
7. **Test end-to-end** - Run full workflow
8. **Add FastMCP** (optional) - If needed for external access

---

## **🐛 Common Pitfalls to Avoid**

1. ❌ **Don't return the full state** from nodes - Only return updates
2. ❌ **Don't mutate state directly** - Return new dict with changes
3. ❌ **Don't mix sync/async** - Keep all nodes async or all sync
4. ❌ **Don't skip error handling** - Wrap in try/except
5. ❌ **Don't forget type hints** - LangGraph needs them for validation

---

## **📚 Resources**

- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [LangGraph Examples](https://github.com/langchain-ai/langgraph/tree/main/examples)
- [FastMCP Docs](https://github.com/jlowin/fastmcp)
- [State Management Best Practices](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)

---

_Last updated: 2026-04-03_
