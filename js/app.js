document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viewHost');
  const stepBtn = document.getElementById('stepBtn');
  const autoBtn = document.getElementById('autoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const newGraphBtn = document.getElementById('newGraphBtn');
  const statusBanner = document.getElementById('statusBanner');
  const liveBadge = document.getElementById('liveBadge');
  const pqDisplay = document.getElementById('pqDisplay');
  const distTable = document.getElementById('distTable');
  const pseudoCode = document.getElementById('pseudoCode');
  const relaxExplain = document.getElementById('relaxExplain');
  const exampleGraphSelect = document.getElementById('exampleGraphSelect');
  const loadExampleBtn = document.getElementById('loadExampleBtn');
  const exportGraphBtn = document.getElementById('exportGraphBtn');
  const graphFileInput = document.getElementById('graphFileInput');
  const graphJsonInput = document.getElementById('graphJsonInput');
  const applyGraphBtn = document.getElementById('applyGraphBtn');
  const nodeCountInput = document.getElementById('nodeCountInput');
  const densityRange = document.getElementById('densityRange');
  const densityValue = document.getElementById('densityValue');
  const boardStack = document.getElementById('boardStack');
  const boardResizeHandle = boardStack?.querySelector('.resize-handle-x');

  let graph = {};
  let nodes = [];
  let edges = [];
  
  let distances = {};
  let previous = {};
  let pq = [];
  let visited = new Set();
  let state = 'IDLE'; // IDLE, RUNNING, DONE
  let autoTimer = null;
  let startNode = null;
  let currentNode = null;
  let activePseudoLine = 'idle';
  let relaxationChecks = [];

  const AUTO_RUN_DELAY_MS = 500;

  const pseudoLines = [
    { key: 'idle', text: 'Click Run step to initialize Dijkstra.' },
    { key: 'init-all', text: 'for each node v: dist[v] = infinity; prev[v] = null' },
    { key: 'seed-start', text: 'dist[start] = 0; Q.push(start, 0)' },
    { key: 'while-loop', text: 'while Q is not empty:' },
    { key: 'extract-min', text: 'u = extract-min(Q)' },
    { key: 'skip-visited', text: 'if u already visited: continue' },
    { key: 'visit-u', text: 'mark u as visited' },
    { key: 'scan-neighbors', text: 'for each neighbor v of u with weight w:' },
    { key: 'relax-update', text: 'if dist[u] + w < dist[v]: dist[v] = dist[u] + w; prev[v] = u' },
    { key: 'done', text: 'Q empty -> done; shortest paths finalized' }
  ];

  const exampleGraphs = {
    classic: {
      label: 'Classic A-F Graph',
      graph: {
        start: 'A',
        nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
        edges: [
          { source: 'A', target: 'B', weight: 4 },
          { source: 'A', target: 'C', weight: 2 },
          { source: 'B', target: 'C', weight: 1 },
          { source: 'B', target: 'D', weight: 5 },
          { source: 'C', target: 'D', weight: 8 },
          { source: 'C', target: 'E', weight: 10 },
          { source: 'D', target: 'E', weight: 2 },
          { source: 'D', target: 'F', weight: 6 },
          { source: 'E', target: 'F', weight: 3 }
        ]
      }
    },
    city: {
      label: 'City Route Graph',
      graph: {
        start: 'S',
        nodes: ['S', 'A', 'B', 'C', 'D', 'E', 'T'],
        edges: [
          { source: 'S', target: 'A', weight: 3 },
          { source: 'S', target: 'B', weight: 6 },
          { source: 'A', target: 'C', weight: 4 },
          { source: 'A', target: 'D', weight: 4 },
          { source: 'B', target: 'D', weight: 2 },
          { source: 'C', target: 'E', weight: 5 },
          { source: 'D', target: 'E', weight: 1 },
          { source: 'D', target: 'T', weight: 9 },
          { source: 'E', target: 'T', weight: 3 }
        ]
      }
    },
    sparse: {
      label: 'Sparse Network',
      graph: {
        start: 'A',
        nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        edges: [
          { source: 'A', target: 'B', weight: 7 },
          { source: 'A', target: 'D', weight: 5 },
          { source: 'B', target: 'C', weight: 8 },
          { source: 'B', target: 'E', weight: 7 },
          { source: 'C', target: 'F', weight: 4 },
          { source: 'D', target: 'E', weight: 2 },
          { source: 'E', target: 'F', weight: 6 },
          { source: 'E', target: 'G', weight: 3 },
          { source: 'F', target: 'H', weight: 5 },
          { source: 'G', target: 'H', weight: 2 }
        ]
      }
    }
  };

  function setPseudoLine(lineKey) {
    activePseudoLine = lineKey;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getRandomGraphOptions() {
    const rawNodeCount = parseInt(nodeCountInput?.value || '7', 10);
    const rawDensity = parseInt(densityRange?.value || '40', 10);

    const nodeCount = clamp(Number.isFinite(rawNodeCount) ? rawNodeCount : 7, 4, 24);
    const densityPercent = clamp(Number.isFinite(rawDensity) ? rawDensity : 40, 10, 90);

    if (nodeCountInput) {
      nodeCountInput.value = String(nodeCount);
    }

    return {
      nodeCount,
      density: densityPercent / 100,
      densityPercent
    };
  }

  function updateDensityDisplay() {
    if (!densityValue || !densityRange) return;
    densityValue.textContent = `${densityRange.value}%`;
  }

  function getContainerSize() {
    return {
      width: container.clientWidth || 700,
      height: container.clientHeight || 430
    };
  }

  function computeLeftBiasedLayout(nodeIds, edgeList, startId, width, height) {
    const adjacency = {};
    nodeIds.forEach(id => {
      adjacency[id] = new Set();
    });

    edgeList.forEach(edge => {
      if (adjacency[edge.source] && adjacency[edge.target]) {
        adjacency[edge.source].add(edge.target);
        adjacency[edge.target].add(edge.source);
      }
    });

    const levels = new Map();
    const queue = [startId];
    levels.set(startId, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      const currentLevel = levels.get(current);
      adjacency[current].forEach(next => {
        if (!levels.has(next)) {
          levels.set(next, currentLevel + 1);
          queue.push(next);
        }
      });
    }

    let maxLevel = 0;
    levels.forEach(level => {
      maxLevel = Math.max(maxLevel, level);
    });

    nodeIds.forEach(id => {
      if (!levels.has(id)) {
        maxLevel += 1;
        levels.set(id, maxLevel);
      }
    });

    const grouped = new Map();
    nodeIds.forEach(id => {
      const level = levels.get(id);
      if (!grouped.has(level)) {
        grouped.set(level, []);
      }
      grouped.get(level).push(id);
    });

    const xPadding = 56;
    const yPadding = 42;
    const minNodePadding = 24;
    const usableWidth = Math.max(120, width - (2 * xPadding));
    const safeMaxLevel = Math.max(maxLevel, 1);
    const layout = {};

    const sortedLevels = Array.from(grouped.keys()).sort((a, b) => a - b);
    sortedLevels.forEach(level => {
      const ids = grouped.get(level).sort();
      const x = xPadding + (level / safeMaxLevel) * usableWidth;
      const availableHeight = Math.max(1, height - (2 * yPadding));
      const yStep = ids.length > 1 ? (availableHeight / (ids.length - 1)) : 0;

      ids.forEach((id, index) => {
        const baseY = ids.length === 1 ? (height / 2) : (yPadding + (yStep * index));
        const seed = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const jitter = id === startId ? 0 : ((seed % 11) - 5);
        const y = clamp(baseY + jitter, minNodePadding, height - minNodePadding);

        layout[id] = {
          x: clamp(x, minNodePadding, width - minNodePadding),
          y
        };
      });
    });

    return layout;
  }

  function resetAlgorithmState() {
    distances = {};
    previous = {};
    pq = [];
    relaxationChecks = [];
    visited.clear();
    state = 'IDLE';
    currentNode = null;
    setPseudoLine('idle');
    liveBadge.textContent = 'Ready';
    liveBadge.className = 'live-badge';
  }

  function buildAdjacencyFromEdges(nodeList, edgeList) {
    const adjacency = {};
    nodeList.forEach(node => {
      adjacency[node.id] = [];
    });

    edgeList.forEach(edge => {
      adjacency[edge.source].push({ node: edge.target, weight: edge.weight });
      adjacency[edge.target].push({ node: edge.source, weight: edge.weight });
    });

    return adjacency;
  }

  function normalizeGraphDefinition(definition) {
    if (!definition || typeof definition !== 'object') {
      throw new Error('Graph definition must be a JSON object.');
    }

    if (!Array.isArray(definition.edges) || definition.edges.length === 0) {
      throw new Error('Graph must include a non-empty "edges" array.');
    }

    const edgeList = definition.edges.map((edge, index) => {
      if (!edge || typeof edge !== 'object') {
        throw new Error(`Edge at index ${index} is not valid.`);
      }

      const source = String(edge.source || '').trim();
      const target = String(edge.target || '').trim();
      const weight = Number(edge.weight);

      if (!source || !target) {
        throw new Error(`Edge at index ${index} must define source and target.`);
      }

      if (!Number.isFinite(weight) || weight <= 0) {
        throw new Error(`Edge ${source}-${target} must have a positive weight.`);
      }

      return { source, target, weight };
    });

    const nodeMap = new Map();
    if (Array.isArray(definition.nodes) && definition.nodes.length > 0) {
      definition.nodes.forEach((rawNode, index) => {
        if (typeof rawNode === 'string') {
          const id = rawNode.trim();
          if (!id) {
            throw new Error(`Node at index ${index} is empty.`);
          }
          nodeMap.set(id, { id });
          return;
        }

        if (!rawNode || typeof rawNode !== 'object') {
          throw new Error(`Node at index ${index} is not valid.`);
        }

        const id = String(rawNode.id || '').trim();
        if (!id) {
          throw new Error(`Node at index ${index} must include an id.`);
        }

        nodeMap.set(id, {
          id,
          x: Number.isFinite(rawNode.x) ? rawNode.x : undefined,
          y: Number.isFinite(rawNode.y) ? rawNode.y : undefined
        });
      });
    }

    edgeList.forEach(edge => {
      if (!nodeMap.has(edge.source)) {
        nodeMap.set(edge.source, { id: edge.source });
      }
      if (!nodeMap.has(edge.target)) {
        nodeMap.set(edge.target, { id: edge.target });
      }
    });

    const nodeList = Array.from(nodeMap.values());
    if (nodeList.length < 2) {
      throw new Error('Graph must contain at least two nodes.');
    }

    const start = definition.start && nodeMap.has(definition.start)
      ? definition.start
      : nodeList[0].id;

    const { width, height } = getContainerSize();
    const layout = computeLeftBiasedLayout(
      nodeList.map(node => node.id),
      edgeList,
      start,
      width,
      height
    );

    nodeList.forEach((node, index) => {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        node.x = layout[node.id].x;
        node.y = layout[node.id].y;
      }
    });

    return {
      start,
      nodes: nodeList,
      edges: edgeList
    };
  }

  function renderGraph() {
    container.innerHTML = '';
    drawEdges();
    drawNodes();
  }

  function syncGraphEditor() {
    if (!graphJsonInput) return;

    const serialized = {
      start: startNode,
      nodes: nodes.map(node => ({
        id: node.id,
        x: Math.round(node.x),
        y: Math.round(node.y)
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight
      }))
    };

    graphJsonInput.value = JSON.stringify(serialized, null, 2);
  }

  function loadGraphDefinition(definition, sourceLabel = 'Graph loaded.') {
    stopAuto();

    const normalized = normalizeGraphDefinition(definition);
    startNode = normalized.start;
    nodes = normalized.nodes;
    edges = normalized.edges;
    graph = buildAdjacencyFromEdges(nodes, edges);
    resetAlgorithmState();
    statusBanner.textContent = sourceLabel;

    renderGraph();
    updateUI();
    syncGraphEditor();
  }

  function generateRandomGraphDefinition() {
    const { nodeCount, density } = getRandomGraphOptions();
    const { width, height } = getContainerSize();
    const generatedEdges = [];

    const makeNodeId = index => {
      if (index < 26) return String.fromCharCode(65 + index);
      return `N${index + 1}`;
    };

    const generatedNodeIds = [];

    for (let i = 0; i < nodeCount; i++) {
      generatedNodeIds.push(makeNodeId(i));
    }

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const isCycleEdge = j === i + 1 || (i === 0 && j === nodeCount - 1);
        if (isCycleEdge || Math.random() < density) {
          generatedEdges.push({
            source: generatedNodeIds[i],
            target: generatedNodeIds[j],
            weight: Math.floor(Math.random() * 9) + 1
          });
        }
      }
    }

    const startId = generatedNodeIds[0];
    const layout = computeLeftBiasedLayout(generatedNodeIds, generatedEdges, startId, width, height);
    const generatedNodes = generatedNodeIds.map(id => ({
      id,
      x: layout[id].x,
      y: layout[id].y
    }));

    return {
      start: startId,
      nodes: generatedNodes,
      edges: generatedEdges
    };
  }

  function setupBoardResizeHandle() {
    if (!boardStack || !boardResizeHandle) return;

    const minLeft = 280;
    const minRight = 330;

    const clearInlineSplitOnSmallScreens = () => {
      if (window.matchMedia('(max-width: 1200px)').matches) {
        boardStack.style.gridTemplateColumns = '';
      }
    };

    clearInlineSplitOnSmallScreens();
    window.addEventListener('resize', clearInlineSplitOnSmallScreens);

    boardResizeHandle.addEventListener('pointerdown', event => {
      if (window.matchMedia('(max-width: 1200px)').matches) return;

      event.preventDefault();
      const pointerId = event.pointerId;
      boardResizeHandle.setPointerCapture(pointerId);
      boardResizeHandle.classList.add('is-active');
      document.body.classList.add('is-resizing');

      const stackRect = boardStack.getBoundingClientRect();
      const leftPanel = boardStack.querySelector('.main-visual-panel');
      const rightPanel = boardStack.querySelector('.details-panel');
      const handleRect = boardResizeHandle.getBoundingClientRect();

      const initialLeft = leftPanel ? leftPanel.getBoundingClientRect().width : stackRect.width * 0.5;
      const initialRight = rightPanel ? rightPanel.getBoundingClientRect().width : stackRect.width * 0.5;
      const handleWidth = handleRect.width || 14;
      const startX = event.clientX;

      const onMove = moveEvent => {
        const deltaX = moveEvent.clientX - startX;
        const maxLeft = Math.max(minLeft, stackRect.width - handleWidth - minRight);
        const nextLeft = clamp(initialLeft + deltaX, minLeft, maxLeft);
        const nextRight = Math.max(minRight, stackRect.width - handleWidth - nextLeft);
        boardStack.style.gridTemplateColumns = `${Math.round(nextLeft)}px ${Math.round(handleWidth)}px ${Math.round(nextRight)}px`;
      };

      const onUp = () => {
        boardResizeHandle.classList.remove('is-active');
        document.body.classList.remove('is-resizing');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
    });
  }

  function initGraph() {
    const options = getRandomGraphOptions();
    loadGraphDefinition(
      generateRandomGraphDefinition(),
      `Random graph generated (${options.nodeCount} nodes, ${options.densityPercent}% density). Click "Run step" to start.`
    );
  }

  function drawEdges() {
    edges.forEach(edge => {
      const n1 = nodes.find(n => n.id === edge.source);
      const n2 = nodes.find(n => n.id === edge.target);
      
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      const edgeEl = document.createElement('div');
      edgeEl.className = 'edge';
      edgeEl.id = `edge-${edge.source}-${edge.target}`;
      edgeEl.style.width = `${length}px`;
      edgeEl.style.height = '2px';
      edgeEl.style.left = `${n1.x}px`;
      edgeEl.style.top = `${n1.y}px`;
      edgeEl.style.transform = `rotate(${angle}deg)`;
      container.appendChild(edgeEl);

      const label = document.createElement('div');
      label.className = 'edge-weight';
      label.textContent = edge.weight;
      label.style.left = `${n1.x + dx/2}px`;
      label.style.top = `${n1.y + dy/2}px`;
      container.appendChild(label);
    });
  }

  function drawNodes() {
    nodes.forEach(node => {
      const el = document.createElement('div');
      el.className = 'node';
      el.id = `node-${node.id}`;
      el.style.left = `${node.x}px`;
      el.style.top = `${node.y}px`;
      el.textContent = node.id;

      const distLabel = document.createElement('div');
      distLabel.className = 'node-dist';
      distLabel.id = `dist-${node.id}`;
      distLabel.textContent = '∞';
      el.appendChild(distLabel);

      el.addEventListener('pointerdown', event => {
        if (state !== 'IDLE') {
          statusBanner.textContent = 'Reset first to edit node positions.';
          return;
        }

        event.preventDefault();
        const pointerId = event.pointerId;
        el.setPointerCapture(pointerId);

        const onMove = moveEvent => {
          const rect = container.getBoundingClientRect();
          const x = Math.max(24, Math.min(rect.width - 24, moveEvent.clientX - rect.left));
          const y = Math.max(24, Math.min(rect.height - 24, moveEvent.clientY - rect.top));
          node.x = x;
          node.y = y;
          renderGraph();
          updateUI();
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          syncGraphEditor();
          statusBanner.textContent = `Moved node ${node.id}.`;
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp, { once: true });
      });

      container.appendChild(el);
    });
  }

  function setupAlgorithm() {
    relaxationChecks = [];
    setPseudoLine('init-all');
    nodes.forEach(n => {
      distances[n.id] = Infinity;
      previous[n.id] = null;
    });
    distances[startNode] = 0;
    pq.push({ node: startNode, dist: 0 });
    state = 'RUNNING';
    setPseudoLine('seed-start');
    updateUI();
  }

  function stepAlgorithm() {
    if (state === 'IDLE') {
      setupAlgorithm();
      statusBanner.textContent = 'Algorithm initialized.';
      liveBadge.textContent = 'Running';
      liveBadge.classList.add('active');
      return;
    }

    if (state === 'DONE') return;

    if (pq.length === 0) {
      state = 'DONE';
      relaxationChecks = [];
      currentNode = null;
      setPseudoLine('done');
      statusBanner.textContent = 'Algorithm complete. Shortest paths found.';
      liveBadge.textContent = 'Done';
      liveBadge.className = 'live-badge';
      stopAuto();
      updateUI();
      return;
    }

    // Sort pq (simple array-based priority queue)
    relaxationChecks = [];
    setPseudoLine('while-loop');
    pq.sort((a, b) => a.dist - b.dist);
    const { node: u, dist } = pq.shift();
    setPseudoLine('extract-min');

    currentNode = u;
    
    if (visited.has(u)) {
      relaxationChecks = [];
      setPseudoLine('skip-visited');
      statusBanner.textContent = `Node ${u} already visited, skipping.`;
      updateUI();
      return;
    }

    visited.add(u);
    setPseudoLine('visit-u');
    statusBanner.textContent = `Visiting node ${u} with distance ${dist}.`;

    const neighbors = graph[u];
    let relaxedAnyEdge = false;
    for (let edge of neighbors) {
      const v = edge.node;
      const weight = edge.weight;
      if (!visited.has(v)) {
        setPseudoLine('scan-neighbors');
        const distUBefore = distances[u];
        const distVBefore = distances[v];
        const alt = distances[u] + weight;
        const updated = alt < distances[v];

        relaxationChecks.push({
          u,
          v,
          weight,
          distUBefore,
          distVBefore,
          candidate: alt,
          updated
        });

        if (alt < distances[v]) {
          distances[v] = alt;
          previous[v] = u;
          pq.push({ node: v, dist: alt });
          relaxedAnyEdge = true;
        }
      }
    }

    setPseudoLine(relaxedAnyEdge ? 'relax-update' : 'scan-neighbors');

    updateUI();
  }

  function updateUI() {
    // Update nodes
    nodes.forEach(n => {
      const el = document.getElementById(`node-${n.id}`);
      const distEl = document.getElementById(`dist-${n.id}`);
      
      el.className = 'node';
      if (n.id === startNode) el.classList.add('start');
      if (visited.has(n.id)) el.classList.add('visited');
      if (n.id === currentNode) el.classList.add('current');

      const d = distances[n.id];
      distEl.textContent = d === Infinity || d === undefined ? '∞' : d;
    });

    // Update edges
    edges.forEach(edge => {
      const el = document.getElementById(`edge-${edge.source}-${edge.target}`);
      if (!el) return;
      el.className = 'edge';
      
      // If part of the shortest path tree
      const isTreeEdge = previous[edge.target] === edge.source || previous[edge.source] === edge.target;
      if (isTreeEdge && (visited.has(edge.source) || visited.has(edge.target))) {
        el.classList.add('visited');
      }

      if (currentNode && (edge.source === currentNode || edge.target === currentNode)) {
        el.classList.add('active');
      }
    });

    // Update Priority Queue and Visited Sets
    const visitedDisplay = document.getElementById('visitedDisplay');
    // pqDisplay is already defined at the top

    if (visitedDisplay) {
      const visitedArray = Array.from(visited);
      visitedDisplay.innerHTML = visitedArray.length === 0 ? '∅' : `{ ${visitedArray.join(', ')} }`;
    }

    if (pqDisplay) {
      pqDisplay.innerHTML = `[ ${pq.map(item => `(${item.node}: ${item.dist})`).join(', ')} ]`;
    }

    renderDistanceTable();
    renderPseudoCode();
    renderRelaxationExplain();
  }

  function formatDistanceValue(value) {
    return value === Infinity || value === undefined ? '∞' : value;
  }

  function renderRelaxationExplain() {
    if (!relaxExplain) return;

    if (!currentNode || relaxationChecks.length === 0) {
      relaxExplain.textContent = 'Run a step to see dist[u] + w and dist[v] values for each neighbor check.';
      return;
    }

    let html = '<table class="relaxation-table">';
    html += '<thead><tr><th>u</th><th>v</th><th>dist[u]</th><th>w</th><th>candidate</th><th>dist[v]</th><th>result</th></tr></thead><tbody>';

    relaxationChecks.forEach(check => {
      const resultClass = check.updated ? 'relax-updated' : 'relax-kept';
      const resultLabel = check.updated ? 'updated' : 'kept';
      html += `<tr><td>${check.u}</td><td>${check.v}</td><td>${formatDistanceValue(check.distUBefore)}</td><td>${check.weight}</td><td>${formatDistanceValue(check.candidate)}</td><td>${formatDistanceValue(check.distVBefore)}</td><td class="${resultClass}">${resultLabel}</td></tr>`;
    });

    html += '</tbody></table>';
    relaxExplain.innerHTML = html;
  }

  function renderDistanceTable() {
    if (!distTable) return;

    let tableHtml = '<table class="dist-table">';
    tableHtml += '<thead><tr><th>Node</th><th>Dist</th><th>Prev</th></tr></thead><tbody>';

    nodes.forEach(n => {
      const d = distances[n.id] === Infinity || distances[n.id] === undefined ? '∞' : distances[n.id];
      const p = previous[n.id] || '-';
      const rowClass = n.id === currentNode ? 'dist-row-current' : (visited.has(n.id) ? 'dist-row-visited' : '');
      tableHtml += `<tr class="${rowClass}"><td><strong>${n.id}</strong></td><td>${d}</td><td>${p}</td></tr>`;
    });

    tableHtml += '</tbody></table>';
    distTable.innerHTML = tableHtml;
  }

  function renderPseudoCode() {
    if (!pseudoCode) return;

    const codeHtml = pseudoLines
      .map((line, index) => {
        const isActive = line.key === activePseudoLine ? 'active' : '';
        return `<li class="${isActive}"><span class="pseudo-line-no">${index + 1}</span><span class="pseudo-line-text">${line.text}</span></li>`;
      })
      .join('');

    pseudoCode.innerHTML = `<ol class="pseudo-list">${codeHtml}</ol>`;
  }

  function toggleAuto() {
    if (autoTimer) {
      stopAuto();
    } else {
      autoBtn.textContent = 'Stop Auto';
      autoBtn.classList.add('active');
      autoTimer = setInterval(() => {
        stepAlgorithm();
        if (state === 'DONE') stopAuto();
      }, AUTO_RUN_DELAY_MS);
    }
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
    autoBtn.textContent = 'Auto run';
    autoBtn.classList.remove('active');
  }

  stepBtn.addEventListener('click', () => {
    stopAuto();
    stepAlgorithm();
  });

  autoBtn.addEventListener('click', toggleAuto);

  resetBtn.addEventListener('click', () => {
    stopAuto();
    resetAlgorithmState();
    statusBanner.textContent = 'Reset to start.';
    updateUI();
  });

  newGraphBtn.addEventListener('click', () => {
    stopAuto();
    initGraph();
  });

  nodeCountInput?.addEventListener('change', () => {
    getRandomGraphOptions();
  });

  densityRange?.addEventListener('input', () => {
    updateDensityDisplay();
  });

  function populateExampleSelect() {
    if (!exampleGraphSelect) return;

    const options = Object.entries(exampleGraphs)
      .map(([key, value]) => `<option value="${key}">${value.label}</option>`)
      .join('');

    exampleGraphSelect.innerHTML = options;
    exampleGraphSelect.value = 'classic';
  }

  loadExampleBtn?.addEventListener('click', () => {
    const selected = exampleGraphSelect?.value;
    if (!selected || !exampleGraphs[selected]) return;
    loadGraphDefinition(exampleGraphs[selected].graph, `Loaded example: ${exampleGraphs[selected].label}.`);
  });

  applyGraphBtn?.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(graphJsonInput.value);
      loadGraphDefinition(parsed, 'Custom graph applied.');
    } catch (error) {
      statusBanner.textContent = `Could not apply graph: ${error.message}`;
    }
  });

  exportGraphBtn?.addEventListener('click', () => {
    syncGraphEditor();
    statusBanner.textContent = 'Current graph exported to the JSON editor.';
  });

  graphFileInput?.addEventListener('change', async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      loadGraphDefinition(parsed, `Loaded graph file: ${file.name}.`);
    } catch (error) {
      statusBanner.textContent = `Could not load file: ${error.message}`;
    } finally {
      event.target.value = '';
    }
  });

  // Modals
  const helpBtn = document.getElementById('helpBtn');
  const helpOverlay = document.getElementById('helpOverlay');
  const helpCloseBtn = document.getElementById('helpCloseBtn');
  
  const referencesBtn = document.getElementById('referencesBtn');
  const referencesOverlay = document.getElementById('referencesOverlay');
  const referencesCloseBtn = document.getElementById('referencesCloseBtn');
  
  helpBtn.addEventListener('click', () => helpOverlay.hidden = false);
  helpCloseBtn.addEventListener('click', () => helpOverlay.hidden = true);
  
  referencesBtn.addEventListener('click', () => referencesOverlay.hidden = false);
  referencesCloseBtn.addEventListener('click', () => referencesOverlay.hidden = true);
  
  // Theme Toggle
  const themeToggle = document.getElementById('themeToggle');
  
  // Load saved theme
  if (localStorage.getItem('theme') === 'dark') {
    document.body.dataset.theme = 'dark';
  }
  
  themeToggle.addEventListener('click', () => {
    if (document.body.dataset.theme === 'dark') {
      document.body.dataset.theme = '';
      localStorage.setItem('theme', 'light');
    } else {
      document.body.dataset.theme = 'dark';
      localStorage.setItem('theme', 'dark');
    }
  });

  populateExampleSelect();
  updateDensityDisplay();
  setupBoardResizeHandle();

  // Small delay to ensure container dimensions are set
  setTimeout(() => {
    loadGraphDefinition(exampleGraphs.classic.graph, 'Loaded default example graph. Click "Run step" to start.');
  }, 100);
});
