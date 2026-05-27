---
page_id: blog
layout: blog
permalink: /blog/
title: ブログ
blog_name: ブログ
description: 国立遺伝学研究所 植物進化研究室の活動記録やお知らせを掲載しています。
seo_title: ブログ | 国立遺伝学研究所 植物進化研究室
nav: true
nav_order: 7
seo_alternate_languages: ["ja"]
pagination:
  enabled: false
  collection: posts
  permalink: /page/:num/
  per_page: 20
  sort_field: date
  sort_reverse: true
  trail:
    before: 1 # The number of links before the current page
    after: 3 # The number of links after the current page
chart:
  chartjs: true
---

{% include blog/index.liquid %}
