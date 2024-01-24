---
layout: page
title: titles.resources
description: descriptions.resources
permalink: /resources/
nav: true
nav_order: 5
---

## {% t resources.github_repos %}

{% if site.data.repositories.github_repos %}

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}

## {% t resources.genome %}

| Species                 | NCBI Genome                                                                      | CoGe (OrganismView for genome browser)                       | Publication                                                                |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Cephalotus follicularis | [GCA_001972305.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_001972305.1/) | [29002](https://genomevolution.org/coge/GenomeInfo.pl?gid=29002) | [Fukushima et al. (2017)](https://www.nature.com/articles/s41559-016-0059) |
| Nepenthes gracilis      | [GCA_033239525.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_033239525.1/) | [61566](https://genomevolution.org/coge/GenomeInfo.pl?gid=61566) | [Saul et al. (2023)](https://www.nature.com/articles/s41477-023-01562-2)   |

<div style="margin-top: 30px;"></div>

## {% t resources.internal %}

#### [kflab](https://github.com/kfuku52/kflab)

{% t resources.kflab %}

#### [gfe_pipeline](https://github.com/kfuku52/gfe_pipeline)

{% t resources.gfe_pipeline %}