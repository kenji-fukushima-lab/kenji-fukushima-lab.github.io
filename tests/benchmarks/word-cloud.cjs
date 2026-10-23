// SITE_URL=http://127.0.0.1:8099 CHROME_PATH=... node tests/benchmarks/word-cloud.cjs REFERENCE_SHA
// Native canvas/SVG output, one warmup and five alternating runs per viewport.
// node BENCH REFERENCE_SHA [CURRENT_SOURCE]
const { chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const ref = process.argv[2];
const variants = [
  ["reference", execFileSync("git", ["show", `${ref}:assets/js/publication-word-cloud.js`], { encoding: "utf8" })],
  ["current", fs.readFileSync(process.argv[3] || "assets/js/publication-word-cloud.js", "utf8")],
];
const runs = Number(process.env.RUNS || 5);
const repeats = Number(process.env.REPEATS || 5);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const results = [];
  const expected = new Map();
  try {
    for (const [route, width] of [
      ["/research/networks/", 1440],
      ["/ja/research/networks/", 390],
    ]) {
      for (let run = 0; run <= runs; run++) {
        const order = run % 2 ? [...variants].reverse() : variants;
        for (const [variant, source] of order) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          const marker = "  whenVisible(chartElement, async () => {";
          assert.ok(source.includes(marker));
          await page.route("**/assets/js/publication-word-cloud.js*", (r) =>
            r.fulfill({ contentType: "application/javascript", body: source.replace(marker, "  window.__perfCloud = renderCloud;\n" + marker) })
          );
          await page.route(/\/assets\/js\/(coauthor-network|paper-network|organism-map)\.js/, (r) =>
            r.fulfill({ contentType: "application/javascript", body: "" })
          );
          await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
          await page.goto((process.env.SITE_URL || "http://127.0.0.1:8099") + route, { waitUntil: "load" });
          await page.waitForFunction(() => typeof window.__perfCloud === "function" && typeof d3 !== "undefined");
          await page.evaluate(() => document.fonts.ready);
          const measurement = await page.evaluate(
            async ({ repeats }) => {
              const chart = document.getElementById("publication-word-cloud-chart");
              const dataElement = document.getElementById("publication-word-cloud-data");
              const data = await (await fetch(dataElement.dataset.src)).json();
              const shapes = [];
              const times = [];
              window.__perfCloud(data);
              for (let i = 0; i < repeats; i++) {
                const start = performance.now();
                window.__perfCloud(data);
                chart.querySelector("svg").getBBox();
                times.push(performance.now() - start);
                shapes.push(chart.innerHTML);
              }
              let calls = 0;
              const native = CanvasRenderingContext2D.prototype.measureText;
              CanvasRenderingContext2D.prototype.measureText = function (...args) {
                calls++;
                return native.apply(this, args);
              };
              window.__perfCloud(data);
              CanvasRenderingContext2D.prototype.measureText = native;
              return { times, shapes, calls, words: chart.querySelectorAll("text").length, width: chart.clientWidth };
            },
            { repeats }
          );
          const key = route + width;
          const shape = measurement.shapes[0];
          if (!expected.has(key)) expected.set(key, shape);
          for (const actual of measurement.shapes) assert.equal(actual, expected.get(key), `${variant} SVG differs at ${key}`);
          if (run)
            results.push({
              route,
              width,
              variant,
              run,
              times: measurement.times,
              calls: measurement.calls,
              words: measurement.words,
              chartWidth: measurement.width,
              sha256: crypto.createHash("sha256").update(shape).digest("hex"),
            });
          await page.close();
        }
      }
    }
    const summary = [];
    for (const key of expected.keys())
      for (const [variant] of variants) {
        const samples = results.filter((r) => r.route + r.width === key && r.variant === variant);
        const times = samples.flatMap((r) => r.times).sort((a, b) => a - b);
        summary.push({
          key,
          variant,
          medianMs: times[Math.floor(times.length / 2)],
          p95Ms: times[Math.floor(times.length * 0.95)],
          calls: samples[0].calls,
          words: samples[0].words,
          sha256: samples[0].sha256,
        });
      }
    const report = { browser: browser.version(), reference: ref, runs, repeats, summary, results };
    if (process.env.BENCHMARK_RESULTS) fs.writeFileSync(process.env.BENCHMARK_RESULTS, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ browser: report.browser, summary }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
