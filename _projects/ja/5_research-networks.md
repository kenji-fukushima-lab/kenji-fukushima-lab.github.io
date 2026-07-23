---
page_id: research_networks
layout: resources
title: 研究ネットワーク
description: 福島研の論文情報から生成した研究者ネットワーク、論文ネットワーク、論文ワードクラウドです。
permalink: /research/networks/
img: assets/img/projects/research_networks.svg
importance: 5
category: research
related_publications: false
seo_title: 研究ネットワーク | 国立遺伝学研究所 植物進化研究室
seo_description: 福島研の論文情報から生成したインタラクティブな研究者ネットワーク、論文ネットワーク、論文ワードクラウドです。
keywords: 研究者ネットワーク, 論文ネットワーク, 共著ネットワーク, 論文ワードクラウド, 福島研, 植物進化
schema_type: WebPage
chart:
  d3: true
coauthor_network: true
paper_network: true
publication_word_cloud: true
---

福島研の論文情報から、人をノードにした見方、論文をノードにした見方、タイトル・アブストラクトの語彙面を並べています。

<div class="network-comparison-grid">
  <section class="network-comparison-item">
    <span class="network-comparison-label">人がノード</span>
    <h2>研究者ネットワーク</h2>
    <p>著者どうしを共著論文で結び、publication record の背後にある共同研究構造を見ます。</p>
  </section>
  <section class="network-comparison-item">
    <span class="network-comparison-label">論文がノード</span>
    <h2>論文ネットワーク</h2>
    <p>共通著者をもつ論文どうしを結び、人ではなく成果物を単位にしたクラスターを見ます。</p>
  </section>
  <section class="network-comparison-item">
    <span class="network-comparison-label">語がシグナル</span>
    <h2>論文ワードクラウド</h2>
    <p>タイトル・アブストラクトの頻出語から、2つのネットワークの下にある研究トピックを見ます。</p>
  </section>
</div>

## 研究者ネットワーク

{% include coauthor_network_section.liquid lang='ja' %}

<div style="margin-top: 30px;"></div>

## 論文ネットワーク

{% include paper_network_section.liquid lang='ja' %}

<div style="margin-top: 30px;"></div>

## 論文ワードクラウド

{% include publication_word_cloud_section.liquid lang='ja' %}
