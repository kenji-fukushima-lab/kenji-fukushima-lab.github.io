const { test, expect } = require("@playwright/test");

test("keeps unchanged blog cards in place and still updates paging, empty results and reset", async ({ page }) => {
  await page.goto("/ja/blog/");
  const cards = page.locator(".post-card:visible .post-title");
  const links = () => cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  await expect(page.locator(".post-card:visible")).toHaveCount(20);
  const firstPage = await links();
  await page.locator("#blogsearch").fill(" ");
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    window.blogCardChanges = 0;
    window.blogCardObserver = new MutationObserver((records) => {
      window.blogCardChanges += records.length;
    });
    window.blogCardObserver.observe(document.querySelector(".post-list"), { subtree: true, attributes: true, childList: true });
  });
  await page.locator("#blogsearch").fill("  ");
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.blogCardChanges)).toBe(0);
  await page.evaluate(() => window.blogCardObserver.disconnect());
  expect(await links()).toEqual(firstPage);
  await page.getByRole("button", { name: "ページ 2", exact: true }).click();
  await expect(page.locator("#blog-active-count")).toHaveText(/^表示中 21–40件/);
  expect(await links()).not.toEqual(firstPage);
  await page.locator("#blogsearch").fill("zzzz-no-matching-post");
  await expect(page.locator(".post-card:visible")).toHaveCount(0);
  await expect(page.locator(".blog-empty-state")).toBeVisible();
  await page.locator("#blog-reset-filters").click();
  await expect(page.locator(".post-card:visible")).toHaveCount(20);
  expect(await links()).toEqual(firstPage);
});

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
