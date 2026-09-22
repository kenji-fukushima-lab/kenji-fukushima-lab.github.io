---
name: validate-site-change
description: Select and run this Jekyll site's existing local checks and generated-page verification after a change. Use for repository change validation, not live Apps Script deployment, performance benchmarking, or external-link audits.
---

# Validate a site change

Inputs: the intended change, its repository-relative paths, a known Git comparison
base (when available), and the available native or Compose environment. Run from
the repository root. The output is a validation report, not a new test framework.

1. Inspect `git status --short` and the diff. Include staged, unstaged and
   untracked files, both old and new paths of renames, and every intended outgoing
   commit. Preserve unrelated work. Read [INSTALL.md](../../../INSTALL.md) only
   for missing setup; use its pinned runtimes or the existing Compose image.
2. Inspect the local selection with
   `python3 .github/scripts/select_local_checks.py --base origin/main --json`,
   substituting the actual comparison base. If it is unknown, use the full suite.
   Follow [Choosing verification](../../../docs/WORKFLOWS.md#choosing-verification)
   for additional coverage. Feed the changed paths to
   `python3 .github/scripts/classify_ci_changes.py --event push` to obtain the
   production/browser decision and affected Lighthouse routes. Do not assume
   local formatting-only selection proves generated pages are correct.
3. Run `npm run checks:push -- --base origin/main` with the selected base, or
   `npm run checks:push` without one. The guide documents the Compose equivalent.
   For behavior changes, exercise a relevant existing regression or add a focused
   regression when needed. Fix failures at their source; keep thresholds intact.
4. When production verification is required, use the guide's
   [isolated production recipe](../../../docs/WORKFLOWS.md#isolated-production-output).
   Apply CSS processing to the same destination, validate it, then point UI and
   Lighthouse at it with `SITE_DIRECTORY` before cleanup. Use the classifier's
   routes for `LHCI_URL_PATHS`; retain the normal three Lighthouse samples for
   acceptance. Check affected language variants and interactions. Do not treat
   existing `_site` or a development build as evidence for the current change.
5. Review the final diff for generated files or incidental data updates. Report
   commands, environment, exit status and test counts when available; separate
   executed checks, static inspection and omitted checks with reasons. A passing
   local suite does not establish external-link health or live deployment state.

If a runtime, dependency, browser or Docker daemon is unavailable, use the
already prepared supported alternative or report the precise missing prerequisite.
Do not install large browser/toolchain downloads merely to validate prose. Keep
partial failures visible and do not call a required unrun check successful. An
unchanged successful suite need not be repeated manually when the installed
pre-push hook will run it. Push/release requests additionally use the existing
`prepare-github-push` skill; this skill does not authorize deployment or live form
submissions.
