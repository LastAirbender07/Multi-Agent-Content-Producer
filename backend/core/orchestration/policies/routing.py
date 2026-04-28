from core.orchestration.contracts import ResearchRequest, RoutePlan

class DeterministicResearchRoutingPolicy:
    """
    Decides which tools to run based on the request.
    """

    def create_plan(self, request: ResearchRequest) -> RoutePlan:
        plan = RoutePlan()

        # Explicit URLs -> crawl them directly
        if request.explicit_urls:
            plan.selected_tools.append("crawl4ai")
            plan.crawl_urls = list(request.explicit_urls)
            plan.rationale.append("Explicit URLs provided, so using crawl4ai to crawl them directly.")

        if request.freshness in {"breaking", "recent"}:
            if "news_api" not in plan.selected_tools:
                plan.selected_tools.append("news_api")
                plan.rationale.append(f"Freshness requirement is '{request.freshness}', so including news_api for up-to-date information.")
            if 'ddgs_news' not in plan.selected_tools:
                plan.selected_tools.append('ddgs_news')
                plan.rationale.append(f"Freshness requirement is '{request.freshness}', so including ddgs_news for up-to-date information.")
        else:
            # Evergreen -> web search
            if "ddgs_text" not in plan.selected_tools:
                plan.selected_tools.append("ddgs_text")
                plan.rationale.append("Freshness requirement is 'evergreen', so including ddgs_text for comprehensive web search.")

        # Claim verification -> crawl top candidates
        if request.needs_claim_verification and "crawl4ai" not in plan.selected_tools:
            plan.selected_tools.append("crawl4ai")
            plan.rationale.append("Claim verification is required, so including crawl4ai to crawl top candidate URLs.")

        # Always have atleast one text search if none selected yet
        if not plan.selected_tools:
            plan.selected_tools = ["ddgs_text", "news_api"]
            plan.rationale.append("No specific tool requirements, so defaulting to ddgs_text and news_api for broad coverage.")

        plan.query_variants = [request.topic]
        return plan
    
    