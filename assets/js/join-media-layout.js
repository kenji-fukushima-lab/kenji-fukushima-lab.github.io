(() => {
  const DEFAULT_ASPECT_THRESHOLD = 2.2;
  const SPLIT_SELECTOR = ".project-media-split";

  function applyMode(split, mode) {
    split.classList.remove("project-media-split--half", "project-media-split--double");

    if (mode === "half" || mode === "double") {
      split.classList.add(`project-media-split--${mode}`);
      split.dataset.mediaResolved = mode;
    } else {
      delete split.dataset.mediaResolved;
    }
  }

  function getAspectThreshold(split) {
    const value = Number.parseFloat(split.dataset.mediaAspectThreshold || "");
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_ASPECT_THRESHOLD;
  }

  function initializeAutoMode(split) {
    const media = split.querySelector(".project-media-split__media");
    if (!media) {
      return;
    }

    const images = media.querySelectorAll("img");
    if (images.length !== 1) {
      return;
    }

    const image = images[0];
    const threshold = getAspectThreshold(split);

    const updateMode = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        return;
      }

      const aspectRatio = image.naturalWidth / image.naturalHeight;
      applyMode(split, aspectRatio >= threshold ? "double" : "half");
      split.dataset.mediaAspectRatio = aspectRatio.toFixed(3);
    };

    if (image.complete && image.naturalWidth && image.naturalHeight) {
      updateMode();
      return;
    }

    image.addEventListener("load", updateMode, { once: true });
  }

  function initializeSplit(split) {
    const manualMode = split.dataset.mediaLayout;
    if (manualMode === "half" || manualMode === "double") {
      applyMode(split, manualMode);
      return;
    }

    initializeAutoMode(split);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(SPLIT_SELECTOR).forEach(initializeSplit);
  });
})();
