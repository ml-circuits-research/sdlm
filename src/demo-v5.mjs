import { createSLLM } from './sllm.mjs';
import { Trace } from './kernel/trace.mjs';

const trace = new Trace(false);
const s = await createSLLM({ trace, learnedRoots: [] });
const lines = [
  'All researchers are curious.',
  'Every researcher who is curious and validates Paper is trusted.',
  'Alice is a researcher.',
  'Alice validates Paper.',
  'Is Alice trusted?',
  'Which researchers are curious?',
  'Alice validated Bob.',
  'Did Alice validate Bob?',
  'Bob is validated by Alice.',
  'Alice is validating Bob.',
  'Alice has validated Bob.',
  'Has Alice validated Bob?',
  "Carol can\'t help Bob.",
  'Can Carol help Bob?',
  'Alice is more experienced than Bob.',
  'Is Alice more experienced than Bob?',
  'Give me a concise summary of Alice.',
  'Give me a detailed explanation of Alice.',
  'Reflect on whether Alice is trusted.',
  'Alice saw Bob with Carol.'
];
for (const line of lines) console.log(`> ${line}\n${await s.process(line)}\n`);
console.log(`Loaded circuits: ${s.circuits.size}`);
console.log(`Datalog engine: ${s.engine}`);
console.log(`Activation groups: ${s.selector.rulesByGroup.size}`);
