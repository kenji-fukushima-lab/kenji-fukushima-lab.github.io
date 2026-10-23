# Additional performance review: 2026-10-23

The comparison base is `95e2b71dc`, including the first round of improvements.
Six additional candidates were screened; three were retained after output
comparisons and follow-up measurements.

| Candidate                                                  | Decision | Evidence                                                                                                                                                                             |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Measure word dimensions once per placement attempt         | Adopt    | Native SVG output is byte-identical. Render time fell by about 91% on desktop and 94% at phone width.                                                                                |
| Index post URLs before rendering previous/next links       | Adopt    | All 110 generated post-navigation fragments are byte-identical. Rendering plus index construction fell by about 30%.                                                                 |
| Skip unchanged blog-card attributes and ordered-node moves | Adopt    | Full DOM matches across searches; attribute mutations fell 74%. The absolute handler-time saving is small.                                                                           |
| Cache blog pagination buttons                              | Reject   | Added to the card optimization, screening median remained about 1.0 ms. The extra state did not establish a useful speed benefit.                                                    |
| Spatially index word-cloud collisions                      | Reject   | After dimension reuse, screening time worsened from 7.4→14.7 ms on desktop and 18.5→29.9 ms at phone width. SVG output matched, but the index overhead outweighed fewer comparisons. |
| Batch reading-progress updates in requestAnimationFrame    | Reject   | Native scrolling produced 119 updates before and after. Screening script time was 11.63→12.19 ms, with no useful reduction.                                                          |

## Retained changes and measurements

Measurements ran sequentially with Node 22.23.4 and Chromium 151.0.7922.34 on
macOS arm64. Ruby measurements used the prepared container's Ruby 3.3.5 and
locked gems. Other host activity can introduce scheduling noise, so the results
include repeated alternating samples, CPU time where applicable, output hashes
and deterministic operation counts.

| Workload                                          | Reference median | Retained median | Reduction |
| ------------------------------------------------- | ---------------: | --------------: | --------: |
| Word-cloud render/layout flush, English 1440×900  |          85.1 ms |          7.6 ms |     91.1% |
| Same, Japanese 390×900                            |         294.4 ms |         18.1 ms |     93.9% |
| All post navigation, including index construction |         146.4 ms |        103.0 ms |     29.6% |
| Same workload, CPU time                           |         146.4 ms |        103.0 ms |     29.6% |
| Same workload, Ruby allocations                   |          201,008 |         181,585 |      9.7% |
| Blog filter/render/layout flush, 110 cards        |           1.9 ms |          1.0 ms |     47.4% |

### Word cloud

The original solver measured the same text and font size again for every
candidate coordinate. Measurement now occurs once per font-size attempt, and
the placement loop translates the resulting width/height using the original
arithmetic. Each later render obtains fresh font metrics.

The benchmark uses the actual production dataset, native Canvas and SVG, loaded
fonts, one warmup pair and five alternating measured pairs per viewport. Each
sample renders five times and flushes SVG geometry. Unrelated network diagram
scripts are held constant as empty scripts, isolating the cloud. The default
desktop output contains 80 words, with 124,991→80 calls to `measureText` per
render. Phone width contains the same 53 placed words, with 480,791→189 calls.
Call counting happens separately from the timing loop.

Every SVG matches exactly, including coordinates, font sizes, viewBox, labels
and term order. Desktop SHA-256 is
`1ec21199c467ad21de7745226c496804387fd1c7c89895b7457fa71c3847dda1`;
phone SHA-256 is
`57c07c93a7df5678e3a8bc925f721233dc23cd00a63f5e11a1d283c5180b288b`.
Browser regressions additionally exercise both languages, width round trips,
changed font families and keyboard-focus attributes.

### Post navigation

The existing language-specific post arrays remain unchanged. A URL→index map is
built alongside them, retaining the first match for duplicate URLs. The Liquid
include uses that index to select the same previous/next entries. Missing URLs
remain navigation-free. The map is rebuilt with each generation and retains
one index entry per unique published URL during the build.

