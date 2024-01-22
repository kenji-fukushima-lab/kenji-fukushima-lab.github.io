---
layout: profiles
permalink: /people/
title: titles.profiles
description: descriptions.profiles
nav: true
nav_order: 2
position_order:
  - professor
  - associate_professor
  - assistant_professor
  - lecturer
  - secretary
  - lab_manager
  - postdoc
  - phd
  - master
  - intern
  - undergraduate
  - technician
  - tech_staff
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