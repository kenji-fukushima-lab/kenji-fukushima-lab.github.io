---
page_id: resources
layout: resources
permalink: /resources/
title: resources
description: List of research resources developed by the Fukushima Lab
seo_title: Evolutionary Analysis Software and Carnivorous Plant Genomes | Fukushima Lab
seo_description: Research software including csubst, genegalleon, amalgkit, and locuskit, plus genome assemblies for carnivorous plants and their relatives from the Fukushima Lab.
schema_type: CollectionPage
nav: true
nav_order: 5
---

{% if site.data.repositories.github_users %}

## GitHub users

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for user in site.data.repositories.github_users %}
    {% include repository/repo_user.liquid username=user %}
  {% endfor %}
</div>

---

{% if site.repo_trophies.enabled %}
{% for user in site.data.repositories.github_users %}
{% if site.data.repositories.github_users.size > 1 %}

  <h4>{{ user }}</h4>
  {% endif %}
  <div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% include repository/repo_trophies.liquid username=user %}
  </div>

---

{% endfor %}
{% endif %}
{% endif %}

{% if site.data.repositories.github_repos %}

## GitHub Repositories

<div class="repo-stats-loader">
  <span
    data-repo-stats-status
    data-loading-label="Loading GitHub statistics…"
    data-loaded-label="GitHub statistics loaded."
    data-error-label="Some GitHub statistics could not be loaded."
    aria-live="polite"
  ></span>
</div>

<div class="repositories repo-list-compact d-flex flex-column align-items-stretch">
  {% assign sorted_repos = site.data.repositories.github_repos | sort_natural %}
  {% for repo in sorted_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
<div style="margin-top: 18px;"></div>
{% endif %}

## Scientific Name Quizzes

- [Carnivorous Plant Scientific Name Quiz]({{ '/carnivorous-plant-quiz/' | relative_url }}): A multiple-choice quiz that asks you to identify carnivorous plant scientific names from reusable iNaturalist photos.

## Genomes

<p>Each viewer displays a representative sequence from the assembly using NCBI Sequence Viewer.</p>

{% include genome-viewers.liquid %}

## Internal Resources

[kflab](https://github.com/kfuku52/kflab): This repository serves as the main platform for coordinating activities in the Kenji Fukushima Lab. It includes more than code: lab supply logistics, experimental-design discussions, and research-progress updates. New members should create a GitHub account and request an invitation from Kenji Fukushima.

## Related Websites

### NIG Badminton Club

This is the website of the NIG Badminton Club, managed by Kenji Fukushima in his role as faculty advisor. It provides practice schedules, attendance information, and details on how to join.

[NIG Badminton Club website](https://nig-badminton-club.github.io/)
