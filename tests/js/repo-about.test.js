const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../assets/js/repo-about.js"), "utf8");
const tick = () => new Promise(setImmediate);

function harness(fetch) {
  const timers = new Map();
  const stats = Array.from({ length: 7 }, (_, i) => ({
    dataset: { repoStatRepository: `lab/repo${i}`, repoStat: "stars" },
    classList: { add() {}, remove() {}, toggle() {} },
    querySelector: () => ({ textContent: "saved" }),
  }));
  const status = { dataset: {}, textContent: "" };
  const sandbox = {
    AbortController,
    fetch,
    document: {
      querySelectorAll: (selector) => (selector.startsWith(".repo-compact-stat") ? stats : []),
      querySelector: () => status,
    },
    window: {
      localStorage: {
        getItem() {
          throw Error("disabled");
        },
        setItem() {
          throw Error("disabled");
        },
      },
      setTimeout: (callback) => {
        const id = {};
        timers.set(id, callback);
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  };
  vm.runInNewContext(source, sandbox);
  return { timers, status };
}

test("rate-limit cooldown still stops the queue when browser storage is disabled", async () => {
  let calls = 0;
  const run = harness(async () => {
    calls++;
    return { ok: false, status: 429, headers: { get: () => null } };
  });
  await tick();
  assert.equal(calls, 3);
  assert.match(run.status.textContent, /could not/);
  assert.equal(run.timers.size, 0);
});

test("stalled requests time out and let the rest of the bounded queue finish", async () => {
  let calls = 0;
  let aborts = 0;
  const run = harness((_url, { signal }) => {
    calls++;
    signal.addEventListener("abort", () => aborts++);
    return new Promise(() => {});
  });
  assert.equal(calls, 3);
  while (run.timers.size) {
    for (const callback of [...run.timers.values()]) callback();
    await tick();
  }
  assert.equal(calls, 7);
  assert.equal(aborts, 7);
  assert.match(run.status.textContent, /could not/);
});
