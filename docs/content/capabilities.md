# Capabilities and boundaries

sdlm is useful when a task can be expressed through explicit facts, rules, supported sentence patterns, and installed domain circuits. It can explain symbolic conclusions and extend its language through examples. It does not provide a general neural model's breadth or free-form fluency.

{{EXAMPLES}}

## What the results mean

Positive and explicit negative support are independent. A question can return Yes, No, Both, or Unknown. Missing evidence is not a negative fact. Strict ambiguous parses return alternatives without asserting a branch. Conversation mode may select a retained interpretation and record that choice as an assumption before execution. Rules accept unary and binary relations and safe bound variables. Modal qualifiers distinguish `can` from an unqualified relation. Some tense forms normalize to the same relation, so the runtime is not a temporal reasoner.

An explanation reconstructs a proof from current facts and rules. It does not expose a stored source witness for every derivation. Proof search has a depth bound and can return a derived marker when a complete proof is unavailable. A circuit count measures the library's implementation, not the number of independent reasoning abilities.

## Readiness by task

| Task | Usable contract | Remaining boundary |
| --- | --- | --- |
| Conversation with explicit assumptions | Multi-sentence input, unknown predicate slots, name guesses, punctuation repair, conditional premises and rejection | Bounded SOP heuristics; no calibrated accuracy or broad world knowledge |
| Basic conversation | Greetings, introductions, remembered speaker, personal references, people lookup and useful clarification | Authored conversational constructions; see [conversation](conversation.html); no general anaphora |
| Elementary reasoning | Base facts and rules, arithmetic, quantities, movement, relationships and conditional defaults | Authored English constructions and ordinary-object simplifications; see [evaluation](benchmark.html) |
| Response detail | Per-session answer-only or explained text, with retained audit | Explicit instruction forms; compact text still has full structured metadata |
| Controlled knowledge assistant | Assertions, rules, questions, explanations and retraction | Restricted vocabulary and grammar |
| Domain document knowledge | Install and query the Atlas reference pack | Document-to-circuit extraction is authored, not automatic |
| Train new expressions | Surface/canonical examples produce validated SOP circuits | No broad statistical learning or automatic curriculum |
| Coding-agent extension | Upload circuits with exact acceptance tests; persist accepted packs | Circuit quality and semantic coverage remain the author's responsibility |
| Local application integration | Text API, SDK checks, isolated durable state and reusable values | No full OpenAI protocol or multiuser authorization |
| Production service | Local bounds, atomic revision publication, deterministic failure behavior | No hard CPU sandbox, quotas, distributed storage or load-scale evidence |

## Research work still required

Broad language coverage needs evaluation on unseen compositions and independently sourced corpora. Automatic document extraction needs source spans, validation of extracted claims, and source-aware retraction. The durable assumption ledger records interpretation decisions and assertion supports. Complete historical provenance still needs recorded derivation witnesses beyond reconstructed proof trees. Larger deployments need incremental truth maintenance, measured retrieval quality across large circuit libraries, persistent-version compatibility, hard execution isolation, and authenticated session ownership.

These are separate engineering and research outcomes. Passing the example catalog demonstrates its listed behaviors only. It does not establish general intelligence, autonomous coding-agent operation, or performance at production traffic levels.

## Quantity stories with context

Conversation mode can continue a bounded inventory problem across turns. `Jgon has 3 eggs. He received 4. How many eggs he has now?` computes 7 with explicit owner and item assumptions. Recent compatible quantity context supplies omitted slots, and full evidence survives session restart and rejection. Example 24 demonstrates the workflow. Transfers between people, comparative more questions, event history and arbitrary narrative anaphora remain outside these forms. The [conversation guide](conversation.html#solve-a-quantity-problem-across-sentences) explains the recency policy and its failure boundaries.
