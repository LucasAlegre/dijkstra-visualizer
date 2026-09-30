# dijkstra-visualizer

<p align="right">
  <strong>English</strong> |
  <a href="README.pt-BR.md">Português (Brasil)</a>
</p>

**dijkstra-visualizer** is an interactive, browser-based educational webtool for visualizing Dijkstra's shortest path algorithm.

The tool was built to make algorithmic decisions visible through synchronized graph and data structure views.

---

## ✨ Features

- **Large graph in the center**, with nodes in *X* (blue, final distance) clearly separated from nodes in *V − X* (white, tentative key); the extracted node (*w\**) and the edge being relaxed are shown in orange.
- **Priority queue *H*** sorted by key, highlighting the minimum, the extracted node and updated keys.
- **Distance table** with key/dist, predecessor and path for each node; hover to see the path on the graph.
- **Pseudocode** (same heap-based version as the course slides), toggled by a button, with the current line highlighted.
- **Step-by-step execution**: forward, back, reset and auto-run with three speeds (keys <kbd>→</kbd> <kbd>←</kbd> <kbd>space</kbd> <kbd>A</kbd> <kbd>P</kbd>).
- **Example graphs** (including the ones from the lectures) and planar **random graphs**, directed or undirected; on the initial step, click a node to make it the source.
- Direct links to an example/step: `?grafo=sssp&passo=5&pseudo=1` or `?grafo=aleatorio&n=8&dir=1`.
- Colors and font (Lexend) match the course slides; the interface is in Portuguese. Fully client-side, no backend.

---

## 🛠️ Tech stack

- Vanilla **HTML / CSS / JavaScript**
- No external UI framework

---

## 🎓 Credits

**Developed by**  
**Lucas Nunes Alegre**

**Development note**  
This webtool was created with the assistance of **Generative AI**.

---
## 📦 License

This project is licensed under the **MIT License**.

You are free to use, modify, and redistribute it, provided proper attribution is given.

See the `LICENSE` file for details.
