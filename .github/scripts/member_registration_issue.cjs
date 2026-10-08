const COMMAND = "/approve-member";
const APPROVER = "kfuku52";
const MARKER = "<!-- member-registration-automation -->";

async function hasNewerRegistrationPR({ github, context }) {
  const branch = `automation/member-registration-${context.issue.number}`;
  const { data: pullRequests } = await github.rest.pulls.list({
    ...context.repo,
    state: "open",
    head: `${context.repo.owner}:${branch}`,
  });
  for (const pullRequest of pullRequests) {
    if (pullRequest.head.ref !== branch || pullRequest.head.repo?.full_name !== `${context.repo.owner}/${context.repo.repo}`) continue;
    const files = await github.paginate(github.rest.pulls.listFiles, { ...context.repo, pull_number: pullRequest.number });
    for (const file of files.filter((entry) => /^_profiles\/current_members\/[^/]+\.md$/.test(entry.filename))) {
      const { data } = await github.rest.repos.getContent({ ...context.repo, path: file.filename, ref: pullRequest.head.sha });
      if (data.encoding !== "base64" || typeof data.content !== "string") throw new Error("Cannot read the registration PR approval metadata.");
      const profile = Buffer.from(data.content, "base64").toString("utf8");
      const approval = profile.match(/^registration_approval_comment:\s*["']?(\d+)["']?\s*(?:#.*)?$/m);
      if (!approval) throw new Error("The registration PR is missing its approval metadata.");
      if (BigInt(approval[1]) > BigInt(context.payload.comment.id)) return true;
    }
  }
  return false;
}

async function acknowledgeRegistration({ github, context }) {
  const label = "member-registration";
  try {
    await github.rest.issues.getLabel({ ...context.repo, name: label });
  } catch (error) {
    if (error.status !== 404) throw error;
    try {
      await github.rest.issues.createLabel({
        ...context.repo,
        name: label,
        color: "0E8A16",
        description: "New member registration awaiting Kenji approval",
      });
    } catch (creationError) {
      if (creationError.status !== 422) throw creationError;
      // Another submission may have created the label while this job was waiting.
      await github.rest.issues.getLabel({ ...context.repo, name: label });
    }
  }
  const parameters = { ...context.repo, issue_number: context.issue.number };
  await github.rest.issues.addLabels({ ...parameters, labels: [label] });
  const body = [
    MARKER,
    "登録内容を受け付けました。福島（@kfuku52）がこのIssueに `/approve-member` とコメントして承認すると、登録PRを作成します。",
    "PRの確認・マージ後、指定した公開日（日本時間）以降の最初の正常なビルドでウェブサイトに掲載されます。",
    "Issueを編集した場合も新たな承認が必要です。編集だけでは既存PRの内容は変更されません。",
    "Issueと添付画像自体は投稿時点で公開されています。",
    "",
    "Kenji (@kfuku52) must approve this issue with `/approve-member` before a registration PR is created.",
    "After review and merge, the first successful build on or after the requested date (Japan time) will publish the profile.",
    "Revised issue content requires a new approval comment. Issues and attachments are public immediately.",
  ].join("\n");
  const comments = await github.paginate(github.rest.issues.listComments, parameters);
  const existing = comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(MARKER));
  if (existing) {
    await github.rest.issues.updateComment({ ...context.repo, comment_id: existing.id, body });
  } else {
    await github.rest.issues.createComment({ ...parameters, body });
  }
}

async function verifyCurrentApproval({ github, context, core }) {
  const comment = context.payload.comment;
  if (
    context.eventName !== "issue_comment" ||
    context.payload.action !== "created" ||
    comment?.user?.login !== APPROVER ||
    comment.body?.trim() !== COMMAND
  ) {
    return false;
  }
  const parameters = { ...context.repo, issue_number: context.issue.number };
  const { data: issue } = await github.rest.issues.get(parameters);
  if (issue.state !== "open" || issue.pull_request) return false;
  const comments = await github.paginate(github.rest.issues.listComments, parameters);
  const approvals = comments.filter(
    (entry) => entry.user?.login === APPROVER && entry.body?.trim() === COMMAND && entry.created_at && entry.created_at === entry.updated_at
  );
  const latest = approvals.reduce((result, entry) => (!result || entry.id > result.id ? entry : result), null);
  if (!latest || latest.id !== comment.id) {
    core.notice("This approval was removed, edited, or superseded; no PR will be changed.");
    return false;
  }
  // A newer approval remains recorded in the PR even if its comment is later
  // deleted or edited. An old workflow rerun must not roll that PR back.
  if (await hasNewerRegistrationPR({ github, context })) {
    core.notice("The registration PR already contains a newer approval; no PR will be changed.");
    return false;
  }
  // The live issue body is never returned: Python uses the approved event snapshot.
  return true;
}

module.exports = { acknowledgeRegistration, verifyCurrentApproval };
