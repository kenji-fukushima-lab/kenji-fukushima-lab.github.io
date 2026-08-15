const { test, expect } = require("@playwright/test");

test.describe("publication author highlights", () => {
  test("marks lab-member authors and explains the marker in English", async ({ page }) => {
    await page.goto("/publications/");

    const legend = page.locator(".publication-author-legend");
    await expect(legend).toContainText("Lab member");
    await expect(legend).toContainText("Highlighted author names");

    const highlightedAuthors = page.locator(".publication-entry .author .lab-member-author");
    expect(await highlightedAuthors.count()).toBeGreaterThan(0);

    const styles = await highlightedAuthors.first().evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        fontWeight: computed.fontWeight,
      };
    });
    expect(Number(styles.fontWeight)).toBeGreaterThanOrEqual(700);
    expect(styles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("shows the Japanese author legend without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ja/publications/");

    await expect(page.locator(".publication-author-legend")).toContainText("ラボメンバー");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
