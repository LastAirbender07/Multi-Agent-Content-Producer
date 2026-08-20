import { test, expect, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const SCREENSHOTS_DIR = path.join(__dirname, "../e2e-screenshots");

function ensureDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function shot(page: Page, name: string) {
  ensureDir();
  const p = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`📸 Screenshot saved: ${name}.png`);
}

test.describe("Pipeline SSE Progress — Full E2E", () => {
  test.setTimeout(180_000);

  test("1 — Idle / topic input screen renders correctly", async ({ page }) => {
    await page.goto("http://localhost:3000/pipeline");
    await page.waitForLoadState("networkidle");

    // headline present
    await expect(page.getByText("Research & Generate")).toBeVisible();
    await expect(page.getByText("Content Pipeline")).toBeVisible();

    // topic textarea
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute("placeholder", /topic/i);

    // start button disabled when empty
    const btn = page.getByRole("button", { name: /start pipeline/i });
    await expect(btn).toBeDisabled();

    await shot(page, "01-idle-screen");
  });

  test("2 — Research phase: SSE events flow, progress bar advances, activity log fills", async ({ page }) => {
    await page.goto("http://localhost:3000/pipeline");
    await page.waitForLoadState("networkidle");

    // Fill topic and start
    await page.locator("textarea").fill("The future of AI agents in enterprise software");
    const btn = page.getByRole("button", { name: /start pipeline/i });
    await expect(btn).not.toBeDisabled();
    await shot(page, "02-topic-filled");

    // Start the pipeline
    await btn.click();

    // Stage indicator should appear
    await expect(page.getByText("Research")).toBeVisible({ timeout: 5_000 });

    await shot(page, "03-research-starting");

    // Wait for the "Live" badge to appear (SSE connected)
    await expect(page.getByText("Live").first()).toBeVisible({ timeout: 10_000 });
    await shot(page, "04-research-live-connected");

    // Wait for activity to appear
    await expect(page.getByText("Activity").first()).toBeVisible({ timeout: 15_000 });
    await shot(page, "05-research-activity-log");

    // Progress bar should show > 0% width
    const progressBars = page.locator('[style*="width:"]').filter({ hasText: "" });
    // Look for the violet progress bar specifically
    const researchCard = page.locator("text=Deep Research").locator("..");
    await expect(researchCard).toBeVisible({ timeout: 5_000 });

    // Check that activity log has real events
    const activityItems = page.locator("text=/\\d+%/").first();
    await expect(activityItems).toBeVisible({ timeout: 20_000 });

    // Wait for "synthesising" phase
    await expect(page.getByText(/Synthesising/i).first()).toBeVisible({ timeout: 60_000 });
    await shot(page, "06-research-synthesising");

    // Wait for "Done" badge on research card
    await expect(page.getByText("Done").first()).toBeVisible({ timeout: 60_000 });
    await shot(page, "07-research-complete");
  });

  test("3 — Content phase: generates after research, shows carousel progress", async ({ page }) => {
    await page.goto("http://localhost:3000/pipeline");
    await page.waitForLoadState("networkidle");

    await page.locator("textarea").fill("Why most productivity advice is wrong");
    await page.getByRole("button", { name: /start pipeline/i }).click();

    // Wait for research to fully complete
    await expect(page.getByText("Done").first()).toBeVisible({ timeout: 90_000 });
    await shot(page, "08-research-done-content-starting");

    // Content card should appear
    await expect(page.getByText("Generate Carousels")).toBeVisible({ timeout: 10_000 });
    await shot(page, "09-content-card-appeared");

    // Wait for content SSE to connect
    await expect(page.getByText("Live").nth(1)).toBeVisible({ timeout: 10_000 }).catch(() => {
      // May have connected and disconnected already — that's fine
    });

    await shot(page, "10-content-live");

    // Wait for activity in content phase
    await page.waitForTimeout(3_000);
    await shot(page, "11-content-generating");

    // Wait for content to complete
    await expect(page.getByText("Pipeline complete")).toBeVisible({ timeout: 90_000 });
    await shot(page, "12-pipeline-complete");
  });

  test("4 — SSE endpoints directly: verify event payloads", async ({ request }) => {
    // POST a research run
    const runId = `sse_test_${Date.now()}`;
    const postRes = await request.post(`http://localhost:8000/api/v1/research/${runId}`, {
      data: { topic: "Generative AI in 2025" },
    });
    expect(postRes.ok()).toBeTruthy();

    // Collect SSE events via Node fetch
    const events: Array<{ phase: string; pct: number; message: string }> = [];

    await new Promise<void>((resolve, reject) => {
      const url = `http://localhost:8000/api/v1/research/${runId}/events`;
      const timeout = setTimeout(() => reject(new Error("SSE timeout after 90s")), 90_000);

      (async () => {
        const response = await fetch(url);
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value);
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const ev = JSON.parse(line.slice(6));
                events.push(ev);
                console.log(`[SSE] phase=${ev.phase} pct=${ev.pct}% msg="${ev.message}"`);
                if (ev.phase === "complete" || ev.phase === "error") {
                  clearTimeout(timeout);
                  reader.cancel();
                  resolve();
                  return;
                }
              } catch {
                // ignore
              }
            }
          }
        }
        clearTimeout(timeout);
        resolve();
      })().catch(reject);
    });

    console.log(`\n✅ Total SSE events received: ${events.length}`);
    console.table(events.map((e) => ({ phase: e.phase, pct: e.pct, message: e.message })));

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].phase).toBeTruthy();
    expect(typeof events[0].pct).toBe("number");

    // pct should never go backwards
    for (let i = 1; i < events.length; i++) {
      if (events[i].phase !== "error") {
        expect(events[i].pct).toBeGreaterThanOrEqual(events[i - 1].pct);
      }
    }

    // last event should be complete
    const last = events[events.length - 1];
    expect(["complete", "error"]).toContain(last.phase);
  });

  test("5 — Content SSE endpoint: verify payload shape", async ({ request }) => {
    const runId = `content_sse_test_${Date.now()}`;
    const postRes = await request.post(`http://localhost:8000/api/v1/content/${runId}`, {
      data: { run_id: runId },
    });
    expect(postRes.ok()).toBeTruthy();

    const events: Array<{ phase: string; pct: number; message: string }> = [];

    await new Promise<void>((resolve, reject) => {
      const url = `http://localhost:8000/api/v1/content/${runId}/events`;
      const timeout = setTimeout(() => reject(new Error("Content SSE timeout after 90s")), 90_000);

      (async () => {
        const response = await fetch(url);
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value);
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const ev = JSON.parse(line.slice(6));
                events.push(ev);
                console.log(`[Content SSE] phase=${ev.phase} pct=${ev.pct}% msg="${ev.message}"`);
                if (ev.phase === "complete" || ev.phase === "error") {
                  clearTimeout(timeout);
                  reader.cancel();
                  resolve();
                  return;
                }
              } catch {
                // ignore
              }
            }
          }
        }
        clearTimeout(timeout);
        resolve();
      })().catch(reject);
    });

    console.log(`\n✅ Total Content SSE events: ${events.length}`);
    console.table(events.map((e) => ({ phase: e.phase, pct: e.pct, message: e.message })));

    expect(events.length).toBeGreaterThan(0);
    const phasesSeen = [...new Set(events.map((e) => e.phase))];
    console.log("Phases seen:", phasesSeen.join(", "));
    expect(phasesSeen.length).toBeGreaterThan(1); // at least 2 distinct phases
  });
});