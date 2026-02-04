---
page_id: resources
layout: page
permalink: /resources/
title: resources
description: List of research resources developed by Fukushima lab
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

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
  
## Genomes

| Species                 | NCBI Genome                                                                      | CoGe (OrganismView for genome browser)                           | Publication                                                                |
| ----------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cephalotus follicularis | [GCA_001972305.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_001972305.1/) | [29002](https://genomevolution.org/coge/GenomeInfo.pl?gid=29002) | [Fukushima et al. (2017)](https://www.nature.com/articles/s41559-016-0059) |
| Nepenthes gracilis      | [GCA_033239525.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_033239525.1/) | [61566](https://genomevolution.org/coge/GenomeInfo.pl?gid=61566) | [Saul et al. (2023)](https://www.nature.com/articles/s41477-023-01562-2)   |

<div style="margin-top: 30px;"></div>
  
## Internal Resources

#### [kflab](https://github.com/kfuku52/kflab)

This repository is designed as the primary platform for coordinating laboratory activities within the Kenji Fukushima lab. Our focus here extends beyond programming code, encompassing a broad spectrum of discussions relevant to our research. These include logistics like lab supply management, strategic considerations in experimental design, and updates on research progress. New members should create a GitHub account and request an invitation from Kenji Fukushima.

#### [gfe_pipeline](https://github.com/kfuku52/gfe_pipeline)

**gfe_pipeline** is an in-house tool that was originally developed for analyzing **g**ene **f**amily **e**volution using an in-house [Apptainer/Singularity](https://apptainer.org/) container, **gfe**. Currently, gfe_pipeline has expanded to include many bioinformatics tools beyond gene family analysis. These include transcriptome assembly, gene annotation, species tree inference, SNV analysis, synteny analysis, and more. For example, a significant portion of the data presented in the studies by [Fukushima & Pollock (2020)](https://www.nature.com/articles/s41467-020-18090-8), [Fukushima & Pollock (2023)](https://www.nature.com/articles/s41559-022-01932-7), and [Saul et al. (2023)](https://www.nature.com/articles/s41477-023-01562-2) was generated using the gfe_pipeline. Lab members who wish to obtain access rights should make a request to Kenji Fukushima.
