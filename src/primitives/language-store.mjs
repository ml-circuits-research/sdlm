export class LanguageStore {
  constructor() {
    this.patterns = [];
    this.lexemes = new Map();
    this.displays = new Map();
    this.lemmaIndex = new Map();
  }

  #lemmaKey(lemma, klass) { return `${String(klass)}|${String(lemma).toLowerCase()}`; }

  addPattern(klass, pattern) { this.patterns.push({ klass, regex: new RegExp(pattern) }); }

  addLexeme(surface, klass, lemma = surface) {
    const key = String(surface).toLowerCase();
    const entry = { klass: String(klass), lemma: String(lemma).toLowerCase(), surface: String(surface) };
    if (!this.lexemes.has(key)) this.lexemes.set(key, []);
    this.lexemes.get(key).push(entry);
    const lemmaKey = this.#lemmaKey(entry.lemma, entry.klass);
    if (!this.lemmaIndex.has(lemmaKey)) this.lemmaIndex.set(lemmaKey, entry.surface);
  }

  classify(token) {
    const classes = new Set();
    const lemmas = new Map();
    for (const p of this.patterns) if (p.regex.test(token.surface)) classes.add(p.klass);
    for (const l of this.lexemes.get(token.norm) ?? []) {
      classes.add(l.klass);
      if (!lemmas.has(l.klass)) lemmas.set(l.klass, l.lemma);
    }
    return { ...token, classes: [...classes], lemmas: Object.fromEntries(lemmas) };
  }

  hasLemmaClass(lemma, klass) { return this.lemmaIndex.has(this.#lemmaKey(lemma, klass)); }
  surfaceForLemma(lemma, klass) { return this.lemmaIndex.get(this.#lemmaKey(lemma, klass)); }

  rememberDisplay(key, surface) {
    const k = String(key).toLowerCase();
    if (!this.displays.has(k)) this.displays.set(k, String(surface));
  }

  display(value) {
    const raw = String(value?.value ?? value?.name ?? value ?? '');
    const remembered = this.displays.get(raw.toLowerCase());
    if (remembered) return remembered;
    const spaced = raw.replaceAll('_', ' ').replaceAll('-', ' ');
    return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : spaced;
  }

  snapshot() {
    return {
      patterns: this.patterns.map(p => ({ klass: p.klass, source: p.regex.source, flags: p.regex.flags })),
      lexemes: [...this.lexemes.entries()].map(([k,v]) => [k, structuredClone(v)]),
      displays: [...this.displays.entries()]
    };
  }

  restore(state) {
    this.patterns = state.patterns.map(p => ({ klass: p.klass, regex: new RegExp(p.source, p.flags) }));
    this.lexemes = new Map(state.lexemes.map(([k,v]) => [k, structuredClone(v)]));
    this.displays = new Map(state.displays);
    this.lemmaIndex = new Map();
    for (const entries of this.lexemes.values()) {
      for (const entry of entries) {
        const lemmaKey = this.#lemmaKey(entry.lemma, entry.klass);
        if (!this.lemmaIndex.has(lemmaKey)) this.lemmaIndex.set(lemmaKey, entry.surface);
      }
    }
  }
}
