---
page_id: projects
layout: page
title: 研究内容
permalink: /projects/
description: 食虫植物を起点に、植物進化と収斂進化の研究テーマ、実験系、アプローチを紹介します。
seo_title: 研究内容 | 食虫植物・植物進化・収斂進化を研究する植物進化研究室
keywords: 食虫植物, 植物進化, 収斂進化, 遺伝研, 国立遺伝学研究所
schema_type: CollectionPage
nav: true
nav_order: 4
display_categories: [research] # [research, work, fun] This categories link /_data/en-us/strings.yml, categories:
horizontal: false
---

<!-- pages/projects.md -->
## 食虫植物・植物進化・収斂進化の研究内容

国立遺伝学研究所（遺伝研）の植物進化研究室では、食虫植物を起点に植物進化と収斂進化を研究しています。このページでは、研究テーマ、研究アプローチ、研究対象生物、そして遺伝研での研究環境をまとめて紹介します。

- [植物進化・収斂進化の研究テーマ](/ja/projects/1_project/)
- [植物進化研究のアプローチ](/ja/projects/2_project/)
- [食虫植物とモデル植物](/ja/projects/3_project/)
- [遺伝研の研究環境](/ja/projects/4_project/)

<div class="projects">
  {% if site.enable_project_categories and page.display_categories %}
    <!-- Display categorized projects -->
    {% for category in page.display_categories %}
      <a id="{{ site.data[site.active_lang].strings.categories[category] }}" href=".#{{ site.data[site.active_lang].strings.categories[category] }}">
        <h2 class="category">{{ site.data[site.active_lang].strings.categories[category] }}</h2>
      </a>
      {% assign categorized_projects = site.projects | where: "category", category %}
      {% assign sorted_projects = categorized_projects | sort: "importance" %}
      <!-- Generate cards for each project -->
      {% if page.horizontal %}
        <div class="container">
          <div class="row row-cols-1 row-cols-md-2">
            {% for project in sorted_projects %}
              {% include projects_horizontal.liquid %}
            {% endfor %}
          </div>
        </div>
      {% else %}
        <div class="row row-cols-1 row-cols-md-3">
          {% for project in sorted_projects %}
            {% include projects.liquid %}
          {% endfor %}
        </div>
      {% endif %}
    {% endfor %}
  {% else %}
    <!-- Display projects without categories -->
    {% assign sorted_projects = site.projects | sort: "importance" %}
    <!-- Generate cards for each project -->
    {% if page.horizontal %}
      <div class="container">
        <div class="row row-cols-1 row-cols-md-2">
          {% for project in sorted_projects %}
            {% include projects_horizontal.liquid %}
          {% endfor %}
        </div>
      </div>
    {% else %}
      <div class="row row-cols-1 row-cols-md-3">
        {% for project in sorted_projects %}
          {% include projects.liquid %}
        {% endfor %}
      </div>
    {% endif %}
  {% endif %}
</div>
