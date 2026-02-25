---
page_id: outreach
layout: page
permalink: /outreach/
title: アウトリーチ
description:
nav: true
nav_order: 6
---

<link rel="stylesheet" href="/assets/css/access-outreach.css">

{% assign radio_archive_video_ids = site.data.outreach.radio_archive_latest_video_ids %}
{% assign youtube_domain = "https://www.youtube.com" %}
{% assign youtube_embed_prefix = "/embed/" %}

<div class="modern-page modern-outreach">
  <section class="modern-hero">
    <p class="modern-eyebrow">Outreach</p>
    <h2>アウトリーチ・社会連携</h2>
    <p>
      書籍、講演、メディア出演などの一部を掲載しています。活動一覧は researchmap に随時集約しています。
    </p>
    <div class="quick-links">
      <a class="quick-link" href="https://researchmap.jp/kenji_fukushima/social_contribution">アウトリーチ活動一覧（researchmap）</a>
    </div>
  </section>

  <section class="outreach-grid">
    <article class="modern-card">
      <h3>書籍</h3>
      <div class="book-feature">
        <a class="book-feature-cover" href="https://www.amazon.co.jp/dp/4000297104">
          <img src="/assets/img/book_covers/fukushima2022.jpg" alt="食虫植物：進化の迷宮をゆく">
        </a>
        <div class="book-feature-meta">
          <p>
            <em>食虫植物 進化の迷宮をゆく</em><br>
            （岩波科学ライブラリー 310、2022年）
          </p>
          <div class="quick-links">
            <a class="quick-link" href="https://www.amazon.co.jp/dp/4000297104">Amazon</a>
          </div>
        </div>
      </div>
    </article>

    <article class="modern-card">
      <h3>テレビ出演</h3>
      <p>
        NHK WORLD-JAPAN Science View: <em>The Mystery of Carnivorous Plant Evolution</em><br>
        2020年にヴュルツブルク大学で撮影された研究紹介映像が放送されました。
      </p>
    </article>

    <article class="modern-card">
      <h3>講演</h3>
      <div class="outreach-media">
        {% include video.liquid path="https://www.youtube.com/embed/diSNh5Ym_Dk?start=3883" class="outreach-video" %}
      </div>
    </article>

    <article class="modern-card">
      <h3>ラジオ出演</h3>
      <p>
        <a href="https://777fm.com/">ＦＭみしま・かんなみ（ボイス・キュー）</a> の番組「きゅんです！サイエンス」で研究を紹介しています。
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
        <a class="quick-link" href="https://www.youtube.com/@Iden-chan/search?query=%E7%A6%8F%E5%B3%B6%E5%81%A5%E5%85%90">ラジオ出演回アーカイブ</a>
      </div>
      <p class="outreach-note">最新3本を表示しています。</p>
    </article>

    <article class="modern-card">
      <h3>解説動画</h3>
      <p>
        ゆるふわ生物学チャンネルにて、研究内容や食虫植物モチーフのポケモンについて解説した動画です。
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
      <h3>インタビュー・その他</h3>
      <div class="feature-link-grid">
        <a class="feature-thumb-link" href="https://www.nig.ac.jp/nig/ja/research/interviews/faculty-interviews">
          <img src="/assets/img/people/kenji_fukushima.jpg" alt="国立遺伝学研究所 教員インタビュー">
          <span class="feature-thumb-text">国立遺伝学研究所 教員インタビュー</span>
        </a>
      </div>
    </article>

  </section>
</div>
