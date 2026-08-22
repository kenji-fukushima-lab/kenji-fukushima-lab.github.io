(() => {
  const aboutNodes = document.querySelectorAll(".repo-compact-about[data-repo-about]");
  const statNodes = document.querySelectorAll(".repo-compact-stat[data-repo-stat][data-repo-stat-repository]");
  if (!aboutNodes.length && !statNodes.length) {
    return;
  }

  const repoNodeMap = new Map();
  const repoFallbackMap = new Map();
  const repoStatNodeMap = new Map();

  const addNode = (map, repo, node) => {
    if (!map.has(repo)) {
      map.set(repo, []);
    }
    map.get(repo).push(node);
  };

  for (const node of aboutNodes) {
    const repo = (node.dataset.repoAbout || "").trim();
    if (!repo) {
      continue;
    }
    const fallback = (node.dataset.repoAboutDefault || "").trim();
    if (fallback && !repoFallbackMap.has(repo)) {
      repoFallbackMap.set(repo, fallback);
    }
    node.classList.add("is-loading");
    addNode(repoNodeMap, repo, node);
  }

  for (const node of statNodes) {
    const repo = (node.dataset.repoStatRepository || "").trim();
    const stat = (node.dataset.repoStat || "").trim();
    if (!repo || !stat) {
      continue;
    }
    node.classList.add("is-loading");
    addNode(repoStatNodeMap, repo, node);
  }

  const applyDescription = (repo, description) => {
    const text = (description || "").trim();
    const nodes = repoNodeMap.get(repo) || [];

    for (const node of nodes) {
      node.classList.remove("is-loading");
      if (text) {
        node.textContent = text;
        node.classList.remove("is-empty");
        node.title = text;
      } else {
        node.textContent = "";
        node.classList.add("is-empty");
        node.removeAttribute("title");
      }
    }
  };

  const locale = "en";
  const numberFormat = new Intl.NumberFormat(locale);
  const compactNumberFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    notation: "compact",
  });
  const relativeTimeFormat = typeof Intl.RelativeTimeFormat === "function" ? new Intl.RelativeTimeFormat(locale, { numeric: "auto" }) : null;

  const formatCount = (count) => {
    if (!Number.isFinite(count)) {
      return "--";
    }
    return Math.abs(count) < 1000 ? numberFormat.format(count) : compactNumberFormat.format(count);
  };

  const formatRelativeDate = (dateValue) => {
    const time = Date.parse(dateValue);
    if (!Number.isFinite(time)) {
      return "--";
    }

    if (!relativeTimeFormat) {
      return new Date(time).toLocaleDateString(locale);
    }

    const deltaSeconds = Math.round((time - Date.now()) / 1000);
    const units = [
      ["year", 365 * 24 * 60 * 60],
      ["month", 30 * 24 * 60 * 60],
      ["week", 7 * 24 * 60 * 60],
      ["day", 24 * 60 * 60],
      ["hour", 60 * 60],
      ["minute", 60],
    ];

    for (const [unit, seconds] of units) {
      if (Math.abs(deltaSeconds) >= seconds) {
        return relativeTimeFormat.format(Math.round(deltaSeconds / seconds), unit);
      }
    }

    return relativeTimeFormat.format(0, "second");
  };

  const statText = (stat, data) => {
    if (!data || typeof data !== "object") {
      return "--";
    }

    if (stat === "stars") {
      return formatCount(Number(data.stargazers_count));
    }
    if (stat === "forks") {
      return formatCount(Number(data.forks_count));
    }
    if (stat === "commits") {
      return formatRelativeDate(data.pushed_at);
    }
    if (stat === "issues") {
      return formatCount(Number(data.open_issues_count));
    }

    return "--";
  };

  const refreshRelativeDates = () => {
    for (const node of statNodes) {
      if (node.dataset.repoStat !== "commits") {
        continue;
      }

      const dateValue = node.dataset.repoStatDate;
      const valueNode = node.querySelector("[data-repo-stat-value]");
      if (dateValue && valueNode) {
        valueNode.textContent = formatRelativeDate(dateValue);
      }
    }
  };

  const applyRepoStats = (repo, data) => {
    const nodes = repoStatNodeMap.get(repo) || [];

    for (const node of nodes) {
      const valueNode = node.querySelector("[data-repo-stat-value]");
      node.classList.remove("is-loading");
      if (valueNode) {
        if (node.dataset.repoStat === "commits") {
          const dateValue = data && typeof data.pushed_at === "string" ? data.pushed_at : "";
          if (dateValue) {
            node.dataset.repoStatDate = dateValue;
          } else {
            delete node.dataset.repoStatDate;
          }
        }
        valueNode.textContent = statText(node.dataset.repoStat, data);
      }
    }
  };

  if (Array.from(statNodes).some((node) => node.dataset.repoStat === "commits")) {
    window.setInterval(refreshRelativeDates, 60 * 1000);
    window.addEventListener("pageshow", refreshRelativeDates);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        refreshRelativeDates();
      }
    });
  }

  const readCachePayload = (key) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  };

  const readAboutCache = (repo) => {
    const parsed = readCachePayload(`repo-about:${repo}`);
    return parsed && typeof parsed.text === "string" ? parsed.text : null;
  };

  const writeAboutCache = (repo, text) => {
    try {
      const payload = {
        text: text || "",
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
      };
      window.localStorage.setItem(`repo-about:${repo}`, JSON.stringify(payload));
    } catch (_err) {
      // Ignore storage errors (private mode / quota / disabled storage).
    }
  };

  const readRepoCache = (repo) => {
    const parsed = readCachePayload(`repo-meta:${repo}`);
    return parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : null;
  };

  const writeRepoCache = (repo, data) => {
    try {
      const payload = {
        data,
        exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
      };
      window.localStorage.setItem(`repo-meta:${repo}`, JSON.stringify(payload));
    } catch (_err) {
      // Ignore storage errors (private mode / quota / disabled storage).
    }
  };

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const repoRequestMap = new Map();

  const fetchRepo = (repo) => {
    const cached = readRepoCache(repo);
    if (cached) {
      return Promise.resolve(cached);
    }

    if (!repoRequestMap.has(repo)) {
      repoRequestMap.set(
        repo,
        fetch(`https://api.github.com/repos/${repo}`, { headers })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`GitHub API returned ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            writeRepoCache(repo, data);
            return data;
          })
      );
    }

    return repoRequestMap.get(repo);
  };

  const repos = new Set([...repoNodeMap.keys(), ...repoStatNodeMap.keys()]);
  const loadButton = document.querySelector("[data-repo-stats-load]");
  const loadStatus = document.querySelector("[data-repo-stats-status]");
  let shouldLoadLiveData = false;

  for (const repo of repos) {
    const fallback = repoFallbackMap.get(repo) || "";
    if (fallback) {
      applyDescription(repo, fallback);
    }

    const cachedAbout = readAboutCache(repo);
    if (cachedAbout !== null) {
      applyDescription(repo, cachedAbout);
    }

    const cachedRepo = readRepoCache(repo);
    if (cachedRepo) {
      if (!fallback && cachedAbout === null) {
        const description = typeof cachedRepo.description === "string" ? cachedRepo.description : "";
        applyDescription(repo, description);
      }
      if (repoStatNodeMap.has(repo)) {
        applyRepoStats(repo, cachedRepo);
      }
    } else if (repoStatNodeMap.has(repo)) {
      applyRepoStats(repo, null);
      shouldLoadLiveData = true;
    }
  }

  const loadLiveData = async () => {
    if (!loadButton) return;
    loadButton.disabled = true;
    for (const node of statNodes) node.classList.add("is-loading");
    if (loadStatus) loadStatus.textContent = loadButton.dataset.loadingLabel || "Loading GitHub statistics…";

    const results = await Promise.allSettled(
      [...repos].map(async (repo) => {
        const data = await fetchRepo(repo);
        const fallback = repoFallbackMap.get(repo) || "";
        const cachedAbout = readAboutCache(repo);
        if (repoNodeMap.has(repo) && !fallback && cachedAbout === null) {
          const description = data && typeof data.description === "string" ? data.description : "";
          writeAboutCache(repo, description);
          applyDescription(repo, description);
        }
        if (repoStatNodeMap.has(repo)) applyRepoStats(repo, data);
      })
    );

    const failures = results.filter((result) => result.status === "rejected").length;
    if (failures) {
      for (const [repo, nodes] of repoStatNodeMap) {
        if (nodes.some((node) => node.classList.contains("is-loading"))) applyRepoStats(repo, null);
      }
    }
    if (loadStatus) {
      loadStatus.textContent = failures
        ? loadButton.dataset.errorLabel || "Some GitHub statistics could not be loaded."
        : loadButton.dataset.loadedLabel || "GitHub statistics loaded.";
    }
    loadButton.disabled = false;
  };

  loadButton?.addEventListener("click", loadLiveData);
  if (shouldLoadLiveData) loadLiveData();
})();
