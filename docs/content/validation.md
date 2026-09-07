# Validation and audit

The test suite checks observable behavior and failure boundaries. The CLI example catalog lets a user repeat representative cases without constructing inputs manually. Both are needed: examples teach the interface, while regression tests cover concurrency, rollback, effect cycles, invalid rules, persistence, and protocol compatibility.

## Run the checks

```sh
npm ci
npm run test:backends
npm run examples
npm run docs:build
npm run docs:check
npm run check
npm run check -- --record
```

`check -- --record` runs the complete checks, saves actual backend results, rebuilds documentation and verifies it. Plain `check` verifies documentation freshness without rebuilding it.

`test:backends` forces the complete suite onto each backend and fails if either run fails. `check` verifies syntax, both backend suites, examples and the 44-case evaluation split on both backends, and documentation freshness and links. `docs:build` regenerates HTML, the book, command/example tables, the specification matrix, and the source inventory. `docs:check` compares generated output and verifies local paths, anchors, shared-menu interaction, specification loading and JSON snippets in a DOM. It does not replace visual browser inspection. The CLI offers `--run all --json` for machine-readable example results.

{{VALIDATION}}

## Audit findings addressed

| Failure boundary | Correction and evidence |
| --- | --- |
| Concurrent request rollback | Serialized public operations and scoped rollback preserve previously committed work; `runtime-hardening.test.mjs` |
| Brittle unsupported-language errors | Assumption-guided response, usable partial results and explicit decisions before execution; `interpretation.test.mjs` |
| Arithmetic phrasing and typos | Composed question and imperative forms, signed operands, symbolic operators, causal lexical repair and contextual gaps; `arithmetic-conversation.test.mjs` |
| Basic chatbot interaction | Greetings, introductions, personal references, category/person distinction, polite questions, rejection dependencies, restart and HTTP continuation; `conversation-chat.test.mjs` |
| Assumed knowledge after correction | Independent support tracking, retraction, session restoration and invalidated value references; `interpretation.test.mjs` |
| Invisible typing and paste | Connect the readline output stream and preserve pending input when redrawing the prompt; `cli-terminal.test.mjs` exercises a real pseudo-terminal |
| Rejected learning publication | Validate before atomic pack publication; restore registry and symbolic state on failure |
| Modal induction | Preserve atom qualifiers through learned constructions and restart |
| Unsafe Datalog rules | Reject unbound head variables and undefined tuples consistently |
| Candidate false negatives | Preserve unconstrained candidates and String-coercive predicates |
| Recursive effect analysis | Traverse the whole dependency graph before caching |
| Runaway execution and traces | Configurable VM budgets and bounded event retention |
| Session continuity | Separate SOP revisions, atomic pointer publication, safe IDs and cross-process locking |
| Interactive continuation and recall | Automatic selection, per-session slash-command history, legacy user-message recovery, atomic appends and real terminal restart; `cli-continuation.test.mjs` and `cli-terminal.test.mjs` |
| History replay | Match full or retained history prefixes and execute only new messages |
| API values | Persist structured turn results as SOP and reuse explicit references after restart |
| Elementary knowledge and mutable context | New-entity inference, arithmetic, replacement of locations and counts, separate similar names, signed numbers and guarded defaults; `foundation-evaluation.test.mjs` and fixed benchmark reports |
| Response detail and state | Answer-only text retains assumptions; settings isolate, restore and roll back; `response-style.test.mjs` |
| Documentation drift | Source-derived command/example catalogs, generated book chapters, canonical DS files and freshness checks |

The regression suites include pipe-based CLI execution, an interactive pseudo-terminal, HTTP calls, streaming parsing, and the official OpenAI JavaScript client against the local server. The terminal check verifies echo before Enter, editing, history recall across process restarts, automatic session continuation, new-session isolation, multiline paste, pending input, execution order and terminal restoration. It requires Python 3 on a POSIX system and reports a skip where these are unavailable. Python is not needed to run the CLI. No external OpenAI service is contacted by these tests.

## Evidence limits

Tests establish behavior for their inputs and exercised failure paths. They do not prove crash consistency under power loss, correctness of arbitrary agent-authored circuits, general-language competence, or production throughput. Cooperative execution limits do not provide hard isolation from an indefinitely blocking backend. The Capabilities page states the remaining product and research gaps.

The HTML resources also pass the local HTTP resource checks. A graphical browser was unavailable in the verification environment, so visual layout is not reported as browser-verified.

## Keep the book current

Edit explanatory pages under `docs/content/`, normative contracts under `docs/specs/`, and research prose in `docs/initial_specs/sd_lm_book.md`. Build output combines the research book with current CLI, API, session, learning, validation, assumption, elementary knowledge, benchmark, response-style and conversation chapters. CLI tables import the same `COMMANDS` and `EXAMPLES` values used at runtime. A source fingerprint includes runtime, tests, circuits, extensions and the benchmark dataset, so a code change requires a reviewed documentation rebuild even if the prose remains valid.

The HTML book is current. The original DOCX and `archive/v0.6/` are historical artifacts. They preserve research context and old evidence without defining the present contract.
