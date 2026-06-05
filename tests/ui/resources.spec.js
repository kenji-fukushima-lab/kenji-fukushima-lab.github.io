const { test, expect } = require("@playwright/test");

const PAPER_GRAPH = "#paper-network-graph";
const COAUTHOR_GRAPH = "#coauthor-network-graph";

function scaleFromTransform(transform) {
  if (!transform) {
    return null;
  }

  const match = transform.match(/scale\(([^)]+)\)/);
  return match ? Number(match[1]) : null;
}

async function graphTransform(page, graphSelector) {
  return page.evaluate((selector) => {
    const viewport = document.querySelector(`${selector} svg > g`);
    return viewport ? viewport.getAttribute("transform") : null;
  }, graphSelector);
}

async function waitForGraphLayout(page, graphSelector, previousTransform = null, timeout = 15_000) {
  await expect(page.locator(`${graphSelector} svg`)).toBeVisible();
  await page.waitForFunction(
    ({ selector, previous }) => {
      const viewport = document.querySelector(`${selector} svg > g`);
      const transform = viewport ? viewport.getAttribute("transform") : null;
      return Boolean(transform && /scale\(([^)]+)\)/.test(transform) && (previous === null || transform !== previous));
    },
    { selector: graphSelector, previous: previousTransform },
    { timeout }
  );

  return graphTransform(page, graphSelector);
}

async function graphScale(page, graphSelector) {
  return scaleFromTransform(await graphTransform(page, graphSelector));
}

test.describe("resources page smoke tests", () => {
  test("renders both network graphs", async ({ page }) => {
    await page.goto("/resources/");
    await waitForGraphLayout(page, PAPER_GRAPH);
    await waitForGraphLayout(page, COAUTHOR_GRAPH);

    expect(await page.locator(`${PAPER_GRAPH} circle`).count()).toBeGreaterThan(30);
    await expect(page.locator(`${COAUTHOR_GRAPH} circle`).first()).toBeVisible();
  });

  test("renders repository fork counts without compressed shield images", async ({ page }) => {
    await page.route("https://api.github.com/repos/**", async (route) => {
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          description: `${repo} description`,
          open_issues_count: 2,
          forks_count: 7,
          pushed_at: new Date().toISOString(),
          stargazers_count: 11,
        }),
      });
    });

    await page.goto("/resources/");

    const forkLink = page.locator('[data-analytics-label="repository_forks"]').first();
    const forkBadge = forkLink.locator(".repo-compact-stat-forks");
    await expect(forkBadge).toBeVisible();
    await expect(page.locator(".repo-compact-badges img")).toHaveCount(0);
    await expect(forkBadge.locator("[data-repo-stat-value]")).toHaveText("7");

    const badgeBox = await forkBadge.boundingBox();
    expect(badgeBox.width).toBeGreaterThan(50);
  });

  test("uses English repository stat labels on the Japanese resources page", async ({ page }) => {
    await page.route("https://api.github.com/repos/**", async (route) => {
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          description: `${repo} description`,
          open_issues_count: 2,
          forks_count: 7,
          pushed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          stargazers_count: 11,
        }),
      });
    });

    await page.goto("/ja/resources/");

    const firstRepo = page.locator(".repo-compact").first();
    await expect(firstRepo.locator(".repo-compact-stat-label")).toHaveText(["Stars", "Forks", "Last commit", "Issue"]);
    await expect(firstRepo.locator(".repo-compact-stat-commits [data-repo-stat-value]")).toHaveText("2 days ago");
  });

  test("paper network keeps isolates visible and avoids over-zooming out after year reset", async ({ page }) => {
    test.setTimeout(45_000);

    await page.goto("/resources/");
    const initialTransform = await waitForGraphLayout(page, PAPER_GRAPH);

    await expect(page.locator("#paper-network-hide-isolates")).not.toBeChecked();

    const initialScale = scaleFromTransform(initialTransform);
    expect(initialScale).not.toBeNull();
    expect(initialScale).toBeGreaterThan(0.6);

    await page.evaluate(() => {
      const minInput = document.getElementById("paper-network-year-min");
      const maxInput = document.getElementById("paper-network-year-max");
      minInput.value = "2019";
      minInput.dispatchEvent(new Event("input", { bubbles: true }));
      maxInput.value = "2022";
      maxInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const narrowedTransform = await waitForGraphLayout(page, PAPER_GRAPH, initialTransform);

    await page.evaluate(() => {
      const minInput = document.getElementById("paper-network-year-min");
      const maxInput = document.getElementById("paper-network-year-max");
      minInput.value = "2007";
      minInput.dispatchEvent(new Event("input", { bubbles: true }));
      maxInput.value = "2026";
      maxInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForGraphLayout(page, PAPER_GRAPH, narrowedTransform);

    const resetScale = await graphScale(page, PAPER_GRAPH);
    expect(resetScale).not.toBeNull();
    expect(resetScale).toBeGreaterThan(0.6);
  });
});
