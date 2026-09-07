# Design Specification 09: Limitations and Falsification Criteria

## What the system does not demonstrate

The current system is not a symbolic replacement for a modern general-purpose LLM. It does not understand unrestricted English, learn robust semantics from raw corpora, resolve broad commonsense ambiguity, generate consistently high-quality long prose, or discover deep recursive abstractions automatically. The evidence concerns execution architecture, inspectable symbolic reasoning, and a constrained form of circuit learning.

## Kernel boundary

The runtime still contains trusted primitive implementations, VM structural operations, adapters, parser reconstruction code, and generic host-language data manipulation. This is intentional. The falsification question is whether ordinary competence can grow mainly in SOP circuits and typed data without the host runtime accumulating language/domain special cases.

## Semantics

The reference document pack shows that event/time structures, coreference, reported speech, modality, definitions, and causal links can be represented and interpreted by SOP circuit composition without host-language semantic classes. This is only a proof of representability. Complete event identity, tense/aspect, modal and quantifier scope, discourse, defaults, causal models, and rich uncertainty still require substantially better circuit libraries and falsifiable semantic conventions. Adding surface paraphrases alone is not enough.

## Document ingestion

The runtime can install document-generated SOP circuit packs transactionally, and the reference pack reconstructs its materialized KB after restart. Automatic document-to-circuit synthesis has not yet been evaluated at scale. Coverage, source fidelity, abstraction quality, contradiction handling, circuit reuse, and consolidation therefore remain open empirical questions.

## Parsing and ambiguity

The chart parser is bounded and reconstructs trees rather than using a maximally compact shared packed forest throughout semantic search. Ranking is mostly structural and hand-weighted. Broad ambiguity recall and calibration remain unmeasured.

## Learning

The supervised inducer can synthesize surface paraphrase circuits and persistent grammar/semantic rules, but it does not yet invent higher-order recursive abstractions or decide autonomously when to generalize/consolidate. A library can therefore grow without becoming more conceptually powerful.

## Generation

Generation is transparent but limited. It lacks robust document planning, aggregation, broad morphology/lexical choice, reference generation, stylistic control, and open-ended synthesis. Neural realization may be useful if claim provenance and validation are preserved.

## Effects

Internal KB/language/grammar state can be rolled back. Irreversible external effects cannot. External tools require deferred commit, idempotency, or compensating protocols.

## Datalog backend status

The bundled compatibility backend passes the functional suite. `@suss/datalog` 0.19.0 is declared as the intended external JavaScript backend, but the build environment used for this artifact could not complete external package installation. External conformance/performance therefore remains to be verified in a network-enabled environment.

## Falsification criteria

The architecture is weakened if any of the following becomes systematic:

- ordinary language growth repeatedly requires language-specific JavaScript changes;
- candidate selection approaches linear scanning with library size;
- correct interpretations frequently disappear before/inside the bounded beam;
- learned circuits cause uncontrolled interference;
- richer semantics requires replacing circuit composition with unrelated ad-hoc authoring languages;
- transactional guarantees cannot be extended to realistic tool workflows;
- proof/provenance fidelity is lost as generation becomes more fluent;
- higher-order circuit induction fails to generalize beyond surface memorization.

DS-20 defines experiments for these criteria.
