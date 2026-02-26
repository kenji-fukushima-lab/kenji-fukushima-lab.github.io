---
page_id: outreach
layout: page
permalink: /outreach/
title: outreach
description:
nav: false
nav_order: 6
---

<link rel="stylesheet" href="/assets/css/access-outreach.css">

{% assign radio_archive_video_ids = site.data.outreach.radio_archive_latest_video_ids %}
{% assign youtube_domain = "https://www.youtube.com" %}
{% assign youtube_embed_prefix = "/embed/" %}

<div class="modern-page modern-outreach">
  <section class="modern-hero">
    <p class="modern-eyebrow">Outreach</p>
    <h2>Public Communication and Media Activities</h2>
    <p>
      This page highlights selected talks, media appearances, and educational content from our lab.
      A full archive is maintained on Researchmap.
    </p>
    <div class="quick-links">
      <a class="quick-link" href="https://researchmap.jp/kenji_fukushima/social_contribution?lang=en">Full outreach archive</a>
    </div>
  </section>

  <section class="outreach-grid">
    <article class="modern-card">
      <h3>Book</h3>
      <div class="book-feature">
        <a class="book-feature-cover" href="https://www.amazon.co.jp/dp/4000297104">
          <img src="/assets/img/book_covers/fukushima2022.jpg" alt="Carnivorous Plants: Through the Evolutionary Labyrinth">
        </a>
        <div class="book-feature-meta">
          <p><em>Carnivorous Plants: Through the Evolutionary Labyrinth</em> (Iwanami Science Library 310, 2022)</p>
          <div class="quick-links">
            <a class="quick-link" href="https://www.amazon.co.jp/dp/4000297104">Amazon</a>
          </div>
        </div>
      </div>
    </article>

    <article class="modern-card">
      <h3>TV Appearance</h3>
      <p>
        NHK WORLD-JAPAN Science View: <em>The Mystery of Carnivorous Plant Evolution</em>.
        A research feature filmed at the University of Würzburg in 2020.
      </p>
    </article>

    <article class="modern-card">
      <h3>Featured Lecture</h3>
      <div class="outreach-media">
        {% include video.liquid path="https://www.youtube.com/embed/diSNh5Ym_Dk?start=3883" class="outreach-video" %}
      </div>
    </article>

    <article class="modern-card">
      <h3>Radio Program</h3>
      <p>
        We discuss research topics in the FM Mishima-Kannami (Voice Cue) program
        <em>Kyun desu! Science</em>.
      </p>
      <div class="outreach-video-grid">
        {% for video_id in radio_archive_video_ids limit: 3 %}
          <div class="outreach-media">
            {% assign radio_embed_url = youtube_domain | append: youtube_embed_prefix | append: video_id %}
            {% include video.liquid path=radio_embed_url class="outreach-video" %}
          </div>
        {% endfor %}
      </div>
      <div class="quick-links">
        <a class="quick-link" href="https://www.youtube.com/@Iden-chan/search?query=%E7%A6%8F%E5%B3%B6%E5%81%A5%E5%85%90">Radio archive</a>
      </div>
      <p class="outreach-note">
        The latest three episodes are shown above.
      </p>
    </article>

    <article class="modern-card">
      <h3>Explainer Videos</h3>
      <p>
        Invited videos on Yuru Fuwa Biology Channel covering our research and carnivorous-plant-inspired Pokémon.
      </p>
      <div class="outreach-video-grid">
        <div class="outreach-media">
          {% include video.liquid path="https://www.youtube.com/embed/bJcHKZ9alfc" class="outreach-video" %}
        </div>
        <div class="outreach-media">
          {% include video.liquid path="https://www.youtube.com/embed/KZHpoL6-jkU" class="outreach-video" %}
        </div>
        <div class="outreach-media">
          {% include video.liquid path="https://www.youtube.com/embed/wThdW1qgELA" class="outreach-video" %}
        </div>
      </div>
    </article>

    <article class="modern-card">
      <h3>Interviews and More</h3>
      <div class="feature-link-grid">
        <a class="feature-thumb-link" href="https://www.nig.ac.jp/nig/ja/research/interviews/faculty-interviews">
          <img src="/assets/img/people/kenji_fukushima.jpg" alt="NIG faculty interview">
          <span class="feature-thumb-text">NIG faculty interview</span>
        </a>
      </div>
      <div class="quick-links">
        <a class="quick-link" href="https://researchmap.jp/kenji_fukushima/social_contribution?lang=en">Researchmap archive</a>
      </div>
    </article>

  </section>
</div>
