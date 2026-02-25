(() => {
  const trimText = (value) => (value || "").replace(/\s+/g, " ").trim();

  const sendEvent = (eventName, params = {}) => {
    if (!eventName) return;
    if (typeof window.trackSiteEvent === "function") {
      window.trackSiteEvent(eventName, params);
      return;
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...params });
  };

  const normalizeLabel = (link) => {
    const fromData = trimText(link.dataset.analyticsLabel);
    if (fromData) return fromData.slice(0, 120);

    const fromAria = trimText(link.getAttribute("aria-label"));
    if (fromAria) return fromAria.slice(0, 120);

    return trimText(link.textContent).slice(0, 120) || "(no label)";
  };

  const isExternalUrl = (urlObject) => {
    if (!urlObject) return false;
    if (!/^https?:$/.test(urlObject.protocol)) return false;
    return urlObject.origin !== window.location.origin;
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    let parsed;
    try {
      parsed = new URL(href, window.location.href);
    } catch (_error) {
      return;
    }

    if (!isExternalUrl(parsed)) return;

    sendEvent("external_link_click", {
      page_path: window.location.pathname,
      link_host: parsed.hostname,
      link_url: parsed.href,
      link_label: normalizeLabel(link),
    });
  });
})();
