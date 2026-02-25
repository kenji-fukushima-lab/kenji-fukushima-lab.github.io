(() => {
  const aboutNodes = document.querySelectorAll(".repo-compact-about[data-repo-about]");
  if (!aboutNodes.length) {
    return;
  }

  const repoNodeMap = new Map();
  const repoFallbackMap = new Map();

  for (const node of aboutNodes) {
    const repo = (node.dataset.repoAbout || "").trim();
    if (!repo) {
      continue;
    }
    if (!repoNodeMap.has(repo)) {
      repoNodeMap.set(repo, []);
    }
    const fallback = (node.dataset.repoAboutDefault || "").trim();
    if (fallback && !repoFallbackMap.has(repo)) {
      repoFallbackMap.set(repo, fallback);
    }
    node.classList.add("is-loading");
    repoNodeMap.get(repo).push(node);
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

  const readCache = (repo) => {
    try {
      const raw = window.localStorage.getItem(`repo-about:${repo}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
      return typeof parsed.text === "string" ? parsed.text : "";
    } catch (_err) {
      return null;
    }
  };

  const writeCache = (repo, text) => {
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

  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  for (const repo of repoNodeMap.keys()) {
    const fallback = repoFallbackMap.get(repo) || "";
    if (fallback) {
      applyDescription(repo, fallback);
    }

    const cached = readCache(repo);
    if (cached !== null) {
      applyDescription(repo, cached);
      continue;
    }

    // Keep stable build-time fallback when no cache is available.
    if (fallback) {
      continue;
    }

    fetch(`https://api.github.com/repos/${repo}`, { headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const description = data && typeof data.description === "string" ? data.description : "";
        writeCache(repo, description);
        applyDescription(repo, description);
      })
      .catch((_err) => {
        applyDescription(repo, fallback);
      });
  }
})();
