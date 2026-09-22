# CI, development, and publishing

`Deploy site` builds each site artifact once. UI tests, Lighthouse, deployment,
and the independent `Link health` workflow consume that artifact.

## Validation and deployment

1. **Changed paths** reads `.github/ci-paths.json` and actual page permalinks.
   Pushes to main and pull requests use the same classification. The workflow
   has no earlier `paths` filter that could silently omit a public root file or
   an Apps Script `.gs` change. Documentation, backend, and unit-test-only changes
   run fast checks without Jekyll. Changes to `tests/ui/` or `playwright.config.js`
   also build and run browser tests. Feeds and ownership files are built and
   published without scoring XML.
2. **Fast checks and production build** runs Python, JavaScript, and Ruby tests,
   offline bibliography validation, the image budget, and Prettier. ImageMagick
   is installed before the image regression tests, even on test-only runs.
   Deployable runs refresh GitHub statistics, restore responsive-image caches, build Jekyll,
   validate feeds, sitemap targets and image dimensions, optimize CSS, and
   validate local links.
3. **UI and accessibility** tests the artifact with Playwright and axe. The full
   English/Japanese desktop route list is retained, plus representative mobile
   and dark-mode combinations. Target size and visible/accessibility-name
   agreement are explicitly tested.
4. **Lighthouse** measures affected content routes three times. Global changes
   use the full baseline in the shared manifest; unknown/deleted page mappings
   also fall back to that set. A selected Japanese page is measured in Japanese.
   Known contrast, link styling, target-size, and accessible-name audits are
   required independently of the category score.
5. **Deploy** publishes only after all applicable checks pass, never for pull
   requests. It verifies that the public deployment marker serves the expected
   commit. The daily run refreshes data; Sunday's UTC schedule additionally runs
   the full browser and Lighthouse suites (Monday 08:30 Japan time). Manual
   Deploy runs also select full coverage; the optional `axe_path` input can
   narrow the accessibility route sweep.
6. **Link health** starts after a successful trusted main-branch Deploy run.
   When that run produced a site artifact, it downloads the same SHA's artifact
   and checks generated HTML plus every bibliography URL, including DOI and fields not rendered on a page. It neither
   reinstalls the build toolchain nor rebuilds Jekyll. Its failures remain visible
   in a separate check and do not block publication because a third-party server
   times out. The JSON artifact retains exact statuses, including 404 and
   timeouts; do not hide them by expanding exclusions without investigation.
   A docs/backend-only run has no artifact, so its following Link health run
   skips the scan. Its green status is not a new external-link measurement.

Production artifacts are retained for one day. Failure diagnostics and link
reports are retained for seven days. A manual Link health run selects an
unexpired successful main artifact; if none exists, run Deploy first. Pull
request artifacts are never processed by the `workflow_run` job, whose token
has only read access to contents and Actions.
Concurrent superseded site/link runs are cancelled. Feature-branch pushes do
not duplicate pull-request CI.

## Local development

See [INSTALL.md](../INSTALL.md) for the common Docker/Dev Container runtime and
native setup. Ruby 3.3.5, Node 22, and Python 3.13 are specified in version files;
keep those files, Docker stages, and CI consistent when upgrading runtimes.

```bash
npm ci
npm run hooks:install
docker compose up --build
```

The pre-commit hook formats staged files and protects partially staged files.
The pre-push hook selects local checks from every outgoing ref's old/new commit
pair. The selection lives in `.github/scripts/select_local_checks.py`:

| Changed paths                                                         | Local checks                     |
| --------------------------------------------------------------------- | -------------------------------- |
| Root contributor documents or Markdown under `docs/`                  | Formatting                       |
| Python unit-test files                                                | Syntax, Python tests, formatting |
| JavaScript unit-test files                                            | JavaScript tests, formatting     |
| Ruby unit-test files                                                  | Ruby tests, formatting           |
| Runtime source, fixtures, dependencies, build/CI, or any unknown path | All seven checks                 |

