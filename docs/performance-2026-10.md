# Performance review: 2026-10-23

Ten separate subagents evaluated these candidates against `4baa977e0`. Seven
were retained after output comparisons, regression checks and follow-up
measurements. The three rejected experiments were left out of the implementation.

| #   | Candidate                                            | Decision and evidence                                                                                                                                                                                |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reuse normalized coauthor keys                       | Adopt. Generate-scoped lookup removes repeated Unicode normalization in edge construction; screening allocations fell 38.5%.                                                                         |
| 2   | Invert the paper/shared-author index                 | Reject. Full-generator screening was 171→172 ms; a faster graph subsection did not establish a useful overall gain.                                                                                  |
| 3   | Read/filter organism-map papers once                 | Adopt. Reuse the focused entries for the complete catalog and subsequent counts; screening allocations fell 49.2%.                                                                                   |
| 4   | Skip HTML parsing for ordinary schema text           | Adopt. Only plain UTF-8 ASCII without markup/entities/control characters takes the shortcut. Unicode and parser normalization retain the original path.                                              |
| 5   | Share bibliography parsing across generators         | Adopt. Compare file contents on each read, return independent deep copies, and discard the cache on site reset. Combined results below include its overlap with #3.                                  |
| 6   | Preparse the Liquid file-existence argument          | Reject. Allocations fell, but CPU screening was 10.97→11.41 ms per 84 calls, with wide paired variation.                                                                                             |
| 7   | Reduce CSS-generator input-read overhead             | Adopt the two-line synchronous-read change in the standalone CLI. Output remains identical; serial measurements below confirm lower time and peak RSS. The larger PurgeCSS API rewrite was left out. |
| 8   | Pause gallery swaps outside the viewport             | Adopt. Native IntersectionObserver gates new swaps; an already-started preload may finish. Benefit requires a viewport where the gallery can leave the screen.                                       |
| 9   | Keep unchanged publication result groups             | Adopt. Compare entry identity/order and sort before replacing headings/lists. Highlight, chart and badge updates still run.                                                                          |
| 10  | Replace pointer-hit distances with squared distances | Reject. Full interaction time was 240.1→241.7 ms in screening, and floating-point boundary hit decisions differed despite matching normal interaction snapshots.                                     |

## Follow-up measurements

Ruby ran in the prepared development image: Ruby 3.3.5, aarch64 Linux,
bibtex-ruby 6.2.0 and Nokogiri 1.19.4. Node was 22.23.4 on macOS arm64;
browser measurements used Chromium 151.0.7922.34. Measurements ran sequentially
after the subagent workloads finished. Other host workloads could still add
scheduling noise, so CPU time, allocations and repeated samples supplement wall time.

| Workload and metric                            | Reference | Retained changes | Reduction |
| ---------------------------------------------- | --------: | ---------------: | --------: |
| Five bibliography generators, median wall time |  591.3 ms |         484.6 ms |     18.0% |
| Same workload, median CPU time                 |  577.4 ms |         462.7 ms |     19.9% |
| Same workload, median allocated objects        | 1,150,381 |          723,916 |     37.1% |
| Page CSS CLI, median wall time                 |   2.798 s |          2.138 s |     23.6% |
| Same workload, median CPU time                 |   2.322 s |          1.907 s |     17.9% |
| Same workload, median peak RSS                 | 205.8 MiB |        189.5 MiB |      7.9% |
| Publication filter/render handler, median      |   24.7 ms |           5.3 ms |     78.5% |
| Same workload, p95                             |   96.9 ms |          31.8 ms |     67.2% |

The bibliography workload uses the actual 92,397-byte bibliography, profile and
alias data, fixed site time, and an offline snapshot of positive/negative
taxonomy decisions: 42 papers, 245 coauthor nodes and 2,725 coauthor links.
Eleven measured alternating pairs follow three warmup pairs. Each replay forks
from the same parent state; reusing one Ruby process had caused allocations to
grow across samples in the reference too. Timings exclude fork/setup and JSON
validation. All five JSON outputs match byte for byte on every replay and with
the generator order reversed. The combined output SHA-256 is
`1f97d2040ee0c4a548083d757bae85b804823d7ed5218c20dcd028f2f2398490`.

The CSS comparison uses the same freshly generated, unpurged production output
for each child process: one warmup pair and three measured alternating pairs.
Every one of the 285 HTML/CSS/JS files matches byte for byte; the sorted file
manifest SHA-256 is `8ae806bf34f46449707f91134225b03d64f7aad09fe195b1a39b0b30ee6ecd8e`.
Synchronous reads suit this batch CLI; it does not serve interactive requests.

