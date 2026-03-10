---
page_id: blog
layout: blog
permalink: /blog/
title: blog
blog_name: Blog
description: Lab updates and announcements available in English.
nav: false
sitemap: false
robots: "noindex, nofollow"
post_path_contains: "/en-us/"
pagination:
  enabled: false
  collection: posts
  permalink: /page/:num/
  per_page: 20
  sort_field: date
  sort_reverse: true
  trail:
    before: 1
    after: 3
chart:
  chartjs: true
---
{% include blog/index.liquid %}
