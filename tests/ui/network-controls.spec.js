const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("@playwright/test");

for (const colorScheme of ["light", "dark"]) {
  test(`network toolbar buttons retain contrast on focus in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/research/networks/", { waitUntil: "networkidle" });
    for (const toolbar of [".coauthor-network-toolbar", ".paper-network-toolbar"]) {
      const button = page.locator(`${toolbar} button`).first();
      await button.scrollIntoViewIfNeeded();
      await button.focus();
      const results = await new AxeBuilder({ page }).include(toolbar).analyze();
      expect(results.violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => node.target) }))).toEqual([]);
    }
  });
}
