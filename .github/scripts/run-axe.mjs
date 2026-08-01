import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const [chromePath, ...urls] = process.argv.slice(2);

if (!chromePath || urls.length === 0) {
  throw new Error("usage: run-axe.mjs CHROME_PATH URL [URL ...]");
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

let violationCount = 0;

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const url of urls) {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const untitledFrames = await page
      .locator("iframe")
      .evaluateAll((frames) =>
        frames.filter((frame) => !(frame.getAttribute("title") ?? "").trim()).map((frame) => frame.getAttribute("src") ?? "<missing src>")
      );
    if (untitledFrames.length > 0) {
      console.error(`${url}: iframe(s) without an accessible title`);
      for (const src of untitledFrames) {
        console.error(`- ${src}`);
      }
      violationCount += untitledFrames.length;
    }

    const results = await new AxeBuilder({ page })
      // YouTube controls live in a third-party document that this repository
      // cannot repair. The parent iframe title is checked explicitly above.
      .exclude('iframe[src*="youtube.com/embed/"]')
      .exclude('iframe[src*="youtube-nocookie.com/embed/"]')
      .analyze();
    if (results.violations.length === 0) {
      console.log(`${url}: no accessibility violations`);
      continue;
    }

    console.error(`${url}: ${results.violations.length} accessibility violation(s)`);
    for (const violation of results.violations) {
      console.error(`- ${violation.id} (${violation.impact ?? "unknown impact"}): ${violation.help}`);
      for (const node of violation.nodes) {
        console.error(`  ${node.target.join(" ")}`);
      }
    }
    violationCount += results.violations.length;
  }
} finally {
  await browser.close();
}

if (violationCount > 0) {
  process.exitCode = 1;
}
