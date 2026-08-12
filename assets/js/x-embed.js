document.addEventListener("DOMContentLoaded", () => {
  const embeds = Array.from(document.querySelectorAll("[data-x-embed]"));
  if (embeds.length === 0) {
    return;
  }

  const widgetsUrl = "https://platform.twitter.com/widgets.js";
  let widgetsPromise;

  function loadWidgets() {
    if (window.twttr?.widgets?.load) {
      return Promise.resolve(window.twttr);
    }

    if (widgetsPromise) {
      return widgetsPromise;
    }

    widgetsPromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-x-widgets], script[src="https://platform.twitter.com/widgets.js"]');

      const handleLoad = () => {
        if (window.twttr?.widgets?.load) {
          resolve(window.twttr);
          return;
        }
        reject(new Error("X widgets loaded without a usable API"));
      };

      const handleError = () => reject(new Error("X widgets failed to load"));

      const shouldAppend = !script;
      if (shouldAppend) {
        script = document.createElement("script");
        script.async = true;
        script.src = widgetsUrl;
        script.dataset.xWidgets = "true";
      }

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", handleError, { once: true });
      if (shouldAppend) {
        document.head.appendChild(script);
      }
    });

    return widgetsPromise;
  }

  function renderEmbed(embed) {
    if (embed.dataset.xEmbedState !== "pending") {
      return;
    }

    embed.dataset.xEmbedState = "loading";
    loadWidgets()
      .then((twttr) => twttr.widgets.load(embed))
      .then(() => {
        embed.dataset.xEmbedState = "loaded";
      })
      .catch(() => {
        embed.dataset.xEmbedState = "failed";
      });
  }

  if (!("IntersectionObserver" in window)) {
    embeds.forEach(renderEmbed);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        observer.unobserve(entry.target);
        renderEmbed(entry.target);
      });
    },
    { rootMargin: "400px 0px" }
  );

  embeds.forEach((embed) => observer.observe(embed));
});
