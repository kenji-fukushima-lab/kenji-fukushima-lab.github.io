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

test("search retries a failed script download when reopened", async ({ page }) => {
  let attempts = 0;
  await page.route("**/pagefind/pagefind-ui.js", async (route) => {
    attempts += 1;
    if (attempts === 1) await route.abort("failed");
    else await route.continue();
  });
  await page.goto("/ja/");
  await page.locator("#search-toggle").click();
  await expect(page.locator('#pagefind-search [role="alert"]')).toBeVisible();
  await expect(page.locator('#pagefind-search [role="alert"]')).toContainText("検索を読み込めませんでした");
  await page.keyboard.press("Escape");
  await page.locator("#search-toggle").click();
  await expect(page.locator(".pagefind-ui__search-input")).toBeFocused();
  await expect(page.locator('#pagefind-search [role="alert"]')).toHaveCount(0);
  expect(attempts).toBe(2);
});
