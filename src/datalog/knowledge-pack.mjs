import { createHash } from 'node:crypto';
import { publishPack } from '../kernel/pack-storage.mjs';

export function knowledgeSource(state) {
  const lines = ['# Asserted knowledge. Derived facts are reconstructed from the rules.'];
  let sequence = 0;
  const node = (command, args) => {
    const id = `n${++sequence}`;
    lines.push(`@${id} ${command}`);
    for (const [key, value] of Object.entries(args)) lines.push(`    ${key} ${value}`);
    return `$${id}`;
  };
  const term = value => value.kind === 'var'
    ? node('makeVariable', { name: JSON.stringify(value.name) })
    : node('makeConstant', { value: JSON.stringify(value.value) });
  const atom = value => {
    const args = { subject: term(value.args[0]), predicate: JSON.stringify(value.predicate) };
    if (value.args.length === 2) args.object = term(value.args[1]);
    args.polarity = JSON.stringify(value.polarity);
    if (value.qualifier != null) args.qualifier = JSON.stringify(value.qualifier);
    return node(value.args.length === 1 ? 'makeUnaryAtom' : 'makeBinaryAtom', args);
  };
  for (const fact of state.baseFacts) node('kbAssertFact', { atom: atom(fact) });
  for (const rule of state.rules) {
    const head = atom(rule.head);
    const body = node('list', Object.fromEntries(rule.body.map((a, i) => [`item${i + 1}`, atom(a)])));
    node('kbAssertRule', { rule: node('makeRule', { head, body }) });
  }
  const result = node('constant', { value: 'true' });
  lines.push(`@output result ${result}`);
  return lines.join('\n') + '\n';
}

export async function saveKnowledgePack(root, state) {
  const source = knowledgeSource(state);
  const name = `SavedKnowledge${createHash('sha256').update(source).digest('hex').slice(0, 16)}`;
  const files = await publishPack(root, [{ name, group: 'saved.bootstrap', source }]);
  return { root, files, facts: state.baseFacts.length, rules: state.rules.length };
}
