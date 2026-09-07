# Design Specification 08: Knowledge Base, Provenance, and Epistemic Semantics

## Atom structure

Atoms store predicate, arguments, polarity, and an optional qualifier as separate fields. A modal/capability statement can therefore be represented conceptually as:

```text
predicate = help
qualifier = can
arguments = [alice, bob]
polarity = positive
```

The qualifier is intentionally shallow and does not constitute a complete modal logic.

## Facts and rules

Explicit assertions and rules are stored separately from derived tuples. Rules are Horn-style implications over structured atoms. Recursive closure is computed by the Datalog-compatible backend.


## Persistent knowledge versus materialized reasoning state

For document ingestion, the persistent semantic artifact is an SOP circuit pack. The KB relations used by Datalog are a materialized view produced by executing those circuits. This distinction is important: Datalog is allowed to optimize and cache reasoning, but extracted document knowledge does not need a second author-facing representation.

A knowledge circuit may construct ordinary facts, groups of facts, or rules. More elaborate semantics such as events, temporal links, attribution, coreference, definitions, or causal relations are represented by compositions of such circuits. Additional circuits can project those structures into relations useful for particular queries. The KB engine does not assign privileged meaning to predicate names such as `time`, `reported_by`, or `refers_to`.

The reference document pack demonstrates deterministic reconstruction: two clean runtimes loading the same circuit pack produce equivalent materialized semantic states.

## Four-valued status

For a queried atom `A`, the KB independently checks support for `A` and support for its explicit negation. The resulting status is:

- supported: A derivable, not-A not derivable;
- refuted: not-A derivable, A not derivable;
- both: both derivable;
- unknown: neither derivable.

This avoids treating absence of proof as falsity.

## Provenance

Derived facts store witnesses/derivation information. Explanations traverse the actual proof tree. This provenance also supports dependency analysis, invalidation research, evidence-aware ranking, and future truth maintenance.

## Missing-premise analysis

For a desired atom that is not derivable, the KB can inspect rules whose head could produce it, determine which body atoms are already available, and report missing conditions. This supports bounded reflective tasks without inventing free-form hidden reasoning.

## Current limits

General truth maintenance with retractions, source reliability, temporal supersession, confidence weighting, paraconsistent consequence policies beyond the simple four-state interface, existential rule variables, and general abductive reasoning remain open.
