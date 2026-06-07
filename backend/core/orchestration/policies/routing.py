from core.orchestration.contracts import ResearchRequest, RoutePlan

class DeterministicResearchRoutingPolicy:
    """
    Decides which tools to run based on the request.
    All three core tools (news_api, ddgs_news, ddgs_text) always run to ensure
    maximum evidence coverage regardless of freshness setting.
    """

    def create_plan(self, request: ResearchRequest) -> RoutePlan:
        plan = RoutePlan()

        # Explicit URLs -> crawl them directly
        if request.explicit_urls:
            clean_urls = [u for u in request.explicit_urls if u.strip()]
            if clean_urls:
                plan.selected_tools.append("crawl4ai")
                plan.crawl_urls = clean_urls
                plan.rationale.append("Explicit URLs provided; using crawl4ai to crawl them directly.")

        # Always run all three core search tools for broad, consistent coverage
        for tool, reason in [
            ("news_api",   "Always included for structured news coverage."),
            ("ddgs_news",  "Always included for real-time news coverage."),
            ("ddgs_text",  "Always included for general web search coverage."),
        ]:
            if tool not in plan.selected_tools:
                plan.selected_tools.append(tool)
                plan.rationale.append(reason)

        # Claim verification -> crawl top candidates
        if request.needs_claim_verification and "crawl4ai" not in plan.selected_tools:
            plan.selected_tools.append("crawl4ai")
            plan.rationale.append("Claim verification required; including crawl4ai.")

        if request.preprocessed_queries:
            plan.query_variants = request.preprocessed_queries
            plan.rationale.append("Using preprocessed search queries from query preprocessor.")
        else:
            plan.query_variants = [request.topic]
            plan.rationale.append("No preprocessed queries; using raw topic as single query variant.")
        return plan