The search comparison uses the actual 42-paper production page at 1440×1400,
21 queries repeated four times, one warmup pair and five measured alternating
pairs. Handler timing includes filtering, grouping, highlighting and dashboard
updates, with the input debounce excluded. HTML, ordering, highlight ranges,
chart values/colors/dimensions and hash match the reference. Additional English
and Japanese checks cover facets, reset, citation hydration, Altmetric callbacks
and polling, and theme changes.

Gallery measurements use the actual `/ja/` page at 390×667 and a real scroll to
the footer. Across five measured pairs after warmup, approximately 57 seconds
of gallery timer ticks produced 20→0 new preloads/swaps. Image requests fell
19→6 and cold gallery transfer fell 393,860→87,251 bytes (77.8%), including
the initial six images. IO, rendering and networking remained native. A separate
real-clock 9.5-second check changed three tiles in the reference and zero while
offscreen in the retained version; both resumed on return. At 1440×900 and
390×844 the gallery cannot scroll fully offscreen, so this optimization has no
effect in those viewports. Visible seeded output, hidden documents, missing IO,
resize and in-flight/stale preload behavior were checked separately.

These are measurements of the described workloads. The bibliography cache
retains one parsed input until reset and deep-copies consumers to preserve
mutation isolation. Whole-build time and end-user loading scores have separate
costs and were checked through the normal production/browser workflow.

## Reproduction

Use the runtimes and dependencies in [INSTALL](../INSTALL.md). Generate isolated
production output with the recipe in [WORKFLOWS](WORKFLOWS.md#isolated-production-output).
The bibliography benchmark needs a taxonomy snapshot from a successful build;
it fixes those decisions for offline repeatability and fails on missing entries.

```bash
docker compose run --rm --no-deps -e BUNDLE_IGNORE_CONFIG=true jekyll \
  ruby tests/benchmarks/publication-generators.rb 4baa977e0

# Serve the freshly built and purged output on port 8099 before this comparison.
SITE_URL=http://127.0.0.1:8099 CHROME_PATH=/path/to/chromium \
  node tests/benchmarks/publications-filter.cjs 4baa977e0
```

The CSS benchmark accepts `RAW_SITE REFERENCE_SCRIPT CURRENT_SCRIPT`, alternates
the execution order and records wall/CPU time, peak RSS and output hashes.
To materialize the reference script with its required relative imports:

```bash
css_bench_ref=$(mktemp -d)
mkdir -p "$css_bench_ref/.github/scripts"
git show 4baa977e0:.github/scripts/purge-page-css.cjs > "$css_bench_ref/.github/scripts/purge-page-css.cjs"
cp .github/ci-paths.json "$css_bench_ref/.github/"
cp purgecss.config.js "$css_bench_ref/"
ln -s "$PWD/node_modules" "$css_bench_ref/node_modules"
node tests/benchmarks/purge-page-css.cjs /path/to/raw-production-output \
  "$css_bench_ref/.github/scripts/purge-page-css.cjs" .github/scripts/purge-page-css.cjs
rm -rf "$css_bench_ref"
```

The new browser regressions in `home-hero.spec.js` and
`publications-list.spec.js` exercise real scroll/pause/resume and retained result
groups with updated highlights. Bibliography tests cover aliases, metadata,
Unicode, later-paper catalogs, file changes with preserved size/mtime, deletion,
site reset and independent mutable/LaTeX-converted entries.

## Integration validation

- `docker compose run --rm --no-deps jekyll npm run checks:push -- --base origin/main`:
  all seven selected checks passed, including 108 Python tests, 31 JavaScript
  tests and 45 Ruby tests / 529 assertions, bibliography/image budgets and Prettier.
- Isolated production build, CSS processing and artifact validation passed.
  Both Atom feeds, sitemap targets and 1,849 responsive-image width descriptors
  passed their validators; Pagefind indexed both languages.
- Actual production coauthor/paper/organism/word-cloud JSON matches the reference
  after removing generation timestamps. All JSON-LD on both publication pages
  matches exactly.
- `SITE_DIRECTORY=... PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=... npm run test:ui -- --workers=2`:
  all 118 tests passed, including the three new browser regressions.
- `SITE_DIRECTORY=... CHROME_PATH=... npm run test:lighthouse`: all 27 reports
  passed the unchanged assertions (nine classifier-selected routes, three samples
  each). Performance scores were 75–93; accessibility, best practices and SEO were
  100 throughout. Publication-page runs printed a Chart.js source-map diagnostic;
  no required assertion failed.

The checks used the prepared container's Ruby 3.3.5, Node 22 and Python 3.13;
browser servers used host Python 3.13 and the existing Chromium installation.
External bibliography-link and dependency audits were omitted because links and
dependencies were unchanged. No live publication-access request was submitted;
the backend was outside this change.
