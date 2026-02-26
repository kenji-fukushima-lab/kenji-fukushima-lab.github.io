import { highlightSearchTerm } from "./highlight-search-term.js";

const normalize = (value) => (value ?? "").toString().trim().toLowerCase();
const normalizeDoi = (value) =>
  normalize(value)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/, "");
const CONTACT_EMAIL = "kenji.fukushima@nig.ac.jp";
const CROSSREF_WORKS_ENDPOINT = "https://api.crossref.org/works";

const parseNumber = (value) => {
  const normalized = (value ?? "").toString().replace(/,/g, "");
  const matched = normalized.match(/-?\d+(\.\d+)?/);
  if (!matched) return 0;
  const parsed = Number.parseFloat(matched[0]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueSorted = (items) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const splitDelimited = (value) =>
  normalize(value)
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);

const createElement = (tag, className = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
};

const isJapanesePage = document.documentElement.lang.toLowerCase().startsWith("ja");
const OTHER_FACET_VALUE = "__other__";
const ARTICLE_TYPE_ORIGINAL = "__article_type_original__";
const ARTICLE_TYPE_PREPRINT = "__article_type_preprint__";
const ARTICLE_TYPE_REVIEW_OTHERS = "__article_type_review_others__";
const AUTHOR_ROLE_FIRST_VALUE = "__author_role_first__";
const AUTHOR_ROLE_CORRESPONDING_VALUE = "__author_role_corresponding__";
const AUTHOR_ROLE_EITHER_VALUE = "__author_role_either__";
const AUTHOR_ROLE_BOTH_VALUE = "__author_role_both__";

const articleTypeFacetValue = (value) => {
  const normalized = normalize(value);
  if (normalized === "original") return ARTICLE_TYPE_ORIGINAL;
  if (normalized === "preprint") return ARTICLE_TYPE_PREPRINT;
  return ARTICLE_TYPE_REVIEW_OTHERS;
};

const i18n = {
  all: isJapanesePage ? "すべて" : "All",
  any: isJapanesePage ? "任意" : "Any",
  showing: isJapanesePage ? "表示中" : "Showing",
  sortedResults: isJapanesePage ? "並び替え結果" : "Sorted results",
  newest: isJapanesePage ? "新着順" : "Newest",
  noResults: isJapanesePage ? "該当する論文がありません。" : "No matching publications.",
  badgeIdle: isJapanesePage ? "外部バッジは未読込です。" : "External badges are not loaded yet.",
  badgeLoading: isJapanesePage ? "外部バッジを読み込み中..." : "Loading external badges...",
  badgeLoaded: isJapanesePage ? "外部バッジを読み込みました。" : "External badges loaded.",
  badgeError: isJapanesePage ? "外部バッジの読み込みに失敗しました。" : "Failed to load external badges.",
  citationHydrating: isJapanesePage ? "被引用数を更新中..." : "Refreshing citation counts...",
  citationHydrated: isJapanesePage ? "被引用数を更新しました。" : "Citation counts refreshed.",
  leadRoleLabel: isJapanesePage ? "(共)筆頭または(共)責任著者に研究室メンバーを含む" : "Lab members among (co-)first or (co-)corresponding authors",
  otherRoleLabel: isJapanesePage ? "それ以外" : "Other",
  paperCountAxisLabel: isJapanesePage ? "論文数" : "Number of publications",
  firstAuthorRoleFacetOption: isJapanesePage
    ? "(共)筆頭"
    : "(co-)first",
  correspondingAuthorRoleFacetOption: isJapanesePage
    ? "(共)責任"
    : "(co-)corresponding",
  eitherAuthorRolesFacetOption: isJapanesePage
    ? "いずれか"
    : "either",
  bothAuthorRolesFacetOption: isJapanesePage
    ? "両方"
    : "both",
  otherFacetOption: isJapanesePage ? "どちらでもない" : "neither",
  crossrefSortLabel: isJapanesePage ? "被引用順（Crossref）" : "Citation (Crossref)",
  dimensionsSortLabel: isJapanesePage ? "被引用順（Dimensions）" : "Citation (Dimensions)",
  altmetricSortLabel: "Altmetric",
  altmetricHint: isJapanesePage
    ? "Altmetric順は`altmetric_score`がある論文を優先して並び替えます。"
    : "Altmetric sort prioritizes publications with `altmetric_score` metadata.",
};

const trackAnalyticsEvent = (eventName, params = {}) => {
  if (!eventName) return;

  const payload = {
    page_path: window.location.pathname,
    ...params,
  };

  if (typeof window.trackSiteEvent === "function") {
    window.trackSiteEvent(eventName, payload);
    return;
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
};

const defaultFacetConfig = [
  { id: "facet-year", key: "year", labeler: (value) => value.toString() },
  {
    id: "facet-article-type",
    key: "articleType",
    labeler: (value) => value,
    fixedOptions: [
      { value: ARTICLE_TYPE_ORIGINAL, label: "Original" },
      { value: ARTICLE_TYPE_PREPRINT, label: "Preprint" },
      { value: ARTICLE_TYPE_REVIEW_OTHERS, label: "Review / Other" },
    ],
  },
  {
    id: "facet-author-role",
    key: "authorRole",
    labeler: (value) => value,
    defaultLabel: i18n.any,
    fixedOptions: [
      { value: AUTHOR_ROLE_FIRST_VALUE, label: i18n.firstAuthorRoleFacetOption },
      { value: AUTHOR_ROLE_CORRESPONDING_VALUE, label: i18n.correspondingAuthorRoleFacetOption },
      { value: AUTHOR_ROLE_EITHER_VALUE, label: i18n.eitherAuthorRolesFacetOption },
      { value: AUTHOR_ROLE_BOTH_VALUE, label: i18n.bothAuthorRolesFacetOption },
      { value: OTHER_FACET_VALUE, label: i18n.otherFacetOption },
    ],
  },
];

document.addEventListener("DOMContentLoaded", () => {
  const publicationsRoot = document.querySelector(".publications");
  const searchInput = document.getElementById("bibsearch");
  if (!publicationsRoot || !searchInput) {
    return;
  }

  const sortSelect = document.getElementById("pub-sort");
  const resetButton = document.getElementById("pub-reset-filters");
  const badgeLoadButton = document.getElementById("pub-load-badges");
  const activeCountNode = document.getElementById("pub-active-count");
  const badgeStatusNode = document.getElementById("pub-badge-status");

  const bibliographyItems = Array.from(publicationsRoot.querySelectorAll("ol.bibliography > li"));
  if (!bibliographyItems.length) {
    return;
  }

  const entries = bibliographyItems
    .map((listItem, index) => {
      const publicationEntry = listItem.querySelector(".publication-entry");
      if (!publicationEntry) return null;
      const year = Number.parseInt(publicationEntry.dataset.year ?? "0", 10) || 0;
      const month = Number.parseInt(publicationEntry.dataset.month ?? "0", 10) || 0;
      const firstAuthor = normalize(publicationEntry.dataset.firstAuthor);
      const corresponding = splitDelimited(publicationEntry.dataset.corresponding);
      const coFirst = splitDelimited(publicationEntry.dataset.coFirst);
      const labMembers = splitDelimited(publicationEntry.dataset.labMembers);
      const articleType = articleTypeFacetValue(publicationEntry.dataset.articleType);
      const citationCount = parseNumber(publicationEntry.dataset.crossrefCount ?? publicationEntry.dataset.citationCount);
      const dimensionsCitationCount = parseNumber(publicationEntry.dataset.dimensionsCount);
      const altmetricScore = parseNumber(publicationEntry.dataset.altmetricScore);
      const doi = normalizeDoi(publicationEntry.dataset.doi);

      const labMemberSet = new Set(labMembers);
      const hasLabFirstAuthorRole =
        (firstAuthor && labMemberSet.has(firstAuthor)) || coFirst.some((name) => labMemberSet.has(name));
      const hasLabCorrespondingAuthorRole = corresponding.some((name) => labMemberSet.has(name));
      let authorRole = OTHER_FACET_VALUE;
      if (hasLabFirstAuthorRole && hasLabCorrespondingAuthorRole) {
        authorRole = AUTHOR_ROLE_BOTH_VALUE;
      } else if (hasLabFirstAuthorRole) {
        authorRole = AUTHOR_ROLE_FIRST_VALUE;
      } else if (hasLabCorrespondingAuthorRole) {
        authorRole = AUTHOR_ROLE_CORRESPONDING_VALUE;
      }

      return {
        index,
        listItem,
        publicationEntry,
        title: normalize(listItem.querySelector(".publication-title .title")?.textContent),
        searchText: normalize(listItem.textContent),
        year,
        month,
        articleType,
        firstAuthor,
        corresponding,
        coFirst,
        labMembers,
        citationCount,
        dimensionsCitationCount,
        altmetricScore,
        hasLabFirstAuthorRole,
        hasLabCorrespondingAuthorRole,
        authorRole,
        leadRole: hasLabFirstAuthorRole || hasLabCorrespondingAuthorRole,
        doi,
      };
    })
    .filter(Boolean);
  const hasExternalAltmetricEmbeds = entries.some((entry) => Boolean(entry.listItem.querySelector(".altmetric-embed")));

  const availableYears = entries.map((entry) => entry.year).filter((year) => Number.isInteger(year) && year > 0);
  const minYear = availableYears.length ? Math.min(...availableYears) : new Date().getFullYear();
  const maxYear = availableYears.length ? Math.max(...availableYears) : minYear;
  const fullYearRange = Array.from({ length: maxYear - minYear + 1 }, (_, offset) => (minYear + offset).toString());

  const resultsContainer = createElement("div", "publications-results");
  resultsContainer.id = "publications-results";
  publicationsRoot.querySelectorAll("h2.bibliography, ol.bibliography").forEach((node) => node.remove());
  publicationsRoot.appendChild(resultsContainer);

  let currentSort = sortSelect?.value || "newest";
  if (currentSort === "citations") {
    currentSort = "crossref-citations";
    if (sortSelect) sortSelect.value = "crossref-citations";
  }
  let badgeState = "idle";
  let badgeLoadPromise = null;
  let altmetricRefreshTimerId = null;
  let altmetricRefreshAttempts = 0;
  let altmetricCallbackHooked = false;
  let citationHydrationStarted = false;
  let citationSeedPromise = null;
  let citationHydrationPromise = null;
  let inputDebounceId = null;
  let lastTrackedSearch = "";
  let chartsReadyAttempts = 0;
  let charts = { byYear: null };

  if (!hasExternalAltmetricEmbeds) {
    if (badgeLoadButton) badgeLoadButton.style.display = "none";
    if (badgeStatusNode) badgeStatusNode.style.display = "none";
  }

  const setBadgeStatus = (status, forceText = "") => {
    badgeState = status;
    if (!badgeStatusNode) return;
    if (forceText) {
      badgeStatusNode.textContent = forceText;
      return;
    }
    if (status === "loading") badgeStatusNode.textContent = i18n.badgeLoading;
    else if (status === "loaded") badgeStatusNode.textContent = i18n.badgeLoaded;
    else if (status === "error") badgeStatusNode.textContent = i18n.badgeError;
    else badgeStatusNode.textContent = i18n.badgeIdle;
  };

  const populateFacet = (selectId, values, labeler, prependOptions = [], defaultLabel = i18n.all) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultLabel;
    select.appendChild(defaultOption);

    prependOptions.forEach((prependOption) => {
      const option = document.createElement("option");
      option.value = prependOption.value;
      option.textContent = prependOption.label;
      select.appendChild(option);
    });

    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = labeler(value);
      select.appendChild(option);
    });

    if (currentValue && Array.from(select.options).some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  };

  const initializeFacets = () => {
    defaultFacetConfig.forEach((facet) => {
      if (facet.fixedOptions) {
        populateFacet(facet.id, [], facet.labeler, facet.fixedOptions, facet.defaultLabel || i18n.all);
        return;
      }
      const values = facet.isList
        ? uniqueSorted(entries.flatMap((entry) => entry[facet.key]))
        : uniqueSorted(entries.map((entry) => (facet.key === "year" ? entry.year.toString() : entry[facet.key])));
      const sortableValues = facet.key === "year" ? values.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)) : values;
      populateFacet(facet.id, sortableValues, facet.labeler, [], facet.defaultLabel || i18n.all);
    });
  };

  const getActiveFilters = () => {
    const filters = {};
    defaultFacetConfig.forEach((facet) => {
      const select = document.getElementById(facet.id);
      filters[facet.key] = normalize(select?.value);
    });
    return filters;
  };

  const matchesFilters = (entry, search, filters) => {
    if (search && !entry.searchText.includes(search)) return false;
    if (filters.year && entry.year.toString() !== filters.year) return false;
    if (filters.articleType && entry.articleType !== filters.articleType) return false;
    if (filters.authorRole === AUTHOR_ROLE_FIRST_VALUE && !entry.hasLabFirstAuthorRole) return false;
    if (filters.authorRole === AUTHOR_ROLE_CORRESPONDING_VALUE && !entry.hasLabCorrespondingAuthorRole) return false;
    if (filters.authorRole === AUTHOR_ROLE_EITHER_VALUE && !(entry.hasLabFirstAuthorRole || entry.hasLabCorrespondingAuthorRole)) {
      return false;
    }
    if (filters.authorRole === AUTHOR_ROLE_BOTH_VALUE && !(entry.hasLabFirstAuthorRole && entry.hasLabCorrespondingAuthorRole)) {
      return false;
    }
    if (filters.authorRole === OTHER_FACET_VALUE && (entry.hasLabFirstAuthorRole || entry.hasLabCorrespondingAuthorRole)) {
      return false;
    }
    return true;
  };

  const compareByNewest = (a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.index - b.index;
  };

  const isCrossrefCitationSort = (sortValue) => sortValue === "crossref-citations" || sortValue === "citations";

  const sortLabelForDisplay = (sortValue) => {
    if (isCrossrefCitationSort(sortValue)) return i18n.crossrefSortLabel;
    if (sortValue === "dimensions-citations") return i18n.dimensionsSortLabel;
    if (sortValue === "altmetric") return i18n.altmetricSortLabel;
    return i18n.newest;
  };

  const sortEntries = (filteredEntries) => {
    const next = [...filteredEntries];
    if (isCrossrefCitationSort(currentSort)) {
      next.sort((a, b) => {
        if (b.citationCount !== a.citationCount) return b.citationCount - a.citationCount;
        return compareByNewest(a, b);
      });
      return next;
    }
    if (currentSort === "dimensions-citations") {
      next.sort((a, b) => {
        if (b.dimensionsCitationCount !== a.dimensionsCitationCount) {
          return b.dimensionsCitationCount - a.dimensionsCitationCount;
        }
        return compareByNewest(a, b);
      });
      return next;
    }
    if (currentSort === "altmetric") {
      next.sort((a, b) => {
        if (b.altmetricScore !== a.altmetricScore) return b.altmetricScore - a.altmetricScore;
        return compareByNewest(a, b);
      });
      return next;
    }
    next.sort(compareByNewest);
    return next;
  };

  const renderResultGroups = (sortedEntries) => {
    resultsContainer.innerHTML = "";
    if (!sortedEntries.length) {
      const emptyState = createElement("p", "pub-empty-state");
      emptyState.textContent = i18n.noResults;
      resultsContainer.appendChild(emptyState);
      return;
    }

    if (currentSort === "newest") {
      const byYear = new Map();
      sortedEntries.forEach((entry) => {
        if (!byYear.has(entry.year)) byYear.set(entry.year, []);
        byYear.get(entry.year).push(entry);
      });

      [...byYear.keys()]
        .sort((a, b) => b - a)
        .forEach((year) => {
          const heading = createElement("h2", "bibliography");
          heading.textContent = year.toString();
          const list = createElement("ol", "bibliography");
          byYear.get(year).forEach((entry) => list.appendChild(entry.listItem));
          resultsContainer.append(heading, list);
        });
      return;
    }

    const heading = createElement("h2", "bibliography pub-sorted-heading");
    heading.textContent = `${i18n.sortedResults} (${sortLabelForDisplay(currentSort)})`;
    const list = createElement("ol", "bibliography");
    sortedEntries.forEach((entry) => list.appendChild(entry.listItem));
    resultsContainer.append(heading, list);
  };

  const updateActiveCount = (visibleCount) => {
    if (!activeCountNode) return;
    activeCountNode.textContent = `${i18n.showing}: ${visibleCount} / ${entries.length}`;
  };

  const highlightSearch = (search) => {
    // Some browsers do not expose the CSS Highlight API at all.
    if (typeof CSS === "undefined" || !("highlights" in CSS) || !CSS.highlights) return;
    try {
      highlightSearchTerm({
        search,
        selector: "#publications-results li",
      });
    } catch {
      // Keep search/sort functional even if highlight rendering fails.
    }
  };

  const getChartPalette = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const themeColor = rootStyle.getPropertyValue("--global-theme-color").trim() || "#2f7f75";
    const textColor = rootStyle.getPropertyValue("--global-text-color").trim() || "#334155";
    const dividerColor = rootStyle.getPropertyValue("--global-divider-color").trim() || "#cbd5e1";
    const secondaryColor = rootStyle.getPropertyValue("--global-text-color-light").trim() || "#94a3b8";
    return { themeColor, textColor, dividerColor, secondaryColor };
  };

  const ensureChartObject = () => {
    if (window.Chart) return true;
    chartsReadyAttempts += 1;
    if (chartsReadyAttempts > 20) return false;
    setTimeout(() => updateDashboard(lastRenderedEntries), 300);
    return false;
  };

  const upsertChart = (chartKey, canvasId, type, labels, datasets, configOverrides = {}) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const palette = getChartPalette();

    if (charts[chartKey]) {
      charts[chartKey].data.labels = labels;
      charts[chartKey].data.datasets = datasets;
      charts[chartKey].update();
      return;
    }

    charts[chartKey] = new window.Chart(canvas, {
      type,
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              color: palette.textColor,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: palette.textColor },
            grid: { color: palette.dividerColor },
          },
          y: {
            ticks: { color: palette.textColor, precision: 0 },
            grid: { color: palette.dividerColor },
          },
        },
        ...configOverrides,
      },
    });
  };

  const updateDashboard = (visibleEntries) => {
    if (!ensureChartObject()) return;

    const byYear = new Map(fullYearRange.map((yearLabel) => [yearLabel, { lead: 0, other: 0 }]));
    visibleEntries.forEach((entry) => {
      const yearLabel = entry.year.toString();
      if (!byYear.has(yearLabel)) return;
      const bucket = byYear.get(yearLabel);
      if (entry.leadRole) {
        bucket.lead += 1;
      } else {
        bucket.other += 1;
      }
    });

    const yearLabels = fullYearRange;
    const palette = getChartPalette();
    const yearLeadValues = yearLabels.map((label) => byYear.get(label).lead);
    const yearOtherValues = yearLabels.map((label) => byYear.get(label).other);

    const createUnitDatasets = (values, label, color, role) => {
      const maxValue = Math.max(0, ...values);
      return Array.from({ length: maxValue }, (_, unitLevel) => ({
        label,
        data: yearLabels.map((_, index) => (values[index] > unitLevel ? 1 : 0)),
        backgroundColor: color,
        borderColor: palette.dividerColor,
        borderWidth: 1,
        borderSkipped: false,
        stack: "publication-counts",
        unitRole: role,
        unitLevel,
      }));
    };

    const yearDatasets = [
      ...createUnitDatasets(yearLeadValues, i18n.leadRoleLabel, palette.themeColor, "lead"),
      ...createUnitDatasets(yearOtherValues, i18n.otherRoleLabel, palette.secondaryColor, "other"),
    ];

    upsertChart("byYear", "pub-chart-year", "bar", yearLabels, yearDatasets, {
      plugins: {
        legend: {
          display: true,
          labels: {
            color: palette.textColor,
            filter: (legendItem, chartData) => {
              const dataset = chartData.datasets?.[legendItem.datasetIndex];
              return dataset?.unitLevel === 0;
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const dataset = context.dataset;
              if (!dataset || dataset.unitLevel !== 0) return null;
              const yearIndex = context.dataIndex;
              if (dataset.unitRole === "lead") {
                return `${i18n.leadRoleLabel}: ${yearLeadValues[yearIndex]}`;
              }
              return `${i18n.otherRoleLabel}: ${yearOtherValues[yearIndex]}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: palette.textColor },
          grid: { color: palette.dividerColor },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { color: palette.textColor, precision: 0, stepSize: 1 },
          title: {
            display: true,
            text: i18n.paperCountAxisLabel,
            color: palette.textColor,
          },
          grid: { color: palette.dividerColor },
        },
      },
    });
  };

  const seedCitationCountsFromStatic = () => {
    if (citationSeedPromise) return citationSeedPromise;
    citationSeedPromise = fetch("/assets/data/citation-counts.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const counts = payload?.counts;
        if (!counts || typeof counts !== "object") return;
        let hasUpdate = false;
        entries.forEach((entry) => {
          const key = normalizeDoi(entry.doi);
          if (!key) return;
          const staticCount = parseNumber(counts[key]);
          if (staticCount > entry.citationCount) {
            entry.citationCount = staticCount;
            hasUpdate = true;
          }
        });
        if (hasUpdate && isCrossrefCitationSort(currentSort)) {
          applyFiltersAndRender();
        }
      })
      .catch(() => {
        // Keep runtime fetch path even if local cache is unavailable.
      });
    return citationSeedPromise;
  };

  const injectScript = (id, src) =>
    new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        resolve(existing);
        return;
      }
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });

  const refreshBadgeEmbeds = () => {
    if (typeof window._altmetric_embed_init === "function") {
      window._altmetric_embed_init();
    }
  };

  const extractAltmetricScore = (badge) => {
    if (!badge) return 0;

    const candidates = [
      badge.getAttribute("data-score"),
      badge.getAttribute("data-altmetric-score"),
      badge.getAttribute("aria-label"),
      badge.getAttribute("title"),
      badge.dataset?.score,
      badge.textContent,
      ...Array.from(badge.querySelectorAll("a, span, img")).map((node) => {
        if (node.tagName === "IMG") return node.getAttribute("alt");
        return `${node.getAttribute("aria-label") || ""} ${node.textContent || ""}`.trim();
      }),
    ];

    for (const candidate of candidates) {
      const score = parseNumber(candidate);
      if (score > 0) return score;
    }
    return 0;
  };

  const updateAltmetricScoreFromPayload = (payload) => {
    if (!payload || typeof payload !== "object") return false;
    const score = parseNumber(payload.score);
    if (score <= 0) return false;

    const payloadDoi = normalizeDoi(payload.doi);
    const payloadAltmetricId = normalize(payload.altmetric_id);
    let hasUpdate = false;

    entries.forEach((entry) => {
      const badge = entry.listItem.querySelector(".altmetric-embed");
      const badgeDoi = normalizeDoi(badge?.dataset?.doi || badge?.getAttribute("data-doi"));
      const badgeAltmetricId = normalize(badge?.dataset?.altmetricId || badge?.getAttribute("data-altmetric-id"));
      const doiMatches = payloadDoi && (entry.doi === payloadDoi || badgeDoi === payloadDoi);
      const altmetricIdMatches = payloadAltmetricId && badgeAltmetricId && payloadAltmetricId === badgeAltmetricId;

      if (!doiMatches && !altmetricIdMatches) return;
      if (score > entry.altmetricScore) {
        entry.altmetricScore = score;
        hasUpdate = true;
      }
    });

    return hasUpdate;
  };

  const parseAltmetricFromDom = () => {
    let hasUpdate = false;
    entries.forEach((entry) => {
      const badge = entry.listItem.querySelector(".altmetric-embed");
      if (!badge) return;
      const score = extractAltmetricScore(badge);
      if (score > entry.altmetricScore) {
        entry.altmetricScore = score;
        hasUpdate = true;
      }
    });
    return hasUpdate;
  };

  const scheduleAltmetricParseRefresh = () => {
    clearTimeout(altmetricRefreshTimerId);
    altmetricRefreshAttempts = 0;

    const poll = () => {
      altmetricRefreshAttempts += 1;
      const hasUpdate = parseAltmetricFromDom();
      if (hasUpdate && currentSort === "altmetric") {
        applyFiltersAndRender();
      }

      if (altmetricRefreshAttempts >= 20) return;
      const delay = altmetricRefreshAttempts < 6 ? 400 : 1000;
      altmetricRefreshTimerId = setTimeout(poll, delay);
    };

    altmetricRefreshTimerId = setTimeout(poll, 250);
  };

  const hookAltmetricEmbedCallback = () => {
    if (altmetricCallbackHooked) return;
    const callback = window._altmetric?.embed_callback;
    if (typeof callback !== "function") return;

    window._altmetric.embed_callback = (...args) => {
      const hasPayloadUpdate = updateAltmetricScoreFromPayload(args[0]);
      const result = callback.apply(window._altmetric, args);
      const hasDomUpdate = parseAltmetricFromDom();
      if ((hasPayloadUpdate || hasDomUpdate) && currentSort === "altmetric") {
        applyFiltersAndRender();
      }
      return result;
    };
    altmetricCallbackHooked = true;
  };

  const loadExternalBadges = () => {
    if (!hasExternalAltmetricEmbeds) {
      setBadgeStatus("loaded");
      badgeLoadPromise = Promise.resolve();
      return badgeLoadPromise;
    }
    if (badgeLoadPromise) return badgeLoadPromise;
    setBadgeStatus("loading");
    badgeLoadPromise = injectScript("pub-altmetric-script", "https://d1bxh8uas1mnw7.cloudfront.net/assets/embed.js")
      .then(() => {
        hookAltmetricEmbedCallback();
        refreshBadgeEmbeds();
        parseAltmetricFromDom();
        scheduleAltmetricParseRefresh();
        setBadgeStatus("loaded");
        trackAnalyticsEvent("publications_badges_loaded", {
          publication_count: entries.length,
        });
        applyFiltersAndRender();
      })
      .catch(() => {
        setBadgeStatus("error");
        trackAnalyticsEvent("publications_badges_load_error", {
          publication_count: entries.length,
        });
      });
    return badgeLoadPromise;
  };

  const observeBadgesInViewport = () => {
    if (!hasExternalAltmetricEmbeds) return;
    if (!("IntersectionObserver" in window)) return;
    const firstBadgeRow = entries.find((entry) => entry.listItem.querySelector(".badges"))?.listItem;
    if (!firstBadgeRow) return;
    const observer = new IntersectionObserver(
      (observedEntries) => {
        if (observedEntries.some((entry) => entry.isIntersecting)) {
          loadExternalBadges();
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" }
    );
    observer.observe(firstBadgeRow);
  };

  const fetchCrossrefCitationCount = async (doi) => {
    const response = await fetch(
      `${CROSSREF_WORKS_ENDPOINT}/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(CONTACT_EMAIL)}`
    );
    if (!response.ok) return null;
    const payload = await response.json();
    const count = Number.parseInt(payload?.message?.["is-referenced-by-count"], 10);
    return Number.isFinite(count) ? count : null;
  };

  const hydrateCitationCounts = async () => {
    await seedCitationCountsFromStatic();
    if (citationHydrationPromise) return citationHydrationPromise;
    const candidates = entries.filter((entry) => entry.doi && entry.citationCount <= 0);
    if (!candidates.length) return Promise.resolve();

    const workers = 4;
    let cursor = 0;
    setBadgeStatus(badgeState, i18n.citationHydrating);
    citationHydrationPromise = Promise.all(
      Array.from({ length: workers }).map(async () => {
        while (cursor < candidates.length) {
          const currentIndex = cursor;
          cursor += 1;
          const target = candidates[currentIndex];
          try {
            let nextCount = target.citationCount;
            const crossrefCount = await fetchCrossrefCitationCount(target.doi);
            if (Number.isFinite(crossrefCount) && crossrefCount > nextCount) {
              nextCount = crossrefCount;
            }

            if (nextCount > target.citationCount) {
              target.citationCount = nextCount;
            }
          } catch {
            // Ignore individual DOI fetch failures and continue.
          }
        }
      })
    ).finally(() => {
      setBadgeStatus(badgeState, i18n.citationHydrated);
    });
    return citationHydrationPromise;
  };

  let lastRenderedEntries = [...entries];

  const applyFiltersAndRender = () => {
    const searchTerm = normalize(searchInput.value);
    const filters = getActiveFilters();
    const filtered = entries.filter((entry) => matchesFilters(entry, searchTerm, filters));
    const sorted = sortEntries(filtered);

    renderResultGroups(sorted);
    updateActiveCount(sorted.length);
    highlightSearch(searchTerm);
    updateDashboard(sorted);

    if (currentSort === "altmetric" && activeCountNode && sorted.every((entry) => entry.altmetricScore <= 0)) {
      activeCountNode.textContent = `${activeCountNode.textContent} | ${i18n.altmetricHint}`;
    }
    if (badgeState === "loaded") {
      refreshBadgeEmbeds();
    }

    lastRenderedEntries = sorted;
  };

  const syncHashWithSearch = () => {
    const value = searchInput.value.trim();
    const nextHash = value ? `#${encodeURIComponent(value)}` : "";
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
  };

  const onSearchInput = () => {
    clearTimeout(inputDebounceId);
    inputDebounceId = setTimeout(() => {
      syncHashWithSearch();
      applyFiltersAndRender();
      const normalizedSearch = normalize(searchInput.value);
      if (normalizedSearch !== lastTrackedSearch) {
        lastTrackedSearch = normalizedSearch;
        trackAnalyticsEvent("publications_search", {
          query_length: normalizedSearch.length,
        });
      }
    }, 250);
  };

  const resetFilters = () => {
    searchInput.value = "";
    defaultFacetConfig.forEach((facet) => {
      const select = document.getElementById(facet.id);
      if (select) select.value = "";
    });
    if (sortSelect) {
      sortSelect.value = "newest";
      currentSort = "newest";
    }
    syncHashWithSearch();
    applyFiltersAndRender();
    trackAnalyticsEvent("publications_filters_reset");
  };

  const initializeFromHash = () => {
    const hashValue = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (hashValue) {
      searchInput.value = hashValue;
    }
  };

  searchInput.addEventListener("input", onSearchInput);
  window.addEventListener("hashchange", () => {
    initializeFromHash();
    applyFiltersAndRender();
  });

  defaultFacetConfig.forEach((facet) => {
    const select = document.getElementById(facet.id);
    if (!select) return;
    select.addEventListener("change", () => {
      applyFiltersAndRender();
      trackAnalyticsEvent("publications_filter_change", {
        filter_name: facet.key,
        filter_value: select.value || "all",
      });
    });
  });

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      applyFiltersAndRender();

      if (isCrossrefCitationSort(currentSort)) {
        seedCitationCountsFromStatic().finally(() => {
          if (isCrossrefCitationSort(currentSort)) applyFiltersAndRender();
        });
        if (!citationHydrationStarted) {
          citationHydrationStarted = true;
          hydrateCitationCounts();
        }
        if (citationHydrationPromise) {
          citationHydrationPromise.finally(() => {
            if (isCrossrefCitationSort(currentSort)) applyFiltersAndRender();
          });
        }
      } else if (currentSort === "altmetric" && hasExternalAltmetricEmbeds && badgeState !== "loaded") {
        loadExternalBadges().finally(() => {
          if (currentSort === "altmetric") applyFiltersAndRender();
        });
      } else if (currentSort === "altmetric" && hasExternalAltmetricEmbeds) {
        parseAltmetricFromDom();
        scheduleAltmetricParseRefresh();
        applyFiltersAndRender();
      }

      trackAnalyticsEvent("publications_sort_change", {
        sort: currentSort,
      });
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetFilters);
  }

  if (badgeLoadButton) {
    badgeLoadButton.addEventListener("click", () => {
      trackAnalyticsEvent("publications_badges_load_click");
      loadExternalBadges();
    });
  }

  setBadgeStatus("idle");
  initializeFacets();
  initializeFromHash();
  seedCitationCountsFromStatic();
  applyFiltersAndRender();
  observeBadgesInViewport();
});
