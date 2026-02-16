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

<div class="repositories repo-list-compact d-flex flex-column align-items-stretch">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
<div style="margin-top: 18px;"></div>
{% endif %}
  
## Genomes

<p>The embedded viewers below use NCBI's official API and show representative scaffolds for each assembly (initial loading may take a few seconds).</p>

<script src="https://www.ncbi.nlm.nih.gov/projects/sviewer/js/sviewer.js" id="autoload"></script>

<div class="ncbi-genome-embed">
  <h4>
    Cephalotus follicularis
    (<a href="https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_001972305.1/" target="_blank" rel="noopener noreferrer">NCBI</a>
    / <a href="https://genomevolution.org/coge/GenomeInfo.pl?gid=29002" target="_blank" rel="noopener noreferrer">CoGe</a>
    / <a href="https://www.nature.com/articles/s41559-016-0059" target="_blank" rel="noopener noreferrer">Publication</a>)
  </h4>
  <div id="ncbi-sv-cephalotus" class="SeqViewerApp" data-autoload>
    <a href="?embedded=true&id=BDDD01000001.1&assm_context=GCA_001972305.1&appname=kenji_fukushima_lab&noviewheader=true"></a>
  </div>
</div>

<div class="ncbi-genome-embed">
  <h4>
    Nepenthes gracilis
    (<a href="https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_033239525.1/" target="_blank" rel="noopener noreferrer">NCBI</a>
    / <a href="https://genomevolution.org/coge/GenomeInfo.pl?gid=61566" target="_blank" rel="noopener noreferrer">CoGe</a>
    / <a href="https://www.nature.com/articles/s41477-023-01562-2" target="_blank" rel="noopener noreferrer">Publication</a>)
  </h4>
  <div id="ncbi-sv-nepenthes" class="SeqViewerApp" data-autoload>
    <a href="?embedded=true&id=BSYO01000001.1&assm_context=GCA_033239525.1&appname=kenji_fukushima_lab&noviewheader=true"></a>
  </div>
</div>

<div style="margin-top: 30px;"></div>
  
## Internal Resources

#### [kflab](https://github.com/kfuku52/kflab)

This repository is designed as the primary platform for coordinating laboratory activities within the Kenji Fukushima lab. Our focus here extends beyond programming code, encompassing a broad spectrum of discussions relevant to our research. These include logistics like lab supply management, strategic considerations in experimental design, and updates on research progress. New members should create a GitHub account and request an invitation from Kenji Fukushima.

#### [gfe_pipeline](https://github.com/kfuku52/gfe_pipeline)

**gfe_pipeline** is an in-house tool that was originally developed for analyzing **g**ene **f**amily **e**volution using an in-house [Apptainer/Singularity](https://apptainer.org/) container, **gfe**. Currently, gfe_pipeline has expanded to include many bioinformatics tools beyond gene family analysis. These include transcriptome assembly, gene annotation, species tree inference, SNV analysis, synteny analysis, and more. For example, a significant portion of the data presented in the studies by [Fukushima & Pollock (2020)](https://www.nature.com/articles/s41467-020-18090-8), [Fukushima & Pollock (2023)](https://www.nature.com/articles/s41559-022-01932-7), and [Saul et al. (2023)](https://www.nature.com/articles/s41477-023-01562-2) was generated using the gfe_pipeline. Lab members who wish to obtain access rights should make a request to Kenji Fukushima.
