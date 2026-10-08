const assert = require("node:assert/strict");
const test = require("node:test");
const { acknowledgeRegistration, verifyCurrentApproval } = require("../../.github/scripts/member_registration_issue.cjs");

function fixture() {
  const comment = {
    id: 45,
    user: { login: "kfuku52" },
    body: "/approve-member",
    created_at: "2026-10-08T00:00:00Z",
    updated_at: "2026-10-08T00:00:00Z",
  };
  const issue = { number: 23, state: "open", body: "Approved snapshot" };
  const context = {
    eventName: "issue_comment",
    repo: { owner: "example", repo: "repo" },
    issue: { number: 23 },
    payload: { action: "created", comment, issue },
  };
  const state = { comments: [structuredClone(comment)], issue: structuredClone(issue), pullRequests: [], files: [], writes: [], notices: [] };
  const issues = {
    get: async () => ({ data: state.issue }),
    getLabel: async () => ({}),
    createLabel: async (parameters) => state.writes.push(["createLabel", parameters]),
    addLabels: async (parameters) => state.writes.push(["addLabels", parameters]),
    listComments: async () => {},
    createComment: async (parameters) => state.writes.push(["createComment", parameters]),
    updateComment: async (parameters) => state.writes.push(["updateComment", parameters]),
  };
  const pulls = {
    list: async () => ({ data: state.pullRequests }),
    listFiles: async () => {},
  };
  const repos = {
    getContent: async () => ({ data: { encoding: "base64", content: Buffer.from(state.profile || "").toString("base64") } }),
  };
  const github = { rest: { issues, pulls, repos }, paginate: async (method) => (method === pulls.listFiles ? state.files : state.comments) };
  const core = { notice: (message) => state.notices.push(message) };
  return { github, context, core, state };
}

test("registration acknowledgement executes and renders the approval command as Markdown", async () => {
  const data = fixture();
  data.github.rest.issues.getLabel = async () => {
    throw Object.assign(new Error("missing"), { status: 404 });
  };
  await acknowledgeRegistration(data);
  assert.deepEqual(
    data.state.writes.map(([operation]) => operation),
    ["createLabel", "addLabels", "createComment"]
  );
  const body = data.state.writes.at(-1)[1].body;
  assert.match(body, /`\/approve-member`/);
  assert.match(body, /公開日/);
  assert.match(body, /Issues and attachments are public immediately/);
});

test("registration acknowledgement updates its existing bot comment", async () => {
  const data = fixture();
  data.state.comments.push({ id: 50, user: { type: "Bot" }, body: "<!-- member-registration-automation --> old status" });
  await acknowledgeRegistration(data);
  assert.deepEqual(
    data.state.writes.map(([operation]) => operation),
    ["addLabels", "updateComment"]
  );
  assert.equal(data.state.writes.at(-1)[1].comment_id, 50);
});

test("simultaneous submissions can share a newly created registration label", async () => {
  const data = fixture();
  let reads = 0;
  data.github.rest.issues.getLabel = async () => {
    if (++reads === 1) throw Object.assign(new Error("missing"), { status: 404 });
    return {};
  };
  data.github.rest.issues.createLabel = async () => {
    throw Object.assign(new Error("already exists"), { status: 422 });
  };
  await acknowledgeRegistration(data);
  assert.equal(reads, 2);
  assert.deepEqual(
    data.state.writes.map(([operation]) => operation),
    ["addLabels", "createComment"]
  );
});

test("a fresh Kenji approval verifies without consuming later issue edits", async () => {
  const data = fixture();
  data.context.payload.comment.body = " \n/approve-member\n ";
  data.state.issue.body = "Later unapproved changes";
  assert.equal(await verifyCurrentApproval(data), true);
  assert.equal(data.context.payload.issue.body, "Approved snapshot");
  assert.deepEqual(data.state.writes, []);
});

test("untrusted, edited, withdrawn, superseded, or closed approvals cannot create a PR", async () => {
  for (const variant of [
    "outsider",
    "edited-event",
    "non-command",
    "closed",
    "pull-request",
    "withdrawn",
    "edited-comment",
    "missing-timestamp",
    "superseded",
  ]) {
    const data = fixture();
    if (variant === "outsider") data.context.payload.comment.user.login = "outsider";
    if (variant === "edited-event") data.context.payload.action = "edited";
    if (variant === "non-command") data.context.payload.comment.body += " please";
    if (variant === "closed") data.state.issue.state = "closed";
    if (variant === "pull-request") data.state.issue.pull_request = {};
    if (variant === "withdrawn") data.state.comments = [];
    if (variant === "edited-comment") data.state.comments[0].updated_at = "2026-10-08T00:01:00Z";
    if (variant === "missing-timestamp") delete data.state.comments[0].created_at;
    if (variant === "superseded") data.state.comments.push({ ...data.state.comments[0], id: 46 });
    assert.equal(await verifyCurrentApproval(data), false, variant);
    assert.deepEqual(data.state.writes, [], variant);
  }
});

test("other users and edited comments cannot replace the latest genuine approval", async () => {
  const data = fixture();
  data.state.comments.push({ ...data.state.comments[0], id: 46, user: { login: "outsider" } });
  data.state.comments.push({ ...data.state.comments[0], id: 47, updated_at: "2026-10-08T00:01:00Z" });
  assert.equal(await verifyCurrentApproval(data), true);
});

test("approval is rechecked after generation and API failures never authorize publication", async () => {
  const data = fixture();
  assert.equal(await verifyCurrentApproval(data), true);
  data.state.comments.push({ ...data.state.comments[0], id: 46 });
  assert.equal(await verifyCurrentApproval(data), false);
  data.github.rest.issues.get = async () => {
    throw new Error("API unavailable");
  };
  await assert.rejects(verifyCurrentApproval(data), /API unavailable/);
  assert.deepEqual(data.state.writes, []);
});

test("old reruns cannot roll back a newer registration PR after its approval is withdrawn", async () => {
  for (const newestComment of ["deleted", "edited"]) {
    const data = fixture();
    data.state.pullRequests = [
      { number: 12, head: { ref: "automation/member-registration-23", sha: "approved-head", repo: { full_name: "example/repo" } } },
    ];
    data.state.files = [{ filename: "_profiles/current_members/new-member.md" }, { filename: "assets/img/people/new-member.png" }];
    data.state.profile = "---\nregistration_approval_comment: 46\n---\n";
    if (newestComment === "edited") data.state.comments.push({ ...data.state.comments[0], id: 46, updated_at: "2026-10-08T00:01:00Z" });
    assert.equal(await verifyCurrentApproval(data), false, newestComment);
    assert.deepEqual(data.state.writes, []);
  }
});

test("existing PR approval metadata allows current or newer approvals and fails closed if unreadable", async () => {
  const data = fixture();
  data.state.pullRequests = [
    { number: 12, head: { ref: "automation/member-registration-23", sha: "approved-head", repo: { full_name: "example/repo" } } },
  ];
  data.state.files = [{ filename: "_profiles/current_members/new-member.md" }];
  for (const approval of ["44", "45"]) {
    data.state.profile = `---\nregistration_approval_comment: '${approval}'\n---\n`;
    assert.equal(await verifyCurrentApproval(data), true);
  }
  data.state.profile = "---\nname: Missing Approval\n---\n";
  await assert.rejects(verifyCurrentApproval(data), /missing its approval metadata/);
  data.github.rest.repos.getContent = async () => {
    throw new Error("API unavailable");
  };
  await assert.rejects(verifyCurrentApproval(data), /API unavailable/);
  assert.deepEqual(data.state.writes, []);
});
