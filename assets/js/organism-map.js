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
        chartAriaLabel: "Genus count bar chart",
        countLabel: "Papers",
        wikipediaLabel: "Wikipedia",
        ncbiLabel: "NCBI",
        gbifLabel: "GBIF",
        yearRange: "{first}-{last}",
      };

  if (!dataset || dataset.error || !Array.isArray(dataset.genera)) {
    chartElement.textContent = i18n.unavailable;
    return;
  }

  const genera = dataset.genera;
  const maxPaperCount = Math.max(...genera.map((genus) => Number(genus.paper_count) || 0), 1);

  chartElement.setAttribute("role", "img");
  chartElement.setAttribute("aria-label", i18n.chartAriaLabel);

  const list = document.createElement("div");
  list.className = "organism-bar-chart";

  genera.forEach((genus) => {
    const row = document.createElement("article");
    row.className = "organism-bar-row";

    const infoLine = document.createElement("div");
    infoLine.className = "organism-bar-info";

    const labelText = document.createElement("i");
    labelText.className = "organism-bar-label";
    labelText.textContent = genus.label;

    const track = document.createElement("div");
    track.className = "organism-bar-track";

    const fill = document.createElement("span");
    fill.className = "organism-bar-fill";
    fill.style.width = `${((Number(genus.paper_count) || 0) / maxPaperCount) * 100}%`;
    track.appendChild(fill);

    const links = document.createElement("div");
    links.className = "organism-bar-links";

    [
      [i18n.wikipediaLabel, genus.wikipedia_url],
      [i18n.ncbiLabel, genus.ncbi_taxonomy_url],
      [i18n.gbifLabel, genus.gbif_url],
    ].forEach(([label, href]) => {
      const link = document.createElement("a");
      link.className = "organism-bar-link";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      links.appendChild(link);
    });

    const meta = document.createElement("p");
    meta.className = "organism-bar-meta";
    const yearText =
      genus.first_year && genus.last_year
        ? i18n.yearRange.replace("{first}", String(genus.first_year)).replace("{last}", String(genus.last_year))
        : "";
    meta.textContent = `${i18n.countLabel}: ${genus.paper_count || 0}${yearText ? ` / ${yearText}` : ""}`;

    infoLine.append(labelText, meta, links);
    row.append(infoLine, track);
    list.appendChild(row);
  });

  chartElement.replaceChildren(list);
});
