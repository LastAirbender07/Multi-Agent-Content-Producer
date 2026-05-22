"""
Playwright frontend smoke tests.
Requires: backend running on http://localhost:8000, frontend on http://localhost:3000
Run with:
    cd backend && .venv/bin/python -m pytest tests/test_frontend.py -v --timeout=180
"""
import json
import pytest
from playwright.sync_api import sync_playwright, Page, Route, Request, expect

FRONTEND = "http://localhost:3000"
BACKEND = "http://localhost:8000"

# Fast mock for the LLM query-refine endpoint.
# Avoids ~10s LLM call per test; lets us test UI behavior without burning
# the HAI proxy quota / hitting rate limits mid-suite.
def _mock_refine(route: Route, request: Request) -> None:
    try:
        topic = json.loads(request.post_data or "{}").get("topic", "mock")
    except Exception:
        topic = "mock"
    route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "cleaned_topic": topic,
            "entities": [],
            "search_queries": [],
            "freshness_hint": "recent",
            "content_intent": "",
        }),
    )


@pytest.fixture(scope="module")
def browser_ctx():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        yield ctx
        browser.close()


@pytest.fixture()
def page(browser_ctx):
    pg = browser_ctx.new_page()
    yield pg
    pg.close()


@pytest.fixture()
def page_with_mock(browser_ctx):
    """Page with query-refine mocked to avoid slow LLM calls."""
    pg = browser_ctx.new_page()
    pg.route("**/tools/query-refine", _mock_refine)
    yield pg
    pg.close()


def _wait_for_news(page: Page, timeout: int = 25_000) -> None:
    """Wait for news results, empty state, or error to appear.

    Uses textContent (DOM text) not innerText so CSS text-transform: uppercase
    on the 'Intel: N Articles' header doesn't break the check.
    """
    page.wait_for_function(
        """() => {
            const t = document.body.textContent || "";
            return t.includes('Intel:') || t.includes('No Signals') || t.includes('Search failed');
        }""",
        timeout=timeout,
    )


# ─── Images page ─────────────────────────────────────────────────────────────

class TestImagesPage:
    def test_page_loads(self, page: Page):
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name="Visual Intelligence")).to_be_visible()

    def test_idle_state(self, page: Page):
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("No Assets Selected")).to_be_visible()

    def test_source_toggle_visible(self, page: Page):
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("button", name="Pexels")).to_be_visible()
        expect(page.get_by_role("button", name="DuckDuckGo")).to_be_visible()

    def test_pexels_search_returns_images(self, page_with_mock: Page):
        page = page_with_mock
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Pexels").click()
        page.get_by_placeholder("Describe the visual concept you're looking for…").fill("mountain landscape")
        page.get_by_role("button", name="Fetch Assets").click()
        page.wait_for_selector("img", timeout=20_000)
        images = page.locator("img").all()
        assert len(images) >= 1, f"Expected at least 1 image, got {len(images)}"

    def test_select_single_image(self, page_with_mock: Page):
        page = page_with_mock
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        page.get_by_placeholder("Describe the visual concept you're looking for…").fill("mountain landscape")
        page.get_by_role("button", name="Fetch Assets").click()
        page.wait_for_selector("img", timeout=20_000)
        first_card = page.locator(".group.relative.rounded-3xl").first
        first_card.click()
        expect(page.get_by_text("1 selected")).to_be_visible(timeout=5_000)

    def test_select_all_then_clear(self, page_with_mock: Page):
        page = page_with_mock
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        page.get_by_placeholder("Describe the visual concept you're looking for…").fill("nature")
        page.get_by_role("button", name="Fetch Assets").click()
        page.wait_for_selector("img", timeout=20_000)
        page.get_by_role("button", name="Select All").click()
        badge = page.locator("div.bg-violet-600.rounded-xl").filter(has_text="selected").first
        expect(badge).to_be_visible(timeout=5_000)
        # Clear button is the X icon button (last button in action bar)
        page.locator("button.w-8.h-8").last.click()
        expect(badge).not_to_be_visible(timeout=5_000)

    def test_download_single_image(self, page_with_mock: Page):
        """Download one image; verify 'Saved to' message in floating action bar."""
        page = page_with_mock
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        page.get_by_placeholder("Describe the visual concept you're looking for…").fill("abstract texture")
        page.get_by_role("button", name="Fetch Assets").click()
        page.wait_for_selector("img", timeout=20_000)
        page.locator(".group.relative.rounded-3xl").first.click()
        expect(page.get_by_text("1 selected")).to_be_visible(timeout=5_000)
        page.get_by_role("button", name="Download").click()
        # After fix: selection is NOT auto-cleared on success, so bar stays visible
        # with "Saved to <path>" text. Download of 1 Pexels image takes ~2s.
        page.wait_for_function(
            """() => {
                const t = document.body.textContent || "";
                return t.includes('Saved to') || t.includes('Download failed');
            }""",
            timeout=15_000,
        )
        body = page.text_content("body") or ""
        assert "Saved to" in body, f"Expected 'Saved to' in page, got snippet: {body[-200:]}"

    def test_ddgs_search_returns_images(self, page_with_mock: Page):
        page = page_with_mock
        page.goto(f"{FRONTEND}/images")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="DuckDuckGo").click()
        page.get_by_placeholder("Describe the visual concept you're looking for…").fill("ocean waves")
        page.get_by_role("button", name="Fetch Assets").click()
        page.wait_for_selector("img", timeout=20_000)
        images = page.locator("img").all()
        assert len(images) >= 1, f"Expected images from DDGS, got {len(images)}"


