const assert = require("node:assert/strict");
const test = require("node:test");

const { validateReport } = require("../../.github/scripts/validate-lighthouse-results.cjs");

function report({ performance = 0.9, lcp = 2500, totalSize = 1000, title = 1 } = {}) {
  return {
    categories: { performance: { score: performance } },
    audits: {
      "largest-contentful-paint": { numericValue: lcp },
      "document-title": { score: title },
      "resource-summary": {
        details: {
          items: [{ resourceType: "total", transferSize: totalSize, requestCount: 10 }],
        },
      },
    },
  };
}

test("accepts Lighthouse reports that satisfy score and budget assertions", () => {
  const result = validateReport(report(), {
    "categories:performance": ["error", { minScore: 0.7 }],
    "largest-contentful-paint": ["error", { maxNumericValue: 6000 }],
    "resource-summary:total:size": ["error", { maxNumericValue: 2000 }],
    "document-title": "error",
  });

  assert.deepEqual(result, { failures: [], warnings: [] });
});

test("separates Lighthouse errors from warnings", () => {
  const result = validateReport(report({ performance: 0.5, title: 0 }), {
    "categories:performance": ["error", { minScore: 0.7 }],
    "document-title": "warn",
    "bf-cache": "off",
  });

  assert.equal(result.failures.length, 1);
  assert.equal(result.warnings.length, 1);
});

test("accepts genuinely inapplicable audits but still rejects missing results", () => {
  const measured = report();
  measured.audits["target-size"] = { score: null, scoreDisplayMode: "notApplicable" };
  assert.deepEqual(validateReport(measured, { "target-size": "error" }).failures, []);
  delete measured.audits["target-size"];
  assert.equal(validateReport(measured, { "target-size": "error" }).failures.length, 1);
});
