const { test, expect } = require("@playwright/test");

for (const path of ["/publications/", "/ja/publications/"]) {
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
