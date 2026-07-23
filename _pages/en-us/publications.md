---
page_id: publications
layout: page
permalink: /publications/
title: publications
description: "Publications from the Fukushima Lab. Authors who contributed as members of the Fukushima Lab are shown in bold. Preview images are attached to papers in which lab members are (co-)first or (co-)corresponding authors. †: co-first authors. *: (co-)corresponding authors."
nav: true
nav_order: 3
chart:
  chartjs: true
---

<!-- _pages/publications.md -->

<link rel="stylesheet" href="{{ 'assets/css/publications.css' | relative_url }}">
<link rel="stylesheet" href="{{ 'assets/css/publication-access.css' | relative_url }}">
<script defer src="{{ '/assets/js/publication-access.js' | relative_url | bust_file_cache }}"></script>

<!-- Bibsearch Feature -->

{% include publication_access_request.liquid %}

{% include bib_search.liquid %}

<div class="publications">

{% bibliography %}

</div>
