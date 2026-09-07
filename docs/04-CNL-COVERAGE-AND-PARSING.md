# Design Specification 04: CNL Coverage and Parsing

## Status

The system implements a **broad controlled English**, not unrestricted English. Coverage is provided by a large set of specialist circuits plus a compositional chart-parser fallback.

## Covered families

The executable tests and circuit library cover representative forms including simple copular assertions, unary properties, transitive and intransitive verbs, relation nouns, negation, common contractions, simple past, progressive and perfect surface forms, passive voice, modal/capability qualifiers, comparisons, universal and existential statements, conditionals with arbitrary-length conjunctive condition lists, relative clauses, `who/what/which/how many` question forms, existence/count queries, summaries, explanations, comparisons, expansion, and bounded reflection/introspection tasks.

Coverage is intentionally uneven. A supported surface form may still map to simplified semantics.

## Semantic normalization

Past, progressive, and perfect forms are often normalized to the same atemporal predicate. Passive voice normalizes argument order. Modal/capability forms preserve an explicit atom qualifier. This is sufficient to test compositional parsing and execution, but it is not a complete tense/aspect/event/modal semantics.

## Parsing strategy

The runtime first allows sparse specialist activation. The compositional fallback uses typed grammar productions and Datalog span closure. `ChartParser.parseAll` reconstructs a bounded parse forest and semantic circuits interpret parse trees recursively.

## Ambiguity

Lexical classification may produce several classes, the chart may produce several trees, and a tree may activate several semantic circuits. The runtime keeps a bounded hypothesis frontier, executes safe hypotheses speculatively, deduplicates equivalent symbolic results, and returns explicit ambiguity when materially different meanings remain within the configured margin.

## Current exclusions

The CNL does not yet robustly implement pronoun/coreference resolution, broad discourse, quotation, ellipsis, idioms, unrestricted subordinate clauses, full agreement/morphology, full quantifier scope, event identity, temporal relations, propositional attitudes, or general world knowledge. These require dedicated experiments rather than additional surface templates alone.
