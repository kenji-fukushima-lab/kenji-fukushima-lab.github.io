const { test, expect } = require("@playwright/test");

test("mobile search restores focus to the visible navigation toggle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const navigationToggle = page.getByRole("button", { name: "Toggle navigation" });
  await navigationToggle.click();
  await page.getByRole("button", { name: "Search this site" }).click();
  await expect(page.getByPlaceholder("Search")).toBeFocused();

  await page.getByRole("button", { name: "Close search" }).click();

  await expect(navigationToggle).toBeFocused();
});
