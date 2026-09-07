---
title: DS002-sop-language
summary: Defines the single visible competence language and circuit contracts.
---

## Introduction

This specification defines the single visible competence language and [circuit](../wiki.html#definition-semantic-circuit) contracts for [sdlm](../wiki.html#definition-sdlm).

## Core Content

[SOP Lang](../wiki.html#definition-sop-lang) must be the visible language for [circuit](../wiki.html#definition-semantic-circuit) composition, grammar construction, domain knowledge and durable semantic state. [Datalog](../wiki.html#definition-datalog) relations and graph indexes are internal representations. Ordinary authors must not need a private rule-string DSL to express competence.

A [circuit](../wiki.html#definition-semantic-circuit) must declare inputs, uniquely named [SSA](../wiki.html#definition-ssa) operation nodes and at least one output. References must resolve within the [circuit](../wiki.html#definition-semantic-circuit). Local wire cycles, duplicate names, duplicate parameters, unknown calls and missing required inputs must fail validation. A [circuit](../wiki.html#definition-semantic-circuit) name must be unique across all installed packs. Calls may recurse across [circuits](../wiki.html#definition-semantic-circuit) and remain subject to execution budgets.

Directory paths define groups; groups named `bootstrap` or ending in `.bootstrap` execute at initialization or installation. [Bootstraps](../wiki.html#definition-bootstrap) may construct grammar, lexicon or explicit knowledge. [Primitives](../wiki.html#definition-primitive) implement generic typed operations. Persisted facts, rules and [reusable values](../wiki.html#definition-value-reference) must be representable as ordinary SOP constructor calls, not executable JavaScript or hidden JSON programs.

The runtime may expose JSON as a protocol envelope and a projection of typed results. JSON [session](../wiki.html#definition-session) metadata must not replace the SOP knowledge [snapshot](../wiki.html#definition-snapshot). The language syntax does not grant filesystem or shell access to [circuits](../wiki.html#definition-semantic-circuit).
