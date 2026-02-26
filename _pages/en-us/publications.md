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

<!-- Bibsearch Feature -->

{% include bib_search.liquid %}

<div class="publications">

{% bibliography %}

</div>
