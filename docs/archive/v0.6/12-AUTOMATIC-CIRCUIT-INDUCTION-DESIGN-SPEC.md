# Design Specification 12: Automatic Circuit Induction

## Scope

The implemented learner is a constrained supervised circuit inducer. Its output is ordinary inspectable SOP source, not a private learned representation.

## Input

Training examples pair a new surface form with a canonical CNL form whose semantics the existing system already understands.

```text
surface:   "Tell me about Alice."
canonical: "Summarize Alice."
```

Examples for one induced family may use different lengths and slot positions.

## Algorithm

1. parse each canonical example using the existing sdlm;
2. obtain the structured target command/value;
3. identify semantic fields that vary across examples;
4. align those varying values to surface tokens/classes;
5. infer one or more surface grammar patterns;
6. synthesize a grammar-installation SOP circuit using typed grammar symbols;
7. synthesize a semantic SOP circuit that maps captured spans to the target command structure;
8. persist generated `.sop` files;
9. reload/refresh the circuit and grammar registries;
10. re-run every training example and require exact canonical semantic equivalence.

## Persistence

Generated circuits live in ordinary circuit storage. Restart tests verify that learned grammar/semantics can be reloaded and reinstated. Learned identifiers are allocated from existing persisted content so new learning does not overwrite previous circuits.

## Safety

A generated pack must parse as SOP, satisfy reference/effect checks, reproduce training semantics, and pass relevant regression tests before acceptance. Learning provenance should eventually include training examples, learner identity/version, parent circuits, and validation results.

## Limitations

The current inducer primarily learns paraphrase/surface structure. It does not reliably discover recursive algorithms, semantic ontologies, new primitive concepts, or broad abstractions from raw text. Higher-order induction and consolidation are core research tasks.
