# Documentation audit — 2026-08-31

This dated audit covers the repository's contributor/operation guides, issue-form
help, profile template, the public request-procedure page, and all four lab-site
Wiki pages. It is not a new scientific benchmark or a deployment attestation.

The source checkout was updated to main at `d1f6394`; the Wiki baseline was
`cf94b46`. Corrections are part of site documentation revision `0.3.14`.

## Findings and corrections

| Area                        | Incorrect or incomplete guidance                                                                                                 | Correction                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| README and installation     | Native prerequisites were incomplete; browser tests appeared to build `_site`; Lighthouse's Chrome dependency was omitted        | Linked complete setup and documented production build, Python servers, browser installation, `CHROME_PATH`, and the port-8080 conflict                 |
| Site customization          | Template CV/news/social behavior was described as active lab-site behavior; some paths did not exist                             | Replaced the template manual with the actual content map, language behavior, profile workflow, resources, and publication paths                        |
| Configuration               | `excludes` and `google-site-verification` were presented as configuration keys                                                   | Corrected to `exclude` and `google_site_verification`; retained the required `enable_google_verification` flag                                         |
| Scheduling                  | An old disabled workflow was said to move only same-day files and never catch up                                                 | Documented native Jekyll eligibility, daily Japan-time rebuild, overdue catch-up, retained source files, and invalid-date errors                       |
| Blog date                   | Issue help and Wiki treated article date as unrelated to publication                                                             | Explained display/URL date and future-date visibility, subject to successful deployment                                                                |
| Blog embeds and attachments | The X include was shown without warning that the issue parser rejects Liquid; automatic image localization sounded unconditional | Separated maintainer source edits from form input; documented download warnings, image budgets, author target, and duplicate-post risk on resubmission |
| Profile template and Wiki   | Template referred to `_i18n/en.yml`, `assets/images/people/`, and handle values that direct Markdown edits do not normalize      | Corrected paths and URL examples; documented matching, `CLEAR` exceptions, public visibility, and hidden alumni/future records                         |
| CI descriptions             | Unit-test-only and UI-test-only changes were conflated; all successful Link health runs sounded like scans                       | Documented path selection, artifact-less skips, accepted/excluded URLs, read-only link-check permissions, and Monday Japan-time full coverage          |
| Bot PR validation           | PR creation could be mistaken for site checks completing                                                                         | Added the current GitHub workflow-approval behavior and maintainer validation step                                                                     |
| Old troubleshooting         | Lighthouse Badger PAT setup, invalid HTTPS-to-SSH substitution, and full template replacement were recommended                   | Removed these recipes and linked supported local validation/upgrade procedures                                                                         |
| Apps Script                 | Repository source behavior and live deployment state were not clearly separated                                                  | Documented the unverified production revision, endpoint source, existing-project update path, and preservation of private state                        |
| Upgrade/history documents   | Historical migrations and queued tasks read like current instructions; risk/time-saving percentages lacked evidence              | Marked them as historical, removed unsupported numerical claims, and replaced an inaccessible local-plan reference with maintained guides              |
| cdskit Wiki                 | A copied manual used old option names and overstated cross-dataset accuracy comparisons                                          | Replaced the duplicate with current cdskit guide links and a short verified CLI example; retained the former page via its Wiki revision link           |
| Public request procedure    | The short-notice FAQ implied dates could always be accommodated                                                                  | Changed it to an inquiry subject to prior approval; retained the official institute's form, deadline, and contact guidance                             |

## Rendering issue found during validation

The focused accessibility run initially passed 10 of 12 cases and failed the
Japanese request page in desktop/mobile dark mode. Its form-type badges used
the theme accent as text on an accent-tinted background, producing insufficient
contrast. [The badge style](../assets/css/requests.css) now uses the theme's
normal text color. The request page was also missing from the default
[accessibility routes](../tests/ui/accessibility.spec.js); it is now covered in
desktop light/dark and mobile light/dark runs.

## Sources checked

Repository commands, field names, and behaviors were checked against
[package.json](../package.json), [configuration](../_config.yml),
[CI selection](../.github/scripts/classify_ci_changes.py), the
[workflows](../.github/workflows),
[blog generator](../.github/scripts/create_blog_post_from_issue.py),
[profile generator](../.github/scripts/create_profile_update_from_issue.py),
and the active layouts/plugins.

The GitHub API confirmed that the repository allows Actions to create PRs.
Recent successful blog/profile submission runs were present; no test issue,
comment, or email was sent. Approval behavior was checked against
[GitHub's current workflow-trigger documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).

The live cdskit Wiki prediction/model guides matched their versioned sources at
[6ed15d5](https://github.com/kfuku52/cdskit/tree/6ed15d57b9441b431403d377e51f8d2dd907379d).
The lab-site copy is now an entry point to those maintained guides. No cdskit
source was changed and no model training/performance experiment was run.

The public request page's deadline, short-term category, mailing address, and
submission contact were compared with the
[National Institute of Genetics guidance](https://www.nig.ac.jp/public/faculty-requests/).
This check does not determine whether an individual request will be approved.

## Validation and limits

- Checked 17 Markdown documents: 86 local references/anchors resolved. All 34
  external HTTP targets were reachable; the two issue-form URLs correctly
  redirected anonymous requests to GitHub sign-in. The localhost example
  returned HTTP 200 with Playwright's production server running.
- Parsed both issue forms and confirmed that field IDs, labels, types, choices,
  and required flags did not change. Profile-template front matter values are
  identical before and after the comment corrections.
- `npm run checks:push` passed: 64 Python, 14 JavaScript, and 16 Ruby tests, plus
  syntax, offline bibliography, image-budget, and repository formatting checks.
- The documented Compose production build and `npm run css:purge` passed.
  The corrected request wording was checked in generated Japanese HTML.
- After the contrast fix, all 12 focused accessibility cases passed for
  `/people/`, `/ja/people/`, and `/ja/requests/`, covering desktop light/dark and
  mobile light/dark. The check used installed Chrome through the documented
  executable-path override.

These are local results. Full browser and Lighthouse checks are reported by the
[Deploy workflow](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/actions/workflows/deploy.yml)
for the pushed revision. A fresh native environment was not installed during
this audit; the production build used the common Docker environment.
The Apps Script production project/version remains unverified because editor
access was not available. Private request data and mail delivery were not tested.
Historical site timings and cdskit accuracy figures were not reproduced.
