const { test, expect } = require("@playwright/test");
const repoStats = require("../../_data/repo_stats.json");

const PAPER_GRAPH = "#paper-network-graph";
const COAUTHOR_GRAPH = "#coauthor-network-graph";
const REPOSITORIES = Object.keys(repoStats.repositories);

async function transformResourceDocument(page, pathname, transform) {
  const escapedPath = pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await page.route(new RegExp(`://[^/]+${escapedPath}$`), async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: transform(await response.text()) });
  });
}

async function removeStaticRepoStats(page, pathname = "/resources/") {
  await transformResourceDocument(page, pathname, (html) => html.replace(/\s+data-repo-static=(?:"[^"]*"|'[^']*')/g, ""));
}

async function setStaticRepoStatsFetchedAt(page, fetchedAt, pathname = "/resources/") {
  await transformResourceDocument(page, pathname, (html) => html.replace(/("fetched_at":")[^"]+(")/g, `$1${fetchedAt}$2`));
}

async function seedRepoCache(page, { fetchedAt, stars }) {
  await page.addInitScript(
    ({ repositories, cachedAt, stargazersCount }) => {
      const fetchedAtMs = Date.parse(cachedAt);
      for (const repository of repositories) {
        window.localStorage.setItem(
          `repo-meta:${repository}`,
          JSON.stringify({
            data: {
              description: `${repository} cached description`,
              fetched_at: cachedAt,
              forks_count: 7,
              open_issues_count: 2,
              pushed_at: new Date(fetchedAtMs - 30 * 60 * 1000).toISOString(),
              stargazers_count: stargazersCount,
            },
            exp: fetchedAtMs + 24 * 60 * 60 * 1000,
          })
        );
      }
    },
    { repositories: REPOSITORIES, cachedAt: fetchedAt, stargazersCount: stars }
  );
}

function githubRepoPayload(repo, overrides = {}) {
  return {
    description: `${repo} description`,
    open_issues_count: 2,
    forks_count: 7,
    pushed_at: new Date().toISOString(),
    stargazers_count: 11,
    ...overrides,
  };
}

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

async function waitForGraphLayout(page, graphSelector, previousLayoutVersion = null, timeout = 25_000) {
  await expect(page.locator(`${graphSelector} svg`)).toBeVisible({ timeout });
  await page.waitForFunction(
    ({ selector, previous }) => {
      const graph = document.querySelector(selector);
      const version = graph ? graph.dataset.layoutVersion : null;
      return Boolean(graph && graph.dataset.layoutState === "complete" && version && (previous === null || version !== previous));
    },
    { selector: graphSelector, previous: previousLayoutVersion },
    { timeout }
  );

  return {
    transform: await graphTransform(page, graphSelector),
    version: await page.locator(graphSelector).getAttribute("data-layout-version"),
  };
}

async function graphScale(page, graphSelector) {
  return scaleFromTransform(await graphTransform(page, graphSelector));
}

test.describe("resources and research page smoke tests", () => {
  test("renders research network and organism pages", async ({ page }) => {
    test.setTimeout(75_000);

    await page.goto("/research/networks/");
    await page.locator(COAUTHOR_GRAPH).scrollIntoViewIfNeeded();
    await waitForGraphLayout(page, COAUTHOR_GRAPH);
    await expect(page.locator(`${COAUTHOR_GRAPH} circle`).first()).toBeVisible();
    await page.locator(PAPER_GRAPH).scrollIntoViewIfNeeded();
    await waitForGraphLayout(page, PAPER_GRAPH);
    expect(await page.locator(`${PAPER_GRAPH} circle`).count()).toBeGreaterThan(30);
    await page.locator("#publication-word-cloud-chart").scrollIntoViewIfNeeded();
    await expect(page.locator(".publication-word-cloud-term").first()).toBeVisible({ timeout: 15_000 });
    const wordCloudLayout = await page.evaluate(() => {
      const svg = document.querySelector("#publication-word-cloud-chart svg");
      const viewBox = (svg?.getAttribute("viewBox") || "").split(/\s+/).map(Number);
      const viewBoxY = viewBox[1] || 0;
      const height = viewBox[3] || 0;
      const yValues = Array.from(document.querySelectorAll(".publication-word-cloud-term"))
        .map((term) => Number(term.getAttribute("y")) - viewBoxY)
        .sort((left, right) => left - right);
      const maxYGap = yValues.slice(1).reduce((maxGap, y, index) => Math.max(maxGap, y - yValues[index]), 0);

      return {
        count: yValues.length,
        height,
        maxYGap,
      };
    });
    expect(wordCloudLayout.count).toBeGreaterThan(60);
    expect(wordCloudLayout.height).toBeLessThan(420);
    expect(wordCloudLayout.maxYGap).toBeLessThan(wordCloudLayout.height * 0.08);

    await page.goto("/research/3_project/");
    await page.locator("#organism-map-chart").waitFor({ state: "attached" });
    await page.evaluate(() => document.getElementById("organism-map-chart").scrollIntoView({ block: "center" }));
    await expect(page.locator(".organism-paper-row").first()).toBeVisible();
  });

  test("rejects unsafe organism and paper URL schemes", async ({ page }) => {
    await page.route("**/assets/data/organism-map.json?*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          genera: [
            {
              label: "Cephalotus",
              paper_count: 1,
              wikipedia_url: "javascript:alert('taxonomy')",
              papers: [
                {
                  key: "safe-local-paper",
                  title: "Safe fallback",
                  url: "javascript:alert('paper')",
                  year: 2026,
                },
              ],
            },
          ],
        }),
      });
    });

    await page.goto("/research/3_project/");
    await page.locator("#organism-map-chart").scrollIntoViewIfNeeded();
    await expect(page.locator(".organism-paper-row")).toBeVisible();

    const links = page.locator(".organism-paper-row a");
    expect(await links.evaluateAll((elements) => elements.map((link) => link.href))).not.toContainEqual(expect.stringMatching(/^javascript:/i));
    await expect(page.locator(".organism-paper-link")).toHaveAttribute("href", /\/publications\/#safe-local-paper$/);
  });

  test("automatically loads uncached repository stats without compressed shield images", async ({ page }) => {
    await removeStaticRepoStats(page);
    await page.route("https://api.github.com/repos/**", async (route) => {
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(githubRepoPayload(repo)),
      });
    });

    await page.goto("/resources/");
    await expect(page.locator("[data-repo-stats-status]")).toHaveText("GitHub statistics loaded.");

    const forkLink = page.locator('[data-analytics-label="repository_forks"]').first();
    const forkBadge = forkLink.locator(".repo-compact-stat-forks");
    await expect(forkBadge).toBeVisible();
    await expect(page.locator(".repo-compact-badges img")).toHaveCount(0);
    await expect(forkBadge.locator("[data-repo-stat-value]")).toHaveText("7");

    const badgeBox = await forkBadge.boundingBox();
    expect(badgeBox.width).toBeGreaterThan(50);
  });

  test("uses English repository stat labels on the Japanese resources page", async ({ page }) => {
    await removeStaticRepoStats(page, "/ja/resources/");
    await page.route("https://api.github.com/repos/**", async (route) => {
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(githubRepoPayload(repo, { pushed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() })),
      });
    });

    await page.goto("/ja/resources/");
    await expect(page.locator("[data-repo-stats-status]")).toHaveText("GitHub統計を読み込みました。");

    const firstRepo = page.locator(".repo-compact").first();
    await expect(firstRepo.locator(".repo-compact-stat-label")).toHaveText(["Stars", "Forks", "Last commit", "Issue"]);
    await expect(firstRepo.locator(".repo-compact-stat-commits [data-repo-stat-value]")).toHaveText("2 days ago");
  });

  test("keeps relative commit times current while the page stays open", async ({ page }) => {
    const currentTime = new Date("2026-07-29T12:00:00Z");
    const pushedAt = new Date("2026-07-29T11:30:00Z");
    await page.clock.install({ time: currentTime });
    await removeStaticRepoStats(page);

    await page.route("https://api.github.com/repos/**", async (route) => {
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(githubRepoPayload(repo, { pushed_at: pushedAt.toISOString() })),
      });
    });

    await page.goto("/resources/");
    await expect(page.locator("[data-repo-stats-status]")).toHaveText("GitHub statistics loaded.");

    const lastCommit = page.locator(".repo-compact-stat-commits [data-repo-stat-value]").first();
    await expect(lastCommit).toHaveText("30 minutes ago");

    await page.clock.fastForward(31 * 60 * 1000);
    await expect(lastCommit).toHaveText("1 hour ago");
  });

  test("uses fresh build-time stats without browser GitHub requests", async ({ page }) => {
    const fetchedAt = "2026-08-22T12:00:00Z";
    await page.clock.install({ time: new Date("2026-08-22T13:00:00Z") });
    await setStaticRepoStatsFetchedAt(page, fetchedAt);

    let apiRequests = 0;
    await page.route("https://api.github.com/repos/**", async (route) => {
      apiRequests += 1;
      await route.abort();
    });

    await page.goto("/resources/");
    await expect(page.locator(".repo-compact-stat-stars [data-repo-stat-value]").first()).not.toHaveText("--");
    await expect(page.locator("[data-repo-stats-status]")).toHaveText("");
    expect(apiRequests).toBe(0);
  });

  test("shows stale cached stats while refreshing them in the background", async ({ page }) => {
    const fetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    await removeStaticRepoStats(page);
    await seedRepoCache(page, { fetchedAt, stars: 99 });

    let releaseRequests;
    const requestsCanFinish = new Promise((resolve) => {
      releaseRequests = resolve;
    });
    await page.route("https://api.github.com/repos/**", async (route) => {
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await requestsCanFinish;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(githubRepoPayload(repo)) });
    });

    await page.goto("/resources/");
    const firstStars = page.locator(".repo-compact-stat-stars [data-repo-stat-value]").first();
    await expect(firstStars).toHaveText("99");

    releaseRequests();
    await expect(page.locator("[data-repo-stats-status]")).toHaveText("GitHub statistics loaded.");
    await expect(firstStars).toHaveText("11");
  });

  test("keeps fresh browser cache until a manual force refresh", async ({ page }) => {
    const fetchedAt = new Date(Date.now() + 60 * 1000).toISOString();
    await seedRepoCache(page, { fetchedAt, stars: 99 });

    let apiRequests = 0;
    await page.route("https://api.github.com/repos/**", async (route) => {
      apiRequests += 1;
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(githubRepoPayload(repo)) });
    });

    await page.goto("/resources/");
    const firstStars = page.locator(".repo-compact-stat-stars [data-repo-stat-value]").first();
    await expect(firstStars).toHaveText("99");
    expect(apiRequests).toBe(0);

    await page.getByRole("button", { name: "Refresh GitHub statistics", exact: true }).click();
    await expect(page.locator("[data-repo-stats-status]")).toHaveText("GitHub statistics loaded.");
    await expect(firstStars).toHaveText("11");
    expect(apiRequests).toBe(REPOSITORIES.length);
  });

  test("allows a manual retry after automatic GitHub errors", async ({ page }) => {
    await removeStaticRepoStats(page);
    let shouldFail = true;
    let apiRequests = 0;
    await page.route("https://api.github.com/repos/**", async (route) => {
      apiRequests += 1;
      if (shouldFail) {
        await route.fulfill({ status: 503, body: "temporarily unavailable" });
        return;
      }
      const repo = new URL(route.request().url()).pathname.replace(/^\/repos\//, "");
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(githubRepoPayload(repo)) });
    });

    await page.goto("/resources/");
    const status = page.locator("[data-repo-stats-status]");
    const refreshButton = page.getByRole("button", { name: "Refresh GitHub statistics", exact: true });
    await expect(status).toHaveText("Some GitHub statistics could not be loaded.");
    await expect(refreshButton).toBeEnabled();

    shouldFail = false;
    await refreshButton.click();
    await expect(status).toHaveText("GitHub statistics loaded.");
    await expect(page.locator(".repo-compact-stat-stars [data-repo-stat-value]").first()).toHaveText("11");
    expect(apiRequests).toBe(REPOSITORIES.length * 2);
  });

  test("paper network keeps isolates visible and avoids over-zooming out after year reset", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/research/networks/#paper-network-graph");
    await page.locator(PAPER_GRAPH).scrollIntoViewIfNeeded();
    const initialLayout = await waitForGraphLayout(page, PAPER_GRAPH);

    await expect(page.locator("#paper-network-hide-isolates")).not.toBeChecked();

    const initialScale = scaleFromTransform(initialLayout.transform);
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
    const narrowedLayout = await waitForGraphLayout(page, PAPER_GRAPH, initialLayout.version);

    await page.evaluate(() => {
      const minInput = document.getElementById("paper-network-year-min");
      const maxInput = document.getElementById("paper-network-year-max");
      minInput.value = "2007";
      minInput.dispatchEvent(new Event("input", { bubbles: true }));
      maxInput.value = "2026";
      maxInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForGraphLayout(page, PAPER_GRAPH, narrowedLayout.version);

    const resetScale = await graphScale(page, PAPER_GRAPH);
    expect(resetScale).not.toBeNull();
    expect(resetScale).toBeGreaterThan(0.6);
  });
});