Mixed changes take the union. Renames include both paths. Missing history, new
refs, non-HEAD/tag pushes, or a dirty worktree fall back to all checks. These
validate the current worktree; remote CI independently validates the pushed
commit. Deleted or unchanged refs alone need no local suite. No successful-run
cache is used, so changed inputs cannot reuse a stale result.

Run all syntax/unit, offline bibliography, image-budget and formatting checks:

```bash
npm run checks:push
```

For a known local comparison base, including staged, unstaged and untracked
changes, run `npm run checks:push -- --base origin/main`. Inspect selection
without running checks with `python3 .github/scripts/select_local_checks.py
--base origin/main --json`. `--full` explicitly selects all checks. Required
production/browser verification for frontend or build changes is unchanged.

It does not contact bibliography websites. A Ruby installation with the locked
gems and ImageMagick is used first; otherwise the common Compose image and
persistent bundle volume run Ruby tests. Rebuild the image when Dockerfile/runtime requirements
change. Locked gems missing from an existing volume are installed without
rewriting `Gemfile.lock`. For an intentional dependency update, use
`BUNDLE_FROZEN=false bundle update <gem>` explicitly, then review the lockfile.

### Choosing verification

Run commands from the repository root after [setup](../INSTALL.md). The local
selector above is the minimum suite, not a substitute for generated-page checks:

| Change                                                             | Additional verification beyond selected local checks                                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contributor docs or agent skills                                   | Check referenced commands/paths; no site build for prose alone                                                                                                                    |
| Python, JavaScript or Ruby behavior                                | Exercise the affected regression in `tests/`, `tests/js/` or `test/`; use the existing `npm run test:unit:python`, `npm run test:unit:js`, or `npm run test:unit:ruby` entrypoint |
| Content, templates, browser assets, plugins or build configuration | Production build, generated-output validators below, affected English/Japanese pages, UI and relevant Lighthouse routes                                                           |
| `tests/ui/` or Playwright configuration                            | Production build and `npm run test:ui`                                                                                                                                            |
| Publication-access backend                                         | Local unit/digest checks and the [backend guide](../automation/apps-script/publication-access-request/README.md); live deployment is separate                                     |

For the CI route decision, pass changed repository-relative paths, one per line,
to `.github/scripts/classify_ci_changes.py --event push`. For example:

```bash
printf '%s\n' _layouts/bib.liquid | python3 .github/scripts/classify_ci_changes.py --event push
```

Include both sides of renames/deletions and new files. The output gives
`build_required`, `browser_required`, `lighthouse_required` and `lighthouse_urls`;
use those URLs for `LHCI_URL_PATHS`. Local and CI selection are intentionally
separate: an unknown local path runs all local checks but need not build a site.
There is no configured standalone type checker or general-purpose lint suite;
Prettier checks formatting, not program behavior.

**Cost and network:** with dependencies installed, `checks:push` uses local
fixtures and skips external bibliography URLs. A missing Ruby environment may
invoke Docker and install gems. Image builds, package/browser installation,
production builds and browser audits are separate work; cold image conversion
and search indexing can take longer, and pages can load third-party resources.
External bibliography scanning, dependency audits and GitHub-statistics refresh
are not prerequisites for a documentation edit. Do not refresh real data or
submit a live publication-access request as a smoke test.

If host runtimes are unavailable, the existing Compose service can also run the
whole local suite, not just its automatic Ruby fallback. After building the image
and installing Node dependencies in the mounted checkout:

```bash
docker compose build
docker compose run --rm --no-deps jekyll npm ci
docker compose run --rm --no-deps jekyll npm run checks:push
```

These commands run at `/srv/jekyll` in the container. The first two may download
dependencies; reuse an already prepared environment. A successful suite ends with
`Selected local worktree checks passed.` and exit status zero. Missing runtimes,
packages or a Docker daemon are setup failures, not reasons to skip checks.

