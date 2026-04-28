from datetime import datetime, timezone
from core.orchestration.contracts import TootlTrace
from core.schemas.workflow_state import ResearchGraphState
from core.tools.Crawl4ai.crawl4ai_scraper import Crawl4AIScraper
from core.tools.News.news_api import NewsAPI, GoogleNewsAPI
from core.tools.Search.ddgs_search import DDGSSearch
from infra.logging import get_logger

logger = get_logger(__name__)

async def execute_tools_node(state: ResearchGraphState) -> dict:
    request = state.request
    plan = state.route_plan

    # if strict mode: errors already exist from route validation, skip tool execution
    if request.strict_tools and state.get("errors"):
        logger.warning(f"Strict tool selection is enabled and errors were found in the route plan validation. Skipping tool execution. Errors: {state['errors']}")
        return {"messages": state.get("messages", []) + ["Tool execution skipped due to strict mode route errors."]}
    
    raw_outputs = dict(state.get("raw_tool_outputs", {}))
    tool_traces = list(state.get("tool_traces", []))
    degraded_flags = list(state.get("degraded_flags", []))
    skipped_tools = list(state.get("skipped_tools", []))
    errors = list(state.get("errors", []))

    # instantiate tool - they are stateless so we can reuse the same instance across calls if needed
    ddgs = DDGSSearch()
    news_api = NewsAPI()
    google_news = GoogleNewsAPI()
    crawl4ai = Crawl4AIScraper()

    for tool_name in plan.selected_tools:
        trace = TootlTrace(tool_name=tool_name, started_at=datetime.now(timezone.utc))
        try:
            if tool_name == "ddgs_text":
                raw_outputs[tool_name] = await ddgs.execute(query=request.topic)
            elif tool_name == "ddgs_news":
                raw_outputs[tool_name] = await ddgs.search_news(query=request.topic)
            elif tool_name == "news_api":
                # use both news APIs for better coverage
                news_api_results = await news_api.execute(query=request.topic)
                google_news_results = await google_news.execute(query=request.topic)
                raw_outputs[tool_name] = news_api_results + google_news_results
            elif tool_name == "crawl4ai":
                crawl_results = []
                for url in plan.crawl_urls[:request.budget.max_crawl_urls]:
                    result = await crawl4ai.execute(url=url)
                    crawl_results.append(result)
                raw_outputs[tool_name] = crawl_results
            else:
                raise ValueError(f"Unsupported tool: {tool_name}")
            
            trace.success = True
            logger.info(f"tool_success", run_id=state.run_id, tool=tool_name)
        except Exception as e:
            trace.success = False
            trace.error = str(e)
            degraded_flags.append(f"tool_failed:{tool_name}")
            skipped_tools.append({
                "tool_name": tool_name,
                "reason_type": "runtime_error",
                "reason_message": [f"Tool execution failed with error: {str(e)}."],
                "provided_context": {},
            })
            logger.error(f"tool_error", run_id=state.run_id, tool=tool_name, error=str(e))

            # if strict mode, also add to skipped tools to prevent downstream processing
            if request.strict_tools:
                errors.append(f"Tool failed in strict mode: {tool_name} : {str(e)}")
            
            logger.warning("tool_failed", run_id=state.run_id, tool=tool_name, error=str(e))

        finally:
            trace.finished_at = datetime.now(timezone.utc)
            tool_traces.append(trace)

    return {
        "raw_tool_outputs": raw_outputs,
        "tool_traces": tool_traces,
        "skipped_tools": skipped_tools,
        "degraded_flags": degraded_flags,
        "errors": errors,
        "messages": state.get("messages", []) + ["Tool execution completed."],
    }
