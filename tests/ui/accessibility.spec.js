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

async function checkAccessibility(page, path) {
  await page.goto(path, { waitUntil: "networkidle" });

  const untitledFrames = await page
    .locator("iframe")
    .evaluateAll((frames) =>
      frames.filter((frame) => !(frame.getAttribute("title") ?? "").trim()).map((frame) => frame.getAttribute("src") ?? "<missing src>")
    );
  expect(untitledFrames, `iframe(s) without an accessible title on ${path}`).toEqual([]);

  const results = await new AxeBuilder({ page })
    .options({ rules: { "target-size": { enabled: true }, "label-content-name-mismatch": { enabled: true } } })
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
}

for (const path of checkedPaths()) {
  test(`has no automated accessibility violations on ${path}`, async ({ page }) => {
    await checkAccessibility(page, path);
  });
}

const representativePaths = ["/", "/people/", "/ja/people/", "/resources/", "/access/", "/research/", "/carnivorous-plant-quiz/"];
for (const [name, width, colorScheme] of [
  ["desktop dark", 1440, "dark"],
  ["mobile light", 390, "light"],
  ["mobile dark", 390, "dark"],
]) {
  test.describe(name, () => {
    test.use({ viewport: { width, height: 900 }, colorScheme });
    for (const path of process.env.AXE_PATHS ? checkedPaths() : representativePaths) {
      test(`has no automated accessibility violations on ${path}`, async ({ page }) => {
        await checkAccessibility(page, path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
      });
    }
  });
}
