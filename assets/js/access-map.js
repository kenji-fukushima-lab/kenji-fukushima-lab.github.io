document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-access-map]").forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        let source;
        try {
          source = new URL(button.dataset.mapSrc, window.location.href);
        } catch {
          return;
        }
        if (source.protocol !== "https:" || source.hostname !== "www.google.com") {
          return;
        }

        const map = document.createElement("iframe");
        map.className = "access-map";
        map.title = button.dataset.mapTitle || "Google Map";
        map.src = source.href;
        map.allowFullscreen = true;
        map.referrerPolicy = "no-referrer-when-downgrade";
        button.replaceWith(map);
      },
      { once: true }
    );
  });
});
