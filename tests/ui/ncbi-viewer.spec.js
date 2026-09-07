const { test, expect } = require("@playwright/test");

for (const pathname of ["/resources/", "/ja/resources/"]) {
  test(`NCBI viewers retry failed downloads and share the loaded script at ${pathname}`, async ({ page }) => {
    let attempts = 0;
    await page.route("https://www.ncbi.nlm.nih.gov/projects/sviewer/js/sviewer.js", async (route) => {
      attempts += 1;
      if (attempts === 1) return route.abort();
      await route.fulfill({
        contentType: "application/javascript",
        body: `window.viewerLoads = []; window.SeqView = { App: class {
          static findAppByDivId() { return null; }
          constructor(id) { this.id = id; }
          load() { window.viewerLoads.push(this.id); }
        } };`,
      });
    });
    await page.goto(pathname);
    const buttons = page.locator("[data-ncbi-load]");
    const first = buttons.first();
    await first.click();
    await expect(page.locator("[data-ncbi-error]").first()).toBeVisible();
    await expect(first).toBeEnabled();
    await first.click();
    await expect(page.locator('[data-ncbi-load="ncbi-sv-cephalotus"]')).toHaveCount(0);
    await expect(page.locator("[data-ncbi-error]").first()).toBeHidden();
    await buttons.first().click();
    await expect(buttons).toHaveCount(0);
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => window.viewerLoads)).toEqual(["ncbi-sv-cephalotus", "ncbi-sv-nepenthes"]);
  });
}
