document.addEventListener("DOMContentLoaded", () => {
  const dataElement = document.getElementById("coauthor-network-data");
  const i18nElement = document.getElementById("coauthor-network-i18n");
  const graphElement = document.getElementById("coauthor-network-graph");
  const detailsElement = document.getElementById("coauthor-network-details");
  const summaryElement = document.getElementById("coauthor-network-filter-summary");

  if (!dataElement || !graphElement) {
    return;
  }

  const network = JSON.parse(dataElement.textContent);
  const i18n = i18nElement
    ? JSON.parse(i18nElement.textContent)
    : {
        lang: "ja",
        unavailable: "Network data is unavailable.",
        graphAriaLabel: "共同研究ネットワーク図",
        filterSummary: "表示中: 著者 {authors}人 / 連携 {links}本 / 出版年 {minYear}-{maxYear}",
        minWeightValue: "{value}本以上",
        detailPaperCount: "論文数",
        detailFirstYear: "最初の共著年",
        detailLastYear: "最新の共著年",
        coauthoredPapers: "共著論文数",
        latestCoauthoredYear: "最終共著年",
        na: "n/a",
      };

  function formatMessage(template, values) {
    return Object.entries(values).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, String(value)), template);
  }

  function roleLabel(node) {
    return i18n.lang === "en" ? node.role_label_en : node.role_label_ja;
  }

  function renderMessage(container, message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    container.replaceChildren(paragraph);
  }

  function createDetailList(rows) {
    const list = document.createElement("dl");
    rows.forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = String(value);
      wrapper.append(term, description);
      list.appendChild(wrapper);
    });
    return list;
  }

  if (!network || network.error) {
    if (detailsElement) {
      renderMessage(detailsElement, network && network.error ? network.error : i18n.unavailable);
    }
    return;
  }

  const width = graphElement.clientWidth || 960;
  const height = 720;
  const focusId = network.focus_author_key;
  const fitViewButton = document.getElementById("network-fit-view");
  const focusCenterButton = document.getElementById("network-focus-center");
  const zoomInButton = document.getElementById("network-zoom-in");
  const zoomOutButton = document.getElementById("network-zoom-out");
  const yearRangeElement = document.getElementById("network-year-range");
  const minYearValueElement = document.getElementById("network-year-min-value");
  const maxYearValueElement = document.getElementById("network-year-max-value");
  const roleColors = {
    self: "#28a745",
    highlighted_collaborator: "#f80",
    coauthor: "#007bff",
  };

  const state = {
    minWeight: 1,
    minYear: Number(network.stats.year_first),
    maxYear: Number(network.stats.year_last),
    directOnly: false,
    search: "",
    selectedNodeId: focusId,
    hoveredNodeId: null,
    currentGraph: null,
    currentNodeMap: new Map(),
    nodeElementById: new Map(),
    renderedDetailNodeId: null,
    pendingDetailNodeId: null,
    previewFrameId: null,
    visibleRoles: new Set(Object.keys(roleColors)),
  };

  const svg = d3
    .select(graphElement)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", i18n.graphAriaLabel);

  const viewport = svg.append("g").attr("class", "network-viewport");
  const linkLayer = viewport.append("g").attr("class", "network-links");
  const nodeLayer = viewport.append("g").attr("class", "network-nodes");
  const labelLayer = viewport.append("g").attr("class", "network-labels");

  const zoom = d3
    .zoom()
    .scaleExtent([0.35, 4])
    .filter((event) => {
      if (event.type === "dblclick") {
        return false;
      }
      if (event.type === "mousedown") {
        return event.target.tagName.toLowerCase() !== "circle";
      }
      return true;
    })
    .on("start", (event) => {
      if (event.sourceEvent && event.sourceEvent.type === "mousedown") {
        graphElement.classList.add("is-dragging");
      }
    })
    .on("zoom", (event) => {
      viewport.attr("transform", event.transform);
    })
    .on("end", () => {
      graphElement.classList.remove("is-dragging");
    });

  svg.call(zoom);

  const simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3
        .forceLink()
        .id((d) => d.id)
        .distance((link) => 90 - Math.min(link.weight, 6) * 6)
    )
    .force(
      "charge",
      d3.forceManyBody().strength((node) => (node.id === focusId ? -480 : -240))
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius((node) => nodeRadius(node) + 8)
    );

  function nodeRadius(node) {
    if (node.id === focusId) {
      return 16;
    }
    return 6 + Math.min(node.paper_count, 12);
  }

  function currentTransform() {
    return d3.zoomTransform(svg.node());
  }

  function transitionToTransform(transform) {
    svg.transition().duration(250).call(zoom.transform, transform);
  }

  function zoomBy(factor) {
    svg.transition().duration(180).call(zoom.scaleBy, factor);
  }

  function fitGraphToView(padding = 48) {
    const nodes = nodeLayer.selectAll("circle").data();
    if (!nodes.length) {
      return;
    }

    const minX = d3.min(nodes, (node) => node.x - nodeRadius(node));
    const maxX = d3.max(nodes, (node) => node.x + nodeRadius(node));
    const minY = d3.min(nodes, (node) => node.y - nodeRadius(node));
    const maxY = d3.max(nodes, (node) => node.y + nodeRadius(node));
    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);
    const scale = Math.max(0.35, Math.min(2.5, Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight)));
    const translateX = width / 2 - ((minX + maxX) / 2) * scale;
    const translateY = height / 2 - ((minY + maxY) / 2) * scale;
    transitionToTransform(d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  function centerFocusNode() {
    const node = nodeLayer
      .selectAll("circle")
      .data()
      .find((entry) => entry.id === focusId);
    if (!node) {
      return;
    }
    centerNode(node);
  }

  function centerNode(node, minScale = null) {
    if (!node) {
      return;
    }
    const transform = currentTransform();
    const scale = minScale === null ? transform.k : Math.max(transform.k, minScale);
    const translateX = width / 2 - node.x * scale;
    const translateY = height / 2 - node.y * scale;
    transitionToTransform(d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }

  function firstMatchedNode(graph, matchedIds) {
    if (!matchedIds.size) {
      return null;
    }
    return graph.nodes.find((node) => matchedIds.has(node.id)) || null;
  }

  function filteredGraph() {
    const nodeMap = new Map(
      network.nodes.map((node) => [
        node.id,
        {
          ...node,
          paper_count: 0,
          focus_paper_count: 0,
          first_year: null,
          last_year: null,
        },
      ])
    );

    network.nodes.forEach((node) => {
      const nextNode = nodeMap.get(node.id);
      if (!nextNode) {
        return;
      }

      const papers = (node.papers || []).filter((paper) => {
        if (!paper.year) {
          return false;
        }
        return paper.year >= state.minYear && paper.year <= state.maxYear;
      });

      nextNode.paper_count = papers.length;
      nextNode.focus_paper_count = papers.length;
      nextNode.first_year = papers.length ? d3.min(papers, (paper) => paper.year) : null;
      nextNode.last_year = papers.length ? d3.max(papers, (paper) => paper.year) : null;
    });

    const links = network.links
      .map((link) => {
        const papers = link.papers.filter((paper) => {
          if (!paper.year) {
            return false;
          }
          return paper.year >= state.minYear && paper.year <= state.maxYear;
        });

        if (!papers.length) {
          return null;
        }

        const weight = papers.length;
        if (weight < state.minWeight) {
          return null;
        }
        if (state.directOnly && !link.focus_link) {
          return null;
        }

        return {
          ...link,
          papers,
          weight,
          first_year: d3.min(papers, (paper) => paper.year),
          last_year: d3.max(papers, (paper) => paper.year),
        };
      })
      .filter(Boolean);

    const linkedNodeIds = new Set([focusId]);
    links.forEach((link) => {
      linkedNodeIds.add(link.source);
      linkedNodeIds.add(link.target);
    });

    nodeMap.forEach((node) => {
      if (node.id === focusId && node.paper_count > 0) {
        linkedNodeIds.add(node.id);
      }
    });

    const nodes = Array.from(nodeMap.values()).filter((node) => {
      if (!state.visibleRoles.has(node.role)) {
        return false;
      }
      if (!linkedNodeIds.has(node.id)) {
        return false;
      }
      return true;
    });

    const visibleIds = new Set(nodes.map((node) => node.id));
    const visibleLinks = links.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target));
    return {
      nodes: nodes.map((node) => ({ ...node })),
      links: visibleLinks.map((link) => ({ ...link })),
    };
  }

  function render() {
    const graph = filteredGraph();
    state.currentGraph = graph;
    state.currentNodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    const query = state.search.trim().toLowerCase();
    const matchedIds = new Set(graph.nodes.filter((node) => !query || node.name.toLowerCase().includes(query)).map((node) => node.id));
    const highlightedNodeIds = query ? matchedIds : new Set();
    const highlightedEdgeKeys = new Set(
      query
        ? graph.links
            .filter((link) => highlightedNodeIds.has(link.source) || highlightedNodeIds.has(link.target))
            .map((link) => `${link.source}-${link.target}`)
        : []
    );

    const links = linkLayer.selectAll("line").data(graph.links, (link) => `${link.source}-${link.target}`);
    links.exit().remove();
    const linksEnter = links
      .enter()
      .append("line")
      .attr("stroke-linecap", "round")
      .attr("stroke", (link) => edgeStroke(link, highlightedEdgeKeys))
      .attr("stroke-opacity", (link) => edgeOpacity(link, highlightedEdgeKeys));

    const nodes = nodeLayer.selectAll("circle").data(graph.nodes, (node) => node.id);
    nodes.exit().remove();
    const nodesEnter = nodes
      .enter()
      .append("circle")
      .attr("data-node-id", (node) => node.id)
      .attr("r", (node) => nodeRadius(node))
      .attr("fill", (node) => roleColors[node.role] || roleColors.coauthor)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", (node) => (node.id === focusId ? 2.5 : 1.5))
      .style("cursor", "pointer")
      .call(d3.drag().on("start", dragStarted).on("drag", dragged).on("end", dragEnded))
      .on("click", (_, node) => {
        selectNode(node.id);
      });

    nodesEnter.append("title");

    const mergedNodes = nodesEnter
      .merge(nodes)
      .attr("data-node-id", (node) => node.id)
      .on("mouseenter", (_, node) => {
        hoverNode(node.id);
      })
      .on("mouseleave", () => {
        clearHoverNode();
      })
      .on("focus", (_, node) => {
        hoverNode(node.id);
      })
      .on("blur", () => {
        clearHoverNode();
      });

    state.nodeElementById = new Map();
    mergedNodes.each(function (node) {
      state.nodeElementById.set(node.id, this);
    });

    const labels = labelLayer.selectAll("text").data(graph.nodes, (node) => node.id);
    labels.exit().remove();
    const labelsEnter = labels
      .enter()
      .append("text")
      .attr("class", "network-label")
      .attr("text-anchor", "middle")
      .attr("dy", (node) => nodeRadius(node) + 14)
      .text((node) => node.name);

    simulation.nodes(graph.nodes).on("tick", ticked);
    simulation.force("link").links(graph.links);
    simulation.on("end", () => {
      if (graph.nodes.length) {
        const matchedNode = query ? firstMatchedNode(graph, matchedIds) : null;
        if (matchedNode) {
          centerNode(matchedNode, 1);
        } else {
          fitGraphToView();
        }
      }
    });
    simulation.alpha(0.9).restart();

    function ticked() {
      linksEnter
        .merge(links)
        .attr("x1", (link) => link.source.x)
        .attr("y1", (link) => link.source.y)
        .attr("x2", (link) => link.target.x)
        .attr("y2", (link) => link.target.y)
        .attr("stroke-width", (link) => edgeStrokeWidth(link, highlightedEdgeKeys))
        .attr("stroke", (link) => edgeStroke(link, highlightedEdgeKeys))
        .attr("stroke-opacity", (link) => edgeOpacity(link, highlightedEdgeKeys));

      nodesEnter
        .merge(nodes)
        .attr("cx", (node) => node.x)
        .attr("cy", (node) => node.y)
        .attr("opacity", (node) => (!query || matchedIds.has(node.id) ? 1 : 0.25))
        .attr("stroke", (node) => nodeStroke(node, highlightedNodeIds))
        .attr("stroke-width", (node) => nodeStrokeWidth(node, highlightedNodeIds));

      nodesEnter
        .merge(nodes)
        .select("title")
        .text(
          (node) =>
            `${node.name}\n${roleLabel(node)}\n${i18n.coauthoredPapers}: ${node.focus_paper_count}\n${i18n.latestCoauthoredYear}: ${node.last_year || i18n.na}`
        );

      labelsEnter
        .merge(labels)
        .attr("x", (node) => node.x)
        .attr("y", (node) => node.y)
        .attr("opacity", (node) => {
          if (node.id === focusId || node.paper_count >= 3) {
            return !query || matchedIds.has(node.id) ? 1 : 0.2;
          }
          return 0;
        });
    }

    refreshSelection(null, state.selectedNodeId);
    updateFilterSummary(graph);
    updateAuthorTable(graph);
    if (!graph.nodes.some((node) => node.id === state.selectedNodeId)) {
      state.selectedNodeId = focusId;
    }
    scheduleDetailUpdate(state.hoveredNodeId || state.selectedNodeId);
  }

  function applyNodeSelectionStyle(nodeId) {
    const element = state.nodeElementById.get(nodeId);
    const node = state.currentNodeMap.get(nodeId);
    if (!element || !node) {
      return;
    }

    const isSelected = nodeId === state.selectedNodeId;
    const query = state.search.trim().toLowerCase();
    const isHighlighted = query && node.name.toLowerCase().includes(query);
    d3.select(element)
      .attr("stroke-width", isSelected ? 3.2 : nodeStrokeWidth(node, isHighlighted ? new Set([nodeId]) : new Set()))
      .attr("stroke", isSelected ? "#111827" : nodeStroke(node, isHighlighted ? new Set([nodeId]) : new Set()));
  }

  function refreshSelection(previousNodeId, nextNodeId) {
    if (previousNodeId && previousNodeId !== nextNodeId) {
      applyNodeSelectionStyle(previousNodeId);
    }
    if (nextNodeId) {
      applyNodeSelectionStyle(nextNodeId);
    }
  }

  function updateFilterSummary(graph) {
    if (!summaryElement) {
      return;
    }
    summaryElement.textContent = formatMessage(i18n.filterSummary, {
      authors: graph.nodes.length,
      links: graph.links.length,
      minYear: state.minYear,
      maxYear: state.maxYear,
    });
  }

  function updateAuthorTable(graph) {
    const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    document.querySelectorAll("[data-author-id]").forEach((row) => {
      const node = nodeMap.get(row.getAttribute("data-author-id"));
      row.hidden = !node;
      if (!node) {
        return;
      }

      const focusPaperCountCell = row.querySelector(".author-focus-paper-count");
      const firstYearCell = row.querySelector(".author-first-year");
      const lastYearCell = row.querySelector(".author-last-year");

      if (focusPaperCountCell) {
        focusPaperCountCell.textContent = String(node.focus_paper_count);
      }
      if (firstYearCell) {
        firstYearCell.textContent = node.first_year || "";
      }
      if (lastYearCell) {
        lastYearCell.textContent = node.last_year || "";
      }
    });
  }

  function updateDetails(nodeId) {
    if (!detailsElement) {
      return;
    }
    if (!state.currentNodeMap.has(nodeId)) {
      detailsElement.replaceChildren();
      state.renderedDetailNodeId = null;
      return;
    }
    if (state.renderedDetailNodeId === nodeId) {
      return;
    }

    const node = state.currentNodeMap.get(nodeId);
    detailsElement.replaceChildren(
      createDetailList([
        [i18n.detailPaperCount, node.focus_paper_count],
        [i18n.detailFirstYear, node.first_year || i18n.na],
        [i18n.detailLastYear, node.last_year || i18n.na],
      ])
    );
    state.renderedDetailNodeId = nodeId;
  }

  function scheduleDetailUpdate(nodeId) {
    state.pendingDetailNodeId = nodeId;
    if (state.previewFrameId !== null) {
      return;
    }

    state.previewFrameId = window.requestAnimationFrame(() => {
      state.previewFrameId = null;
      updateDetails(state.pendingDetailNodeId);
    });
  }

  function edgeKey(link) {
    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    return `${sourceId}-${targetId}`;
  }

  function edgeStroke(link, highlightedEdgeKeys) {
    if (highlightedEdgeKeys.has(edgeKey(link))) {
      return "#ef4444";
    }
    return link.focus_link ? "#94a3b8" : "#d1d5db";
  }

  function edgeOpacity(link, highlightedEdgeKeys) {
    if (highlightedEdgeKeys.has(edgeKey(link))) {
      return 1;
    }
    return link.focus_link ? 0.85 : 0.45;
  }

  function edgeStrokeWidth(link, highlightedEdgeKeys) {
    const baseWidth = Math.min(1.5 + link.weight * 0.7, 7);
    return highlightedEdgeKeys.has(edgeKey(link)) ? baseWidth + 1 : baseWidth;
  }

  function nodeStroke(node, highlightedNodeIds) {
    if (highlightedNodeIds.has(node.id)) {
      return "#ef4444";
    }
    return "#ffffff";
  }

  function nodeStrokeWidth(node, highlightedNodeIds) {
    if (highlightedNodeIds.has(node.id)) {
      return 3.2;
    }
    return node.id === focusId ? 2.5 : 1.5;
  }

  function selectNode(nodeId) {
    const previousNodeId = state.selectedNodeId;
    if (previousNodeId === nodeId && state.hoveredNodeId === null && state.renderedDetailNodeId === nodeId) {
      return;
    }
    state.selectedNodeId = nodeId;
    refreshSelection(previousNodeId, nodeId);
    scheduleDetailUpdate(state.hoveredNodeId || nodeId);
  }

  function hoverNode(nodeId) {
    if (state.hoveredNodeId === nodeId && state.renderedDetailNodeId === nodeId) {
      return;
    }
    state.hoveredNodeId = nodeId;
    scheduleDetailUpdate(nodeId);
  }

  function clearHoverNode() {
    if (state.hoveredNodeId === null) {
      return;
    }
    state.hoveredNodeId = null;
    scheduleDetailUpdate(state.selectedNodeId);
  }

  function dragStarted(event) {
    if (!event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event) {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    event.subject.fx = null;
    event.subject.fy = null;
  }

  const minWeightInput = document.getElementById("network-min-weight");
  const minYearInput = document.getElementById("network-year-min");
  const maxYearInput = document.getElementById("network-year-max");
  const directOnlyInput = document.getElementById("network-direct-only");
  const searchInput = document.getElementById("network-search");

  function normalizeYearInputs(changedField) {
    const fallbackMin = Number(network.stats.year_first);
    const fallbackMax = Number(network.stats.year_last);
    const rawMin = Number(minYearInput && minYearInput.value);
    const rawMax = Number(maxYearInput && maxYearInput.value);
    let nextMin = Number.isFinite(rawMin) ? rawMin : fallbackMin;
    let nextMax = Number.isFinite(rawMax) ? rawMax : fallbackMax;

    nextMin = Math.max(fallbackMin, Math.min(nextMin, fallbackMax));
    nextMax = Math.max(fallbackMin, Math.min(nextMax, fallbackMax));

    if (nextMin > nextMax) {
      if (changedField === "min") {
        nextMax = nextMin;
      } else {
        nextMin = nextMax;
      }
    }

    state.minYear = nextMin;
    state.maxYear = nextMax;

    if (minYearInput) {
      minYearInput.value = String(nextMin);
    }
    if (maxYearInput) {
      maxYearInput.value = String(nextMax);
    }

    if (minYearValueElement) {
      minYearValueElement.textContent = String(nextMin);
    }
    if (maxYearValueElement) {
      maxYearValueElement.textContent = String(nextMax);
    }

    if (yearRangeElement) {
      const total = Math.max(fallbackMax - fallbackMin, 1);
      const minPercent = ((nextMin - fallbackMin) / total) * 100;
      const maxPercent = ((nextMax - fallbackMin) / total) * 100;
      yearRangeElement.style.setProperty("--range-min", `${minPercent}%`);
      yearRangeElement.style.setProperty("--range-max", `${maxPercent}%`);
    }
  }

  if (minWeightInput) {
    minWeightInput.addEventListener("input", () => {
      state.minWeight = Number(minWeightInput.value || 1);
      const valueLabel = document.getElementById("network-min-weight-value");
      if (valueLabel) {
        valueLabel.textContent = formatMessage(i18n.minWeightValue, { value: state.minWeight });
      }
      render();
    });
  }

  if (minYearInput) {
    minYearInput.addEventListener("input", () => {
      normalizeYearInputs("min");
      render();
    });
  }

  if (maxYearInput) {
    maxYearInput.addEventListener("input", () => {
      normalizeYearInputs("max");
      render();
    });
  }

  if (directOnlyInput) {
    directOnlyInput.addEventListener("change", () => {
      state.directOnly = directOnlyInput.checked;
      render();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value || "";
      render();
    });
  }

  document.querySelectorAll("[data-network-role-toggle]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const role = checkbox.getAttribute("data-network-role-toggle");
      if (checkbox.checked) {
        state.visibleRoles.add(role);
      } else {
        state.visibleRoles.delete(role);
      }
      if (!state.visibleRoles.size) {
        state.visibleRoles.add(role);
        checkbox.checked = true;
      }
      render();
    });
  });

  if (fitViewButton) {
    fitViewButton.addEventListener("click", () => {
      fitGraphToView();
    });
  }

  if (focusCenterButton) {
    focusCenterButton.addEventListener("click", () => {
      centerFocusNode();
    });
  }

  if (zoomInButton) {
    zoomInButton.addEventListener("click", () => {
      zoomBy(1.2);
    });
  }

  if (zoomOutButton) {
    zoomOutButton.addEventListener("click", () => {
      zoomBy(0.85);
    });
  }

  normalizeYearInputs("max");
  render();
});