# ─── News page ────────────────────────────────────────────────────────────────

class TestNewsPage:
    def test_page_loads(self, page: Page):
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("heading", name="Signal Monitor")).to_be_visible()

    def test_idle_state(self, page: Page):
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        expect(page.get_by_text("Signal Awaiting")).to_be_visible()

    def test_source_tabs_visible(self, page: Page):
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        # Source tabs are labelled "Google", "NewsAPI", "DDG" (not "DuckDuckGo")
        expect(page.get_by_role("button", name="Google")).to_be_visible()
        expect(page.get_by_role("button", name="NewsAPI")).to_be_visible()
        expect(page.get_by_role("button", name="DDG")).to_be_visible()

    def test_google_news_search(self, page_with_mock: Page):
        page = page_with_mock
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="Google").click()
        page.get_by_placeholder("Search global events and signals…").fill("artificial intelligence")
        page.get_by_role("button", name="Fetch Signals").click()
        _wait_for_news(page, timeout=30_000)
        body = page.text_content("body") or ""
        assert "Intel:" in body or "No Signals" in body, f"Expected results, got: {body[-200:]}"

    def test_newsapi_search(self, page_with_mock: Page):
        page = page_with_mock
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="NewsAPI").click()
        page.get_by_placeholder("Search global events and signals…").fill("technology")
        page.get_by_role("button", name="Fetch Signals").click()
        _wait_for_news(page, timeout=20_000)
        body = page.text_content("body") or ""
        assert "Intel:" in body or "No Signals" in body, f"Expected NewsAPI results, got: {body[-200:]}"

    def test_ddg_news_search(self, page_with_mock: Page):
        """DDG source tab is labelled 'DDG' (not 'DuckDuckGo')."""
        page = page_with_mock
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="DDG").click()
        page.get_by_placeholder("Search global events and signals…").fill("climate change")
        page.get_by_role("button", name="Fetch Signals").click()
        _wait_for_news(page, timeout=30_000)
        body = page.text_content("body") or ""
        assert "Intel:" in body or "No Signals" in body, f"Expected DDG results, got: {body[-200:]}"

    def test_switch_source_tab(self, page: Page):
        """Switching source tab updates active state; submit stays enabled when query filled."""
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="DDG").click()
        page.get_by_placeholder("Search global events and signals…").fill("test")
        expect(page.get_by_role("button", name="Fetch Signals")).not_to_be_disabled()

    def test_full_e2e_with_real_refine(self, page: Page):
        """End-to-end test exercising the real LLM query refinement → NewsAPI path."""
        page.goto(f"{FRONTEND}/news")
        page.wait_for_load_state("networkidle")
        page.get_by_role("button", name="NewsAPI").click()
        page.get_by_placeholder("Search global events and signals…").fill("AI")
        page.get_by_role("button", name="Fetch Signals").click()
        # Allow up to 60s for real LLM refine (~10s) + NewsAPI call
        _wait_for_news(page, timeout=60_000)
        body = page.text_content("body") or ""
        assert "Intel:" in body or "No Signals" in body, f"Expected results, got: {body[-200:]}"


# ─── Pipeline page ────────────────────────────────────────────────────────────

class TestPipelinePage:
    def test_page_loads(self, page: Page):
        page.goto(f"{FRONTEND}/pipeline")
        page.wait_for_load_state("networkidle")
        # Exact label in the config sidebar (avoid matching multiple "Topic" occurrences)
        expect(page.get_by_text("Target Topic")).to_be_visible()

    def test_no_stage_cards_initially(self, page: Page):
        page.goto(f"{FRONTEND}/pipeline")
        page.wait_for_load_state("networkidle")
        stage_cards = page.locator("text=Stage 1").all()
        assert len(stage_cards) == 0, "Stage cards should not be visible before running"

    def test_no_js_errors(self, page: Page):
        """Ensure no critical JS errors on initial page load."""
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"{FRONTEND}/pipeline")
        page.wait_for_load_state("networkidle")
        critical = [e for e in errors if "TypeError" in e or "ReferenceError" in e]
        assert len(critical) == 0, f"JS errors on pipeline page: {critical}"
