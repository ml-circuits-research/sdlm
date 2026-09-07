import test from 'node:test';
import assert from 'node:assert/strict';
import { createSDLM } from './helpers/runtime.mjs';

test('broad CNL smoke suite covers common declarative, interrogative and inflectional families', async () => {
  const s = await createSDLM({ learnedRoots: [] });
  const learned = [
    'Alice runs.',
    'Alice ran.',
    'Alice works with Bob.',
    'Every researcher validates Paper.',
    'Each researcher is curious.',
    'No researcher is unreliable.',
    'Some scientist is curious.',
    'Carol is not reliable.',
    "Dana isn't reliable.",
    'Eve did not validate Bob.',
    "Frank didn't validate Bob.",
    'Grace should help Bob.',
    "Heidi shouldn't help Bob.",
    'Bob was validated by Ivan.',
    'Judy had validated Bob.',
    'Kate was validating Bob.',
    'Leo is very reliable.',
    'Maya is more experienced than Nina.',
    'Olivia is a researcher.'
  ];
  for (const line of learned) assert.equal(await s.process(line), 'Learned.', line);

  assert.equal(await s.process('Does Olivia validate Paper?'), 'Yes.');
  assert.match(await s.process('Who validates Paper?'), /olivia/i);
  assert.match(await s.process('Who is curious?'), /olivia/i);
  assert.match(await s.process('What does Olivia validate?'), /paper/i);
  assert.match(await s.process('Is any scientist curious?'), /^Yes\./);
  assert.equal(await s.process('Should Grace help Bob?'), 'Yes.');
  assert.equal(await s.process('Should Heidi help Bob?'), 'No.');
  assert.equal(await s.process('Was Leo very reliable?'), 'Yes.');
  assert.equal(await s.process('Is Maya more experienced than Nina?'), 'Yes.');
});
