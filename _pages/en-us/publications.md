---
page_id: publications
layout: page
permalink: /publications/
title: publications
description: "Publications from the Fukushima Lab. Authors who contributed as members of the Fukushima Lab are shown in bold. Preview images are attached to papers in which lab members are (co-)first or (co-)corresponding authors. †: co-first authors. *: (co-)corresponding authors."
seo_title: Publications | Plant Evolution Laboratory, National Institute of Genetics
seo_description: Peer-reviewed papers, preprints, datasets, and research software from the Fukushima Lab at the National Institute of Genetics, covering carnivorous plants, plant evolution, genomics, and convergent evolution.
schema_type: CollectionPage
nav: true
nav_order: 3
chart:
  chartjs: true
---

<!-- _pages/publications.md -->

<link rel="stylesheet" href="{{ 'assets/css/publications.css' | relative_url }}">
<link rel="stylesheet" href="{{ 'assets/css/publication-access.css' | relative_url }}">
<script defer src="{{ '/assets/js/publication-access.js' | relative_url | bust_file_cache }}"></script>

{% include publication_schema.liquid %}

<!-- Bibsearch Feature -->

{% include publication_access_request.liquid %}

{% include bib_search.liquid %}

<div class="publications" data-analytics-context="publications">

{% bibliography %}

</div>
