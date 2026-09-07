const noMatch = (message) => { const e = new Error(message); e.name = 'NoMatchError'; throw e; };
const categorySymbol = value => ({ kind: 'category', value: String(value) });
const symbolKey = (start, end, symbol) => JSON.stringify([start, end, symbol.kind, symbol.value]);

export class ChartParser {
  constructor({ grammar, datalog, trace }) {
    this.grammar = grammar;
    this.datalog = datalog;
    this.trace = trace;
  }

  #program() {
    const { rule, lit, variable: v, constant: c } = this.datalog;
    return this.grammar.rules.map((grammarRule, ruleIndex) => {
      const bounds = Array.from({ length: grammarRule.rhs.length + 1 }, (_, index) => v(`b${ruleIndex}_${index}`));
      const body = grammarRule.rhs.map((symbol, index) =>
        lit('span', bounds[index], bounds[index + 1], c(symbol.kind), c(symbol.value))
      );
      return rule('span', [bounds[0], bounds.at(-1), c('category'), c(grammarRule.lhs)], body);
    });
  }

  #database(tokens) {
    const db = new this.datalog.Database();
    tokens.forEach((token, index) => {
      db.add('span', [index, index + 1, 'terminal', token.norm]);
      db.add('span', [index, index + 1, 'category', 'token']);
      for (const klass of token.classes ?? []) db.add('span', [index, index + 1, 'category', String(klass)]);
    });
    this.datalog.evaluate(db, this.#program());
    return db;
  }

  #spanSet(db) {
    return new Set(db.facts('span').map(([start, end, kind, value]) => symbolKey(start, end, { kind, value })));
  }

  #has(spans, start, end, symbol) { return spans.has(symbolKey(start, end, symbol)); }

  #partitions(spans, rhs, start, end, index = 0, cursor = start, chosen = [], limit = 128) {
    if (index === rhs.length) return cursor === end ? [chosen] : [];
    const symbol = rhs[index];
    const out = [];
    const minRemaining = rhs.length - index - 1;
    for (let next = cursor + 1; next <= end - minRemaining && out.length < limit; next++) {
      if (!this.#has(spans, cursor, next, symbol)) continue;
      out.push(...this.#partitions(spans, rhs, start, end, index + 1, next, [...chosen, [cursor, next, symbol]], limit - out.length));
    }
    return out.slice(0, limit);
  }

  #trees(tokens, spans, symbol, start, end, memo, stack = new Set(), limit = 32) {
    const memoKey = `${symbol.kind}|${symbol.value}|${start}|${end}|${limit}`;
    if (memo.has(memoKey)) return memo.get(memoKey);
    const recursionKey = `${symbol.kind}|${symbol.value}|${start}|${end}`;
    if (stack.has(recursionKey)) return [];
    const nextStack = new Set(stack); nextStack.add(recursionKey);
    const out = [];

    if (end === start + 1 && this.#has(spans, start, end, symbol)) {
      out.push({
        kind: 'tokenNode',
        category: symbol.kind === 'category' ? symbol.value : 'terminal',
        terminal: symbol.kind === 'terminal' ? symbol.value : undefined,
        start, end, token: tokens[start], score: 1, depth: 0
      });
    }

    if (symbol.kind === 'category') {
      const rules = this.grammar.rules.filter(rule => rule.lhs === symbol.value)
        .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
      for (const grammarRule of rules) {
        if (out.length >= limit) break;
        for (const parts of this.#partitions(spans, grammarRule.rhs, start, end, 0, start, [], Math.max(32, limit * 4))) {
          let combinations = [{ children: [], score: Number(grammarRule.weight ?? 1), depth: 1 }];
          let ok = true;
          for (const [partStart, partEnd, childSymbol] of parts) {
            const alternatives = this.#trees(tokens, spans, childSymbol, partStart, partEnd, memo, nextStack, limit);
            if (!alternatives.length) { ok = false; break; }
            const expanded = [];
            for (const base of combinations) {
              for (const child of alternatives) {
                expanded.push({
                  children: [...base.children, child],
                  score: base.score + child.score,
                  depth: Math.max(base.depth, 1 + (child.depth ?? 0))
                });
              }
            }
            expanded.sort((a, b) => b.score - a.score || a.depth - b.depth);
            combinations = expanded.slice(0, limit);
          }
          if (!ok) continue;
          for (const combo of combinations) {
            out.push({
              kind: 'parseNode', category: symbol.value, production: grammarRule.name,
              start, end, children: combo.children, score: combo.score, depth: combo.depth
            });
          }
          out.sort((a, b) => b.score - a.score || a.depth - b.depth || String(a.production ?? '').localeCompare(String(b.production ?? '')));
          if (out.length > limit) out.length = limit;
        }
      }
    }

    memo.set(memoKey, out);
    return out;
  }

  parseAll(tokens, root = 'Sentence', { limit = 24 } = {}) {
    const db = this.#database(tokens);
    const spans = this.#spanSet(db);
    const rootSymbol = categorySymbol(root);
    if (!this.#has(spans, 0, tokens.length, rootSymbol)) noMatch(`chart has no ${root} spanning 0..${tokens.length}`);
    const trees = this.#trees(tokens, spans, rootSymbol, 0, tokens.length, new Map(), new Set(), Number(limit));
    if (!trees.length) noMatch(`could not reconstruct ${root} parse tree`);
    this.trace?.push({ type: 'chart-forest', root, parses: trees.length, spanCount: spans.size, productions: trees.slice(0,8).map(tree => tree.production) });
    this.trace?.push({ type: 'chart', root, production: trees[0]?.production, spanCount: spans.size, ambiguousParses: trees.length });
    return trees;
  }

  parse(tokens, root = 'Sentence') {
    const tree = this.parseAll(tokens, root, { limit: 1 })[0];
    this.trace?.push({ type: 'chart', root, production: tree.production, spanCount: null });
    return tree;
  }
}

export function firstToken(node) {
  if (!node) return null;
  if (node.kind === 'tokenNode') return node.token;
  for (const child of node.children ?? []) { const token = firstToken(child); if (token) return token; }
  return null;
}

export function descendantNodes(node, category) {
  const out = [];
  const walk = current => {
    if (!current) return;
    if (current.category === category) out.push(current);
    for (const child of current.children ?? []) walk(child);
  };
  walk(node);
  return out;
}

export function treeFeatures(node) {
  const productions = new Set();
  const categories = new Set();
  let nodes = 0; let maxDepth = 0;
  const walk = (current, depth = 0) => {
    if (!current) return;
    nodes++; maxDepth = Math.max(maxDepth, depth);
    if (current.production) productions.add(String(current.production));
    if (current.category) categories.add(String(current.category));
    for (const child of current.children ?? []) walk(child, depth + 1);
  };
  walk(node);
  return { productions: [...productions], categories: [...categories], nodes, depth: maxDepth };
}
