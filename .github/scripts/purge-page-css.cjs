#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { PurgeCSS, defaultOptions } = require("purgecss");
const config = require("../../purgecss.config.js");
const languages = require("../ci-paths.json").languages;

const BASE_STYLES = new Set(["bootstrap.min.css", "mdb.min.css", "main.css"]);

async function filesBelow(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? filesBelow(file) : [file];
    })
  );
  return nested.flat();
}

function pageFamily(relativePath) {
  const segments = relativePath.split(path.sep);
  if (Object.values(languages).includes(`/${segments[0]}`)) segments.shift();
  if (segments[0] === "research" && segments[1] !== "index.html") return segments.slice(0, 2).join("/");
  return segments[0];
}

async function main() {
  const site = path.resolve(process.argv[2] || "_site");
  const cssDirectory = path.join(site, "assets/css");
  for (const file of await fs.readdir(cssDirectory)) {
    if (/\.page-[a-f0-9]{16}\.css$/.test(file)) await fs.unlink(path.join(cssDirectory, file));
  }

  // Preserve the existing whole-site pass for component styles and fonts.
  const globalResults = await new PurgeCSS().purge({
    ...config,
    content: [path.join(site, "**/*.html"), path.join(site, "**/*.js")],
    css: [path.join(cssDirectory, "*.css")],
    skippedContentGlobs: [path.join(site, "assets/**/*.html")],
  });
  for (const result of globalResults) await fs.writeFile(result.file, result.css);
  const styles = globalResults.filter((result) => BASE_STYLES.has(path.basename(result.file)));

  const files = await filesBelow(site);
  const scripts = (await Promise.all(files.filter((file) => file.endsWith(".js")).map((file) => fs.readFile(file, "utf8")))).join("\n");
  const scriptTokens = [...new Set(defaultOptions.defaultExtractor(scripts))];
  const groups = new Map();
  for (const file of files.filter((candidate) => candidate.endsWith(".html") && !candidate.startsWith(path.join(site, "assets") + path.sep))) {
    const family = pageFamily(path.relative(site, file));
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push({ file, html: await fs.readFile(file, "utf8") });
  }

  const generated = new Set();
  for (const pages of groups.values()) {
    // Keep JS-created states from the same scripts the old global pass scanned.
    // Group translations and blog posts to avoid hundreds of nearly identical
    // CSS parses/files, while excluding components unique to other page types.
    const tokens = [...new Set([...scriptTokens, ...pages.flatMap(({ html }) => defaultOptions.defaultExtractor(html))])];
    const results = await new PurgeCSS().purge({
      content: [{ raw: "", extension: "html" }],
      defaultExtractor: () => tokens,
      css: styles.map((style) => ({ raw: style.css })),
      safelist: config.safelist,
    });
    const replacements = new Map();
    for (let index = 0; index < results.length; index += 1) {
      const css = results[index].css.replace(/\/\*# sourceMappingURL=.*?\*\//g, "");
      const original = path.basename(styles[index].file);
      const hash = crypto.createHash("sha256").update(css).digest("hex").slice(0, 16);
      const filename = `${original.replace(/\.css$/, "")}.page-${hash}.css`;
      // Same directory preserves relative font/image URLs and stylesheet order.
      if (!generated.has(filename)) await fs.writeFile(path.join(cssDirectory, filename), css);
      generated.add(filename);
      replacements.set(original, filename);
    }
    for (const page of pages) {
      const html = page.html.replace(/<link\b[^>]*>/gi, (tag) =>
        tag.replace(/href=(['"])([^'"]+)\1/i, (attribute, quote, href) => {
          const match = href.match(/^\/assets\/css\/([^/?]+)(?:\?[^#]*)?$/);
          const original = match && match[1].replace(/\.page-[a-f0-9]{16}(?=\.css$)/, "");
          const replacement = replacements.get(original);
          return replacement ? `href=${quote}/assets/css/${replacement}${quote}` : attribute;
        })
      );
      await fs.writeFile(page.file, html);
    }
  }
  console.log(`Purged CSS for ${groups.size} page families; wrote ${generated.size} content-hashed stylesheets.`);
}

if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { pageFamily };
