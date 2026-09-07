# Architecture

The runtime turns a supported sentence into an executable semantic command, evaluates it against explicit knowledge, and renders a controlled response. SOP Lang owns domain competence. JavaScript loads and schedules circuits and supplies generic operations. Datalog handles relation closure and candidate selection.

<figure>
<pre class="mermaid">
flowchart TD
  A[CLI or text API · session selection] --> B[Restore SOP state and select new input]
  B --> C[Strict parse or safe interpretation trial · record assumptions]
  C --> D[ExecuteCommand · rule reasoning · response and evidence]
  D --> E[Commit SOP revision and expose reusable results]
</pre>
<figcaption>Request execution and session continuity</figcaption>
</figure>

## Execution and correctness

A virtual circuit expands named SOP calls into a task-local graph with SSA wires. Structural changes start a new epoch. Guards and candidate failure can rewrite the active graph. Stateful candidate trials have transaction snapshots, and public operations serialize per runtime. Failure rolls back only the operation and its nested scopes. A public knowledge snapshot exposes committed state.

Effect analysis follows every reachable circuit dependency, including recursive cycles, before caching the aggregate. Unknown or effectful work does not enter a pure speculative branch. Execution budgets bound steps, active nodes, text size and token count. Time checks are cooperative around VM and backend calls; they cannot interrupt arbitrary synchronous backend work.

## Parsing and activation

The library includes specialized micro-circuits and a compositional chart parser. Candidate projection indexes only necessary conditions that preserve a candidate. String-coercive value conditions use their actual predicate instead of an incompatible typed index key. A circuit without activation constraints remains eligible. These rules avoid false negatives while keeping exact semantic guards authoritative.

Ambiguity search has bounded candidates and parse forests. Strict mode returns close alternatives explicitly. Conversation mode may select one with a recorded assumption and allows later rejection. A successful example does not prove recall beyond those bounds. Grammar bootstraps register typed symbols and constructions; no second linguistic rule-string language is introduced.

## Knowledge

The knowledge base stores asserted unary and binary atoms, explicit polarity, optional qualifiers, and safe positive Datalog rules. Every head variable must occur in the body. Invalid rules fail before mutation on both backends. Retraction removes matching assertions and rebuilds the closure, retaining conclusions with another valid support.

The bundled evaluator and the pinned external `@suss/datalog` adapter share tested contracts. `SD_LM_DATALOG_BACKEND=bundled|external|auto` selects one. Explicit `external` fails if unavailable. Automatic selection falls back only when the package itself is missing, not when it has an internal import or initialization failure.

## Source ownership

| Source | Responsibility |
| --- | --- |
| `circuits/` and `extensions/` | Grammar, semantic execution, generation and domain knowledge |
| `src/kernel/` | SOP loading, scheduling, effects, transactions and budgets |
| `src/datalog/` | Backend adapter, facts, rules, validation and activation |
| `src/parsing/` and `src/primitives/` | Generic chart and typed runtime operations |
| `src/interpretation/` | Generic trial scheduling, symbol comparison, evidence and corrective retraction |
| `src/learning/` | Validated circuit induction |
| `src/sessions/` | Durable revision publication, history matching and value references |
| `src/cli/` and `src/api/` | User commands, examples and protocol adapters |

{{LIMITS}}

## Accountable conversation

`respond` and `respondDetailed` first try read-only conversational intent circuits, then installed parsing, fallback SOP constructions and final-punctuation repair. Conversational circuits can compose bounded prefix rewrites or construct commands directly. The [conversation guide](conversation.html) covers the supported forms. They record selected decisions before `ExecuteCommand`, carrying supporting atoms from personal references into assertion dependencies, then connect proof support to assumption IDs. Trial rollback includes the evidence ledger. Rejected decisions remove assertions without another support and invalidate saved values that carry their IDs. The [assumption guide](assumptions.html) describes the policy classes and the separate handling of unproven aggregate context. Strict `process` methods remain available for deterministic circuit validation.

## Elementary competence and response policy

Fresh sessions execute the declarative facts and rules under `circuits/foundation/bootstrap/`. School language circuits construct ordinary typed commands for arithmetic, comparisons, functional quantities and current locations. Generic host operations calculate and update relations; concept names, sentence forms, limits chosen for a command and default conditions stay in SOP. Rain exposure is an explicit conditional proposal, not a stored wet fact.

`SetResponseStyle` and `PresentConversation` select the displayed text. Explanation sections, assumption lines, unresolved-input wording and support-tree text are assembled by SOP circuits. Generic JavaScript settings storage participates in transactions and session persistence. Read-only circuit mapping checks the target effect dynamically and shares the execution budget. Neither verbosity nor the benchmark adds domain-specific execution rules to `src/kernel/`.

`src/evaluation/` runs the authored benchmark in isolated runtimes. Its expected answers are evaluation data and are not part of the model's input or base knowledge.
