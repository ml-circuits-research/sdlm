export function tokenize(text) {
  const matches = String(text).match(/[\p{L}][\p{L}\p{N}_'-]*|\d+(?:\.\d+)?|[?.!,:;]/gu) ?? [];
  return matches.map(surface => ({ surface, norm: surface.toLowerCase(), classes: [], lemmas: {} }));
}
