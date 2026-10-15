// Run against a production site served on SITE_URL (default: port 8099).
// CHROME_PATH=... node tests/benchmarks/publications-startup.cjs <reference-sha>
const { chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const assert = require("node:assert/strict");

(async () => {
  const reference = execFileSync("git", ["show", `${process.argv[2]}:assets/js/bibsearch.js`], { encoding: "utf8" });
  const current = fs.readFileSync("assets/js/bibsearch.js", "utf8");
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const results = { reference: [], current: [] };
  let expected;
  try {
    for (let run = 0; run < 6; run++) {
      for (const [label, source] of [
        ["reference", reference],
        ["current", current],
      ]) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const session = await page.context().newCDPSession(page);
        await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await session.send("Performance.enable");
        await page.route("**/assets/js/bibsearch.js*", (route) => route.fulfill({ contentType: "application/javascript", body: source }));
        await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
        await page.route("https://metrics-api.dimensions.ai/**", (route) => route.abort());
        await page.goto(`${process.env.SITE_URL || "http://127.0.0.1:8099"}/publications/`, { waitUntil: "load" });
        await page.waitForFunction(() => window.Chart?.getChart(document.getElementById("pub-chart-year")));
        await page.waitForTimeout(1500);
        const output = await page.evaluate(() => {
          const chart = Chart.getChart(document.getElementById("pub-chart-year"));
          return {
            labels: chart.data.labels,
            datasets: chart.data.datasets.map(({ data, unitRole, unitLevel, backgroundColor, borderColor }) => ({
              data,
              unitRole,
              unitLevel,
              backgroundColor,
              borderColor,
            })),
            dimensions: [chart.width, chart.height],
            publications: [...document.querySelectorAll(".publication-entry")].map((entry) => entry.dataset.doi),
          };
        });
        expected ||= output;
        assert.deepEqual(output, expected, "Chart values, colors, dimensions and publication ordering must match");
        const metrics = Object.fromEntries((await session.send("Performance.getMetrics")).metrics.map(({ name, value }) => [name, value]));
        if (run) results[label].push({ taskMs: metrics.TaskDuration * 1000, scriptMs: metrics.ScriptDuration * 1000 });
        await page.close();
      }
    }
    const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    console.log(
      JSON.stringify(
        {
          browser: browser.version(),
          viewport: [390, 844],
          cpuThrottlingRate: 4,
          outputSha256: createHash("sha256").update(JSON.stringify(expected)).digest("hex"),
          results: Object.fromEntries(
            Object.entries(results).map(([label, samples]) => [
              label,
              {
                samples,
                medianTaskMs: median(samples.map((sample) => sample.taskMs)),
                medianScriptMs: median(samples.map((sample) => sample.scriptMs)),
              },
            ])
          ),
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
