"""
Test: execute_tools_node with crawl4ai tool via MCP.

Run from backend/:
    python tests/test_executor_crawl4ai_mcp.py
"""
import asyncio
from core.orchestration.contracts import BudgetConfig, ResearchRequest, RoutePlan
from core.orchestrators.research.executor import execute_tools_node


async def main():
    # Build a request — topic doesn't matter here, we're forcing the tool
    request = ResearchRequest(
        topic="AI agents",
        mode="quick",
        freshness="recent",
        budget=BudgetConfig(max_crawl_urls=1),
    )

    # Force the executor to run only crawl4ai with one specific URL
    plan = RoutePlan(
        selected_tools=["crawl4ai"],
        crawl_urls=["https://github.com/modelcontextprotocol/python-sdk"],
        query_variants=["AI agents"],
    )

    state = {
        "request": request,
        "route_plan": plan,
        "messages": [],
        "errors": [],
    }

    print("Running execute_tools_node with crawl4ai via MCP ...\n")
    result = await execute_tools_node(state)

    # Check for errors
    if result.get("errors"):
        print(f"ERRORS: {result['errors']}")

    if result.get("degraded_flags"):
        print(f"Degraded flags: {result['degraded_flags']}")

    # Inspect the crawl output
    crawl_results = result.get("raw_tool_outputs", {}).get("crawl4ai", [])
    print(f"Crawl results count: {len(crawl_results)}")

    for i, r in enumerate(crawl_results):
        print(f"\n--- Result {i + 1} ---")
        print(f"  Success : {r.success}")
        if r.success and r.content:
            print(f"  Title   : {r.content.title}")
            print(f"  URL     : {r.content.url}")
            print(f"  Preview : {r.content.markdown[:200]}...")
        else:
            print(f"  Error   : {r.error}")

    print("\nMessages:", result.get("messages"))


if __name__ == "__main__":
    asyncio.run(main())
