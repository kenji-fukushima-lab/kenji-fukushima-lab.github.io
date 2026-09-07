const { test, expect } = require("@playwright/test");

async function mockQuestions(page, limit = 10) {
  let count = 0;
  await page.route("https://api.inaturalist.org/v1/observations?*", async (route) => {
    count += 1;
    if (count > limit) return route.fulfill({ status: 503, body: "Unavailable" });
    const taxonId = Number(new URL(route.request().url()).searchParams.get("taxon_id").split(",")[0]);
    await route.fulfill({
      json: {
        results: [
          {
            id: count,
            taxon: { id: taxonId, rank: "species", name: `Drosera fixture${count}` },
            photos: [{ url: "https://example.test/quiz.jpg", license_code: "cc-by", attribution: "Test photographer" }],
          },
        ],
      },
    });
  });
  await page.route("https://example.test/quiz.jpg", (route) => route.fulfill({ path: "assets/img/00_tiles.jpg", contentType: "image/jpeg" }));
}

for (const pathname of ["/carnivorous-plant-quiz/", "/ja/carnivorous-plant-quiz/"]) {
  test(`quiz moves keyboard focus through questions and results at ${pathname}`, async ({ page }) => {
    await mockQuestions(page);
    await page.goto(pathname);
    await page.locator("[data-cp-start]").click();
    for (let question = 1; question <= 10; question += 1) {
      await expect(page.locator("[data-cp-choices] button").first()).toBeFocused();
      await expect(page.locator("[data-cp-progress]")).toHaveText(`${question} / 10`);
      await page.locator(`[data-choice="Drosera fixture${question}"]`).click();
      await expect(page.locator("[data-cp-next]")).toBeFocused();
      await page.locator("[data-cp-next]").click();
    }
    await expect(page.locator("[data-cp-result-heading]")).toBeFocused();
    await expect(page.locator("[data-cp-result-heading]")).toContainText("100%");
    await expect(page.locator("[data-cp-result-copy]")).toContainText("10");
  });

  test(`quiz identifies an incomplete run after photo loading fails at ${pathname}`, async ({ page }) => {
    await mockQuestions(page, 2);
    await page.goto(pathname);
    await page.locator("[data-cp-start]").click();
    for (let question = 1; question <= 2; question += 1) {
      await page.locator(`[data-choice="Drosera fixture${question}"]`).click();
      await page.locator("[data-cp-next]").click();
    }
    await expect(page.locator("[data-cp-results]")).toBeVisible();
    await expect(page.locator("[data-cp-status]")).toContainText(pathname.startsWith("/ja/") ? "中断" : "stopped");
    await expect(page.locator("[data-cp-result-copy]")).toContainText("2");
    await expect(page.locator("[data-cp-result-heading]")).toHaveText(/100%/);
    await expect(page.locator("[data-cp-status]")).toHaveAttribute("role", "status");
  });
}
