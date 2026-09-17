const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

test("home hero manifest references existing gallery assets", () => {
  const manifest = fs.readFileSync(path.join(root, "_data/home_hero.yml"), "utf8");
  const sources = [...manifest.matchAll(/^\s+- src: (\/assets\/img\/\S+)$/gm)].map((match) => match[1]);

  const mobileSources = [...manifest.matchAll(/^\s+mobile_src: (\S+)$/gm)].map((match) => match[1]);

  for (const source of sources) {
    assert.ok(fs.existsSync(path.join(root, source.slice(1))), source + " should exist");
  }

  for (const source of mobileSources) {
    assert.ok(fs.existsSync(path.join(root, source.slice(1))), source + " should exist");
  }
});
