---
layout: page
title: titles.repositories
description: descriptions.repositories
permalink: /repositories/
nav: true
nav_order: 5
---

## {% t repositories.repos %}

{% if site.data.repositories.github_repos %}

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
