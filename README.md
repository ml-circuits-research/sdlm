# SOP-SLLM

SOP-SLLM is an executable research system for a **Symbolic Language Model** built around one visible composition language: **SOP Lang**. The runtime combines dynamic semantic circuits, compositional controlled-English parsing, Datalog-backed reasoning and circuit activation, explicit ambiguity, transactional candidate rewrite, persistent circuit induction, document knowledge represented as SOP circuit packs, provenance-aware reasoning, and symbolic natural-language generation.

The normative documentation is in [`docs/INDEX.md`](docs/INDEX.md), and the self-contained technical monograph is in [`docs/initial_specs/`](docs/initial_specs/).

## Core architectural rule

Ordinary language, reasoning, generation, and learned competence should be represented as SOP circuits plus typed data. The JavaScript runtime provides a small trusted VM/primitive boundary. Datalog, indexes, graph IR, grammar objects, and backend representations are internal execution mechanisms rather than secondary author-facing DSLs.

## Current capabilities

The executable system supports virtual-circuit expansion/reduction, topological epochs, candidate selection/rewrite, Datalog closure and queries, sparse activation across thousands of circuits, typed chart grammar, parse forests, bounded semantic hypothesis search, explicit ambiguity, effect-aware speculation, transactional rollback for internal state, four-valued query status, proof provenance, controlled-English facts/rules/questions, summaries, expansions, explanations, comparisons, reflection/introspection, and supervised persistent circuit induction.

The included artifact contains 3,168 SOP circuit files, including 2,918 generated micro-circuits and a reference document-to-circuit pack. The current bundled-backend test suite passes 36/36 tests. These counts are engineering stress signals, not claims of unrestricted English understanding or general intelligence.

## Run

```bash
npm test
npm run demo
npm run trace
npm run repl
```

The intended external JavaScript Datalog backend is `@suss/datalog` 0.19.0. The repository also includes a bundled compatibility engine so the main suite is reproducible without network access. Run:

```bash
npm run test:external
```

only when the external package is installed; the command explicitly verifies that the external backend, rather than the bundled engine, is loaded.


## Document knowledge as circuits

Document ingestion is treated as circuit synthesis. A coding agent or LLM may read source material and generate a circuit pack, but the persistent semantic result is SOP Lang rather than JSON, RDF, Datalog source, or document-specific JavaScript. `installCircuitPack(path)` installs such a pack dynamically and transactionally. Datalog relations are a materialized reasoning view reconstructed from the circuits.

Run:

```bash
npm run demo:document
```

The reference pack under `extensions/document-atlas/` demonstrates event/time projection, coreference, reported speech, modality, definition, causal structure, derived reasoning, and question circuits without adding domain semantics to the JavaScript kernel.

## Documentation

Start with:

- `docs/00-DESIGN-OVERVIEW.md`
- `docs/01-SOP-LANGUAGE-AND-KERNEL.md`
- `docs/03-DATALOG-ACTIVATION-AND-REASONING.md`
- `docs/04-CNL-COVERAGE-AND-PARSING.md`
- `docs/19-IMPLEMENTATION-AND-TEST-STATUS.md`
- `docs/20-FALSIFICATION-PLAN.md`
- `docs/21-ARCHITECTURE-AUDIT.md`
- `docs/22-DOCUMENT-KNOWLEDGE-AS-CIRCUITS.md`
- `docs/initial_specs/SOP_SLLM_Semantic_Circuits_as_a_Symbolic_Language_Model.docx`

The open research questions are not hidden behind roadmap language: richer event/time/reference/intensional semantics, learned ranking, higher-order circuit induction and consolidation, scalable lazy circuit memory, truth maintenance, stronger NLG, and safe external effects remain unresolved and are documented explicitly.
