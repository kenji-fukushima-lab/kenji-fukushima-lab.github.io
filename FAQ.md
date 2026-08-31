# Frequently asked questions

These answers apply to the Fukushima Lab repository. For setup, start with
[INSTALL.md](INSTALL.md); for the active automation, use
[docs/WORKFLOWS.md](docs/WORKFLOWS.md). Report lab-site issues in
[this repository](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues),
not in an upstream template's tracker unless the issue has been reproduced there.

## Why did a successful push not change the website?

The Deploy workflow classifies changed paths. Documentation and backend-only
changes run fast checks without a site build or publication. A change confined
to `VERSION` and/or `AGENTS.md` also skips the fast checks.
Site-affecting changes publish after all applicable checks pass. Pull requests
do not publish. Check the `Changed paths` and `Deploy` jobs, not only the overall
workflow badge. A GitHub push does not update the separate Apps Script service.

Do not edit `gh-pages` or manually publish `_site`. This repository builds with
its locked dependencies and custom plugins before deploying the artifact; the
source branch is not a ready-made static website.

## Why are the local styles missing or different from production?

Check `_config.yml`: `url` is `https://kenji-fukushima-lab.github.io`, and `baseurl`
is empty. A production build is `npm run build`. If you invoked Jekyll directly,
run `npm run css:purge` afterwards. Verify that the build finished successfully
and that the browser is serving the new `_site`, then reload without cache.
Clearing all browser history is unnecessary.

## Why does a configuration or dependency change not take effect?

The managed development command watches `_config.yml` and restarts Jekyll.
A standalone `bundle exec jekyll serve` does not use that supervisor. Restart
for plugin/dependency changes and rebuild the Docker image after runtime or
Dockerfile changes. Keep `Gemfile.lock`; deleting it hides reproducibility
problems. See the [native setup](INSTALL.md#native-setup) and
[dependency update notes](INSTALL.md#upgrading-from-a-previous-version).

## Why do browser tests fail on a fresh checkout?

Install the dependencies in [INSTALL.md](INSTALL.md), build `_site`, and install
Playwright's Chromium with `npx playwright install chromium`. Playwright starts
an HTTP server but does not build the site. Stop the development server on port
8080 first so the tests do not reuse a different build.

Lighthouse also needs host Python and an installed Chrome/Chromium executable.
Installing Playwright's browser alone does not configure Lighthouse. Use
`CHROME_PATH` when automatic Chrome discovery fails; examples are in
[the browser-check guide](docs/WORKFLOWS.md#production-and-browser-checks).

## Why did formatting or the push hook fail?

Run `npm ci`, then `npm run checks:push`. For a formatting error, use the locked
formatter with `npx prettier path/to/changed-file.md --write`, review the diff,
and stage the corrected file. The pre-commit hook refuses partially staged
files rather than overwriting their unstaged edits. CI formatting failures
include a `formatting-diff` artifact.

The Ruby check can fall back to the common Docker image, but host Python and
Node are still required. Do not install an unrelated global Prettier version
or skip failing checks to publish.

## Why is a blog post or feed entry missing?

Check its date, language, `published` setting, front matter, and filename.
Future-dated posts become eligible only after their timestamp; a missed daily
run is caught up on the next build. `_scheduled` sources are not moved into
`_posts` by a bot. See [scheduling](docs/WORKFLOWS.md#scheduled-posts).

The English and Japanese feeds are `/feed.xml` and `/ja/feed.xml`. They are
built by `_plugins/generated_site_indexes.rb` from publishable native posts,
not by the inherited template's RSS instructions. The Japanese blog is in
navigation; the English blog is currently hidden from navigation and `noindex`.

## Why was my blog or profile submission rejected?

Use the [blog guide](docs/blog-submission.md) or
[profile guide](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/wiki/Profile-Update-Instructions).
The blog issue form accepts Markdown, not arbitrary HTML or Liquid. Put an X
post URL in the issue; a maintainer can add the shared embed include in the PR.
Profile updates must match an existing member's `github` field. Blank profile
fields keep their current values; `CLEAR` erases supported values but cannot
change another member's identity. A submission opens a reviewable PR and does
not publish immediately.

## Does Link health success mean every external URL returned HTTP 200?

No. A docs-only Deploy run creates no site artifact, so its following Link
health run skips the scan. Actual scans also have explicit accepted statuses
and exclusions in `.github/workflows/link-health.yml` and `.lycheeignore`.
Inspect the job log and retained JSON report;
a green workflow badge alone does not prove all links were checked or all
returned 200. Transient remote failures are separate from the site build.

## Do I need a Lighthouse Badger token?

No. This repository has no active Lighthouse Badger workflow. Lighthouse runs
inside Deploy and saves failure reports; do not create a
`LIGHTHOUSE_BADGER_TOKEN` or grant repository write access for that old recipe.

## How should I fix a Git authentication or push rejection?

Check `git remote -v`, your GitHub credentials, and the actual error. HTTPS and
SSH use different valid URL formats; replacing the word `https` with `ssh` is
not a correct conversion. Keep tokens out of repository files. Authentication
does not override repository rules: follow [AGENTS.md](AGENTS.md), and do not
change branch protection or force-push to work around a rejection.

## How do I update the theme, dependencies, or icon libraries?

Follow [the upgrade guide](UPGRADING.md). Update compatible code and lockfiles
together, inspect changed icons/styles in the rendered site, and run the
relevant validation. For bundled icons, keep their CSS/SCSS and font assets from
the same compatible release. Replacing the whole site with a fresh template
would discard lab-specific features.

## How is Google Search Console verification configured?

For HTML-tag verification, the supported settings are:

```yaml
google_site_verification: YOUR_VERIFICATION_TOKEN
enable_google_verification: true
```

The token is the `content` value from Google's verification tag, not the whole
HTML element. The configuration key uses underscores; the generated HTML meta
name uses `google-site-verification`. `_includes/metadata.liquid` reads both
settings above. HTML-file verification is a separate method: keep any required
root verification file when using it. Neither method implies ownership of the
parent `github.io` DNS domain. See
[Google's verification instructions](https://support.google.com/webmasters/answer/9008080).
