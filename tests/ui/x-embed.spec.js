const { test, expect } = require("@playwright/test");

test("loads X widgets near the food report and preserves fallback links on failure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });

  let widgetRequests = 0;
  await page.route("https://platform.twitter.com/**", async (route) => {
    widgetRequests += 1;
    await route.abort();
  });

  await page.goto("/ja/blog/2026/post-33/");

  const embeds = page.locator("[data-x-embed]");
  const fallbackLinks = embeds.getByRole("link", { name: /福島先生のX投稿/ });
  await expect(embeds).toHaveCount(3);
  await expect(fallbackLinks).toHaveCount(3);
  expect(await fallbackLinks.evaluateAll((links) => links.map((link) => link.href))).toEqual([
    "https://twitter.com/kfuku0502/status/2085642664616276059",
    "https://twitter.com/kfuku0502/status/2085642668336619762",
    "https://twitter.com/kfuku0502/status/2085642669754319137",
  ]);

  await page.waitForTimeout(250);
  await expect(page.locator("script[data-x-widgets]")).toHaveCount(0);
  expect(widgetRequests).toBe(0);

  await page.getByText("味（福島先生の食レポ）").scrollIntoViewIfNeeded();
  await expect(page.locator("script[data-x-widgets]")).toHaveCount(1);
  await expect.poll(() => widgetRequests).toBeGreaterThan(0);
  await expect(fallbackLinks).toHaveCount(3);
});
