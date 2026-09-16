const { test, expect } = require("@playwright/test");

function imageSources(page) {
  return page.locator("[data-home-hero] img").evaluateAll((images) => images.map((image) => image.src));
}

async function expectSquareTiles(page, expectedCount) {
  const tiles = page.locator("[data-home-hero] .home-hero-gallery__tile");
  await expect(tiles).toHaveCount(expectedCount);

  const dimensions = await tiles.first().evaluate((tile) => {
    const bounds = tile.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });

  expect(dimensions.height).toBeGreaterThan(0);
  expect(dimensions.width).toBeGreaterThan(0);
  expect(Math.abs(dimensions.width / dimensions.height - 1)).toBeLessThan(0.02);
}

test.describe("home hero gallery", () => {
  test("shows fourteen random square tiles and replaces one after a pause", async ({ page }) => {
    await page.goto("/ja/");
    await expectSquareTiles(page, 14);

    const before = await imageSources(page);

    await page.waitForFunction(
      (previousSources) => {
        const currentSources = [...document.querySelectorAll("[data-home-hero] img")].map((image) => image.src);
        return (
          currentSources.length === previousSources.length && currentSources.filter((source, index) => source !== previousSources[index]).length === 1
        );
      },
      before,
      { timeout: 10000 }
    );
  });

  test("uses fewer small-source tiles on a phone-sized viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ja/");
    await expectSquareTiles(page, 6);

    const sources = await imageSources(page);
    expect(sources.every((source) => source.includes("-small.jpg") || source.includes("/publication_preview/"))).toBe(true);
  });
});
