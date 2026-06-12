(function () {
  const API_ENDPOINT = "https://api.inaturalist.org/v1/observations";
  const QUESTION_COUNT = 10;
  const INITIAL_READY_QUESTIONS = 2;
  const TAXON_REQUEST_SIZE = 24;
  const FALLBACK_REQUEST_SIZE = 120;
  const IMAGE_PRELOAD_AHEAD = 2;
  const REQUEST_DELAY_MS = 1050;

  const LICENSES = ["cc0", "cc-by", "cc-by-sa"];
  const LICENSE_LABELS = {
    cc0: "CC0",
    "cc-by": "CC BY",
    "cc-by-sa": "CC BY-SA",
  };
  const LICENSE_URLS = {
    cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
    "cc-by": "https://creativecommons.org/licenses/by/4.0/",
    "cc-by-sa": "https://creativecommons.org/licenses/by-sa/4.0/",
  };
  const UI_TEXT = {
    ja: {
      attribution: '写真: {attribution} / {licenseLink} / <a href="{observationUrl}" target="_blank" rel="noopener noreferrer">iNaturalistリンク</a>',
      copyFailed: "本文をコピーできませんでした。",
      copyLabel: "本文をコピー",
      copiedLabel: "コピー済み",
      correctFeedback: "正解です: {name}",
      errorAdditionalLoad: "写真の追加読み込みに失敗しました。",
      errorLoad: "写真を読み込めませんでした。時間をおいてもう一度お試しください。",
      errorNotEnough: "クイズに必要な写真数を取得できませんでした。",
      facebookPasteHint: "本文を選択しました。Facebookの投稿欄に貼り付けてください。",
      loadNext: "次の写真を読み込んでいます。",
      loading: "写真を読み込んでいます。",
      loadingCount: "写真を読み込んでいます（{loaded} / {total}）。",
      loadingLabel: "読み込み中",
      next: "次へ",
      photoAlt: "食虫植物のiNaturalist観察写真",
      ready: "選択肢から学名を選んでください。",
      resultCopy: "{total}問中{correct}問正解しました。",
      resultHeading: "正答率 {percentage}%",
      resultStatus: "クイズが終了しました。",
      score: "正解 {correct}",
      shareText: "食虫植物 学名クイズで{total}問中{correct}問正解しました（正答率{percentage}%）。",
      showResults: "結果を見る",
      startLabel: "開始",
      unableToPrepare: "写真を10問分用意できませんでした。",
      wrongFeedback: "不正解です。正解は {name}",
    },
    en: {
      attribution: 'Photo: {attribution} / {licenseLink} / <a href="{observationUrl}" target="_blank" rel="noopener noreferrer">iNaturalist link</a>',
      copyFailed: "Could not copy the post text.",
      copyLabel: "Copy text",
      copiedLabel: "Copied",
      correctFeedback: "Correct: {name}",
      errorAdditionalLoad: "Could not load additional photos.",
      errorLoad: "Could not load photos. Please try again later.",
      errorNotEnough: "Could not fetch enough photos for the quiz.",
      facebookPasteHint: "The text is selected. Paste it into the Facebook post field.",
      loadNext: "Loading the next photo.",
      loading: "Loading photos.",
      loadingCount: "Loading photos ({loaded} / {total}).",
      loadingLabel: "Loading",
      next: "Next",
      photoAlt: "iNaturalist observation photo of a carnivorous plant",
      ready: "Choose the scientific name from the options.",
      resultCopy: "{correct} out of {total} correct.",
      resultHeading: "Accuracy {percentage}%",
      resultStatus: "Quiz complete.",
      score: "Correct {correct}",
      shareText: "I scored {correct} out of {total} on the Carnivorous Plant Scientific Name Quiz ({percentage}% correct).",
      showResults: "Show result",
      startLabel: "Start",
      unableToPrepare: "Could not prepare all 10 photos.",
      wrongFeedback: "Incorrect. The correct answer is {name}",
    },
  };

  const TARGET_TAXA = [
    {
      label: "Aldrovanda",
      taxonIds: [123278],
      genus: "Aldrovanda",
      family: "Droseraceae",
      familyTaxonId: 51937,
    },
    {
      label: "Brocchinia",
      taxonIds: [597454, 845660],
      genus: "Brocchinia",
      family: "Bromeliaceae",
      familyTaxonId: 49570,
    },
    {
      label: "Byblis",
      taxonIds: [123289],
      genus: "Byblis",
      family: "Byblidaceae",
      familyTaxonId: 71462,
    },
    {
      label: "Catopsis",
      taxonIds: [160238],
      genus: "Catopsis",
      family: "Bromeliaceae",
      familyTaxonId: 49570,
    },
    {
      label: "Cephalotus",
      taxonIds: [148273],
      genus: "Cephalotus",
      family: "Cephalotaceae",
      familyTaxonId: 71473,
    },
    {
      label: "Darlingtonia",
      taxonIds: [52652],
      genus: "Darlingtonia",
      family: "Sarraceniaceae",
      familyTaxonId: 52649,
    },
    {
      label: "Dionaea",
      taxonIds: [52666],
      genus: "Dionaea",
      family: "Droseraceae",
      familyTaxonId: 51937,
    },
    {
      label: "Drosera",
      taxonIds: [51935],
      genus: "Drosera",
      family: "Droseraceae",
      familyTaxonId: 51937,
    },
    {
      label: "Drosophyllum",
      taxonIds: [123288],
      genus: "Drosophyllum",
      family: "Drosophyllaceae",
      familyTaxonId: 71505,
    },
    {
      label: "Genlisea",
      taxonIds: [123277],
      genus: "Genlisea",
      family: "Lentibulariaceae",
      familyTaxonId: 57860,
    },
    {
      label: "Heliamphora",
      taxonIds: [62281],
      genus: "Heliamphora",
      family: "Sarraceniaceae",
      familyTaxonId: 52649,
    },
    {
      label: "Nepenthes",
      taxonIds: [52646],
      genus: "Nepenthes",
      family: "Nepenthaceae",
      familyTaxonId: 52647,
    },
    {
      label: "Philcoxia",
      taxonIds: [317898],
      genus: "Philcoxia",
      family: "Plantaginaceae",
      familyTaxonId: 50638,
    },
    {
      label: "Pinguicula",
      taxonIds: [72300],
      genus: "Pinguicula",
      family: "Lentibulariaceae",
      familyTaxonId: 57860,
    },
    {
      label: "Roridula",
      taxonIds: [566316],
      genus: "Roridula",
      family: "Roridulaceae",
      familyTaxonId: 71613,
    },
    {
      label: "Sarracenia",
      taxonIds: [52650],
      genus: "Sarracenia",
      family: "Sarraceniaceae",
      familyTaxonId: 52649,
    },
    {
      label: "Triantha",
      taxonIds: [79389],
      genus: "Triantha",
      family: "Tofieldiaceae",
      familyTaxonId: 71426,
    },
    {
      label: "Triphyophyllum",
      taxonIds: [317889],
      genus: "Triphyophyllum",
      family: "Dioncophyllaceae",
      familyTaxonId: 71500,
    },
    {
      label: "Utricularia",
      taxonIds: [57861],
      genus: "Utricularia",
      family: "Lentibulariaceae",
      familyTaxonId: 57860,
    },
  ];

  const CURATED_CHOICE_NAMES = [
    choice("Aldrovanda vesiculosa", "Droseraceae"),
    choice("Dionaea muscipula", "Droseraceae"),
    choice("Drosera anglica", "Droseraceae"),
    choice("Drosera auriculata", "Droseraceae"),
    choice("Drosera brevifolia", "Droseraceae"),
    choice("Drosera capensis", "Droseraceae"),
    choice("Drosera capillaris", "Droseraceae"),
    choice("Drosera intermedia", "Droseraceae"),
    choice("Drosera rotundifolia", "Droseraceae"),
    choice("Drosera spatulata", "Droseraceae"),

    choice("Brocchinia acuminata", "Bromeliaceae"),
    choice("Brocchinia amazonica", "Bromeliaceae"),
    choice("Brocchinia hechtioides", "Bromeliaceae"),
    choice("Brocchinia micrantha", "Bromeliaceae"),
    choice("Brocchinia reducta", "Bromeliaceae"),
    choice("Brocchinia steyermarkii", "Bromeliaceae"),
    choice("Brocchinia tatei", "Bromeliaceae"),
    choice("Catopsis berteroniana", "Bromeliaceae"),
    choice("Catopsis floribunda", "Bromeliaceae"),
    choice("Catopsis nutans", "Bromeliaceae"),
    choice("Catopsis paniculata", "Bromeliaceae"),
    choice("Catopsis sessiliflora", "Bromeliaceae"),

    choice("Byblis aquatica", "Byblidaceae"),
    choice("Byblis filifolia", "Byblidaceae"),
    choice("Byblis gigantea", "Byblidaceae"),
    choice("Byblis lamellata", "Byblidaceae"),
    choice("Byblis liniflora", "Byblidaceae"),
    choice("Byblis rorida", "Byblidaceae"),

    choice("Cephalotus follicularis", "Cephalotaceae"),

    choice("Drosophyllum lusitanicum", "Drosophyllaceae"),

    choice("Genlisea africana", "Lentibulariaceae"),
    choice("Genlisea aurea", "Lentibulariaceae"),
    choice("Genlisea filiformis", "Lentibulariaceae"),
    choice("Genlisea hispidula", "Lentibulariaceae"),
    choice("Genlisea oxycentron", "Lentibulariaceae"),
    choice("Genlisea pallida", "Lentibulariaceae"),
    choice("Genlisea violacea", "Lentibulariaceae"),
    choice("Pinguicula alpina", "Lentibulariaceae"),
    choice("Pinguicula caerulea", "Lentibulariaceae"),
    choice("Pinguicula grandiflora", "Lentibulariaceae"),
    choice("Pinguicula lutea", "Lentibulariaceae"),
    choice("Pinguicula macroceras", "Lentibulariaceae"),
    choice("Pinguicula moranensis", "Lentibulariaceae"),
    choice("Pinguicula vulgaris", "Lentibulariaceae"),
    choice("Utricularia cornuta", "Lentibulariaceae"),
    choice("Utricularia foliosa", "Lentibulariaceae"),
    choice("Utricularia gibba", "Lentibulariaceae"),
    choice("Utricularia inflata", "Lentibulariaceae"),
    choice("Utricularia intermedia", "Lentibulariaceae"),
    choice("Utricularia macrorhiza", "Lentibulariaceae"),
    choice("Utricularia purpurea", "Lentibulariaceae"),
    choice("Utricularia subulata", "Lentibulariaceae"),

    choice("Heliamphora heterodoxa", "Sarraceniaceae"),
    choice("Heliamphora minor", "Sarraceniaceae"),
    choice("Heliamphora nutans", "Sarraceniaceae"),
    choice("Heliamphora pulchella", "Sarraceniaceae"),
    choice("Sarracenia alata", "Sarraceniaceae"),
    choice("Sarracenia flava", "Sarraceniaceae"),
    choice("Sarracenia leucophylla", "Sarraceniaceae"),
    choice("Sarracenia minor", "Sarraceniaceae"),
    choice("Sarracenia psittacina", "Sarraceniaceae"),
    choice("Sarracenia purpurea", "Sarraceniaceae"),
    choice("Sarracenia rosea", "Sarraceniaceae"),
    choice("Sarracenia rubra", "Sarraceniaceae"),
    choice("Darlingtonia californica", "Sarraceniaceae"),

    choice("Nepenthes albomarginata", "Nepenthaceae"),
    choice("Nepenthes ampullaria", "Nepenthaceae"),
    choice("Nepenthes gracilis", "Nepenthaceae"),
    choice("Nepenthes maxima", "Nepenthaceae"),
    choice("Nepenthes mirabilis", "Nepenthaceae"),
    choice("Nepenthes rafflesiana", "Nepenthaceae"),
    choice("Nepenthes sanguinea", "Nepenthaceae"),
    choice("Nepenthes tentaculata", "Nepenthaceae"),

    choice("Philcoxia bahiensis", "Plantaginaceae"),
    choice("Philcoxia courensis", "Plantaginaceae"),
    choice("Philcoxia goiasensis", "Plantaginaceae"),
    choice("Philcoxia maranhensis", "Plantaginaceae"),
    choice("Philcoxia minensis", "Plantaginaceae"),
    choice("Philcoxia rhizomatosa", "Plantaginaceae"),
    choice("Philcoxia tuberosa", "Plantaginaceae"),

    choice("Roridula dentata", "Roridulaceae"),
    choice("Roridula gorgonias", "Roridulaceae"),

    choice("Triantha glutinosa", "Tofieldiaceae"),
    choice("Triantha japonica", "Tofieldiaceae"),
    choice("Triantha occidentalis", "Tofieldiaceae"),
    choice("Triantha racemosa", "Tofieldiaceae"),

    choice("Triphyophyllum peltatum", "Dioncophyllaceae"),
  ];

  const TARGET_TAXON_IDS = unique(
    TARGET_TAXA.flatMap(function (taxon) {
      return taxon.taxonIds;
    })
  );
  const choiceLabels = ["A", "B", "C", "D"];

  document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector("[data-cp-quiz]");
    if (!root) return;

    const locale = root.dataset.cpQuizLang === "en" ? "en" : "ja";
    const strings = UI_TEXT[locale];

    const elements = {
      start: root.querySelector("[data-cp-start]"),
      restart: root.querySelector("[data-cp-restart]"),
      next: root.querySelector("[data-cp-next]"),
      status: root.querySelector("[data-cp-status]"),
      stage: root.querySelector("[data-cp-stage]"),
      results: root.querySelector("[data-cp-results]"),
      progress: root.querySelector("[data-cp-progress]"),
      score: root.querySelector("[data-cp-score]"),
      photo: root.querySelector("[data-cp-photo]"),
      attribution: root.querySelector("[data-cp-attribution]"),
      choices: root.querySelector("[data-cp-choices]"),
      feedback: root.querySelector("[data-cp-feedback]"),
      resultHeading: root.querySelector("[data-cp-result-heading]"),
      resultCopy: root.querySelector("[data-cp-result-copy]"),
      shareX: root.querySelector("[data-cp-share-x]"),
      shareLine: root.querySelector("[data-cp-share-line]"),
      shareFacebook: root.querySelector("[data-cp-share-facebook]"),
      copyShare: root.querySelector("[data-cp-copy-share]"),
      shareText: root.querySelector("[data-cp-share-text]"),
    };

    const state = {
      questions: [],
      currentIndex: 0,
      correctCount: 0,
      answered: false,
      preloadedImageUrls: new Set(),
      shareText: "",
      facebookShareUrl: "",
      questionLoadingPromise: null,
      runId: 0,
    };

    elements.start.addEventListener("click", startQuiz);
    elements.restart.addEventListener("click", startQuiz);
    elements.next.addEventListener("click", showNextQuestion);
    if (elements.copyShare) {
      elements.copyShare.addEventListener("click", copyShareText);
    }
    if (elements.shareFacebook) {
      elements.shareFacebook.addEventListener("click", openFacebookShare);
    }

    async function startQuiz() {
      const runId = state.runId + 1;
      state.runId = runId;
      setLoading(true);
      setStatus(strings.loading);
      elements.stage.hidden = true;
      elements.results.hidden = true;
      elements.feedback.textContent = "";
      elements.feedback.className = "cp-quiz-feedback";
      elements.choices.innerHTML = "";
      elements.attribution.textContent = "";
      elements.photo.removeAttribute("src");
      elements.photo.alt = "";
      state.questions = [];
      state.currentIndex = 0;
      state.correctCount = 0;
      state.answered = false;
      state.preloadedImageUrls = new Set();
      state.shareText = "";
      state.facebookShareUrl = "";
      state.questionLoadingPromise = null;
      setShareTextValue("");

      try {
        const fetchContext = createFetchContext(runId);
        await loadQuestionsUntil(fetchContext, INITIAL_READY_QUESTIONS);
        if (!isActiveRun(runId)) return;

        if (state.questions.length < INITIAL_READY_QUESTIONS) {
          throw new Error(strings.errorNotEnough);
        }

        elements.results.hidden = true;
        elements.stage.hidden = false;
        setStatus(strings.ready);
        renderQuestion();
        state.questionLoadingPromise = loadQuestionsUntil(fetchContext, QUESTION_COUNT)
          .then(function () {
            if (!isActiveRun(runId)) return;
            if (state.questions.length >= QUESTION_COUNT) {
              setStatus(strings.ready);
            }
          })
          .catch(function () {
            if (!isActiveRun(runId)) return;
            setStatus(strings.errorAdditionalLoad);
          })
          .finally(function () {
            if (!isActiveRun(runId)) return;
            state.questionLoadingPromise = null;
          });
      } catch (error) {
        if (isActiveRun(runId)) {
          setStatus(strings.errorLoad);
        }
      } finally {
        if (isActiveRun(runId)) {
          setLoading(false);
        }
      }
    }

    function createFetchContext(runId) {
      return {
        runId,
        targetQueue: shuffle(TARGET_TAXA),
        fallbackFetched: false,
        requestStarted: false,
      };
    }

    async function loadQuestionsUntil(fetchContext, desiredCount) {
      while (isActiveRun(fetchContext.runId) && state.questions.length < desiredCount && fetchContext.targetQueue.length > 0) {
        updateLoadingStatus();
        await waitBeforeRequest(fetchContext);
        const target = fetchContext.targetQueue.shift();
        const observations = await fetchObservationsForTarget(target);
        if (!isActiveRun(fetchContext.runId)) return;
        const question = selectQuestionFromObservations(observations, target);
        if (question) {
          addQuestion(question);
        }
      }

      if (isActiveRun(fetchContext.runId) && state.questions.length < desiredCount && !fetchContext.fallbackFetched) {
        fetchContext.fallbackFetched = true;
        updateLoadingStatus();
        await waitBeforeRequest(fetchContext);
        const observations = await fetchObservationsForTaxonIds(TARGET_TAXON_IDS, FALLBACK_REQUEST_SIZE);
        if (!isActiveRun(fetchContext.runId)) return;
        addQuestionsFromFallback(observations, desiredCount);
      }
    }

    function updateLoadingStatus() {
      if (!elements.stage.hidden) return;
      setStatus(
        formatText(strings.loadingCount, {
          loaded: Math.min(state.questions.length, QUESTION_COUNT),
          total: QUESTION_COUNT,
        })
      );
    }

    async function waitBeforeRequest(fetchContext) {
      if (fetchContext.requestStarted) {
        await delay(REQUEST_DELAY_MS);
      }
      fetchContext.requestStarted = true;
    }

    async function fetchObservationsForTarget(target) {
      return fetchObservationsForTaxonIds(target.taxonIds, TAXON_REQUEST_SIZE);
    }

    async function fetchObservationsForTaxonIds(taxonIds, perPage) {
      const params = new URLSearchParams({
        taxon_id: taxonIds.join(","),
        photos: "true",
        quality_grade: "research",
        photo_license: LICENSES.join(","),
        rank: "species",
        per_page: String(perPage),
        order_by: "random",
      });
      const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`iNaturalist API error: ${response.status}`);
      }

      const payload = await response.json();
      return Array.isArray(payload.results) ? payload.results : [];
    }

    function selectQuestionFromObservations(observations, target) {
      const candidates = preferUniqueNames(
        shuffle(observations)
          .map(function (observation) {
            return normalizeObservation(observation, target);
          })
          .filter(Boolean)
      );

      return (
        candidates.find(function (candidate) {
          return !hasQuestion(candidate);
        }) || null
      );
    }

    function addQuestionsFromFallback(observations, desiredCount) {
      preferUniqueNames(
        shuffle(observations)
          .map(function (observation) {
            return normalizeObservation(observation);
          })
          .filter(Boolean)
      ).forEach(function (candidate) {
        if (state.questions.length >= desiredCount) return;
        if (hasQuestion(candidate)) return;
        addQuestion(candidate);
      });
    }

    function addQuestion(question) {
      state.questions.push(question);
      updateQuestionChoices();
      preloadUpcomingImages();
    }

    function updateQuestionChoices() {
      const choicePool = buildChoicePool(state.questions);
      state.questions = state.questions.map(function (item) {
        return {
          ...item,
          choices: makeChoices(item, choicePool),
        };
      });
    }

    function hasQuestion(candidate) {
      return state.questions.some(function (question) {
        return question.name === candidate.name || question.observationUrl === candidate.observationUrl;
      });
    }

    function isActiveRun(runId) {
      return state.runId === runId;
    }

    function normalizeObservation(observation, fallbackTarget) {
      const taxon = observation.taxon;
      if (!taxon || taxon.rank !== "species" || !taxon.name) return null;

      const target = findTargetTaxon(taxon) || fallbackTarget;
      if (!target) return null;

      const photo = Array.isArray(observation.photos)
        ? observation.photos.find(function (candidate) {
            return candidate && !candidate.hidden && LICENSES.includes(candidate.license_code);
          })
        : null;
      if (!photo || !photo.url) return null;

      return {
        name: taxon.name,
        genus: target.genus || getGenusName(taxon.name),
        family: target.family,
        commonName: taxon.preferred_common_name || observation.species_guess || "",
        imageUrl: getPhotoUrl(photo),
        attribution: photo.attribution || "iNaturalist contributor",
        licenseCode: photo.license_code,
        observationUrl: observation.uri || `https://www.inaturalist.org/observations/${observation.id}`,
      };
    }

    function findTargetTaxon(taxon) {
      const ancestorIds = new Set(Array.isArray(taxon.ancestor_ids) ? taxon.ancestor_ids : []);
      ancestorIds.add(taxon.id);

      return TARGET_TAXA.find(function (target) {
        return target.taxonIds.some(function (taxonId) {
          return ancestorIds.has(taxonId);
        });
      });
    }

    function getPhotoUrl(photo) {
      if (photo.medium_url) return photo.medium_url;
      return photo.url.replace("/square.", "/medium.");
    }

    function buildChoicePool(items) {
      const records = CURATED_CHOICE_NAMES.concat(
        items.map(function (item) {
          return {
            name: item.name,
            genus: item.genus,
            family: item.family,
          };
        })
      );
      const byName = new Map();

      records.forEach(function (record) {
        if (!record.name || byName.has(record.name)) return;
        byName.set(record.name, record);
      });

      return Array.from(byName.values());
    }

    function makeChoices(correctItem, namePool) {
      const sameGenus = shuffle(
        namePool.filter(function (candidate) {
          return candidate.name !== correctItem.name && candidate.genus === correctItem.genus;
        })
      );
      const sameFamily = shuffle(
        namePool.filter(function (candidate) {
          return candidate.name !== correctItem.name && candidate.genus !== correctItem.genus && candidate.family === correctItem.family;
        })
      );
      const anywhere = shuffle(
        namePool.filter(function (candidate) {
          return candidate.name !== correctItem.name;
        })
      );
      const distractors = [];

      addDistractors(distractors, sameGenus);
      addDistractors(distractors, sameFamily);
      addDistractors(distractors, anywhere);

      return shuffle(
        [correctItem.name].concat(
          distractors.slice(0, 3).map(function (item) {
            return item.name;
          })
        )
      );
    }

    function addDistractors(selected, candidates) {
      candidates.forEach(function (candidate) {
        if (selected.length >= 3) return;
        if (
          selected.some(function (item) {
            return item.name === candidate.name;
          })
        )
          return;
        selected.push(candidate);
      });
    }

    function renderQuestion() {
      const question = state.questions[state.currentIndex];
      state.answered = false;

      elements.progress.textContent = `${state.currentIndex + 1} / ${QUESTION_COUNT}`;
      elements.score.textContent = getScoreText();
      elements.photo.src = question.imageUrl;
      elements.photo.alt = strings.photoAlt;
      elements.attribution.innerHTML = buildAttribution(question);
      elements.feedback.textContent = "";
      elements.feedback.className = "cp-quiz-feedback";
      elements.next.hidden = true;
      elements.next.disabled = false;
      elements.next.querySelector("span").textContent = state.currentIndex === QUESTION_COUNT - 1 ? strings.showResults : strings.next;

      elements.choices.innerHTML = "";
      question.choices.forEach(function (selectedChoice, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cp-quiz-choice";
        button.dataset.choice = selectedChoice;
        button.innerHTML = `
          <span class="cp-quiz-choice-prefix">${choiceLabels[index]}</span>
          <span class="cp-quiz-choice-name">${escapeHtml(selectedChoice)}</span>
        `;
        button.addEventListener("click", function () {
          selectAnswer(selectedChoice, button);
        });
        elements.choices.appendChild(button);
      });

      preloadUpcomingImages();
    }

    function preloadUpcomingImages() {
      for (let offset = 1; offset <= IMAGE_PRELOAD_AHEAD; offset += 1) {
        const nextQuestion = state.questions[state.currentIndex + offset];
        if (!nextQuestion) continue;
        preloadImage(nextQuestion.imageUrl);
      }
    }

    function preloadImage(imageUrl) {
      if (!imageUrl || state.preloadedImageUrls.has(imageUrl)) return;
      const image = new Image();
      image.src = imageUrl;
      state.preloadedImageUrls.add(imageUrl);
    }

    function selectAnswer(selectedChoice, selectedButton) {
      if (state.answered) return;

      const question = state.questions[state.currentIndex];
      const isCorrect = selectedChoice === question.name;
      state.answered = true;

      if (isCorrect) {
        state.correctCount += 1;
      }

      elements.score.textContent = getScoreText();
      Array.from(elements.choices.querySelectorAll("button")).forEach(function (button) {
        button.disabled = true;
        if (button.dataset.choice === question.name) {
          button.classList.add("is-correct");
        } else if (button === selectedButton) {
          button.classList.add("is-wrong");
        }
      });

      elements.feedback.textContent = isCorrect
        ? formatText(strings.correctFeedback, { name: question.name })
        : formatText(strings.wrongFeedback, { name: question.name });
      elements.feedback.classList.add(isCorrect ? "is-correct" : "is-wrong");
      elements.next.hidden = false;
      elements.next.focus();
    }

    async function showNextQuestion() {
      const runId = state.runId;
      if (state.currentIndex >= QUESTION_COUNT - 1) {
        showResults();
        return;
      }

      const nextIndex = state.currentIndex + 1;
      if (!state.questions[nextIndex]) {
        await waitForQuestion(nextIndex, runId);
      }
      if (!isActiveRun(runId)) return;

      if (!state.questions[nextIndex]) {
        showResults();
        return;
      }

      state.currentIndex = nextIndex;
      setStatus(strings.ready);
      renderQuestion();
    }

    async function waitForQuestion(index, runId) {
      elements.next.disabled = true;
      setStatus(strings.loadNext);

      while (isActiveRun(runId) && !state.questions[index] && state.questionLoadingPromise) {
        await Promise.race([state.questionLoadingPromise, delay(200)]);
      }

      if (!isActiveRun(runId)) return;
      elements.next.disabled = false;

      if (!state.questions[index]) {
        setStatus(strings.unableToPrepare);
      }
    }

    function showResults() {
      const questionTotal = Math.max(1, Math.min(state.questions.length, QUESTION_COUNT));
      const percentage = Math.round((state.correctCount / questionTotal) * 100);
      elements.stage.hidden = true;
      elements.results.hidden = false;
      elements.resultHeading.textContent = formatText(strings.resultHeading, { percentage });
      elements.resultCopy.textContent = formatText(strings.resultCopy, {
        correct: state.correctCount,
        total: questionTotal,
      });
      updateShareLinks(percentage, questionTotal);
      setStatus(strings.resultStatus);
    }

    function updateShareLinks(percentage, questionTotal) {
      const pageUrl = window.location.href.split("#")[0].split("?")[0];
      const text = formatText(strings.shareText, {
        correct: state.correctCount,
        percentage,
        total: questionTotal,
      });
      const encodedText = encodeURIComponent(text);
      const encodedUrl = encodeURIComponent(pageUrl);
      state.shareText = `${text} ${pageUrl}`;
      setShareTextValue(state.shareText);

      setShareLink(elements.shareX, `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`);
      setShareLink(elements.shareLine, `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`);
      setFacebookShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
      resetCopyShareButton();
    }

    function setShareLink(element, url) {
      if (!element) return;
      element.href = url;
    }

    function setFacebookShareUrl(url) {
      state.facebookShareUrl = url;
      if (!elements.shareFacebook) return;
      elements.shareFacebook.dataset.shareUrl = url;
    }

    function openFacebookShare() {
      if (!state.facebookShareUrl) return;
      copyShareTextForFacebook();
      window.open(state.facebookShareUrl, "_blank", "noopener,noreferrer");
    }

    function copyShareTextForFacebook() {
      if (!state.shareText) return;

      if (copyTextWithTextarea(state.shareText)) {
        setCopyShareButton(strings.copiedLabel);
        window.setTimeout(resetCopyShareButton, 1800);
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(state.shareText)
          .then(function () {
            setCopyShareButton(strings.copiedLabel);
            window.setTimeout(resetCopyShareButton, 1800);
          })
          .catch(function () {
            selectShareText();
            setStatus(strings.facebookPasteHint);
          });
        return;
      }

      selectShareText();
      setStatus(strings.facebookPasteHint);
    }

    async function copyShareText() {
      if (!state.shareText) return;

      try {
        await writeClipboardText(state.shareText);
        setCopyShareButton(strings.copiedLabel);
        window.setTimeout(resetCopyShareButton, 1800);
      } catch (error) {
        selectShareText();
        setStatus(strings.copyFailed);
      }
    }

    function setShareTextValue(text) {
      if (!elements.shareText) return;
      elements.shareText.value = text;
    }

    function selectShareText() {
      if (!elements.shareText) return;
      elements.shareText.focus();
      elements.shareText.select();
    }

    async function writeClipboardText(text) {
      if (copyTextWithTextarea(text)) {
        return;
      }

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }

      throw new Error("Clipboard copy failed.");
    }

    function copyTextWithTextarea(text) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }

    function setCopyShareButton(label) {
      if (!elements.copyShare) return;
      const labelElement = elements.copyShare.querySelector("span");
      if (labelElement) labelElement.textContent = label;
    }

    function resetCopyShareButton() {
      setCopyShareButton(strings.copyLabel);
    }

    function buildAttribution(question) {
      const licenseLabel = LICENSE_LABELS[question.licenseCode] || question.licenseCode;
      const licenseUrl = LICENSE_URLS[question.licenseCode];
      const licenseLink = licenseUrl
        ? `<a href="${licenseUrl}" target="_blank" rel="noopener noreferrer">${licenseLabel}</a>`
        : escapeHtml(licenseLabel);

      return formatText(strings.attribution, {
        attribution: escapeHtml(question.attribution),
        licenseLink,
        observationUrl: escapeHtml(question.observationUrl),
      });
    }

    function setLoading(isLoading) {
      elements.start.disabled = isLoading;
      elements.restart.disabled = isLoading;
      elements.start.querySelector("span").textContent = isLoading ? strings.loadingLabel : strings.startLabel;
    }

    function setStatus(message) {
      elements.status.textContent = message;
    }

    function getScoreText() {
      return formatText(strings.score, { correct: state.correctCount });
    }

    function delay(duration) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, duration);
      });
    }
  });

  function choice(name, family) {
    return {
      name,
      genus: getGenusName(name),
      family,
    };
  }

  function getGenusName(scientificName) {
    return String(scientificName).split(" ")[0];
  }

  function preferUniqueNames(items) {
    const seen = new Set();
    const uniqueItems = [];
    const repeatedItems = [];

    items.forEach(function (item) {
      if (seen.has(item.name)) {
        repeatedItems.push(item);
        return;
      }

      seen.add(item.name);
      uniqueItems.push(item);
    });

    return uniqueItems.concat(repeatedItems);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function formatText(template, values) {
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
    });
  }

  function shuffle(values) {
    const array = values.slice();
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }
    return array;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[character];
    });
  }
})();
