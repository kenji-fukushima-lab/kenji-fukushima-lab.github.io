const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const backendPath = path.resolve(__dirname, "../../automation/apps-script/publication-access-request/Code.gs");
const backendSource = fs.readFileSync(backendPath, "utf8");
const context = { console };

vm.runInNewContext(
  `${backendSource}
globalThis.testApi = {
  CONFIG,
  countRequestsForDate_,
  countActiveAccessReservations_,
  isPlausibleFormTiming_,
};`,
  context
);

const api = context.testApi;

test("retains records and limits completed request volume for Gmail quota", () => {
  assert.equal(backendSource.includes("purgeOldRows_"), false);
  assert.equal(backendSource.includes("RETENTION_DAYS"), false);
  assert.equal(api.CONFIG.MAX_REQUESTS_PER_DAY, 45);
});

test("requires a plausible browser form completion time", () => {
  assert.equal(api.isPlausibleFormTiming_(Date.now() - 2_000), true);
  assert.equal(api.isPlausibleFormTiming_(Date.now()), false);
  assert.equal(api.isPlausibleFormTiming_(""), false);
  assert.equal(api.isPlausibleFormTiming_(Date.now() - 3 * 60 * 60 * 1_000), false);
});

test("does not rate-limit an address when its verification email failed", () => {
  const rows = [
    ["2026-07-23", "A", "Lab", "reader@example.org", "hash", "token", "expiry", "", "", "verification_sent"],
    ["2026-07-23", "A", "Lab", "reader@example.org", "hash", "token", "expiry", "", "", "verification_error"],
    ["2026-07-23", "B", "Lab", "other@example.org", "hash", "token", "expiry", "", "", "access_sent"],
    ["2026-07-22", "C", "Lab", "old@example.org", "hash", "token", "expiry", "", "", "access_sent"],
  ];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getDisplayValues: () => rows }),
  };

  const counts = api.countRequestsForDate_(sheet, "2026-07-23", "reader@example.org");
  assert.equal(counts.total, 2);
  assert.equal(counts.forAddress, 1);
});

test("reserves quota only for active access emails", () => {
  const now = new Date("2026-07-23T12:00:00Z");
  const future = new Date("2026-07-23T13:00:00Z");
  const past = new Date("2026-07-23T11:00:00Z");
  const rows = [
    [future, "", "", "verification_sent"],
    [past, "", "", "verification_sent"],
    [future, "", "", "sending_access"],
    [future, "", "", "access_sent"],
  ];
  const sheet = {
    getLastRow: () => rows.length + 1,
    getRange: () => ({ getValues: () => rows }),
  };

  assert.equal(api.countActiveAccessReservations_(sheet, now), 2);
});
