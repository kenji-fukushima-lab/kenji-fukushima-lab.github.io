---
page_id: resources
layout: page
permalink: /resources/
title: resources
description: List of research resources developed by the Fukushima Lab
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

<p>The viewers below use NCBI's official API to display representative scaffolds for each assembly.</p>

<div class="ncbi-genome-embed">
  <h4>
    Cephalotus follicularis
    (<a href="https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_001972305.1/" target="_blank" rel="noopener noreferrer">NCBI</a>
    / <a href="https://genomevolution.org/coge/GenomeInfo.pl?gid=29002" target="_blank" rel="noopener noreferrer">CoGe</a>
    / <a href="https://www.nature.com/articles/s41559-016-0059" target="_blank" rel="noopener noreferrer">Publication</a>)
  </h4>
  <div class="ncbi-genome-actions">
    <button type="button" class="btn btn-sm z-depth-0 ncbi-genome-load-btn" data-ncbi-load="ncbi-sv-cephalotus">
      Load interactive viewer
    </button>
    <span class="ncbi-genome-status" data-ncbi-error hidden>Viewer could not be loaded. Please use the NCBI link above.</span>
  </div>
  <div id="ncbi-sv-cephalotus" class="SeqViewerApp" hidden>
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
  <div class="ncbi-genome-actions">
    <button type="button" class="btn btn-sm z-depth-0 ncbi-genome-load-btn" data-ncbi-load="ncbi-sv-nepenthes">
      Load interactive viewer
    </button>
    <span class="ncbi-genome-status" data-ncbi-error hidden>Viewer could not be loaded. Please use the NCBI link above.</span>
  </div>
  <div id="ncbi-sv-nepenthes" class="SeqViewerApp" hidden>
    <a href="?embedded=true&id=BSYO01000001.1&assm_context=GCA_033239525.1&appname=kenji_fukushima_lab&noviewheader=true"></a>
  </div>
</div>

<div style="margin-top: 30px;"></div>
  
## Internal Resources

#### [kflab](https://github.com/kfuku52/kflab)

This repository serves as the main platform for coordinating activities in the Kenji Fukushima Lab. It includes more than code: lab supply logistics, experimental-design discussions, and research-progress updates. New members should create a GitHub account and request an invitation from Kenji Fukushima.
