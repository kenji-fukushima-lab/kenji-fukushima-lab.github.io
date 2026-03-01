(function () {
  "use strict";

  const normalize = (value) => (value ?? "").toString().trim().toLowerCase();

  document.addEventListener("DOMContentLoaded", () => {
    const PAGE_SIZE = 20;
    const blogRoot = document.querySelector(".blog-content");
    const list = blogRoot?.querySelector(".post-list");
    const searchInput = document.getElementById("blogsearch");
    const sortSelect = document.getElementById("blog-sort");
    const resetButton = document.getElementById("blog-reset-filters");
    const yearSelect = document.getElementById("blog-facet-year");
    const authorSelect = document.getElementById("blog-facet-author");
    const activeCountNode = document.getElementById("blog-active-count");
    const chartCanvas = document.getElementById("blog-chart-year");

    if (!blogRoot || !list || !searchInput || !sortSelect || !resetButton || !yearSelect || !authorSelect) {
      return;
    }

    const cards = Array.from(list.querySelectorAll("li.post-card"));
    if (!cards.length) return;

    const isJa = document.documentElement.lang.toLowerCase().startsWith("ja");
    const locale = isJa ? "ja" : "en";
    const i18n = {
      allYears: isJa ? "すべての年" : "All years",
      allAuthors: isJa ? "すべての投稿者" : "All authors",
      noResults: isJa ? "該当する記事がありません。" : "No matching posts.",
      showing: isJa ? "表示中" : "Showing",
      of: isJa ? "全" : "of",
      posts: isJa ? "件" : "posts",
      axisLabel: isJa ? "記事数" : "Number of posts",
      tooltipLabel: isJa ? "記事数" : "Posts",
      previous: isJa ? "前へ" : "Previous",
      next: isJa ? "次へ" : "Next",
      pageLabel: isJa ? "ページ" : "Page",
      paginationAria: isJa ? "ブログページネーション" : "Blog pagination",
    };

    const entries = cards.map((card, index) => {
      const year = Number.parseInt(card.dataset.year ?? "0", 10) || 0;
      const dateValue = Date.parse(card.dataset.date ?? "");
      const title = normalize(card.dataset.title);
      const bodyText = normalize(card.dataset.content);
      const cardText = normalize(card.textContent);
      const author = (card.dataset.author ?? "").toString().trim();
      return {
        index,
        card,
        year,
        dateMs: Number.isFinite(dateValue) ? dateValue : 0,
        author,
        authorKey: normalize(author),
        title,
        bodyText,
        searchText: `${title} ${cardText} ${bodyText}`,
      };
    });

    const availableYears = entries.map((entry) => entry.year).filter((year) => Number.isInteger(year) && year > 0);
    const minYear = availableYears.length ? Math.min(...availableYears) : new Date().getFullYear();
    const maxYear = availableYears.length ? Math.max(...availableYears) : minYear;
    const fullYearRange = Array.from({ length: maxYear - minYear + 1 }, (_, offset) => (minYear + offset).toString());

    const paginationNav = document.createElement("nav");
    paginationNav.className = "blog-pagination";
    paginationNav.setAttribute("aria-label", i18n.paginationAria);
    paginationNav.hidden = true;
    const paginationList = document.createElement("ul");
    paginationList.className = "pagination";
    paginationNav.appendChild(paginationList);
    list.insertAdjacentElement("afterend", paginationNav);

    const emptyState = document.createElement("p");
    emptyState.className = "blog-empty-state";
    emptyState.textContent = i18n.noResults;
    emptyState.hidden = true;
    paginationNav.insertAdjacentElement("afterend", emptyState);

    const populateSelect = (selectElement, values, allLabel) => {
      const previous = selectElement.value;
      selectElement.innerHTML = "";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = allLabel;
      selectElement.appendChild(defaultOption);

      values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
      });

      if (previous && values.includes(previous)) {
        selectElement.value = previous;
      }
    };

    populateSelect(
      yearSelect,
      [...new Set(entries.map((entry) => entry.year.toString()).filter(Boolean))].sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10)),
      i18n.allYears
    );

    const authorMap = new Map();
    entries.forEach((entry) => {
      if (!entry.authorKey) return;
      if (!authorMap.has(entry.authorKey)) authorMap.set(entry.authorKey, entry.author);
    });
    const authorPairs = Array.from(authorMap.entries()).sort((a, b) => a[1].localeCompare(b[1], locale));
    const authorCurrent = authorSelect.value;
    authorSelect.innerHTML = "";
    const authorDefault = document.createElement("option");
    authorDefault.value = "";
    authorDefault.textContent = i18n.allAuthors;
    authorSelect.appendChild(authorDefault);
    authorPairs.forEach(([key, label]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = label;
      authorSelect.appendChild(option);
    });
    if (authorCurrent && authorPairs.some(([key]) => key === authorCurrent)) {
      authorSelect.value = authorCurrent;
    }

    let chart = null;
    let currentPage = 1;

    const getChartPalette = () => {
      const rootStyle = getComputedStyle(document.documentElement);
      const resetButtonStyle = getComputedStyle(resetButton);
      const resetButtonColor = (resetButtonStyle.backgroundColor || "").trim();
      const fallbackThemeColor = rootStyle.getPropertyValue("--global-theme-color").trim() || "#2f7f75";
      const themeColor =
        resetButtonColor && resetButtonColor !== "transparent" && resetButtonColor !== "rgba(0, 0, 0, 0)" ? resetButtonColor : fallbackThemeColor;
      return {
        themeColor,
        textColor: rootStyle.getPropertyValue("--global-text-color").trim() || "#334155",
        dividerColor: rootStyle.getPropertyValue("--global-divider-color").trim() || "#cbd5e1",
      };
    };

    const updateCountLabel = (shownCount, totalCount) => {
      if (!activeCountNode) return;
      if (isJa) {
        activeCountNode.textContent = `${i18n.showing} ${shownCount}${i18n.posts} / ${i18n.of}${totalCount}${i18n.posts}`;
        return;
      }
      activeCountNode.textContent = `${i18n.showing} ${shownCount} ${i18n.of} ${totalCount} ${i18n.posts}`;
    };

    const createPaginationButton = (label, page, { disabled = false, active = false, ariaLabel = "" } = {}) => {
      const pageItem = document.createElement("li");
      pageItem.className = "page-item";
      if (disabled) pageItem.classList.add("disabled");
      if (active) pageItem.classList.add("active");

      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-link";
      button.textContent = label;
      button.dataset.page = page.toString();
      if (disabled) {
        button.disabled = true;
        button.setAttribute("aria-disabled", "true");
      }
      if (active) button.setAttribute("aria-current", "page");
      if (ariaLabel) button.setAttribute("aria-label", ariaLabel);

      pageItem.appendChild(button);
      return pageItem;
    };

    const createEllipsisItem = () => {
      const pageItem = document.createElement("li");
      pageItem.className = "page-item disabled";
      const span = document.createElement("span");
      span.className = "page-link";
      span.textContent = "...";
      span.setAttribute("aria-hidden", "true");
      pageItem.appendChild(span);
      return pageItem;
    };

    const updatePagination = (totalFilteredCount) => {
      const totalPages = Math.max(1, Math.ceil(totalFilteredCount / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      paginationList.innerHTML = "";

      if (totalFilteredCount === 0 || totalPages === 1) {
        paginationNav.hidden = true;
        return totalPages;
      }

      paginationNav.hidden = false;
      paginationList.appendChild(
        createPaginationButton(i18n.previous, Math.max(1, currentPage - 1), {
          disabled: currentPage === 1,
          ariaLabel: i18n.previous,
        })
      );

      const maxPageButtons = 7;
      let start = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
      let end = Math.min(totalPages, start + maxPageButtons - 1);
      start = Math.max(1, end - maxPageButtons + 1);

      if (start > 1) {
        paginationList.appendChild(createPaginationButton("1", 1, { active: currentPage === 1, ariaLabel: `${i18n.pageLabel} 1` }));
        if (start > 2) paginationList.appendChild(createEllipsisItem());
      }

      for (let page = start; page <= end; page += 1) {
        paginationList.appendChild(
          createPaginationButton(page.toString(), page, {
            active: page === currentPage,
            ariaLabel: `${i18n.pageLabel} ${page}`,
          })
        );
      }

      if (end < totalPages) {
        if (end < totalPages - 1) paginationList.appendChild(createEllipsisItem());
        paginationList.appendChild(
          createPaginationButton(totalPages.toString(), totalPages, {
            active: currentPage === totalPages,
            ariaLabel: `${i18n.pageLabel} ${totalPages}`,
          })
        );
      }

      paginationList.appendChild(
        createPaginationButton(i18n.next, Math.min(totalPages, currentPage + 1), {
          disabled: currentPage === totalPages,
          ariaLabel: i18n.next,
        })
      );

      return totalPages;
    };

    const updateYearChart = (filteredEntries) => {
      if (!chartCanvas || typeof window.Chart !== "function") return;

      const counts = new Map(fullYearRange.map((yearLabel) => [yearLabel, 0]));
      filteredEntries.forEach((entry) => {
        const key = entry.year.toString();
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
      });

      const labels = fullYearRange;
      const values = labels.map((label) => counts.get(label) ?? 0);
      const palette = getChartPalette();
      const datasets = [
        {
          label: i18n.tooltipLabel,
          data: values,
          backgroundColor: palette.themeColor,
          borderColor: palette.themeColor,
          borderWidth: 0,
        },
      ];

      if (chart) {
        chart.data.labels = labels;
        chart.data.datasets = datasets;
        if (chart.options?.scales?.x?.ticks) chart.options.scales.x.ticks.color = palette.textColor;
        if (chart.options?.scales?.x?.grid) chart.options.scales.x.grid.color = palette.dividerColor;
        if (chart.options?.scales?.x) chart.options.scales.x.stacked = false;
        if (chart.options?.scales?.y?.ticks) chart.options.scales.y.ticks.color = palette.textColor;
        if (chart.options?.scales?.y?.grid) chart.options.scales.y.grid.color = palette.dividerColor;
        if (chart.options?.scales?.y) chart.options.scales.y.stacked = false;
        if (chart.options?.scales?.y?.ticks) chart.options.scales.y.ticks.stepSize = 1;
        if (chart.options?.scales?.y?.title) chart.options.scales.y.title.color = palette.textColor;
        if (chart.options?.plugins?.legend?.labels) {
          chart.options.plugins.legend.labels.color = palette.textColor;
        }
        chart.update();
        return;
      }

      chart = new window.Chart(chartCanvas, {
        type: "bar",
        data: {
          labels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
              labels: { color: palette.textColor },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = Number(context.raw) || 0;
                  return `${i18n.tooltipLabel}: ${value}`;
                },
              },
            },
          },
          scales: {
            x: {
              stacked: false,
              ticks: {
                color: palette.textColor,
                autoSkip: true,
                maxRotation: 0,
                minRotation: 0,
              },
              grid: { color: palette.dividerColor },
            },
            y: {
              stacked: false,
              beginAtZero: true,
              ticks: { color: palette.textColor, precision: 0, stepSize: 1 },
              title: {
                display: true,
                text: i18n.axisLabel,
                color: palette.textColor,
              },
              grid: { color: palette.dividerColor },
            },
          },
        },
      });
    };

    const getActiveFilters = () => ({
      query: normalize(searchInput.value),
      year: normalize(yearSelect.value),
      author: normalize(authorSelect.value),
      sort: normalize(sortSelect.value) || "newest",
    });

    const matchesFilters = (entry, filters) => {
      if (filters.year && entry.year.toString() !== filters.year) return false;
      if (filters.author && entry.authorKey !== filters.author) return false;
      if (filters.query && !entry.searchText.includes(filters.query) && !entry.title.includes(filters.query)) return false;
      return true;
    };

    const sortEntries = (entriesToSort, sortValue) => {
      const sorted = [...entriesToSort];
      if (sortValue === "oldest") {
        sorted.sort((a, b) => a.dateMs - b.dateMs || a.index - b.index);
      } else if (sortValue === "title") {
        sorted.sort((a, b) => a.title.localeCompare(b.title, locale) || b.dateMs - a.dateMs);
      } else {
        sorted.sort((a, b) => b.dateMs - a.dateMs || a.index - b.index);
      }
      return sorted;
    };

    let searchDebounceTimer = null;
    let chartRetryAttempts = 0;

    const render = (resetPage = false) => {
      if (resetPage) currentPage = 1;
      const filters = getActiveFilters();
      const filtered = entries.filter((entry) => matchesFilters(entry, filters));
      const sorted = sortEntries(filtered, filters.sort);
      const totalPages = updatePagination(sorted.length);
      if (currentPage > totalPages) currentPage = totalPages;
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const pageEntries = sorted.slice(startIndex, startIndex + PAGE_SIZE);
      const visibleIndexSet = new Set(pageEntries.map((entry) => entry.index));

      entries.forEach((entry) => {
        const visible = visibleIndexSet.has(entry.index);
        entry.card.hidden = !visible;
        entry.card.style.display = visible ? "" : "none";
      });

      pageEntries.forEach((entry) => list.appendChild(entry.card));

      emptyState.hidden = sorted.length > 0;
      updateCountLabel(sorted.length, entries.length);

      const updateChartWithRetry = () => {
        if (typeof window.Chart === "function") {
          updateYearChart(sorted);
          return;
        }
        if (chartRetryAttempts > 25) return;
        chartRetryAttempts += 1;
        window.setTimeout(updateChartWithRetry, 120);
      };

      chartRetryAttempts = 0;
      updateChartWithRetry();
    };

    searchInput.addEventListener("input", () => {
      if (searchDebounceTimer) window.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = window.setTimeout(() => render(true), 120);
    });
    sortSelect.addEventListener("change", () => render(true));
    yearSelect.addEventListener("change", () => render(true));
    authorSelect.addEventListener("change", () => render(true));

    paginationList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-page]");
      if (!button || button.disabled) return;
      const nextPage = Number.parseInt(button.dataset.page ?? "0", 10);
      if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === currentPage) return;
      currentPage = nextPage;
      render();
    });

    resetButton.addEventListener("click", () => {
      searchInput.value = "";
      sortSelect.value = "newest";
      yearSelect.value = "";
      authorSelect.value = "";
      render(true);
    });

    const themeObserver = new MutationObserver(() => {
      render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    render(true);
  });
})();
