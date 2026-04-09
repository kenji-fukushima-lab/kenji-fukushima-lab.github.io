const { test, expect } = require("@playwright/test");

const PAPER_GRAPH = "#paper-network-graph";
const COAUTHOR_GRAPH = "#coauthor-network-graph";

async function waitForGraphLayout(page, graphSelector, timeout = 7_000) {
  await expect(page.locator(`${graphSelector} svg`)).toBeVisible();
  await page.waitForTimeout(timeout);
}

async function graphScale(page, graphSelector) {
  return page.evaluate((selector) => {
    const viewport = document.querySelector(`${selector} svg g`);
    const transform = viewport ? viewport.getAttribute("transform") || "" : "";
    const match = transform.match(/scale\(([^)]+)\)/);
    return match ? Number(match[1]) : null;
  }, graphSelector);
}

test.describe("resources page smoke tests", () => {
  test("renders both network graphs", async ({ page }) => {
    await page.goto("/resources/");
    await waitForGraphLayout(page, PAPER_GRAPH);
    await waitForGraphLayout(page, COAUTHOR_GRAPH, 5_000);

    expect(await page.locator(`${PAPER_GRAPH} circle`).count()).toBeGreaterThan(30);
    await expect(page.locator(`${COAUTHOR_GRAPH} circle`).first()).toBeVisible();
  });

  test("paper network keeps isolates visible and avoids over-zooming out after year reset", async ({ page }) => {
    await page.goto("/resources/");
    await waitForGraphLayout(page, PAPER_GRAPH);

    await expect(page.locator("#paper-network-hide-isolates")).not.toBeChecked();

    const initialScale = await graphScale(page, PAPER_GRAPH);
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
    await waitForGraphLayout(page, PAPER_GRAPH, 5_000);

    await page.evaluate(() => {
      const minInput = document.getElementById("paper-network-year-min");
      const maxInput = document.getElementById("paper-network-year-max");
      minInput.value = "2007";
      minInput.dispatchEvent(new Event("input", { bubbles: true }));
      maxInput.value = "2026";
      maxInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await waitForGraphLayout(page, PAPER_GRAPH);

    const resetScale = await graphScale(page, PAPER_GRAPH);
    expect(resetScale).not.toBeNull();
    expect(resetScale).toBeGreaterThan(0.6);
  });
});
