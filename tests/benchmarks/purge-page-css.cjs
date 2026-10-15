// node tests/benchmarks/purge-page-css.cjs RAW_SITE [PURGE_SCRIPT]
// One warmup + three samples; each starts from the same unpurged HTML/JS/CSS.
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

async function fingerprints(directory, prefix = "") {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name);
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await fingerprints(file, relative)));
    else
      files.push([
        relative,
        crypto
          .createHash("sha256")
          .update(await fs.readFile(file))
          .digest("hex"),
      ]);
  }
  return files.sort(([a], [b]) => a.localeCompare(b));
}

async function main() {
  const source = path.resolve(process.argv[2]);
  const script = path.resolve(process.argv[3] || ".github/scripts/purge-page-css.cjs");
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "purge-css-benchmark-"));
  const samples = [];
  try {
    for (let run = 0; run < 4; run += 1) {
      const site = path.join(temporary, String(run));
      await fs.cp(source, site, {
        recursive: true,
        filter: async (file) => (await fs.stat(file)).isDirectory() || /\.(html|js|css)$/.test(file),
      });
      const started = performance.now();
      const result = spawnSync(process.execPath, [script, site], { encoding: "utf8" });
      const seconds = (performance.now() - started) / 1000;
      if (result.status !== 0) throw new Error(result.stderr || result.error || `Exit status ${result.status}`);
      const files = await fingerprints(site);
      samples.push({ run, seconds, files: files.length, sha256: crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex") });
      await fs.rm(site, { recursive: true });
    }
    console.log(JSON.stringify({ node: process.version, samples }, null, 2));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
