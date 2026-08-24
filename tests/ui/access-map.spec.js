const { test, expect } = require("@playwright/test");

test("access map defers Google Maps until the visitor requests it", async ({ page }) => {
  const mapRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://www.google.com/maps")) {
      mapRequests.push(request.url());
    }
  });
  await page.route("https://www.google.com/maps**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Map</title>" })
  );

  await page.goto("/access/", { waitUntil: "networkidle" });
  await expect(page.locator(".access-map-wrap iframe")).toHaveCount(0);
  expect(mapRequests).toEqual([]);

  await page.getByRole("button", { name: /load interactive map/i }).click();
  const map = page.locator(".access-map-wrap iframe");
  await expect(map).toHaveAttribute("title", "Google Map");
  await expect(map).toHaveAttribute("src", /https:\/\/www\.google\.com\/maps/);
  expect(mapRequests).toHaveLength(1);
});
