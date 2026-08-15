const { test, expect } = require("@playwright/test");

async function imageDimensions(locator) {
  return locator.evaluate((image) => {
    const bounds = image.getBoundingClientRect();
    return {
      height: bounds.height,
      width: bounds.width,
      objectFit: getComputedStyle(image).objectFit,
    };
  });
}

function expectAspectRatioToMatch(dimensions, expectedRatio, tolerance = 0.02) {
  expect(dimensions.height).toBeGreaterThan(0);
  expect(dimensions.width).toBeGreaterThan(0);
  expect(Math.abs(dimensions.width / dimensions.height - expectedRatio)).toBeLessThan(tolerance);
}

test.describe("responsive image proportions", () => {
  test("preserves project-card thumbnail aspect ratios", async ({ page }) => {
    await page.goto("/research/");

    const thumbnails = page.locator(".projects .card img");
    expect(await thumbnails.count()).toBeGreaterThan(0);

    const dimensions = await imageDimensions(thumbnails.first());
    expectAspectRatioToMatch(dimensions, 4 / 3);
    expect(dimensions.height).toBeLessThan(300);
  });

  test("preserves side-by-side research image proportions", async ({ page }) => {
    await page.goto("/ja/research/3_project/");

    const arabidopsis = page.getByAltText("Arabidopsis thaliana");
    await arabidopsis.scrollIntoViewIfNeeded();
    const dimensions = await imageDimensions(arabidopsis);

    expectAspectRatioToMatch(dimensions, 4 / 3);
    expect(dimensions.height).toBeLessThan(400);
  });

  test("retains intentional square thumbnail crops", async ({ page }) => {
    await page.goto("/outreach/");

    const thumbnail = page.locator(".feature-thumb-link img");
    const dimensions = await imageDimensions(thumbnail);

    expectAspectRatioToMatch(dimensions, 1);
    expect(dimensions.objectFit).toBe("cover");
  });
});
