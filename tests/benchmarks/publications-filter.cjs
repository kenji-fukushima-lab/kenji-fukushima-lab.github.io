// SITE_URL=http://127.0.0.1:8099 CHROME_PATH=... node tests/benchmarks/publications-filter.cjs REFERENCE_SHA
// One warmup and five alternating samples, each replaying 21 searches four times.
const { chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../..");
const chrome = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const reference = process.argv[2];
if (!reference) throw new Error("Provide a reference Git revision");
const sources = {
  baseline: execFileSync("git", ["show", `${reference}:assets/js/bibsearch.js`], { cwd: root, encoding: "utf8" }),
  variant: fs.readFileSync(path.join(root, "assets/js/bibsearch.js"), "utf8"),
};
const names = Object.keys(sources);
const snapshot = () => {
  const c = Chart.getChart(document.getElementById("pub-chart-year"));
  return {
    html: document.getElementById("publications-results").innerHTML,
    count: document.getElementById("pub-active-count").textContent,
    highlight: [...CSS.highlights].map(([key, value]) => [key, [...value].map((r) => r.toString())]),
    chart: {
      labels: c.data.labels,
      datasets: c.data.datasets.map(({ data, unitRole, unitLevel, backgroundColor, borderColor }) => ({
        data,
        unitRole,
        unitLevel,
        backgroundColor,
        borderColor,
      })),
      dimensions: [c.width, c.height],
    },
    hash: location.hash,
  };
};
const searches = [
  "",
  "a",
  "e",
  "i",
  "o",
  "s",
  "n",
  "t",
  "r",
  "z",
  "plant",
  "carnivor",
  "carnivorous",
  "fukushima",
  "FUKUSHIMA",
  " fukushima ",
  "evolution",
  "biology",
  "zzz-no-results",
  "ZZZ-NO-RESULTS",
  "",
];
(async () => {
  const browser = await chromium.launch({ executablePath: chrome });
  const results = {};
  let expected;
  try {
    for (let run = 0; run < 6; run++)
      for (const name of [...names.slice(run % names.length), ...names.slice(0, run % names.length)]) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
        let s = sources[name];
        for (const marker of [
          "    const searchTerm = normalize(searchInput.value);",
          "    lastRenderedEntries = sorted;",
          "  const syncHashWithSearch = () => {",
        ]) {
          assert.ok(s.includes(marker), `Missing instrumentation marker: ${marker}`);
        }
        s = s.replace(
          "    const searchTerm = normalize(searchInput.value);",
          "    const __start = performance.now();\n    const searchTerm = normalize(searchInput.value);"
        );
        s = s.replace(
          "    lastRenderedEntries = sorted;",
          "    (window.__benchTimes ||= []).push(performance.now()-__start);\n    lastRenderedEntries = sorted;"
        );
        s = s.replace("  const syncHashWithSearch = () => {", "  window.__benchApply = applyFiltersAndRender;\n  const syncHashWithSearch = () => {");
        await page.route("**/assets/js/bibsearch.js*", (r) => r.fulfill({ contentType: "application/javascript", body: s }));
        await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
        await page.route("https://metrics-api.dimensions.ai/**", (r) => r.abort());
        await page.route("https://d1bxh8uas1mnw7.cloudfront.net/**", (r) =>
          r.fulfill({
            contentType: "application/javascript",
            body: "window._altmetric_embed_init=()=>{}; window._altmetric={embed_callback:()=>{}};",
          })
        );
        await page.goto(`${process.env.SITE_URL || "http://127.0.0.1:8099"}/publications/`, { waitUntil: "load" });
        await page.waitForFunction(() => window.Chart?.getChart(document.getElementById("pub-chart-year")));
        await page.waitForTimeout(100);
        await page.evaluate(() => (window.__benchTimes = []));
        const states = [];
        for (let repeat = 0; repeat < 4; repeat++)
          for (const search of searches) {
            await page.evaluate((search) => {
              document.getElementById("bibsearch").value = search;
              window.__benchApply();
            }, search);
            if (!repeat) states.push(await page.evaluate(snapshot));
          }
        expected ||= states;
        assert.deepEqual(states, expected, `${name} output mismatch`);
        const times = await page.evaluate(() => window.__benchTimes);
        if (run) (results[name] ||= []).push(times);
        await page.close();
      }
    const stat = (a) => {
      a = [...a].sort((a, b) => a - b);
      return { median: a[Math.floor(a.length / 2)], p95: a[Math.floor(a.length * 0.95)], total: a.reduce((a, b) => a + b, 0) };
    };
    const report = {
      browser: browser.version(),
      viewport: [1440, 1400],
      reference,
      searches,
      warmups: 1,
      runs: results,
      summary: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { ...stat(v.flat()), perRun: v.map(stat) }])),
    };
    if (process.env.BENCHMARK_RESULTS) fs.writeFileSync(process.env.BENCHMARK_RESULTS, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ browser: report.browser, reference, summary: report.summary }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
