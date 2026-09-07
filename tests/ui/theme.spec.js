const { test, expect } = require("@playwright/test");

for (const deniedOperation of ["getItem", "setItem"]) {
  test(`theme and search remain usable when storage ${deniedOperation} is denied`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((operation) => {
      const original = Storage.prototype[operation];
      Storage.prototype[operation] = function (key, ...args) {
        if (key === "theme") throw new DOMException("Storage denied", "SecurityError");
        return original.call(this, key, ...args);
      };
    }, deniedOperation);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator("#light-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator("#light-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.locator("#search-toggle").click();
    await expect(page.locator(".pagefind-ui__search-input")).toBeFocused();
    expect(errors).toEqual([]);
  });
}
