/**
 * E2E tests for the normal pipeline flow (web research → angles → content).
 * Covers: auto mode, manual HITL, angle regeneration, run history, progress bar, errors.
 * All backend calls intercepted via page.route().
 */

import { test, expect, Page } from "@playwright/test";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_RESEARCH = {
  run_id: "pipe-run-001",
  status: "success",
  topic: "Rise of Agentic AI in enterprise",
  route_plan: { selected_tools: ["news_api", "ddgs_news"], crawl_urls: [], query_variants: [], rationale: [], selection_mode_used: "auto" },
  evidence: [
    { evidence: "SAP deploys 200+ AI agents.", source_type: "news", title: "SAP AI Report", url: "https://example.com/1", snippet: "SAP deploys 200+", credibility_score: 0.9, relevance_score: 0.95 },
  ],
  synthesis: {
    summary: "Agentic AI is fundamentally reshaping enterprise software in 2026, with autonomous agents handling complex multi-step workflows.",
    key_points: ["SAP deploying 200+ AI agents", "Productivity gains of 40%", "ERP transformation accelerating"],
    contradictions: [], implications: ["ERP market disruption"], confidence_score: 0.9, gaps: [],
  },
  evaluation: { passed: true, should_refine: false, reason: "High confidence", source_count: 10, coverage_score: 0.9, source_diversity_score: 0.9, llm_content_score: 0.87, source_score: 1.0, combined_confidence: 0.9 },
  tool_traces: [], skipped_tools: [], degraded_flags: [], errors: [], output_path: "",
};

const MOCK_ANGLES = {
  run_id: "pipe-run-001",
  status: "success",
  angles: [
    { statement: "SAP is betting its entire future on AI agents", emotional_hook: "Curiosity", supporting_evidence: "SAP Sapphire 2026" },
    { statement: "Why 80% of enterprise AI projects fail in year 1", emotional_hook: "Fear", supporting_evidence: "Gartner 2025" },
    { statement: "Agentic AI will eliminate 3M ERP jobs by 2027", emotional_hook: "FOMO", supporting_evidence: "McKinsey" },
    { statement: "SAP Joule: the silent winner of the AI agent race", emotional_hook: "Anger", supporting_evidence: "SAP Q1 2026" },
    { statement: "Legacy ERP will be obsolete in 4 years", emotional_hook: "Urgency", supporting_evidence: "IDC 2026" },
  ],
  selected_angles: [
    { statement: "SAP is betting its entire future on AI agents", emotional_hook: "Curiosity", supporting_evidence: "SAP Sapphire 2026" },
    { statement: "Why 80% of enterprise AI projects fail in year 1", emotional_hook: "Fear", supporting_evidence: "Gartner 2025" },
    { statement: "Agentic AI will eliminate 3M ERP jobs by 2027", emotional_hook: "FOMO", supporting_evidence: "McKinsey" },
  ],
  selection_reasoning: "Top 3 by emotional resonance",
  errors: [], output_path: "",
};

const MOCK_ANGLES_MANUAL = {
  ...MOCK_ANGLES,
  status: "pending",
  selected_angles: [],
  selection_reasoning: "",
};

const MOCK_CONTENT = {
  run_id: "pipe-run-001",
  status: "success",
  angles_processed: [0, 1, 2],
  output_paths: ["outputs/pipe-run-001/content/angle_0"],
  carousel_paths: [
    ["http://localhost:8000/outputs/pipe-run-001/content/angle_0/png/slide_01.png"],
    ["http://localhost:8000/outputs/pipe-run-001/content/angle_1/png/slide_01.png"],
    ["http://localhost:8000/outputs/pipe-run-001/content/angle_2/png/slide_01.png"],
  ],
  captions: ["Caption for angle 0", "Caption for angle 1", "Caption for angle 2"],
  hashtags_per_angle: [["AgenticAI", "SAP"], ["EnterpriseAI", "Fail"], ["FutureOfWork"]],
  errors: [],
};

const MOCK_STATUS_SEARCHING = { run_id: "pipe-run-001", node: "execute_tools", step: 4, total: 9, pct: 44, label: "Searching news & web…" };
const MOCK_STATUS_SYNTHESIZING = { run_id: "pipe-run-001", node: "synthesize", step: 7, total: 9, pct: 78, label: "Synthesising findings…" };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToPipeline(page: Page) {
  await page.goto("/pipeline");
  await expect(page.getByPlaceholder(/enter topic/i)).toBeVisible();
}

