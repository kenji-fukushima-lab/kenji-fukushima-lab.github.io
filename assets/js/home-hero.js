(() => {
  const GALLERY_SELECTOR = "[data-home-hero]";
  const MOBILE_MEDIA_QUERY = "(max-width: 575px)";
  const TABLET_MEDIA_QUERY = "(max-width: 960px)";
  const FADE_OUT_DELAY = 220;

  function positiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  function randomInteger(maximum) {
    if (maximum <= 1) {
      return 0;
    }

    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      const randomValues = new Uint32Array(1);
      window.crypto.getRandomValues(randomValues);
      return randomValues[0] % maximum;
    }

    return Math.floor(Math.random() * maximum);
  }

  function shuffle(values) {
    const shuffled = values.slice();

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInteger(index + 1);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }

  function readImages(root) {
    const source = root.querySelector("[data-home-hero-images]");

    if (!source) {
      return [];
    }

    try {
      const images = JSON.parse(source.textContent || "[]");

      if (!Array.isArray(images)) {
        return [];
      }

      return images
        .map((image, index) => {
          if (!image || typeof image.src !== "string" || image.src.trim() === "") {
            return null;
          }

          return {
            id: String(index) + ":" + image.src,
            mobileSrc: typeof image.mobileSrc === "string" && image.mobileSrc.trim() !== "" ? image.mobileSrc : null,
            src: image.src,
          };
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function sourceForImage(image, isMobile) {
    return isMobile && image.mobileSrc ? image.mobileSrc : image.src;
  }

  function createTile(image, isMobile) {
    const tile = document.createElement("div");
    tile.className = "home-hero-gallery__tile";

    const element = document.createElement("img");
    element.alt = "";
    element.decoding = "async";
    element.loading = "eager";
    element.src = sourceForImage(image, isMobile);

    tile.appendChild(element);
    return tile;
  }

  function mediaChangeListener(mediaQuery, callback) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", callback);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(callback);
    }
  }

  function initializeGallery(root) {
    if (root.dataset.homeHeroInitialized === "true") {
      return;
    }

    root.dataset.homeHeroInitialized = "true";

    const grid = root.querySelector("[data-home-hero-grid]");
    const images = readImages(root);

    if (!grid || images.length === 0) {
      root.setAttribute("aria-busy", "false");
      return;
    }

    const mobileMedia = window.matchMedia(MOBILE_MEDIA_QUERY);
    const tabletMedia = window.matchMedia(TABLET_MEDIA_QUERY);
    const desktopCount = positiveInteger(root.dataset.desktopCount, 14);
    const tabletCount = positiveInteger(root.dataset.tabletCount, 8);
    const mobileCount = positiveInteger(root.dataset.mobileCount, 6);
    const initialDelay = positiveInteger(root.dataset.initialDelay, 3500);
    const swapInterval = positiveInteger(root.dataset.swapInterval, 2800);
    let displayedImages = [];
    let pendingSlots = new Set();
    let renderGeneration = 0;
    let isMobile = mobileMedia.matches;

    function imageCount() {
      if (mobileMedia.matches) {
        return Math.min(mobileCount, images.length);
      }

      if (tabletMedia.matches) {
        return Math.min(tabletCount, images.length);
      }

      return Math.min(desktopCount, images.length);
    }

    function render() {
      renderGeneration += 1;
      isMobile = mobileMedia.matches;
      displayedImages = shuffle(images).slice(0, imageCount());
      pendingSlots = new Set();
      grid.replaceChildren(...displayedImages.map((image) => createTile(image, isMobile)));
      root.setAttribute("aria-busy", "false");
    }

    function replacementCandidates(slot) {
      const displayedIds = new Set(displayedImages.map((image) => image.id));
      const currentImage = displayedImages[slot];

      return images.filter((image) => !displayedIds.has(image.id) && (!currentImage || image.id !== currentImage.id));
    }

    function swapOneTile() {
      if (document.hidden || displayedImages.length === 0) {
        return;
      }

      const availableSlots = displayedImages.map((image, slot) => slot).filter((slot) => !pendingSlots.has(slot));

      if (availableSlots.length === 0) {
        return;
      }

      const slot = availableSlots[randomInteger(availableSlots.length)];
      const candidates = replacementCandidates(slot);

      if (candidates.length === 0) {
        return;
      }

      const nextImage = candidates[randomInteger(candidates.length)];
      const nextSource = sourceForImage(nextImage, isMobile);
      const tile = grid.children[slot];
      const currentElement = tile && tile.querySelector("img");

      if (!currentElement) {
        return;
      }

      const generation = renderGeneration;
      pendingSlots.add(slot);

      const preload = new window.Image();
      preload.onload = () => {
        pendingSlots.delete(slot);

        if (generation !== renderGeneration) {
          return;
        }

        displayedImages[slot] = nextImage;
        currentElement.classList.add("is-changing");

        window.setTimeout(() => {
          if (generation !== renderGeneration) {
            return;
          }

          currentElement.src = nextSource;
          window.requestAnimationFrame(() => {
            currentElement.classList.remove("is-changing");
          });
        }, FADE_OUT_DELAY);
      };
      preload.onerror = () => {
        pendingSlots.delete(slot);
      };
      preload.src = nextSource;
    }

    render();
    mediaChangeListener(mobileMedia, render);
    mediaChangeListener(tabletMedia, render);

    window.setTimeout(() => {
      swapOneTile();
      window.setInterval(swapOneTile, swapInterval);
    }, initialDelay);
  }

  function initialize() {
    document.querySelectorAll(GALLERY_SELECTOR).forEach(initializeGallery);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
