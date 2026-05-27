---
page_id: publications
layout: page
permalink: /publications/
title: 論文
description: "国立遺伝学研究所 植物進化研究室から発表した論文を、最新のものから順にリストしています。研究室のメンバーとして論文に貢献した著者を太字で示しています。研究室のメンバーが筆頭あるいは責任著者を務める論文にはプレビュー画像を付しています。†: 共筆頭著者. *: (共)責任著者."
seo_title: 論文 | 国立遺伝学研究所 植物進化研究室
nav: true
nav_order: 3
chart:
  chartjs: true
---

<!-- _pages/publications.md -->
<link rel="stylesheet" href="{{ 'assets/css/publications.css' | relative_url }}">

{% include bib_search.liquid %}

<div class="publications">

{% bibliography %}

</div>
