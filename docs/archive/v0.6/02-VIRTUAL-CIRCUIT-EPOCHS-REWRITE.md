# Design Specification 02: Virtual Circuit Runtime, Epochs, and Rewrite

## Active graph

A request executes as a task-local graph of active circuit frames. Each frame contains circuit inputs, instantiated nodes, resolved wires, unresolved dependencies, output mapping, and parent-call information.

A circuit call is not only a host-language function call. The callee is materialized as a subgraph so that its nodes participate in the same scheduler and trace.

## Topological/dataflow execution

Within an epoch, the VM repeatedly executes nodes whose dependencies are solved. Independent ready nodes may be scheduled without imposing source-order semantics. The essential scheduler is:

```text
while request not complete:
    ready := active nodes whose dependencies are solved
    execute ready primitive nodes
    if selected circuit must expand:
        expand subgraph
        begin new epoch
    if subgraph output is solved:
        reduce subgraph to its output wire
        begin new epoch
```

## Epochs

Expansion, reduction, and rewrite change graph structure. A topological ordering computed before such a change may no longer be valid, so structural mutation terminates the current epoch. The next epoch recomputes readiness over the new graph.

## Reduction

When a subcircuit has produced its outputs, the VM removes its internal solved nodes from the active task graph and replaces the call result with the output value. Reduction therefore compresses completed computation while preserving trace/provenance information externally.

## Candidate substitution

A candidate call may receive an ordered candidate list. If a candidate raises `NoMatchError`, the VM can remove the candidate subgraph and substitute the next candidate. Stateful candidates execute transactionally as specified in DS-13, so a failed interpretation does not leak symbolic writes.

## Arbitrary structural rewrite

General rewrite of arbitrary active subgraphs is not fully implemented. A future rewrite system must preserve SSA identity, parent/child wiring, solved-value provenance, transaction boundaries, effect safety, and termination budgets. E-graph-based equivalence maintenance is one research option, not a current dependency.

## Termination controls

A production runtime should bound at least epochs, expansions, candidate attempts, parse-forest size, hypothesis beam, recursion depth, and total work. Recursive symbolic rules are separately bounded by Datalog fixed-point termination conditions and data-domain constraints.
