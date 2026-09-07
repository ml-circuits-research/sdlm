---
title: DS015-elementary-evaluation
summary: Defines the fixed elementary corpus, isolated evaluation and measured evidence.
---

## Introduction

This specification defines how users evaluate elementary [sdlm](../wiki.html#definition-sdlm) competence without confusing examples, curated regression evidence and general ability.

## Core Content

The version-one corpus must contain 88 authored English cases in eleven domains, with 44 development cases and 44 reserved evaluation cases. Each case must have a stable unique ID, context, question, domain, split and typed expected answer. The versioned corpus is evaluation data, never a source of normal runtime answers. Changes to expectations require a new dataset version and documented rationale.

Each case must execute in a fresh runtime without learned packs or extensions, using the selected backend and foundation setting. Context and question execute through ordinary conversation [circuits](../wiki.html#definition-semantic-circuit). Boolean status and numeric values require exact equality. Binding lists require exact contents independent of order. A missing interpretation must not satisfy an expected Unknown. Reports must distinguish successful interpretations, correct values, incorrect asserted answers, [assumptions](../wiki.html#definition-assumption) and operational failures.

`/benchmarks` must show available cases without execution. `/benchmark` must run the selected split, report progress and leave the user's [session](../wiki.html#definition-session) unchanged. The standalone command must support backend selection, JSON output, report-file output and foundation ablation. A failed expectation must return failure. The complete verification command must run the evaluation split on both supported backends.

Measured reports must contain the corpus version and hash, runtime source hash, backend, timestamp and per-case results. Historical measurements lacking a source hash must say so; a later hash must not be assigned retroactively. Documentation tables must derive from recorded reports. Development and evaluation scores must remain separately inspectable even in a combined report.

The early-primary curricula guide topic choice only. The reserved evaluation set shares authorship with the development set and is not an independent blind test. No result establishes human age equivalence, broad English comprehension, calibrated guessing or production readiness. Novel names and operands require separate regression evidence; unseen narratives and paraphrases require additional corpora.
