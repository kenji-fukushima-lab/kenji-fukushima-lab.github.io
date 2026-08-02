const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("important visitor actions have explicit analytics events", () => {
  const analyticsSource = read("assets/js/analytics-events.js");
  const quizSource = read("assets/js/carnivorous-plant-quiz.js");
  const header = read("_includes/header.liquid");
  const joinLayout = read("_layouts/join.liquid");
  const resourcesLayout = read("_layouts/resources.liquid");
  const englishPublications = read("_pages/en-us/publications.md");
  const japanesePublications = read("_pages/ja/publications.md");
  const englishAccess = read("_pages/en-us/access.md");
  const japaneseAccess = read("_pages/ja/access.md");

  assert.match(analyticsSource, /recruitment_link_click/);
  assert.match(analyticsSource, /publication_doi_click/);
  assert.match(analyticsSource, /publication_pdf_click/);
  assert.match(analyticsSource, /resource_download/);
  assert.match(analyticsSource, /github_repository_click/);
  assert.match(analyticsSource, /resource_link_click/);
  assert.match(joinLayout, /data-analytics-context="recruitment"/);
  assert.match(resourcesLayout, /data-analytics-context="resources"/);
  assert.match(englishPublications, /data-analytics-context="publications"/);
  assert.match(japanesePublications, /data-analytics-context="publications"/);
  assert.match(header, /data-analytics-event="language_switch"/);
  assert.match(quizSource, /utm_source/);
  assert.match(quizSource, /carnivorous_plant_quiz_share/);
  for (const accessPage of [englishAccess, japaneseAccess]) {
    assert.match(accessPage, /data-analytics-event="map_open"/);
    assert.match(accessPage, /data-analytics-event="contact_email_click"/);
  }
});
