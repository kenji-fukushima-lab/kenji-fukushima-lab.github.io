// SITE_URL=http://127.0.0.1:8099 CHROME_PATH=... node tests/benchmarks/blog-filter.cjs REFERENCE_SHA
// One warmup and five alternating runs; native layout, full blog DOM equivalence.
const { chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const reference = process.argv[2];
const variants = [
  ["reference", execFileSync("git", ["show", `${reference}:assets/js/blogsearch.js`], { encoding: "utf8" })],
  ["current", fs.readFileSync(process.argv[3] || "assets/js/blogsearch.js", "utf8")],
];
const queries = ["", "福島", "福島 健児", "福島健児", "fukushima", "植物", "食虫植物", "研究", "a", "A", "  a ", "zzz", "ZZZ", ""];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const results = [];
  let expected;
  const runs = Number(process.env.RUNS || 5);
  try {
    for (let run = 0; run <= runs; run++)
      for (const [variant, source] of run % 2 ? [...variants].reverse() : variants) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const marker = '    searchInput.addEventListener("input", () => {';
        assert.ok(source.includes(marker));
        await page.route("**/assets/js/blogsearch.js*", (r) =>
          r.fulfill({ contentType: "application/javascript", body: source.replace(marker, "    window.__perfBlog = render;\n" + marker) })
        );
        await page.route("https://www.googletagmanager.com/**", (r) => r.abort());
        await page.goto((process.env.SITE_URL || "http://127.0.0.1:8099") + "/ja/blog/", { waitUntil: "load" });
        await page.waitForFunction(() => typeof window.__perfBlog === "function");
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(
          ({ queries }) => {
            const root = document.querySelector(".blog-content");
            const list = root.querySelector(".post-list");
            const input = document.getElementById("blogsearch");
            const times = [];
            const states = [];
            for (let repeat = 0; repeat < 4; repeat++)
              for (const query of queries) {
                input.value = query;
                const before = performance.now();
                window.__perfBlog(true);
                list.getBoundingClientRect();
                times.push(performance.now() - before);
                if (!repeat) states.push(root.innerHTML);
              }
            const observer = new MutationObserver(() => {});
            observer.observe(root, { subtree: true, attributes: true, childList: true });
            for (const query of queries) {
              input.value = query;
              window.__perfBlog(true);
            }
            const records = observer.takeRecords();
            observer.disconnect();
            const sort = document.getElementById("blog-sort");
            const year = document.getElementById("blog-facet-year");
            const author = document.getElementById("blog-facet-author");
            const compatibility = [];
            const capture = () => compatibility.push({ values: [input.value, sort.value, year.value, author.value], html: root.innerHTML });
            for (const order of ["oldest", "title"]) {
              sort.value = order;
              window.__perfBlog(true);
              capture();
            }
            year.value = year.options[1].value;
            window.__perfBlog(true);
            capture();
            author.value = author.options[1].value;
            window.__perfBlog(true);
            capture();
            document.getElementById("blog-reset-filters").click();
            capture();
            root.querySelector('.blog-pagination button[data-page="2"]').click();
            capture();
            root.querySelector('.blog-pagination button[data-page="1"]').click();
            capture();
            return {
              times,
              states,
              compatibility,
              attributes: records.filter((r) => r.type === "attributes").length,
              childChanges: records.filter((r) => r.type === "childList").length,
              cards: root.querySelectorAll(".post-card").length,
            };
          },
          { queries }
        );
        const output = { states: result.states, compatibility: result.compatibility };
        expected ||= output;
        assert.deepEqual(output, expected, `${variant}: blog DOM differs`);
        if (run) results.push({ variant, run, ...result, states: undefined, compatibility: undefined });
        await page.close();
      }
    const summary = variants.map(([variant]) => {
      const samples = results.filter((r) => r.variant === variant);
      const times = samples.flatMap((r) => r.times).sort((a, b) => a - b);
      return {
        variant,
        medianMs: times[Math.floor(times.length / 2)],
        p95Ms: times[Math.floor(times.length * 0.95)],
        attributes: samples[0].attributes,
        childChanges: samples[0].childChanges,
        cards: samples[0].cards,
      };
    });
    const report = {
      browser: browser.version(),
      reference,
      queries,
      runs,
      summary,
      sha256: crypto.createHash("sha256").update(JSON.stringify(expected)).digest("hex"),
      results,
    };
    if (process.env.BENCHMARK_RESULTS) fs.writeFileSync(process.env.BENCHMARK_RESULTS, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ browser: report.browser, summary, sha256: report.sha256 }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
