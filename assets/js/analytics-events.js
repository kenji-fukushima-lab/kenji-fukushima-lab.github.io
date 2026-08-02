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

  const isDownloadUrl = (link, parsed) => {
    if (link.hasAttribute("download")) return true;
    return /\.(?:csv|fa|fasta|fastq|fq|gz|json|pdf|tar|tsv|txt|xlsx?|zip)(?:$|\?)/i.test(parsed.pathname);
  };

  const eventForLink = (link, parsed) => {
    const explicitEvent = trimText(link.dataset.analyticsEvent);
    if (explicitEvent) return explicitEvent.slice(0, 40);
    if (link.closest('[data-analytics-context="recruitment"]') && /^https?:$/.test(parsed.protocol)) {
      return "recruitment_link_click";
    }
    if (link.closest('[data-analytics-context="publications"]')) {
      if (parsed.hostname === "doi.org") return "publication_doi_click";
      if (isDownloadUrl(link, parsed)) return "publication_pdf_click";
    }
    if (link.closest('[data-analytics-context="resources"]')) {
      if (isDownloadUrl(link, parsed)) return "resource_download";
      if (parsed.hostname === "github.com" || parsed.hostname.endsWith(".github.com")) {
        return "github_repository_click";
      }
      if (/^https?:$/.test(parsed.protocol)) return "resource_link_click";
    }
    return "";
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("tel:")) return;

    let parsed;
    try {
      parsed = new URL(href, window.location.href);
    } catch (_error) {
      return;
    }

    const eventName = eventForLink(link, parsed);
    if (eventName) {
      sendEvent(eventName, {
        page_path: window.location.pathname,
        link_host: parsed.hostname,
        link_url: parsed.href,
        link_label: normalizeLabel(link),
      });
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
