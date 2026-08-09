const { test, expect } = require("@playwright/test");

test("shows the current Japanese blog page range while filtering and paging", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ja/blog/");

  const count = page.locator("#blog-active-count");
  await expect(count).toHaveText(/^表示中 1–20件 \/ 全\d+件$/);
  await expect(page.locator(".post-card:visible")).toHaveCount(20);

  await page.getByRole("button", { name: "ページ 2", exact: true }).click();
  await expect(count).toHaveText(/^表示中 21–40件 \/ 全\d+件$/);
  await expect(page.locator(".post-card:visible")).toHaveCount(20);

  await page.locator("#blogsearch").fill("ショウジョウバエ");
  await expect(count).toHaveText("表示中 1–1件 / 全1件");
  await expect(page.locator(".post-card:visible")).toHaveCount(1);
  await expect(page.locator(".post-card:visible .post-title")).toContainText("キイロショウジョウバエ");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
