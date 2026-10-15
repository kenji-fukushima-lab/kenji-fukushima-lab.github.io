const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("@playwright/test");

for (const path of ["/research/networks/", "/ja/research/networks/"]) {
  test(`coauthor search preserves topology and table rows at ${path}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const graph = page.locator("#coauthor-network-graph");
    await graph.scrollIntoViewIfNeeded();
    await expect(graph).toHaveAttribute("data-layout-state", "complete");
    const result = await page.evaluate(() => {
      const graph = document.getElementById("coauthor-network-graph");
      const node = graph.querySelector("circle");
      const data = node.__data__;
      const table = document.querySelector(".coauthor-network-table tbody tr");
      const coordinates = [node.getAttribute("cx"), node.getAttribute("cy")];
      const input = document.getElementById("network-search");
      input.value = "Kenji";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      const highlighted = graph.querySelectorAll('circle[stroke-width="3.2"]').length;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return {
        sameData: node.__data__ === data,
        sameTable: table !== null && document.querySelector(".coauthor-network-table tbody tr") === table,
        coordinatesUnchanged: JSON.stringify(coordinates) === JSON.stringify([node.getAttribute("cx"), node.getAttribute("cy")]),
        highlighted,
        count: graph.querySelectorAll("circle").length,
      };
    });
    expect(result.sameData).toBe(true);
    expect(result.sameTable).toBe(true);
    expect(result.coordinatesUnchanged).toBe(true);
    expect(result.count).toBeGreaterThan(100);
    expect(result.highlighted).toBeGreaterThan(0);
  });
}

for (const colorScheme of ["light", "dark"]) {
  test(`network toolbar buttons retain contrast on focus in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/research/networks/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const toolbar of [".coauthor-network-toolbar", ".paper-network-toolbar"]) {
      const button = page.locator(`${toolbar} button`).first();
      await button.scrollIntoViewIfNeeded();
      await button.focus();
      const results = await new AxeBuilder({ page }).include(toolbar).analyze();
      expect(results.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
    }
  });
}