async function enterTopic(page: Page) {
  await page.getByPlaceholder(/enter topic/i).fill("Rise of Agentic AI in enterprise");
}

async function mockWebResearch(page: Page) {
  await page.route("**/api/v1/research/run", async route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) })
  );
}

async function mockAnglesAuto(page: Page) {
  await page.route("**/api/v1/angle/run", async route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ANGLES) })
  );
}

async function mockAnglesManual(page: Page) {
  await page.route("**/api/v1/angle/run", async route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ANGLES_MANUAL) })
  );
}

async function mockContent(page: Page) {
  await page.route("**/api/v1/content/run", async route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTENT) })
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Normal Pipeline — Auto Mode", () => {
  test("full auto pipeline completes and shows all 3 stage cards done", async ({ page }) => {
    await mockWebResearch(page);
    await mockAnglesAuto(page);
    await mockContent(page);
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /manual angles/i }).click(); await page.getByRole("button", { name: /auto angles/i }).click();
    await page.getByRole("button", { name: /produce content/i }).click();

    // Wait for all 3 stage cards to show Done
    await expect(page.locator("h3:has-text('Research Results')").locator("..").locator("..").getByText("Done")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("h3:has-text('Angle Selection')").locator("..").locator("..").getByText("Done")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("h3:has-text('Generated Carousels')").locator("..").locator("..").getByText("Done")).toBeVisible({ timeout: 15000 });
  });

  test("research request contains topic, mode, freshness and run_id", async ({ page }) => {
    let capturedBody: any = null;
    await page.route("**/api/v1/research/run", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });
    await mockAnglesAuto(page);
    await mockContent(page);
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /manual angles/i }).click(); await page.getByRole("button", { name: /auto angles/i }).click();
    await page.getByRole("button", { name: /produce content/i }).click();

    await expect(page.locator("text=DONE").first()).toBeVisible({ timeout: 15000 });
    expect(capturedBody?.topic).toBe("Rise of Agentic AI in enterprise");
    expect(capturedBody?.mode).toBe("standard");
    expect(capturedBody?.freshness).toBe("recent");
    expect(capturedBody?.run_id).toBeTruthy(); // pendingRunId passed through
  });

  test("content request uses run_id and selected angles from research/angle results", async ({ page }) => {
    let capturedContentBody: any = null;
    await mockWebResearch(page);
    await mockAnglesAuto(page);
    await page.route("**/api/v1/content/run", async route => {
      capturedContentBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTENT) });
    });
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /manual angles/i }).click(); await page.getByRole("button", { name: /auto angles/i }).click();
    await page.getByRole("button", { name: /produce content/i }).click();

    // Wait until content stage is done — guarantees capturedContentBody is populated
    await expect(page.locator("h3:has-text('Generated Carousels')").locator("..").locator("..").getByText("Done")).toBeVisible({ timeout: 15000 });

    expect(capturedContentBody?.run_id).toBe("pipe-run-001");
    expect(capturedContentBody?.selected_angles).toHaveLength(3);
    expect(capturedContentBody?.research_summary).toContain("Agentic AI");
  });

  test("Stage 1 auto-expands and shows research summary after research completes", async ({ page }) => {
    await mockWebResearch(page);
    await page.route("**/api/v1/angle/run", async route => { await new Promise(r => setTimeout(r, 30000)); route.abort(); });
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /manual angles/i }).click(); await page.getByRole("button", { name: /auto angles/i }).click();
    await page.getByRole("button", { name: /produce content/i }).click();

    await expect(page.getByText(/agentic ai is fundamentally/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("SAP deploying 200+ AI agents")).toBeVisible();
  });
});

