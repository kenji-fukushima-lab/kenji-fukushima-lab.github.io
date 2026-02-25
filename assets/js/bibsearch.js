import { highlightSearchTerm } from "./highlight-search-term.js";

const normalize = (value) => (value ?? "").toString().trim().toLowerCase();

const parseNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueSorted = (items) => [...new Set(items.filter(Boolean))].sort((a, b) => a.localeCompare(b));

const splitDelimited = (value) =>
  normalize(value)
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);

const nameForDisplay = (value) => {
  const normalized = normalize(value);
  if (!normalized) return "";
  const [lastName, firstName] = normalized.split(",").map((part) => part.trim());
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const typeForDisplay = (value) =>
  normalize(value)
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const createElement = (tag, className = "") => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  return element;
};

const isJapanesePage = document.documentElement.lang.toLowerCase().startsWith("ja");
const LAB_MEMBER_FACET_VALUE = "__lab_member__";
const OTHER_FACET_VALUE = "__other__";

const i18n = {
  all: isJapanesePage ? "すべて" : "All",
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
  leadRoleLabel: isJapanesePage ? "lab memberがfirst/co-first/corresponding" : "Lab member as first/co-first/corresponding",
  otherRoleLabel: isJapanesePage ? "それ以外" : "Other",
  labMemberFacetOption: "lab member",
  otherFacetOption: "other",
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
  { id: "facet-article-type", key: "articleType", labeler: typeForDisplay },
  {
    id: "facet-first-author",
    key: "firstAuthor",
    labeler: nameForDisplay,
    fixedOptions: [
      { value: LAB_MEMBER_FACET_VALUE, label: i18n.labMemberFacetOption },
      { value: OTHER_FACET_VALUE, label: i18n.otherFacetOption },
    ],
  },
  {
    id: "facet-corresponding",
    key: "corresponding",
    labeler: nameForDisplay,
    isList: true,
    fixedOptions: [
      { value: LAB_MEMBER_FACET_VALUE, label: i18n.labMemberFacetOption },
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
      const articleType = normalize(publicationEntry.dataset.articleType);
      const citationCount = parseNumber(publicationEntry.dataset.citationCount);
      const altmetricScore = parseNumber(publicationEntry.dataset.altmetricScore);
      const doi = normalize(publicationEntry.dataset.doi);

      const labMemberSet = new Set(labMembers);
      let contributionScore = labMembers.length;
      if (firstAuthor && labMemberSet.has(firstAuthor)) contributionScore += 2;
      contributionScore += coFirst.filter((name) => labMemberSet.has(name)).length;
      contributionScore += corresponding.filter((name) => labMemberSet.has(name)).length;
      const hasLeadLabMemberRole =
        (firstAuthor && labMemberSet.has(firstAuthor)) ||
        coFirst.some((name) => labMemberSet.has(name)) ||
        corresponding.some((name) => labMemberSet.has(name));

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
        altmetricScore,
        contributionScore,
        leadRole: hasLeadLabMemberRole,
        doi,
      };
    })
    .filter(Boolean);

  const availableYears = entries.map((entry) => entry.year).filter((year) => Number.isInteger(year) && year > 0);
  const minYear = availableYears.length ? Math.min(...availableYears) : new Date().getFullYear();
  const maxYear = availableYears.length ? Math.max(...availableYears) : minYear;
  const fullYearRange = Array.from({ length: maxYear - minYear + 1 }, (_, offset) => (minYear + offset).toString());

  const resultsContainer = createElement("div", "publications-results");
  resultsContainer.id = "publications-results";
  publicationsRoot.querySelectorAll("h2.bibliography, ol.bibliography").forEach((node) => node.remove());
  publicationsRoot.appendChild(resultsContainer);

  let currentSort = sortSelect?.value || "newest";
  let badgeState = "idle";
  let badgeLoadPromise = null;
  let citationHydrationStarted = false;
  let citationHydrationPromise = null;
  let inputDebounceId = null;
  let lastTrackedSearch = "";
  let chartsReadyAttempts = 0;
  let charts = { byYear: null };

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

  const populateFacet = (selectId, values, labeler, prependOptions = []) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = i18n.all;
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
        populateFacet(facet.id, [], facet.labeler, facet.fixedOptions);
        return;
      }
      const values = facet.isList
        ? uniqueSorted(entries.flatMap((entry) => entry[facet.key]))
        : uniqueSorted(entries.map((entry) => (facet.key === "year" ? entry.year.toString() : entry[facet.key])));
      const sortableValues = facet.key === "year" ? values.sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)) : values;
      populateFacet(facet.id, sortableValues, facet.labeler, []);
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
    if (filters.firstAuthor) {
      if (filters.firstAuthor === LAB_MEMBER_FACET_VALUE) {
        if (!entry.firstAuthor || !entry.labMembers.includes(entry.firstAuthor)) return false;
      } else if (filters.firstAuthor === OTHER_FACET_VALUE) {
        if (!entry.firstAuthor || entry.labMembers.includes(entry.firstAuthor)) return false;
      } else if (entry.firstAuthor !== filters.firstAuthor) {
        return false;
      }
    }
    if (filters.corresponding) {
      if (filters.corresponding === LAB_MEMBER_FACET_VALUE) {
        if (!entry.corresponding.some((name) => entry.labMembers.includes(name))) return false;
      } else if (filters.corresponding === OTHER_FACET_VALUE) {
        if (!entry.corresponding.length || entry.corresponding.some((name) => entry.labMembers.includes(name))) return false;
      } else if (!entry.corresponding.includes(filters.corresponding)) {
        return false;
      }
    }
    return true;
  };

  const compareByNewest = (a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.index - b.index;
  };

  const sortEntries = (filteredEntries) => {
    const next = [...filteredEntries];
    if (currentSort === "citations") {
      next.sort((a, b) => {
        if (b.citationCount !== a.citationCount) return b.citationCount - a.citationCount;
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
    if (currentSort === "lab") {
      next.sort((a, b) => {
        if (b.contributionScore !== a.contributionScore) return b.contributionScore - a.contributionScore;
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
    heading.textContent = `${i18n.sortedResults} (${currentSort === "citations" ? "Citations" : currentSort === "altmetric" ? "Altmetric" : "Lab contribution"})`;
    const list = createElement("ol", "bibliography");
    sortedEntries.forEach((entry) => list.appendChild(entry.listItem));
    resultsContainer.append(heading, list);
  };

  const updateActiveCount = (visibleCount) => {
    if (!activeCountNode) return;
    activeCountNode.textContent = `${i18n.showing}: ${visibleCount} / ${entries.length}`;
  };

  const highlightSearch = (search) => {
    if (!CSS.highlights) return;
    highlightSearchTerm({
      search,
      selector: "#publications-results li",
    });
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
    const yearDatasets = [
      {
        label: i18n.leadRoleLabel,
        data: yearLeadValues,
        backgroundColor: palette.themeColor,
        borderColor: palette.themeColor,
        borderWidth: 1,
      },
      {
        label: i18n.otherRoleLabel,
        data: yearOtherValues,
        backgroundColor: palette.secondaryColor,
        borderColor: palette.secondaryColor,
        borderWidth: 1,
      },
    ];

    upsertChart("byYear", "pub-chart-year", "bar", yearLabels, yearDatasets, {
      scales: {
        x: {
          stacked: true,
          ticks: { color: palette.textColor },
          grid: { color: palette.dividerColor },
        },
        y: {
          stacked: true,
          ticks: { color: palette.textColor, precision: 0 },
          grid: { color: palette.dividerColor },
        },
      },
    });
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
    if (window.__dimensions_embed && typeof window.__dimensions_embed.addBadges === "function") {
      window.__dimensions_embed.addBadges();
    }
  };

  const parseAltmetricFromDom = () => {
    entries.forEach((entry) => {
      const badge = entry.listItem.querySelector(".altmetric-embed");
      if (!badge) return;
      const scoreText = badge.textContent || "";
      const score = parseNumber(scoreText.replace(/[^\d.]/g, ""));
      if (score > entry.altmetricScore) {
        entry.altmetricScore = score;
      }
    });
  };

  const loadExternalBadges = () => {
    if (badgeLoadPromise) return badgeLoadPromise;
    setBadgeStatus("loading");
    badgeLoadPromise = Promise.all([
      injectScript("pub-altmetric-script", "https://d1bxh8uas1mnw7.cloudfront.net/assets/embed.js"),
      injectScript("pub-dimensions-script", "https://badge.dimensions.ai/badge.js"),
    ])
      .then(() => {
        refreshBadgeEmbeds();
        parseAltmetricFromDom();
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

  const hydrateCitationCounts = async () => {
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
            const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(target.doi)}`);
            if (!response.ok) continue;
            const payload = await response.json();
            const count = Number.parseInt(payload?.message?.["is-referenced-by-count"], 10);
            if (Number.isFinite(count)) {
              target.citationCount = count;
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
    sortSelect.addEventListener("change", async () => {
      currentSort = sortSelect.value;
      if (currentSort === "citations" && !citationHydrationStarted) {
        citationHydrationStarted = true;
        await hydrateCitationCounts();
      }
      applyFiltersAndRender();
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
  applyFiltersAndRender();
  observeBadgesInViewport();
});
