const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.route("**/ja/blog/2024/newcomer/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("</article>", '<pre id="copy-fixture"><code>    indented line\n\n</code></pre></article>');
    await route.fulfill({ response, body });
  });
});

test("code copy reports clipboard rejection, retries, and preserves whitespace", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.copyAttempts = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async writeText(text) {
          window.copyAttempts += 1;
          if (window.copyAttempts === 1) throw new DOMException("Clipboard denied", "NotAllowedError");
          window.copiedCode = text;
        },
      },
    });
  });
  await page.goto("/ja/blog/2024/newcomer/");
  const wrapper = page.locator(".code-display-wrapper").filter({ has: page.locator("#copy-fixture") });
  const button = wrapper.locator("button.copy");
  await button.click();
  await expect(wrapper.locator('[role="status"]')).toContainText("コピーできませんでした");
  await expect(button.locator(".fa-clipboard-check")).toHaveCount(0);
  await expect(button).toBeFocused();
  await button.click();
  await expect(wrapper.locator('[role="status"]')).toContainText("コピーしました");
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => window.copiedCode)).toBe("    indented line\n\n");
  expect(errors).toEqual([]);
});

test("code copy button is visible when reached by keyboard focus", async ({ page }) => {
  await page.goto("/ja/blog/2024/newcomer/");
  const button = page.locator("button.copy").first();
  await button.focus();
  await expect(button).toHaveCSS("opacity", "1");
});
