// Grafos de exemplo e gerador de grafos aleatórios.
// Cada grafo: { name, description, directed, source, nodes: [{id, x, y}], edges: [[u, v, peso, posRótulo?]] }
// As coordenadas são livres: a visualização ajusta a escala automaticamente.
(function () {
  'use strict';

  const EXAMPLES = [
    {
      id: 'aula17',
      name: 'Exemplo da aula 17',
      description: 'Não direcionado · 7 vértices · F inalcançável',
      directed: false,
      source: 'S',
      nodes: [
        { id: 'S', x: 80, y: 220 },
        { id: 'A', x: 220, y: 80 },
        { id: 'B', x: 220, y: 360 },
        { id: 'D', x: 500, y: 80 },
        { id: 'C', x: 500, y: 360 },
        { id: 'E', x: 640, y: 220 },
        { id: 'F', x: 880, y: 220 }
      ],
      edges: [
        ['S', 'A', 1], ['S', 'B', 3], ['A', 'D', 5], ['A', 'C', 4, 0.3],
        ['B', 'D', 4, 0.3], ['B', 'C', 1], ['D', 'E', 2], ['C', 'E', 6]
      ]
    },
    {
      id: 'sssp',
      name: 'Grafo dos slides (0 a 7)',
      description: 'Direcionado · 8 vértices',
      directed: true,
      source: '0',
      nodes: [
        { id: '0', x: 50, y: 170 },
        { id: '1', x: 345, y: 48 },
        { id: '2', x: 627, y: 252 },
        { id: '3', x: 740, y: 48 },
        { id: '4', x: 50, y: 520 },
        { id: '5', x: 433, y: 405 },
        { id: '6', x: 918, y: 515 },
        { id: '7', x: 348, y: 250 }
      ],
      edges: [
        ['0', '1', 5], ['0', '7', 8], ['0', '4', 9], ['1', '3', 15], ['1', '7', 4],
        ['1', '2', 12], ['7', '2', 7], ['7', '5', 6], ['4', '7', 5], ['4', '5', 4],
        ['4', '6', 20], ['5', '2', 1], ['5', '6', 13], ['2', '3', 3], ['2', '6', 11],
        ['3', '6', 9]
      ]
    },
    {
      id: 'classico',
      name: 'Grafo clássico A–F',
      description: 'Não direcionado · 6 vértices',
      directed: false,
      source: 'A',
      nodes: [
        { id: 'A', x: 0, y: 300 },
        { id: 'B', x: 260, y: 100 },
        { id: 'C', x: 260, y: 500 },
        { id: 'D', x: 560, y: 100 },
        { id: 'E', x: 560, y: 500 },
        { id: 'F', x: 820, y: 300 }
      ],
      edges: [
        ['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 1], ['B', 'D', 5], ['C', 'D', 8, 0.35],
        ['C', 'E', 10], ['D', 'E', 2], ['D', 'F', 6], ['E', 'F', 3]
      ]
    },
    {
      id: 'cidade',
      name: 'Rotas na cidade',
      description: 'Não direcionado · 7 vértices',
      directed: false,
      source: 'S',
      nodes: [
        { id: 'S', x: 0, y: 300 },
        { id: 'A', x: 220, y: 140 },
        { id: 'B', x: 220, y: 460 },
        { id: 'C', x: 480, y: 60 },
        { id: 'D', x: 480, y: 400 },
        { id: 'E', x: 720, y: 200 },
        { id: 'T', x: 900, y: 400 }
      ],
      edges: [
        ['S', 'A', 3], ['S', 'B', 6], ['A', 'C', 4], ['A', 'D', 4], ['B', 'D', 2],
        ['C', 'E', 5], ['D', 'E', 1], ['D', 'T', 9], ['E', 'T', 3]
      ]
    }
  ];

  // ── Grafo aleatório ──────────────────────────────────────────────────────
  // Sorteia pontos bem espaçados e liga pares próximos sem cruzar arestas
  // (grafo planar, fácil de ler); depois remove arestas mantendo-o conexo.

  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  function segmentsCross(p1, p2, q1, q2) {
    const d1 = cross(q1, q2, p1);
    const d2 = cross(q1, q2, p2);
    const d3 = cross(p1, p2, q1);
    const d4 = cross(p1, p2, q2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }

  function pointSegmentDistance(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function isConnected(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    edges.forEach(e => { adj[e.i].push(e.j); adj[e.j].push(e.i); });
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) {
      adj[stack.pop()].forEach(k => {
        if (!seen.has(k)) { seen.add(k); stack.push(k); }
      });
    }
    return seen.size === n;
  }

  function tryRandomGraph(n, directed) {
    const W = 1000;
    const H = 560;
    let minDist = Math.sqrt((W * H) / n) * 0.62;
    const pts = [];
    let tries = 0;
    while (pts.length < n) {
      const p = { x: Math.random() * W, y: Math.random() * H };
      if (pts.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= minDist)) pts.push(p);
      if (++tries > 4000) { minDist *= 0.9; tries = 0; }
    }
    pts.sort((a, b) => a.x - b.x); // A é o vértice mais à esquerda

    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({ i, j, d: Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) });
      }
    }
    pairs.sort((a, b) => a.d - b.d);

    const chosen = [];
    for (const p of pairs) {
      if (p.d > minDist * 2.4) break;
      const a = pts[p.i];
      const b = pts[p.j];
      const crosses = chosen.some(c =>
        c.i !== p.i && c.i !== p.j && c.j !== p.i && c.j !== p.j &&
        segmentsCross(a, b, pts[c.i], pts[c.j]));
      if (crosses) continue;
      const nearNode = pts.some((q, k) => k !== p.i && k !== p.j && pointSegmentDistance(q, a, b) < 55);
      if (nearNode) continue;
      chosen.push(p);
    }
    if (!isConnected(n, chosen)) return null;

    // Mantém a árvore geradora e cerca de 45% das arestas extras.
    const target = Math.round((n - 1) + (chosen.length - (n - 1)) * 0.45);
    let edges = chosen.slice();
    for (const e of shuffle(chosen.slice())) {
      if (edges.length <= target) break;
      const rest = edges.filter(x => x !== e);
      if (isConnected(n, rest)) edges = rest;
    }

    const ids = pts.map((_, i) => String.fromCharCode(65 + i));
    let oriented = edges.map(e => [e.i, e.j]);
    if (directed) {
      // Arestas da árvore de busca a partir de A apontam "para fora",
      // para que todos os vértices sejam alcançáveis; as demais são sorteadas.
      const adj = Array.from({ length: n }, () => []);
      edges.forEach((e, k) => { adj[e.i].push([e.j, k]); adj[e.j].push([e.i, k]); });
      const seen = new Set([0]);
      const queue = [0];
      const treeDir = new Map();
      while (queue.length) {
        const u = queue.shift();
        adj[u].forEach(([w, k]) => {
          if (!seen.has(w)) { seen.add(w); treeDir.set(k, [u, w]); queue.push(w); }
        });
      }
      oriented = edges.map((e, k) => treeDir.get(k) || (Math.random() < 0.5 ? [e.i, e.j] : [e.j, e.i]));
    }

    return {
      id: 'aleatorio',
      name: 'Grafo aleatório',
      description: `${directed ? 'Direcionado' : 'Não direcionado'} · ${n} vértices`,
      directed,
      source: 'A',
      nodes: pts.map((p, i) => ({ id: ids[i], x: Math.round(p.x), y: Math.round(p.y) })),
      edges: oriented.map(([u, v]) => [ids[u], ids[v], randInt(1, 12)])
    };
  }

  function randomGraph(n, directed) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const g = tryRandomGraph(n, directed);
      if (g) return g;
    }
    return null;
  }

  window.DijkstraGraphs = { EXAMPLES, randomGraph };
})();
