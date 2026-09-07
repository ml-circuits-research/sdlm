# Design Specification 10: Running, Testing, and Extending

## Requirements

Node.js 22 or later is expected. The repository includes a bundled Datalog compatibility backend, so the main suite does not require external package installation.

## Commands

```bash
npm test
npm run demo
npm run trace
npm run repl
npm run demo:document
npm run test:external
```

`npm test` is the primary release gate. `npm run test:external` explicitly checks the intended external Datalog adapter and should not be treated as passing unless that backend is actually loaded.

## Document ingestion

Document knowledge should be added as an SOP circuit pack, not by adding a new data language to the runtime. `installCircuitPack(path)` can install such a pack dynamically and transactionally. The detailed generation contract for coding agents and LLMs is DS-22.

## Extension discipline

For ordinary language/domain extensions:

1. add SOP circuits and/or typed lexicon/grammar data;
2. add tests describing the intended behavior;
3. run the full test suite;
4. run architecture audits for language hardcoding and hidden authoring encodings;
5. change host runtime code only when a genuinely generic primitive/runtime capability is missing.

## Architecture gate

A proposed extension should be rejected if it introduces a private string prefix, delimiter convention, placeholder language, selector-owned linguistic command list, or another author-facing DSL that duplicates SOP composition. Established external formalisms may be used behind explicit primitive/backend boundaries when justified.

## Debugging

Use traces to inspect activation pruning, candidate selection, expansion, reduction, rewrite, chart forests, hypothesis frontiers, and transaction events. Debugging should prefer explicit trace/provenance over adding ad-hoc logging logic inside language circuits.
