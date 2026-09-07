import { fileURLToPath } from 'node:url';

const atlas = fileURLToPath(new URL('../../extensions/document-atlas', import.meta.url));
const line = (input, expected) => ({ input, expected });
export const EXAMPLES = [
  { id: 1, name: 'Facts and questions', limitation: 'Names and sentence forms must fit the controlled language.', steps: [
    line('Alice is human.', 'Learned.'), line('Is Alice human?', 'Yes.'), line('Is Alice creative?', { startsWith: 'Unknown:' })
  ] },
  { id: 2, name: 'Rules and derived answers', limitation: 'Rules require every head variable to occur in a premise.', steps: [
    line('Every human is mortal.', 'Learned.'), line('Alice is human.', 'Learned.'), line('Is Alice mortal?', 'Yes.'),
    line('Why is Alice mortal?', { includes: '[rule]' })
  ] },
  { id: 3, name: 'Explicit contradiction', limitation: 'Contradictions are reported; the system does not choose a source to trust.', steps: [
    line('Alice is reliable.', 'Learned.'), line('Alice is not reliable.', 'Learned.'), line('Is Alice reliable?', { startsWith: 'Both' })
  ] },
  { id: 4, name: 'Recursive reasoning', limitation: 'Positive Horn rules over unary and binary atoms.', steps: [
    line('Alice is a parent of Bob.', 'Learned.'), line('Bob is a parent of Carol.', 'Learned.'),
    line('If X is a parent of Y then X is an ancestor of Y.', 'Learned.'),
    line('If X is a parent of Y and Y is an ancestor of Z then X is an ancestor of Z.', 'Learned.'),
    line('Is Alice an ancestor of Carol?', 'Yes.')
  ] },
  { id: 5, name: 'Document knowledge as circuits', pack: atlas, limitation: 'Atlas is a supplied circuit pack, not automatic extraction from arbitrary text.', steps: [
    line('Did Atlas start in 2024?', 'Yes.'), line('Did Atlas start in 2023?', { startsWith: 'Unknown:' }),
    line('Can Atlas reconstruct Evidence?', 'Yes.'), line('Is Architecture auditable?', 'Yes.'),
    line('Who reported EvidenceClaim?', { includes: 'team' })
  ] },
  { id: 6, name: 'Summaries and explanations', limitation: 'Summaries select symbolic facts; they do not summarize an arbitrary document.', steps: [
    line('Alice is human.', 'Learned.'), line('Alice likes Bob.', 'Learned.'),
    line('Summarize Alice.', { startsWith: 'Summary of Alice:' }), line('Expand Alice.', { includes: 'Alice' })
  ] },
  { id: 7, name: 'Ambiguity without committing facts', limitation: 'Only alternatives retained by the bounded search can be reported.', steps: [
    line('Alice saw Bob with Carol.', { startsWith: 'Ambiguous:' })
  ], expectedFacts: 0 },
  { id: 8, name: 'Modal qualifiers', limitation: 'A qualifier such as can is preserved; full modal logic is outside the supported semantics.', steps: [
    line('Alice can help Bob.', 'Learned.'), line('Can Alice help Bob?', 'Yes.'),
    line('Does Alice help Bob?', { startsWith: 'Unknown:' })
  ] },
  { id: 9, name: 'Learning new phrases', limitation: 'Supervised paraphrase induction needs canonical examples, not raw documents.', training: [
    { surface: 'Able Alice.', canonical: 'Alice can help Bob.' },
    { surface: 'Able Carol.', canonical: 'Carol can help Bob.' }
  ], steps: [line('Able Dana.', 'Learned.'), line('Can Dana help Bob?', 'Yes.'),
    line('Does Dana help Bob?', { startsWith: 'Unknown:' })] },
  { id: 10, name: 'Retraction and recomputation', limitation: 'Retraction removes an asserted fact or rule and rebuilds derived knowledge.', steps: [
    line('Every human is mortal.', 'Learned.'), line('Alice is human.', 'Learned.'), line('Is Alice mortal?', 'Yes.'),
    { forget: 'Alice is human.', expected: { includes: '1' } }, line('Is Alice mortal?', { startsWith: 'Unknown:' })
  ] },
  { id: 11, name: 'Strict input and safe rule rejection', limitation: 'This example uses strict parsing. Conversation mode tries accountable interpretations; there is no neural fallback.', steps: [
    { input: 'If X is human then Y is mortal.', error: 'unbound head variable' },
    { input: 'Please write a novel about tomorrow.', error: true },
    line('Is Alice mortal?', { startsWith: 'Unknown:' })
  ] },
  { id: 12, name: 'Tense normalization boundary', limitation: 'Past and present often map to the same atemporal predicate. This is not temporal reasoning.', steps: [
    line('Alice was reliable.', 'Learned.'), line('Is Alice reliable?', 'Yes.')
  ] },
  { id: 13, name: 'Saved values across SOP session restart', limitation: 'Explicit references reuse structured results; continuation rebuilds indexes and closure, not conversational execution.', steps: [
    line('Alice is human.', 'Learned.'),
    { label: '/run ProcessTextResult {"text":"Is Alice human?"}',
      run: { circuit: 'ProcessTextResult', inputs: { text: 'Is Alice human?' }, saveAs: 'answer' },
      expected: { includes: '"text":"Yes."' } },
    { label: 'Save and restore an isolated SOP session', restart: true, expected: 'Session restored from SOP.' },
    { label: '/run RenderEnglish {"answer":{"$ref":"answer.answer"}}',
      run: { circuit: 'RenderEnglish', inputs: { answer: { $ref: 'answer.answer' } }, saveAs: 'rendered' },
      expected: { includes: '"value":"Yes."' } }
  ] },
  { id: 14, name: 'Assumptions and the Socrate question', assist: true,
    limitation: 'Name similarity and future-to-timeless projection are explicit heuristics, not evidence of an event date.', steps: [
      line('Socrate is a human. All humans die. Is Scorate going to die?', { includes: 'Support: die(socrate) from human(socrate)' }),
      { label: '/reject a2', reject: 'a2', expected: { includes: 'rejected' } },
      line('Is Scorate going to die?', { startsWith: 'Unknown:' })
    ] },
  { id: 15, name: 'Unknown predicates and correction', assist: true,
    limitation: 'A guessed word category does not supply its real-world meaning. Rejecting its assumption removes dependent rules.', steps: [
      line('Mara is human. Every human glimmers. Does Mara glimmer?', { includes: 'Support: glimmer(mara) from human(mara)' }),
      { label: '/reject a1', reject: 'a1', expected: { includes: 'rejected' } },
      line('Does Mara glimmer?', { startsWith: 'Unknown:' })
    ] },
  { id: 16, name: 'Partial understanding and missing premises', assist: true,
    limitation: 'A missing-premise hypothesis remains conditional. Unsupported fragments are saved for correction.', steps: [
      line('Every human dies. Explain the meaning of the universe. Does Mara die?', { includes: 'If human(mara), then die(mara)' }),
      line('Mara is human. Does Mara die?', { includes: 'Yes.' })
  ] },
  { id: 17, name: 'Elementary base knowledge', assist: true, foundation: true,
    limitation: 'Explicit elementary rules and ordinary-object models; exceptions beyond those encoded remain unknown.', steps: [
      line('Pip is a cat. Is Pip an animal?', { includes: 'Yes.' }),
      line('Nori is a penguin. Can Nori fly?', { includes: 'No.' }),
      line('What do eyes help us do?', { includes: 'see' }),
      line('What is 7 plus 8?', '15.')
    ] },
  { id: 18, name: 'Quantities and changing locations', assist: true, foundation: true,
    limitation: 'The latest explicit location or quantity is current. Negative inventory updates are rejected.', steps: [
      line('Mia has 5 apples. Mia gets 2 apples. How many apples does Mia have?', { includes: '7.' }),
      line('Mia is in Kitchen. Mia goes to Garden. Where is Mia?', { includes: 'garden' }),
      line('Is Mia in Kitchen?', { startsWith: 'Unknown:' })
    ] },
  { id: 19, name: 'Everyday defaults and their exceptions', assist: true, foundation: true,
    limitation: 'Rain exposure supports an explicit conditional guess; known shelter blocks it. The guessed wet fact is not stored.', steps: [
      line('Poppy is outside. Poppy is in rain. Is Poppy wet?', { includes: 'everyday-default' }),
      line('Poppy has shelter. Is Poppy wet?', { includes: 'Unknown:' })
    ] },
  { id: 20, name: 'Answer length and retained assumptions', assist: true, foundation: true,
    limitation: 'Answer-only mode hides visible explanations; actual assumptions remain in the session audit and API metadata.', steps: [
      line('Answer only. Socrate is a human. All humans die. Is Scorate going to die?', 'Yes.'),
      { label: 'Save and restore the response preference', restart: true, expected: 'Session restored from SOP.' },
      line('Is Scorate going to die?', 'Yes.'),
      line('Show assumptions. Is Scorate going to die?', { includes: 'entity-resolution' })
    ] },
  { id: 21, name: 'A conversation with a remembered speaker', assist: true,
    limitation: 'Names and first-person references use session evidence. A bare unfamiliar introduction is a correctable name assumption.', steps: [
      line('hello , I am Jhon', { includes: 'Nice to meet you, Jhon.' }),
      line('I am jhon', { includes: 'name-classification' }),
      line('Hello', { includes: 'Hello, Jhon!' }),
      line('who is Jhon?', { includes: 'introduced that name' }),
      line('What you can do for me?', { includes: 'remember facts' }),
      line('My name is Jhon. Every human is mortal. I am human. Am I mortal?', { includes: 'Yes.' }),
      { label: 'Save and restore the speaker from SOP', restart: true, expected: 'Session restored from SOP.' },
      line('Answer only. Who am I?', 'You told me your name is Jhon.'),
      line('Am I mortal?', 'Yes.')
    ] },
  { id: 22, name: 'Polite requests and useful clarification', assist: true, foundation: true,
    limitation: 'Supported prefixes compose with existing tasks. An unsupported request stays a gap and cannot become a claimed result.', steps: [
      line('Please, what is 7 plus 8?', '15.'),
      line('Could you tell me if 8 is greater than 3?', 'Yes.'),
      line('Who is Beatrice?', { includes: 'Tell me something about them' }),
      line('Mia is human. Please write a novel about the moon. Is Mia human?', { includes: 'cannot write arbitrary' }),
      line('thanks', "You're welcome.")
    ] },
  { id: 23, name: 'Arithmetic wording and spelling repair', assist: true,
    limitation: 'Two numeric operands and one operation. Word repairs are recorded; unsupported words, units and longer expressions are not silently discarded.', steps: [
      line('hwo much is 3 plus 5 ?', { includes: '"hwo" -> "how"' }),
      line('How much is 31 plus 17?', '48.'),
      line('3+5', '8.'),
      line('Calculate -3.5 times 2', '-7.'),
      line('Subtract 3 from 8', '5.'),
      line('What is the sum of 8 and 11?', '19.'),
      line('How much is 3 apples plus 5 oranges?', { includes: 'two numbers and one operation' }),
      line('Answer only. hwo much is 3 plus 5?', '8.')
    ] },
  { id: 24, name: 'Quantity problems with contextual references', assist: true,
    limitation: 'Pronouns and omitted items use the most recent compatible live quantity, with explicit assumptions. No gender inference, transfers or historical count reconstruction.', steps: [
      line('Jgon has 3 eggs. He received 4. How many eggs he has now?', { includes: 'omitted-item' }),
      line('Answer only. How many eggs he has now?', '7.'),
      { label: 'Save and restore quantity context from SOP', restart: true, expected: 'Session restored from SOP.' },
      line('He lost 2. How many eggs he has now?', '5.'),
      line('Lina has 9 coins. She spent 2. How many coins she has now?', '7.'),
      line('How many eggs does Jgon have?', '5.'),
      line('Show assumptions. He received 1.', { includes: 'pronoun-resolution' })
    ] }
];
