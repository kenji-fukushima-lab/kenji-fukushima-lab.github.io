const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const crypto = require("node:crypto");

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

function backendHarness() {
  const rows = [];
  const mail = { quota: 100, verification: [], access: [], failVerification: false, failAccess: false };
  let heldLocks = 0;
  const checkValue = (value) => {
    assert.ok(typeof value !== "string" || !value.startsWith("="), "Formula-capable writes must never receive public input");
    return value;
  };
  const sheet = {
    appendRow: (row) => rows.push(Array.from(row, checkValue)),
    getLastRow: () => rows.length + 1,
    getRange: (row, column, height = 1, width = 1) => {
      const values = () => rows.slice(row - 2, row - 2 + height).map((entry) => entry.slice(column - 1, column - 1 + width));
      return {
        getValues: values,
        getDisplayValues: () => values().map((entry) => entry.map(String)),
        setValue: (value) => {
          rows[row - 2][column - 1] = checkValue(value);
        },
        setValues: (matrix) =>
          matrix.forEach((entry, i) =>
            entry.forEach((value, j) => {
              rows[row - 2 + i][column - 1 + j] = checkValue(value);
            })
          ),
        setRichTextValues: (matrix) =>
          matrix.forEach((entry, i) =>
            entry.forEach((value, j) => {
              rows[row - 2 + i][column - 1 + j] = value.text;
            })
          ),
        createTextFinder: (text) => ({
          matchEntireCell: () => ({
            findNext: () => {
              const index = rows.findIndex((entry) => entry[column - 1] === text);
              return index < 0 ? null : { getRow: () => index + 2 };
            },
          }),
        }),
      };
    },
  };
  const sandbox = {
    console: { error() {} },
    Date,
    MailApp: { getRemainingDailyQuota: () => mail.quota },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => {
          heldLocks += 1;
        },
        releaseLock: () => {
          heldLocks -= 1;
        },
      }),
    },
    SpreadsheetApp: { newRichTextValue: () => ({ setText: (text) => ({ build: () => ({ text }) }) }) },
  };
  vm.runInNewContext(backendSource, sandbox);
  sandbox.getRequestSheet_ = () => sheet;
  sandbox.formatRequestDate_ = () => "2026-08-31";
  sandbox.sha256_ = (value) => crypto.createHash("sha256").update(value).digest("hex");
  sandbox.createToken_ = () => "test-verification-token";
  sandbox.renderPage_ = (title) => title;
  sandbox.sendVerificationEmail_ = (request) => {
    if (mail.failVerification) throw new Error("Mocked delivery failure");
    mail.verification.push(request.email);
  };
  sandbox.sendAccessEmail_ = (request) => {
    if (mail.failAccess) throw new Error("Mocked delivery failure");
    mail.access.push(request.email);
  };
  const submit = (overrides = {}) =>
    sandbox.doPost({
      parameter: {
        name: "福島 健児",
        affiliation: "国立遺伝学研究所",
        email: "reader@example.invalid",
        consent: "yes",
        form_started_at: String(Date.now() - 2000),
        ...overrides,
      },
    });
  const verify = (token = "test-verification-token") => sandbox.doGet({ parameter: { token } });
  return { rows, mail, submit, verify, heldLocks: () => heldLocks };
}

test("public input is stored as literal text and normal names round-trip", () => {
  for (const fields of [
    { name: "=1+1", affiliation: "=SUM(1,2)", email: "=reader@example.invalid" },
    { name: "福島 健児", affiliation: "国立遺伝学研究所", email: "reader@example.invalid" },
    { name: "'=literal", affiliation: "+123", email: "reader@example.invalid" },
  ]) {
    const backend = backendHarness();
    assert.equal(backend.submit(fields), "Please check your email");
    assert.deepEqual(backend.rows[0].slice(2, 5), [fields.name, fields.affiliation, fields.email]);
    assert.equal(backend.rows[0][10], "verification_sent");
    assert.equal(backend.heldLocks(), 0);
    assert.equal(backend.verify(), "Email address verified");
    assert.deepEqual(backend.mail.access, [fields.email]);
  }
});

test("verification is single-use and does not resend access mail", () => {
  const backend = backendHarness();
  backend.submit();
  backend.verify();
  assert.equal(backend.verify(), "Email address already verified");
  assert.equal(backend.mail.access.length, 1);
  assert.equal(backend.rows[0][10], "access_sent");
});

test("invalid or expired tokens do not send access information", () => {
  const backend = backendHarness();
  backend.submit();
  assert.equal(backend.verify("wrong-token"), "Verification link unavailable");
  backend.rows[0][7] = new Date(Date.now() - 1000);
  assert.equal(backend.verify(), "Verification link unavailable");
  assert.equal(backend.mail.access.length, 0);
  assert.equal(backend.heldLocks(), 0);
});

test("mail failures release reservations and allow safe retries", () => {
  const backend = backendHarness();
  backend.mail.failVerification = true;
  assert.equal(backend.submit(), "Request could not be processed");
  assert.equal(backend.rows[0][10], "verification_error");
  assert.equal(backend.heldLocks(), 0);

  const access = backendHarness();
  access.submit();
  access.mail.failAccess = true;
  assert.equal(access.verify(), "Email could not be sent");
  assert.equal(access.rows[0][10], "verification_sent");
  access.mail.failAccess = false;
  assert.equal(access.verify(), "Email address verified");
  assert.equal(access.mail.access.length, 1);
});

test("exhausted mail quota never creates a pending request", () => {
  const backend = backendHarness();
  backend.mail.quota = 1;
  backend.submit();
  assert.equal(backend.rows.length, 0);
  assert.equal(backend.mail.verification.length, 0);
  assert.equal(backend.heldLocks(), 0);
});
