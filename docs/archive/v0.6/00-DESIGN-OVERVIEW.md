# Design Specification 00: System Overview

## Purpose

sdlm is an executable research system for testing whether useful language behavior can be represented as a large library of **SOP Lang semantic circuits** running over a small generic runtime. The reference implementation combines dynamic circuit graphs, Datalog reasoning and activation, compositional chart parsing, explicit ambiguity, transactional speculative execution, persistent circuit induction, document knowledge represented as installable SOP circuit packs, provenance, and circuit-based natural-language generation.

The main architectural invariant is:

> SOP Lang is the single author-facing composition language. Ordinary competence is represented by SOP circuits and typed data. Datalog, indexes, internal graph structures, and host-language objects are execution substrates, not additional authoring languages.

## Runtime layers

```text
input text
   ↓
SOP language circuits
   ↓
token / lexical state
   ↓
specialist activation or chart parsing
   ↓
semantic hypotheses
   ↓
virtual-circuit expansion
   ↓
command / query / rule structures
   ↓
knowledge circuits + materialized Datalog view
   ↓
Datalog-backed KB reasoning
   ↓
response planning and realization circuits
   ↓
output text + trace/provenance
```

The virtual machine expands selected circuits into a task-local graph. Each structural change starts a new execution epoch. Solved subcircuits reduce to values. Failed speculative candidates can be rolled back and replaced.

## Datalog roles

Datalog is used for three concrete jobs:

1. chart-span closure for compositional parsing;
2. relational closure and queries in the semantic knowledge base;
3. sparse candidate-circuit activation from conservative relational projections.

The system does **not** require all SOP circuits to compile to Datalog. Procedural, stateful, generative, external, or otherwise unsuitable operations remain normal circuit execution.

## Current implementation scale

The reference artifact contains 3,147 SOP files across base circuits and included extensions, including 2,918 generated micro-circuits. It contains approximately 101,838 SOP source lines and approximately 2,094 `.mjs` runtime lines under `src/`. The bundled-backend automated suite passes 32/32 tests.

These counts are engineering observations. They test activation and library-management behavior beyond a toy library; they do not measure intelligence or unrestricted English competence.

## What is implemented

Implemented mechanisms include graph expansion/reduction, topological scheduling, candidate rewrite, internal symbolic transactions, Datalog reasoning, activation projections, sparse pre-indexing, chart parsing, parse forests, bounded semantic hypothesis search, safe speculative concurrency for pure/read circuits, four-valued query status, proof provenance, summaries and explanations, supervised circuit induction, transactional installation of document-generated circuit packs, reconstruction of materialized knowledge from those circuits, and current CNL families documented in DS-04.

## What remains research

The major open areas are richer event/time/reference/intensional semantics, learned ranking, higher-order circuit induction and consolidation, large-scale lazy circuit storage, truth maintenance and retraction, stronger NLG, robust discourse processing, scalable ambiguity benchmarks, and external-effect protocols. These are specified in DS-09, DS-14, and DS-20.
