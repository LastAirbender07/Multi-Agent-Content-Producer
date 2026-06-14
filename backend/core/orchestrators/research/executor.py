import json
from datetime import datetime, timezone
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from core.orchestration.contracts import ToolTrace, SkippedTool
from core.schemas.workflow_state import ResearchGraphState
from core.tools.News.news_api import NewsAPI, GoogleNewsAPI
from core.tools.Search.ddgs_search import DDGSSearch
from core.tools.schemas.news_api_schema import NewsSearchOutput
from core.tools.schemas.crawl4ai_scraper_schema import Crawl4AIScraperOutput
from infra.logging import get_logger

logger = get_logger(__name__)


# ── Per-tool execution helpers ────────────────────────────────────────────────

async def _run_ddgs_text(ddgs: DDGSSearch, query: str) -> object:
    result = await ddgs.execute(query=query)
    if not result.success:
        raise RuntimeError(result.error or "ddgs_text returned a failure response")
    return result


async def _run_ddgs_news(ddgs: DDGSSearch, query: str) -> object:
    result = await ddgs.search_news(query=query)
    if not result.success:
        raise RuntimeError(result.error or "ddgs_news returned a failure response")
    return result


async def _run_news_api(query: str, run_id: str, degraded_flags: list) -> NewsSearchOutput:
    """Run GoogleNewsAPI (always) + NewsAPI (if key available). Merge and return."""
    news_api_articles = []
    try:
        news_api_inst = NewsAPI()
        news_api_output = await news_api_inst.execute(query=query)
        if news_api_output.success:
            news_api_articles = news_api_output.articles
    except ValueError:
        degraded_flags.append("news_api:no_api_key")
        logger.warning("news_api_skipped", run_id=run_id, reason="NEWSAPI_API_KEY not set")

    google_news = GoogleNewsAPI()
    google_news_output = await google_news.execute(query=query)
    google_articles = google_news_output.articles if google_news_output.success else []

    merged = news_api_articles + google_articles
    result = NewsSearchOutput(success=bool(merged), articles=merged, total_results=len(merged))
    if not merged:
        raise RuntimeError("news_api returned 0 articles from both NewsAPI and GoogleNewsAPI")
    return result


async def _run_crawl4ai(plan, max_crawl_urls: int) -> list:
    """Crawl explicit URLs via the crawl4ai MCP server."""
    crawl_results = []
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "core.tools.mcp_servers.crawl4ai_server"],
    )
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            for url in plan.crawl_urls[:max_crawl_urls]:
                mcp_result = await session.call_tool(
                    "scrape_url",
                    arguments={"url": url, "timeout": 30},
                )
                data = json.loads(mcp_result.content[0].text)
                crawl_results.append(Crawl4AIScraperOutput.model_validate(data))

    successful = [r for r in crawl_results if r.success]
    if crawl_results and not successful:
        failed_errors = [r.error for r in crawl_results if r.error]
        raise RuntimeError(f"All {len(crawl_results)} crawl URL(s) failed: {failed_errors}")
    return crawl_results


# ── Main node ─────────────────────────────────────────────────────────────────

async def execute_tools_node(state: ResearchGraphState) -> dict:
    request = state["request"]
    plan = state["route_plan"]

    # Rotate query variant on each refinement loop so searches don't repeat identically
    loop_count = state.get("loop_count", 0)
    query_variants = plan.query_variants if plan.query_variants else [request.topic]
    query = query_variants[loop_count % len(query_variants)]

    # If strict mode: errors already exist from route validation — skip tool execution
    if request.strict_tools and state.get("errors"):
        logger.warning("strict_mode_skip_tools", errors=state.get("errors"))
        return {"messages": state.get("messages", []) + ["Tool execution skipped due to strict mode route errors."]}

    raw_outputs = dict(state.get("raw_tool_outputs", {}))
    tool_traces = list(state.get("tool_traces", []))
    degraded_flags = list(state.get("degraded_flags", []))
    skipped_tools = list(state.get("skipped_tools", []))
    errors = list(state.get("errors", []))
    run_id = state.get("run_id")

    ddgs = DDGSSearch()

    _TOOL_RUNNERS = {
        "ddgs_text":  lambda: _run_ddgs_text(ddgs, query),
        "ddgs_news":  lambda: _run_ddgs_news(ddgs, query),
        "news_api":   lambda: _run_news_api(query, run_id, degraded_flags),
        "crawl4ai":   lambda: _run_crawl4ai(plan, request.budget.max_crawl_urls),
    }

    for tool_name in plan.selected_tools:
        trace = ToolTrace(tool_name=tool_name, started_at=datetime.now(timezone.utc))
        try:
            runner = _TOOL_RUNNERS.get(tool_name)
            if runner is None:
                raise ValueError(f"Unsupported tool: {tool_name}")
            raw_outputs[tool_name] = await runner()
            trace.success = True
            logger.info("tool_success", run_id=run_id, tool=tool_name)

        except Exception as e:
            trace.success = False
            trace.error = str(e)
            degraded_flags.append(f"tool_failed:{tool_name}")
            skipped_tools.append(SkippedTool(
                tool_name=tool_name,
                reason_type="runtime_error",
                reason_message=[f"Tool execution failed: {str(e)}"],
                provided_context={},
            ))
            logger.error("tool_error", run_id=run_id, tool=tool_name, error=str(e))
            if request.strict_tools:
                errors.append(f"Tool failed in strict mode: {tool_name} : {str(e)}")

        finally:
            trace.finished_at = datetime.now(timezone.utc)
            tool_traces.append(trace)

    return {
        "raw_tool_outputs": raw_outputs,
        "tool_traces": tool_traces,
        "skipped_tools": list({t.tool_name: t for t in skipped_tools}.values()),
        "degraded_flags": list(dict.fromkeys(degraded_flags)),
        "errors": errors,
        "messages": state.get("messages", []) + ["Tool execution completed."],
    }
