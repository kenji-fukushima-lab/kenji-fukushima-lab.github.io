---
page_id: blog
layout: blog
permalink: /blog/
title: ブログ
blog_name: ブログ
description: 研究室の活動記録やお知らせを掲載しています。
nav: true
nav_order: 7
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
