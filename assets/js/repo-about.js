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

  const cacheTtlMs = 24 * 60 * 60 * 1000;

  const dataSource = (data, fallbackTimestamp = NaN) => {
    if (!data || typeof data !== "object") return null;
    const fetchedAt = typeof data.fetched_at === "string" ? Date.parse(data.fetched_at) : fallbackTimestamp;
    const timestamp = Number.isFinite(fetchedAt) ? fetchedAt : 0;
    return {
      data,
      fresh: Number.isFinite(fetchedAt) && Date.now() - fetchedAt <= cacheTtlMs,
      timestamp,
    };
  };

  const staticRepoMap = new Map();
  for (const node of document.querySelectorAll(".repo-compact[data-repo-repository][data-repo-static]")) {
    const repo = (node.dataset.repoRepository || "").trim();
    if (!repo) continue;
    try {
      const data = JSON.parse(node.dataset.repoStatic);
      const source = dataSource(data);
      if (source) staticRepoMap.set(repo, source);
    } catch (_err) {
      // Ignore malformed generated data and use the browser cache or live API.
    }
  }

  const readRepoCache = (repo) => {
    try {
      const raw = window.localStorage.getItem(`repo-meta:${repo}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") return null;
      const fallbackTimestamp = typeof parsed.exp === "number" ? parsed.exp - cacheTtlMs : NaN;
      return dataSource(parsed.data, fallbackTimestamp);
    } catch (_err) {
      return null;
    }
  };

  const writeRepoCache = (repo, data) => {
    try {
      const payload = {
        data,
        exp: Date.now() + cacheTtlMs,
      };
      window.localStorage.setItem(`repo-meta:${repo}`, JSON.stringify(payload));
    } catch (_err) {
      // Ignore storage errors (private mode / quota / disabled storage).
    }
  };

  const newestSource = (...sources) =>
    sources.filter(Boolean).reduce((newest, source) => (!newest || source.timestamp > newest.timestamp ? source : newest), null);

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const repoRequestMap = new Map();
  const retryTimes = new Map();
  const retryTime = (key) => {
    try {
      return Math.max(retryTimes.get(key) || 0, Number(window.localStorage.getItem(`repo-meta-retry:${key}`)) || 0);
    } catch {
      return retryTimes.get(key) || 0;
    }
  };
  const deferRetry = (key, until) => {
    retryTimes.set(key, Math.max(retryTime(key), until));
    try {
      window.localStorage.setItem(`repo-meta-retry:${key}`, String(retryTimes.get(key)));
    } catch {
      // The in-memory cooldown still applies when storage is unavailable.
    }
  };

  const requestRepo = async (repo) => {
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = window.setTimeout(() => {
          controller.abort();
          reject(new Error("GitHub statistics request timed out"));
        }, 8000);
      });
      const request = (async () => {
        const response = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal: controller.signal });
        if (!response.ok) {
          if (response.status === 403 || response.status === 429) {
            const retryHeader = response.headers.get("Retry-After");
            const seconds = Number(retryHeader);
            const retryAfter = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retryHeader) || 0;
            const reset = Number(response.headers.get("X-RateLimit-Reset")) * 1000 || 0;
            deferRetry("github", Math.min(Date.now() + cacheTtlMs, Math.max(Date.now() + 5 * 60_000, retryAfter, reset)));
          }
          throw new Error(`GitHub API returned ${response.status}`);
        }
        const data = await response.json();
        const fetchedData = { ...data, fetched_at: new Date().toISOString() };
        writeRepoCache(repo, fetchedData);
        return fetchedData;
      })();
      return await Promise.race([request, timeout]);
    } finally {
      window.clearTimeout(timer);
    }
  };

  const fetchRepo = (repo) => {
    const cached = readRepoCache(repo);
    if (cached?.fresh) return Promise.resolve(cached.data);
    if (Math.max(retryTime("github"), retryTime(repo)) > Date.now()) return Promise.reject(new Error("GitHub statistics retry is deferred"));

    if (!repoRequestMap.has(repo)) {
      const request = requestRepo(repo)
        .catch((error) => {
          deferRetry(repo, Date.now() + 60_000);
          throw error;
        })
        .finally(() => repoRequestMap.delete(repo));
      repoRequestMap.set(repo, request);
    }
    return repoRequestMap.get(repo);
  };

  const repos = new Set([...repoNodeMap.keys(), ...repoStatNodeMap.keys()]);
  const loadStatus = document.querySelector("[data-repo-stats-status]");
  const autoRefreshRepos = new Set();

  for (const repo of repos) {
    const fallback = repoFallbackMap.get(repo) || "";
    if (fallback) {
      applyDescription(repo, fallback);
    }

    const source = newestSource(readRepoCache(repo), staticRepoMap.get(repo));
    if (source) {
      if (!fallback) {
        const description = typeof source.data.description === "string" ? source.data.description : "";
        applyDescription(repo, description);
      }
      if (repoStatNodeMap.has(repo)) {
        applyRepoStats(repo, source.data);
      }
    } else if (repoStatNodeMap.has(repo)) {
      applyRepoStats(repo, null);
    }

    if (repoStatNodeMap.has(repo) && !source?.fresh) autoRefreshRepos.add(repo);
  }

  const setRepoLoading = (repo, loading) => {
    for (const node of repoStatNodeMap.get(repo) || []) node.classList.toggle("is-loading", loading);
  };

  const loadLiveData = async ({ repositories = [...repos] } = {}) => {
    if (!repositories.length) return;
    const targetRepos = [...new Set(repositories)].filter((repo) => repos.has(repo));
    if (!targetRepos.length) return;

    for (const repo of targetRepos) setRepoLoading(repo, true);
    if (loadStatus) loadStatus.textContent = loadStatus.dataset.loadingLabel || "Loading GitHub statistics…";

    const results = [];
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(3, targetRepos.length) }, async () => {
        while (cursor < targetRepos.length) {
          const repo = targetRepos[cursor++];
          try {
            const data = await fetchRepo(repo);
            const fallback = repoFallbackMap.get(repo) || "";
            if (repoNodeMap.has(repo) && !fallback) {
              const description = data && typeof data.description === "string" ? data.description : "";
              applyDescription(repo, description);
            }
            if (repoStatNodeMap.has(repo)) applyRepoStats(repo, data);
            results.push(true);
          } catch (_err) {
            setRepoLoading(repo, false);
            results.push(false);
          }
        }
      })
    );

    const failures = results.filter((result) => !result).length;
    if (loadStatus) {
      loadStatus.textContent = failures
        ? loadStatus.dataset.errorLabel || "Some GitHub statistics could not be loaded."
        : loadStatus.dataset.loadedLabel || "GitHub statistics loaded.";
    }
  };

  if (autoRefreshRepos.size) loadLiveData({ repositories: [...autoRefreshRepos] });
})();
