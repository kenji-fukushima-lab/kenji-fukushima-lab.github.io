const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("important visitor actions have explicit analytics events", () => {
  const analyticsSource = read("assets/js/analytics-events.js");
  const joinLayout = read("_layouts/join.liquid");
  const englishAccess = read("_pages/en-us/access.md");
  const japaneseAccess = read("_pages/ja/access.md");

  assert.match(analyticsSource, /recruitment_link_click/);
  assert.match(joinLayout, /data-analytics-context="recruitment"/);
  for (const accessPage of [englishAccess, japaneseAccess]) {
    assert.match(accessPage, /data-analytics-event="map_open"/);
    assert.match(accessPage, /data-analytics-event="contact_email_click"/);
  }
});
