const { test, expect } = require("@playwright/test");

for (const path of ["/publications/", "/ja/publications/"]) {
  test(`keeps publication search usable with malformed URL fragments at ${path}`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${path}#%E0%A4%A`);
    await expect(page.locator("#bibsearch")).toHaveValue("%E0%A4%A");
    await expect(page.locator("#pub-active-count")).toHaveText(/0 \/ \d+$/);
    await page.locator("#pub-reset-filters").click();
    await expect.poll(() => page.locator("#publications-results ol.bibliography > li").count()).toBeGreaterThan(25);
    expect(errors).toEqual([]);
  });

  test(`restores all publications when the URL fragment is cleared at ${path}`, async ({ page }) => {
    await page.goto(`${path}#no-matching-publication-12345`);
    await expect(page.locator("#pub-active-count")).toHaveText(/0 \/ \d+$/);
    await page.evaluate(() => {
      window.location.hash = "";
    });
    await expect(page.locator("#bibsearch")).toHaveValue("");
    await expect.poll(() => page.locator("#publications-results ol.bibliography > li").count()).toBeGreaterThan(25);
    await page.evaluate(() => {
      window.location.hash = encodeURIComponent("plant");
    });
    await expect(page.locator("#bibsearch")).toHaveValue("plant");
    await expect.poll(() => page.locator("#publications-results ol.bibliography > li").count()).toBeGreaterThan(0);
  });

  test(`shows every publication on one page at ${path}`, async ({ page }) => {
    if (path.startsWith("/ja/")) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);

    const publications = page.locator("#publications-results ol.bibliography > li");
    await expect.poll(() => publications.count()).toBeGreaterThan(25);

    const publicationCount = await publications.count();
    await expect(page.locator("#pub-active-count")).toHaveText(new RegExp(`${publicationCount} / ${publicationCount}$`));
    await expect(page.locator(".publications-pagination")).toHaveCount(0);
    await expect(page.locator(".publication-author-legend")).toContainText(path.startsWith("/ja/") ? "ラボメンバー" : "Lab member");
    const author = page.locator(".publication-entry .author .lab-member-author").first();
    await expect(author).toBeVisible();
    await expect(author).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
