const { test, expect } = require("@playwright/test");

for (const path of ["/research/networks/", "/ja/research/networks/"]) {
  test(`word cloud preserves its layout after resizing and remeasures changed fonts at ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const chart = page.locator("#publication-word-cloud-chart");
    await chart.scrollIntoViewIfNeeded();
    await expect.poll(() => chart.locator("svg text").count()).toBeGreaterThan(30);
    const shape = () =>
      chart.locator("svg").evaluate((svg) => ({
        viewBox: svg.getAttribute("viewBox"),
        terms: [...svg.querySelectorAll("text")].map((node) => [
          node.textContent,
          node.getAttribute("x"),
          node.getAttribute("y"),
          node.getAttribute("font-size"),
        ]),
      }));
    const original = await shape();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await shape()).viewBox).not.toBe(original.viewBox);
    await expect.poll(() => chart.locator("svg text").count()).toBeGreaterThan(30);
    await page.setViewportSize({ width: 1440, height: 1400 });
    await expect.poll(shape).toEqual(original);
    await chart.evaluate((node) => {
      node.style.fontFamily = "monospace";
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await shape()).viewBox).not.toBe(original.viewBox);
    const monospaceMobile = await shape();
    await page.setViewportSize({ width: 1440, height: 1400 });
    await expect.poll(async () => (await shape()).viewBox).not.toBe(monospaceMobile.viewBox);
    await expect.poll(async () => (await shape()).terms).not.toEqual(original.terms);
    const monospaceDesktop = await shape();
    await chart.evaluate((node) => {
      node.style.removeProperty("font-family");
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(async () => (await shape()).viewBox).not.toBe(monospaceDesktop.viewBox);
    await page.setViewportSize({ width: 1440, height: 1400 });
    await expect.poll(shape).toEqual(original);
    await expect(chart.locator("svg")).toHaveAttribute("role", "img");
    await expect(chart.locator("svg text").first()).toHaveAttribute("tabindex", "0");
  });
}
