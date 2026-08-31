# Development setup

This repository uses Ruby 3.3.5, Node 22, and Python 3.13. The version files and
CI select these runtimes. ImageMagick is required for responsive images and
`librsvg2-bin` supplies SVG inspection support in the Linux image.

## Docker and Development Containers

Install Docker with Compose, then run:

```bash
docker compose up --build
```

Open <http://127.0.0.1:8080/>. This builds the repository's own image, not an
unrelated prebuilt al-folio tag. The Gemfile.lock dependencies are included in
the image and kept in the named `jekyll-bundle` volume. Subsequent starts reuse
them. Neither startup nor a configuration reload restores/deletes your lockfile.

VS Code's Dev Container uses the same Compose service, dependencies, entrypoint,
and ports. It does not launch another server on every editor attachment.
`docker compose -f docker-compose-slim.yml up --build` remains a compatibility
entry point to the same runtime; there is no separate slim environment to drift.

Stop with Ctrl-C or `docker compose down`. Do not add `-v` unless you intend to
remove the reusable bundle cache. Rebuild after runtime/Dockerfile changes.

For host-side formatting and browser tests, install Node 22 and Python 3.13,
then install the Node dependencies and hooks:

```bash
npm ci
npm run hooks:install
```

The push checks also need host Python test packages. Create a host virtual
environment and install `requirements-test.txt` as shown in the native setup;
Ruby checks can use Docker. See the
[container production-build commands](docs/WORKFLOWS.md#production-and-browser-checks)
before running browser checks.

## Native setup

Use a Ruby/Node/Python version manager to select the checked-in version files.
Install ImageMagick (including SVG support), create a Python virtual environment,
and install the locked Ruby and Node dependencies plus the Python requirements:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-build.txt -r requirements-test.txt
bundle install
npm ci
npm run dev
```

The development server runs on port 8080. Content changes use Jekyll's watcher;
`_config.yml` replacement or edits restart only the managed server process.
An unexpected Jekyll exit is reported instead of being silently retried forever.
Windows development should use Docker or WSL because the process supervisor
uses POSIX signals.

## Validation and deployment

With the native dependencies above installed, stop any development server on
port 8080 so Playwright tests the production output:

```bash
npm run checks:push
npm run build
npx playwright install chromium
npm run test:ui
npm run test:lighthouse
```

On Linux, Playwright may also need system libraries; use
`npx playwright install --with-deps chromium` to install them. Lighthouse uses
its own Chrome discovery, not Playwright's browser selection. Install Chrome
or Chromium and set `CHROME_PATH` if needed; see the
[executable-path examples](docs/WORKFLOWS.md#production-and-browser-checks).

The Docker fallback in the push checks covers Ruby, not host Python or Node;
install `requirements-test.txt` in your active host Python environment if needed.
See [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for detailed coverage, image/CSS caching,
selected-route runs, scheduled publication, and troubleshooting. Site-affecting
main-branch pushes publish through the checked GitHub Actions pipeline;
docs-only and backend-only pushes do not rebuild the site. Do not publish an
untested `_site` manually.

The publication-access web app has a separate
[Apps Script deployment procedure](automation/apps-script/publication-access-request/README.md).
Never put passwords, OAuth credentials, or private request logs in this repository.

## Upgrading from a previous version

This is a customized lab site. Review upstream al-folio changes before applying
them; replacing the repository with a new template would discard local features.
Update dependency manifests and their locks together, rebuild the Docker image
when its runtime changes, and run the validation commands above. Keep the runtime
version files, Dockerfile, and documented versions consistent.
