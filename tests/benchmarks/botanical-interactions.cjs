// Production SVG + source CSS/JS; 240 Hz pointer input and deterministic 60 Hz animation.
// One warmup and three measured runs, including contact, long drags, content and margins.
const fs = require("fs");
const { chromium } = require("@playwright/test");
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
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
        const frames = new Map(),
          timers = new Map();
        const counts = { geometryReads: 0, writes: 0 };
        for (const [prototype, key] of [
          [SVGGraphicsElement.prototype, "getScreenCTM"],
          [Element.prototype, "getClientRects"],
        ]) {
          const original = prototype[key];
          prototype[key] = function (...args) {
            counts.geometryReads++;
            return original.apply(this, args);
          };
        }
        const set = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (...args) {
          counts.writes++;
          return set.apply(this, args);
        };
        Object.defineProperty(performance, "now", { value: () => time });
        window.requestAnimationFrame = (cb) => {
          frames.set(++id, cb);
          return id;
        };
        window.cancelAnimationFrame = (id) => frames.delete(id);
        window.setTimeout = (cb, delay) => {
          timers.set(++id, { cb, at: time + delay });
          return id;
        };
        window.clearTimeout = (id) => timers.delete(id);
        window.bench = {
          now,
          counts,
          tick(t) {
            time = t;
            for (const [id, timer] of timers)
              if (timer.at <= t) {
                timers.delete(id);
                timer.cb();
              }
            const callbacks = [...frames.values()];
            frames.clear();
            callbacks.forEach((cb) => cb(t));
          },
        };
      });
      await page.evaluate(script);
      const result = await page.evaluate(() => {
        const pick = (selector, x, y) =>
          [...document.querySelectorAll(selector)]
            .map((e) => new DOMPoint(x, y).matrixTransform(e.getScreenCTM()))
            .find((p) => p.x > 30 && p.x < (innerWidth - 950) / 2 - 30 && p.y > 100 && p.y < 1300);
        const dew = pick("[data-botanical-sundew]", -9, -35);
        const flytrap = pick("[data-botanical-flytrap]", 0, 0);
        const pitcher = pick("[data-botanical-insect-target]", 0, 0);
        if (!dew || !flytrap || !pitcher) throw new Error("Missing visible interaction target");
        let ms = 0;
        const snapshots = [];
        for (let frame = 0; frame < 1500; frame++) {
          const start = bench.now();
          for (let sample = 0; sample < 4; sample++) {
            const t = frame + sample / 4;
            let x, y;
            if (frame < 240) {
              x = dew.x + Math.min(t, 160);
              y = dew.y + Math.sin(t / 25) * 12;
            } else if (frame < 600) {
              x = innerWidth / 2 + Math.sin(t / 30) * 200;
              y = 400 + Math.cos(t / 25) * 200;
            } else if (frame < 840) {
              x = flytrap.x + Math.sin((t - 600) / 20) * 65;
              y = flytrap.y;
            } else if (frame < 1020) {
              x = pitcher.x + Math.sin((t - 840) / 20) * 30;
              y = pitcher.y;
            } else {
              x = 80 + Math.sin(t / 25) * 50;
              y = 500 + Math.cos(t / 30) * 300;
            }
            window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" }));
          }
          bench.tick((frame * 1000) / 60);
          document.querySelector("svg").getBoundingClientRect();
          ms += bench.now() - start;
          if ([60, 180, 300, 660, 780, 900, 1100, 1499].includes(frame)) {
            snapshots.push(
              [...document.querySelectorAll("[data-botanical-background] path, [data-botanical-background] g")].map((e) => [
                e.getAttribute("d"),
                e.getAttribute("transform"),
                e.getAttribute("data-state"),
                e.getAttribute("data-stuck"),
              ])
            );
          }
        }
        return { ms, ...bench.counts, snapshots };
      });
      results.push({ width, run, ...result });
      await page.close();
    }
  }
  if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(results));
  console.log(
    JSON.stringify(
      results.map(({ snapshots, ...result }) => result),
      null,
      2
    )
  );
  await browser.close();
})();
