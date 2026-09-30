// Visualização do algoritmo de Dijkstra com fila de prioridade (heap).
// Toda a execução é pré-calculada como uma lista de passos (snapshots);
// avançar/voltar apenas escolhe qual passo desenhar.
(function () {
  'use strict';

  const { EXAMPLES, randomGraph } = window.DijkstraGraphs;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const R = 27;       // raio dos vértices (unidades do SVG)
  const ARROW = 17;   // comprimento da ponta de seta
  const INF = Infinity;

  const $ = id => document.getElementById(id);
  const ui = {
    layout: $('layout'),
    svg: $('graph'),
    graphName: $('graphName'),
    setX: $('setX'),
    setRest: $('setRest'),
    heap: $('heap'),
    distBody: $('distBody'),
    message: $('message'),
    stepCounter: $('stepCounter'),
    progressBar: $('progressBar'),
    pseudoPanel: $('pseudoPanel'),
    pseudoBtn: $('pseudoBtn'),
    graphsBtn: $('graphsBtn'),
    graphsMenu: $('graphsMenu'),
    exampleList: $('exampleList'),
    nodeCount: $('nodeCount'),
    nodeCountValue: $('nodeCountValue'),
    directedCheck: $('directedCheck'),
    randomBtn: $('randomBtn'),
    helpBtn: $('helpBtn'),
    helpDialog: $('helpDialog'),
    resetBtn: $('resetBtn'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    autoBtn: $('autoBtn'),
    speedSelect: $('speedSelect')
  };

  let graph = null;     // grafo normalizado
  let steps = [];       // snapshots da execução
  let current = 0;      // passo exibido
  let timer = null;     // execução automática
  let hovered = null;   // vértice cujo caminho está destacado
  let dom = null;       // elementos SVG do grafo atual

  const fmt = value => (value === INF ? '∞' : String(value));
  const nodeRef = id => `<span class="ref">${id}</span>`;

  // ── Grafo ────────────────────────────────────────────────────────────────

  function normalize(def) {
    const nodes = def.nodes.map(n => ({ ...n }));
    const edges = def.edges.map(([u, v, w, t]) => ({ u, v, w, t: t == null ? 0.5 : t }));
    const order = new Map(nodes.map((n, i) => [n.id, i]));
    const adj = new Map(nodes.map(n => [n.id, []]));
    edges.forEach((e, i) => {
      adj.get(e.u).push({ to: e.v, w: e.w, edge: i });
      if (!def.directed) adj.get(e.v).push({ to: e.u, w: e.w, edge: i });
    });
    adj.forEach(list => list.sort((a, b) => order.get(a.to) - order.get(b.to)));
    return { name: def.name, description: def.description, directed: def.directed, source: def.source, nodes, edges, order, adj };
  }

  // ── Execução (pseudocódigo do slide DijkstraHeap, aula 18) ──────────────

  function buildSteps(g) {
    const s = g.source;
    const ids = g.nodes.map(n => n.id);
    const key = {};
    const dist = {};
    const pred = {};
    const predEdge = {};
    const X = [];
    const H = new Set();
    const out = [];

    const snap = extra => out.push(Object.assign({
      key: { ...key }, dist: { ...dist }, pred: { ...pred }, predEdge: { ...predEdge },
      X: X.slice(), H: Array.from(H),
      wStar: null, target: null, edge: null, changed: null, old: null, extracted: null
    }, extra));

    const m = g.edges.length;
    snap({
      phase: 'input',
      lines: [1, 2],
      msg: `<b>Entrada:</b> grafo ${g.directed ? 'direcionado' : 'não direcionado'} com ${ids.length} vértices e ${m} arestas (pesos <i>ℓ</i> ≥ 0) e origem <i>s</i> = ${nodeRef(s)}. ` +
        `<b>Saída:</b> dist(<i>v</i>) para todo <i>v</i> ∈ <i>V</i>. <span class="tip">Clique em um vértice para mudar a origem.</span>`
    });

    ids.forEach(id => { key[id] = id === s ? 0 : INF; H.add(id); });
    snap({
      phase: 'init',
      lines: [3, 4, 5, 6, 7],
      msg: `<b>Inicialização:</b> <i>X</i> = ∅, key(${nodeRef(s)}) = 0 e key(<i>v</i>) = ∞ para os demais. Todos os vértices entram em <i>H</i>.`
    });

    while (H.size > 0) {
      let w = null;
      H.forEach(id => {
        if (w === null || key[id] < key[w] || (key[id] === key[w] && g.order.get(id) < g.order.get(w))) w = id;
      });
      H.delete(w);
      X.push(w);
      dist[w] = key[w];
      const unreachable = dist[w] === INF;
      snap({
        phase: 'extract',
        lines: [8, 9, 10, 11],
        wStar: w,
        extracted: { id: w, key: key[w] },
        msg: `<b>ExtractMin(<i>H</i>)</b> = ${nodeRef(w)}, com key ${fmt(key[w])}. ${nodeRef(w)} sai de <i>H</i> e entra em <i>X</i>: dist(${nodeRef(w)}) = <b>${fmt(dist[w])}</b>.` +
          (unreachable ? ` Como a key é ∞, ${nodeRef(w)} não é alcançável a partir de ${nodeRef(s)}.` : '')
      });
      let evaluated = 0;
      for (const { to: y, w: len, edge } of unreachable ? [] : g.adj.get(w)) {
        if (!H.has(y)) continue; // y já está em X
        evaluated++;
        const old = key[y];
        const cand = dist[w] + len;
        const better = cand < old;
        if (better) {
          key[y] = cand;
          pred[y] = w;
          predEdge[y] = edge;
        }
        snap({
          phase: 'relax',
          lines: [12, 13, 14, 15],
          wStar: w,
          target: y,
          edge,
          changed: better ? y : null,
          old,
          msg: `Aresta (${nodeRef(w)}, ${nodeRef(y)}): key(${nodeRef(y)}) = min{${fmt(old)}, ${dist[w]} + ${len}} = <b>${fmt(key[y])}</b> — ` +
            (better ? '<span class="good">atualizada!</span>' : 'sem mudança.')
        });
      }

      // Pausa entre as atualizações e o próximo ExtractMin: as keys em H já
      // estão atualizadas, mas o próximo vértice ainda não foi extraído.
      if (H.size > 0) {
        let summary;
        if (unreachable) summary = `Como dist(${nodeRef(w)}) = ∞, nenhuma key muda.`;
        else if (evaluated === 0) summary = `${nodeRef(w)} não tem arestas para vértices de <i>V − X</i>: nenhuma key muda.`;
        else summary = `Todas as arestas de ${nodeRef(w)} para <i>V − X</i> foram avaliadas: as keys em <i>H</i> estão atualizadas.`;
        snap({
          phase: 'pause',
          lines: [8],
          msg: `${summary} <span class="tip"><i>H</i> não está vazia; o próximo passo é ExtractMin(<i>H</i>). Qual vértice será extraído?</span>`
        });
      }
    }

    snap({
      phase: 'done',
      lines: [8, 16],
      msg: `<b><i>H</i> está vazia: fim!</b> Cada dist(<i>v</i>) é a distância mínima de ${nodeRef(s)} até <i>v</i>; as arestas azuis formam a árvore de caminhos mínimos.`
    });
    return out;
  }

  // ── Desenho do grafo (feito uma vez por grafo) ───────────────────────────

  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.appendChild(el);
    return el;
  }

  function edgeGeometry(g, e) {
    const a = g.nodes[g.order.get(e.u)];
    const b = g.nodes[g.order.get(e.v)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const tail = g.directed ? R + ARROW : R;
    const reciprocal = g.directed && g.edges.some(o => o.u === e.v && o.v === e.u);

    if (!reciprocal) {
      const ux = dx / len;
      const uy = dy / len;
      const x1 = a.x + ux * R;
      const y1 = a.y + uy * R;
      const x2 = b.x - ux * tail;
      const y2 = b.y - uy * tail;
      return {
        d: `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`,
        lx: a.x + dx * e.t,
        ly: a.y + dy * e.t
      };
    }
    // Arcos u→v e v→u: curva cada um para um lado.
    const off = len * 0.16;
    const cx = (a.x + b.x) / 2 - (dy / len) * off;
    const cy = (a.y + b.y) / 2 + (dx / len) * off;
    const unit = (px, py) => { const l = Math.hypot(cx - px, cy - py); return [(cx - px) / l, (cy - py) / l]; };
    const [sx, sy] = unit(a.x, a.y);
    const [ex, ey] = unit(b.x, b.y);
    const x1 = a.x + sx * R;
    const y1 = a.y + sy * R;
    const x2 = b.x + ex * tail;
    const y2 = b.y + ey * tail;
    return {
      d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`,
      lx: 0.25 * a.x + 0.5 * cx + 0.25 * b.x,
      ly: 0.25 * a.y + 0.5 * cy + 0.25 * b.y
    };
  }

  // Escolhe, ao redor de cada vértice, direções livres de arestas para o
  // rótulo de distância e para a etiqueta "origem".
  const SPOTS = [-90, -45, -135, 0, 180, 45, 135, 90].map(deg => (deg * Math.PI) / 180);

  function freeDirections(g, n) {
    const dirs = [];
    g.edges.forEach(e => {
      if (e.u !== n.id && e.v !== n.id) return;
      const other = g.nodes[g.order.get(e.u === n.id ? e.v : e.u)];
      dirs.push(Math.atan2(other.y - n.y, other.x - n.x));
    });
    const gap = a => (dirs.length
      ? Math.min(...dirs.map(d => { const x = Math.abs(a - d) % (2 * Math.PI); return Math.min(x, 2 * Math.PI - x); }))
      : Math.PI);
    // Ordem de preferência em SPOTS desempata direções igualmente livres.
    return SPOTS.map((a, i) => ({ a, score: Math.min(gap(a), Math.PI / 2) - i * 1e-3 }))
      .sort((p, q) => q.score - p.score)
      .map(p => p.a);
  }

  function buildGraph(g) {
    const svg = ui.svg;
    svg.innerHTML = '';
    svg.classList.toggle('directed', g.directed);

    const xs = g.nodes.map(n => n.x);
    const ys = g.nodes.map(n => n.y);
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 72;
    svg.setAttribute('viewBox', `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);

    const defs = svgEl('defs', {}, svg);
    ['base', 'inside', 'cand', 'tree', 'active', 'path'].forEach(kind => {
      const marker = svgEl('marker', {
        id: `arrow-${kind}`, viewBox: '0 0 10 10', refX: '0', refY: '5',
        markerWidth: ARROW, markerHeight: ARROW, markerUnits: 'userSpaceOnUse', orient: 'auto'
      }, defs);
      svgEl('path', { d: 'M0,0 L10,5 L0,10 z', class: `arrow arrow-${kind}` }, marker);
    });

    const halos = svgEl('g', { class: 'layer-halos' }, svg);
    const edgeLayer = svgEl('g', { class: 'layer-edges' }, svg);
    const labelLayer = svgEl('g', { class: 'layer-labels' }, svg);
    const nodeLayer = svgEl('g', { class: 'layer-nodes' }, svg);

    const edges = g.edges.map(e => {
      const geo = edgeGeometry(g, e);
      const path = svgEl('path', { d: geo.d, class: 'edge' }, edgeLayer);
      const label = svgEl('text', { x: geo.lx.toFixed(1), y: geo.ly.toFixed(1), class: 'weight' }, labelLayer);
      label.textContent = e.w;
      return { path, label };
    });

    const nodes = {};
    g.nodes.forEach(n => {
      const halo = svgEl('circle', { cx: n.x, cy: n.y, r: R + 20, class: 'halo' }, halos);
      const group = svgEl('g', { class: 'node', 'data-id': n.id }, nodeLayer);
      svgEl('circle', { cx: n.x, cy: n.y, r: R + 7, class: 'ring' }, group);
      svgEl('circle', { cx: n.x, cy: n.y, r: R, class: 'body' }, group);
      const label = svgEl('text', { x: n.x, y: n.y, class: 'label' }, group);
      label.textContent = n.id;

      const dirs = freeDirections(g, n);
      const badgeAngle = dirs[0];
      const badge = svgEl('g', { class: 'badge' }, group);
      const badgeRect = svgEl('rect', { rx: 8, ry: 8, height: 28 }, badge);
      const badgeText = svgEl('text', {}, badge);

      if (n.id === g.source) {
        const apart = a => Math.abs(Math.atan2(Math.sin(a - badgeAngle), Math.cos(a - badgeAngle))) >= Math.PI / 2;
        const a = dirs.find(apart);
        const tag = svgEl('text', {
          x: (n.x + Math.cos(a) * (R + 22 + 26 * Math.abs(Math.cos(a)))).toFixed(1),
          y: (n.y + Math.sin(a) * (R + 20)).toFixed(1),
          class: 'source-tag'
        }, group);
        tag.textContent = 'origem';
      }

      group.addEventListener('mouseenter', () => setHover(n.id));
      group.addEventListener('mouseleave', () => setHover(null));
      group.addEventListener('click', () => pickSource(n.id));
      nodes[n.id] = { group, halo, badge, badgeRect, badgeText, badgeAngle, x: n.x, y: n.y };
    });

    dom = { nodes, edges };
  }

  // ── Desenho de um passo ──────────────────────────────────────────────────

  function pathTo(state, id) {
    const nodes = [id];
    const edges = [];
    let cur = id;
    while (state.pred[cur] !== undefined) {
      edges.push(state.predEdge[cur]);
      cur = state.pred[cur];
      nodes.unshift(cur);
    }
    return { nodes, edges };
  }

  function renderGraph(state) {
    const inX = new Set(state.X);
    const started = state.phase !== 'input';
    const hoverPath = hovered && started && (state.key[hovered] !== INF)
      ? new Set(pathTo(state, hovered).edges) : new Set();

    const treeEdge = new Map(); // aresta -> vértice cujo pred ela representa
    Object.entries(state.predEdge).forEach(([v, e]) => treeEdge.set(e, v));

    graph.edges.forEach((e, i) => {
      let kind = 'base';
      if (i === state.edge) kind = 'active';
      else if (hoverPath.has(i)) kind = 'path';
      else if (treeEdge.has(i)) kind = inX.has(treeEdge.get(i)) ? 'tree' : 'cand';
      else if (inX.has(e.u) && inX.has(e.v)) kind = 'inside';
      const { path, label } = dom.edges[i];
      path.setAttribute('class', `edge ${kind}`);
      label.setAttribute('class', `weight ${kind}`);
      if (graph.directed) path.setAttribute('marker-end', `url(#arrow-${kind})`);
    });

    graph.nodes.forEach(n => {
      const d = dom.nodes[n.id];
      const classes = ['node'];
      if (inX.has(n.id)) classes.push('in-x');
      if (n.id === state.wStar) classes.push('current');
      if (n.id === state.target) classes.push('target');
      if (n.id === state.changed) classes.push('changed');
      if (n.id === hovered) classes.push('hovered');
      d.group.setAttribute('class', classes.join(' '));
      d.halo.setAttribute('class', inX.has(n.id) ? 'halo on' : 'halo');

      if (!started) {
        d.badge.setAttribute('class', 'badge hidden');
        return;
      }
      const value = inX.has(n.id) ? state.dist[n.id] : state.key[n.id];
      d.badgeText.textContent = fmt(value);
      const width = 20 + 12 * d.badgeText.textContent.length;
      const ca = Math.cos(d.badgeAngle);
      const cx = d.x + ca * (R + 20 + Math.abs(ca) * (width / 2 - 12));
      const cy = d.y + Math.sin(d.badgeAngle) * (R + 20);
      d.badgeText.setAttribute('x', cx.toFixed(1));
      d.badgeText.setAttribute('y', cy.toFixed(1));
      d.badgeRect.setAttribute('x', (cx - width / 2).toFixed(1));
      d.badgeRect.setAttribute('y', (cy - 14).toFixed(1));
      d.badgeRect.setAttribute('width', width);
      let badgeClass = 'badge';
      if (n.id === state.changed) badgeClass += ' changed';
      else if (n.id === state.wStar) badgeClass += ' current';
      else if (inX.has(n.id)) badgeClass += ' in-x';
      d.badge.setAttribute('class', badgeClass);
    });

    ui.svg.classList.toggle('pickable', state.phase === 'input');
  }

  function renderSets(state) {
    const inX = new Set(state.X);
    const list = ids => (ids.length ? `{ ${ids.map(nodeRef).join(', ')} }` : '∅');
    ui.setX.innerHTML = list(state.X);
    ui.setRest.innerHTML = list(graph.nodes.map(n => n.id).filter(id => !inX.has(id)));
  }

  function renderHeap(state) {
    if (state.phase === 'input') {
      ui.heap.innerHTML = '<p class="empty">ainda não inicializada</p>';
      return;
    }
    const sorted = state.H.slice().sort((a, b) =>
      (state.key[a] - state.key[b]) || (graph.order.get(a) - graph.order.get(b)));
    const chips = [];
    if (state.extracted) {
      chips.push(`<div class="chip leaving" title="extraído agora"><span class="chip-id">${state.extracted.id}</span><span class="chip-key">${fmt(state.extracted.key)}</span></div>`);
    }
    sorted.forEach((id, i) => {
      const cls = ['chip'];
      if (i === 0) cls.push('min');
      if (id === state.changed) cls.push('changed');
      if (id === state.target && id !== state.changed) cls.push('target');
      chips.push(`<div class="${cls.join(' ')}"><span class="chip-id">${id}</span><span class="chip-key">${fmt(state.key[id])}</span></div>`);
    });
    ui.heap.innerHTML = chips.length ? chips.join('') : '<p class="empty">vazia</p>';
  }

  function renderTable(state) {
    const inX = new Set(state.X);
    const started = state.phase !== 'input';
    ui.distBody.innerHTML = graph.nodes.map(n => {
      const id = n.id;
      const cls = [inX.has(id) ? 'in-x' : 'rest'];
      if (id === state.wStar) cls.push('current');
      if (id === state.changed) cls.push('changed');
      if (id === hovered) cls.push('hovered');
      let value = '–';
      let pred = '–';
      let path = '';
      if (started) {
        const v = inX.has(id) ? state.dist[id] : state.key[id];
        value = id === state.changed
          ? `<s>${fmt(state.old)}</s> <b>${fmt(v)}</b>`
          : (inX.has(id) ? `<b>${fmt(v)}</b>` : fmt(v));
        pred = state.pred[id] !== undefined ? state.pred[id] : '–';
        if (v !== INF) path = pathTo(state, id).nodes.join(' → ');
      }
      return `<tr class="${cls.join(' ')}" data-id="${id}"><td class="col-v"><span class="dot"></span>${id}</td><td class="col-key">${value}</td><td class="col-pred">${pred}</td><td class="col-path">${path}</td></tr>`;
    }).join('');
  }

  function renderPseudo(state) {
    ui.pseudoPanel.querySelectorAll('li[data-line]').forEach(li => {
      li.classList.toggle('hl', state.lines.includes(Number(li.dataset.line)));
    });
  }

  function render() {
    const state = steps[current];
    renderGraph(state);
    renderSets(state);
    renderHeap(state);
    renderTable(state);
    renderPseudo(state);
    ui.message.innerHTML = state.msg;
    ui.stepCounter.textContent = `Passo ${current} de ${steps.length - 1}`;
    ui.progressBar.style.width = `${(100 * current) / (steps.length - 1)}%`;
    ui.prevBtn.disabled = current === 0;
    ui.resetBtn.disabled = current === 0;
    ui.nextBtn.disabled = current === steps.length - 1;
  }

  // ── Interação ────────────────────────────────────────────────────────────

  function setHover(id) {
    if (hovered === id) return;
    hovered = id;
    const state = steps[current];
    renderGraph(state);
    ui.distBody.querySelectorAll('tr').forEach(tr => tr.classList.toggle('hovered', tr.dataset.id === id));
  }

  function goTo(index) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    render();
    if (current === steps.length - 1) stopAuto();
  }

  function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
    ui.autoBtn.innerHTML = '▶▶ Automático';
    ui.autoBtn.classList.remove('active');
  }

  function startAuto() {
    if (current === steps.length - 1) goTo(0);
    stopAuto();
    timer = setInterval(() => goTo(current + 1), Number(ui.speedSelect.value));
    ui.autoBtn.innerHTML = '❚❚ Pausar';
    ui.autoBtn.classList.add('active');
  }

  function loadGraph(def) {
    stopAuto();
    hovered = null;
    graph = normalize(def);
    steps = buildSteps(graph);
    buildGraph(graph);
    ui.graphName.textContent = `${graph.name} · ${graph.description}`;
    goTo(0);
  }

  function pickSource(id) {
    if (steps[current].phase !== 'input' || id === graph.source) return;
    const def = {
      name: graph.name,
      description: graph.description,
      directed: graph.directed,
      source: id,
      nodes: graph.nodes,
      edges: graph.edges.map(e => [e.u, e.v, e.w, e.t])
    };
    loadGraph(def);
  }

  function toggleMenu(open) {
    const show = open === undefined ? ui.graphsMenu.hidden : open;
    ui.graphsMenu.hidden = !show;
    ui.graphsBtn.setAttribute('aria-expanded', String(show));
  }

  function togglePseudo() {
    const show = ui.pseudoPanel.hidden;
    ui.pseudoPanel.hidden = !show;
    ui.layout.classList.toggle('with-pseudo', show);
    ui.pseudoBtn.setAttribute('aria-pressed', String(show));
    ui.pseudoBtn.classList.toggle('active', show);
  }

  EXAMPLES.forEach(ex => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'example';
    btn.innerHTML = `<span class="example-name">${ex.name}</span><span class="example-desc">${ex.description}</span>`;
    btn.addEventListener('click', () => { loadGraph(ex); toggleMenu(false); });
    ui.exampleList.appendChild(btn);
  });

  ui.nodeCount.addEventListener('input', () => { ui.nodeCountValue.textContent = ui.nodeCount.value; });
  ui.randomBtn.addEventListener('click', () => {
    const g = randomGraph(Number(ui.nodeCount.value), ui.directedCheck.checked);
    if (g) loadGraph(g);
    toggleMenu(false);
  });

  ui.graphsBtn.addEventListener('click', event => { event.stopPropagation(); toggleMenu(); });
  ui.graphsMenu.addEventListener('click', event => event.stopPropagation());
  document.addEventListener('click', () => toggleMenu(false));

  ui.pseudoBtn.addEventListener('click', togglePseudo);
  ui.helpBtn.addEventListener('click', () => ui.helpDialog.showModal());
  ui.resetBtn.addEventListener('click', () => { stopAuto(); goTo(0); });
  ui.prevBtn.addEventListener('click', () => { stopAuto(); goTo(current - 1); });
  ui.nextBtn.addEventListener('click', () => { stopAuto(); goTo(current + 1); });
  ui.autoBtn.addEventListener('click', () => (timer ? stopAuto() : startAuto()));
  ui.speedSelect.addEventListener('change', () => { if (timer) startAuto(); });

  ui.distBody.addEventListener('mouseover', event => {
    const tr = event.target.closest('tr');
    if (tr) setHover(tr.dataset.id);
  });
  ui.distBody.addEventListener('mouseleave', () => setHover(null));

  document.addEventListener('keydown', event => {
    if (ui.helpDialog.open || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    // Espaço/Enter num botão focado já acionam o próprio botão.
    if (tag === 'BUTTON' && (event.key === ' ' || event.key === 'Enter')) return;
    switch (event.key) {
      case 'ArrowRight':
      case ' ':
        event.preventDefault(); stopAuto(); goTo(current + 1); break;
      case 'ArrowLeft':
        event.preventDefault(); stopAuto(); goTo(current - 1); break;
      case 'Home':
        event.preventDefault(); stopAuto(); goTo(0); break;
      case 'End':
        event.preventDefault(); stopAuto(); goTo(steps.length - 1); break;
      case 'a': case 'A':
        timer ? stopAuto() : startAuto(); break;
      case 'p': case 'P':
        togglePseudo(); break;
      case 'Escape':
        toggleMenu(false); break;
      default:
    }
  });

  // Parâmetros opcionais na URL, úteis para linkar a partir dos slides:
  // ?grafo=sssp&passo=5&pseudo=1  ou  ?grafo=aleatorio&n=8&dir=1
  const params = new URLSearchParams(window.location.search);
  const n = Math.max(4, Math.min(12, Number(params.get('n')) || 8));
  const initial = params.get('grafo') === 'aleatorio'
    ? randomGraph(n, params.get('dir') === '1')
    : EXAMPLES.find(ex => ex.id === params.get('grafo'));
  loadGraph(initial || EXAMPLES[0]);
  if (params.has('passo')) goTo(Number(params.get('passo')) || 0);
  if (params.get('pseudo') === '1') togglePseudo();
})();
