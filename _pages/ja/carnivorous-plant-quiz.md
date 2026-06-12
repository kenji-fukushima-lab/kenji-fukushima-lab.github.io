---
page_id: carnivorous-plant-quiz
layout: page
permalink: /carnivorous-plant-quiz/
title: 食虫植物 学名クイズ
description: iNaturalistの写真を見て、食虫植物の学名を4択で当てるクイズです。
seo_title: 食虫植物 学名クイズ | 国立遺伝学研究所 植物進化研究室
nav: false
---

<link rel="stylesheet" href="{{ '/assets/css/carnivorous-plant-quiz.css' | relative_url | bust_file_cache }}">

<div class="cp-quiz-page" data-cp-quiz data-cp-quiz-lang="ja">
  <section class="cp-quiz-intro">
    <p class="cp-quiz-eyebrow">Carnivorous Plant Quiz</p>
    <h2>写真から学名を当てる</h2>
    <p>
      iNaturalistのResearch Grade観察から、再利用可能なライセンスの写真をランダムに取得します。
      出題対象はWikipediaの
      <a href="https://en.wikipedia.org/wiki/Carnivorous_plant" target="_blank" rel="noopener noreferrer">Carnivorous plant</a>
      に掲載されている現生の食虫植物分類群です。
    </p>
  </section>

  <section class="cp-quiz-panel" aria-live="polite">
    <div class="cp-quiz-toolbar">
      <div>
        <p class="cp-quiz-kicker">全10問</p>
        <h3>4択クイズ</h3>
      </div>
      <button class="cp-quiz-command" type="button" data-cp-start>
        <i class="fa-solid fa-play" aria-hidden="true"></i>
        <span>開始</span>
      </button>
    </div>

    <p class="cp-quiz-status" data-cp-status>
      開始するとiNaturalist APIから写真を読み込みます。
    </p>

    <div class="cp-quiz-stage" data-cp-stage hidden>
      <div class="cp-quiz-progress">
        <span data-cp-progress>1 / 10</span>
        <span data-cp-score>正解 0</span>
      </div>

      <figure class="cp-quiz-photo-frame">
        <img data-cp-photo src="" alt="">
      </figure>

      <div class="cp-quiz-attribution" data-cp-attribution></div>

      <div class="cp-quiz-choices" data-cp-choices aria-label="学名の選択肢"></div>

      <div class="cp-quiz-feedback" data-cp-feedback></div>

      <button class="cp-quiz-command cp-quiz-next" type="button" data-cp-next hidden>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        <span>次へ</span>
      </button>
    </div>

    <div class="cp-quiz-results" data-cp-results hidden>
      <p class="cp-quiz-kicker">結果</p>
      <h3 data-cp-result-heading>正答率 0%</h3>
      <p data-cp-result-copy></p>
      <div class="cp-quiz-result-actions">
        <button class="cp-quiz-command" type="button" data-cp-restart>
          <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
          <span>もう一度</span>
        </button>
      </div>
      <div class="cp-quiz-share" aria-label="結果をSNSに投稿">
        <p class="cp-quiz-share-title">結果を投稿する</p>
        <textarea class="cp-quiz-share-text" data-cp-share-text rows="2" readonly aria-label="投稿本文"></textarea>
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
            <span>本文をコピー</span>
          </button>
        </div>
      </div>
    </div>

    <noscript>
      <p class="cp-quiz-status">このクイズを利用するにはJavaScriptを有効にしてください。</p>
    </noscript>

  </section>
</div>
