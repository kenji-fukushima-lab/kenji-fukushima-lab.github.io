const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

test("home hero manifest contains square gallery assets and responsive counts", () => {
  const manifest = fs.readFileSync(path.join(root, "_data/home_hero.yml"), "utf8");
  const sources = [...manifest.matchAll(/^\s+- src: (\/assets\/img\/\S+)$/gm)].map((match) => match[1]);

  const mobileSources = [...manifest.matchAll(/^\s+mobile_src: (\S+)$/gm)].map((match) => match[1]);

  assert.equal(sources.length, 31);
  assert.equal(mobileSources.length, 29);
  assert.match(manifest, /desktop_count: 14/);
  assert.match(manifest, /tablet_count: 8/);
  assert.match(manifest, /mobile_count: 6/);
  assert.match(manifest, /initial_delay_ms: 3500/);
  assert.match(manifest, /swap_interval_ms: 2800/);

  for (const source of sources) {
    assert.ok(fs.existsSync(path.join(root, source.slice(1))), source + " should exist");
  }

  for (const source of mobileSources) {
    assert.ok(fs.existsSync(path.join(root, source.slice(1))), source + " should exist");
  }
});

test("home hero layout and script expose the rotating gallery contract", () => {
  const layout = fs.readFileSync(path.join(root, "_layouts/about.liquid"), "utf8");
  const script = fs.readFileSync(path.join(root, "assets/js/home-hero.js"), "utf8");

  assert.match(layout, /data-home-hero/);
  assert.match(layout, /data-home-hero-images/);
  assert.match(layout, /relative_url \| jsonify/);
  assert.match(script, /function shuffle/);
  assert.match(script, /window\.setInterval\(swapOneTile, swapInterval\)/);
  assert.match(script, /mobileSrc/);
});
