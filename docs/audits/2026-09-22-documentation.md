# Documentation and implementation audit — 2026-09-22

## Scope and baseline

Baseline: `main`, `270e0de00d354fb07956613e4665bc03291091f8`; initially clean.
`origin/main` matched after fetching. Read `AGENTS.md`, `CONTRIBUTING.md`,
`INSTALL.md`, and the validation and push skills before making changes.

Prioritized installation, managed development, production builds, check
selection, browser-command configuration, generated artifacts, and result
interpretation. Compared README, INSTALL, FAQ, CUSTOMIZE and WORKFLOWS with
package scripts, runtime files, Docker/Compose, relevant scripts/plugins and
existing tests. Historical audit reports and changelogs were not rewritten.
This repository produces a bilingual website, not scientific tabular results.

## A — corrected documentation

| Location                               | Previous problem                                                                                              | Evidence and correction                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INSTALL.md`, native setup             | “ImageMagick” did not identify the commands required by the checks; subsequent Python selection was implicit. | `run-local-push-checks.sh` requires `convert` and `identify`; `_plugins/pagefind_postbuild.rb` probes interpreters in order. Documented those commands, keeping the virtual environment active, executable-path semantics and production failure behavior.                                                        |
| `FAQ.md`, browser-test setup           | Stopping port 8080 was presented as necessary to avoid server reuse.                                          | `playwright.config.js` uses port 8081 with `reuseExistingServer: false`; `tests/test_serve_site.py` covers production-marker and occupied-port rejection. Corrected the reason to concurrent writes to `_site` and linked the isolated-output recipe.                                                             |
| `docs/WORKFLOWS.md`, local-check table | “Root contributor documents” implied all root documentation received formatting-only checks.                  | `select_local_checks.py` has an explicit five-file allowlist; `tests/test_select_local_checks.py` covers selection. Listed the actual files and clarified that FAQ, CUSTOMIZE, skills and VERSION select all checks.                                                                                              |
| `docs/WORKFLOWS.md`, browser checks    | Lighthouse's port, input-list syntax, per-report acceptance and report replacement were undocumented.         | `run-lighthouse.sh`, `.lighthouserc.cjs`, `validate-lighthouse-results.cjs` and `tests/js/lighthouse-results.test.js`. Added port 4000, curl prerequisite, comma-separated paths, three runs per path, individual report evaluation, score/measurement units, warning/error distinction and report names/removal. |
| `docs/WORKFLOWS.md`, CSS processing    | The nearby `SITE_DIRECTORY` guidance could be read as applying to CSS processing too.                         | `purge-page-css.cjs` uses `process.argv[2]` or `_site`. Documented its positional argument and lack of `SITE_DIRECTORY` support.                                                                                                                                                                                  |

No runtime behavior, dependencies or scientific claims changed. Root VERSION
advances from `0.3.26` to `0.3.27` for the requested push under repository policy.

## B / C — unresolved discrepancies

No confirmed B (implementation bug/specification deviation) or C (ambiguous
intended specification/scientific meaning) finding in the prioritized scope.
This is not a claim that unreviewed interfaces are correct.

## Executed verification

The host has Ruby 2.6.10, Python 3.14 and no Node on PATH, so native setup was
not used. Reused the existing Compose image and bundle volume, without package
installation or runtime upgrades. Container versions: Ruby 3.3.5, Node 22.23.2,
Python 3.13.15; `bundle check` succeeded.

- Ran `docker compose run --rm --no-deps jekyll npm run checks:push -- --base 270e0de00d354fb07956613e4665bc03291091f8`:
  exit 0; all seven selected checks passed. Python: 80 tests; JavaScript: 13;
  Ruby: 16 tests / 109 assertions. Offline bibliography, image budget, source
  syntax/backend digest, and repository-wide formatting passed. Deployment
  messages in the Python test output are mocked regression scenarios, not live
  deployment checks.
- Ran the WORKFLOWS isolated-production command sequence inside
  `docker compose run --rm --no-deps jekyll sh -c '...'`, with `set -eu`,
  `mktemp -d`, and cleanup on exit. The actual commands were:

  ```bash
  JEKYLL_ENV=production bundle exec jekyll build --destination "$site_check_dir"
  npm run css:purge -- "$site_check_dir"
  python3 .github/scripts/validate_site_artifact.py "$site_check_dir"
  python3 .github/scripts/validate_generated_feeds.py "$site_check_dir/feed.xml" "$site_check_dir/ja/feed.xml"
  python3 .github/scripts/validate_generated_sitemap.py "$site_check_dir/sitemap.xml" "$site_check_dir" --origin https://kenji-fukushima-lab.github.io
  python3 .github/scripts/validate_responsive_images.py "$site_check_dir"
  ```

  All exited 0. Used the repository's full site input, with an isolated output
  destination; this is the documented direct-Jekyll alternative, not execution
  of `npm run build` itself. CSS output: 19 page families / 42 hashed stylesheets.
  Verified two Atom feeds, sitemap targets, 1,859 responsive-image width
  descriptors, production `build-info.json`, and English/Japanese Pagefind
  metadata and bundles. The build preceded the release-only VERSION bump;
  metadata contained `environment: production`, `version: 0.3.26`.
  Pagefind warned that Japanese stemming is unsupported; it still generated
  the Japanese search index. `_site` was not used or overwritten.

- Checked 52 relative Markdown link targets in the six scoped guides for
  filesystem existence: none missing. This checks target paths, not anchors or
  external URLs.
- Ran `select_local_checks.py --base origin/main --json`: all seven checks.
  Passed the edited guide paths and VERSION to
  `classify_ci_changes.py --event push`: fast checks required, site build,
  browser and Lighthouse not required.
- Formatted edited Markdown with the installed container Prettier and reviewed
  `git diff --check`. Final report formatting was checked separately after it
  was added; successful unchanged behavior checks were not repeated.

## Not executed or not exhaustively reviewed

No fresh Docker image build, native virtualenv installation, `npm ci`, package
or browser downloads: the supported existing image was sufficient for this
check, but does not prove installation from an empty cache. No actual
`npm run dev` server session; existing supervisor tests use small temporary
fixtures and substitute processes. No Playwright or Lighthouse browser run,
external-link scan, live Apps Script operation, data refresh or deployment
verification. These are not required for the documentation-only CI
classification and would add browser/network/external-service scope.

Submission forms, all content schemas and missing-value rules, backend API
contracts, every plugin/docstring, remote Wiki pages and external links were
not exhaustively audited. The local link check is not Lychee. Existing tests
were reused; no implementation-mirroring documentation test was added.
