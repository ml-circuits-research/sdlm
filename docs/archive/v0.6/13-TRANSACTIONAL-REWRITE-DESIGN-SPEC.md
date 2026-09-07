# Design Specification 13: Transactional Rewrite and Side-Effect Safety

## Invariant

> Speculative candidate execution must not change task-visible persistent symbolic state unless the candidate is accepted.

Deleting a failed subgraph is insufficient if the candidate already wrote to the KB, language store, or grammar store.

## Transaction participants

The current transaction manager snapshots and restores three in-process state participants:

- semantic knowledge base;
- language/lexicon store;
- grammar store.

Each participant exposes snapshot/restore semantics suitable for the current prototype scale.

## Candidate execution

For a potentially stateful candidate:

```text
snapshot participants
expand candidate
execute
if success:
    keep changes and reduce candidate
if NoMatch:
    restore snapshots
    remove failed subgraph
    substitute next candidate
    begin new epoch
```

Request-level error handling also restores the outer state when a request fails before commit.

## Effect analysis

Primitive effect metadata is aggregated through circuits. The current ordering is conceptually:

```text
pure < read < write < external < unknown
```

A circuit is safe for speculative parallel execution only when its computed effect is `pure` or `read`.

Dynamic candidate calls derive a conservative group effect when the selector metadata identifies the target group. Unknown dynamic effects are treated conservatively.

## External effects

Snapshots cannot unsend an email, undo an arbitrary HTTP request, reverse a payment, or reliably retract data already observed externally. Production tool execution therefore needs explicit protocols:

- defer irreversible actions until a commit phase;
- use idempotency keys where possible;
- use compensating actions where appropriate;
- record external effect provenance and outcome;
- forbid speculative execution of irreversible operations.

## General rewrite

Current rewrite substitutes a failed candidate at a call site. Arbitrary graph rewrite remains a research direction and must preserve transaction boundaries, SSA, provenance, and effect invariants.
