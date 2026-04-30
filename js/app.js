document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('viewHost');
  const stepBtn = document.getElementById('stepBtn');
  const autoBtn = document.getElementById('autoBtn');
  const resetBtn = document.getElementById('resetBtn');
  const newGraphBtn = document.getElementById('newGraphBtn');
  const speedSelect = document.getElementById('speedSelect');
  const statusBanner = document.getElementById('statusBanner');
  const liveBadge = document.getElementById('liveBadge');
  const pqDisplay = document.getElementById('pqDisplay');
  const distTable = document.getElementById('distTable');

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

  // Configuration
  const numNodes = 7;
  
  function initGraph() {
    container.innerHTML = '';
    graph = {};
    nodes = [];
    edges = [];
    distances = {};
    previous = {};
    pq = [];
    visited.clear();
    state = 'IDLE';
    currentNode = null;
    statusBanner.textContent = 'Click "Run step" to start.';
    liveBadge.textContent = 'Ready';
    liveBadge.className = 'live-badge';

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // Generate nodes
    for (let i = 0; i < numNodes; i++) {
      const id = String.fromCharCode(65 + i); // A, B, C...
      const radius = 150;
      const angle = (i / numNodes) * 2 * Math.PI - Math.PI / 2;
      const x = width / 2 + radius * Math.cos(angle);
      const y = height / 2 + radius * Math.sin(angle) + (Math.random() * 40 - 20); // Add some randomness
      
      nodes.push({ id, x, y });
      graph[id] = [];
    }

    // Generate edges (connected graph, maybe Delaunay triangulation or just random close ones)
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        // connect with probability or if they are adjacent in circle
        if (Math.random() < 0.4 || j === i + 1 || (i === 0 && j === numNodes - 1)) {
          const weight = Math.floor(Math.random() * 9) + 1;
          edges.push({ source: nodes[i].id, target: nodes[j].id, weight });
          graph[nodes[i].id].push({ node: nodes[j].id, weight });
          graph[nodes[j].id].push({ node: nodes[i].id, weight });
        }
      }
    }

    startNode = nodes[0].id;
    
    // Draw graph
    drawEdges();
    drawNodes();
    updateUI();
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

      container.appendChild(el);
    });
  }

  function setupAlgorithm() {
    nodes.forEach(n => {
      distances[n.id] = Infinity;
      previous[n.id] = null;
    });
    distances[startNode] = 0;
    pq.push({ node: startNode, dist: 0 });
    state = 'RUNNING';
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
      currentNode = null;
      statusBanner.textContent = 'Algorithm complete. Shortest paths found.';
      liveBadge.textContent = 'Done';
      liveBadge.className = 'live-badge';
      stopAuto();
      updateUI();
      return;
    }

    // Sort pq (simple array-based priority queue)
    pq.sort((a, b) => a.dist - b.dist);
    const { node: u, dist } = pq.shift();

    currentNode = u;
    
    if (visited.has(u)) {
      statusBanner.textContent = `Node ${u} already visited, skipping.`;
      updateUI();
      return;
    }

    visited.add(u);
    statusBanner.textContent = `Visiting node ${u} with distance ${dist}.`;

    const neighbors = graph[u];
    for (let edge of neighbors) {
      const v = edge.node;
      const weight = edge.weight;
      if (!visited.has(v)) {
        const alt = distances[u] + weight;
        if (alt < distances[v]) {
          distances[v] = alt;
          previous[v] = u;
          pq.push({ node: v, dist: alt });
        }
      }
    }

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

    // Update Distances table
    let tableHtml = '<table style="width:100%; text-align:left; border-collapse:collapse; font-size:0.9rem;">';
    tableHtml += '<tr><th style="padding:0.4rem; border-bottom:2px solid var(--line-strong);">Node</th><th style="padding:0.4rem; border-bottom:2px solid var(--line-strong);">Dist</th><th style="padding:0.4rem; border-bottom:2px solid var(--line-strong);">Prev</th></tr>';
    nodes.forEach(n => {
      const d = distances[n.id] === Infinity || distances[n.id] === undefined ? '∞' : distances[n.id];
      const p = previous[n.id] || '-';
      const rowStyle = n.id === currentNode ? 'background:var(--warm-soft);' : (visited.has(n.id) ? 'background:var(--ok-soft);' : '');
      tableHtml += `<tr style="${rowStyle} border-bottom:1px solid var(--line);"><td style="padding:0.4rem;"><strong>${n.id}</strong></td><td style="padding:0.4rem;">${d}</td><td style="padding:0.4rem;">${p}</td></tr>`;
    });
    tableHtml += '</table>';
    distTable.innerHTML = tableHtml;
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
      }, parseInt(speedSelect.value, 10));
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
    const currentNodes = [...nodes];
    const currentEdges = [...edges];
    const currentGraph = JSON.parse(JSON.stringify(graph));
    
    // Soft reset (keep graph geometry)
    distances = {};
    previous = {};
    pq = [];
    visited.clear();
    state = 'IDLE';
    currentNode = null;
    statusBanner.textContent = 'Reset to start.';
    liveBadge.textContent = 'Ready';
    liveBadge.className = 'live-badge';
    
    updateUI();
  });

  newGraphBtn.addEventListener('click', () => {
    stopAuto();
    initGraph();
  });

  speedSelect.addEventListener('change', () => {
    if (autoTimer) {
      stopAuto();
      toggleAuto(); // Restart with new speed
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

  // Small delay to ensure container dimensions are set
  setTimeout(initGraph, 100);
});