## Production and browser checks

With native dependencies installed, build the production output before testing.
Playwright starts a separate port-8081 server and refuses to reuse an existing server.
Stop the development watcher when building into the shared `_site` directory;
otherwise choose a separate Jekyll destination and set `SITE_DIRECTORY` for tests.
The test server checks `build-info.json` and rejects development output:

```bash
npm run build
npx playwright install chromium
npm run test:ui
npm run test:lighthouse
```

Or build with the common container and run browser tests using the host Node:

```bash
docker compose run --rm -e JEKYLL_ENV=production jekyll bundle exec jekyll build
npm run css:purge
npx playwright install chromium
npm run test:ui
```

Both browser commands need host Python for their HTTP servers. Playwright
serves existing `_site` output on port 8081; it does not rebuild the site.
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8097` changes both the target and managed
server port. `SITE_DIRECTORY` selects an isolated production output directory
for both Playwright and Lighthouse. Use `PLAYWRIGHT_EXTERNAL_SERVER=1` only to intentionally test a
separately managed server. An existing Chrome can be selected:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:ui
```

Lighthouse separately discovers an installed Chrome/Chromium. If needed, set
`CHROME_PATH` to its executable; installing Playwright Chromium alone does not
configure Lighthouse. For example, on macOS with Google Chrome installed:

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:lighthouse
```

Lighthouse normally uses three samples. One-sample runs are diagnostic only:

```bash
LHCI_URL_PATHS=/ja/people/ LHCI_NUMBER_OF_RUNS=1 npm run test:lighthouse
```

Build before browser checks and always run `npm run css:purge` if Jekyll was
invoked directly. The CSS step keeps dynamic JavaScript states and original
stylesheet ordering, then writes content-hashed variants for page families.
Run it after Jekyll; rerunning the CSS step on the same output is safe. Do not
edit or commit `_site`.

### Isolated production output

With native dependencies installed, this subshell keeps output outside the
checkout and stops at the first failure. Use the same sequence inside the Compose
service if using its runtimes; container temporary output disappears on exit.

```bash
(
  set -eu
  site_check_dir=$(mktemp -d)
  trap 'rm -rf "$site_check_dir"' EXIT
  JEKYLL_ENV=production bundle exec jekyll build --destination "$site_check_dir"
  npm run css:purge -- "$site_check_dir"
  python3 .github/scripts/validate_site_artifact.py "$site_check_dir"
  python3 .github/scripts/validate_generated_feeds.py "$site_check_dir/feed.xml" "$site_check_dir/ja/feed.xml"
  python3 .github/scripts/validate_generated_sitemap.py "$site_check_dir/sitemap.xml" "$site_check_dir" --origin https://kenji-fukushima-lab.github.io
  python3 .github/scripts/validate_responsive_images.py "$site_check_dir"
  # For changes requiring browser coverage, run these before the directory is removed:
  # SITE_DIRECTORY="$site_check_dir" npm run test:ui
  # SITE_DIRECTORY="$site_check_dir" npm run test:lighthouse
)
```

Success means Jekyll and CSS processing finish, each validator exits zero, and
production `build-info.json`, search indexes, feeds and pages were produced.
This uses normal reusable Jekyll caches but leaves `_site` untouched. Browser
reports still use `test-results/` and `lighthouse-results-ci/`; the Lighthouse
runner replaces its previous reports. CI additionally checks generated local
links with Lychee. Passing these validators alone does not claim UI, Lighthouse,
external-link or live-deployment verification.

Responsive image generation, figures, Markdown images, blog thumbnails, and
preload hints share
`_plugins/responsive_image_manifest.rb`. Descriptors use actual dimensions;
images are not upscaled, and requested widths that collapse to the same native
width share one candidate. Cache keys include
image content, conversion options and the ImageMagick version. Same-name file
replacement invalidates in-process dimension caches. Keep `.jekyll-cache` for
normal development; clearing it intentionally measures a cold build.
CI checks every local `srcset`/`imagesrcset` width against the generated file,
including derivatives not loaded in a particular browser viewport.

## Scheduled posts

Place dated Markdown in `_scheduled/en-us/` or `_scheduled/ja/`. The filename
must be `YYYY-MM-DD-title.md`; a valid ISO `date` in front matter can override
the filename's date with a timestamp or explicit offset. Naive dates use
`Asia/Tokyo`, also the site's time zone. Invalid dated Markdown paths or calendar
dates fail the build; they are not silently retained for an impossible date.

The single daily `Deploy site` run checks at 08:30 Japan time (GitHub may execute
later). `_plugins/scheduled_posts.rb` reads due and overdue posts through Jekyll's
native publisher before feed generation and language coordination. Push/manual
builds also publish posts whose timestamps have passed. Sources remain in
`_scheduled` after publication; edit them there, or move them to `_posts` in a
normal reviewed change. Duplicate paths across the two directories fail the build.

No workflow commits or pushes scheduled content, and no branch-protection change
or privileged publishing token is needed. This is necessary because the current
main protection does not allow direct `GITHUB_TOKEN` pushes. The manual
`schedule-posts.yml` entry point simply dispatches the full Deploy pipeline;
there is no second daily build. A missed run is caught up on the next build.

Future-dated files already in `_posts` remain excluded by Jekyll until eligible;
the feed and sitemap use those native documents and their actual permalinks.
`published: false` suppresses production publication. `_scheduled` also respects
`draft: true`. Future/draft source committed to this public repository is still
public even when it is absent from the built site.

## Submission workflows

Blog/profile issue forms create or update reviewable PRs using `GITHUB_TOKEN`.
The repository must allow Actions to create pull requests; this setting was
enabled when checked on 2026-08-31. See the
[blog guide](blog-submission.md) and
[profile guide](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/wiki/Profile-Update-Instructions).

Under GitHub's current rules, bot-created or updated PRs can have workflows
waiting for a user with write access to select **Approve workflows to run**.
Review the diff before approving, and confirm checks ran for the current PR
revision before merging. A successful submission workflow only confirms PR
generation, not site validation or publication. See
[GitHub's workflow-trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).

## Other workflows and troubleshooting

`codeql.yml` scans code and `dependency-audit.yml` audits locked Ruby/Node
packages and the locked Python dependencies. The publication-access Apps Script is deployed separately: see its
[deployment guide](../automation/apps-script/publication-access-request/README.md).
A GitHub push alone does not update that web app.

Start with `npm run checks:push`. Download `formatting-diff`,
`browser-failure-*`, `lighthouse-failure-*` (JSON), or `link-health-*` as
appropriate. A link timeout is not evidence of a broken site build. Recheck the
remote service and distinguish transient failures from a confirmed missing URL.

## Audit regression coverage

CI treats moves as deletion plus addition so both old and new paths affect build
selection. Root visitor HTML receives browser and Lighthouse checks; XML,
robots.txt, and `google<hex>.html` ownership files retain lightweight validation.
Selected Lighthouse URLs are also added to the default axe route sweep.

Production builds reject developer documents and test output with
`.github/scripts/validate_site_artifact.py`. Direct Jekyll/container builds should
run this command on their output too. The normal `npm run build` and CI already do.

Link health retains its failure status and original JSON. Its job summary groups
unique failing URLs by domain and separates timeouts from HTTP errors. Cached
errors sharing a timeout URL count once as a timeout. A trusted-branch cache
preserves the first and last observed failure time across runs; cache expiry
starts a new observation period. An absent URL is removed from this history,
without claiming it returned HTTP 200. Diagnostics do not change the scan's
exclusions or pass/fail rules.
