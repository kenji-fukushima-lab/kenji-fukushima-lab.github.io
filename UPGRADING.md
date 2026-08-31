# Upgrading the lab site

For current dependency or theme updates, follow the
[development upgrade procedure](INSTALL.md#upgrading-from-a-previous-version)
and [validation guide](docs/WORKFLOWS.md). Review selected upstream changes
against this customized site, update manifests and locks together, and keep
runtime version files and Docker configuration consistent. Follow [AGENTS.md](AGENTS.md)
for branch and version-bump policy; template release numbers below are not this
repository's `VERSION` or npm package version.

## Historical Polyglot migration

The remainder records the upstream template's migration from the old `_i18n`
layout. This repository already uses Polyglot and `_data/<language>/strings.yml`.
Do not repeat the file moves or treat these historical examples as the current
source of truth; use [CUSTOMIZE.md](CUSTOMIZE.md) for the active layout.

The upstream migration followed the January 15, 2024 archival of [jekyll-multiple-languages-plugin](https://github.com/kurtsson/jekyll-multiple-languages-plugin). As discussed in [#17](https://github.com/george-gca/multi-language-al-folio/issues/17), the template replaced it with [jekyll-polyglot](https://github.com/untra/polyglot) in upstream version 1.11.0.

## Project changes

A few changes were made necessary by the switch to `polyglot`. More specifically:

- all usages of `site.lang` were replaced by `site.active_lang`, since this is how the `polyglot` plugin stores the active language
- moved `_i18n/` contents to their respective `LANG/` directories inside the `_news/`, `_pages/`, `_posts/`, and `_projects/` directories. E.g.: `_i18n/en-us/_pages/about.md` was moved to `_pages/en-us/about.md`
- a few modifications were made to the `_config.yml` file related to the `polyglot` plugin
- contents of the files `_i18n/LANG.yml` were moved to `_data/LANG/strings.yml`. Note that not all variables were moved. The rest of the variables were used directly in the pages contents

### Directory changes

[Previously](https://github.com/george-gca/multi-language-al-folio/tree/8f1528a4816aaf16e916791ae0f8cddbecf2416a) some pages were composed by a main page, like the [\_pages/about.md](https://github.com/george-gca/multi-language-al-folio/blob/8f1528a4816aaf16e916791ae0f8cddbecf2416a/_pages/about.md) page, and a translated subpage, like the [\_i18n/en-us/\_pages/about.md](https://github.com/george-gca/multi-language-al-folio/blob/8f1528a4816aaf16e916791ae0f8cddbecf2416a/_i18n/en-us/_pages/about.md). This structure was changed to a single page with all the content in the same file, one file for each language in [\_pages/LANG/](https://github.com/george-gca/multi-language-al-folio/tree/main/_pages/en-us). This change was made to simplify the structure of the theme and to make it easier to maintain. It also allows to have completely different pages for different languages if needed.

### Translated strings

Another change was the usage of translated strings in the pages. Before, the translated strings were used in the pages by using the `t` filter, like `{% t titles.about %}`, and these strings were defined inside [\_i18n/LANG.yml](https://github.com/george-gca/multi-language-al-folio/blob/8f1528a4816aaf16e916791ae0f8cddbecf2416a/_i18n/en-us.yml). Now, when possible, the translated strings are used directly in the pages for that language. When a string is used at the layout level, like in the [\_layouts/about.liquid](_layouts/about.liquid) file, we now have to call for the translated string inside [\_data/LANG/strings.yml](https://github.com/george-gca/multi-language-al-folio/blob/main/_data/en-us/strings.yml). What previously was:

```liquid
{% t main.contact_note %}
```

now is:

```liquid
{{ site.data[site.active_lang].strings.contact_note }}
```

### Other information

Due to the usage of the `polyglot` plugin, a lot of the previous workarounds were made unnecessary. For example, the `t` filter was used to translate the `page.title` and `page.description` variables in a lot of different files. Now, the values of these variables can be directly used. The same applies to some solutions regarding page redirects or assets usage. For example, in the file [\_layouts/archive-category.liquid](_layouts/archive-category.liquid), we had this piece of code:

```liquid
{% assign is_asset = post.redirect | startswith: '/assets/' %}
{% if is_asset %}
  <a class="post-link" href="{{ post.redirect | prepend: site.baseurl_root }}">{{ post.title }}</a>
{% else %}
  <a class="post-link" href="{{ post.redirect | prepend: site.baseurl }}">{{ post.title }}</a>
{% endif %}
```

Which was responsible to assess if the `post.redirect` was an asset or a page and to build the correct link considering the current language. Now, we can simply use:

```liquid
<a class="post-link" href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
```

since the `polyglot` plugin takes care of the language prefix in the URLs.
