---
page_id: research_networks
layout: resources
title: Research Networks
description: Interactive researcher and paper networks plus a publication word cloud built from Fukushima Lab publications.
permalink: /research/networks/
img: assets/img/projects/research_networks.svg
importance: 5
category: research
related_publications: false
seo_title: Research Networks | Fukushima Lab research
seo_description: Explore interactive researcher and paper networks, plus a publication word cloud built from Fukushima Lab publications.
keywords: researcher network, paper network, coauthor network, publication word cloud, publication network, Fukushima Lab, plant evolution
schema_type: WebPage
chart:
  d3: true
coauthor_network: true
paper_network: true
publication_word_cloud: true
---

This page compares publication-derived views of Fukushima Lab research: people as nodes, papers as nodes, and the recurring vocabulary in titles and abstracts.

<div class="network-comparison-grid">
  <section class="network-comparison-item">
    <span class="network-comparison-label">People as nodes</span>
    <h2>Researcher Network</h2>
    <p>Authors are connected by shared papers, foregrounding the collaboration structure behind the publication record.</p>
  </section>
  <section class="network-comparison-item">
    <span class="network-comparison-label">Papers as nodes</span>
    <h2>Paper Network</h2>
    <p>Papers are connected when they share coauthors, making recurring publication clusters visible from a different angle.</p>
  </section>
  <section class="network-comparison-item">
    <span class="network-comparison-label">Words as signals</span>
    <h2>Publication Word Cloud</h2>
    <p>Frequent terms from titles and abstracts show the topic layer that sits underneath both network views.</p>
  </section>
</div>

## Researcher Network

{% include coauthor_network_section.liquid lang='en' %}

<div style="margin-top: 30px;"></div>

## Paper Network

{% include paper_network_section.liquid lang='en' %}

<div style="margin-top: 30px;"></div>

## Publication Word Cloud

{% include publication_word_cloud_section.liquid lang='en' %}
