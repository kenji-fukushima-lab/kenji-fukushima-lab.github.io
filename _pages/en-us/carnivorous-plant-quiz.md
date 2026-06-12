---
page_id: carnivorous-plant-quiz
layout: page
permalink: /carnivorous-plant-quiz/
title: Carnivorous Plant Scientific Name Quiz
description: A multiple-choice quiz that asks you to identify carnivorous plant scientific names from iNaturalist photos.
seo_title: Carnivorous Plant Scientific Name Quiz | Fukushima Lab, National Institute of Genetics
nav: false
---

<link rel="stylesheet" href="{{ '/assets/css/carnivorous-plant-quiz.css' | relative_url | bust_file_cache }}">

<div class="cp-quiz-page" data-cp-quiz data-cp-quiz-lang="en">
  <section class="cp-quiz-intro">
    <p class="cp-quiz-eyebrow">Carnivorous Plant Quiz</p>
    <h2>Guess the scientific name from a photo</h2>
    <p>
      This quiz fetches random reusable-license photos from Research Grade iNaturalist observations.
      Target taxa are the extant carnivorous plant groups listed on Wikipedia's
      <a href="https://en.wikipedia.org/wiki/Carnivorous_plant" target="_blank" rel="noopener noreferrer">Carnivorous plant</a>
      page.
    </p>
  </section>

  <section class="cp-quiz-panel" aria-live="polite">
    <div class="cp-quiz-toolbar">
      <div>
        <p class="cp-quiz-kicker">10 questions</p>
        <h3>Multiple choice</h3>
      </div>
      <button class="cp-quiz-command" type="button" data-cp-start>
        <i class="fa-solid fa-play" aria-hidden="true"></i>
        <span>Start</span>
      </button>
    </div>

    <p class="cp-quiz-status" data-cp-status>
      Press start to load photos from the iNaturalist API.
    </p>

    <div class="cp-quiz-stage" data-cp-stage hidden>
      <div class="cp-quiz-progress">
        <span data-cp-progress>1 / 10</span>
        <span data-cp-score>Correct 0</span>
      </div>

      <figure class="cp-quiz-photo-frame" data-cp-photo-frame></figure>

      <div class="cp-quiz-attribution" data-cp-attribution></div>

      <div class="cp-quiz-choices" data-cp-choices aria-label="Scientific name options"></div>

      <div class="cp-quiz-feedback" data-cp-feedback></div>

      <button class="cp-quiz-command cp-quiz-next" type="button" data-cp-next hidden>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        <span>Next</span>
      </button>
    </div>

    <div class="cp-quiz-results" data-cp-results hidden>
      <p class="cp-quiz-kicker">Result</p>
      <h3 data-cp-result-heading>Accuracy 0%</h3>
      <p data-cp-result-copy></p>
      <div class="cp-quiz-result-actions">
        <button class="cp-quiz-command" type="button" data-cp-restart>
          <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
          <span>Try again</span>
        </button>
      </div>
      <div class="cp-quiz-share" aria-label="Share your result on social media">
        <p class="cp-quiz-share-title">Share your result</p>
        <textarea class="cp-quiz-share-text" data-cp-share-text rows="2" readonly aria-label="Post text"></textarea>
        <div class="cp-quiz-share-links">
          <a class="cp-quiz-share-link" href="#" target="_blank" rel="noopener noreferrer" data-cp-share-x>
            <i class="fa-brands fa-x-twitter" aria-hidden="true"></i>
            <span>X</span>
          </a>
          <a class="cp-quiz-share-link" href="#" target="_blank" rel="noopener noreferrer" data-cp-share-line>
            <i class="fa-brands fa-line" aria-hidden="true"></i>
            <span>LINE</span>
          </a>
          <button class="cp-quiz-share-link cp-quiz-facebook-share" type="button" data-cp-share-facebook>
            <i class="fa-brands fa-facebook-f" aria-hidden="true"></i>
            <span>Facebook</span>
          </button>
          <button class="cp-quiz-share-link cp-quiz-copy-share" type="button" data-cp-copy-share>
            <i class="fa-solid fa-copy" aria-hidden="true"></i>
            <span>Copy text</span>
          </button>
        </div>
      </div>
    </div>

    <noscript>
      <p class="cp-quiz-status">JavaScript is required to use this quiz.</p>
    </noscript>

  </section>
</div>
