document.addEventListener("DOMContentLoaded", () => {
  const dataElement = document.getElementById("organism-map-data");
  const i18nElement = document.getElementById("organism-map-i18n");
  const chartElement = document.getElementById("organism-map-chart");

  if (!dataElement || !chartElement) {
    return;
  }

  const dataset = JSON.parse(dataElement.textContent || "{}");
  const i18n = i18nElement
    ? JSON.parse(i18nElement.textContent)
    : {
        unavailable: "Genus-count data is unavailable.",
        chartAriaLabel: "Genus paper link list",
        countLabel: "Papers",
        paperLinkLabel: "Open paper",
        publicationBaseUrl: "/publications/",
        yearRange: "{first}-{last}",
      };

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

    infoLine.append(labelText, meta);
    row.append(infoLine, paperLinks);
    list.appendChild(row);
  });

  chartElement.replaceChildren(list);
});
