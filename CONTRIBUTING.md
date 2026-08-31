# Contributing to the Fukushima Lab website

Use the setup in [INSTALL.md](INSTALL.md) and the checks in
[docs/WORKFLOWS.md](docs/WORKFLOWS.md). Preserve unrelated work and follow
[AGENTS.md](AGENTS.md) for repository policy.

Keep content changes and their English/Japanese counterparts consistent. For
behavior changes, add focused regression checks where they exercise a real
failure, then build and inspect affected pages. Never commit `_site`, generated
caches, private request logs, or publication-access credentials.

Run `npm run checks:push` before pushing. Frontend or build changes also need a
production build and the relevant UI/Lighthouse checks. Format with Prettier;
CI provides a `formatting-diff` artifact when formatting differs. Do not lower
validation thresholds or exclude links just to turn a failed check green.

When an interface, output path, runtime, or CI selection rule changes, update
its producers, consumers, tests and documentation together. Keep the top-level
README short and put operational detail in dedicated documents.

Template-only improvements may also be useful upstream in
[al-folio](https://github.com/alshedivat/al-folio) or
[multi-language-al-folio](https://github.com/george-gca/multi-language-al-folio).
Contributions retain the license in [LICENSE](LICENSE).
