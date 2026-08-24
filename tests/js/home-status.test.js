const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

test("the home link-health badge targets an existing workflow with link checks", () => {
  const aboutLayout = fs.readFileSync(path.join(root, "_layouts/about.liquid"), "utf8");
  const workflowMatch = aboutLayout.match(/{% assign workflow_file = '([^']+)' %}/);

  assert.ok(workflowMatch, "about layout should define the status workflow");

  const workflowPath = path.join(root, ".github/workflows", workflowMatch[1]);
  assert.ok(fs.existsSync(workflowPath), `${workflowMatch[1]} should exist`);

  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /name: Link health/);
  assert.match(workflow, /lycheeverse\/lychee-action/);
  assert.match(workflow, /'_site\/\*\*\/\*\.html'/);
});
