---
page_id: outreach
layout: page
permalink: /outreach/
title: アウトリーチ
description:
nav: true
nav_order: 6
---

#### 書籍

[食虫植物 進化の迷宮をゆく (岩波科学ライブラリー 310) 単行本 – 2022/3/16 福島 健児 (著)](https://www.amazon.co.jp/dp/4000297104)

<a href="https://www.amazon.co.jp/dp/4000297104">
    <img src="/assets/img/book_covers/fukushima2022.jpg" alt="食虫植物：進化の迷宮をゆく" width="100"/>
</a>

<div style="margin-top: 60px;"></div>

#### テレビ出演

NHK WORLD-JAPAN Science View: The Mystery of Carnivorous Plant Evolution  
2020年にヴュルツブルク大学にて撮影された研究紹介映像がNHK WORLD-JAPANにて放送されました。

<div style="margin-top: 60px;"></div>

#### 講演

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="https://www.youtube.com/embed/diSNh5Ym_Dk?start=3883" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

<div style="margin-top: 60px;"></div>

#### ラジオ出演

[ＦＭみしま・かんなみ（ボイス・キュー）](https://777fm.com/)のラジオ番組「きゅんです！サイエンス」で研究の話をしています。

{% assign radio_archive_video_ids = site.data.outreach.radio_archive_latest_video_ids %}
{% assign youtube_domain = "https://www.youtube.com" %}
{% assign youtube_embed_prefix = "/embed/" %}

[出演回のアーカイブ（最新３本を表示）](https://www.youtube.com/@Iden-chan/search?query=%E7%A6%8F%E5%B3%B6%E5%81%A5%E5%85%90)

<div class="row mt-3">
    {% for video_id in radio_archive_video_ids limit: 3 %}
        <div class="col-sm mt-3 mt-md-0">
            {% assign radio_embed_url = youtube_domain | append: youtube_embed_prefix | append: video_id %}
            {% include video.liquid path=radio_embed_url class="img-fluid rounded z-depth-1" %}
        </div>
    {% endfor %}
</div>

[出演回のアーカイブ](https://www.youtube.com/@Iden-chan/search?query=%E7%A6%8F%E5%B3%B6%E5%81%A5%E5%85%90)

<div style="margin-top: 60px;"></div>

#### 解説動画

ゆるふわ生物学チャンネルに呼んでいただいて、研究内容や食虫植物モチーフのポケモンについて解説した動画です。

<div class="row mt-3">
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="https://www.youtube.com/embed/bJcHKZ9alfc" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="https://www.youtube.com/embed/KZHpoL6-jkU" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include video.liquid path="https://www.youtube.com/embed/wThdW1qgELA" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

<div style="margin-top: 40px;"></div>

#### インタビュー

[国立遺伝学研究所 教員インタビュー](https://www.nig.ac.jp/nig/ja/research/interviews/faculty-interviews)

<div style="margin-top: 40px;"></div>

#### その他

[こちら](https://researchmap.jp/kenji_fukushima/social_contribution)に過去のアウトリーチ活動をリストしています。
