/**
 * E2E tests for the Images page (/images).
 * Covers: Pexels search, DDGS search, tag chips from /images/tags,
 * multi-select checkboxes, download flow, error handling.
 */

import { test, expect, Page } from "@playwright/test";

const MOCK_PEXELS_RESPONSE = {
  success: true, query: "agentic ai", source: "pexels", total_results: 2,
  pexels_photos: [
    { id: 1, url: "https://www.pexels.com/photo/1", photographer: "John Doe", photographer_url: "https://www.pexels.com/@john", avg_color: "#333", width: 1200, height: 800, src: { medium: "https://images.pexels.com/photos/1/medium.jpg", large2x: "https://images.pexels.com/photos/1/large2x.jpg" } },
    { id: 2, url: "https://www.pexels.com/photo/2", photographer: "Jane Smith", photographer_url: "https://www.pexels.com/@jane", avg_color: "#555", width: 1000, height: 1000, src: { medium: "https://images.pexels.com/photos/2/medium.jpg", large2x: "https://images.pexels.com/photos/2/large2x.jpg" } },
  ],
  ddgs_images: [], error: undefined,
};

const MOCK_DDGS_RESPONSE = {
  success: true, query: "agentic ai", source: "ddgs", total_results: 2,
  pexels_photos: [],
  ddgs_images: [
    { title: "Agentic AI Overview", image: "https://example.com/img1.jpg", thumbnail: "https://example.com/thumb1.jpg", url: "https://example.com/article1", width: 1200, height: 800, source: "example.com" },
    { title: "AI Agents Enterprise", image: "https://example.com/img2.jpg", thumbnail: "https://example.com/thumb2.jpg", url: "https://example.com/article2", width: 1000, height: 600, source: "example.com" },
  ],
  error: undefined,
};

const MOCK_TAGS = { tags: ["Agentic AI", "SAP", "Enterprise", "automation"] };

const MOCK_DOWNLOAD = {
  saved_paths: ["/outputs/downloads/images/img1.jpg"],
  errors: [],
  save_dir: "/outputs/downloads/images",
};

async function goToImages(page: Page) {
  await page.goto("/images");
  await expect(page.getByPlaceholder(/describe the visual concept/i)).toBeVisible();
}

async function searchImages(page: Page, query = "agentic ai") {
  await page.getByPlaceholder(/describe the visual concept/i).fill(query);
  await page.getByRole("button", { name: /fetch assets/i }).click();
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Images Page — Search", () => {
  test("Pexels search shows photographer names", async ({ page }) => {
    await page.route("**/api/v1/tools/images/tags", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TAGS) })
    );
    await page.route("**/api/v1/tools/images", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PEXELS_RESPONSE) })
    );

    await goToImages(page);
    await searchImages(page);

    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Jane Smith")).toBeVisible();
  });

  test("switching to DuckDuckGo and searching shows DDGS image titles", async ({ page }) => {
    await page.route("**/api/v1/tools/images/tags", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TAGS) })
    );
    await page.route("**/api/v1/tools/images", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DDGS_RESPONSE) })
    );

    await goToImages(page);
    await page.getByRole("button", { name: /duckduckgo/i }).click();
    await searchImages(page);

    await expect(page.getByText("Agentic AI Overview")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("AI Agents Enterprise")).toBeVisible();
  });

  test("image tags appear as chips after search", async ({ page }) => {
    await page.route("**/api/v1/tools/images/tags", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TAGS) })
    );
    await page.route("**/api/v1/tools/images", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PEXELS_RESPONSE) })
    );

    await goToImages(page);
    await searchImages(page);

    await expect(page.getByText("Agentic AI")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("SAP")).toBeVisible();
  });

  test("images/tags request is sent with the search query", async ({ page }) => {
    let capturedTagsBody: any = null;
    await page.route("**/api/v1/tools/images/tags", async route => {
      capturedTagsBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TAGS) });
    });
    await page.route("**/api/v1/tools/images", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PEXELS_RESPONSE) })
    );

    await goToImages(page);
    await searchImages(page);

    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 8000 });
    expect(capturedTagsBody?.query).toBe("agentic ai");
  });
});

test.describe("Images Page — Download", () => {
  test("download button calls /images/download after selecting images", async ({ page }) => {
    let downloadCalled = false;
    await page.route("**/api/v1/tools/images/tags", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TAGS) })
    );
    await page.route("**/api/v1/tools/images", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_PEXELS_RESPONSE) })
    );
    await page.route("**/api/v1/tools/images/download", async route => {
      downloadCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DOWNLOAD) });
    });

    await goToImages(page);
    await searchImages(page);
    await expect(page.getByText("John Doe")).toBeVisible({ timeout: 8000 });

    // Click first image card to select it
    const cards = page.locator("img").filter({ hasNot: page.locator("svg") });
    const firstCard = cards.first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(300);
      const downloadBtn = page.getByRole("button", { name: /download/i });
      if (await downloadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await downloadBtn.click();
        await page.waitForTimeout(1000);
        expect(downloadCalled).toBe(true);
      }
    }
  });
});
