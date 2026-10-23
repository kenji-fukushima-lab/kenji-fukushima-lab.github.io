// node tests/benchmarks/purge-page-css.cjs RAW_SITE [PURGE_SCRIPT] [COMPARISON_SCRIPT]
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
  const scripts = [process.argv[3] || ".github/scripts/purge-page-css.cjs", process.argv[4]].filter(Boolean).map((file) => path.resolve(file));
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "purge-css-benchmark-"));
  const monitor = path.join(temporary, "resources.cjs");
  const resources = path.join(temporary, "resources.json");
  const samples = [];
  try {
    await fs.writeFile(
      monitor,
      'process.on("exit", () => require("node:fs").writeFileSync(process.env.PURGE_BENCH_RESOURCES, JSON.stringify(process.resourceUsage())));'
    );
    for (let run = 0; run < 4; run += 1) {
      const order = scripts.map((script, variant) => ({ script, variant }));
      if (run % 2) order.reverse();
      for (const { script, variant } of order) {
        const site = path.join(temporary, `${run}-${variant}`);
        await fs.cp(source, site, {
          recursive: true,
          filter: async (file) => (await fs.stat(file)).isDirectory() || /\.(html|js|css)$/.test(file),
        });
        const started = performance.now();
        const result = spawnSync(process.execPath, ["--require", monitor, script, site], {
          encoding: "utf8",
          env: { ...process.env, PURGE_BENCH_RESOURCES: resources },
        });
        const seconds = (performance.now() - started) / 1000;
        if (result.status !== 0) throw new Error(result.stderr || result.error || `Exit status ${result.status}`);
        const usage = JSON.parse(await fs.readFile(resources, "utf8"));
        const files = await fingerprints(site);
        samples.push({
          run,
          variant,
          seconds,
          cpuSeconds: (usage.userCPUTime + usage.systemCPUTime) / 1_000_000,
          peakRssKiB: usage.maxRSS,
          files: files.length,
          sha256: crypto.createHash("sha256").update(JSON.stringify(files)).digest("hex"),
        });
        await fs.rm(site, { recursive: true });
      }
    }
    console.log(JSON.stringify({ node: process.version, scripts, samples }, null, 2));
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
