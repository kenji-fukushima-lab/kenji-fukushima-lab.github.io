document.addEventListener("DOMContentLoaded", () => {
  const dataElement = document.getElementById("organism-map-data");
  const i18nElement = document.getElementById("organism-map-i18n");
  const chartElement = document.getElementById("organism-map-chart");

  if (!dataElement || !chartElement) {
    return;
  }

  const i18n = i18nElement
    ? JSON.parse(i18nElement.textContent)
    : {
        unavailable: "Genus-count data is unavailable.",
        chartAriaLabel: "Genus paper link list",
        countLabel: "Papers",
        paperLinkLabel: "Open paper",
        publicationBaseUrl: "/publications/",
        wikipediaLabel: "Wikipedia",
        ncbiLabel: "NCBI",
        gbifLabel: "GBIF",
        yearRange: "{first}-{last}",
      };

  async function loadJsonData(element) {
    const sourceUrl = element.dataset.src;
    if (!sourceUrl) {
      return JSON.parse(element.textContent || "{}");
    }

    const response = await fetch(sourceUrl, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  function whenVisible(element, callback) {
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        observer.disconnect();
        callback();
      },
      { rootMargin: "240px" }
    );
    observer.observe(element);
  }

  whenVisible(chartElement, async () => {
    let dataset;
    try {
      dataset = await loadJsonData(dataElement);
    } catch (error) {
      chartElement.textContent = i18n.unavailable;
      return;
    }

    renderChart(dataset);
  });

  function renderChart(dataset) {
    if (!dataset || dataset.error || !Array.isArray(dataset.genera)) {
      chartElement.textContent = i18n.unavailable;
      return;
    }

    const genera = dataset.genera;
    const publicationBaseUrl = typeof i18n.publicationBaseUrl === "string" ? i18n.publicationBaseUrl : "/publications/";

    chartElement.setAttribute("aria-label", i18n.chartAriaLabel);

    const list = document.createElement("div");
    list.className = "organism-paper-list";
    list.setAttribute("role", "list");

    function localPublicationUrl(paper) {
      const key = paper?.key?.toString().trim();
      if (!key) {
        return null;
      }

      const separator = publicationBaseUrl.includes("#") ? "" : "#";
      return `${publicationBaseUrl}${separator}${encodeURIComponent(key)}`;
    }

    function paperHref(paper) {
      const url = paper?.url?.toString().trim();
      return url || localPublicationUrl(paper);
    }

    function isExternalUrl(url) {
      return /^https?:\/\//i.test(url);
    }

    function paperLabel(paper) {
      const title = paper?.title?.toString().trim();
      const year = paper?.year ? ` (${paper.year})` : "";
      return title ? `${i18n.paperLinkLabel}: ${title}${year}` : i18n.paperLinkLabel;
    }

    function genusName(genus) {
      return genus?.label?.toString().trim() || "";
    }

    function wikipediaHref(genus) {
      const url = genus?.wikipedia_url?.toString().trim();
      if (url) {
        return url;
      }

      const name = genusName(genus);
      return name ? `https://en.wikipedia.org/wiki/${encodeURIComponent(name.replace(/\s+/g, "_"))}` : null;
    }

    function taxonomyHref(service, genus) {
      const name = genusName(genus);
      if (!name) {
        return null;
      }

      const encodedName = encodeURIComponent(name);
      if (service === "ncbi") {
        return `https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name=${encodedName}`;
      }

      if (service === "gbif") {
        return `https://www.gbif.org/species/search?q=${encodedName}`;
      }

      return null;
    }

    function taxonomyLabel(label, genus) {
      const name = genusName(genus);
      return name ? `${label}: ${name}` : label;
    }

    function appendTaxonomyLink(container, href, label, genus) {
      if (!href) {
        return;
      }

      const link = document.createElement("a");
      link.className = "organism-taxonomy-link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      link.setAttribute("aria-label", taxonomyLabel(label, genus));
      container.appendChild(link);
    }

    genera.forEach((genus) => {
      const row = document.createElement("article");
      row.className = "organism-paper-row";
      row.setAttribute("role", "listitem");

      const infoLine = document.createElement("div");
      infoLine.className = "organism-paper-info";

      const labelText = document.createElement("i");
      labelText.className = "organism-paper-label";
      labelText.textContent = genus.label;

      const meta = document.createElement("p");
      meta.className = "organism-paper-meta";
      const yearText =
        genus.first_year && genus.last_year
          ? i18n.yearRange.replace("{first}", String(genus.first_year)).replace("{last}", String(genus.last_year))
          : "";
      meta.textContent = `${i18n.countLabel}: ${genus.paper_count || 0}${yearText ? ` / ${yearText}` : ""}`;

      const taxonomyLinks = document.createElement("div");
      taxonomyLinks.className = "organism-taxonomy-links";
      appendTaxonomyLink(taxonomyLinks, wikipediaHref(genus), i18n.wikipediaLabel || "Wikipedia", genus);
      appendTaxonomyLink(taxonomyLinks, taxonomyHref("ncbi", genus), i18n.ncbiLabel || "NCBI", genus);
      appendTaxonomyLink(taxonomyLinks, taxonomyHref("gbif", genus), i18n.gbifLabel || "GBIF", genus);

      const paperLinks = document.createElement("div");
      paperLinks.className = "organism-paper-links";
      paperLinks.setAttribute("aria-label", `${genus.label} ${i18n.countLabel}`);

      const papers = Array.isArray(genus.papers) ? genus.papers : [];
      papers.forEach((paper) => {
        const href = paperHref(paper);
        if (!href) {
          return;
        }

        const link = document.createElement("a");
        link.className = "organism-paper-link";
        link.href = href;
        link.title = paperLabel(paper);
        link.setAttribute("aria-label", paperLabel(paper));
        if (isExternalUrl(href)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        paperLinks.appendChild(link);
      });

      infoLine.append(labelText, meta, taxonomyLinks);
      row.append(infoLine, paperLinks);
      list.appendChild(row);
    });

    chartElement.replaceChildren(list);
  }
});
