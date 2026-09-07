# Design Specification 20: Falsification Plan

## Experiment 1: Frozen-kernel language growth

Freeze the VM, Datalog selector, parser engine, and primitive ABI. Give a learning/coding agent an order-of-magnitude larger CNL suite. Permit SOP/lexicon/grammar/test changes but no language-specific JavaScript. Record every required kernel patch.

**Failure signal:** ordinary language phenomena repeatedly require host changes.

## Experiment 2: Semantic depth

Add event identity, tense/aspect, modality, reference, and quantifier scope. Use minimal pairs where the current shallow atom representation gives incorrect answers.

**Failure signal:** richer semantics cannot be represented without replacing normal circuit composition with unrelated ad-hoc authoring mechanisms.

## Experiment 3: 10k / 100k / 1M circuits

Measure startup, memory, activation-index size, p50/p95 selection latency, number of candidate Datalog rules after prefiltering, circuit body loads, beam sizes, cache hit rates, and total task latency.

**Failure signal:** ordinary task cost approaches linear scanning of total circuit count.

## Experiment 4: Ambiguity recall

Build lexical, PP-attachment, coordination, scope, and reference ambiguity corpora. Measure whether the correct interpretation remains in the beam and whether unresolved cases are reported rather than silently committed.

**Failure signal:** pruning routinely removes correct hypotheses or ambiguity policy is poorly calibrated.

## Experiment 5: Higher-order induction

Provide examples requiring new recursive abstractions rather than paraphrase patterns. Require held-out compositional generalization.

**Failure signal:** learning remains surface memorization.

## Experiment 6: Consolidation

Accumulate overlapping narrow circuits and run an automated generalizer/refactoring process. A proposed abstraction must pass the union of behavior tests and reduce library complexity without lowering activation accuracy.

**Failure signal:** specialization cannot be compressed safely and interference grows without bound.

## Experiment 7: Reasoning benchmarks

Translate suitable subsets of bAbI, CLUTRR, ProofWriter, and synthetic reasoning tasks to the supported semantics. Measure exact answers, proof fidelity, and failure cause.

## Experiment 8: Provenance-aware generation

Require multi-paragraph output where each factual claim maps to a KB fact, proof, retrieved source, or explicit synthesis marker.

**Failure signal:** fluency improvements destroy claim traceability.

## Experiment 9: External tools

Introduce reversible/deferred and irreversible tools. Verify effect classification, two-phase commit, idempotency/compensation, authorization, and audit behavior under candidate failure and ambiguity.

## Experiment 10: Research-automation workload

Use scientific-literature claims with evidence, contradiction, revision, and review generation. This tests long-lived knowledge, provenance, reasoning, ambiguity, and generation together.

## Document-to-circuit falsification

Give an external coding agent or LLM only the source document, the SOP specification, the available circuit library, and the rule that its durable semantic output must be SOP circuits. Measure whether the generated pack reconstructs expected facts and rules, supports held-out multi-hop questions, preserves attribution and explicit uncertainty, and survives restart without hidden state. Reject solutions that achieve the score by adding JavaScript, Datalog source, JSON semantic schemas, or document-specific runtime branches.

Scale the experiment from short technical notes to collections of documents. Track circuit count, reuse, duplication, installation time, materialization time, query latency, explanation quality, and the fraction of generated circuits that can be consolidated into reusable abstractions.
