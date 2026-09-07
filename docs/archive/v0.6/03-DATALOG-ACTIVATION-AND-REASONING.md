# Design Specification 03: Datalog Activation and Semantic Reasoning

## Separation of roles

The implementation uses Datalog in two logically separate places.

**Semantic KB reasoning** stores structured facts/rules and derives relational consequences. **Circuit activation** evaluates candidate eligibility over observations derived from the current runtime state. Keeping these programs separate prevents execution-control rules from becoming implicit domain semantics.

## Generic activation projections

A primitive may optionally publish an `activation` projection in its primitive metadata. The projection receives a circuit node at compile/index time and may return conservative required observation keys, a cheap request test, and a score contribution.

`src/datalog/candidate-selector.mjs` does not recognize linguistic primitive names. It asks the primitive registry whether a node has activation metadata and compiles the returned generic requirements.

## Activation observations

`src/datalog/activation-observations.mjs` converts current request values into canonical observations. Observations may expose structural facts such as token count, indexed token fields, parse production/category features, answer/status fields, or other generic object/array properties.

## Sparse pre-index

Running all candidate Datalog rules for every selection would become expensive with large groups. During compilation, each candidate chooses a discriminative required observation as a primary index key. At request time only candidates reachable from present observation keys plus unconstrained candidates enter the pool. Full required-key checks and cheap tests run before the candidate rules are sent to Datalog.

Correctness requirement:

```text
if candidate C can succeed for request R,
prefilter(R) must not eliminate C.
```

False positives cost time; false negatives are semantic failures.

## Candidate program

After prefiltering, the selector creates request/observation facts and evaluates Datalog rules that derive `candidate(request, group, circuit, score)`. Results are sorted by score and deterministic circuit-name tie breaking. Full circuit guards still run after expansion and remain the semantic authority.

## KB reasoning

The knowledge base represents atoms and Horn-style rules and evaluates positive recursive consequences to a fixed point. It supports explicit negative atoms as data, four-valued query classification, proof provenance, bindings, counts, existence queries, summaries, and missing-premise analysis.

## Boundaries

Datalog is a relational backend, not the universal SOP semantics. Arbitrary string generation, external tools, state transitions, transactional effects, and many future semantic operations are better handled by other primitives/backends. The system should add another backend only when a concrete task requires it.
