# dijkstra-visualizer

<p align="right">
  <a href="README.md">English</a> |
  <strong>Português (Brasil)</strong>
</p>

**dijkstra-visualizer** é uma ferramenta educacional interativa, executada no navegador, para visualização do algoritmo de caminhos mínimos de Dijkstra.

A ferramenta foi construída para tornar visíveis as decisões do algoritmo por meio de visualizações sincronizadas do grafo e das estruturas de dados.

---

## ✨ Funcionalidades

- **Grafo grande no centro**, com os vértices em *X* (azuis, distância definitiva) claramente separados dos vértices em *V − X* (brancos, key provisória); o vértice extraído (*w\**) e a aresta avaliada aparecem em laranja.
- **Fila de prioridade *H*** ordenada por key, destacando o mínimo, o vértice extraído e as keys atualizadas.
- **Tabela de distâncias** com key/dist, predecessor e caminho de cada vértice; passe o mouse para ver o caminho no grafo.
- **Pseudocódigo** (o mesmo dos slides, versão com heap), aberto por um botão, com a linha executada em destaque.
- **Execução passo a passo**: avançar, voltar, reiniciar e modo automático com três velocidades (teclas <kbd>→</kbd> <kbd>←</kbd> <kbd>espaço</kbd> <kbd>A</kbd> <kbd>P</kbd>).
- **Grafos de exemplo** (incluindo os das aulas) e **grafos aleatórios** planares, direcionados ou não; no passo inicial, clique em um vértice para escolher a origem.
- Links diretos para um exemplo/passo: `?grafo=sssp&passo=5&pseudo=1` ou `?grafo=aleatorio&n=8&dir=1`.
- Paleta e fonte (Lexend) iguais às dos slides da disciplina; totalmente no cliente, sem backend.

---

## 🛠️ Stack tecnológica

- **HTML / CSS / JavaScript** puro
- Sem framework externo de UI

---

## 🎓 Créditos

**Desenvolvido por**  
**Lucas Nunes Alegre**

**Nota de desenvolvimento**  
Esta ferramenta foi criada com a assistência de **IA Generativa**.

---
## 📦 Licença

Este projeto está licenciado sob a **Licença MIT**.

Você pode usar, modificar e redistribuir, desde que haja a devida atribuição.

Veja o arquivo `LICENSE` para detalhes.
