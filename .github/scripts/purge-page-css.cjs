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

  // Extract each source once, sharing the tokens between the whole-site pass
  // and the page-family passes. Do not retain a joined copy of every script.
  const scriptTokens = new Set();
  const globalTokens = new Set();
  const groups = new Map();
  for (const file of await filesBelow(site)) {
    const relative = path.relative(site, file);
    const script = file.endsWith(".js");
    const page = file.endsWith(".html") && !relative.startsWith(`assets${path.sep}`);
    if (!script && !page) continue;

    const content = await fs.readFile(file, "utf8");
    const tokens = defaultOptions.defaultExtractor(content);
    // Match the global pass's glob behavior, which excludes dotfiles.
    const visible = !relative.split(path.sep).some((segment) => segment.startsWith("."));
    if (visible) for (const token of tokens) globalTokens.add(token);
    if (script) {
      for (const token of tokens) scriptTokens.add(token);
    } else {
      const family = pageFamily(relative);
      if (!groups.has(family)) groups.set(family, { pages: [], tokens: new Set() });
      const group = groups.get(family);
      group.pages.push({ file, html: content });
      for (const token of tokens) group.tokens.add(token);
    }
  }

  // Preserve the existing whole-site pass for component styles and fonts.
  const globalResults = await new PurgeCSS().purge({
    ...config,
    content: [{ raw: "", extension: "html" }],
    defaultExtractor: () => [...globalTokens],
    css: [path.join(cssDirectory, "*.css")],
  });
  for (const result of globalResults) await fs.writeFile(result.file, result.css);
  const styles = globalResults.filter((result) => BASE_STYLES.has(path.basename(result.file)));

  const generated = new Set();
  for (const { pages, tokens: pageTokens } of groups.values()) {
    // Keep JS-created states from the same scripts the old global pass scanned.
    // Group translations and blog posts to avoid hundreds of nearly identical
    // CSS parses/files, while excluding components unique to other page types.
    const tokens = [...new Set([...scriptTokens, ...pageTokens])];
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
      if (html !== page.html) await fs.writeFile(page.file, html);
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
