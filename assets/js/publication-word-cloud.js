document.addEventListener("DOMContentLoaded", () => {
  const dataElement = document.getElementById("publication-word-cloud-data");
  const i18nElement = document.getElementById("publication-word-cloud-i18n");
  const chartElement = document.getElementById("publication-word-cloud-chart");

  if (!dataElement || !chartElement) {
    return;
  }

  const i18n = i18nElement
    ? JSON.parse(i18nElement.textContent)
    : {
        unavailable: "Word-cloud data is unavailable.",
        chartAriaLabel: "Publication word cloud",
        termSummary: "{term}: {count} mentions in {papers} papers",
      };

  let renderedDataset = null;
  let measureContext = null;
  let resizeTimer = null;

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

  function formatMessage(template, values) {
    return Object.entries(values).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, String(value)), template);
  }

  function renderMessage(message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    chartElement.replaceChildren(paragraph);
  }

  function overlaps(box, boxes) {
    return boxes.some((placed) => !(box.x2 < placed.x1 || box.x1 > placed.x2 || box.y2 < placed.y1 || box.y1 > placed.y2));
  }

  function wordBox(text, fontSize, x, y, fontFamily) {
    if (!measureContext) {
      measureContext = document.createElement("canvas").getContext("2d");
    }
    measureContext.font = `800 ${fontSize}px ${fontFamily}`;
    const metrics = measureContext.measureText(text);
    const width = Math.max(fontSize * 1.6, metrics.width + Math.max(6, fontSize * 0.24));
    const height =
      (metrics.actualBoundingBoxAscent || fontSize * 0.78) + (metrics.actualBoundingBoxDescent || fontSize * 0.22) + Math.max(3, fontSize * 0.15);
    return {
      x1: x - width / 2,
      x2: x + width / 2,
      y1: y - height / 2,
      y2: y + height / 2,
      width,
      height,
    };
  }

  function inside(box, width, height) {
    const margin = 10;
    return box.x1 >= margin && box.x2 <= width - margin && box.y1 >= margin && box.y2 <= height - margin;
  }

  function findPosition(term, index, width, height, fontSize, boxes, fontFamily) {
    const centerX = width / 2;
    const centerY = height * 0.52;
    const goldenAngle = 2.399963229728653;

    for (let step = 0; step < 3000; step += 1) {
      const radius = 3.25 * Math.sqrt(step) + index * 0.16;
      const angle = step * goldenAngle + index * 0.19;
      const x = centerX + Math.cos(angle) * radius * 1.65;
      const y = centerY + Math.sin(angle) * radius * 0.9;
      const box = wordBox(term.text, fontSize, x, y, fontFamily);
      if (inside(box, width, height) && !overlaps(box, boxes)) {
        return { x, y, box };
      }
    }

    return null;
  }

  function placeTerm(term, index, width, height, fontSize, boxes, fontFamily) {
    const minimumFontSize = index < 16 ? 11 : 9.5;
    for (let adjustedFontSize = fontSize; adjustedFontSize >= minimumFontSize; adjustedFontSize -= 1) {
      const position = findPosition(term, index, width, height, adjustedFontSize, boxes, fontFamily);
      if (position) {
        return { ...position, fontSize: adjustedFontSize };
      }
    }

    return null;
  }

  function placedBounds(boxes) {
    return boxes.reduce(
      (bounds, box) => ({
        x1: Math.min(bounds.x1, box.x1),
        y1: Math.min(bounds.y1, box.y1),
        x2: Math.max(bounds.x2, box.x2),
        y2: Math.max(bounds.y2, box.y2),
      }),
      {
        x1: Infinity,
        y1: Infinity,
        x2: -Infinity,
        y2: -Infinity,
      }
    );
  }

  function renderCloud(dataset) {
    if (typeof d3 === "undefined" || !dataset || dataset.error || !Array.isArray(dataset.words) || dataset.words.length === 0) {
      renderMessage(dataset && dataset.error ? dataset.error : i18n.unavailable);
      return;
    }

    renderedDataset = dataset;
    const width = Math.max(320, chartElement.clientWidth || 960);
    const height = width < 560 ? 640 : 540;
    const terms = dataset.words.slice(0, 80);
    const minCount = d3.min(terms, (term) => term.count) || 1;
    const maxCount = d3.max(terms, (term) => term.count) || 1;
    const sizeScale = d3.scaleSqrt().domain([minCount, maxCount]).range([12, 48]).clamp(true);
    const fontFamily = getComputedStyle(chartElement).fontFamily || "system-ui, sans-serif";
    const placedBoxes = [];
    const placedTerms = [];

    terms.forEach((term, index) => {
      const availableFontSize = Math.max(12, (width - 28) / Math.max(8, term.text.length * 0.62));
      const fontSize = Math.min(sizeScale(term.count), availableFontSize);
      const position = placeTerm(term, index, width, height, fontSize, placedBoxes, fontFamily);
      if (!position) {
        return;
      }
      placedBoxes.push(position.box);
      placedTerms.push({ ...term, x: position.x, y: position.y, fontSize: position.fontSize });
    });

    const cloudBounds = placedBoxes.length ? placedBounds(placedBoxes) : { x1: 0, y1: 0, x2: width, y2: height };
    const cropPadding = width < 560 ? 10 : 14;
    const viewBox = {
      x: cloudBounds.x1 - cropPadding,
      y: cloudBounds.y1 - cropPadding,
      width: cloudBounds.x2 - cloudBounds.x1 + cropPadding * 2,
      height: cloudBounds.y2 - cloudBounds.y1 + cropPadding * 2,
    };

    chartElement.replaceChildren();
    const svg = d3
      .select(chartElement)
      .append("svg")
      .attr("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
      .attr("width", Math.ceil(viewBox.width))
      .attr("height", Math.ceil(viewBox.height))
      .attr("role", "img")
      .attr("aria-label", i18n.chartAriaLabel);

    svg
      .append("g")
      .attr("class", "publication-word-cloud-terms")
      .selectAll("text")
      .data(placedTerms)
      .join("text")
      .attr("class", (_, index) => `publication-word-cloud-term publication-word-cloud-term-${index % 8}`)
      .attr("x", (term) => term.x)
      .attr("y", (term) => term.y)
      .attr("font-size", (term) => term.fontSize)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("tabindex", "0")
      .attr("aria-label", (term) =>
        formatMessage(i18n.termSummary, {
          term: term.text,
          count: term.count,
          papers: term.paper_count,
        })
      )
      .text((term) => term.text);
  }

  whenVisible(chartElement, async () => {
    let dataset;
    try {
      dataset = await loadJsonData(dataElement);
    } catch (error) {
      renderMessage(i18n.unavailable);
      return;
    }

    renderCloud(dataset);
  });

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      if (!renderedDataset) {
        return;
      }
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => renderCloud(renderedDataset), 140);
    });
    observer.observe(chartElement);
  }
});
