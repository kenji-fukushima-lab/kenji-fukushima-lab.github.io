document.addEventListener("DOMContentLoaded", () => {
  const dataElement = document.getElementById("paper-network-data");
  const i18nElement = document.getElementById("paper-network-i18n");
  const graphElement = document.getElementById("paper-network-graph");
  const detailsElement = document.getElementById("paper-network-details");
  const summaryElement = document.getElementById("paper-network-filter-summary");

  if (!dataElement || !graphElement) {
    return;
  }

  const network = JSON.parse(dataElement.textContent);
  const i18n = i18nElement
    ? JSON.parse(i18nElement.textContent)
    : {
        lang: "ja",
        unavailable: "Network data is unavailable.",
        graphAriaLabel: "論文ネットワーク図",
        filterSummary: "表示中: 総論文数{totalPapers}本中{papers}本 / リンク{links}本 / {minYear}-{maxYear}年",
        minWeightValue: "{value}人以上",
        detailYear: "年",
        detailAuthors: "著者",
        detailConnections: "接続論文数",
        detailScore: "接続スコア",
        detailSharedAuthors: "共通著者（Kenji Fukushima を除く）",
        noSharedAuthors: "なし",
        linkSharedAuthors: "共通著者",
        na: "n/a",
      };

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
  const isolateHubId = "__paper-network-isolate-hub__";
  const fitViewButton = document.getElementById("paper-network-fit-view");
  const zoomInButton = document.getElementById("paper-network-zoom-in");
  const zoomOutButton = document.getElementById("paper-network-zoom-out");
  const yearRangeElement = document.getElementById("paper-network-year-range");
  const minYearValueElement = document.getElementById("paper-network-year-min-value");
  const maxYearValueElement = document.getElementById("paper-network-year-max-value");
  const yearDomain = [Number(network.stats.year_first), Number(network.stats.year_last)];
  const nodeFillScale = d3.scaleLinear().domain(yearDomain).range(["#93c5fd", "#1d4ed8"]).clamp(true);

  const state = {
    minWeight: Number(network.config?.min_shared_authors_default || 1),
    minYear: yearDomain[0],
    maxYear: yearDomain[1],
    hideIsolates: Boolean(network.config?.hide_isolates_default),
    search: "",
    selectedNodeId: network.nodes.find((node) => !node.isolated)?.id || network.nodes[0]?.id || null,
    hoveredNodeId: null,
    currentGraph: null,
    currentNodeMap: new Map(),
    nodeElementById: new Map(),
    renderedDetailNodeId: null,
    pendingDetailNodeId: null,
    previewFrameId: null,
  };

  function formatMessage(template, values) {
    return Object.entries(values).reduce((message, [key, value]) => message.replaceAll(`{${key}}`, String(value)), template);
  }

  const svg = d3
    .select(graphElement)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", i18n.graphAriaLabel);

  const viewport = svg.append("g").attr("class", "paper-network-viewport");
  const linkLayer = viewport.append("g").attr("class", "paper-network-links");
  const nodeLayer = viewport.append("g").attr("class", "paper-network-nodes");
  const labelLayer = viewport.append("g").attr("class", "paper-network-labels");

  const zoom = d3
    .zoom()
    .scaleExtent([0.35, 8])
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
        .distance((link) => 105 - Math.min(link.weight, 4) * 10)
    )
    .force(
      "isolate-link",
      d3
        .forceLink()
        .id((d) => d.id)
        .distance((link) => {
          const targetNode = typeof link.target === "object" ? link.target : null;
          return 56 + nodeRadius(targetNode) * 2.1;
        })
        .strength(0.16)
    )
    .force(
      "charge",
      d3.forceManyBody().strength((node) => {
        if (node.isVirtualHub) {
          return 0;
        }
        if (node.currentDegree === 0) {
          return -56;
        }
        return -240 - Math.min(node.currentWeightSum || 0, 12) * 12;
      })
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collision",
      d3.forceCollide().radius((node) => {
        if (node.isVirtualHub) {
          return 0;
        }
        return nodeRadius(node) + (node.currentDegree === 0 ? 8 : 10);
      })
    );

  function nodeRadius(node) {
    if (!node || node.isVirtualHub) {
      return 0;
    }
    return 7 + Math.min(node.currentWeightSum || node.shared_author_weight_sum || 0, 12);
  }

  function nodeFill(node) {
    if (!Number.isFinite(node.year)) {
      return "#94a3b8";
    }
    return nodeFillScale(node.year);
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

  function fitTransformForNodes(nodes, padding = 48, maxScale = 4) {
    if (!nodes.length) {
      return null;
    }

    const minX = d3.min(nodes, (node) => node.x - nodeRadius(node));
    const maxX = d3.max(nodes, (node) => node.x + nodeRadius(node));
    const minY = d3.min(nodes, (node) => node.y - nodeRadius(node));
    const maxY = d3.max(nodes, (node) => node.y + nodeRadius(node));
    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);
    const scale = Math.max(0.35, Math.min(maxScale, Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight)));
    const translateX = width / 2 - ((minX + maxX) / 2) * scale;
    const translateY = height / 2 - ((minY + maxY) / 2) * scale;
    return d3.zoomIdentity.translate(translateX, translateY).scale(scale);
  }

  function fitNodesToView(nodes, padding = 48, maxScale = 4) {
    const transform = fitTransformForNodes(nodes, padding, maxScale);
    if (!transform) {
      return;
    }
    transitionToTransform(transform);
  }

  function fitGraphToView(padding = 48, options = {}) {
    const { includeIsolates = true, maxScale = 4 } = options;
    const allNodes = nodeLayer.selectAll("circle").data();
    const nodes = includeIsolates ? allNodes : allNodes.filter((node) => node.currentDegree > 0);
    const fitNodes = nodes.length ? nodes : allNodes;
    fitNodesToView(fitNodes, padding, maxScale);
  }

  function autoFitCandidateNodes(nodes) {
    if (nodes.length < 12) {
      return nodes;
    }

    const centerX = d3.mean(nodes, (node) => node.x);
    const centerY = d3.mean(nodes, (node) => node.y);
    const distances = nodes.map((node) => Math.hypot(node.x - centerX, node.y - centerY) + nodeRadius(node)).sort(d3.ascending);
    const cutoffIndex = Math.max(0, Math.ceil(nodes.length * 0.85) - 1);
    const cutoffDistance = distances[Math.min(cutoffIndex, distances.length - 1)];
    const trimmedNodes = nodes.filter((node) => Math.hypot(node.x - centerX, node.y - centerY) + nodeRadius(node) <= cutoffDistance);

    if (trimmedNodes.length < Math.ceil(nodes.length * 0.7)) {
      return nodes;
    }

    const fullTransform = fitTransformForNodes(nodes, 24, 6);
    const trimmedTransform = fitTransformForNodes(trimmedNodes, 24, 6);
    if (!fullTransform || !trimmedTransform) {
      return nodes;
    }

    const fullScale = fullTransform.k;
    const trimmedScale = trimmedTransform.k;
    if (trimmedScale < fullScale * 1.35) {
      return nodes;
    }

    return trimmedNodes;
  }

  function autoFitGraphToView(graph) {
    const connectedNodes = graph.nodes.filter((node) => node.currentDegree > 0 && hasPosition(node));
    if (connectedNodes.length) {
      fitNodesToView(autoFitCandidateNodes(connectedNodes), 24, 6);
      return;
    }

    const positionedNodes = graph.nodes.filter(hasPosition);
    fitNodesToView(positionedNodes, 24, 5.5);
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

  function visibleInYearRange(node) {
    if (!Number.isFinite(node.year)) {
      return false;
    }
    return node.year >= state.minYear && node.year <= state.maxYear;
  }

  function filteredGraph() {
    const previousNodeMap = state.currentNodeMap;
    const nodeMap = new Map(
      network.nodes.map((node) => [
        node.id,
        {
          ...node,
          currentDegree: 0,
          currentWeightSum: 0,
          currentSharedAuthors: [],
        },
      ])
    );

    const visibleIdsByYear = new Set(network.nodes.filter((node) => visibleInYearRange(node)).map((node) => node.id));

    const links = network.links
      .filter((link) => visibleIdsByYear.has(link.source) && visibleIdsByYear.has(link.target))
      .filter((link) => link.weight >= state.minWeight)
      .map((link) => ({ ...link }));

    links.forEach((link) => {
      const sourceNode = nodeMap.get(link.source);
      const targetNode = nodeMap.get(link.target);
      if (!sourceNode || !targetNode) {
        return;
      }
      sourceNode.currentDegree += 1;
      targetNode.currentDegree += 1;
      sourceNode.currentWeightSum += link.weight;
      targetNode.currentWeightSum += link.weight;
      sourceNode.currentSharedAuthors.push(...link.shared_authors);
      targetNode.currentSharedAuthors.push(...link.shared_authors);
    });

    let nodes = Array.from(nodeMap.values()).filter((node) => visibleIdsByYear.has(node.id));
    if (state.hideIsolates) {
      nodes = nodes.filter((node) => node.currentDegree > 0);
    }

    nodes = nodes.map((node) => {
      const nextNode = {
        ...node,
        currentSharedAuthors: Array.from(new Set(node.currentSharedAuthors)).sort(),
      };
      const previousNode = previousNodeMap.get(nextNode.id);
      if (previousNode) {
        if (Number.isFinite(previousNode.x) && Number.isFinite(previousNode.y)) {
          nextNode.x = previousNode.x;
          nextNode.y = previousNode.y;
        }
        const reuseVelocity = nextNode.currentDegree > 0 && previousNode.currentDegree > 0;
        if (reuseVelocity && Number.isFinite(previousNode.vx) && Number.isFinite(previousNode.vy)) {
          nextNode.vx = previousNode.vx;
          nextNode.vy = previousNode.vy;
        } else if (nextNode.currentDegree === 0) {
          nextNode.vx = 0;
          nextNode.vy = 0;
        }
      } else if (nextNode.currentDegree === 0) {
        nextNode.vx = 0;
        nextNode.vy = 0;
      }
      return nextNode;
    });

    const visibleIds = new Set(nodes.map((node) => node.id));
    return {
      nodes,
      links: links.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target)),
    };
  }

  function hasPosition(node) {
    return Number.isFinite(node.x) && Number.isFinite(node.y);
  }

  function largestConnectedComponentIds(graph) {
    const nodeMap = new Map();
    const adjacency = new Map();
    graph.nodes.forEach((node) => {
      if (node.currentDegree > 0) {
        nodeMap.set(node.id, node);
        adjacency.set(node.id, []);
      }
    });

    graph.links.forEach((link) => {
      if (!adjacency.has(link.source) || !adjacency.has(link.target)) {
        return;
      }
      adjacency.get(link.source).push(link.target);
      adjacency.get(link.target).push(link.source);
    });

    let bestIds = [];
    let bestScore = -Infinity;
    const visited = new Set();

    adjacency.forEach((_, nodeId) => {
      if (visited.has(nodeId)) {
        return;
      }

      const stack = [nodeId];
      const componentIds = [];
      let componentScore = 0;
      visited.add(nodeId);

      while (stack.length) {
        const currentId = stack.pop();
        componentIds.push(currentId);
        componentScore += nodeMap.get(currentId)?.currentWeightSum || 0;

        (adjacency.get(currentId) || []).forEach((neighborId) => {
          if (visited.has(neighborId)) {
            return;
          }
          visited.add(neighborId);
          stack.push(neighborId);
        });
      }

      if (componentIds.length > bestIds.length || (componentIds.length === bestIds.length && componentScore > bestScore)) {
        bestIds = componentIds;
        bestScore = componentScore;
      }
    });

    return new Set(bestIds);
  }

  function buildSimulationGraph(graph) {
    const isolatedNodes = graph.nodes
      .filter((node) => node.currentDegree === 0)
      .sort((left, right) => {
        const leftYear = Number.isFinite(left.year) ? left.year : -Infinity;
        const rightYear = Number.isFinite(right.year) ? right.year : -Infinity;
        if (leftYear !== rightYear) {
          return leftYear - rightYear;
        }
        return left.title.localeCompare(right.title);
      });

    if (!isolatedNodes.length) {
      return {
        nodes: graph.nodes,
        isolateLinks: [],
      };
    }

    const mainComponentIds = largestConnectedComponentIds(graph);
    const mainComponentNodes = graph.nodes.filter((node) => mainComponentIds.has(node.id));
    const positionedMainNodes = mainComponentNodes.filter(hasPosition);
    const centerX = positionedMainNodes.length ? d3.mean(positionedMainNodes, (node) => node.x) : width / 2;
    const centerY = positionedMainNodes.length ? d3.mean(positionedMainNodes, (node) => node.y) : height / 2;
    const clusterRadius = positionedMainNodes.length
      ? d3.max(positionedMainNodes, (node) => Math.hypot(node.x - centerX, node.y - centerY) + nodeRadius(node))
      : 0;
    const seedRadius = Math.max(54, Math.min(110, clusterRadius * 0.34 + 42));
    const maxSeedRadius = Math.max(seedRadius * 1.8, clusterRadius + 90, 180);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    isolatedNodes.forEach((node, index) => {
      const angle = index * goldenAngle;
      const preferredRadius = seedRadius + Math.sqrt(index + 1) * 18;
      node.vx = 0;
      node.vy = 0;

      if (!hasPosition(node)) {
        node.x = centerX + Math.cos(angle) * preferredRadius;
        node.y = centerY + Math.sin(angle) * preferredRadius;
        return;
      }

      const distance = Math.hypot(node.x - centerX, node.y - centerY);
      if (distance <= maxSeedRadius) {
        return;
      }

      const direction = distance > 0 ? Math.atan2(node.y - centerY, node.x - centerX) : angle;
      node.x = centerX + Math.cos(direction) * maxSeedRadius;
      node.y = centerY + Math.sin(direction) * maxSeedRadius;
    });

    const isolateHub = {
      id: isolateHubId,
      isVirtualHub: true,
      x: centerX,
      y: centerY,
      fx: centerX,
      fy: centerY,
      currentDegree: 0,
      currentWeightSum: 0,
    };

    return {
      nodes: [...graph.nodes, isolateHub],
      isolateLinks: isolatedNodes.map((node) => ({
        source: isolateHubId,
        target: node.id,
        virtual: true,
      })),
    };
  }

  function firstMatchedNode(graph, matchedIds) {
    if (!matchedIds.size) {
      return null;
    }
    return graph.nodes.find((node) => matchedIds.has(node.id)) || null;
  }

  function render() {
    const graph = filteredGraph();
    const simulationGraph = buildSimulationGraph(graph);
    state.currentGraph = graph;
    state.currentNodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    const query = state.search.trim().toLowerCase();
    const matchedIds = new Set(
      graph.nodes
        .filter((node) => {
          if (!query) {
            return true;
          }
          const searchTarget = `${node.title} ${node.authors.join(" ")} ${node.abstract || ""}`.toLowerCase();
          return searchTarget.includes(query);
        })
        .map((node) => node.id)
    );
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
    const linksEnter = links.enter().append("line").attr("stroke-linecap", "round");

    const nodes = nodeLayer.selectAll("circle").data(graph.nodes, (node) => node.id);
    nodes.exit().remove();
    const nodesEnter = nodes
      .enter()
      .append("circle")
      .attr("data-node-id", (node) => node.id)
      .attr("r", (node) => nodeRadius(node))
      .attr("fill", (node) => nodeFill(node))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
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
      .attr("class", "paper-network-label")
      .attr("text-anchor", "middle")
      .text((node) => node.short_title);

    simulation.nodes(simulationGraph.nodes).on("tick", ticked);
    simulation.force("link").links(graph.links);
    simulation.force("isolate-link").links(simulationGraph.isolateLinks);
    simulation.on("end", () => {
      if (graph.nodes.length) {
        const matchedNode = query ? firstMatchedNode(graph, matchedIds) : null;
        if (matchedNode) {
          centerNode(matchedNode, 1);
        } else {
          autoFitGraphToView(graph);
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
        .attr("r", (node) => nodeRadius(node))
        .attr("fill", (node) => nodeFill(node))
        .attr("opacity", (node) => (!query || matchedIds.has(node.id) ? 1 : 0.22))
        .attr("stroke", (node) => nodeStroke(node, highlightedNodeIds))
        .attr("stroke-width", (node) => nodeStrokeWidth(node, highlightedNodeIds));

      nodesEnter
        .merge(nodes)
        .select("title")
        .text(
          (node) =>
            `${node.title}\n${i18n.detailYear}: ${node.year || i18n.na}\n${i18n.detailConnections}: ${node.currentDegree}\n${i18n.linkSharedAuthors}: ${node.currentSharedAuthors.join(", ") || i18n.noSharedAuthors}`
        );

      labelsEnter
        .merge(labels)
        .attr("x", (node) => node.x)
        .attr("y", (node) => node.y + nodeRadius(node) + 13)
        .attr("opacity", (node) => {
          if (query && matchedIds.has(node.id)) {
            return 1;
          }
          return node.currentWeightSum >= 5 ? 0.9 : 0;
        });
    }

    updateFilterSummary(graph);
    updatePaperTable(graph);
    if (!graph.nodes.some((node) => node.id === state.selectedNodeId)) {
      state.selectedNodeId = graph.nodes[0]?.id || null;
    }
    refreshSelection(null, state.selectedNodeId);
    scheduleDetailUpdate(state.hoveredNodeId || state.selectedNodeId);
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
    return "#94a3b8";
  }

  function edgeOpacity(link, highlightedEdgeKeys) {
    if (highlightedEdgeKeys.has(edgeKey(link))) {
      return 1;
    }
    return 0.42;
  }

  function edgeStrokeWidth(link, highlightedEdgeKeys) {
    const baseWidth = Math.min(1.4 + link.weight * 0.95, 6.5);
    return highlightedEdgeKeys.has(edgeKey(link)) ? baseWidth + 0.8 : baseWidth;
  }

  function nodeStroke(node, highlightedNodeIds) {
    if (highlightedNodeIds.has(node.id)) {
      return "#ef4444";
    }
    return "#ffffff";
  }

  function nodeStrokeWidth(node, highlightedNodeIds) {
    if (node.id === state.selectedNodeId) {
      return 3.2;
    }
    if (highlightedNodeIds.has(node.id)) {
      return 3;
    }
    return 1.5;
  }

  function applyNodeSelectionStyle(nodeId) {
    const element = state.nodeElementById.get(nodeId);
    const node = state.currentNodeMap.get(nodeId);
    if (!element || !node) {
      return;
    }

    const query = state.search.trim().toLowerCase();
    const isHighlighted = query && `${node.title} ${node.authors.join(" ")} ${node.abstract || ""}`.toLowerCase().includes(query);
    d3.select(element)
      .attr("stroke-width", node.id === state.selectedNodeId ? 3.2 : nodeStrokeWidth(node, isHighlighted ? new Set([nodeId]) : new Set()))
      .attr("stroke", node.id === state.selectedNodeId ? "#111827" : nodeStroke(node, isHighlighted ? new Set([nodeId]) : new Set()));
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
      totalPapers: network.stats.paper_count,
      papers: graph.nodes.length,
      links: graph.links.length,
      minYear: state.minYear,
      maxYear: state.maxYear,
    });
  }

  function updatePaperTable(graph) {
    const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
    document.querySelectorAll("[data-paper-id]").forEach((row) => {
      const node = nodeMap.get(row.getAttribute("data-paper-id"));
      row.hidden = !node;
      if (!node) {
        return;
      }

      const degreeCell = row.querySelector(".paper-degree");
      const scoreCell = row.querySelector(".paper-score");
      const yearCell = row.querySelector(".paper-year");

      if (degreeCell) {
        degreeCell.textContent = String(node.currentDegree);
      }
      if (scoreCell) {
        scoreCell.textContent = String(node.currentWeightSum);
      }
      if (yearCell) {
        yearCell.textContent = node.year || "";
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
        [i18n.detailYear, node.year || i18n.na],
        [i18n.detailConnections, node.currentDegree],
        [i18n.detailScore, node.currentWeightSum],
        [i18n.detailAuthors, node.authors.join(", ")],
        [i18n.detailSharedAuthors, node.currentSharedAuthors.join(", ") || i18n.noSharedAuthors],
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

  const minWeightInput = document.getElementById("paper-network-min-weight");
  const minYearInput = document.getElementById("paper-network-year-min");
  const maxYearInput = document.getElementById("paper-network-year-max");
  const hideIsolatesInput = document.getElementById("paper-network-hide-isolates");
  const searchInput = document.getElementById("paper-network-search");

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
      const valueLabel = document.getElementById("paper-network-min-weight-value");
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

  if (hideIsolatesInput) {
    hideIsolatesInput.checked = state.hideIsolates;
    hideIsolatesInput.addEventListener("change", () => {
      state.hideIsolates = hideIsolatesInput.checked;
      render();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.search = searchInput.value || "";
      render();
    });
  }

  if (fitViewButton) {
    fitViewButton.addEventListener("click", () => {
      fitGraphToView();
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
