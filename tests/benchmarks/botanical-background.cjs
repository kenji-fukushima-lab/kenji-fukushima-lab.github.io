// Run from the repo after a production build. Arguments: source JS, optional result JSON.
// One warmup + three measured runs per viewport; deterministic 60 Hz input.
const fs = require("fs");
const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true });
  const html = fs.readFileSync("_site/ja/index.html", "utf8");
  const background = html.match(/<div class="botanical-background"[\s\S]*?<\/svg>\s*<\/div>/)[0];
  const script = fs.readFileSync(process.argv[2] || "assets/js/botanical-background.js", "utf8");
  const results = [];
  for (const width of [1440, 2560]) {
    for (let run = 0; run < 4; run++) {
      const page = await browser.newPage({ viewport: { width, height: 1440 } });
      await page.setContent(background + '<main role="main" style="width:950px;margin:auto"></main>');
      await page.addStyleTag({ content: fs.readFileSync("assets/css/botanical-background.css", "utf8") });
      await page.evaluate(() => {
        const now = performance.now.bind(performance);
        let time = 0,
          id = 0;
        const callbacks = new Map();
        const counts = { ctm: 0, writes: 0 };
        const ctm = SVGGraphicsElement.prototype.getScreenCTM;
        SVGGraphicsElement.prototype.getScreenCTM = function () {
          counts.ctm++;
          return ctm.call(this);
        };
        const set = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (...args) {
          counts.writes++;
          return set.apply(this, args);
        };
        Object.defineProperty(performance, "now", { value: () => time });
        window.requestAnimationFrame = (cb) => {
          callbacks.set(++id, cb);
          return id;
        };
        window.cancelAnimationFrame = (id) => callbacks.delete(id);
        window.bench = {
          now,
          counts,
          callbacks,
          tick(t) {
            time = t;
            const cbs = [...callbacks.values()];
            callbacks.clear();
            const start = now();
            cbs.forEach((cb) => cb(t));
            document.querySelector("svg").getBoundingClientRect();
            return { ms: now() - start, ran: cbs.length };
          },
        };
      });
      await page.evaluate(script);
      const result = await page.evaluate(() => {
        const tip = [...document.querySelectorAll("[data-botanical-tendril]")]
          .map((el) => new DOMPoint(+el.dataset.x, +el.dataset.y).matrixTransform(el.getScreenCTM()))
          .find((p) => p.x > 10 && p.x < 180 && p.y > 100 && p.y < 900);
        let ms = 0,
          frames = 0;
        const snapshots = [];
        for (let i = 0; i < 1500; i++) {
          if (i === 0 || i === 420 || i === 780)
            window.dispatchEvent(
              new PointerEvent("pointermove", {
                clientX: i === 780 ? innerWidth / 2 : tip.x + (i === 420 ? 75 : 45),
                clientY: tip.y + (i === 420 ? 70 : 20),
                pointerType: "mouse",
              })
            );
          const r = bench.tick((i * 1000) / 60);
          ms += r.ms;
          frames += r.ran;
          if ([60, 300, 600, 900, 1499].includes(i))
            snapshots.push([...document.querySelectorAll("[data-botanical-tendril]")].map((el) => el.getAttribute("d")));
        }
        return { ms, frames, ...bench.counts, snapshots };
      });
      results.push({ width, run, ...result });
      await page.close();
    }
  }
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(results));
  console.log(
    JSON.stringify(
      results.map(({ snapshots, ...r }) => r),
      null,
      2
    )
  );
  await browser.close();
})();
