---
page_id: projects
layout: page
title: Research
permalink: /projects/
description: Research themes, study systems, and approaches for carnivorous plants, plant evolution, and convergent evolution.
seo_title: Research | Carnivorous plants, plant evolution, and convergent evolution
keywords: carnivorous plants, plant evolution, convergent evolution, National Institute of Genetics, NIG
schema_type: CollectionPage
nav: true
nav_order: 4
display_categories: [research] # [research, work, fun] This categories link /_data/en-us/strings.yml, categories:
horizontal: false
---

<!-- pages/projects.md -->
## Research on carnivorous plants, plant evolution, and convergent evolution

At the Plant Evolution Laboratory of the National Institute of Genetics (NIG), we use carnivorous plants to study plant evolution and convergent evolution. This page brings together our core research questions, methods, study organisms, and research environment.

- [Plant evolution and convergent evolution](/projects/1_project/)
- [Approaches to plant evolution research](/projects/2_project/)
- [Carnivorous plants and model plants](/projects/3_project/)
- [Research environment at NIG](/projects/4_project/)

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
