// Compare the same generated graph with a reference revision and the worktree.
// SITE_URL=http://127.0.0.1:8099 CHROME_PATH=... node tests/benchmarks/network-search.cjs <base-sha>
const { chromium } = require("@playwright/test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  try {
    const reference = execFileSync("git", ["show", `${process.argv[2]}:assets/js/coauthor-network.js`], { encoding: "utf8" });
    const current = fs.readFileSync("assets/js/coauthor-network.js", "utf8");
    const results = [];
    for (const [label, script] of [
      ["reference", reference],
      ["current", current],
    ]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
      await page.route("**/assets/js/coauthor-network.js*", (route) => route.fulfill({ contentType: "application/javascript", body: script }));
      await page.route("https://api.github.com/**", (route) => route.abort());
      await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
      await page.goto(`${process.env.SITE_URL || "http://127.0.0.1:8099"}/research/networks/`, { waitUntil: "domcontentloaded" });
      await page.locator("#coauthor-network-graph").scrollIntoViewIfNeeded();
      await page.locator("#coauthor-network-graph circle").first().waitFor();
      const samples = [];
      let shape;
      for (let run = 0; run < 4; run++) {
        const measured = await page.evaluate(async () => {
          const graph = document.getElementById("coauthor-network-graph");
          const input = document.getElementById("network-search");
          const timings = [];
          for (let i = 0; i < 30; i++) {
            await new Promise(requestAnimationFrame);
            input.value = i % 2 ? "Fukushima" : "Kenji";
            const started = performance.now();
            input.dispatchEvent(new Event("input", { bubbles: true }));
            graph.getBoundingClientRect();
            timings.push(performance.now() - started);
          }
          return {
            timings,
            nodes: graph.querySelectorAll("circle").length,
            links: graph.querySelectorAll("line").length,
            nodeState: [...graph.querySelectorAll("circle")].map((node) => [
              node.__data__.id,
              node.getAttribute("opacity"),
              node.getAttribute("stroke"),
            ]),
            linkState: [...graph.querySelectorAll("line")].map((node) => [
              node.getAttribute("stroke"),
              node.getAttribute("stroke-opacity"),
              node.getAttribute("stroke-width"),
            ]),
          };
        });
        shape = { ...measured };
        delete shape.timings;
        if (run) samples.push(...measured.timings);
      }
      samples.sort((a, b) => a - b);
      results.push({ label, medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.floor(samples.length * 0.95)], shape });
      await page.close();
    }
    assert.deepEqual(results[0].shape, results[1].shape, "Search result nodes, edges, and emphasis must match");
    console.log(
      JSON.stringify(
        results.map(({ shape, ...result }) => ({ ...result, nodes: shape.nodes, links: shape.links })),
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