The benchmark renders all 110 actual posts plus missing URLs in both languages,
using the actual include/date templates and translations. Three warmup pairs
precede 11 alternating measured pairs. Current-version timing includes map
construction. Output comparison normalizes whitespace between tags; the fresh
production build also verified byte-identical navigation on all 110 post pages.
The benchmark output SHA-256 is
`083078719c73cb0809f17129cb56ab4bb0f03241395abee80f08d1a32454498f`.
This saves tens of milliseconds in that build stage; it does not represent a
30% reduction in whole-build time.

### Blog cards

The first render retains the original server-order behavior. Later renders
write `hidden`/`display` only when needed and move the visible card sequence only
when its order or membership changes. Counts, pagination and empty-state updates
continue on every render. The extra state retains references to one visible page.

The 390×844 benchmark uses 110 real cards, 14 queries repeated four times, one
warmup pair and five alternating measured pairs. It includes native layout and
excludes the input debounce. A separate 14-query observer pass recorded
1,681→432 attribute mutations and 460→340 child-list mutations in the blog
subtree. The p95 remained about 2.6 ms; the median saving is only about 0.9 ms.
Additional untimed comparisons cover oldest/title sorting, year/author facets,
reset and forward/back paging, comparing full DOM and control values.
The combined search/compatibility snapshot SHA-256 is
`4078a68d652755f21f1e0f4c4231e35aad061a4f55381226fa32d6ad19b74ba3`.

## Reproduction

Use [INSTALL](../INSTALL.md) and isolated production output from
[WORKFLOWS](WORKFLOWS.md#isolated-production-output). Serve that output on port
8099, then run from the repository root:

```bash
SITE_URL=http://127.0.0.1:8099 CHROME_PATH=/path/to/chromium \
  node tests/benchmarks/word-cloud.cjs 95e2b71dc
SITE_URL=http://127.0.0.1:8099 CHROME_PATH=/path/to/chromium \
  node tests/benchmarks/blog-filter.cjs 95e2b71dc
docker compose run --rm --no-deps -e BUNDLE_IGNORE_CONFIG=true jekyll \
  ruby tests/benchmarks/post-navigation.rb 95e2b71dc
```

The browser benchmarks accept `BENCHMARK_RESULTS=/absolute/path.json` for raw
samples. Their `RUNS` setting defaults to five measured pairs. These measurements
cover the described rendering work; network loading and whole-page Lighthouse
scores are checked separately.

## Integration validation

- All seven local checks passed with
  `docker compose run --rm --no-deps jekyll npm run checks:push -- --base 95e2b71dc`:
  108 Python tests, 31 JavaScript tests, 46 Ruby tests / 536 assertions, syntax,
  bibliography/image budgets and Prettier.
- A fresh isolated production build and CSS processing passed artifact, both
  Atom-feed, sitemap and 1,849 responsive-image width-descriptor validators.
  All 72 generated CSS files and all 110 post-navigation fragments match the
  reference byte for byte.
- The full Playwright suite passed all 121 tests with two workers, including
  the new unchanged-card/paging/empty/reset case and English/Japanese cloud
  resize/font round trips.
- Lighthouse passed the existing required assertions for all 33 reports:
  the nine selected baseline routes plus English/Japanese network pages,
  three samples each. Category ranges were performance 76–93, accessibility
  100, best practices 96–100 and SEO 100. These are acceptance checks, not a
  controlled before/after whole-page speed comparison.
- The first Lighthouse invocation stopped during Chromium temporary-profile
  cleanup with `ENOTEMPTY`. An unchanged retry completed all 33 samples.
  Remaining nonblocking diagnostics were GitHub repository API HTTP 403
  responses on the resources page and a Chart.js CDN source-map warning.
  Resource fetching code was unchanged; the cached-statistics UI check passed.

External bibliography-link and dependency audits were omitted because neither
links nor dependencies changed. The publication-access backend was outside this
change; no live request was submitted. Generated output, caches, statistics and
the site release version were not included in the source changes.
