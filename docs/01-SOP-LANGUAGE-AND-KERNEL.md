# Design Specification 01: SOP Language and Kernel Boundary

## Circuit model

A circuit has named inputs, single-assignment nodes, and named outputs. A node invokes either another circuit or a trusted primitive. Parameters are literal values or references to inputs/previous wires.

```text
@input command

@executors selectCircuits
    group "executor"
    value $command

@answer callCandidates
    candidates $executors
    command $command

@output result $answer
```

The circuit is a dependency graph, not a textual sequence. Node readiness is determined by resolved inputs.

## Primitive versus circuit

A **primitive** is implemented in the trusted host runtime and registered in `src/kernel/primitive-registry.mjs`. A **circuit** is defined in SOP and may compose primitives or other circuits. Ordinary language/domain competence should normally be added as circuits rather than new primitives.

Primitive definitions may expose metadata used by generic runtime services, currently including effect class and optional activation projection. Semantic metadata is co-located with the primitive implementation rather than duplicated in selector-owned command-name tables.

## Kernel responsibilities

The trusted kernel is responsible for:

- loading and validating circuit definitions;
- creating frames and globally unique active-node identities;
- SSA/data-dependency scheduling;
- expansion, reduction, and candidate substitution;
- effect-aware speculative execution;
- transaction coordination;
- backend invocation and runtime tracing.

The kernel must not contain representative English vocabulary, grammar constructions, or domain predicates. `test/no-language-hardcoding.test.mjs` and `test/no-hidden-dsl.test.mjs` enforce important parts of this boundary.

## Structural VM operations

`callCircuit`, `callCandidates`, and `callParallelCandidates` are VM-level structural operations. They belong to the machine ABI because they change the active computation graph rather than representing language knowledge. The set should remain small and should not grow with CNL coverage.

## Authoring invariant

Ordinary circuit authors and learning agents should need only SOP Lang and typed runtime values. Internal ASTs, graph IR, Datalog facts/rules, indexes, or backend-specific representations are permitted behind compiler/runtime boundaries, but they are not alternative authoring surfaces.
