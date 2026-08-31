# kenji-fukushima-lab.github.io

[![Deploy site](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/actions/workflows/deploy.yml)

This is the repository for the website of the [Fukushima Lab](https://kenji-fukushima-lab.github.io/), a research group at the [National Institute of Genetics](https://www.nig.ac.jp/nig/) in Mishima, Japan. The site was built using the [multi-language-al-folio](https://github.com/george-gca/multi-language-al-folio) template.

## Local development

The quickest way to run the site locally is with Docker:

```bash
docker compose up --build
```

Then open <http://127.0.0.1:8080/>.

After completing the Ruby, Node, Python, and ImageMagick
[native setup](INSTALL.md#native-setup), you can also run:

```bash
npm run dev
```

## Checks

With Node and the host Python test dependencies installed (see
[setup](INSTALL.md)), install the repository hooks once and run the fast checks:

```bash
npm ci
npm run hooks:install
npm run checks:push
```

`checks:push` runs unit, bibliography, image-budget, and formatting checks.
For frontend changes, build the production site and run the
[browser checks](docs/WORKFLOWS.md#production-and-browser-checks).
Playwright serves an existing `_site`; it does not build it.

## More docs

- [INSTALL.md](INSTALL.md) for Docker and local environment setup
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for CI, hooks, and publishing workflows
- [CUSTOMIZE.md](CUSTOMIZE.md) for site-specific customization notes
- [FAQ.md](FAQ.md) for troubleshooting
- [Wiki](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/wiki) for blog and profile submission guides
