const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { promisify } = require("node:util");
const { execFile } = require("node:child_process");
const test = require("node:test");
const { pageFamily } = require("../../.github/scripts/purge-page-css.cjs");

const execute = promisify(execFile);
const script = path.resolve(__dirname, "../../.github/scripts/purge-page-css.cjs");

async function fixture(run) {
  const site = await fs.mkdtemp(path.join(os.tmpdir(), "purge-page-css-test-"));
  const write = async (file, content) => {
    const target = path.join(site, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content);
  };
  try {
    await write("assets/css/bootstrap.min.css", ".home{}.people{}.japanese{}.dynamic{}.asset-template{}.hidden-only{}.unused{}");
    await write("assets/css/mdb.min.css", ".people{color:red}.home{color:blue}");
    await write(
      "assets/css/main.css",
      ".people{color:green}.japanese{color:red}.dynamic{color:blue}.show{opacity:1}/*# sourceMappingURL=main.css.map */"
    );
    await write(
      "assets/css/component.css",
      ".home{color:blue}.people{color:red}.dynamic{color:green}.asset-template{color:red}.hidden-only{color:red}"
    );
    await write("assets/js/site.js", 'document.body.classList.add("dynamic");');
    await write("assets/template.html", '<div class="asset-template"></div>');
    await write(".hidden/index.html", '<div class="hidden-only"></div>');
    const links =
      '<link rel="stylesheet" href="/assets/css/bootstrap.min.css?v=1">' +
      "<link rel='stylesheet' href='/assets/css/mdb.min.css'>" +
      '<link rel="stylesheet" href="/assets/css/main.css?hash">' +
      '<link rel="stylesheet" href="https://example.test/keep.css">';
    await write("index.html", `${links}<div class="home"></div>`);
    await write("people/index.html", `${links}<div class="people"></div>`);
    await write("ja/people/index.html", `${links}<div class="japanese"></div>`);
    await execute(process.execPath, [script, site]);
    await run(site);
  } finally {
    await fs.rm(site, { recursive: true, force: true });
  }
}

async function linkedStyles(site, page) {
  const html = await fs.readFile(path.join(site, page), "utf8");
  const links = [...html.matchAll(/href=['"](\/assets\/css\/[^'"]+)['"]/g)].map((match) => match[1]);
  return { html, links, css: await Promise.all(links.map((link) => fs.readFile(path.join(site, link), "utf8"))) };
}

test("page families group translations and isolate research projects", () => {
  assert.equal(pageFamily(path.join("ja", "people", "index.html")), "people");
  assert.equal(pageFamily(path.join("research", "index.html")), "research");
  assert.equal(pageFamily(path.join("ja", "research", "3_project", "index.html")), "research/3_project");
  assert.equal(pageFamily(path.join("blog", "2026", "post", "index.html")), "blog");
});

test("purging preserves dynamic states, translations, stylesheet order and relative URLs", async () => {
  await fixture(async (site) => {
    const home = await linkedStyles(site, "index.html");
    const people = await linkedStyles(site, "people/index.html");
    const japanese = await linkedStyles(site, "ja/people/index.html");
    assert.deepEqual(people.links, japanese.links);
    for (const page of [home, people]) {
      assert.match(page.links[0], /bootstrap\.min\.page-[a-f0-9]{16}\.css$/);
      assert.match(page.links[1], /mdb\.min\.page-[a-f0-9]{16}\.css$/);
      assert.match(page.links[2], /main\.page-[a-f0-9]{16}\.css$/);
      assert.match(page.css[2], /\.dynamic/);
      assert.match(page.css[2], /\.show/);
      assert.doesNotMatch(page.css.join(""), /asset-template|hidden-only|unused|sourceMappingURL/);
      assert.match(page.html, /https:\/\/example.test\/keep.css/);
    }
    assert.doesNotMatch(home.css[2], /\.people|\.japanese/);
    assert.match(people.css[2], /\.people/);
    assert.match(people.css[2], /\.japanese/);
    const component = await fs.readFile(path.join(site, "assets/css/component.css"), "utf8");
    assert.match(component, /\.home/);
    assert.match(component, /\.people/);
    assert.match(component, /\.dynamic/);
    assert.doesNotMatch(component, /asset-template|hidden-only/);
  });
});

test("rerunning the CSS step produces identical pages and stylesheets", async () => {
  await fixture(async (site) => {
    const before = await linkedStyles(site, "people/index.html");
    const files = await fs.readdir(path.join(site, "assets/css"));
    await execute(process.execPath, [script, site]);
    assert.deepEqual(await linkedStyles(site, "people/index.html"), before);
    assert.deepEqual(await fs.readdir(path.join(site, "assets/css")), files);
  });
});
