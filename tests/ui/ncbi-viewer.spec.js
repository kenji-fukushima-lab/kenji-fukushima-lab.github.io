const { test, expect } = require("@playwright/test");

const pathname = "/ja/resources/";
const viewerIds = ["ncbi-sv-cephalotus", "ncbi-sv-nepenthes", "ncbi-sv-triphyophyllum", "ncbi-sv-ancistrocladus", "ncbi-sv-dionaea"];

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
  await expect(page.locator(`[data-ncbi-load="${viewerIds[0]}"]`)).toHaveCount(0);
  await expect(page.locator("[data-ncbi-error]").first()).toBeHidden();
  for (const id of viewerIds.slice(1)) {
    const button = page.locator(`[data-ncbi-load="${id}"]`);
    await button.click();
    await expect(button).toHaveCount(0);
    await expect(page.locator(`#${id}`)).not.toHaveAttribute("hidden");
  }
  await expect(buttons).toHaveCount(0);
  expect(attempts).toBe(2);
  expect(await page.evaluate(() => window.viewerLoads)).toEqual(viewerIds);
});
