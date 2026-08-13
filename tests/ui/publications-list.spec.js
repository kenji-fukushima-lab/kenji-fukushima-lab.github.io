const { test, expect } = require("@playwright/test");

for (const path of ["/publications/", "/ja/publications/"]) {
  test(`shows every publication on one page at ${path}`, async ({ page }) => {
    await page.goto(path);

    const publications = page.locator("#publications-results ol.bibliography > li");
    await expect.poll(() => publications.count()).toBeGreaterThan(25);

    const publicationCount = await publications.count();
    await expect(page.locator("#pub-active-count")).toHaveText(new RegExp(`${publicationCount} / ${publicationCount}$`));
    await expect(page.locator(".publications-pagination")).toHaveCount(0);
  });
}
