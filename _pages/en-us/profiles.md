---
page_id: profiles
layout: profiles
permalink: /people/
title: people
description: Current lab members
nav: true
nav_order: 2
lang: en-us
position_order:
  - professor
  - associate_professor
  - assistant_professor
  - lecturer
  - tech_staff
  - lab_manager
  - postdoc
  - researcher
  - phd
  - master
  - intern
  - undergraduate
  - technician
  - secretary
  - staff
  - alumni
  - visiting
  - collaborator
  - other
  - future
---

{% for profile in site.profiles %}

  <div class="profile">
    <img src="{{ profile.image }}" alt="{{ profile.title }}">
    <h2>{{ profile.title }}</h2>
    <!-- Add other profile details here -->
  </div>
{% endfor %}

<!-- [changed] changed at 2025/5/14 to manage the profiles of laboratory members in a single database
profiles:
  # if you want to include more than one profile, just replicate the following block
  # and create one content file for each profile inside _pages/
  - align: left
    image: people/kenji_fukushima.jpg
    content: people_pages/kenji_fukushima.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/shunsuke_kanamori.jpg
    content: people_pages/shunsuke_kanamori.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/naoto_inui.jpg
    content: people_pages/naoto_inui.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/katsuhiro_yoneoka.jpg
    content: people_pages/katsuhiro_yoneoka.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/tomoya_nishiguchi.png
    content: people_pages/tomoya_nishiguchi.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/yuhan_guo.jpg
    content: people_pages/yuhan_guo.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/default.jpg
    content: people_pages/sayoko_shirai.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/default.jpg
    content: people_pages/yoshino_hashimoto.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/yusuke_asaka.jpg
    content: people_pages/yusuke_asaka.md
    image_circular: false # crops the image to make it circular

  - align: left
    image: people/sakiko_teramoto.jpg
    content: people_pages/sakiko_teramoto.md
    image_circular: false # crops the image to make it circular

---
-->
<!--profiles:
  # if you want to include more than one profile, just replicate the following block
  # and create one content file for each profile inside _pages/
  - align: left
    image: /assets/img/people/kenji_fukushima.jpg
    content: kenji_fukushima.md
    image_circular: false # crops the image to make it circular
    more_info: >
      <p>555 your office number</p>
      <p>123 your address street</p>
      <p>Your City, State 12345</p>
---
