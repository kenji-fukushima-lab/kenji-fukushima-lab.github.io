#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const config = require("../../.lighthouserc.cjs");

function assertionParts(assertion) {
  if (typeof assertion === "string") {
    return { level: assertion, options: {} };
  }
  return { level: assertion[0], options: assertion[1] || {} };
}

function resourceValue(report, assertionId) {
  const [, resourceType, property] = assertionId.split(":");
  const items = report.audits?.["resource-summary"]?.details?.items || [];
  const item = items.find((candidate) => candidate.resourceType === resourceType);
  const lighthouseProperty = { size: "transferSize", count: "requestCount" }[property] || property;
  return item?.[lighthouseProperty];
}

function measuredValue(report, assertionId) {
  if (assertionId.startsWith("categories:")) {
    return report.categories?.[assertionId.slice("categories:".length)]?.score;
  }
  if (assertionId.startsWith("resource-summary:")) {
    return resourceValue(report, assertionId);
  }
  return report.audits?.[assertionId]?.numericValue ?? report.audits?.[assertionId]?.score;
}

function validateReport(report, assertions) {
  const failures = [];
  const warnings = [];

  for (const [assertionId, assertion] of Object.entries(assertions)) {
    const { level, options } = assertionParts(assertion);
    if (level === "off") {
      continue;
    }

    const value = measuredValue(report, assertionId);
    let message = null;
    if (value === undefined || value === null) {
      message = `${assertionId}: result is missing`;
    } else if (options.minScore !== undefined && value < options.minScore) {
      message = `${assertionId}: ${value} is below ${options.minScore}`;
    } else if (options.maxNumericValue !== undefined && value > options.maxNumericValue) {
      message = `${assertionId}: ${value} exceeds ${options.maxNumericValue}`;
    } else if (Object.keys(options).length === 0 && value !== 1) {
      message = `${assertionId}: audit score is ${value}`;
    }

    if (message) {
      (level === "warn" ? warnings : failures).push(message);
    }
  }

  return { failures, warnings };
}

function main() {
  const resultsDirectory = path.resolve(process.argv[2] || "lighthouse-results-ci");
  const resultFiles = fs
    .readdirSync(resultsDirectory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  if (resultFiles.length === 0) {
    throw new Error(`No Lighthouse JSON reports found in ${resultsDirectory}`);
  }

  const assertions = config.ci.assert.assertions;
  let failureCount = 0;
  for (const resultFile of resultFiles) {
    const report = JSON.parse(fs.readFileSync(path.join(resultsDirectory, resultFile), "utf8"));
    const { failures, warnings } = validateReport(report, assertions);
    for (const warning of warnings) {
      console.warn(`WARNING ${resultFile}: ${warning}`);
    }
    for (const failure of failures) {
      console.error(`ERROR ${resultFile}: ${failure}`);
      failureCount += 1;
    }
  }

  if (failureCount > 0) {
    console.error(`Lighthouse validation failed with ${failureCount} assertion error(s).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Lighthouse validation passed for ${resultFiles.length} report(s).`);
}

if (require.main === module) {
  main();
}

module.exports = { measuredValue, validateReport };
