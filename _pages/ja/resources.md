---
page_id: resources
layout: page
permalink: /resources/
title: リソース
description: 当研究室で提供している研究リソースの一覧です。
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

## GitHub リポジトリ

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
  
## ゲノム

| Species                 | NCBI Genome                                                                      | CoGe (OrganismView for genome browser)                           | Publication                                                                |
| ----------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Cephalotus follicularis | [GCA_001972305.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_001972305.1/) | [29002](https://genomevolution.org/coge/GenomeInfo.pl?gid=29002) | [Fukushima et al. (2017)](https://www.nature.com/articles/s41559-016-0059) |
| Nepenthes gracilis      | [GCA_033239525.1](https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_033239525.1/) | [61566](https://genomevolution.org/coge/GenomeInfo.pl?gid=61566) | [Saul et al. (2023)](https://www.nature.com/articles/s41477-023-01562-2)   |

<div style="margin-top: 30px;"></div>
  
## 内部リソース

#### [kflab](https://github.com/kfuku52/kflab)

研究室のタスク管理のためのプライベートリポジトリです。ここでは、試薬管理から実験計画の議論、そして研究の進捗報告まで、メンバー間で様々な調整が行われます。新メンバーはGitHubアカウントを作成して、福島に招待を依頼してください。

#### [gfe_pipeline](https://github.com/kfuku52/gfe_pipeline)

この内製ツールはもともと、Apptainer/Singularityコンテナを使用して遺伝子族進化(gene family evolution)の解析のために開発しました。現在では、遺伝子族の解析にとどまらず、トランスクリプトームアセンブリー、遺伝子アノテーション、種系統樹推定、SNV分析、シンテニー分析など、多くのバイオインフォマティクスツールを含むよう拡張されています。例えば、[Fukushima and Pollock (2020)](https://www.nature.com/articles/s41467-020-18090-8)、[Fukushima and Pollock (2023)](https://www.nature.com/articles/s41559-022-01932-7)、[Saul et al. (2023)](https://www.nature.com/articles/s41477-023-01562-2)で示したデータの大部分はgfe_pipelineを利用して生成しました。利用にはコマンドライン操作が必要です。アクセスを希望するラボメンバーは福島に申し出てください。
