# kenji-fukushima-lab.github.io

[![Deploy site](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/actions/workflows/deploy.yml)

This is the repository for the website of the [Fukushima Lab](https://kenji-fukushima-lab.github.io/), a research group at the [National Institute of Genetics](https://www.nig.ac.jp/nig/) in Mishima, Japan. The site was built using the [multi-language-al-folio](https://github.com/george-gca/multi-language-al-folio) template.

## Local development

The quickest way to run the site locally is with Docker:

```bash
docker compose up
```

Then open `http://127.0.0.1:8080/`.

If you already have a working Ruby and Bundler environment, you can also run:

```bash
bundle exec jekyll serve
```

## Checks

Install the repository hooks once:

```bash
npm install
npm run hooks:install
```

Useful local checks:

```bash
npm run checks:push
npm run test:ui
```

`npm run checks:push` runs the Python, JavaScript, and Ruby unit suites together with bibliography, image-budget, and formatting checks. Run `npm run test:ui` as an extra browser test for frontend-heavy changes; Playwright starts the local `_site` server automatically.

## More docs

- [INSTALL.md](INSTALL.md) for Docker and local environment setup
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for CI, hooks, and publishing workflows
- [CUSTOMIZE.md](CUSTOMIZE.md) for site-specific customization notes
