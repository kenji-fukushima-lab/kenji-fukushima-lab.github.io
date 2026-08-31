# Customizing the Fukushima Lab website

This is a customized lab site, not an unmodified al-folio installation. Edit
source files on `main` according to [AGENTS.md](AGENTS.md), or use the submission
forms below. The deployment workflow owns `gh-pages`; do not edit generated
files there or in `_site`. Only changes selected for a site build are deployed.

## Where content lives

```text
.
├── _config.yml                 Site URL, languages, collections, and plugins
├── _pages/en-us/               English pages
├── _pages/ja/                  Japanese pages
├── _projects/en-us/, ja/       Research project descriptions
├── _profiles/current_members/ Shared member records for both languages
├── _profiles/alumni/           Former member records
├── _profiles/template/         Profile template and recruitment placeholder
├── _posts/ja/                  Japanese blog posts
├── _scheduled/                Dated posts awaiting publication
├── _news/en-us/, ja/           Items for the separate news pages
├── _bibliography/papers.bib    Publications
├── _data/en-us/, ja/           Translated interface strings
├── _data/repositories.yml     Resource repository selection
├── assets/img/                Images, including people/ and posts/
├── assets/pdf/                Public PDFs and supplementary files
├── _layouts/, _includes/      Shared page rendering
├── _plugins/                  Build-time generators and filters
└── _sass/, assets/css/         Shared and page-specific styles
```

English (`en-us`) is the default language; Japanese (`ja`) uses `/ja/` URLs.
Polyglot can fall back to default-language content. Translate pages where both
versions are intended, and preserve `page_id`, `lang`, `lang-exclusive`, and
permalink conventions from comparable pages. Not every item needs a duplicate:
member records are shared, and the Japanese blog is the advertised blog. The
English blog page exists but is not in navigation and is marked `noindex`.

## Pages and research projects

Copy a comparable file from [\_pages](_pages) or [\_projects](_projects), then
update its front matter and content. Navigation uses `nav` and `nav_order`;
research entries are rendered under `/research/`. Check both language versions,
internal links, language switching, and search after changing a permalink.

Use [\_config.yml](_config.yml) for shared settings. The current public site has
`url: https://kenji-fukushima-lab.github.io` and an empty `baseurl`. The managed
server started by `npm run dev` or Compose restarts when `_config.yml` changes;
ordinary content changes rebuild through Jekyll's watcher. Wait for a successful
build before refreshing. Restart after changing plugins or dependencies.

Inherited CV and newsletter files/settings are not a guide to the lab's active
page structure. There is no current CV page. Adding `_news` entries updates the
separate news pages; the customized homepage does not include the template's
news or social-links block. Trace a setting to its layout before assuming it
changes a visible page.

## Member profiles

For an existing member, use the
[profile update form](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=2_profile_update.yml)
and [Wiki instructions](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/wiki/Profile-Update-Instructions).
The form creates a reviewable PR, not an immediate public update.

To add a member manually, copy [\_profiles/template/template.md](_profiles/template/template.md)
into `_profiles/current_members/` using a stable filename. Set the member's
`github` username for self-service updates and use full URLs for profile links
other than `github`. The issue automation normalizes supported IDs/handles;
editing Markdown directly does not run that normalization.

- Choose `position_key` from `positions` in both
  [\_data/en-us/strings.yml](_data/en-us/strings.yml) and
  [\_data/ja/strings.yml](_data/ja/strings.yml). The ordering is in each language's
  `profiles.md` page. New positions also require updating the form and its parser.
- Store photos in `assets/img/people/`; `image: people/name.jpg` is relative to
  `assets/img/`. Do not use the old `assets/images/people/` path.
- Non-template records with `position_key: future` are hidden from the current
  people list. Moving a record to `_profiles/alumni/` also removes it from that
  list; changing the position alone does not move the file.
- Keep the template record: it supplies the recruitment placeholder. Free-form
  profile body text is not rendered by the current people-card layout.

## Blog posts and scheduling

Use the [blog submission guide](docs/blog-submission.md) for the issue form,
image rules, and review process. Direct edits belong in `_posts/ja/` or
`_posts/en-us/`, with filenames such as `2026-08-31-lab-update.md` and valid YAML
front matter. English submissions are supported even though the English blog
is not currently advertised in navigation.

For scheduled content, use `_scheduled/ja/` or `_scheduled/en-us/` with the same
dated filename format. A future `date` delays publication in either `_posts`
or `_scheduled`; the next successful eligible build publishes it. The daily
build is scheduled for 08:30 Japan time, not guaranteed to start at that exact
time. Sources remain in `_scheduled`, and missed dates are caught up. See the
[full scheduling rules](docs/WORKFLOWS.md#scheduled-posts).

Drafts and future posts committed to this public repository are still public
source, even when absent from the generated site. Do not commit embargoed or
private material. `_drafts` is not included in the normal production build.

## Publications and resource links

Add publications to [\_bibliography/papers.bib](_bibliography/papers.bib), following
nearby entries. The configured ordering is newest first. The active rendering
and supported buttons are defined in [\_layouts/bib.liquid](_layouts/bib.liquid).

- A local `pdf`, `poster`, `slides`, or `supp` filename is resolved under
  `assets/pdf/`; a full URL links to that remote file. Only upload material that
  may be redistributed publicly. Restricted access uses the separate
  [publication-access service](automation/apps-script/publication-access-request/README.md).
- `abbr` metadata comes from [\_data/venues.yml](_data/venues.yml).
- `cofirst_authors` and `corresponding_authors` use names such as
  `Family, Given and Family, Given`; keep names consistent with the author list.
  Coauthor URLs and name aliases live in [\_data/coauthors.yml](_data/coauthors.yml)
  and [\_data/coauthor_aliases.yml](_data/coauthor_aliases.yml).
- Validate bibliography structure with `npm run checks:push`. The independent
  Link health workflow additionally checks external bibliography URLs.

Resource selection is in [\_data/repositories.yml](_data/repositories.yml), with
lab-specific descriptions in [\_data/repo_about.yml](_data/repo_about.yml).
The resources layout consumes cached statistics from `_data/repo_stats.json`;
trusted production builds refresh those statistics. Do not put API tokens in
these data files.

## Styles, images, and removing content

Theme variables are in [\_sass/\_themes.scss](_sass/_themes.scss) and
[\_sass/\_variables.scss](_sass/_variables.scss). Shared styles also live in
`_sass`; page styles live in `assets/css`. Check light/dark themes, mobile
layouts, keyboard access, and contrast when changing colors or spacing.
Build-time CSS processing creates the final stylesheets; see
[production checks](docs/WORKFLOWS.md#production-and-browser-checks).

Use the shared `figure.liquid` include or existing Markdown image conventions.
Responsive images are generated without upscaling; do not hand-edit `_site`
or derivative caches. Keep useful visuals inline and supply meaningful alt text.

Jekyll's exclusion key is `exclude`, not `excludes`. Add entries to the existing
list in `_config.yml` rather than replacing it. Exclusion only affects the built
site; it does not make tracked source private. When removing a page or feature,
update navigation, translations, links, generators, and route tests together.
Do not apply template-wide deletion recipes to the customized lab site.
