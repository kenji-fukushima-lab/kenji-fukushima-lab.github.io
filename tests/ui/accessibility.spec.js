const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect } = require("@playwright/test");

const DEFAULT_PATHS = [
  "/",
  "/publications/",
  "/resources/",
  "/outreach/",
  "/join/",
  "/people/",
  "/access/",
  "/research/",
  "/research/3_project/",
  "/carnivorous-plant-quiz/",
  "/blog/",
  "/ja/",
  "/ja/publications/",
  "/ja/resources/",
  "/ja/outreach/",
  "/ja/join/",
  "/ja/people/",
  "/ja/access/",
  "/ja/research/",
  "/ja/research/3_project/",
  "/ja/carnivorous-plant-quiz/",
  "/ja/blog/",
];

function checkedPaths() {
  if (!process.env.AXE_PATHS) {
    return DEFAULT_PATHS;
  }

  return process.env.AXE_PATHS.split(",")
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => `/${path.replace(/^\/+|\/+$/g, "")}${path === "/" ? "" : "/"}`.replace("//", "/"));
}

for (const path of checkedPaths()) {
  test(`has no automated accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    const untitledFrames = await page
      .locator("iframe")
      .evaluateAll((frames) =>
        frames.filter((frame) => !(frame.getAttribute("title") ?? "").trim()).map((frame) => frame.getAttribute("src") ?? "<missing src>")
      );
    expect(untitledFrames, `iframe(s) without an accessible title on ${path}`).toEqual([]);

    const results = await new AxeBuilder({ page })
      .exclude('iframe[src*="youtube.com/embed/"]')
      .exclude('iframe[src*="youtube-nocookie.com/embed/"]')
      .analyze();
    const summary = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target),
    }));

    expect(summary, `accessibility violation(s) on ${path}`).toEqual([]);
  });
}
