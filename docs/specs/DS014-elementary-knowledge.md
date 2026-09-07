---
title: DS014-elementary-knowledge
summary: Defines base knowledge, quantities, current locations and conditional everyday defaults.
---

## Introduction

This specification defines the elementary competence available to fresh [sdlm](../wiki.html#definition-sdlm) [sessions](../wiki.html#definition-session) and the generic operations that its [SOP circuits](../wiki.html#definition-semantic-circuit) compose.

## Core Content

Fresh runtimes must execute `foundation.bootstrap` [circuits](../wiki.html#definition-semantic-circuit) containing ordinary [atom](../wiki.html#definition-atom), rule and assertion calls. The base library covers familiar categories, simple material properties, senses and tool purposes, needs, containment, relative order, calendar adjacency and family relations. Lexical forms and interpretation constructions must remain SOP. These are authored models with stated exceptions, not a complete world model. `foundation: false` disables domain [bootstraps](../wiki.html#definition-bootstrap) and conditional foundation proposals for controlled ablation; grammar remains installed.

School [circuits](../wiki.html#definition-semantic-circuit) must construct typed commands for numeric arithmetic and comparison, current quantity reads and updates, and functional relation replacement. Host arithmetic must reject non-finite or oversized operands and division by zero. Inventory updates require one existing numeric value and must not assert a negative quantity when the [circuit](../wiki.html#definition-semantic-circuit) chooses a zero minimum. A rejected update must retain the old value. Set and adjustment operations must participate in rollback and preserve [assumption](../wiki.html#definition-assumption) dependencies of the value they consume.

SOP interpretation policy must preserve supplied identities in quantity initialization, quantity updates and location changes. Name-similarity guesses must not merge separate subjects during these mutations. Installed relation vocabulary must be registered explicitly so known elementary predicates are not reported as unfamiliar words.

Current location statements and movement replace the direct location relation for the subject. Closure must be recomputed so former nested locations lose unsupported consequences. This is current state, not event history. Knowledge [snapshots](../wiki.html#definition-snapshot) must preserve quantity and location changes across restart.

The rain default must require explicit outside and rain-exposure premises, an unknown positive unqualified wet query, and no supported shelter blocker. It must produce a conditional answer and an `everyday-default` decision before execution. It must not assert wetness or missing shelter as facts. Known positive or contradictory shelter support blocks this default. Rejected decisions must not silently recur through the same policy.

Exact school proposals with no decisions may enter strict parsing and pack acceptance. Guessed proposals must remain excluded from that path, and learned chart competence retains its earlier parser precedence. The authored [benchmark](../wiki.html#definition-benchmark) and changed-name regression tests provide evidence for the specified forms, not arbitrary paraphrases.

A restored [session](../wiki.html#definition-session)'s knowledge is authoritative after [bootstrap](../wiki.html#definition-bootstrap). Old [snapshots](../wiki.html#definition-snapshot) do not automatically receive added base facts or rules. A fresh [session](../wiki.html#definition-session) evaluates the full installed library. General cross-version migration remains outside this [snapshot](../wiki.html#definition-snapshot) contract.

Conversation arithmetic request variants, symbolic operator separation and accountable spelling repair are defined by [DS017](../specsLoader.html?spec=DS017-conversational-interaction.md). They use the existing bounded arithmetic executor without requiring foundation facts. Arithmetic uses finite JavaScript numbers with their floating-point precision; these forms do not provide exact rational arithmetic or measurement-unit conversion.

Conversation quantity forms must construct the same set, adjustment and read commands as explicit school forms. DS017 defines reference and omitted-item [assumptions](../wiki.html#definition-assumption), verb variants and current-count question forms. Inventory noun interpretation must describe an unknown word as the item being counted, with its actual normalization evidence. It must not explain an inventory noun as a quantified unary subject. Registered countable nouns and conversational forms remain available when foundation facts are disabled.

Replacing a quantity must preserve causal support inherited from the prior value and selected context. Rejecting such support removes an unsupported replacement count and invalidates dependent saved values. The runtime does not reconstruct a previous inventory state after rejection. The caller may state an explicit corrected starting count.
