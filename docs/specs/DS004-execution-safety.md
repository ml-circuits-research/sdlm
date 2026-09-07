---
title: DS004-execution-safety
summary: Defines atomic execution, effects, candidate recall and resource bounds.
---

## Introduction

This specification defines atomic execution, [effects](../wiki.html#definition-effect-analysis), [candidate](../wiki.html#definition-candidate) recall and resource bounds for [sdlm](../wiki.html#definition-sdlm).

## Core Content

Every public runtime mutation must serialize per instance and execute within a [transaction](../wiki.html#definition-transaction). Failure must restore knowledge, grammar, lexicon and saved values belonging to that operation. Registry-changing operations must also restore [circuit](../wiki.html#definition-semantic-circuit) definitions and refresh derived indexes. Nested failure must not roll back another committed public operation. A public knowledge [snapshot](../wiki.html#definition-snapshot) must expose committed state.

[Candidate](../wiki.html#definition-candidate) selection must not discard unconstrained [circuits](../wiki.html#definition-semantic-circuit) or infer an unsound typed key from a String-coercive guard. Exact guards remain authoritative. [Effect analysis](../wiki.html#definition-effect-analysis) must inspect all reachable [circuit](../wiki.html#definition-semantic-circuit) dependencies, including cycles, before caching an aggregate. Unknown [effects](../wiki.html#definition-effect-analysis) must not be treated as pure. Speculative writes must roll back before another [candidate](../wiki.html#definition-candidate) commits.

Default execution limits are 100,000 scheduling checks, 10,000 active nodes, 128 tokens per text, 8,192 characters per text and 10,000 milliseconds of cooperative execution time. User-supplied limits must be positive safe integers with known names. The runtime must restore state after a budget failure and allow a later operation to execute.

Trace storage must have a configurable bound of 10,000 events by default, even when console output is disabled. A zero retention limit must store no events. Aggregated request counters may outlive evicted events. Time checks around backend calls do not preempt synchronous backend execution; hard CPU isolation is outside this runtime contract.
