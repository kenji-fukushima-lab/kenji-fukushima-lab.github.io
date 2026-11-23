---
page_id: resources
layout: resources
permalink: /resources/
title: リソース
description: 国立遺伝学研究所 植物進化研究室で提供している研究リソースの一覧です。
seo_title: 進化解析ソフトウェア・食虫植物ゲノム | 国立遺伝学研究所 植物進化研究室
seo_description: csubst、genegalleon、amalgkit、locuskitなどの進化・ゲノム解析ソフトウェアと、食虫植物およびその近縁種のゲノムアセンブリを掲載しています。
keywords: csubst, genegalleon, amalgkit, locuskit, 食虫植物ゲノム, 収斂進化, ゲノム解析, バイオインフォマティクス
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

## GitHub リポジトリ

<div class="repo-stats-loader">
  <span
    data-repo-stats-status
    data-loading-label="GitHub統計を読み込み中…"
    data-loaded-label="GitHub統計を読み込みました。"
    data-error-label="一部のGitHub統計を読み込めませんでした。"
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

## 学名クイズ

- [食虫植物 学名クイズ]({{ '/carnivorous-plant-quiz/' | relative_url }}): iNaturalistの再利用可能な写真を見ながら、食虫植物の学名を4択で当てるクイズです。

## ゲノム

<p>各アセンブリの代表配列をNCBI Sequence Viewerで表示できます。</p>

{% include genome-viewers.liquid %}

## 内部リソース

[kflab](https://github.com/kfuku52/kflab): 研究室のタスク管理のためのプライベートリポジトリです。ここでは、試薬管理から実験計画の議論、そして研究の進捗報告まで、メンバー間で様々な調整が行われます。新メンバーはGitHubアカウントを作成して、福島に招待を依頼してください。

## 関連ウェブサイト

### 遺伝研バドミントン部

福島が顧問として管理している遺伝研バドミントン部のウェブサイトです。練習予定、出欠状況、参加方法を掲載しています。

[遺伝研バドミントン部ウェブサイト](https://nig-badminton-club.github.io/)
