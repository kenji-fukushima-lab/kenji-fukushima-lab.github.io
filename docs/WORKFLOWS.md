# CI, development, and publishing

`Deploy site` builds each site artifact once. UI tests, Lighthouse, deployment,
and the independent `Link health` workflow consume that artifact.

## Validation and deployment

1. **Changed paths** reads `.github/ci-paths.json` and actual page permalinks.
   Pushes to main and pull requests use the same classification. The workflow
   has no earlier `paths` filter that could silently omit a public root file or
   an Apps Script `.gs` change. Backend/test-only changes run fast checks without
   Jekyll; feeds and ownership files are built and published without scoring XML.
2. **Fast checks and production build** runs Python, JavaScript, and Ruby tests,
   offline bibliography validation, the image budget, and Prettier. Deployable
   runs refresh GitHub statistics, restore responsive-image caches, build Jekyll,
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
   the full browser and Lighthouse suites. Manual Deploy runs also use full
   coverage.
6. **Link health** starts after a successful trusted main-branch Deploy run.
   It downloads the same SHA's artifact and checks generated HTML plus every
   bibliography URL, including DOI and fields not rendered on a page. It neither
   reinstalls the build toolchain nor rebuilds Jekyll. Its failures remain visible
   in a separate check and do not block publication because a third-party server
   times out. The JSON artifact retains exact statuses, including 404 and
   timeouts; do not hide them by expanding exclusions without investigation.

Production artifacts are retained for one day. Failure diagnostics and link
reports are retained for seven days. A manual Link health run selects an
unexpired successful main artifact; if none exists, run Deploy first. Pull
request artifacts are never processed by the privileged `workflow_run` job.
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

The pre-commit hook formats staged files. The pre-push hook runs syntax checks,
all unit suites, offline bibliography validation, the image budget, and Prettier:

```bash
npm run checks:push
```

It does not contact bibliography websites. A Ruby installation with the locked
gems is used first; otherwise the common Compose image and persistent bundle
volume run Ruby tests. Rebuild the image when Dockerfile/runtime requirements
change. Locked gems missing from an existing volume are installed without
rewriting `Gemfile.lock`. For an intentional dependency update, use
`BUNDLE_FROZEN=false bundle update <gem>` explicitly, then review the lockfile.

## Production and browser checks

With native dependencies installed:

```bash
npm run build
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

Playwright manages its local HTTP server. An existing Chrome can be selected:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:ui
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

Responsive image generation, figures, Markdown images, blog thumbnails, and
preload hints share
`_plugins/responsive_image_manifest.rb`. Descriptors use actual dimensions;
only one candidate at or above the source width is generated. Cache keys include
image content, conversion options and the ImageMagick version. Same-name file
replacement invalidates in-process dimension caches. Keep `.jekyll-cache` for
normal development; clearing it intentionally measures a cold build.
CI checks every local `srcset`/`imagesrcset` width against the generated file,
including derivatives not loaded in a particular browser viewport.

## Scheduled posts

Place dated Markdown in `_scheduled/en-us/` or `_scheduled/ja/`. The filename
must start with `YYYY-MM-DD`; an ISO `date` in front matter can specify a later
time or explicit offset. Naive dates use `Asia/Tokyo`, also the site's time zone.

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
the feed and sitemap now use those native documents and their actual permalinks.

## Other workflows and troubleshooting

`codeql.yml` scans code and `dependency-audit.yml` audits locked Ruby/Node
packages. Blog/profile submission workflows create reviewable pull requests.
The publication-access Apps Script is deployed separately: see its
[deployment guide](../automation/apps-script/publication-access-request/README.md).
A GitHub push alone does not update that web app.

Start with `npm run checks:push`. Download `formatting-diff`,
`browser-failure-*`, `lighthouse-failure-*` (JSON), or `link-health-*` as
appropriate. A link timeout is not evidence of a broken site build. Recheck the
remote service and distinguish transient failures from a confirmed missing URL.
