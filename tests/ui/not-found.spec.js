const { test, expect } = require("@playwright/test");

for (const pathname of ["/404.html", "/ja/404.html"]) {
  test(`404 page preserves reading time and offers the localized home link at ${pathname}`, async ({ page }) => {
    await page.goto(pathname);
    await expect(page.locator('meta[http-equiv="refresh"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const home = page.locator("article a").filter({ hasText: pathname.startsWith("/ja/") ? "日本語トップページ" : "home page" });
    const href = await home.getAttribute("href");
    expect(new URL(href, page.url()).pathname).toBe(pathname.startsWith("/ja/") ? "/ja/" : "/");
    await home.click();
    await expect(page).toHaveURL(new RegExp(pathname.startsWith("/ja/") ? "/ja/$" : ":8080/$"));
  });
}
