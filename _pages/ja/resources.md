---
page_id: resources
layout: resources
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

<div class="repositories repo-list-compact d-flex flex-column align-items-stretch">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
<div style="margin-top: 18px;"></div>
{% endif %}
  
## ゲノム

<p>NCBIの埋め込みAPIを使って各ゲノムの代表 scaffold を表示できます。</p>

<div class="ncbi-genome-embed">
  <h3>
    Cephalotus follicularis: BDDD01000001.1
    （<a href="https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_001972305.1/" target="_blank" rel="noopener noreferrer">NCBI Genome: GCA_001972305.1</a>
    / <a href="https://genomevolution.org/coge/GenomeInfo.pl?gid=29002" target="_blank" rel="noopener noreferrer">CoGe: 29002</a>
    / <a href="https://www.nature.com/articles/s41559-016-0059" target="_blank" rel="noopener noreferrer">Publication: Fukushima et al. (2017)</a>）
  </h3>
  <div class="ncbi-genome-actions">
    <button type="button" class="btn btn-sm z-depth-0 ncbi-genome-load-btn" data-ncbi-load="ncbi-sv-cephalotus">
      インタラクティブビューアを読み込む
    </button>
    <span class="ncbi-genome-status" data-ncbi-error hidden>ビューアを読み込めませんでした。上のNCBIリンクをご利用ください。</span>
  </div>
  <div id="ncbi-sv-cephalotus" class="SeqViewerApp" hidden>
    <a href="?embedded=true&id=BDDD01000001.1&assm_context=GCA_001972305.1&appname=kenji_fukushima_lab&noviewheader=true"></a>
  </div>
</div>

<div class="ncbi-genome-embed">
  <h3>
    Nepenthes gracilis: BSYO01000001.1
    （<a href="https://www.ncbi.nlm.nih.gov/datasets/genome/GCA_033239525.1/" target="_blank" rel="noopener noreferrer">NCBI Genome: GCA_033239525.1</a>
    / <a href="https://genomevolution.org/coge/GenomeInfo.pl?gid=61566" target="_blank" rel="noopener noreferrer">CoGe: 61566</a>
    / <a href="https://www.nature.com/articles/s41477-023-01562-2" target="_blank" rel="noopener noreferrer">Publication: Saul et al. (2023)</a>）
  </h3>
  <div class="ncbi-genome-actions">
    <button type="button" class="btn btn-sm z-depth-0 ncbi-genome-load-btn" data-ncbi-load="ncbi-sv-nepenthes">
      インタラクティブビューアを読み込む
    </button>
    <span class="ncbi-genome-status" data-ncbi-error hidden>ビューアを読み込めませんでした。上のNCBIリンクをご利用ください。</span>
  </div>
  <div id="ncbi-sv-nepenthes" class="SeqViewerApp" hidden>
    <a href="?embedded=true&id=BSYO01000001.1&assm_context=GCA_033239525.1&appname=kenji_fukushima_lab&noviewheader=true"></a>
  </div>
</div>

<div style="margin-top: 30px;"></div>
  
## 内部リソース

[kflab](https://github.com/kfuku52/kflab): 研究室のタスク管理のためのプライベートリポジトリです。ここでは、試薬管理から実験計画の議論、そして研究の進捗報告まで、メンバー間で様々な調整が行われます。新メンバーはGitHubアカウントを作成して、福島に招待を依頼してください。
