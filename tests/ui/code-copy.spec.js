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

test("pending copy retains focus, ignores repeat activation, and does not steal moved focus", async ({ page }) => {
  await page.addInitScript(() => {
    window.copyAttempts = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText() {
          window.copyAttempts += 1;
          return new Promise((resolve) => {
            window.finishCopy = resolve;
          });
        },
      },
    });
  });
  await page.goto("/ja/blog/2024/newcomer/");
  const wrapper = page.locator(".code-display-wrapper").filter({ has: page.locator("#copy-fixture") });
  const button = wrapper.locator("button.copy");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.copyAttempts)).toBe(1);
  await page.keyboard.press("Tab");
  await expect(button).not.toBeFocused();
  await page.evaluate(() => window.finishCopy());
  await expect(wrapper.locator('[role="status"]')).toContainText("コピーしました");
  await expect(button).not.toHaveAttribute("aria-disabled", "true");
  await expect(button).not.toBeFocused();
  await button.click();
  expect(await page.evaluate(() => window.copyAttempts)).toBe(2);
  await page.evaluate(() => window.finishCopy());
  await expect(button).toBeFocused();
});
