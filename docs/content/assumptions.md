# Assumptions and correction

Conversation mode tries to extract a usable meaning from English and shows the assumptions that made execution possible. It can process several sentences in one input, classify unfamiliar predicates, repair missing final punctuation, associate a misspelled name with a session entity, and interpret some unary questions and universal rules. A sentence outside these constructions produces a partial response with token categories and a recorded gap. It does not discard other useful sentences in the request.

## Try a complete case

```text
/session new reasoning
Socrate is a human. All humans die. Is Scorate going to die?
/assumptions
/reject a2 These are different people
Does Scorate die?
Does Socrate die?
/feedback reasoning-feedback.json
```

In a fresh session the first input returns two confirmations and Yes. It records `a1`, a temporal projection from `going to` to the unqualified `die` predicate, and `a2`, the association of `scorate` with `socrate`. The response shows `die(socrate) from human(socrate)`. This establishes a consequence of the supplied rule under the declared interpretations. It establishes no event date. After rejecting `a2`, the question about Scorate remains Unknown, while the question about Socrate stays supported. IDs depend on earlier decisions in the session.

Use `/example 14` for this scenario, `/example 15` for an unfamiliar verb and its correction, and `/example 16` for partial understanding and conditional missing premises. All examples run locally in isolated temporary sessions.

## What a decision records

| Category | Actual interpretation | Evidence and boundary |
| --- | --- | --- |
| Predicate or category inference | An unregistered word becomes a unary or binary predicate | Its grammatical slot, token index and any suffix transformation; no external definition is acquired |
| Entity resolution | An unknown query name uses a nearby known entity | Edit distance with adjacent transpositions, sorted alternatives and the selected name; ties remain explicit guesses |
| Temporal projection | A unary `will`, `did` or `going to` question uses an unqualified predicate | The selected construction; no date or temporal ordering is inferred |
| Sentence boundary | Missing final punctuation is supplied | The leading token and the repair circuit; it may choose the wrong sentence kind |
| Parse choice | One retained ambiguous command is selected | Ranked alternatives and the selected circuit; other meanings remain available for inspection |

Decisions receive IDs before `ExecuteCommand` runs. Each stores its input, category, original symbol, selected value, reason, circuit and qualitative certainty. The trace records the selected command and candidate commands before execution. Structured results include these records and reconstructed support or refutation. A later answer includes the assumption IDs found in its support tree. These are recorded program decisions, not explanations invented after observing the answer.

The runtime prefers a successful installed parser, including learned constructions, before trying fallback circuits. Generic string comparison and evidence storage live in JavaScript. English constructions, suffix choices, reference thresholds and category explanations live in SOP. An external circuit author can inspect and change these policies through the same language used for other competence.

## Reject and improve

`/reject <id> [reason]` marks a decision rejected and removes assertions with no remaining independent support. Derived facts are recomputed. An explicit assertion of the same fact or rule survives if it does not depend on the rejected decision. A rejected name association is excluded from subsequent guesses. Other rejected interpretations are not silently reapplied through the same circuit.

Named sessions save decisions, assertion supports, rejection feedback and unresolved inputs as `SessionInterpretation.sop`. Restart preserves them without replaying the conversation. Saved results affected by a rejection become invalid for `$ref` and text bindings; their old contents remain visible for inspection. References used to create another saved result carry their assumption IDs forward, even if the original value is later evicted. Rebinding a name supplies a new value.

`/feedback new-file.json` exports the current evidence and gaps and refuses to overwrite an existing file. A coding agent can use the exact failing input, selected circuit, proposed category and correction note to author a better SOP pack and regression cases. `/learn` accepts corrected surface/canonical pairs; `/load` and the pack API accept validated circuits. Exporting feedback alone does not train a model or start an agent. A knowledge-only `/save` refuses to discard active assumption dependencies; use `/session save` to preserve the complete state.

## API and library use

Chat Completions defaults to `interpretation: "assist"`. Both named and stateless responses include `sdlm.results` and `sdlm.assumptions`. Named results also retain the usual session revision and reusable variables. Read `GET /v1/sessions/{id}/assumptions` or submit `POST /v1/sessions/{id}/reject` with `{"id":"a2","reason":"Different person"}`. The values endpoint lists invalidated value names.

The JavaScript runtime exposes `respond(text)`, `respondDetailed(texts)`, `assumptions()` and `rejectAssumption(id, note)`. `process`, `processBatch`, `processDetailed`, `parseCommand` and direct circuit execution retain their strict contracts. Select `/mode strict` in the CLI or `interpretation: "strict"` in chat for exact parser evaluation. Pack acceptance tests use strict execution, so a guessed interpretation cannot make an unsupported canonical example pass.

## Limits you can measure

Certainty is a qualitative heuristic label, not a calibrated probability. Name matching uses at most one edit for names of 4 to 64 characters. Unknown inflection recovery only strips a final `s` when at least three stem characters remain. Irregular forms, broad synonyms, unrestricted anaphora, multilingual conversation and arbitrary prose remain beyond these fallback policies. A bare unfamiliar predicate can be misclassified; the response preserves that decision for correction.

Missing-premise results are conditional. For `Every human dies. Does Mara die?`, the response can state that `human(mara)` would complete the rule. It does not assert that Mara is human. No matching rule means there is no grounded premise proposal. An unresolved input asks for context or suggests a supported form. The structured gap retains the token categories the installed classifier actually found. See [Everyday conversation](conversation.html) for introductions, personal references and polite requests.

One request accepts at most 128 sentences and retains its normal VM and input budgets. Up to 12 fallback candidates and two punctuation proposals are considered. The evidence ledger retains at most 2,048 decisions, 100 unresolved inputs and 200 rejection notes. Reaching the decision limit requires a new session. Only safe, read-only candidate work enters speculative trials; execution and budget errors still roll back the request.

Proof reconstruction has a depth bound. `provenance_complete` is false when reconstruction reaches an unsupported derived marker. Aggregate responses can include `context_assumptions`, which describe assumptions present in the session without claiming that each contributed to that result. This evidence ledger is not a complete historical witness graph or a measured general reasoning system.

## Choose visible detail

`/verbosity answer` hides explanatory text while retaining the actual assumptions, dependencies and correction controls. `/verbosity explain` restores it. `Answer only.` and `Show assumptions.` select the same SOP policy from ordinary input. A compact `Yes.` may therefore depend on a heuristic or a conditional everyday default. Inspect `/assumptions` or API result metadata when you need to assess that dependency. Read [Response style](response-style.html) for complete behavior.

Name resolution applies to supported queries. Assertions, quantity changes and location statements preserve their supplied names. Elementary relation vocabulary is registered explicitly, so its use alone does not create a word-classification assumption.
