# Design Specification 05: Generation and Natural-Language Realization

## Principle

Generation remains inspectable and circuit-based. There is no separate response-template DSL. Structured semantic objects are realized by ordinary SOP circuits selected through the same candidate machinery used elsewhere.

## Atom realization

`circuits/core/RealizeAtom.sop` selects a circuit from the atom-realizer group. Realizer circuits inspect typed atom fields such as predicate, arguments, polarity, qualifier, and lexical entries. Surface text is composed through generic primitives such as `concat`, `join`, `display`, and lexical surface lookup.

## Response planning

Query executors produce structured answer objects. Response circuits handle boolean/four-valued status, bindings, counts, summaries, descriptions, comparisons, explanations, reflection, missing-premise analysis, ambiguity, and runtime introspection.

## Summarization and expansion

Current summarization is symbolic/extractive. The KB returns an entity profile with direct/derived facts and proof depth. SOP circuits rank/select a bounded fact set, realize those atoms, and compose multiple sentences. Expansion chooses a larger set and may report the balance of stated and derived knowledge.

## Explanations

Proof trees are produced by the KB and realized through circuits. This makes the explanation correspond to the actual symbolic derivation rather than a post-hoc narrative.

## Limitations

Current NLG lacks broad lexical choice, sophisticated morphology, aggregation, referring-expression generation, discourse planning, rhetorical organization, style control, and document-level coherence. These are open layers that can be added as circuit families or delegated to a neural backend under provenance/validation constraints.
