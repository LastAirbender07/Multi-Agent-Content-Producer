import json
from datetime import datetime, timezone
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from core.orchestration.contracts import ToolTrace, SkippedTool
from core.schemas.workflow_state import ResearchGraphState
# from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper
from core.tools.News.news_api import NewsAPI, GoogleNewsAPI
from core.tools.Search.ddgs_search import DDGSSearch
from core.tools.schemas.news_api_schema import NewsSearchOutput
from core.tools.schemas.crawl4ai_scraper_schema import Crawl4AIScraperOutput
from infra.logging import get_logger

logger = get_logger(__name__)

async def execute_tools_node(state: ResearchGraphState) -> dict:
    request = state["request"]
    plan = state["route_plan"]

    # Rotate query variant on each refinement loop so searches don't repeat identically
    loop_count = state.get("loop_count", 0)
    query_variants = plan.query_variants if plan.query_variants else [request.topic]
    query = query_variants[loop_count % len(query_variants)]

    # if strict mode: errors already exist from route validation, skip tool execution
    if request.strict_tools and state.get("errors"):
        logger.warning(f"Strict tool selection is enabled and errors were found in the route plan validation. Skipping tool execution. Errors: {state.get('errors')}")
        return {"messages": state.get("messages", []) + ["Tool execution skipped due to strict mode route errors."]}

    raw_outputs = dict(state.get("raw_tool_outputs", {}))
    tool_traces = list(state.get("tool_traces", []))
    degraded_flags = list(state.get("degraded_flags", []))
    skipped_tools = list(state.get("skipped_tools", []))
    errors = list(state.get("errors", []))

    # Stateless tools that don't require API keys — safe to instantiate upfront
    ddgs = DDGSSearch()
    # crawl4ai = Crawl4AIScraper()

    for tool_name in plan.selected_tools:
        trace = ToolTrace(tool_name=tool_name, started_at=datetime.now(timezone.utc))
        try:
            if tool_name == "ddgs_text":
                result = await ddgs.execute(query=query)
                raw_outputs[tool_name] = result
                if not result.success:
                    raise RuntimeError(result.error or "ddgs_text returned a failure response")

            elif tool_name == "ddgs_news":
                result = await ddgs.search_news(query=query)
                raw_outputs[tool_name] = result
                if not result.success:
                    raise RuntimeError(result.error or "ddgs_news returned a failure response")

            elif tool_name == "news_api":
                # Always run GoogleNewsAPI (no key required); try NewsAPI if key available
                google_news = GoogleNewsAPI()
                news_api_articles = []

                try:
                    news_api_inst = NewsAPI()
                    news_api_output = await news_api_inst.execute(query=query)
                    if news_api_output.success:
                        news_api_articles = news_api_output.articles
                except ValueError:
                    degraded_flags.append("news_api:no_api_key")
                    logger.warning("news_api_skipped", run_id=state.get("run_id"), reason="NEWSAPI_API_KEY not set")

                google_news_output = await google_news.execute(query=query)
                google_news_articles = google_news_output.articles if google_news_output.success else []

                merged_articles = news_api_articles + google_news_articles
                raw_outputs[tool_name] = NewsSearchOutput(
                    success=bool(merged_articles),
                    articles=merged_articles,
                    total_results=len(merged_articles),
                )
                if not merged_articles:
                    raise RuntimeError("news_api returned 0 articles from both NewsAPI and GoogleNewsAPI")

            # elif tool_name == "crawl4ai":
            #     crawl_results = []
            #     for url in plan.crawl_urls[:request.budget.max_crawl_urls]:
            #         result = await crawl4ai.execute(url=url)
            #         crawl_results.append(result)
            #     raw_outputs[tool_name] = crawl_results
            #     successful = [r for r in crawl_results if r.success]
            #     if crawl_results and not successful:
            #         failed_errors = [r.error for r in crawl_results if r.error]
            #         raise RuntimeError(f"All {len(crawl_results)} crawl URL(s) failed: {failed_errors}")

            elif tool_name == "crawl4ai":
                crawl_results = []
                server_params = StdioServerParameters(
                    command="python",
                    args=["-m", "core.tools.mcp_servers.crawl4ai_server"],
                )

                async with stdio_client(server_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        for url in plan.crawl_urls[:request.budget.max_crawl_urls]:
                            mcp_result = await session.call_tool(
                                "scrape_url", 
                                arguments={"url": url, "timeout": 30},
                            )
                            data = json.loads(mcp_result.content[0].text)
                            crawl_results.append(Crawl4AIScraperOutput.model_validate(data))
                raw_outputs[tool_name] = crawl_results
                successful = [r for r in crawl_results if r.success]
                if crawl_results and not successful:
                    failed_errors = [r.error for r in crawl_results if r.error]
                    raise RuntimeError(f"All {len(crawl_results)} crawl URL(s) failed: {failed_errors}")
                
            else:
                raise ValueError(f"Unsupported tool: {tool_name}")

            trace.success = True
            logger.info("tool_success", run_id=state.get("run_id"), tool=tool_name)

        except Exception as e:
            trace.success = False
            trace.error = str(e)
            degraded_flags.append(f"tool_failed:{tool_name}")
            skipped_tools.append(SkippedTool(
                tool_name=tool_name,
                reason_type="runtime_error",
                reason_message=[f"Tool execution failed with error: {str(e)}."],
                provided_context={},
            ))
            logger.error("tool_error", run_id=state.get("run_id"), tool=tool_name, error=str(e))

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
