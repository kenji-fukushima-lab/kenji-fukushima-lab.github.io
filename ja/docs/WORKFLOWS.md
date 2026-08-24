# GitHub Actions and local checks

The repository keeps the site build, browser tests, accessibility checks, performance budgets, link checks, and deployment in `.github/workflows/deploy.yml`. A commit is built once, and every downstream job tests the same `_site` artifact.

## Site CI pipeline

The `Deploy site` workflow runs on relevant pushes, pull requests, manual dispatches, and a daily schedule. Scheduled runs refresh the build-time GitHub repository statistics without repeating the browser and Lighthouse jobs.

1. **Changed paths** classifies the commit in a small job so unrelated work can be skipped and external-link checks can start in parallel.
2. **Fast checks and production build** runs all Python, JavaScript, and Ruby unit tests, bibliography validation, the image budget, and Prettier. For deployable runs it refreshes `_data/repo_stats.json` through the authenticated GitHub API, falling back to the last generated value if an individual repository is temporarily unavailable. When site output or browser tests require it, the same prepared job restores the responsive-image cache, builds Jekyll once, validates both generated Atom feeds, purges unused CSS, checks generated local links, and uploads `_site` without repeating dependency setup.
3. **UI and accessibility** downloads that artifact and runs the Playwright UI and axe-core tests together. Independent tests run in parallel.
4. **Lighthouse** downloads the same artifact. Pull requests test only routes affected by local content changes when that can be determined safely; global changes and main-branch pushes test all configured routes three times.
5. **External links** runs only when Markdown or HTML sources change.
6. **Deploy** runs only after all applicable checks pass, and never for pull requests. It writes the commit SHA into the tested artifact, deploys it, then polls that cache-busted marker until the public GitHub Pages site serves the expected commit.

Formatting, browser, and Lighthouse failure artifacts are retained for seven days. Successful production-site artifacts are retained for one day.

## Local setup

Install dependencies and repository hooks once:

```bash
npm install
python3 -m pip install -r requirements-test.txt
npm run hooks:install
```

The pre-commit hook formats staged files. The pre-push hook runs:

- Python syntax and unit tests
- JavaScript unit tests
- every Ruby unit test in one Ruby process
- bibliography validation
- the image-size budget
- Prettier

Bibliography link validation retries temporary network failures and retryable HTTP 5xx responses with backoff before reporting a dead link.

Run the same checks manually with:

```bash
npm run checks:push
```

## Browser and performance tests

Build the production site before browser or Lighthouse tests:

```bash
bash .github/scripts/prepare-jekyll-build-env.sh
JEKYLL_ENV=production bundle exec jekyll build
npx purgecss -c purgecss.config.js
```

Playwright starts and stops its `_site` HTTP server automatically:

```bash
npx playwright install chromium
npm run test:ui
```

To reuse an existing Chromium-based browser instead, set its executable path:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:ui
```

Refresh the repository statistics before a local production build when current GitHub values are needed:

```bash
GITHUB_TOKEN="..." python3 .github/scripts/fetch_repo_stats.py
```

The token is optional for public repositories, but authenticated requests have more reliable API capacity.

Run Lighthouse with all configured routes and three samples per route:

```bash
npm run test:lighthouse
```

For a targeted local run:

```bash
LHCI_URL_PATHS=/resources/ LHCI_NUMBER_OF_RUNS=1 npm run test:lighthouse
```

## Other workflows

- `codeql.yml` scans JavaScript and Ruby changes and runs weekly.
- `dependency-audit.yml` audits Ruby and Node.js dependencies on lockfile changes and weekly.
- `blog-post-submission.yml` creates a blog-post pull request from a labeled issue.
- `profile-update-submission.yml` creates a profile-update pull request from a labeled issue.
- `schedule-posts.yml` publishes scheduled posts.

## Troubleshooting

- Run `npm run checks:push` first for a fast local reproduction.
- Download `formatting-diff` when the formatting step fails.
- Download `browser-failure-*` for Playwright traces and screenshots.
- Download `lighthouse-failure-*` for the HTML and JSON Lighthouse reports.
- Use **Re-run failed jobs** in GitHub Actions after an external service or runner failure.
