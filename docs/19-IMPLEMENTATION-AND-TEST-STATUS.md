# Design Specification 19: Implementation and Test Status

## Implemented code paths

The repository currently implements:

- SOP loading and circuit registry;
- virtual graph expansion/reduction and epoch scheduling;
- candidate selection with generic primitive activation metadata;
- activation pre-index plus Datalog evaluation;
- bundled Datalog-compatible semantic KB;
- typed grammar storage and Datalog chart closure;
- bounded parse-forest reconstruction and semantic beam execution;
- explicit ambiguity results;
- transaction rollback across KB, language, and grammar stores;
- effect-aware speculative execution;
- four-valued queries and proof provenance;
- summaries, expansions, comparisons, explanations, reflection, and introspection;
- supervised circuit induction, persistence, and restart validation;
- document knowledge encoded as SOP circuit packs, dynamically installable with rollback;
- reconstruction of a materialized KB from the same persistent knowledge circuits;
- event/time, coreference, reported-speech, definition, modality, and causal examples expressed without document-specific JavaScript;
- large generated specialist circuit library;
- architecture tests for language hardcoding and hidden secondary DSLs.

## Current measurements

| Measure | Observation |
|---|---|
| SOP files | 3,168 |
| specialized micro-circuits | 2,918 |
| SOP lines | ~102,430 |
| runtime `.mjs` lines under `src/` | ~2,155 |
| automated test files | 14 |
| bundled-backend tests | 36/36 passing |

These are build observations, not benchmark claims.

## External backend

The repository declares `@suss/datalog` 0.19.0 and includes a dedicated external-backend check. External package installation was unavailable in the build environment, so external conformance is not claimed. The primary functional suite uses the bundled engine.

## Interpretation

The tests demonstrate that the implemented mechanisms work on the included regression corpus and that the one-language boundary survives the current CNL/large-library scenarios. They do not demonstrate unrestricted language understanding, large-scale learned semantics, or production performance.
