<!-- BEGIN KF AGENT POLICY: source=https://github.com/kfuku52/kf-agent-policy; version=10; sha256=82e3c0eb467582a414d9a6b2feaaaf6f5c8ae330d30f2e3efbf8c303155d0e2e -->
# Common agent policy

Repository-specific instructions override these defaults.

- Follow the user's task scope within higher-priority instructions and execution
  permissions. Complete implementation through affected verification and a result
  report; a plan or investigation ends with its requested deliverable. Continue
  authorized work without repeated approval; identify actual blocking boundaries.
- Inspect the worktree and preserve unrelated changes. Refresh remote information
  when needed; do not merge, rebase, or switch branches merely to inspect it.
- Prefer the default branch when starting work without an established branch.
  Preserve an existing task branch; follow explicit user branch instructions.
  Never create or switch branches solely for a commit, push, release, or PR.
- Change or recommend branch protection only when explicitly asked. Honor explicit
  repository-specific direct-push exceptions; otherwise report a rejected push
  without bypassing protection or inventing a branch or PR.
- Unpublished implementation details may be redesigned; preserve existing public
  APIs, file formats, and saved-data compatibility unless a breaking change is
  authorized. Update affected producers, consumers, tests, examples, and docs.
- Fix verified root causes; do not hide failures with fallbacks or weaker checks.
  Document unavoidable workarounds and their removal conditions.
- Read relevant docs and run the repository's check entrypoint for the change and
  phase. Verify affected behavior; report checks run and omitted. Repeat or broaden
  successful checks only for new changes, failures, or unresolved concerns.
- For library metadata, require demonstrated incompatibility for exact pins or
  upper bounds; keep reproducibility locks separate.
- When editing READMEs, keep them concise with useful visuals inline; put extended
  guides in linked documentation.
- For GitHub push/release work, use `prepare-github-push` in `.agents/skills/`.
  Local-only commits need no version bump; GitHub pushes require one.
- For software performance work, use `benchmark-performance` in `.agents/skills/`.
  Performance claims require comparable measurements and equivalent output.
- For GitHub Actions edits, use `optimize-github-actions` in `.agents/skills/`.
  Preserve required coverage; never run untrusted PR code on self-hosted runners.
<!-- END KF AGENT POLICY -->

# Repository-specific policy

- Direct pushes by Kenji Fukushima (`kfuku52`) to this repository's default
  branch are permitted when the user requests a commit and push. A GitHub
  notice that such a push bypassed a pull-request-only rule is expected and is
  not by itself a blocker. This exception does not authorize force pushes,
  branch-protection or ruleset changes, or bypasses for any other actor.

## Start here

- Read [CONTRIBUTING.md](CONTRIBUTING.md), then the relevant section of
  [INSTALL.md](INSTALL.md) for setup and [docs/WORKFLOWS.md](docs/WORKFLOWS.md#local-development)
  for checks. All documented commands run from the repository root.
- This is a bilingual Jekyll website, not a scientific analysis pipeline.
  [CUSTOMIZE.md](CUSTOMIZE.md) maps content and its conventions. Rendering starts
  in `_layouts/` and `_includes/`; `_plugins/` owns build-time behavior;
  `assets/js/` and `_sass/` own browser behavior and styling.
- For repeatable change validation, use
  [.agents/skills/validate-site-change/SKILL.md](.agents/skills/validate-site-change/SKILL.md).
  Use `prepare-github-push` additionally when delivery is requested.

## Run and verify

- Select the checked-in Ruby, Node and Python versions; follow INSTALL for
  `bundle install`, `npm ci`, Python requirements and ImageMagick. Use `npm run dev`
  or `docker compose up --build` for the managed development server.
- `npm run checks:push -- --base origin/main` selects local checks for a known
  base plus uncommitted changes; `npm run checks:push` runs the full local suite.
  The [change-to-check guide](docs/WORKFLOWS.md#choosing-verification) specifies
  when production/browser checks are also needed and how to run without host runtimes.
- Formatting is `npm run prettier`; format only edited files with
  `npx prettier path/to/file --write`. There is no separate configured type-check
  or general lint command. Python syntax checks are part of `checks:push`.
- `npm run build` produces production `_site`; `npm run test:ui` and
  `npm run test:lighthouse` consume it. Use the documented isolated-build recipe
  when a development watcher or existing output must be preserved.

## Preserve site contracts

- Preserve bilingual `page_id`, `lang`, permalinks and shared member records;
  English is the default and Japanese uses `/ja/`. Preserve BibTeX keys and
  publication metadata rather than inferring changes to research claims.
  Scheduling uses `Asia/Tokyo`; see WORKFLOWS before changing publication dates.
- Do not hand-edit `_site`, `gh-pages`, generated image/CSS/search caches,
  `node_modules`, or `vendor`. `_data/repo_stats.json` is refreshed by trusted CI;
  do not refresh it incidentally during validation. Leave `.claude/settings.local.json`
  and other user-specific settings alone.
- The publication-access backend has its own
  [deployment and compatibility guide](automation/apps-script/publication-access-request/README.md).
  Preserve its endpoint and private properties/logs; a GitHub push does not deploy it.
- Deploy through the checked workflow. The inherited `bin/deploy` rewrites a
  deployment branch and force-pushes; it is not the delivery entrypoint.
  `bin/cibuild` only invokes Jekyll and is not the full verification suite.
- Before delivery, review the diff and report checks actually run, checks omitted
  and why, and remaining failures. Bump root `VERSION` for a push (the existing
  site release sequence); do not synchronize unrelated package/backend versions.
