(() => {
  const loadButtons = document.querySelectorAll(".ncbi-genome-load-btn[data-ncbi-load]");
  if (!loadButtons.length) {
    return;
  }

  const scriptId = "ncbi-sviewer-script";
  const scriptSrc = "https://www.ncbi.nlm.nih.gov/projects/sviewer/js/sviewer.js";
  let loadPromise = null;

  const loadViewerScript = () => {
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById(scriptId);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }

        existing.addEventListener(
          "load",
          () => {
            existing.dataset.loaded = "true";
            resolve();
          },
          { once: true }
        );
        existing.addEventListener("error", () => reject(new Error("Failed to load NCBI SeqViewer script")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = scriptSrc;
      script.async = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
          resolve();
        },
        { once: true }
      );
      script.addEventListener("error", () => reject(new Error("Failed to load NCBI SeqViewer script")), { once: true });
      document.head.appendChild(script);
    });

    return loadPromise;
  };

  const revealViewer = (viewerId) => {
    const viewer = document.getElementById(viewerId);
    if (!viewer) {
      return null;
    }

    viewer.hidden = false;
    return viewer;
  };

  const waitForSeqViewReady = () =>
    new Promise((resolve, reject) => {
      const timeoutMs = 15000;
      const intervalMs = 100;
      const start = Date.now();

      const poll = () => {
        if (window.SeqView && window.SeqView.App && typeof window.SeqView.App.findAppByDivId === "function") {
          resolve();
          return;
        }

        if (Date.now() - start > timeoutMs) {
          reject(new Error("NCBI SeqViewer initialization timed out"));
          return;
        }

        window.setTimeout(poll, intervalMs);
      };

      poll();
    });

  const ensureViewerLoaded = (viewerId) =>
    waitForSeqViewReady().then(() => {
      const existingApp = window.SeqView.App.findAppByDivId(viewerId);
      if (existingApp) {
        return;
      }

      const app = new window.SeqView.App(viewerId);
      app.load();
    });

  for (const button of loadButtons) {
    const viewerId = (button.dataset.ncbiLoad || "").trim();
    const fallbackMessage = button.parentElement && button.parentElement.querySelector("[data-ncbi-error]");
    if (!viewerId) {
      continue;
    }

    button.addEventListener("click", () => {
      const viewer = revealViewer(viewerId);
      if (!viewer) {
        return;
      }

      if (fallbackMessage) {
        fallbackMessage.hidden = true;
      }

      button.disabled = true;
      loadViewerScript()
        .then(() => ensureViewerLoaded(viewerId))
        .then(() => {
          button.remove();
        })
        .catch(() => {
          button.disabled = false;
          if (fallbackMessage) {
            fallbackMessage.hidden = false;
          }
        });
    });
  }
})();
