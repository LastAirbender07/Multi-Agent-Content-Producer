/**
 * E2E tests for the News Monitor page (/news).
 * Covers: source switching, time filters, results render, error state.
 */

import { test, expect, Page } from "@playwright/test";

const MOCK_ARTICLES = {
  success: true, query: "agentic AI enterprise", source: "google", total_results: 2,
  articles: [
    {
      title: "SAP Joule: the enterprise AI agent powering the future",
      description: "SAP's Joule AI agent is now embedded across all enterprise products.",
      content: "Full article content here...",
      url: "https://techcrunch.com/sap-joule",
      source_name: "TechCrunch",
      author: "Jane Reporter",
      published_at: "2026-05-28T10:00:00Z",
      url_to_image: null,
    },
    {
      title: "Why enterprise AI agents fail: lessons from 200 deployments",
      description: "A new study reveals the top reasons enterprise AI agent projects stall.",
      content: "Full article content here...",
      url: "https://wired.com/enterprise-ai-failure",
      source_name: "Wired",
      author: "Bob Writer",
      published_at: "2026-05-27T08:00:00Z",
      url_to_image: null,
    },
  ],
  error: undefined,
};

const MOCK_PROCESSED_QUERY = {
  cleaned_topic: "agentic AI enterprise 2026",
  entities: ["SAP", "Enterprise"],
  search_queries: ["agentic AI enterprise 2026"],
  freshness_hint: "recent",
  content_intent: "news",
};

async function goToNews(page: Page) {
  await page.goto("/news");
  await expect(page.getByPlaceholder(/search global events/i)).toBeVisible();
}

async function searchNews(page: Page, query = "agentic AI enterprise") {
  await page.getByPlaceholder(/search global events/i).fill(query);
  await page.getByRole("button", { name: /fetch signals/i }).click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("News Page — Source Switching", () => {
  test("default source is Google and sends source=google in request", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/tools/news", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ARTICLES) });
    });

    await goToNews(page);
    await searchNews(page);

    await expect(page.getByText("TechCrunch")).toBeVisible({ timeout: 8000 });
    expect(capturedBody?.source).toBe("google");
  });

  test("switching to DDG sends source=ddgs", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/tools/news", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...MOCK_ARTICLES, source: "ddgs" }) });
    });

    await goToNews(page);
    await page.getByRole("button", { name: /^ddg$/i }).click();
    await searchNews(page);

    await expect(page.getByText("TechCrunch")).toBeVisible({ timeout: 8000 });
    expect(capturedBody?.source).toBe("ddgs");
  });
});

test.describe("News Page — Time Filters", () => {
  test("clicking 1W time filter sends when=7d in request", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/tools/news", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ARTICLES) });
    });

    await goToNews(page);
    await page.getByRole("button", { name: /^1W$/i }).click();
    await searchNews(page);

    await expect(page.getByText("TechCrunch")).toBeVisible({ timeout: 8000 });
    expect(capturedBody?.when).toBe("7d");
  });
});

test.describe("News Page — Results", () => {
  test("article titles and source names are shown after search", async ({ page }) => {
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/tools/news", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ARTICLES) })
    );

    await goToNews(page);
    await searchNews(page);

    await expect(page.getByText("SAP Joule: the enterprise AI agent powering the future")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("TechCrunch")).toBeVisible();
    await expect(page.getByText("Why enterprise AI agents fail: lessons from 200 deployments")).toBeVisible();
  });

  test("error message shown when news API fails", async ({ page }) => {
    await page.route("**/api/v1/tools/query-refine", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PROCESSED_QUERY) })
    );
    await page.route("**/api/v1/tools/news", async route =>
      route.fulfill({ status: 500, body: "Server Error" })
    );

    await goToNews(page);
    await searchNews(page);

    await expect(page.getByText(/error|failed|no results/i)).toBeVisible({ timeout: 8000 });
  });
});
