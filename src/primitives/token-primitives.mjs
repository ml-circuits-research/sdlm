import { registerPrimitive } from '../kernel/primitive-registry.mjs';
import { distance } from '../interpretation/symbols.mjs';

// Circuits supply every lexical choice, threshold and explanation. A close spelling
// is usable only when it has one meaning and the surrounding circuit also succeeds.
export function registerTokenPrimitives(registry, context) {
  const add = (name, fn, metadata) => registerPrimitive(registry, name, fn, metadata);
  const requireMatch = condition => {
    if (!condition) throw Object.assign(new Error('Token choice did not match'), { name: 'NoMatchError' });
  };
  add('matchTokenChoice', ({ tokens, index, choices, maxDistance = 0, minLength = 3,
    maxLength = 32, category, reason }) => {
    const token = tokens[index];
    requireMatch(token);
    const exact = choices.find(choice => choice.surface === token.norm);
    if (exact) return { value: exact.value, decisions: [] };
    requireMatch(maxDistance > 0 && token.norm.length >= minLength && token.norm.length <= maxLength &&
      /^[\p{L}]+$/u.test(token.norm));
    const candidates = choices.filter(choice => choice.surface.length <= maxLength &&
      Math.abs(choice.surface.length - token.norm.length) <= maxDistance && /^[\p{L}]+$/u.test(choice.surface))
      .map(choice => {
        context.checkBudget();
        return { ...choice, distance: distance(token.norm, choice.surface) };
      }).filter(choice => choice.distance <= maxDistance).sort((a, b) => a.distance - b.distance);
    requireMatch(candidates.length);
    const nearest = candidates.filter(choice => choice.distance === candidates[0].distance);
    requireMatch(new Set(nearest.map(choice => choice.value)).size === 1);
    const selected = nearest[0];
    return { value: selected.value, decisions: [{ category, original: token.surface, value: selected.surface, reason,
      certainty: 'heuristic', evidence: { index, alternatives: candidates, selectedBy: 'unique-nearest-meaning' } }] };
  }, { effect: 'read' });
  add('splitTokenSymbols', ({ tokens, symbols }) => {
    const parts = tokens.flatMap(token => {
      const pieces = [];
      let word = '';
      for (const character of token.surface) {
        if (symbols.includes(character)) {
          if (word) pieces.push(word);
          pieces.push(character);
          word = '';
        } else word += character;
      }
      if (word) pieces.push(word);
      return pieces.map(surface => context.language.classify({ surface, norm: surface.toLowerCase() }));
    });
    return context.checkTokens(parts);
  }, { effect: 'read' });
  add('tokensWithClass', ({ tokens, class: klass }) => tokens.filter(token => token.classes?.includes(klass)));
}
