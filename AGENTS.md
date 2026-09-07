# Repository guidance

## Scope

[sdlm](docs/wiki.html#definition-sdlm) is an extensible symbolic conversation runtime. Language and domain competence live in [SOP Lang](docs/wiki.html#definition-sop-lang) [circuits](docs/wiki.html#definition-semantic-circuit). The DS specifications are the source of truth; guides and the HTML book explain those contracts. Do not commit or publish changes unless the user requests it.

## Mandatory Reading Order

Read [README](README.md), the [HTML overview](docs/index.html), [Wiki](docs/wiki.html), [Capabilities](docs/capabilities.html), [Assumptions](docs/assumptions.html), [Architecture](docs/architecture.html), [Elementary knowledge](docs/foundation.html), [Evaluation](docs/benchmark.html), [Response style](docs/response-style.html), [Conversation](docs/conversation.html), and the [specification matrix](docs/specs/matrix.md). Read [DS001 coding style](docs/specs/DS001-coding-style.md) for source ownership, module sizes and test organization. Read the relevant specialized DS before changing behavior or documentation.

Before creating or changing the Main Behavior DS, and whenever product outcomes, essential APIs, execution paths, broad subsystems or major hidden consequences change, perform a read-only behavior analysis with source and test evidence. Use its accepted component order to update [DS003](docs/specs/DS003-main-behavior.md). Keep rationale, [assumptions](docs/wiki.html#definition-assumption), limitations and contract boundaries in declarative Core Content prose, without a separate decision log.

## Current Skill Catalog

The repository distributes [SOP circuits](docs/wiki.html#definition-semantic-circuit) and a runtime, not product skills. Imported agent instructions are development tools. Update this catalog if the repository begins distributing a product skill. Downstream consumers must keep imported-skill documentation within the imported skill folders, without adding their DS files or pages to the host project's docs tree.

## Repository Rules

Use Node.js ES modules and the pinned lockfile. Domain vocabulary, grammatical constructions, interpretation policies and category explanations belong in `circuits/` or `extensions/`. Generic loaders, [VM](docs/wiki.html#definition-virtual-machine) execution, [transactions](docs/wiki.html#definition-transaction) and [effects](docs/wiki.html#definition-effect-analysis) belong in `src/kernel/`; interpretation scheduling, symbol comparison and evidence storage belong in `src/interpretation/`. Keep CLI, HTTP and [session](docs/wiki.html#definition-session) adapters separate. Do not introduce private linguistic string languages.

Public mutations must enter the serialized [transaction](docs/wiki.html#definition-transaction) boundary. [Candidate](docs/wiki.html#definition-candidate) interpretation must remain speculative until its [assumptions](docs/wiki.html#definition-assumption) are recorded and its command executes. Pack installation must validate before publication. [Sessions](docs/wiki.html#definition-session) must preserve isolation, learned competence, retraction, [assumption](docs/wiki.html#definition-assumption) evidence and valid [reusable values](docs/wiki.html#definition-value-reference). Exact parser and pack acceptance methods must retain strict behavior.

Write all documentation, specifications and comments in English. When source changes, update the HTML documentation and specifications in the same change. Edit guide prose under `docs/content/`, contracts under `docs/specs/`, and research text in `docs/initial_specs/sd_lm_book.md`. DS numbering must remain gap-free. Preserve existing numbered examples and add commands to the runtime catalog. Use the canonical Wiki for terminology, link eligible terms outside headings and code, keep prose unwrapped, and follow the documentation writing guidance supplied with the repository's authoring instructions. Describe verified outcomes and concrete boundaries without authoring-tool [provenance](docs/wiki.html#definition-proof).

Use `npm run check` for syntax, both complete backend suites, all examples, the evaluation split and documentation verification. Run focused tests during development, `npm run docs:build` after source or documentation changes, and `npm run docs:check` after rebuilding. Use `bash fileSizesCheck.sh` for size warnings; DS001 owns the limits. Generated [circuit](docs/wiki.html#definition-semantic-circuit) data, lockfiles and the complete book are not ordinary hand-maintained source modules.

## Runtime Defaults

CLI and Chat Completions use conversation mode with explicit [assumptions](docs/wiki.html#definition-assumption). `/mode strict`, chat `interpretation: "strict"`, library `process` methods and direct [circuits](docs/wiki.html#definition-semantic-circuit) retain strict parsing. Interactive CLI startup resumes the last selected durable [session](docs/wiki.html#definition-session) or creates one; `--temporary` opts out. Up/Down recall is session-local CLI metadata, separate from SOP state and API history matching. Batch input stays temporary unless explicitly named. The API defaults to loopback port 3000; the documentation server defaults to 8080. Named [sessions](docs/wiki.html#definition-session) use `sessions/`; learned packs use `learned/`. The shared API token grants workspace-wide access and does not establish individual ownership.

## Key Paths

| Path | Purpose |
| --- | --- |
| `circuits/` and `extensions/` | Executable language and domain competence |
| `src/` and `test/` | Runtime, adapters and behavioral regression evidence |
| `docs/index.html` and `docs/wiki.html` | Onboarding and canonical terminology |
| `docs/specs/` | Normative, consecutively numbered contracts |
| `docs/content/` and `docs/book.html` | Guide sources and the complete current HTML book |
| `tools/docs-build.mjs` and `tools/docs-check.mjs` | Synchronized documentation build and verification |
| `docs/archive/v0.6/` and the original DOCX | Historical material |

## Elementary knowledge and evaluation

Fresh runtimes enable `foundation.bootstrap`; empty-domain regression fixtures explicitly use `foundation: false`. Preserve the frozen versioned dataset under `benchmarks/early-school/`. Evaluation expectations must never supply normal runtime answers. Record source and dataset fingerprints for measured reports. Distinguish development, reserved evaluation and independent evaluation claims.

[SOP circuits](docs/wiki.html#definition-semantic-circuit) own response choices, supported instruction forms and explanation wording. Generic [session](docs/wiki.html#definition-session) settings participate in rollback and persist in `SessionSettings.sop`. Compact display must retain [assumption](docs/wiki.html#definition-assumption) evidence and rejection behavior. `/examples N` displays documentation; `/example N` executes an isolated scenario.

Conversational intent routing, prefix [rewrites](docs/wiki.html#definition-rewrite), name classification and speaker-reference policy belong in [SOP circuits](docs/wiki.html#definition-semantic-circuit). Preserve strict parser entry points. Speaker selection is ordinary knowledge and must inherit or retain causal [assumption](docs/wiki.html#definition-assumption) support. Do not add a separate host identity cache or use unresolved input as an asserted fact.
