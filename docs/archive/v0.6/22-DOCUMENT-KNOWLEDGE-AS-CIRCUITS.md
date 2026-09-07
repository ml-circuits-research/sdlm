# Design Specification 22: Document Knowledge as SOP Circuits

## Architectural rule

Document ingestion does not write a second knowledge language, a JSON semantic schema, Datalog source, RDF, or host-language objects as the persistent representation of extracted knowledge. A document-processing agent may read arbitrary source material, but its durable output is a **circuit pack made of SOP Lang files**.

The circuit pack is authoritative. Datalog tuples are a materialized execution view used for fast reasoning and queries. A fresh runtime loading the same circuit pack must be able to reconstruct the same materialized knowledge state.

```text
source document
      ↓
LLM / coding agent
      ↓
SOP circuit pack
      ↓
validate + install circuits
      ↓
execute knowledge bootstrap circuits
      ↓
materialized Datalog relations / indexes
      ↓
queries, reasoning, summaries, generation
```

The agent is allowed to create new circuits. It is not allowed to extend the JavaScript kernel merely because a document contains a new semantic phenomenon.

## What a generated knowledge circuit represents

A knowledge circuit is an ordinary SOP circuit. It can construct one fact, a group of related facts, a rule, a query interpretation, a realization strategy, or another reusable semantic operation.

For example, the sentence "Project Atlas started in 2024" is represented in the reference document pack by an event circuit that constructs ordinary atoms describing an event node, its event type, actor, time, and source sentence. A separate SOP rule projects that event structure into the relation `started_in(X,T)`. A separate SOP language circuit interprets the question "Did X start in T?" as a query over that relation.

No code in the runtime knows what a start event means.

The same principle is used for the examples of coreference and reported speech. The document pack contains a circuit that relates a pronoun mention to its referent and a circuit that records who reported a claim. Optional question circuits expose those relations through English. The runtime only executes circuits and relations.

## Composition instead of semantic classes in the kernel

Terms such as coreference, pronoun, event, time, tense, aspect, modality, quantifier scope, causality, definition, or discourse relation are not required to be JavaScript classes. They are possible interpretations of structures constructed by circuits.

A richer event theory can therefore be introduced by adding or replacing SOP circuits. A temporal reasoner can be a circuit library. A coreference resolver can be a circuit library. A definition system can be a circuit library. If a Datalog projection is useful, it is generated or materialized behind the circuit boundary.

The architectural test is simple: adding such competence should normally add SOP files and tests, not a new author-facing notation and not a domain-specific branch in the VM.

## Agent procedure for converting a document

The recommended agent procedure is intentionally operational rather than tied to a fixed ontology.

First, preserve the original source as reference material. Then identify assertions, entities, events, relations, qualifications, definitions, references, attribution, and discourse links that are useful for the expected tasks. For every useful semantic unit, generate an ordinary SOP circuit that reconstructs that unit from constants, terms, atoms, rules, and other circuits already available.

Prefer composition over inventing a new primitive. If the document uses a semantic pattern already modeled by existing circuits, reuse those circuits. If the pattern is genuinely new, create a higher-level SOP circuit from existing lower-level operations. A kernel primitive is justified only when the operation is generic, cannot reasonably be represented by circuit composition, and is independent of the document's domain or vocabulary.

Create a document bootstrap circuit that invokes the knowledge circuits and materializes their results. Datalog materialization is allowed because it is an execution cache, not the persistent authoring representation.

When the document introduces useful new vocabulary or a new natural-language construction, generate additional SOP language circuits in the same pack. Do not patch the tokenizer, parser, selector, or NLG code with document-specific words.

Finally, validate the pack by starting from a clean runtime, installing the pack, running its tests, and checking that a second clean runtime reconstructs an equivalent materialized KB from the same circuits.

## Dynamic installation

The runtime exposes `installCircuitPack(path)`. The operation loads only SOP circuit definitions from the pack's `circuits/` directory, checks for duplicate circuit names, adds them to the common circuit registry, refreshes the generic activation/effect analyses, and runs only the newly installed bootstrap circuits.

Installation is transactional with respect to the runtime's symbolic state. If a bootstrap fails after writing to the KB, grammar, or lexicon, those writes are rolled back and the newly loaded circuit definitions are removed from the registry.

This is the intended ingestion boundary for generated knowledge.

## Concrete reference pack

`extensions/document-atlas/` contains a small source document and a generated circuit pack. The persistent semantic representation contains nineteen SOP circuits. Among them are circuits representing the source document, a start event and its time, the use of semantic circuits, a reported capability claim, a definition, modality, causal structure, coreference, a rule deriving auditability, and query-language extensions.

The pack supports, among others:

```text
Did Atlas start in 2024?
Can Atlas reconstruct Evidence?
What does PronounIt refer to?
Who reported EvidenceClaim?
What does KnowledgeCircuit mean?
Is Architecture auditable?
Why is Architecture auditable?
Summarize Atlas.
```

The first query is important architecturally. The document circuit stores an event structure. A rule circuit derives `started_in(atlas, 2024)` from the event, actor, type, and time relations. A language circuit maps the English question to the derived relation. Event semantics therefore emerge from circuit composition rather than from an event subsystem in JavaScript.

## What is deliberately not standardized yet

The reference pack uses simple predicates such as `event_type`, `actor`, `time`, `reported_by`, and `refers_to`. These names are data inside circuits, not reserved SOP keywords. They are examples, not a frozen ontology.

The correct long-term representations for tense/aspect, event identity, modal scope, quantifier scope, causal claims, discourse structure, source attribution, and cross-document identity remain research questions. The architecture intentionally allows these representations to evolve by replacing circuit libraries rather than changing the language kernel.

## Acceptance criteria

A document-to-circuit implementation is acceptable only if the durable generated semantic artifacts under `circuits/` are SOP files; a fresh runtime can reconstruct the materialized state from them; new document vocabulary does not enter the JavaScript kernel; richer semantics can be introduced by circuits and rules; installation failure cannot leave partial symbolic state; and the generated knowledge can support at least direct query, derived reasoning, provenance-oriented explanation, and generation tasks relevant to the source.

The current automated suite exercises these properties on the reference pack.
