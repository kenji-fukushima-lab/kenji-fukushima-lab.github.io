const { test, expect } = require("@playwright/test");

test("GitHub rate limits stop the queue and survive reload without replacing saved statistics", async ({ page }) => {
  await page.clock.install();
  let calls = 0;
  await page.route("https://api.github.com/repos/**", async (route) => {
    calls++;
    await route.fulfill({ status: 403, contentType: "application/json", body: "{}" });
  });
  await page.goto("/resources/", { waitUntil: "domcontentloaded" });
  const status = page.locator("[data-repo-stats-status]");
  await expect(status).toContainText(/could not|読み込/);
  expect(calls).toBeGreaterThan(0);
  expect(calls).toBeLessThanOrEqual(3);
  const initialCalls = calls;
  const statistics = await page.locator("[data-repo-stat-value]").allTextContents();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(status).toContainText(/could not|読み込/);
  expect(calls).toBe(initialCalls);
  expect(await page.locator("[data-repo-stat-value]").allTextContents()).toEqual(statistics);
  await page.clock.fastForward(5 * 60_000 + 1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => calls).toBeGreaterThan(initialCalls);
});

test("GitHub refresh uses at most three concurrent requests and caches successful responses", async ({ page }) => {
  let active = 0;
  let peak = 0;
  let calls = 0;
  await page.route("https://api.github.com/repos/**", async (route) => {
    calls++;
    peak = Math.max(peak, ++active);
    await new Promise((resolve) => setTimeout(resolve, 30));
    active--;
    await route.fulfill({ json: { stargazers_count: 123, forks_count: 2, open_issues_count: 4, pushed_at: new Date().toISOString() } });
  });
  await page.goto("/resources/", { waitUntil: "domcontentloaded" });
  const status = page.locator("[data-repo-stats-status]");
  await expect(status).toContainText("statistics loaded");
  expect(peak).toBe(3);
  expect(calls).toBeGreaterThan(3);
  const initialCalls = calls;
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".repo-compact-stat.is-loading")).toHaveCount(0);
  expect(calls).toBe(initialCalls);
});

for (const count of [0, 23]) {
  test(`Crossref caches a count of ${count} across reloads and refreshes expired results`, async ({ page }) => {
    await page.clock.install();
    let calls = 0;
    await page.route("https://api.crossref.org/works/**", async (route) => {
      calls++;
      await route.fulfill({ json: { message: { "is-referenced-by-count": count } } });
    });
    await page.goto("/publications/", { waitUntil: "domcontentloaded" });
    const sort = page.locator("#pub-sort");
    await sort.selectOption("crossref-citations");
    await expect.poll(() => calls).toBeGreaterThan(0);
    await expect(page.locator("#pub-badge-status")).toContainText("Citation counts refreshed.");
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("crossref-count:")).length)).toBe(calls);
    const initialCalls = calls;
    await page.reload({ waitUntil: "domcontentloaded" });
    await sort.selectOption("crossref-citations");
    await expect(page.locator("#publications-results .publication-entry").first()).toBeVisible();
    await page.waitForTimeout(100);
    expect(calls).toBe(initialCalls);
    await page.clock.fastForward(24 * 60 * 60_000 + 1);
    await page.reload({ waitUntil: "domcontentloaded" });
    await sort.selectOption("crossref-citations");
    await expect.poll(() => calls).toBeGreaterThan(initialCalls);
  });
}

test("Crossref failures have a short retry interval and never masquerade as a known zero", async ({ page }) => {
  await page.clock.install();
  let calls = 0;
  await page.route("https://api.crossref.org/works/**", async (route) => {
    calls++;
    await route.fulfill({ status: 503, body: "" });
  });
  await page.goto("/publications/", { waitUntil: "domcontentloaded" });
  await page.locator("#pub-sort").selectOption("crossref-citations");
  await expect.poll(() => calls).toBeGreaterThan(0);
  await expect(page.locator("#pub-badge-status")).toContainText("Citation counts refreshed.");
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("crossref-count:")).length)).toBe(calls);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage)
        .filter((key) => key.startsWith("crossref-count:"))
        .every((key) => JSON.parse(localStorage.getItem(key)).count === null)
    )
  ).toBe(true);
  const initialCalls = calls;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#pub-sort").selectOption("crossref-citations");
  await page.waitForTimeout(100);
  expect(calls).toBe(initialCalls);
  await page.clock.fastForward(60_001);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#pub-sort").selectOption("crossref-citations");
  await expect.poll(() => calls).toBeGreaterThan(initialCalls);
});