test.describe("Normal Pipeline — Manual Mode (HITL)", () => {
  test("manual mode shows HITL modal with all 5 angles after research+angle complete", async ({ page }) => {
    await mockWebResearch(page);
    await mockAnglesManual(page);
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /produce content/i }).click();

    // Modal title
    await expect(page.getByRole("heading", { name: /choose your narrative/i })).toBeVisible({ timeout: 10000 });
    const modal = page.locator("[class*='fixed'][class*='inset']");
    await expect(modal.getByText("SAP is betting its entire future on AI agents")).toBeVisible();
    await expect(modal.getByText("Why 80% of enterprise AI projects fail in year 1")).toBeVisible();
    await expect(modal.getByText("Legacy ERP will be obsolete in 4 years")).toBeVisible();
  });

  test("selecting angles in modal and confirming calls angle/select then content/run", async ({ page }) => {
    let selectCalled = false;
    let contentCalled = false;
    await mockWebResearch(page);
    await mockAnglesManual(page);
    await page.route("**/api/v1/angle/*/select", async route => {
      selectCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...MOCK_ANGLES, status: "success" }) });
    });
    await page.route("**/api/v1/content/run", async route => {
      contentCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTENT) });
    });

    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /produce content/i }).click();
    await expect(page.getByRole("heading", { name: /choose your narrative/i })).toBeVisible({ timeout: 10000 });

    // Angle cards inside the modal are <button> elements — click first one
    const modal = page.locator("[class*='fixed'][class*='inset']");
    await modal.locator("button").filter({ hasText: "SAP is betting its entire future on AI agents" }).click();
    await page.getByRole("button", { name: /generate content/i }).click();

    await page.waitForTimeout(1500);
    expect(selectCalled).toBe(true);
    expect(contentCalled).toBe(true);
  });
});

test.describe("Normal Pipeline — Angle Regeneration", () => {
  test("Regenerate Angles button appears when angle done and content idle", async ({ page }) => {
    await mockWebResearch(page);
    await mockAnglesManual(page);
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /produce content/i }).click();

    await expect(page.getByText("Choose Your Narrative")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await expect(page.getByRole("button", { name: /regenerate angles/i })).toBeVisible();
  });

  test("clicking Regenerate calls /angle/regenerate with exclude_statements", async ({ page }) => {
    let capturedBody: any = null;
    await mockWebResearch(page);
    await mockAnglesManual(page);
    await page.route("**/api/v1/angle/regenerate", async route => {
      capturedBody = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ANGLES) });
    });

    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /produce content/i }).click();
    await expect(page.getByText("Choose Your Narrative")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: /regenerate angles/i }).click();
    await page.waitForTimeout(1000);

    expect(capturedBody?.exclude_statements).toHaveLength(5);
    expect(capturedBody?.topic).toBe("Rise of Agentic AI in enterprise");
  });
});

test.describe("Normal Pipeline — Research Progress Bar", () => {
  test("progress bar and label update while research is running", async ({ page }) => {
    let statusCallCount = 0;
    await page.route("**/api/v1/research/run", async route => {
      await new Promise(r => setTimeout(r, 5000));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESEARCH) });
    });
    await page.route("**/api/v1/research/status/**", async route => {
      statusCallCount++;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STATUS_SEARCHING) });
    });

    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /manual angles/i }).click(); await page.getByRole("button", { name: /auto angles/i }).click();
    await page.getByRole("button", { name: /produce content/i }).click();

    // Expand Stage 1 card to see running state
    await page.waitForTimeout(500);
    await page.locator("h3:has-text('Research Results')").click();
    await page.waitForTimeout(2500); // wait for first poll

    await expect(page.getByText(/searching news/i)).toBeVisible({ timeout: 5000 });
    expect(statusCallCount).toBeGreaterThan(0);
  });

  test("progress bar is gone once research is done", async ({ page }) => {
    await mockWebResearch(page);
    await mockAnglesAuto(page);
    await mockContent(page);
    await page.route("**/api/v1/research/status/**", async route =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STATUS_SYNTHESIZING) })
    );

    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /manual angles/i }).click(); await page.getByRole("button", { name: /auto angles/i }).click();
    await page.getByRole("button", { name: /produce content/i }).click();

    await expect(page.getByText(/agentic ai is fundamentally/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/searching news|synthesising/i)).not.toBeVisible();
  });
});

test.describe("Normal Pipeline — Error Handling", () => {
  test("research error shows error banner", async ({ page }) => {
    await page.route("**/api/v1/research/run", async route =>
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "Internal server error" }) })
    );
    await goToPipeline(page);
    await enterTopic(page);
    await page.getByRole("button", { name: /produce content/i }).click();

    await expect(page.getByText(/pipeline failed|research failed/i)).toBeVisible({ timeout: 8000 });
  });
});
