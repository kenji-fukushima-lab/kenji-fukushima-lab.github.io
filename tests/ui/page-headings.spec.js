const { test, expect } = require("@playwright/test");

async function headingStyle(heading) {
  return heading.evaluate((element) => {
    const style = getComputedStyle(element);
    return Object.fromEntries(
      ["fontSize", "fontWeight", "lineHeight", "padding", "border", "borderRadius", "backgroundImage", "backgroundColor"].map((property) => [
        property,
        style[property],
      ])
    );
  });
}

for (const [name, width, colorScheme] of [
  ["desktop light", 1440, "light"],
  ["desktop dark", 1440, "dark"],
  ["mobile light", 390, "light"],
]) {
  test.describe(`shared page headings: ${name}`, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme });

    for (const prefix of ["", "/ja"]) {
      test(`default page matches recruitment headings in ${prefix || "English"}`, async ({ page }) => {
        await page.goto(`${prefix}/join/`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        const titleStyle = await headingStyle(page.locator(".post-header > h1"));
        const sectionStyle = await headingStyle(page.locator(".join-content > h2").first());

        await page.goto(`${prefix}/join/new-members/`, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".post-header .post-description")).toHaveCount(0);
        expect(await headingStyle(page.locator(".post-header > h1"))).toEqual(titleStyle);
        const sections = page.locator("article.page-content > h2");
        expect(await sections.count()).toBeGreaterThan(0);
        for (const section of await sections.all()) {
          expect(await headingStyle(section)).toEqual(sectionStyle);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      });
    }
  });
}
